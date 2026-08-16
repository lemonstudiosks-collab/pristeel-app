import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";
import mammoth from "npm:mammoth@1.9.1";
import pdfParse from "npm:pdf-parse@1.1.1";
import { Buffer } from "node:buffer";
import { analyzeText, classifyUnsupported, decodeBase64UrlBytes, extOf, mimeGuess, safeFileName, sha256Hex } from "./document-intelligence.mjs";

const SA_JSON=Deno.env.get("GOOGLE_SA_JSON")!,GMAIL_USER=Deno.env.get("GMAIL_USER")!,SUPABASE_URL=Deno.env.get("SUPABASE_URL")!,SERVICE_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,BUCKET="project-source-files";
const db=createClient(SUPABASE_URL,SERVICE_KEY);
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-pppp-cron-secret","Access-Control-Allow-Methods":"POST, GET, OPTIONS"};
type L={id:number;gmail_message_id:string;gmail_thread_id:string|null;attachment_id:string;attachment_name:string|null;project_id:string;drive_file_id:string|null;storage_path?:string|null;analysis_status?:string|null;created_at?:string|null};
const cols="id,gmail_message_id,gmail_thread_id,attachment_id,attachment_name,project_id,drive_file_id,storage_path,analysis_status,created_at";

function b64url(input:Uint8Array|string){const bytes=typeof input==="string"?new TextEncoder().encode(input):input;let bin="";for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function pem(p:string){const x=p.replace(/-----BEGIN PRIVATE KEY-----/,"").replace(/-----END PRIVATE KEY-----/,"").replace(/\s+/g,"");const bin=atob(x),b=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)b[i]=bin.charCodeAt(i);return b.buffer;}
let token:{v:string;exp:number}|null=null;
async function gmailToken(){const now=Math.floor(Date.now()/1000);if(token&&token.exp>now+60)return token.v;const sa=JSON.parse(SA_JSON),head={alg:"RS256",typ:"JWT"},claim={iss:sa.client_email,sub:GMAIL_USER,scope:"https://www.googleapis.com/auth/gmail.readonly",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600},u=`${b64url(JSON.stringify(head))}.${b64url(JSON.stringify(claim))}`,key=await crypto.subtle.importKey("pkcs8",pem(sa.private_key),{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]),sig=new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(u))),jwt=`${u}.${b64url(sig)}`,r=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:jwt})}),j=await r.json();if(!r.ok)throw new Error(`Google token ${r.status}: ${j?.error||"failed"}`);token={v:j.access_token,exp:now+(j.expires_in||3600)};return token.v;}
async function auth(req:Request){const provided=req.headers.get("x-pppp-cron-secret")||"";if(!provided)return false;const {data,error}=await db.rpc("gmail_tracker_cron_authorized",{provided});return !error&&data===true;}
async function gmail(path:string){const t=await gmailToken(),r=await fetch(`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(GMAIL_USER)}${path}`,{headers:{Authorization:`Bearer ${t}`}}),x=await r.text();if(!r.ok)throw new Error(`Gmail ${r.status}: ${x.slice(0,400)}`);return x?JSON.parse(x):{};}

function collectParts(node:any,out:any[]=[]):any[]{if(!node)return out;const aid=String(node.body?.attachmentId||"").trim(),name=String(node.filename||"").trim();if(aid&&name)out.push(node);for(const c of node.parts||[])collectParts(c,out);return out;}
async function resolvePart(link:L,payload:any){
  const parts=collectParts(payload,[]),exact=parts.find((p:any)=>String(p.body?.attachmentId||"")===String(link.attachment_id));
  if(exact)return exact;
  const name=String(link.attachment_name||"").trim();if(!name)throw new Error("Attachment MIME part not found and filename missing");
  const same=parts.filter((p:any)=>String(p.filename||"").trim()===name);if(same.length===1)return same[0];if(!same.length)throw new Error(`Attachment not found by current MIME filename: ${name}`);
  const {data:siblings,error}=await db.from("project_attachment_links").select("id").eq("gmail_message_id",link.gmail_message_id).eq("project_id",link.project_id).eq("attachment_name",name).order("id",{ascending:true});if(error)throw error;
  const rows=siblings||[];if(rows.length!==same.length)throw new Error(`Ambiguous current MIME attachment mapping for ${name}: ${same.length} live parts vs ${rows.length} registered links`);
  const idx=rows.findIndex((x:any)=>Number(x.id)===Number(link.id));if(idx>=0&&same[idx])return same[idx];
  throw new Error(`Ambiguous current MIME attachment mapping for ${name}`);
}
async function bytes(link:L){const full=await gmail(`/messages/${encodeURIComponent(link.gmail_message_id)}?format=full`),p=await resolvePart(link,full?.payload),liveId=String(p.body?.attachmentId||"");if(!liveId)throw new Error("Resolved attachment has no live Gmail attachment id");const a=await gmail(`/messages/${encodeURIComponent(link.gmail_message_id)}/attachments/${encodeURIComponent(liveId)}`),b=decodeBase64UrlBytes(String(a?.data||""));if(!b.length)throw new Error("Empty Gmail attachment");return {b,mime:mimeGuess(link.attachment_name||"",String(p.mimeType||"")),size:Number(a?.size||p.body?.size||b.length)||b.length};}

async function bucket(){const {data}=await db.storage.getBucket(BUCKET);if(data)return;const {error}=await db.storage.createBucket(BUCKET,{public:false,fileSizeLimit:30*1024*1024});if(error&&!/already exists/i.test(error.message))throw error;}
async function archive(link:L,b:Uint8Array,mime:string){await bucket();const path=`${link.project_id}/gmail/${link.gmail_message_id}/${link.id}-${safeFileName(link.attachment_name||`attachment-${link.id}`)}`,{error}=await db.storage.from(BUCKET).upload(path,b,{contentType:mime,upsert:false});if(error&&!/already exists|duplicate/i.test(error.message))throw error;return path;}

async function extract(b:Uint8Array,name:string,mime:string){
  const e=extOf(name),m=String(mime||"").toLowerCase();
  try{
    if(e==="pdf"||m.includes("pdf")){const p:any=await (pdfParse as any)(Buffer.from(b)),text=String(p?.text||"").slice(0,120000);return {text,method:"pdf-parse-v1",status:text.trim()?"extracted":"needs_ocr"};}
    if(e==="docx"||m.includes("wordprocessingml")){const p:any=await mammoth.extractRawText({buffer:Buffer.from(b)} as any),text=String(p?.value||"").slice(0,120000);return {text,method:"mammoth-v1",status:text.trim()?"extracted":"review"};}
    if(["xlsx","xls"].includes(e)||m.includes("spreadsheetml")||m==="application/vnd.ms-excel"){const wb=XLSX.read(Buffer.from(b),{type:"buffer"}),out:string[]=[];for(const s of wb.SheetNames.slice(0,20))out.push(`Sheet: ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s])}`);return {text:out.join("\n\n").slice(0,120000),method:"xlsx-v1",status:out.length?"extracted":"review"};}
    if(m.startsWith("text/")||["csv","txt","md","json","xml","html","dxf"].includes(e)||m==="application/json"||m==="application/xml"||m.includes("dxf"))return {text:new TextDecoder("utf-8",{fatal:false}).decode(b).slice(0,120000),method:e==="dxf"?"dxf-ascii-v1":"text-v1",status:"extracted"};
    const u=classifyUnsupported(name,mime);return {text:"",method:u.kind,status:u.status,error:u.reason};
  }catch(e2){return {text:"",method:`extract-error-${e||"file"}`,status:"retry",error:String(e2)};}
}
function std(f:any){return (f?.standards||[]).find((x:string)=>/EN\s*10025/i.test(x))||(f?.standards||[])[0]||null;}
async function bom(project:any,link:L,a:any){const c=(a?.auto_bom_candidates||[]).filter((x:any)=>x.complete&&Number(x.confidence)>=.96);if(!c.length)return 0;const keys=c.map((x:any)=>String(x.source_item_key)),{data:e}=await db.from("bom_items").select("source_item_key").eq("source_attachment_link_id",link.id).in("source_item_key",keys),known=new Set((e||[]).map((x:any)=>String(x.source_item_key))),base=Date.now()*1000,rows=c.filter((x:any)=>!known.has(String(x.source_item_key))).map((x:any,i:number)=>({id:base+i,project_id:project.id,project_name:project.name,pozicioni:`AUTO-${link.id}-${i+1}`,materiali:x.grade||null,dimensionet:[x.profile,x.dim].filter(Boolean).join(" "),sasia:x.pcs,kg_unit:x.kg_unit,profile:x.profile,dim:x.dim,grade:x.grade,std:std(a.facts),len_mm:x.len_mm,pcs:x.pcs,kg:x.kg,surface:(a.facts?.surface||[])[0]||"none",cert:(a.facts?.certificates||[])[0]||null,source_attachment_link_id:link.id,source_file_name:link.attachment_name,source_locator:x.source_locator,source_item_key:x.source_item_key,extraction_method:"document-intake-v1",extraction_confidence:x.confidence,auto_generated:true,needs_review:false}));if(!rows.length)return 0;const {error}=await db.from("bom_items").insert(rows);if(error)throw error;return rows.length;}
async function task(project:any,link:L,reason:string,count=0){const {error}=await db.from("tasks").upsert({project_id:project.id,title:`Rishiko dokumentin teknik: ${safeFileName(link.attachment_name||"attachment")}`,detail:[reason,count?`${count} pozicione BOM kerkojne verifikim.`:"",`Project: ${project.name}`,`Attachment link #${link.id}`].filter(Boolean).join("\n"),due_date:new Date().toISOString().slice(0,10),priority:"larte",status:"hapur",source:"document_bom_review",source_ref:`ATTACHMENT:${link.id}`,category:"intern"},{onConflict:"source,source_ref",ignoreDuplicates:true});if(error)throw error;}

async function process(link:L,apply=true){
  const {data:project,error}=await db.from("projects").select("id,name").eq("id",link.project_id).maybeSingle();if(error||!project)throw error||new Error("Project not found");
  if(!apply)return {id:link.id,project_id:link.project_id,name:link.attachment_name,status:link.analysis_status};
  const g=await bytes(link),hash=await sha256Hex(g.b),path=link.storage_path||await archive(link,g.b,g.mime),now=new Date().toISOString();
  await db.from("project_attachment_links").update({attachment_mime_type:g.mime,attachment_size_bytes:g.size,content_sha256:hash,storage_backend:"supabase-storage",storage_bucket:BUCKET,storage_path:path,archived_at:now,archive_method:"gmail-storage-v1",analysis_status:"archived",updated_at:now}).eq("id",link.id);
  const x=await extract(g.b,link.attachment_name||"",g.mime);let a:any=null,applied=0,bs="none";
  if(x.text.trim()){
    a=analyzeText(x.text,{name:link.attachment_name||"",mime:g.mime});try{applied=await bom(project,link,a);}catch(e){a.apply_error=String(e);}
    const review=(a.review_bom_candidates||[]).length;if(applied&&review)bs="partial_review";else if(applied)bs="applied";else if(review)bs="review";
    if(review)await task(project,link,"Dokumenti ka pozicione teknike qe nuk plotesojne pragun e sigurte per shkrim automatik ne BOM.",review);
  }else if(["needs_conversion","needs_ocr","review"].includes(x.status)){
    bs=x.status==="needs_conversion"?"needs_conversion":"review";await task(project,link,x.error||"Dokumenti u ruajt, por permbajtja nuk mund te nxirret me besueshmeri automatikisht.");
  }
  const status=a?"analyzed":x.status,{error:ue}=await db.from("project_attachment_links").update({analysis_status:status,analysis_method:x.method,extracted_text:a?.text||null,extracted_data:a?{facts:a.facts,file_name:link.attachment_name,mime_type:g.mime}:{file_name:link.attachment_name,mime_type:g.mime,reason:x.error||null},analysis_confidence:a?.confidence??null,analysis_error:x.error||a?.apply_error||null,analyzed_at:new Date().toISOString(),bom_status:bs,bom_candidates:a?.bom_candidates||[],bom_applied_count:applied,updated_at:new Date().toISOString()}).eq("id",link.id);if(ue)throw ue;
  return {id:link.id,project_id:link.project_id,name:link.attachment_name,mime:g.mime,size:g.size,archived:true,analysis_status:status,analysis_method:x.method,characters:a?.text?.length||0,bom_candidates:a?.bom_candidates?.length||0,bom_applied:applied,bom_status:bs};
}
async function recordError(id:number,e:any){await db.from("project_attachment_links").update({analysis_status:"retry",analysis_error:String(e).slice(0,2000),updated_at:new Date().toISOString()}).eq("id",id);}
async function run(limit=5,apply=true){const max=Math.min(10,Math.max(1,Math.floor(Number(limit)||5))),{data,error}=await db.from("project_attachment_links").select(cols).in("analysis_status",["pending","retry","archived"]).order("created_at",{ascending:true}).limit(max);if(error)throw error;const out=[];for(const row of (data||[]) as L[]){try{out.push(await process(row,apply));}catch(e){if(apply)await recordError(row.id,e);out.push({id:row.id,name:row.attachment_name,error:String(e)});}}return {candidates:(data||[]).length,processed:out.filter((x:any)=>!x.error).length,errors:out.filter((x:any)=>x.error).length,items:out};}
async function processId(id:number){if(!Number.isInteger(id)||id<=0)throw new Error("Invalid attachment link id");const {data,error}=await db.from("project_attachment_links").select(cols).eq("id",id).maybeSingle();if(error)throw error;if(!data)throw new Error("Attachment link not found");try{return await process(data as L,true);}catch(e){await recordError(id,e);throw e;}}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(!(await auth(req)))return new Response(JSON.stringify({ok:false,error:"unauthorized"}),{status:401,headers:{...cors,"Content-Type":"application/json"}});
  try{
    const u=new URL(req.url);let action=u.searchParams.get("action")||"run",p:any={};if(req.method==="POST")try{p=await req.json();action=p.action||action;}catch{}
    if(action==="ping")return new Response(JSON.stringify({ok:true,service:"project-document-intake-v5"}),{headers:{...cors,"Content-Type":"application/json"}});
    const limit=Number(u.searchParams.get("limit")||p.limit||5);
    if(action==="preview")return new Response(JSON.stringify({ok:true,...await run(limit,false)}),{headers:{...cors,"Content-Type":"application/json"}});
    if(action==="run")return new Response(JSON.stringify({ok:true,...await run(limit,true)}),{headers:{...cors,"Content-Type":"application/json"}});
    if(action==="process_id"){const id=Number(u.searchParams.get("id")||p.id||0);return new Response(JSON.stringify({ok:true,item:await processId(id)}),{headers:{...cors,"Content-Type":"application/json"}});}
    return new Response(JSON.stringify({ok:false,error:`unknown action: ${action}`}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  }catch(e){return new Response(JSON.stringify({ok:false,error:String(e)}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});
