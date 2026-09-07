import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { unzipSync } from "npm:fflate@0.8.2";

const SUPABASE_URL=Deno.env.get('SUPABASE_URL')||'';
const SERVICE_KEY=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const ANON_KEY=Deno.env.get('SUPABASE_ANON_KEY')||'';
const BUCKET='project-source-files';
const IMPORT_VERSION='protected-archive-upload-v4';
const MAX_FILE_BYTES=30*1024*1024;
const MAX_ZIP_BYTES=30*1024*1024;
const MAX_ZIP_ENTRIES=240;
const MAX_ZIP_EXTRACTED_BYTES=90*1024*1024;
const MAX_ZIP_DEPTH=2;
const ALLOWED_EXT=new Set(['pdf','doc','docx','xls','xlsx','csv','txt','rtf']);
const WORD_EXT=new Set(['doc','docx','rtf']);
const SHEET_EXT=new Set(['xls','xlsx','csv']);
const db=createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};

type ZipCandidate={name:string,path:string,bytes:Uint8Array};
type ZipStats={entries:number,extracted:number,contained:string[]};
type Match={expected:string,candidate:ZipCandidate,score:number};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});}
function text(v:unknown,max=6000){return String(v==null?'':v).trim().slice(0,max);}
function isUuid(v:unknown){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(v,80));}
function baseName(v:unknown){const p=text(v,900).replace(/\\/g,'/').split('/').filter(Boolean);return p.length?p[p.length-1]:'';}
function extension(v:unknown){const m=text(v,260).toLowerCase().match(/\.([a-z0-9]{2,5})$/);return m?m[1]:'';}
function displayName(v:unknown){return baseName(v).replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,260)||'document.bin';}
function repairMojibake(v:unknown){
  let s=text(v,700);
  if(/[ÃÂÄÅ]/.test(s)){
    try{const bytes=new Uint8Array([...s].map(ch=>ch.charCodeAt(0)&255));const decoded=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(decoded&&!/[�]/.test(decoded))s=decoded;}catch{}
  }
  return s.replace(/Ã§/g,'ç').replace(/Ã‡/g,'Ç').replace(/Ã«/g,'ë').replace(/Ã‹/g,'Ë').replace(/Ä/g,'č').replace(/Ä/g,'ć').replace(/Å¡/g,'š').replace(/Å¾/g,'ž').replace(/Ä‘/g,'đ');
}
function normalizeName(v:unknown){
  return repairMojibake(v).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[đð]/g,'d').replace(/[čć]/g,'c').replace(/š/g,'s').replace(/ž/g,'z')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
function normalizedStem(v:unknown){return normalizeName(baseName(v).replace(/\.[a-z0-9]{2,5}$/i,'').replace(/\s*\(\d+\)\s*$/,'').replace(/\s+(?:copy|kopje|final)\s*$/i,''));}
function family(ext:string){if(WORD_EXT.has(ext))return'word';if(SHEET_EXT.has(ext))return'sheet';if(ext==='pdf')return'pdf';if(ext==='txt')return'text';return ext;}
function familyCompatible(a:string,b:string){return !!a&&!!b&&(a===b||family(a)===family(b));}
function mimeFor(name:string,current:unknown){if(text(current,160))return text(current,160);const x=extension(name);return x==='pdf'?'application/pdf':x==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':x==='doc'?'application/msword':x==='xlsx'?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':x==='xls'?'application/vnd.ms-excel':x==='csv'?'text/csv':x==='rtf'?'application/rtf':'text/plain';}
function bytesFromBase64(raw:unknown){const clean=text(raw,44*1024*1024).replace(/^data:[^,]+,/,'').replace(/\s+/g,'');if(!clean)return new Uint8Array();let bin='';try{bin=atob(clean);}catch{throw new Error('invalid_file_base64');}const out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out;}
async function sha256Hex(bytes:Uint8Array){const digest=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
function archiveRows(payload:any){const a=payload?.protected_archive;return Array.isArray(a)?a:Array.isArray(a?.documents)?a.documents:[];}
function archiveCanonicalName(row:any){return text(row?.expected_name||row?.canonical_name||row?.name,500);}
function mergeArchive(rows:any[],entry:any){const out=[] as any[],seen=new Set<string>(),key=normalizeName(archiveCanonicalName(entry));for(const row of rows||[]){const k=normalizeName(archiveCanonicalName(row));if(!k||k===key||seen.has(k))continue;seen.add(k);out.push(row);}out.push(entry);return out;}
function remainingExpected(expected:string[],archive:any[]){const got=new Set(archive.map(x=>normalizeName(archiveCanonicalName(x))).filter(Boolean));return expected.filter(x=>!got.has(normalizeName(x)));}
function publicArchiveRows(archive:any[]){return archive.map(x=>({name:archiveCanonicalName(x),source_name:x.source_name||null,sha256:x.sha256||null,archived_at:x.archived_at||null}));}
function significantTokens(v:string){const stop=new Set(['e','i','te','të','se','dhe','the','of','za','sa','na','me','per','për','furnizim','supply']);return v.split(' ').filter(x=>x.length>=2&&!stop.has(x)&&!/^\d{1,4}$/.test(x));}
function documentClass(v:unknown){
  const n=normalizeName(v);
  if(/\b(dosja e tenderit|tender dossier|tender document|tender documentation|tenderska dokumentacija|dokumentacija tendera|tender file)\b/.test(n))return'dossier';
  if(/\b(pershkrimi i cmimeve|lista e pershkrimit te cmimeve|price schedule|price list|bill of quantities|boq|opis cijena|opis cena|predmer|predracun|cenovnik|cjenovnik)\b/.test(n))return'prices';
  return'';
}
function languagePenalty(v:unknown){const n=normalizedStem(v);return /\b(eng|english|sr|srb|serbian|serb|hr|hrv|croatian|cro)\b/.test(n)?12:0;}
function nameMatchScore(actual:unknown,expected:unknown,hint:unknown=''){
  const actualExt=extension(actual),expectedExt=extension(expected);if(!ALLOWED_EXT.has(actualExt)||!ALLOWED_EXT.has(expectedExt)||!familyCompatible(actualExt,expectedExt))return 0;
  let score=actualExt===expectedExt?18:14;
  const aClass=documentClass(actual),eClass=documentClass(expected);if(aClass&&eClass){if(aClass===eClass)score+=52;else return 0;}
  const a=normalizedStem(actual),e=normalizedStem(expected);if(!a||!e)return 0;
  if(a===e)score+=40;else if(a.includes(e)||e.includes(a))score+=30;
  const at=significantTokens(a),et=significantTokens(e),aset=new Set(at);let shared=0;for(const token of et)if(aset.has(token))shared++;
  if(shared){const ratio=shared/Math.max(at.length,et.length,1);score+=Math.round(ratio*30);}
  if(hint&&normalizeName(hint)===normalizeName(expected))score+=45;
  score-=languagePenalty(actual);
  return Math.max(0,Math.min(100,score));
}
function resolveMatches(candidates:ZipCandidate[],needed:string[],hint:unknown=''){
  const pairs:{candidate:ZipCandidate,expected:string,score:number}[]=[];
  for(const candidate of candidates)for(const expected of needed){const score=nameMatchScore(candidate.name,expected,hint);if(score>=55)pairs.push({candidate,expected,score});}
  pairs.sort((a,b)=>b.score-a.score||languagePenalty(a.candidate.name)-languagePenalty(b.candidate.name)||a.candidate.name.localeCompare(b.candidate.name));
  const usedCandidates=new Set<string>(),usedExpected=new Set<string>(),out:Match[]=[];
  for(const pair of pairs){const ck=pair.candidate.path,ek=normalizeName(pair.expected);if(usedCandidates.has(ck)||usedExpected.has(ek))continue;usedCandidates.add(ck);usedExpected.add(ek);out.push({expected:pair.expected,candidate:pair.candidate,score:pair.score});}
  return out;
}
function collectZipCandidates(bytes:Uint8Array,stats:ZipStats,depth=0,prefix=''){
  if(depth>MAX_ZIP_DEPTH)throw new Error('zip_nested_too_deep');
  let files:Record<string,Uint8Array>={};
  files=unzipSync(bytes,{filter(info){
    stats.entries++;if(stats.entries>MAX_ZIP_ENTRIES)throw new Error('zip_too_many_entries');
    const b=baseName(info.name);if(!b)return false;const ext=extension(b),keep=ext==='zip'||ALLOWED_EXT.has(ext);if(!keep)return false;
    if(info.originalSize>MAX_FILE_BYTES&&ext!=='zip')throw new Error('file_too_large_30mb');
    stats.extracted+=Number(info.originalSize||0);if(stats.extracted>MAX_ZIP_EXTRACTED_BYTES)throw new Error('zip_extract_too_large');
    if(stats.contained.length<MAX_ZIP_ENTRIES)stats.contained.push(prefix?`${prefix}!/${b}`:b);return true;
  }}) as Record<string,Uint8Array>;
  const out:ZipCandidate[]=[];
  for(const [path,entryBytes] of Object.entries(files)){
    const b=baseName(path),ext=extension(b),full=prefix?`${prefix}!/${path}`:path;
    if(ext==='zip'){if(depth<MAX_ZIP_DEPTH&&entryBytes.byteLength<=MAX_ZIP_BYTES)out.push(...collectZipCandidates(entryBytes,stats,depth+1,full));continue;}
    if(ALLOWED_EXT.has(ext)&&entryBytes.byteLength)out.push({name:b,path:full,bytes:entryBytes});
  }
  return out;
}

async function visibleTender(auth:string,tenderId:string){const u=`${SUPABASE_URL}/rest/v1/kek_tender_watch?id=eq.${encodeURIComponent(tenderId)}&select=*&limit=1`;const r=await fetch(u,{headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'}});const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok)throw new Error(`tender_visibility_${r.status}`);return Array.isArray(body)?body[0]:null;}
async function runProtectedArchiveAnalysis(auth:string,tenderId:string){const r=await fetch(`${SUPABASE_URL}/functions/v1/pppp-tender-protected-archive-analysis`,{method:'POST',headers:{apikey:ANON_KEY,Authorization:auth,'Content-Type':'application/json'},body:JSON.stringify({tender_id:tenderId})});const raw=await r.text();let body:any=null;try{body=raw?JSON.parse(raw):null;}catch{}if(!r.ok||!body||body.ok===false)throw new Error(text(body?.message||body?.error||`protected_archive_analysis_${r.status}`,1000));return body;}
async function persistPartialState(tender:any,archive:any[],remaining:string[],now:string){const prior=tender?.payload?.dossier_analysis&&typeof tender.payload.dossier_analysis==='object'?tender.payload.dossier_analysis:null;const partial=prior?{...prior,dossier_complete:false,protected_documents:remaining,import_state:'protected_archive_partial',imported_documents:publicArchiveRows(archive)}:prior;const payload={...(tender?.payload||{}),protected_archive:archive,protected_archive_updated_at:now,protected_archive_import_version:IMPORT_VERSION,protected_archive_imported_at:now,...(partial?{dossier_analysis:partial}:{} )};const {error}=await db.from('kek_tender_watch').update({payload,updated_at:now}).eq('id',tender.id);if(error)throw error;}
async function updateQueue(queue:any,tenderId:string,archive:any[],remaining:string[],now:string,extra:any={}){if(!queue)return;const queuePayload={...(queue.payload||{}),archived_documents:archive,manual_upload_at:now,manual_upload_version:IMPORT_VERSION,...extra};const upd=await db.from('pppp_tender_fetch_queue').update({status:remaining.length?(queue.status==='processing'?'processing':'queued'):'ready',auth_required:remaining.length>0,last_error:null,payload:queuePayload,updated_at:now}).eq('tender_watch_id',tenderId);if(upd.error)throw upd.error;}
async function storeExpected(tenderId:string,expectedName:string,actualName:string,bytes:Uint8Array,mimeHint:unknown,source:string,now:string,archiveName?:string,sourcePath?:string){
  const canonical=displayName(expectedName),sourceName=displayName(actualName||expectedName),actualExt=extension(sourceName)||extension(canonical)||'bin',hash=await sha256Hex(bytes);
  const path=`tender-protected/${tenderId}/${hash}.${actualExt}`;const mime=mimeFor(sourceName,mimeHint);const up=await db.storage.from(BUCKET).upload(path,bytes,{contentType:mime,upsert:true});if(up.error)throw up.error;
  return{name:canonical,expected_name:canonical,source_name:sourceName,source_ext:actualExt,expected_ext:extension(canonical),mime_type:mime,bucket:BUCKET,path,sha256:hash,size_bytes:bytes.byteLength,archived_at:now,source,...(archiveName?{import_archive_name:archiveName}:{}),...(sourcePath?{import_source_path:sourcePath}:{})};
}

Deno.serve(async(req:Request)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  try{
    const auth=req.headers.get('Authorization')||'';if(!auth.toLowerCase().startsWith('bearer '))return json({ok:false,error:'unauthorized'},401);
    if(!SUPABASE_URL||!SERVICE_KEY||!ANON_KEY)return json({ok:false,error:'supabase_environment_missing'},500);
    let body:any={};try{body=await req.json();}catch{}
    const tenderId=text(body?.tender_id,80);if(!isUuid(tenderId))return json({ok:false,error:'valid_tender_id_required'},400);
    const tender=await visibleTender(auth,tenderId);if(!tender)return json({ok:false,error:'tender_not_found_or_not_visible'},404);
    const mode=text(body?.mode||'upload',40).toLowerCase();const q=await db.from('pppp_tender_fetch_queue').select('*').eq('tender_watch_id',tenderId).maybeSingle();if(q.error)throw q.error;const queue=q.data;
    const expected=((Array.isArray(queue?.protected_documents)&&queue.protected_documents.length?queue.protected_documents:tender?.payload?.dossier_analysis?.protected_documents)||[]).map(String).filter(Boolean);
    if(!expected.length)return json({ok:false,error:'protected_document_list_missing',message:'Rilexo dosjen zyrtare në PPPP para importimit.'},409);
    let archive=archiveRows(tender.payload);const currentRemaining=()=>remainingExpected(expected,archive);
    if(mode==='status')return json({ok:true,tender_id:tenderId,dossier_complete:currentRemaining().length===0,remaining_protected_documents:currentRemaining(),archived_documents:publicArchiveRows(archive)});
    if(mode==='finalize'){const remaining=currentRemaining();if(remaining.length)return json({ok:false,error:'protected_archive_incomplete',remaining_protected_documents:remaining},409);const analysis=await runProtectedArchiveAnalysis(auth,tenderId);return json({ok:true,tender_id:tenderId,dossier_complete:true,remaining_protected_documents:[],analysis});}
    if(mode!=='upload'&&mode!=='upload_archive'&&mode!=='ingest')return json({ok:false,error:'unsupported_mode'},400);

    const file=body?.file||{},actualName=displayName(file?.name||''),actualExt=extension(actualName),hint=text(body?.expected_name_hint||body?.expected_name||'',500);
    if(!actualName||(!ALLOWED_EXT.has(actualExt)&&actualExt!=='zip'))return json({ok:false,error:'unsupported_file_type'},400);
    if(hint&&!expected.some(x=>normalizeName(x)===normalizeName(hint)))return json({ok:false,error:'document_not_expected',message:'Ky dokument nuk është në listën aktuale të dokumenteve të munguara.'},409);
    const raw=bytesFromBase64(file?.base64||'');if(!raw.length)return json({ok:false,error:'empty_file'},400);if(raw.byteLength>(actualExt==='zip'?MAX_ZIP_BYTES:MAX_FILE_BYTES))return json({ok:false,error:'file_too_large_30mb'},413);
    if(mode==='upload_archive'&&actualExt!=='zip')return json({ok:false,error:'zip_required',message:'Zgjidh skedarin ZIP të shkarkuar nga KRPP.'},400);

    const needed=currentRemaining();let stats:ZipStats={entries:0,extracted:0,contained:[]},candidates:ZipCandidate[]=[];
    if(actualExt==='zip'){
      try{candidates=collectZipCandidates(raw,stats,0,'');}catch(e){const msg=text((e as any)?.message||e,300);if(/zip_too_many_entries|zip_extract_too_large|zip_nested_too_deep|file_too_large/.test(msg))throw e;throw new Error('invalid_zip_archive');}
    }else candidates=[{name:actualName,path:actualName,bytes:raw}];
    const matches=resolveMatches(candidates,needed,hint),now=new Date().toISOString(),matched:string[]=[],resolved:any[]=[];
    for(const match of matches){
      const entry=await storeExpected(tenderId,match.expected,match.candidate.name,match.candidate.bytes,file?.type,actualExt==='zip'?'manual_authenticated_krpp_zip':'manual_authenticated_krpp',now,actualExt==='zip'?actualName:undefined,match.candidate.path);
      archive=mergeArchive(archive,entry);matched.push(match.expected);resolved.push({expected_name:match.expected,source_name:match.candidate.name,score:match.score,source_path:match.candidate.path});
    }
    const remaining=currentRemaining();
    if(!matched.length){
      const message=actualExt==='zip'?'ZIP-i u lexua, por nuk u lidh me dokumentet që ky tender pret.':'Skedari u lexua, por nuk u lidh me asnjë dokument të munguar të këtij tenderi.';
      return json({ok:false,error:'document_match_failed',message,contained_documents:stats.contained,candidate_documents:candidates.map(x=>x.name).slice(0,80),remaining_protected_documents:remaining,expected_name_hint:hint||null},409);
    }
    await persistPartialState(tender,archive,remaining,now);
    await updateQueue(queue,tenderId,archive,remaining,now,{archive_upload_at:actualExt==='zip'?now:null,archive_file_name:actualExt==='zip'?actualName:null,archive_contained_documents:stats.contained,archive_matched_documents:matched,resolved_documents:resolved});
    if(remaining.length)return json({ok:true,tender_id:tenderId,dossier_complete:false,matched_documents:matched,resolved_documents:resolved,contained_documents:stats.contained,remaining_protected_documents:remaining,archived_documents:publicArchiveRows(archive)});
    const analysis=await runProtectedArchiveAnalysis(auth,tenderId);
    return json({ok:true,tender_id:tenderId,dossier_complete:true,matched_documents:matched,resolved_documents:resolved,contained_documents:stats.contained,remaining_protected_documents:[],archived_documents:publicArchiveRows(archive),analysis});
  }catch(error){
    console.error('pppp-tender-dossier-import',error);const msg=text((error as any)?.message||error,1000);
    const status=/file_too_large/.test(msg)?413:/unsupported|document_match_failed|document_not_expected|wrong_file_type|invalid_file_base64|empty_file|zip_required|invalid_zip_archive|zip_too_many_entries|zip_extract_too_large|zip_nested_too_deep/.test(msg)?400:500;
    return json({ok:false,error:'tender_dossier_import_failed',message:msg},status);
  }
});
