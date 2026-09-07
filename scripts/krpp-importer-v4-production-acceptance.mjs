import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const SOURCE_TENDER_ID='d6810816-69ad-43ae-921d-d4ce204cd38b';
const SOURCE_OBJECT_PATH='tender-protected/d6810816-69ad-43ae-921d-d4ce204cd38b/46d7b90170a3a586-335-Dosja e Tenderit-Shqip.Docx';
const EXPECTED_NAME='335-Dosja e Tenderit-Shqip.Docx';
const MIME='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OUT='tmp/krpp-importer-v4-production-acceptance.json';
const text=(v,max=2000)=>String(v==null?'':v).trim().slice(0,max);
const sha=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const encPath=v=>String(v).split('/').map(encodeURIComponent).join('/');

async function main(){
  const access=await resolveSupabaseWorkflowAccess();
  const base=access.supabaseUrl.replace(/\/$/,'');
  const authHeaders={apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`};
  const tempId=randomUUID();
  let tempStoragePaths=[];
  const result={ok:false,acceptance:'krpp-importer-v4-production',source_tender_id:SOURCE_TENDER_ID,temp_tender_id:tempId,auth_mode:access.authMode,started_at:new Date().toISOString(),checks:{},cleanup:{}};

  async function rest(path,{method='GET',body,headers={}}={}){
    const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{...authHeaders,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`REST ${method} ${path} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,700)}`);
    return{body:parsed,headers:r.headers,status:r.status};
  }
  async function edge(slug,body){
    const r=await fetch(`${base}/functions/v1/${slug}`,{method:'POST',headers:{...authHeaders,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok||!parsed||parsed.ok===false)throw new Error(`${slug} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,1000)}`);
    return parsed;
  }
  async function sourceTender(){
    const q=await rest(`kek_tender_watch?id=eq.${SOURCE_TENDER_ID}&select=*`);
    const row=Array.isArray(q.body)?q.body[0]:null;if(!row)throw new Error('Source KRPP tender not found.');return row;
  }
  async function invalidKeyRows(){
    const q=await rest(`pppp_tender_fetch_queue?select=tender_watch_id,last_error&last_error=ilike.*Invalid%20key*`);
    return Array.isArray(q.body)?q.body:[];
  }
  async function storageDownload(path){
    const r=await fetch(`${base}/storage/v1/object/authenticated/project-source-files/${encPath(path)}`,{headers:authHeaders});
    if(!r.ok)throw new Error(`Storage download HTTP ${r.status}: ${text(await r.text(),700)}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  async function storageDelete(path){
    const r=await fetch(`${base}/storage/v1/object/project-source-files/${encPath(path)}`,{method:'DELETE',headers:authHeaders});
    if(!r.ok&&r.status!==404)throw new Error(`Storage delete HTTP ${r.status}: ${text(await r.text(),700)}`);
  }
  async function discoverTempPaths(){
    try{
      const q=await rest(`kek_tender_watch?id=eq.${tempId}&select=payload`);const row=Array.isArray(q.body)?q.body[0]:null;
      const archive=Array.isArray(row?.payload?.protected_archive)?row.payload.protected_archive:[];
      return archive.map(x=>text(x?.path,1800)).filter(p=>p.startsWith(`tender-protected/${tempId}/`));
    }catch{return[];}
  }

  let sourceBefore=null;
  try{
    sourceBefore=await sourceTender();
    const beforeArchive=Array.isArray(sourceBefore?.payload?.protected_archive)?sourceBefore.payload.protected_archive:[];
    if(!beforeArchive.length)throw new Error('Source tender has no real protected archive to use as acceptance evidence.');
    const sourceFingerprint=sha(beforeArchive);
    result.checks.source_archive_before={count:beforeArchive.length,fingerprint:sourceFingerprint,import_version:sourceBefore?.payload?.protected_archive_import_version||null,analysis_version:sourceBefore?.payload?.protected_archive_analysis_version||null};

    const invalidBefore=await invalidKeyRows();
    result.checks.invalid_key_before=invalidBefore.length;
    if(invalidBefore.length)throw new Error(`Queue contains ${invalidBefore.length} Invalid key row(s) before acceptance.`);

    const bytes=await storageDownload(SOURCE_OBJECT_PATH);
    if(bytes.byteLength<1000)throw new Error(`Real KRPP source document is unexpectedly small (${bytes.byteLength} bytes).`);
    result.checks.real_krpp_document={name:EXPECTED_NAME,size_bytes:bytes.byteLength,sha256:sha(bytes)};

    const now=new Date().toISOString();
    const tempTender={
      id:tempId,
      source_key:`acceptance:${tempId}`,
      procurement_no:`ACCEPTANCE-${tempId.slice(0,8)}`,
      publication_no:`ACCEPTANCE-${tempId}`,
      authority:sourceBefore.authority||'KRPP acceptance',
      title:`[PPPP ACCEPTANCE] ${sourceBefore.title||'KRPP importer v4'}`,
      document_type:sourceBefore.document_type||null,
      fpp:sourceBefore.fpp||null,
      fpp_description:sourceBefore.fpp_description||null,
      contract_type:sourceBefore.contract_type||null,
      contract_value_band:sourceBefore.contract_value_band||null,
      procedure:sourceBefore.procedure||null,
      estimated_value:sourceBefore.estimated_value||null,
      currency:sourceBefore.currency||null,
      deadline:sourceBefore.deadline||null,
      published_date:sourceBefore.published_date||null,
      is_retender:false,
      category:sourceBefore.category||null,
      relevance_score:sourceBefore.relevance_score||0,
      match_reasons:['production_acceptance_only'],
      status:'watch',
      project_id:null,
      source_url:sourceBefore.source_url||null,
      detail_url:sourceBefore.detail_url||null,
      payload:{acceptance_test:true,acceptance_source_tender_id:SOURCE_TENDER_ID,dossier_analysis:{dossier_complete:false,protected_documents:[EXPECTED_NAME]}}
    };
    await rest('kek_tender_watch',{method:'POST',body:tempTender,headers:{Prefer:'return=minimal'}});
    await rest('pppp_tender_fetch_queue',{method:'POST',body:{tender_watch_id:tempId,source:'KRPP',status:'queued',auth_required:true,protected_documents:[EXPECTED_NAME],requested_at:now,attempt_count:0,last_error:null,payload:{acceptance_test:true,detail_url:sourceBefore.detail_url||null,procurement_no:tempTender.procurement_no,title:tempTender.title},updated_at:now},headers:{Prefer:'return=minimal'}});
    result.checks.temp_record_created=true;

    const imported=await edge('pppp-tender-dossier-import',{tender_id:tempId,mode:'upload',expected_name_hint:EXPECTED_NAME,file:{name:EXPECTED_NAME,type:MIME,base64:Buffer.from(bytes).toString('base64')}});
    result.checks.import_response={dossier_complete:imported.dossier_complete===true,matched_documents:imported.matched_documents||[],remaining_protected_documents:imported.remaining_protected_documents||[],recommendation:imported.analysis?.recommendation||null};
    if(imported.dossier_complete!==true)throw new Error('Importer did not complete the isolated one-document dossier.');
    if(!(imported.matched_documents||[]).includes(EXPECTED_NAME))throw new Error('Importer did not match the real KRPP document to the expected canonical name.');

    const tRes=await rest(`kek_tender_watch?id=eq.${tempId}&select=id,payload`),t=Array.isArray(tRes.body)?tRes.body[0]:null;
    const qRes=await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}&select=*`),q=Array.isArray(qRes.body)?qRes.body[0]:null;
    if(!t||!q)throw new Error('Acceptance temp state missing after importer run.');
    const archive=Array.isArray(t.payload?.protected_archive)?t.payload.protected_archive:[];
    tempStoragePaths=archive.map(x=>text(x?.path,1800)).filter(p=>p.startsWith(`tender-protected/${tempId}/`));
    if(archive.length!==1)throw new Error(`Expected exactly one imported archive row, got ${archive.length}.`);
    const a=archive[0];
    if(t.payload?.protected_archive_import_version!=='protected-archive-upload-v4')throw new Error(`Wrong importer version: ${t.payload?.protected_archive_import_version||'missing'}`);
    if(t.payload?.protected_archive_analysis_version!=='protected-archive-analysis-v5')throw new Error(`Wrong analyzer version: ${t.payload?.protected_archive_analysis_version||'missing'}`);
    if(t.payload?.dossier_analysis?.dossier_complete!==true)throw new Error('Canonical dossier analysis is not complete.');
    if(q.status!=='analyzed'||q.auth_required!==false||text(q.last_error,500)!=='')throw new Error(`Queue final state invalid: status=${q.status}, auth_required=${q.auth_required}, last_error=${text(q.last_error,300)}`);
    if(!new RegExp(`^tender-protected/${tempId}/[a-f0-9]{64}\\.[a-z0-9]{2,5}$`).test(text(a.path,1900)))throw new Error(`Importer storage key is not UUID/hash/ext safe: ${text(a.path,500)}`);
    if(text(a.expected_name,500)!==EXPECTED_NAME||!text(a.source_name,500))throw new Error('Archive metadata did not preserve canonical and source filenames.');
    result.checks.production_state={import_version:t.payload.protected_archive_import_version,analysis_version:t.payload.protected_archive_analysis_version,dossier_complete:true,queue_status:q.status,auth_required:q.auth_required,last_error:q.last_error||null,archive_count:archive.length,storage_key_safe:true,expected_name:a.expected_name,source_name:a.source_name,sha256:a.sha256||null};

    const invalidAfter=await invalidKeyRows();
    result.checks.invalid_key_after=invalidAfter.length;
    if(invalidAfter.length)throw new Error(`Queue contains ${invalidAfter.length} Invalid key row(s) after acceptance.`);

    const sourceAfter=await sourceTender();
    const afterArchive=Array.isArray(sourceAfter?.payload?.protected_archive)?sourceAfter.payload.protected_archive:[];
    const afterFingerprint=sha(afterArchive);
    result.checks.source_archive_after={count:afterArchive.length,fingerprint:afterFingerprint,import_version:sourceAfter?.payload?.protected_archive_import_version||null,analysis_version:sourceAfter?.payload?.protected_archive_analysis_version||null};
    if(afterFingerprint!==sourceFingerprint)throw new Error('Source tender protected archive changed during acceptance.');
    if((sourceAfter?.payload?.protected_archive_import_version||null)!==(sourceBefore?.payload?.protected_archive_import_version||null))throw new Error('Source tender importer metadata changed during acceptance.');

    result.ok=true;
    result.finished_at=new Date().toISOString();
  }catch(error){
    result.error=text(error?.stack||error?.message||error,4000);
    result.finished_at=new Date().toISOString();
    process.exitCode=1;
  }finally{
    const cleanupErrors=[];
    try{tempStoragePaths=[...new Set([...tempStoragePaths,...await discoverTempPaths()])];}catch{}
    for(const path of tempStoragePaths){try{await storageDelete(path);}catch(e){cleanupErrors.push(text(e?.message||e,800));}}
    try{await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}`,{method:'DELETE'});}catch(e){cleanupErrors.push(text(e?.message||e,800));}
    try{await rest(`kek_tender_watch?id=eq.${tempId}`,{method:'DELETE'});}catch(e){cleanupErrors.push(text(e?.message||e,800));}
    result.cleanup={storage_paths_removed:tempStoragePaths.length,temp_queue_deleted:true,temp_tender_deleted:true,errors:cleanupErrors};
    if(cleanupErrors.length){result.ok=false;process.exitCode=1;}
    await mkdir('tmp',{recursive:true});
    await writeFile(OUT,JSON.stringify(result,null,2));
    console.log(JSON.stringify({ok:result.ok,checks:result.checks,cleanup:result.cleanup,error:result.error||null},null,2));
  }
}

main().catch(async e=>{console.error(e);process.exit(1);});
