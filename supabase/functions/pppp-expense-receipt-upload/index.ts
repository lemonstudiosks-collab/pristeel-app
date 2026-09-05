import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const BUCKET='expense-receipts';
const MAX=20*1024*1024;
const allowed=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']);
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Cache-Control':'no-store'}});
const text=(v:any,max=500)=>String(v??'').trim().slice(0,max);
async function sha256(bytes:Uint8Array){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function ext(name:string,mime:string){const m=name.toLowerCase().match(/\.([a-z0-9]{2,6})$/);if(m)return m[1];return mime==='application/pdf'?'pdf':mime.includes('png')?'png':mime.includes('webp')?'webp':mime.includes('heic')?'heic':mime.includes('heif')?'heif':'jpg';}
async function signed(receiptId:string){
  const {data:r,error}=await db.from('pppp_expense_receipts_v1').select('id,storage_bucket,storage_path').eq('id',receiptId).maybeSingle();
  if(error)throw error;if(!r)throw new Error('Receipt not found');
  const {data,error:e}=await db.storage.from(r.storage_bucket||BUCKET).createSignedUrl(r.storage_path,900);
  if(e||!data?.signedUrl)throw e||new Error('Could not create signed URL');
  return data.signedUrl;
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  try{
    const u=new URL(req.url);
    if(req.method==='GET'){
      const id=text(u.searchParams.get('id'));
      if(!id)return json({ok:false,error:'id required'},400);
      return json({ok:true,receipt_id:id,url:await signed(id),expires_seconds:900});
    }
    if(req.method!=='POST')return json({ok:false,error:'POST required'},405);
    const form=await req.formData();
    const f=form.get('file');
    if(!(f instanceof File))return json({ok:false,error:'file required'},400);
    if(f.size<=0||f.size>MAX)return json({ok:false,error:'File must be between 1 byte and 20 MB'},413);
    const mime=(f.type||'application/octet-stream').toLowerCase();
    if(!allowed.has(mime))return json({ok:false,error:'Only receipt images or PDF are supported'},415);
    const bytes=new Uint8Array(await f.arrayBuffer());
    const hash=await sha256(bytes);
    const {data:existing,error:findError}=await db.from('pppp_expense_receipts_v1').select('id,status,file_name,expense_id').eq('content_sha256',hash).maybeSingle();
    if(findError)throw findError;
    if(existing)return json({ok:true,duplicate:true,receipt:existing});
    const id=crypto.randomUUID();
    const source=text(form.get('source_type'))==='camera'?'camera':'upload';
    const now=new Date(),path=`${source}/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${id}.${ext(f.name,mime)}`;
    const {error:upError}=await db.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'3600'});
    if(upError)throw upError;
    const row={id,source_type:source,source_ref:`pppp:${source}:${id}`,file_name:text(f.name,240)||`receipt.${ext(f.name,mime)}`,mime_type:mime,size_bytes:f.size,content_sha256:hash,storage_bucket:BUCKET,storage_path:path,status:'needs_ocr'};
    const {data:created,error:insertError}=await db.from('pppp_expense_receipts_v1').insert(row).select('id,status,file_name,source_type,created_at').single();
    if(insertError){await db.storage.from(BUCKET).remove([path]);throw insertError;}
    const {data:job,error:queueError}=await db.rpc('local_ocr_enqueue_expense_receipt_v1',{p_receipt_id:id});
    if(queueError){await db.from('pppp_expense_receipts_v1').update({status:'failed',last_error:`OCR queue: ${queueError.message}`,updated_at:new Date().toISOString()}).eq('id',id);return json({ok:true,receipt:{...created,status:'failed'},ocr_job_id:null,warning:'Receipt saved but OCR could not be queued'});}
    return json({ok:true,duplicate:false,receipt:{...created,status:'ocr_queued'},ocr_job_id:job,human_confirmation_required:true,no_paid_api:true});
  }catch(e){return json({ok:false,error:String(e instanceof Error?e.message:e).slice(0,1000)},500);}
});
