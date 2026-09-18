import {createHash,randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const BUCKET='project-source-files';
const OUT='tmp/krpp-direct-storage-production-acceptance.json';
const DOC='KRPP actual uploaded dossier.docx';
const XLS='KRPP actual uploaded prices.xlsx';
const EXPECTED_DOC='Dosja e tenderit SHQIP.Docx';
const EXPECTED_XLS='PARAMASA.xlsx';
const EXPECTED=[EXPECTED_DOC,EXPECTED_XLS];
const text=(v,max=1800)=>String(v==null?'':v).trim().slice(0,max);
const encPath=v=>String(v).split('/').map(encodeURIComponent).join('/');
const sha=v=>createHash('sha256').update(Buffer.from(v)).digest('hex');

async function main(){
  const access=await resolveSupabaseWorkflowAccess();
  const edgeAccess=await resolveSupabaseWorkflowAccess({
    serviceKey:'',
    syncEmail:process.env.PPPP_SYNC_EMAIL||'',
    syncPassword:process.env.PPPP_SYNC_PASSWORD||''
  });
  if(edgeAccess.authMode!=='pppp_sync_account')throw new Error('Direct Storage acceptance requires PPPP sync JWT.');
  const base=access.supabaseUrl.replace(/\/$/,'');
  const authHeaders={apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`};
  const edgeHeaders={apikey:edgeAccess.apiKey,Authorization:`Bearer ${edgeAccess.bearerToken}`};
  const tempId=randomUUID(),now=new Date().toISOString();
  const bodies=[
    {name:DOC,bytes:Buffer.from('PPPP DIRECT STORAGE ACCEPTANCE DOCX '+tempId)},
    {name:XLS,bytes:Buffer.from('PPPP DIRECT STORAGE ACCEPTANCE XLSX '+tempId)}
  ];
  const result={ok:false,version:'krpp-direct-storage-production-acceptance-v2',temp_tender_id:tempId,started_at:now,checks:{},cleanup:{storage_paths_removed:0,temp_queue_deleted:false,temp_tender_deleted:false,errors:[]}};

  async function rest(path,{method='GET',body,headers={}}={}){
    const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{...authHeaders,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`REST ${method} ${path} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,900)}`);
    return parsed;
  }
  async function edge(body){
    const r=await fetch(`${base}/functions/v1/pppp-tender-dossier-import`,{method:'POST',headers:{...edgeHeaders,'Content-Type':'application/json'},body:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok||!parsed||parsed.ok===false)throw new Error(`importer HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,1200)}`);
    return parsed;
  }
  async function storageDownload(path){
    const r=await fetch(`${base}/storage/v1/object/authenticated/${BUCKET}/${encPath(path)}`,{headers:authHeaders});
    if(!r.ok)throw new Error(`Storage download HTTP ${r.status}: ${text(await r.text(),700)}`);
    return Buffer.from(await r.arrayBuffer());
  }
  async function storageDelete(path){
    const r=await fetch(`${base}/storage/v1/object/${BUCKET}/${encPath(path)}`,{method:'DELETE',headers:authHeaders});
    if(!r.ok&&r.status!==404)throw new Error(`Storage delete HTTP ${r.status}: ${text(await r.text(),700)}`);
  }

  let paths=[];
  try{
    await rest('kek_tender_watch',{method:'POST',headers:{Prefer:'return=minimal'},body:{
      id:tempId,source_key:`acceptance-direct:${tempId}`,procurement_no:`ACCEPT-${tempId.slice(0,8)}`,
      title:'Direct Storage acceptance tender',authority:'PRISTEEL acceptance',status:'watch',relevance_score:0,
      match_reasons:['direct_storage_acceptance_only'],
      payload:{acceptance_test:true,source:'KRPP',dossier_analysis:{dossier_complete:false,protected_documents:EXPECTED},protected_archive:[
        {name:EXPECTED_DOC,expected_name:EXPECTED_DOC,source_name:DOC,archive_role:'expected',storage_status:'missing_blob',sha256:sha(bodies[0].bytes),path:`tender-protected/${tempId}/${sha(bodies[0].bytes)}.docx`,bucket:BUCKET,size_bytes:bodies[0].bytes.length},
        {name:EXPECTED_XLS,expected_name:EXPECTED_XLS,source_name:XLS,archive_role:'expected',storage_status:'missing_blob',sha256:sha(bodies[1].bytes),path:`tender-protected/${tempId}/${sha(bodies[1].bytes)}.xlsx`,bucket:BUCKET,size_bytes:bodies[1].bytes.length}
      ]}
    }});
    await rest('pppp_tender_fetch_queue',{method:'POST',headers:{Prefer:'return=minimal'},body:{
      tender_watch_id:tempId,source:'KRPP',status:'queued',auth_required:true,protected_documents:EXPECTED,
      requested_at:now,attempt_count:0,last_error:null,payload:{acceptance_test:true},updated_at:now
    }});
    result.checks.temp_record_created=true;

    const descriptors=bodies.map((x,i)=>({client_index:i,name:x.name,source_path:x.name,size_bytes:x.bytes.length,sha256:sha(x.bytes)}));
    const prep=await edge({tender_id:tempId,mode:'prepare_direct',files:descriptors});
    if(prep.upload_mode!=='signed_direct_storage'||!Array.isArray(prep.uploads)||prep.uploads.length!==2)throw new Error(`prepare_direct returned unexpected payload: ${JSON.stringify(prep)}`);
    if(prep.uploads.some(x=>x.matched_by!=='historical_sha256'))throw new Error(`Historical rehydration must prefer exact SHA-256 matching: ${JSON.stringify(prep.uploads)}`);
    result.checks.prepare_direct={upload_mode:prep.upload_mode,uploads:prep.uploads.map(x=>({expected_name:x.expected_name,source_name:x.source_name,path:x.path,matched_by:x.matched_by,has_signed_url:!!x.signed_url,has_token:!!x.token}))};

    for(const up of prep.uploads){
      const index=Number(up.client_index),body=bodies[index];
      if(!body)throw new Error('prepare_direct returned invalid client_index');
      const form=new FormData();form.append('cacheControl','3600');form.append('',new Blob([body.bytes],{type:up.mime_type||'application/octet-stream'}),body.name);
      const response=await fetch(up.signed_url,{method:'PUT',body:form});
      if(!response.ok)throw new Error(`signed upload HTTP ${response.status}: ${text(await response.text(),900)}`);
      paths.push(up.path);
    }
    result.checks.signed_uploads={count:paths.length,paths};

    const receipts=prep.uploads.map(x=>({expected_name:x.expected_name,canonical_name:x.canonical_name,archive_role:x.archive_role,matched_by:x.matched_by,source_name:x.source_name,source_path:x.source_path,size_bytes:x.size_bytes,sha256:x.sha256,path:x.path}));
    const fin=await edge({tender_id:tempId,mode:'finalize_direct',archive_name:'browser-local.zip',uploads:receipts});
    if(fin.dossier_complete!==true||fin.dossier_saved!==true||fin.upload_mode!=='signed_direct_storage')throw new Error(`finalize_direct failed: ${JSON.stringify(fin)}`);
    result.checks.finalize_direct={dossier_complete:fin.dossier_complete,dossier_saved:fin.dossier_saved,analysis_ready:fin.analysis_ready,remaining:fin.remaining_protected_documents||[]};

    for(const up of prep.uploads){
      const original=bodies[Number(up.client_index)].bytes,downloaded=await storageDownload(up.path);
      if(downloaded.length!==original.length||sha(downloaded)!==sha(original))throw new Error(`Stored bytes mismatch for ${up.source_name}`);
    }
    result.checks.storage_roundtrip={verified:true,count:prep.uploads.length};

    const rows=await rest(`kek_tender_watch?id=eq.${tempId}&select=payload`),row=Array.isArray(rows)?rows[0]:null;
    const archive=Array.isArray(row?.payload?.protected_archive)?row.payload.protected_archive:[];
    if(archive.length!==2||archive.some(x=>x.storage_status!=='available'||x.source!=='browser_direct_signed_upload'))throw new Error('Canonical archive metadata was not finalized as direct signed upload.');
    if(row?.payload?.dossier_integrity?.storage_missing!==false||row?.payload?.dossier_integrity?.storage_files_available!==true)throw new Error('Dossier integrity was not restored after direct upload.');
    const qRows=await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}&select=status,auth_required,last_error`),q=Array.isArray(qRows)?qRows[0]:null;
    if(!q||q.status!=='ready'||q.auth_required!==false||text(q.last_error)!=='')throw new Error(`Queue not ready after direct upload: ${JSON.stringify(q)}`);
    result.checks.canonical_state={archive_count:archive.length,queue_status:q.status,auth_required:q.auth_required,storage_files_available:true};

    result.ok=true;result.finished_at=new Date().toISOString();
  }catch(error){
    result.error=text(error?.stack||error?.message||error,5000);result.finished_at=new Date().toISOString();process.exitCode=1;
  }finally{
    const errors=[];
    for(const path of [...new Set(paths)]){try{await storageDelete(path);result.cleanup.storage_paths_removed++;}catch(e){errors.push(text(e?.message||e,700));}}
    try{await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${tempId}`,{method:'DELETE'});result.cleanup.temp_queue_deleted=true;}catch(e){errors.push(text(e?.message||e,700));}
    try{await rest(`kek_tender_watch?id=eq.${tempId}`,{method:'DELETE'});result.cleanup.temp_tender_deleted=true;}catch(e){errors.push(text(e?.message||e,700));}
    result.cleanup.errors=errors;if(errors.length||!result.cleanup.temp_queue_deleted||!result.cleanup.temp_tender_deleted){result.ok=false;process.exitCode=1;}
    await mkdir('tmp',{recursive:true});await writeFile(OUT,JSON.stringify(result,null,2));
    console.log(JSON.stringify(result,null,2));
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
