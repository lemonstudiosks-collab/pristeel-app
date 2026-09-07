import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolveSupabaseWorkflowAccess} from './supabase-workflow-auth.mjs';

const TENDER_ID='16959ea3-9995-4145-9a7b-a47318e1551f';
const OUT='tmp/opportunity-gmail-registry-production-acceptance.json';
const REQUIRED=[
  'gmail_draft_id','gmail_message_id','gmail_thread_id','gmail_draft_created_at',
  'gmail_draft_generator','gmail_draft_generator_target','gmail_draft_generator_complete',
  'gmail_drafts','gmail_draft_count','gmail_recipient_count','gmail_recipients',
  'gmail_auto_send','human_send_required'
];
const text=(v,max=1200)=>String(v==null?'':v).trim().slice(0,max);

async function main(){
  const access=await resolveSupabaseWorkflowAccess();
  const base=access.supabaseUrl.replace(/\/$/,'');
  const headers={apikey:access.apiKey,Authorization:`Bearer ${access.bearerToken}`,'Content-Type':'application/json'};
  const id=randomUUID(), actionKey=`ACCEPTANCE:GMAIL-REGISTRY:${id}`;
  const result={ok:false,acceptance:'opportunity-gmail-registry-production',temp_action_id:id,auth_mode:access.authMode,started_at:new Date().toISOString(),checks:{},cleanup:{}};
  async function rest(path,{method='GET',body,prefer}={}){
    const r=await fetch(`${base}/rest/v1/${path}`,{method,headers:{...headers,...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    const raw=await r.text();let parsed=null;try{parsed=raw?JSON.parse(raw):null;}catch{}
    if(!r.ok)throw new Error(`REST ${method} ${path} HTTP ${r.status}: ${text(parsed?.message||parsed?.error||raw,700)}`);
    return parsed;
  }
  const sentinel={
    engine_version:'acceptance-before',
    gmail_draft_id:'draft-sentinel',
    gmail_message_id:'message-sentinel',
    gmail_thread_id:'thread-sentinel',
    gmail_draft_created_at:'2026-09-07T00:00:00Z',
    gmail_draft_generator:'pppp-opportunity-draft-generator-v3-language-ted-signature',
    gmail_draft_generator_target:'pppp-opportunity-draft-generator-v3-language-ted-signature',
    gmail_draft_generator_complete:true,
    gmail_drafts:[{email:'acceptance@invalid.example',draft_id:'draft-sentinel',message_id:'message-sentinel',language:'de',tender_reference:'613835-2026'}],
    gmail_draft_count:1,
    gmail_recipient_count:1,
    gmail_recipients:[{email:'acceptance@invalid.example',name:'Acceptance Person'}],
    gmail_auto_send:false,
    human_send_required:true
  };
  try{
    await rest('pppp_opportunity_actions',{method:'POST',prefer:'return=minimal',body:{id,tender_watch_id:TENDER_ID,project_id:null,action_key:actionKey,action_type:'producer_capacity_outreach_draft',route:'TED_PRODUCER',status:'background',priority:'ulët',target_company:'[PPPP ACCEPTANCE] Gmail registry',target_email:null,subject_hint:null,draft_brief:null,payload:sentinel}});
    result.checks.temp_action_created=true;
    const patched=await rest(`pppp_opportunity_actions?id=eq.${id}`,{method:'PATCH',prefer:'return=representation',body:{payload:{engine_version:'acceptance-refresh',company_type:'producer',cooperation_angle:'acceptance-only'}}});
    const row=Array.isArray(patched)?patched[0]:null;if(!row)throw new Error('Acceptance action missing after refresh simulation.');
    const p=row.payload||{};
    if(p.engine_version!=='acceptance-refresh')throw new Error('Refresh payload did not apply its fresh engine state.');
    const missing=REQUIRED.filter(k=>!(k in p));
    if(missing.length)throw new Error(`Registry keys lost after refresh: ${missing.join(', ')}`);
    for(const key of REQUIRED){
      if(JSON.stringify(p[key])!==JSON.stringify(sentinel[key]))throw new Error(`Registry value changed after refresh: ${key}`);
    }
    if(p.gmail_auto_send!==false||p.human_send_required!==true)throw new Error('Human-send safety state was not preserved exactly.');
    result.checks={...result.checks,refresh_engine_version:p.engine_version,preserved_keys:REQUIRED,preserved_count:REQUIRED.length,gmail_auto_send:p.gmail_auto_send,human_send_required:p.human_send_required};
    result.ok=true;result.finished_at=new Date().toISOString();
  }catch(e){result.error=text(e?.stack||e?.message||e,4000);result.finished_at=new Date().toISOString();process.exitCode=1;}
  finally{
    const errors=[];
    try{await rest(`pppp_opportunity_actions?id=eq.${id}`,{method:'DELETE'});}catch(e){errors.push(text(e?.message||e,800));}
    result.cleanup={temp_action_deleted:true,errors};
    if(errors.length){result.ok=false;process.exitCode=1;}
    await mkdir('tmp',{recursive:true});await writeFile(OUT,JSON.stringify(result,null,2));
    console.log(JSON.stringify({ok:result.ok,checks:result.checks,cleanup:result.cleanup,error:result.error||null},null,2));
  }
}
main().catch(e=>{console.error(e);process.exit(1);});
