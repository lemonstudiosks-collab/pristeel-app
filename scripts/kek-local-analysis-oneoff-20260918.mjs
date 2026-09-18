import {mkdir,writeFile} from 'node:fs/promises';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const TENDER_ID='0b7e4541-fa39-4ce6-9297-75e1dda4c706';
const OUT='tmp/kek-local-analysis-oneoff-20260918.json';
const text=(v,max=2400)=>String(v==null?'':v).trim().slice(0,max);

async function main(){
  const access=await resolveSupabaseWorkflowAccess();
  const edgeAccess=await resolveSupabaseWorkflowAccess({
    serviceKey:'',
    syncEmail:process.env.PPPP_SYNC_EMAIL||'',
    syncPassword:process.env.PPPP_SYNC_PASSWORD||''
  });
  if(edgeAccess.authMode!=='pppp_sync_account')throw new Error('PPPP sync JWT unavailable.');
  const base=access.supabaseUrl.replace(/\/$/,'');
  const authHeaders={apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`};
  const edgeHeaders={apikey:edgeAccess.apiKey,Authorization:`Bearer ${edgeAccess.bearerToken}`,'Content-Type':'application/json'};

  async function rest(path){
    const r=await fetch(`${base}/rest/v1/${path}`,{headers:authHeaders});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`REST ${r.status}: ${text(raw,900)}`);
    return parsed;
  }

  const beforeRows=await rest(`kek_tender_watch?id=eq.${TENDER_ID}&select=id,title,payload`);
  const before=Array.isArray(beforeRows)?beforeRows[0]:null;
  if(!before)throw new Error('Target tender not found.');
  const archive=Array.isArray(before?.payload?.protected_archive)?before.payload.protected_archive:[];
  if(archive.length<1)throw new Error('Protected archive is empty.');
  if(before?.payload?.dossier_integrity?.storage_files_available!==true)throw new Error('Storage files are not marked available.');
  if(before?.payload?.dossier_integrity?.manual_full_zip_uploaded!==true)throw new Error('Manual full ZIP is not registered.');

  const r=await fetch(`${base}/functions/v1/pppp-tender-protected-archive-analysis`,{
    method:'POST',headers:edgeHeaders,body:JSON.stringify({tender_id:TENDER_ID})
  });
  const raw=await r.text();let analysis=null;try{analysis=raw?JSON.parse(raw):null;}catch{}
  if(!r.ok||!analysis||analysis.ok===false)throw new Error(`Analyzer HTTP ${r.status}: ${text(analysis?.message||analysis?.error||raw,1600)}`);
  if(analysis.analysis_ready!==true)throw new Error('Analyzer did not return analysis_ready=true.');
  if(analysis.provider?.name!=='local_deterministic')throw new Error(`Expected local_deterministic provider, got ${text(analysis.provider?.name,120)||'none'}.`);

  const afterRows=await rest(`kek_tender_watch?id=eq.${TENDER_ID}&select=id,title,payload,updated_at`);
  const after=Array.isArray(afterRows)?afterRows[0]:null;
  const queueRows=await rest(`pppp_tender_fetch_queue?tender_watch_id=eq.${TENDER_ID}&select=status,auth_required,last_error,updated_at`);
  const queue=Array.isArray(queueRows)?queueRows[0]:null;
  const priceRows=await rest(`pppp_tender_price_features_v1?tender_watch_id=eq.${TENDER_ID}&select=extraction_state,extraction_source,total_weight_kg,structural_steel_weight_kg,steel_scope_purity_score,technical_completeness_score,confidence,updated_at`);
  const price=Array.isArray(priceRows)?priceRows[0]:null;

  const integrity=after?.payload?.dossier_integrity||{};
  const snapshot=after?.payload?.dossier_analysis||{};
  if(after?.payload?.dossier_analysis_status!=='ready')throw new Error('Canonical dossier_analysis_status is not ready.');
  if(snapshot?.provider?.name!=='local_deterministic')throw new Error('Canonical snapshot provider is not local_deterministic.');
  if(snapshot?.dossier_complete!==true)throw new Error('Canonical dossier snapshot is not complete.');
  if(integrity.storage_files_available!==true||integrity.storage_missing===true)throw new Error('Storage integrity is not healthy after analysis.');
  if(Array.isArray(integrity.remaining_expected)&&integrity.remaining_expected.length)throw new Error('Advisory expected-file gaps were not cleared.');
  if(!queue||queue.status!=='analyzed'||queue.auth_required!==false||text(queue.last_error)!=='')throw new Error(`Queue is not clean/analyzed: ${JSON.stringify(queue)}`);
  if(!price||price.extraction_state!=='extracted'||price.extraction_source!=='derived')throw new Error(`Price Intelligence was not persisted as derived: ${JSON.stringify(price)}`);

  const result={
    ok:true,
    tender_id:TENDER_ID,
    title:after.title,
    archived_documents:archive.length,
    provider:analysis.provider?.name,
    analysis_ready:analysis.analysis_ready,
    recommendation:analysis.recommendation||null,
    dossier_analysis_status:after.payload.dossier_analysis_status,
    dossier_complete:snapshot.dossier_complete,
    files_analyzed:Array.isArray(snapshot.files_analyzed)?snapshot.files_analyzed.length:0,
    coverage:snapshot.coverage||null,
    queue:{status:queue.status,auth_required:queue.auth_required,last_error:queue.last_error},
    price_intelligence:price,
    note:'One bounded local deterministic analysis; no OpenAI request is required by this path.'
  };
  await mkdir('tmp',{recursive:true});
  await writeFile(OUT,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
}

main().catch(async error=>{
  const result={ok:false,tender_id:TENDER_ID,error:text(error?.stack||error?.message||error,5000)};
  await mkdir('tmp',{recursive:true});
  await writeFile(OUT,JSON.stringify(result,null,2));
  console.error(JSON.stringify(result,null,2));
  process.exit(1);
});
