import {createHash,randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,mkdtemp,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const SOURCE_TENDER_ID='d6810816-69ad-43ae-921d-d4ce204cd38b';
const BUCKET='project-source-files';
const DOCX_NAME='335-Dosja e Tenderit-Shqip.Docx';
const XLSX_NAME='PERSHKRIMI I CMIMIT-SHQIP.xlsx';
const DOCX_PATH=`tender-protected/${SOURCE_TENDER_ID}/46d7b90170a3a586-335-Dosja e Tenderit-Shqip.Docx`;
const XLSX_PATH=`tender-protected/${SOURCE_TENDER_ID}/4a4df896fdc49292-PERSHKRIMI I CMIMIT-SHQIP.xlsx`;
// Deliberately use legacy-family canonical expectations to prove DOC<->DOCX and XLS<->XLSX matching.
const EXPECTED_DOC='Dosja e Tenderit Shqip.Doc';
const EXPECTED_XLS='PERSHKRIMI I CMIMIT-SHQIP.xls';
const EXPECTED=[EXPECTED_DOC,EXPECTED_XLS];
const ZIP_NAME='KRPP-production-acceptance.zip';
const OUT='tmp/krpp-importer-v4-zip-production-acceptance.json';
const text=(v,max=2400)=>String(v==null?'':v).trim().slice(0,max);
const encPath=v=>String(v).split('/').map(encodeURIComponent).join('/');
const shaJson=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const shaBytes=v=>createHash('sha256').update(Buffer.from(v)).digest('hex');

async function main(){
  const access=await resolveSupabaseWorkflowAccess();
  const edgeAccess=await resolveSupabaseWorkflowAccess({
    serviceKey:'',
    syncEmail:process.env.PPPP_SYNC_EMAIL||'',
    syncPassword:process.env.PPPP_SYNC_PASSWORD||''
  });
  if(edgeAccess.authMode!=='pppp_sync_account')throw new Error('KRPP ZIP acceptance requires authenticated PPPP sync JWT for tender visibility.');
  const base=access.supabaseUrl.replace(/\/$/,'');
  const authHeaders={apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`};
  const edgeHeaders={apikey:edgeAccess.apiKey,Authorization:`Bearer ${edgeAccess.bearerToken}`};
  const tempId=randomUUID();
  const localDir=await mkdtemp(join(tmpdir(),'pppp-krpp-zip-'));
  let tempStoragePaths=[];
  let queueDeleted=false,tenderDeleted=false;
  const result={ok:false,acceptance:'krpp-importer-v4-real-zip-production',source_tender_id:SOURCE_TENDER_ID,temp_tender_id:tempId,auth_mode:access.authMode,edge_auth_mode:edgeAccess.authMode,started_at:new Date().toISOString(),checks:{},cleanup:{}};

  async function rest(path,{method='GET',body,headers={}}={}){
    const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{...authHeaders,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`REST ${method} ${path} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,900)}`);
    return{body:parsed,headers:r.headers,status:r.status};
  }
  async function edge(slug,body){
    const r=await fetch(`${base}/functions/v1/${slug}`,{method:'POST',headers:{...edgeHeaders,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok||!parsed||parsed.ok===false)throw new Error(`${slug} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,1400)}`);
    return parsed;
  }
  async function sourceTender(){
    const q=await rest(`kek_tender_watch?id=eq.${SOURCE_TENDER_ID}&select=*`);
    const row=Array.isArray(q.body)?q.body[0]:null;
    if(!row)throw new Error('Source KRPP tender not found.');
    return row;
  }
  async function invalidKeyRows(){
    const q=await rest('pppp_tender_fetch_queue?select=tender_watch_id,last_error&last_error=ilike.*Invalid%20key*');
    return Array.isArray(q.body)?q.body:[];
  }
  async function storageDownload(path){
    const r=await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${encPath(path)}`,{headers:authHeaders});
    if(!r.ok)throw new Error(`Storage download HTTP ${r.status}: ${text(await r.text(),900)}`);
    return new Uint8Array(await r.arrayBuffer());
  }
  async function storageDelete(path){
    const r=await fetch(`${base}/storage/v1/object/${BUCKET}/${encPath(path)}`,{method:'DELETE',headers:authHeaders});
    if(!r.ok&&r.status!==404)throw new Error(`Storage delete HTTP ${r.status}: ${text(await r.text(),900)}`);
  }
  async function bucketPrivate(){
    const r=await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(BUCKET)}`,{headers:authHeaders});
    const raw=await r.text();let body=null;try{body=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`Storage bucket metadata HTTP ${r.status}: ${text(raw,700)}`);
    return body?.public===false;
  }
  async function discoverTempPaths(){
    try{
      const q=await rest(`kek_tender_watch?id=eq.${tempId}&select=payload`),row=Array.isArray(q.body)?q.body[0]:null;
      const archive=Array.isArray(row?.payload?.protected_archive)?row.payload.protected_archive:[];
      return archive.map(x=>text(x?.path,1900)).filter(p=>p.startsWith(`tender-protected/${tempId}/`));
    }catch{return[];}
  }

  let sourceBefore=null,sourceArchiveFingerprint='';
  try{
    sourceBefore=await sourceTender();
    const beforeArchive=Array.isArray(sourceBefore?.payload?.protected_archive)?sourceBefore.payload.protected_archive:[];
    if(beforeArchive.length<2)throw new Error(`Source tender needs two real protected documents; found ${beforeArchive.length}.`);
    sourceArchiveFingerprint=shaJson(beforeArchive);
    result.checks.source_archive_before={count:beforeArchive.length,fingerprint:sourceArchiveFingerprint,import_version:sourceBefore?.payload?.protected_archive_import_version||null,analysis_version:sourceBefore?.payload?.protected_archive_analysis_version||null};

    const invalidBefore=await invalidKeyRows();
    result.checks.invalid_key_before=invalidBefore.length;
    if(invalidBefore.length)throw new Error(`Queue contains ${invalidBefore.length} Invalid key row(s) before ZIP acceptance.`);
    const privateBucket=await bucketPrivate();
    result.checks.private_bucket={bucket:BUCKET,public:false,verified:privateBucket};
    if(!privateBucket)throw new Error(`${BUCKET} must remain private.`);

    const [docx,xlsx]=await Promise.all([storageDownload(DOCX_PATH),storageDownload(XLSX_PATH)]);
    if(docx.byteLength<1000||xlsx.byteLength<1000)throw new Error(`Real KRPP documents are unexpectedly small: docx=${docx.byteLength}, xlsx=${xlsx.byteLength}.`);
    result.checks.real_source_documents=[
      {name:DOCX_NAME,size_bytes:docx.byteLength,sha256:shaBytes(docx)},
      {name:XLSX_NAME,size_bytes:xlsx.byteLength,sha256:shaBytes(xlsx)}
    ];

    const docPath=join(localDir,DOCX_NAME),xlsPath=join(localDir,XLSX_NAME),zipPath=join(localDir,ZIP_NAME);
    await writeFile(docPath,docx);await writeFile(xlsPath,xlsx);
    execFileSync('python3',['-c',"import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED)\nfor p in sys.argv[2:]: z.write(p,arcname=os.path.basename(p))\nz.close()",zipPath,docPath,xlsPath],{stdio:'pipe'});
    const zipBytes=await readFile(zipPath);
    if(zipBytes.byteLength<1000)throw new Error('Acceptance ZIP was not created correctly.');
    result.checks.acceptance_zip={name:ZIP_NAME,size_bytes:zipBytes.byteLength,sha256:shaBytes(zipBytes),contained_source_names:[DOCX_NAME,XLSX_NAME],expected_family_variants:EXPECTED};

    const now=new Date().toISOString();
    const tempTender={
      id:tempId,source_key:`acceptance-zip:${tempId}`,
      procurement_no:`ACCEPTANCE-ZIP-${tempId.slice(0,8)}`,publication_no:`ACCEPTANCE-ZIP-${tempId}`,
      authority:sourceBefore.authority||'KRPP acceptance',title:`[PPPP ZIP ACCEPTANCE] ${sourceBefore.title||'KRPP importer v4'}`,
      document_type:sourceBefore.document_type||null,fpp:sourceBefore.fpp||null,fpp_description:sourceBefore.fpp_description||null,
      contract_type:sourceBefore.contract_type||null,contract_value_band:sourceBefore.contract_value_band||null,procedure:sourceBefore.procedure||null,
      estimated_value:sourceBefore.estimated_value||null,currency:sourceBefore.currency||null,deadline:sourceBefore.deadline||null,published_date:sourceBefore.published_date||null,
      is_retender:false,category:sourceBefore.category||null,relevance_score:sourceBefore.relevance_score||0,match_reasons:['production_zip_acceptance_only'],
      status:'watch',project_id:null,source_url:sourceBefore.source_url||null,detail_url:sourceBefore.detail_url||null,
      payload:{acceptance_test:true,acceptance_mode:'real_zip_family_matching',acceptance_source_tender_id:SOURCE_TENDER_ID,dossier_analysis:{dossier_complete:false,protected_documents:EXPECTED}}
    };
    await rest('kek_tender_watch',{method:'POST',body:tempTender,headers:{Prefer:'return=minimal'}});
    await rest('pppp_tender_fetch_queue',{method:'POST',body:{tender_watch_id:tempId,source:'KRPP',status:'queued',auth_required:true,protected_documents:EXPECTED,requested_at:now,attempt_count:0,last_error:null,payload:{acceptance_test:true,acceptance_mode:'real_zip_family_matching',detail_url:sourceBefore.detail_url||null,procurement_no:tempTender.procurement_no,title:tempTender.title},updated_at:now},headers:{Prefer:'return=minimal'}});
    result.checks.temp_record_created=true;

    const imported=await edge('pppp-tender-dossier-import',{tender_id:tempId,mode:'upload_archive',file:{name:ZIP_NAME,type:'application/zip',base64:Buffer.from(zipBytes).toString('base64')}});
    result.checks.import_response={dossier_complete:imported.dossier_complete===true,matched_documents:imported.matched_documents||[],resolved_documents:imported.resolved_documents||[],contained_documents:imported.contained_documents||[],remaining_protected_documents:imported.remaining_protected_documents||[],recommendation:imported.analysis?.recommendation||null};
    if(imported.dossier_complete!==true)throw new Error('ZIP importer did not complete the isolated two-document dossier.');
    for(const expected of EXPECTED)if(!(imported.matched_documents||[]).includes(expected))throw new Error(`ZIP importer did not match expected family variant: ${expected}`);
    const resolved=Array.isArray(imported.resolved_documents)?imported.resolved_documents:[];
    const docResolved=resolved.find(x=>x.expected_name===EXPECTED_DOC),xlsResolved=resolved.find(x=>x.expected_name===EXPECTED_XLS);
    if(docResolved?.source_name!==DOCX_NAME)throw new Error(`DOC/DOCX family match failed: ${JSON.stringify(docResolved)}`);
    if(xlsResolved?.source_name!==XLSX_NAME)throw new Error(`XLS/XLSX family match failed: ${JSON.stringify(xlsResolved)}`);
    if(Number(docResolved?.score||0)<55||Number(xlsResolved?.score||0)<55)throw new Error('Family matches did not meet importer confidence threshold.');

    const tRes=await rest(`kek_tender_watch?id=eq.${tempId}&select=id,payload`),t=Array.isArray(tRes.body)?tRes.body[0]:null;
    const qRes=await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}&select=*`),q=Array.isArray(qRes.body)?qRes.body[0]:null;
    if(!t||!q)throw new Error('ZIP acceptance temp state missing after importer run.');
    const archive=Array.isArray(t.payload?.protected_archive)?t.payload.protected_archive:[];
    tempStoragePaths=archive.map(x=>text(x?.path,1900)).filter(p=>p.startsWith(`tender-protected/${tempId}/`));
    if(archive.length!==2)throw new Error(`Expected two imported archive rows, got ${archive.length}.`);
    if(t.payload?.protected_archive_import_version!=='protected-archive-upload-v4')throw new Error(`Wrong importer version: ${t.payload?.protected_archive_import_version||'missing'}`);
    if(t.payload?.protected_archive_analysis_version!=='protected-archive-analysis-v5')throw new Error(`Wrong analyzer version: ${t.payload?.protected_archive_analysis_version||'missing'}`);
    if(t.payload?.dossier_analysis?.dossier_complete!==true)throw new Error('Canonical protected archive analysis is not complete.');
    if(q.status!=='analyzed'||q.auth_required!==false||text(q.last_error,500)!=='')throw new Error(`Queue final state invalid: status=${q.status}, auth_required=${q.auth_required}, last_error=${text(q.last_error,300)}`);
    const byExpected=new Map(archive.map(x=>[text(x.expected_name,500),x]));
    const aDoc=byExpected.get(EXPECTED_DOC),aXls=byExpected.get(EXPECTED_XLS);
    if(!aDoc||!aXls)throw new Error('Archive did not preserve both canonical expected names.');
    if(text(aDoc.source_name,500)!==DOCX_NAME||text(aXls.source_name,500)!==XLSX_NAME)throw new Error('Archive did not preserve actual KRPP source names.');
    if(text(aDoc.source_ext,30)!=='docx'||text(aXls.source_ext,30)!=='xlsx')throw new Error('Actual DOCX/XLSX extensions were not preserved.');
    if(text(aDoc.expected_ext,30)!=='doc'||text(aXls.expected_ext,30)!=='xls')throw new Error('Expected DOC/XLS family variants were not preserved.');
    for(const a of archive){
      if(a.bucket!==BUCKET)throw new Error(`Wrong storage bucket: ${a.bucket}`);
      if(!new RegExp(`^tender-protected/${tempId}/[a-f0-9]{64}\\.(docx|xlsx)$`).test(text(a.path,1900)))throw new Error(`Unsafe or incorrect storage path: ${text(a.path,500)}`);
      if(a.import_archive_name!==ZIP_NAME)throw new Error('Archive provenance did not preserve ZIP filename.');
    }
    result.checks.production_state={import_version:t.payload.protected_archive_import_version,analysis_version:t.payload.protected_archive_analysis_version,dossier_complete:true,queue_status:q.status,auth_required:q.auth_required,last_error:q.last_error||null,archive_count:archive.length,bucket:BUCKET,bucket_private:true,storage_paths_safe:true,doc_family:{expected:aDoc.expected_name,source:aDoc.source_name,expected_ext:aDoc.expected_ext,source_ext:aDoc.source_ext},sheet_family:{expected:aXls.expected_name,source:aXls.source_name,expected_ext:aXls.expected_ext,source_ext:aXls.source_ext},files_analyzed:t.payload?.dossier_analysis?.files_analyzed||[]};

    const invalidAfter=await invalidKeyRows();
    result.checks.invalid_key_after=invalidAfter.length;
    if(invalidAfter.length)throw new Error(`Queue contains ${invalidAfter.length} Invalid key row(s) after ZIP acceptance.`);

    const sourceAfter=await sourceTender(),afterArchive=Array.isArray(sourceAfter?.payload?.protected_archive)?sourceAfter.payload.protected_archive:[];
    const afterFingerprint=shaJson(afterArchive);
    result.checks.source_archive_after={count:afterArchive.length,fingerprint:afterFingerprint,import_version:sourceAfter?.payload?.protected_archive_import_version||null,analysis_version:sourceAfter?.payload?.protected_archive_analysis_version||null};
    if(afterFingerprint!==sourceArchiveFingerprint)throw new Error('Source tender protected archive changed during ZIP acceptance.');
    if((sourceAfter?.payload?.protected_archive_import_version||null)!==(sourceBefore?.payload?.protected_archive_import_version||null))throw new Error('Source tender importer metadata changed during ZIP acceptance.');
    if((sourceAfter?.payload?.protected_archive_analysis_version||null)!==(sourceBefore?.payload?.protected_archive_analysis_version||null))throw new Error('Source tender analyzer metadata changed during ZIP acceptance.');

    result.ok=true;result.finished_at=new Date().toISOString();
  }catch(error){
    result.error=text(error?.stack||error?.message||error,5000);result.finished_at=new Date().toISOString();process.exitCode=1;
  }finally{
    const cleanupErrors=[];
    try{tempStoragePaths=[...new Set([...tempStoragePaths,...await discoverTempPaths()])];}catch{}
    for(const path of tempStoragePaths){try{await storageDelete(path);}catch(e){cleanupErrors.push(text(e?.message||e,900));}}
    try{await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}`,{method:'DELETE'});queueDeleted=true;}catch(e){cleanupErrors.push(text(e?.message||e,900));}
    try{await rest(`kek_tender_watch?id=eq.${tempId}`,{method:'DELETE'});tenderDeleted=true;}catch(e){cleanupErrors.push(text(e?.message||e,900));}
    try{await rm(localDir,{recursive:true,force:true});}catch(e){cleanupErrors.push(text(e?.message||e,900));}
    result.cleanup={storage_paths_removed:tempStoragePaths.length,temp_queue_deleted:queueDeleted,temp_tender_deleted:tenderDeleted,errors:cleanupErrors};
    if(cleanupErrors.length||!queueDeleted||!tenderDeleted){result.ok=false;process.exitCode=1;}
    await mkdir('tmp',{recursive:true});await writeFile(OUT,JSON.stringify(result,null,2));
    console.log(JSON.stringify({ok:result.ok,checks:result.checks,cleanup:result.cleanup,error:result.error||null},null,2));
  }
}

main().catch(e=>{console.error(e);process.exit(1);});
