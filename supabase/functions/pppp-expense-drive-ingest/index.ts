import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SA_JSON=Deno.env.get('GOOGLE_SA_JSON')!;
const DRIVE_USER=Deno.env.get('GMAIL_USER')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const INBOX_ID='15Xdjzzj9Pc__vVGDildXLu5VtIoXZ6rb';
const PROCESSED_ID='1RTAuoBc45rvy-4nvPSWmj9a0-D3u2uxO';
const BUCKET='expense-receipts';
const MAX=20*1024*1024;
const allowed=new Set(['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']);
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, x-pppp-cron-secret','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Cache-Control':'no-store'}});
const text=(v:any,max=600)=>String(v??'').trim().slice(0,max);
function b64url(input:Uint8Array|string){const bytes=typeof input==='string'?new TextEncoder().encode(input):input;let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function pem(p:string){const x=p.replace(/-----BEGIN PRIVATE KEY-----/,'').replace(/-----END PRIVATE KEY-----/,'').replace(/\s+/g,'');const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
async function sha256(bytes:Uint8Array){const d=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function safe(v:string){return v.replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/-+/g,'-').slice(0,100)||'receipt';}
let cached:{token:string,exp:number}|null=null;
async function driveToken(){
  const now=Math.floor(Date.now()/1000);if(cached&&cached.exp>now+90)return cached.token;
  if(!SA_JSON||!DRIVE_USER)throw new Error('Google Drive delegation is not configured');
  const sa=JSON.parse(SA_JSON),h={alg:'RS256',typ:'JWT'},c={iss:sa.client_email,sub:DRIVE_USER,scope:'https://www.googleapis.com/auth/drive',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600};
  const unsigned=`${b64url(JSON.stringify(h))}.${b64url(JSON.stringify(c))}`;
  const key=await crypto.subtle.importKey('pkcs8',pem(sa.private_key),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:`${unsigned}.${b64url(sig)}`})});
  const j=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}: ${text(j?.error_description||j?.error)}`);cached={token:j.access_token,exp:now+Number(j.expires_in||3600)};return cached.token;
}
async function authorized(req:Request){const provided=req.headers.get('x-pppp-cron-secret')||'';if(!provided)return false;const {data,error}=await db.rpc('gmail_tracker_cron_authorized',{provided});return !error&&data===true;}
async function listFiles(limit:number){
  const tk=await driveToken(),q=`'${INBOX_ID}' in parents and trashed=false`,p=new URLSearchParams({q,spaces:'drive',pageSize:String(Math.min(50,Math.max(1,limit))),orderBy:'createdTime',fields:'files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents)'});
  const r=await fetch(`https://www.googleapis.com/drive/v3/files?${p}`,{headers:{Authorization:`Bearer ${tk}`}});const j=await r.json();if(!r.ok)throw new Error(`Drive list ${r.status}: ${text(j?.error?.message||JSON.stringify(j))}`);return Array.isArray(j.files)?j.files:[];
}
async function download(id:string){const tk=await driveToken(),r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media`,{headers:{Authorization:`Bearer ${tk}`}});if(!r.ok)throw new Error(`Drive download ${r.status}: ${text(await r.text())}`);return new Uint8Array(await r.arrayBuffer());}
async function moveProcessed(id:string){const tk=await driveToken(),q=new URLSearchParams({addParents:PROCESSED_ID,removeParents:INBOX_ID,fields:'id,parents,webViewLink'}),r=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?${q}`,{method:'PATCH',headers:{Authorization:`Bearer ${tk}`,'Content-Type':'application/json'},body:'{}'});const j=await r.json();if(!r.ok)throw new Error(`Drive move ${r.status}: ${text(j?.error?.message||JSON.stringify(j))}`);return j;}
async function ingestOne(f:any){
  const mime=text(f.mimeType).toLowerCase(),size=Number(f.size||0);
  if(!allowed.has(mime))return {file_id:f.id,name:f.name,event:'skipped_type'};
  if(size>MAX)return {file_id:f.id,name:f.name,event:'skipped_too_large'};
  const {data:byId,error:idErr}=await db.from('pppp_expense_receipts_v1').select('id,status').eq('drive_file_id',f.id).maybeSingle();if(idErr)throw idErr;
  if(byId){await moveProcessed(f.id);return {file_id:f.id,name:f.name,event:'already_ingested',receipt_id:byId.id};}
  const bytes=await download(f.id);if(bytes.byteLength>MAX)throw new Error('Downloaded file exceeds 20 MB');
  const hash=await sha256(bytes);
  const {data:byHash,error:hashErr}=await db.from('pppp_expense_receipts_v1').select('id,status,drive_file_id').eq('content_sha256',hash).maybeSingle();if(hashErr)throw hashErr;
  if(byHash){
    if(!byHash.drive_file_id)await db.from('pppp_expense_receipts_v1').update({drive_file_id:f.id,drive_file_url:f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`,updated_at:new Date().toISOString()}).eq('id',byHash.id).is('drive_file_id',null);
    await moveProcessed(f.id);return {file_id:f.id,name:f.name,event:'duplicate_content',receipt_id:byHash.id};
  }
  const id=crypto.randomUUID(),now=new Date(),path=`drive/${now.getUTCFullYear()}/${String(now.getUTCMonth()+1).padStart(2,'0')}/${id}-${safe(text(f.name,100))}`;
  const {error:upErr}=await db.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:false,cacheControl:'3600'});if(upErr)throw upErr;
  const row={id,source_type:'drive',source_ref:`drive:${f.id}`,drive_file_id:f.id,drive_file_url:f.webViewLink||`https://drive.google.com/file/d/${f.id}/view`,file_name:text(f.name,240)||`receipt-${f.id}`,mime_type:mime,size_bytes:bytes.byteLength,content_sha256:hash,storage_bucket:BUCKET,storage_path:path,status:'needs_ocr'};
  const {error:insErr}=await db.from('pppp_expense_receipts_v1').insert(row);if(insErr){await db.storage.from(BUCKET).remove([path]);throw insErr;}
  const {data:job,error:qErr}=await db.rpc('local_ocr_enqueue_expense_receipt_v1',{p_receipt_id:id});
  if(qErr)await db.from('pppp_expense_receipts_v1').update({status:'failed',last_error:`OCR queue: ${qErr.message}`,updated_at:new Date().toISOString()}).eq('id',id);
  await moveProcessed(f.id);
  return {file_id:f.id,name:f.name,event:qErr?'saved_ocr_queue_failed':'ingested',receipt_id:id,ocr_job_id:qErr?null:job};
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(!(await authorized(req)))return json({ok:false,error:'unauthorized'},401);
  try{
    const u=new URL(req.url),limit=Math.min(25,Math.max(1,Number(u.searchParams.get('limit')||10))),files=await listFiles(limit),items:any[]=[];let ingested=0,duplicates=0,errors=0;
    for(const f of files){try{const x=await ingestOne(f);items.push(x);if(x.event==='ingested')ingested++;if(x.event==='duplicate_content'||x.event==='already_ingested')duplicates++;}catch(e){errors++;items.push({file_id:f.id,name:f.name,event:'error',error:String(e instanceof Error?e.message:e).slice(0,700)});}}
    return json({ok:true,checked:files.length,ingested,duplicates,errors,items,no_paid_api:true,human_confirmation_required:true});
  }catch(e){return json({ok:false,error:String(e instanceof Error?e.message:e).slice(0,1000)},500);}
});
