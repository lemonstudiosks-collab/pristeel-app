import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')||'';
const BUCKET='project-source-files';
const IMPORT_VERSION='protected-archive-upload-v1';
const MAX_FILE_BYTES=30*1024*1024;
const ALLOWED_EXT=new Set(['pdf','doc','docx','xls','xlsx','csv','txt','rtf']);
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
function text(v:unknown,max=6000){return String(v==null?'':v).trim().slice(0,max);}
function isUuid(v:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v,80));}
function normalizeName(v:unknown){return text(v,500).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();}
function safeName(v:unknown){return text(v,260).replace(/[\\/:*?"<>|\u0000-\u001f]/g,'_').replace(/\s+/g,' ').trim().replace(/^\.+/,'').slice(0,180)||'document.bin';}
function extension(v:unknown){const m=text(v,260).toLowerCase().match(/\.([a-z0-9]{2,5})$/);return m?m[1]:'';}
function mimeFor(name:string,current:unknown){if(text(current,160))return text(current,160);const x=extension(name);return x==='pdf'?'application/pdf':x==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':x==='doc'?'application/msword':x==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':x==='xls'?'application/vnd.ms-excel':x==='csv'?'text/csv':x==='rtf'?'application/rtf':'text/plain';}
function bytesFromBase64(raw:unknown){const clean=text(raw,44*1024*1024).replace(/^data:[^,]+,/,'').replace(/\s+/g,'');if(!clean)return new Uint8Array();let bin='';try{bin=atob(clean);}catch{throw new Error('invalid_file_base64');}const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function sha256Hex(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function archiveRows(payload:any){const a=payload?.protected_archive;return Array.isArray(a)?a:Array.isArray(a?.documents)?a.documents:[];}
function mergeArchive(rows:any[],entry:any){const out=[] as any[],seen=new Set<string>(),key=normalizeName(entry?.name);for(const row of rows||[]){const k=normalizeName(row?.name);if(!k||k===key||seen.has(k))continue;seen.add(k);out.push(row);}out.push(entry);return out;}
function remainingExpected(expected:string[],archive:any[]){const got=new Set(archive.map(x=>normalizeName(x?.name)).filter(Boolean));return expected.filter(x=>!got.has(normalizeName(x)));}
async function visibleTender(auth:string,tenderId:string){const u=`${SUPABASE_URL}/rest/v1/kek_tender_watch?id=eq.${encodeURIComponent(tenderId)}&select=*&limit=1`;const r=await fetch(u,{headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'}});const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok)throw new Error(`tender_visibility_${r.status}`);return Array.isArray(body)?body[0]:null;}
async function runProtectedArchiveAnalysis(auth:string,tenderId:string){const r=await fetch(`${SUPABASE_URL}/functions/v1/pppp-tender-protected-archive-analysis`,{method:'POST',headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({tender_id:tenderId})});const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok||!body||body.ok===false)throw new Error(text(body?.message||body?.error||`protected_archive_analysis_${r.status}`,1000));return body;}
async function persistPartialState(tender:any,archive:any[],remaining:string[],now:string){const prior=tender?.payload?.dossier_analysis&&typeof tender.payload.dossier_analysis==='object'?tender.payload.dossier_analysis:null;const partial=prior?{...prior,dossier_complete:false,protected_documents:remaining,import_state:'protected_archive_partial',imported_documents:archive.map(x=>({name:x.name,sha256:x.sha256||null,archived_at:x.archived_at||null}))}:prior;const payload={...(tender?.payload||{}),protected_archive:archive,protected_archive_updated_at:now,protected_archive_import_version:IMPORT_VERSION,protected_archive_imported_at:now,...(partial?{dossier_analysis:partial}:{} )};const {error}=await db.from('kek_tender_watch').update({payload,updated_at:now}).eq('id',tender.id);if(error)throw error;}

Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 try{
  const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))return json({ok:false,error:'unauthorized'},401);
  if(!SUPABASE_URL||!SERVICE_KEY||!ANON_KEY)return json({ok:false,error:'supabase_environment_missing'},500);
  let body:any={};try{body=await req.json();}catch{}
  const tenderId=text(body?.tender_id,80);if(!isUuid(tenderId))return json({ok:false,error:'valid_tender_id_required'},400);
  const tender=await visibleTender(auth,tenderId);if(!tender)return json({ok:false,error:'tender_not_found_or_not_visible'},404);
  const mode=text(body?.mode||'upload',40).toLowerCase();
  const q=await db.from('pppp_tender_fetch_queue').select('*').eq('tender_watch_id',tenderId).maybeSingle();if(q.error)throw q.error;const queue=q.data;
  const expected=((Array.isArray(queue?.protected_documents)&&queue.protected_documents.length?queue.protected_documents:tender?.payload?.dossier_analysis?.protected_documents)||[]).map(String).filter(Boolean);
  if(!expected.length)return json({ok:false,error:'protected_document_list_missing',message:'Rilexo dosjen zyrtare në PPPP para importimit.'},409);
  let archive=archiveRows(tender.payload);
  if(mode==='status')return json({ok:true,tender_id:tenderId,dossier_complete:remainingExpected(expected,archive).length===0,remaining_protected_documents:remainingExpected(expected,archive),archived_documents:archive.map(x=>({name:x.name,sha256:x.sha256||null,archived_at:x.archived_at||null}))});
  if(mode==='finalize'){
    const remaining=remainingExpected(expected,archive);if(remaining.length)return json({ok:false,error:'protected_archive_incomplete',remaining_protected_documents:remaining},409);
    const analysis=await runProtectedArchiveAnalysis(auth,tenderId);return json({ok:true,tender_id:tenderId,dossier_complete:true,remaining_protected_documents:[],analysis});
  }
  if(mode!=='upload')return json({ok:false,error:'unsupported_mode'},400);
  const expectedName=safeName(body?.expected_name||'');if(!expectedName||!expected.some(x=>normalizeName(x)===normalizeName(expectedName)))return json({ok:false,error:'document_not_expected',message:'Ky dokument nuk është në listën aktuale të dokumenteve të munguara.'},409);
  const file=body?.file||{},actualName=safeName(file?.name||expectedName),expectedExt=extension(expectedName),actualExt=extension(actualName);if(!ALLOWED_EXT.has(expectedExt)||!ALLOWED_EXT.has(actualExt))return json({ok:false,error:'unsupported_file_type'},400);if(expectedExt&&actualExt&&expectedExt!==actualExt)return json({ok:false,error:'wrong_file_type',message:`Dokumenti duhet të jetë .${expectedExt}.`},400);
  const bytes=bytesFromBase64(file?.base64||'');if(!bytes.length)return json({ok:false,error:'empty_file'},400);if(bytes.byteLength>MAX_FILE_BYTES)return json({ok:false,error:'file_too_large_30mb'},413);
  const hash=await sha256Hex(bytes),name=safeName(expectedName),path=`tender-protected/${tenderId}/${hash.slice(0,16)}-${name}`,mime=mimeFor(name,file?.type);const up=await db.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:true});if(up.error)throw up.error;
  const now=new Date().toISOString(),entry={name,mime_type:mime,bucket:BUCKET,path,sha256:hash,size_bytes:bytes.byteLength,archived_at:now,source:'manual_authenticated_krpp'};archive=mergeArchive(archive,entry);const remaining=remainingExpected(expected,archive);
  await persistPartialState(tender,archive,remaining,now);
  if(queue){const queuePayload={...(queue.payload||{}),archived_documents:archive,manual_upload_at:now,manual_upload_version:IMPORT_VERSION};const upd=await db.from('pppp_tender_fetch_queue').update({status:remaining.length?(queue.status==='processing'?'processing':'queued'):'ready',auth_required:remaining.length>0,last_error:null,payload:queuePayload,updated_at:now}).eq('tender_watch_id',tenderId);if(upd.error)throw upd.error;}
  if(remaining.length)return json({ok:true,tender_id:tenderId,dossier_complete:false,uploaded_document:name,remaining_protected_documents:remaining,archived_documents:archive.map(x=>({name:x.name,sha256:x.sha256||null,archived_at:x.archived_at||null}))});
  const analysis=await runProtectedArchiveAnalysis(auth,tenderId);
  return json({ok:true,tender_id:tenderId,dossier_complete:true,uploaded_document:name,remaining_protected_documents:[],archived_documents:archive.map(x=>({name:x.name,sha256:x.sha256||null,archived_at:x.archived_at||null})),analysis});
 }catch(error){console.error('pppp-tender-dossier-import',error);const msg=text((error as any)?.message||error,1000);const status=/file_too_large/.test(msg)?413:/unsupported|wrong_file_type|invalid_file_base64|empty_file/.test(msg)?400:500;return json({ok:false,error:'tender_dossier_import_failed',message:msg},status);}
});