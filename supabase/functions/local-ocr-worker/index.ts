import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type, x-pppp-worker-id, x-pppp-worker-token','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
function json(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
async function sha256Hex(v:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
async function authenticate(req:Request){
  const workerId=(req.headers.get('x-pppp-worker-id')||'').trim(),rawToken=req.headers.get('x-pppp-worker-token')||'';if(!workerId||!rawToken)return null;
  const {data,error}=await db.from('local_ocr_workers').select('worker_id,token_sha256,enabled').eq('worker_id',workerId).maybeSingle();if(error||!data||data.enabled!==true)return null;
  const stored=String(data.token_sha256||''),actual=await sha256Hex(rawToken);if(!safeEqual(actual,stored)){const legacy=await sha256Hex(rawToken+'\n');if(!safeEqual(legacy,stored))return null;}
  await db.from('local_ocr_workers').update({last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('worker_id',workerId);return workerId;
}
async function jobSource(jobId:number){
  const {data:j,error}=await db.from('local_ocr_jobs').select('id,attachment_link_id,expense_receipt_id,status,worker_id,claimed_at').eq('id',jobId).maybeSingle();if(error)throw error;if(!j)throw new Error('OCR job not found');
  if(j.expense_receipt_id){
    const {data:r,error:e}=await db.from('pppp_expense_receipts_v1').select('id,file_name,mime_type,content_sha256,storage_bucket,storage_path').eq('id',j.expense_receipt_id).maybeSingle();if(e)throw e;if(!r)throw new Error('Expense receipt source not found');
    return {job:j,source:{attachment_link_id:null,expense_receipt_id:r.id,project_id:'',file_name:r.file_name,mime_type:r.mime_type||'application/octet-stream',source_sha256:r.content_sha256||null,bucket:r.storage_bucket||'expense-receipts',path:r.storage_path}};
  }
  const {data:a,error:e}=await db.from('project_attachment_links').select('id,project_id,attachment_name,attachment_mime_type,content_sha256,storage_bucket,storage_path').eq('id',j.attachment_link_id).maybeSingle();if(e)throw e;if(!a)throw new Error('Source attachment not found');
  return {job:j,source:{attachment_link_id:a.id,expense_receipt_id:null,project_id:String(a.project_id||''),file_name:a.attachment_name||`attachment-${a.id}`,mime_type:a.attachment_mime_type||'application/octet-stream',source_sha256:a.content_sha256||null,bucket:a.storage_bucket||'project-source-files',path:a.storage_path}};
}
async function makeJobPayload(jobId:number){
  const {source}=await jobSource(jobId);if(!source.path)throw new Error('Source document has no archived storage_path');
  const {data:signed,error}=await db.storage.from(source.bucket).createSignedUrl(String(source.path),600);if(error||!signed?.signedUrl)throw error||new Error('Could not create signed source URL');
  return {job_id:jobId,attachment_link_id:source.attachment_link_id,expense_receipt_id:source.expense_receipt_id,project_id:source.project_id,file_name:String(source.file_name),mime_type:String(source.mime_type),source_sha256:source.source_sha256?String(source.source_sha256):null,download_url:signed.signedUrl,download_url_expires_seconds:600};
}
async function claim(workerId:string){
  const {data,error}=await db.rpc('local_ocr_claim_job',{p_worker_id:workerId});if(error)throw error;const row=Array.isArray(data)?data[0]:null;if(!row)return{ok:true,job:null};
  try{return{ok:true,job:await makeJobPayload(Number(row.job_id))};}catch(e){await db.rpc('local_ocr_fail_job',{p_worker_id:workerId,p_job_id:Number(row.job_id),p_error:String(e).slice(0,1000)});throw e;}
}
async function current(workerId:string){
  const {data,error}=await db.from('local_ocr_jobs').select('id,status,worker_id,claimed_at').eq('worker_id',workerId).eq('status','processing').order('claimed_at',{ascending:false}).limit(1);if(error)throw error;const row=(data||[])[0];if(!row)return{ok:true,job:null};return{ok:true,job:await makeJobPayload(Number(row.id))};
}
async function submit(workerId:string,body:any){
  const jobId=Number(body?.job_id||0),text=String(body?.text??body?.result_text??''),metadata=body?.metadata&&typeof body.metadata==='object'?body.metadata:{},sourceSha=String(body?.source_sha256||metadata?.source_sha256||'').toLowerCase();
  if(!Number.isInteger(jobId)||jobId<=0)return json({ok:false,error:'invalid job_id'},400);if(!text.trim())return json({ok:false,error:'OCR text is empty'},400);if(text.length>500000)return json({ok:false,error:'OCR text exceeds 500000 characters'},413);
  const {job,source}=await jobSource(jobId);if(job.status!=='processing'||job.worker_id!==workerId)return json({ok:false,error:'job is not owned by this worker'},409);
  const expectedSha=String(source.source_sha256||'').toLowerCase();if(expectedSha&&(!sourceSha||!safeEqual(expectedSha,sourceSha)))return json({ok:false,error:'source_sha256 mismatch'},409);
  const storedMetadata={...metadata,source_sha256:sourceSha||expectedSha||null,worker_id:workerId,source_type:source.expense_receipt_id?'expense_receipt':'project_attachment',received_at:new Date().toISOString()};
  const {data:accepted,error}=await db.rpc('local_ocr_submit_result',{p_worker_id:workerId,p_job_id:jobId,p_result_text:text,p_result_metadata:storedMetadata});if(error)throw error;if(accepted!==true)return json({ok:false,error:'result was not accepted'},409);return json({ok:true,job_id:jobId,stored_characters:text.length,source_type:source.expense_receipt_id?'expense_receipt':'project_attachment'});
}
async function fail(workerId:string,body:any){const jobId=Number(body?.job_id||0),errorText=String(body?.error||'Worker reported failure');if(!Number.isInteger(jobId)||jobId<=0)return json({ok:false,error:'invalid job_id'},400);const {data:accepted,error}=await db.rpc('local_ocr_fail_job',{p_worker_id:workerId,p_job_id:jobId,p_error:errorText});if(error)throw error;return json({ok:accepted===true,job_id:jobId},accepted===true?200:409);}
async function heartbeat(workerId:string,body:any){const jobId=Number(body?.job_id||0);if(!Number.isInteger(jobId)||jobId<=0)return json({ok:false,error:'invalid job_id'},400);const {data:accepted,error}=await db.rpc('local_ocr_heartbeat',{p_worker_id:workerId,p_job_id:jobId});if(error)throw error;return json({ok:accepted===true,job_id:jobId},accepted===true?200:409);}
Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});const workerId=await authenticate(req);if(!workerId)return json({ok:false,error:'unauthorized'},401);
  try{const url=new URL(req.url);let body:any={};if(req.method==='POST')try{body=await req.json();}catch{}const action=String(body?.action||url.searchParams.get('action')||'ping');
    if(action==='ping')return json({ok:true,service:'local-ocr-worker-v4',worker_id:workerId,expense_receipts:true});
    if(action==='claim')return json(await claim(workerId));if(action==='current')return json(await current(workerId));if(action==='submit')return await submit(workerId,body);if(action==='fail')return await fail(workerId,body);if(action==='heartbeat')return await heartbeat(workerId,body);return json({ok:false,error:`unknown action: ${action}`},400);
  }catch(e){return json({ok:false,error:String(e).slice(0,1500)},500);}
});
