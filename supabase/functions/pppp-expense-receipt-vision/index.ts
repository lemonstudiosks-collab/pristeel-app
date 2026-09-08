import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_KEY=Deno.env.get('OPENAI_API_KEY')||'';
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Content-Type':'application/json'
};
const json=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Cache-Control':'no-store'}});
const text=(v:any,max=1000)=>String(v??'').trim().slice(0,max);
const numberOrNull=(v:any)=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const categories=new Set(['rryma','uji','nafta','qira','telefon','mirembajtje','sherbime','transport','sigurime','tjera']);
function outputText(data:any){
  if(data?.output_text)return String(data.output_text);
  for(const out of data?.output||[])for(const c of out?.content||[])if(c?.type==='output_text'&&c?.text)return String(c.text);
  return '';
}
function bytesToBase64(bytes:Uint8Array){
  let out='';const step=0x8000;
  for(let i=0;i<bytes.length;i+=step)out+=String.fromCharCode(...bytes.subarray(i,Math.min(i+step,bytes.length)));
  return btoa(out);
}
async function requireUser(req:Request){
  const auth=req.headers.get('Authorization')||'';
  if(!auth.toLowerCase().startsWith('bearer '))throw new Error('unauthorized');
  const token=auth.replace(/^Bearer\s+/i,'').trim();
  const {data,error}=await db.auth.getUser(token);
  if(error||!data?.user)throw new Error('unauthorized');
  return data.user;
}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return json({ok:false,error:'POST required'},405);
  try{
    await requireUser(req);
    if(!OPENAI_KEY)return json({ok:false,error:'Vision fallback is not configured'},503);
    const body=await req.json().catch(()=>({}));
    const receiptId=text(body?.receipt_id,80);
    if(!/^[0-9a-f-]{36}$/i.test(receiptId))return json({ok:false,error:'receipt_id required'},400);
    const {data:r,error}=await db.from('pppp_expense_receipts_v1')
      .select('id,status,file_name,mime_type,storage_bucket,storage_path,expense_id')
      .eq('id',receiptId).maybeSingle();
    if(error)throw error;
    if(!r)return json({ok:false,error:'Receipt not found'},404);
    if(r.expense_id||['confirmed','ignored','duplicate'].includes(String(r.status)))return json({ok:false,error:'Receipt is not eligible for OCR fallback'},409);
    const mime=String(r.mime_type||'').toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(mime))return json({ok:false,error:'Vision fallback currently supports JPG, PNG and WebP receipts'},415);
    const {data:file,error:fileError}=await db.storage.from(r.storage_bucket||'expense-receipts').download(r.storage_path);
    if(fileError||!file)throw fileError||new Error('Receipt image could not be downloaded');
    if(file.size>12*1024*1024)return json({ok:false,error:'Receipt image is too large for vision fallback'},413);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const dataUrl=`data:${mime};base64,${bytesToBase64(bytes)}`;
    const model=Deno.env.get('OPENAI_RECEIPT_VISION_MODEL')||Deno.env.get('OPENAI_ASSISTANT_MODEL')||Deno.env.get('OPENAI_CONTEXT_MODEL')||'gpt-5.6-luna';
    const schema={
      type:'object',additionalProperties:false,
      properties:{
        raw_text:{type:'string'},supplier:{type:['string','null']},invoice_nr:{type:['string','null']},date:{type:['string','null']},
        category:{type:'string',enum:['rryma','uji','nafta','qira','telefon','mirembajtje','sherbime','transport','sigurime','tjera']},
        amount:{type:['number','null']},net_amount:{type:['number','null']},vat_rate:{type:['number','null']},vat_amount:{type:['number','null']},
        currency:{type:'string'},vehicle_plate:{type:['string','null']},quantity:{type:['number','null']},unit:{type:['string','null']},unit_price:{type:['number','null']},
        confidence:{type:'integer',minimum:0,maximum:100},review_fields:{type:'array',items:{type:'string'}}
      },
      required:['raw_text','supplier','invoice_nr','date','category','amount','net_amount','vat_rate','vat_amount','currency','vehicle_plate','quantity','unit','unit_price','confidence','review_fields']
    };
    const instructions=[
      'You extract accounting data from a photographed business expense receipt or invoice for PRISTEEL.',
      'Read the image visually even when ordinary OCR would fail. Never invent a value that is not supported by the image.',
      'Return the document date as YYYY-MM-DD. amount is the final gross/payable amount. net_amount is amount before VAT. vat_amount is VAT value and vat_rate is the printed VAT percentage when available.',
      'For fuel, category must be nafta and extract quantity in litres, unit L and unit_price when visible. Restaurant/hotel/professional service expenses map to sherbime; parking/toll/logistics map to transport.',
      'Allowed categories are rryma,uji,nafta,qira,telefon,mirembajtje,sherbime,transport,sigurime,tjera.',
      'For Kosovo/Albanian documents, labels may include Fatura, Data, Pa TVSH, TVSH, Për pagesë, Sasia, Çmimi. Supplier is the seller/issuer, not PRISTEEL if PRISTEEL appears as customer.',
      'raw_text should be a compact transcription of the useful visible text. review_fields must contain field names that are missing, ambiguous or low confidence.',
      'This is extraction only. Do not approve, pay, or register the expense.'
    ].join(' ');
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',headers:{Authorization:'Bearer '+OPENAI_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model,store:false,reasoning:{effort:'low'},instructions,input:[{role:'user',content:[{type:'input_text',text:'Extract this expense receipt into the required schema.'},{type:'input_image',image_url:dataUrl,detail:'high'}]}],text:{format:{type:'json_schema',name:'expense_receipt_extract',strict:true,schema}}})
    });
    const raw=await response.text();
    if(!response.ok)throw new Error('OpenAI '+response.status+': '+raw.slice(0,500));
    let payload:any={};try{payload=JSON.parse(raw)}catch{}
    const extractedRaw=outputText(payload);if(!extractedRaw)throw new Error('Vision provider returned no structured result');
    let x:any={};try{x=JSON.parse(extractedRaw)}catch{throw new Error('Vision provider returned invalid JSON');}
    const category=categories.has(String(x.category||''))?String(x.category):'tjera';
    const date=/^\d{4}-\d{2}-\d{2}$/.test(String(x.date||''))?String(x.date):null;
    const parsed={
      supplier:text(x.supplier,240)||null,invoice_nr:text(x.invoice_nr,120)||null,date,category,
      amount:numberOrNull(x.amount),net_amount:numberOrNull(x.net_amount),vat_rate:numberOrNull(x.vat_rate),vat_amount:numberOrNull(x.vat_amount),
      currency:(text(x.currency,10)||'EUR').toUpperCase(),vehicle_plate:text(x.vehicle_plate,40)||null,quantity:numberOrNull(x.quantity),unit:text(x.unit,20)||null,unit_price:numberOrNull(x.unit_price),
      confidence:Math.max(0,Math.min(100,Math.round(Number(x.confidence)||0))),review_fields:Array.isArray(x.review_fields)?x.review_fields.map((v:any)=>text(v,60)).filter(Boolean).slice(0,30):[]
    };
    if(!parsed.supplier&&!parsed.review_fields.includes('supplier'))parsed.review_fields.push('supplier');
    if(!parsed.date&&!parsed.review_fields.includes('date'))parsed.review_fields.push('date');
    if(!(parsed.amount&&parsed.amount>0)&&!parsed.review_fields.includes('amount'))parsed.review_fields.push('amount');
    const metadata={provider:'openai-vision-fallback-v1',model:payload?.model||model,response_id:payload?.id||null,reason:String(r.status)==='no_text'?'local_ocr_no_text':'manual_or_processing_fallback'};
    const {data:updated,error:updateError}=await db.from('pppp_expense_receipts_v1').update({
      status:'review',ocr_text:text(x.raw_text,120000),ocr_metadata:metadata,parsed_data:parsed,
      supplier:parsed.supplier,invoice_nr:parsed.invoice_nr,expense_date:parsed.date,category:parsed.category,amount:parsed.amount,net_amount:parsed.net_amount,
      vat_rate:parsed.vat_rate,vat_amount:parsed.vat_amount,currency:parsed.currency,vehicle_plate:parsed.vehicle_plate,quantity:parsed.quantity,unit:parsed.unit,unit_price:parsed.unit_price,
      confidence:parsed.confidence,review_fields:parsed.review_fields,last_error:null,updated_at:new Date().toISOString()
    }).eq('id',receiptId).is('expense_id',null).select('id,status,supplier,invoice_nr,expense_date,category,amount,net_amount,vat_rate,vat_amount,currency,vehicle_plate,quantity,unit,unit_price,confidence,review_fields,expense_id').single();
    if(updateError)throw updateError;
    return json({ok:true,receipt:updated,provider:metadata,human_confirmation_required:true,expense_created:false});
  }catch(e){
    const message=String(e instanceof Error?e.message:e).slice(0,1000);
    const status=message==='unauthorized'?401:500;
    return json({ok:false,error:message},status);
  }
});