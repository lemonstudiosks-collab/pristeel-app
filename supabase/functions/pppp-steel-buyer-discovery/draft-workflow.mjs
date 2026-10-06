// Uses the existing authorized draft engine; never calls a Gmail send endpoint.
export async function prepareReadyDrafts(db,env,cronSecret,fetcher=fetch){
  if(!cronSecret)return {skipped:true,reason:'scheduled_cron_context_required',external_email_sent:false};
  const q=await db.from('pppp_dach_steel_targets_v1').select('id,company_domain,canonical_contact_email').eq('workflow_state','ready_for_outreach').eq('outreach_status','ready').in('contact_status',['found','verified']).not('canonical_contact_email','is',null).in('target_status',['watch','qualified','hot']).order('updated_at',{ascending:true}).limit(2);
  if(q.error)throw q.error;if(!(q.data||[]).length)return {checked:0,items:[],external_email_sent:false};
  const ids=q.data.map(x=>x.id),history=await db.from('pppp_outbound_queue_v1').select('source_record_id,status,gmail_draft_id,sent_at,replied_at,suppression_reason').in('source_record_id',ids).limit(32);if(history.error)throw history.error;
  const items=[];
  for(const target of q.data){
    if((history.data||[]).some(x=>x.source_record_id===target.id)){items.push({target_id:target.id,skipped:true,reason:'existing_outreach'});continue;}
    try {
      const response=await fetcher(env('SUPABASE_URL')+'/functions/v1/pppp-dach-steel-draft-generator',{method:'POST',headers:{Authorization:'Bearer '+env('SUPABASE_SERVICE_ROLE_KEY'),'x-pppp-cron-secret':cronSecret,'Content-Type':'application/json'},body:JSON.stringify({mode:'refresh',target_id:target.id,recipient_email:target.canonical_contact_email}),signal:AbortSignal.timeout(20000)});
      const result=await response.json();if(!response.ok||result.ok!==true)throw Error(String(result.error||'buyer_draft_http_'+response.status));
      if(result.external_email_sent!==false||result.human_send_required!==true)throw Error('buyer_draft_protected_gate_contract_failed');
      const verify=await db.from('pppp_outbound_queue_v1').select('id,gmail_draft_id,sent_at,approved_for_send,human_send_required').eq('id',result.queue?.id).maybeSingle();
      if(verify.error)throw verify.error;
      if(!verify.data?.gmail_draft_id||verify.data.sent_at||verify.data.approved_for_send!==false||verify.data.human_send_required!==true)throw Error('buyer_draft_read_back_verification_failed');
      items.push({target_id:target.id,draft_id:verify.data.gmail_draft_id,verified:true,reused:result.reused===true});
    }catch(error){items.push({target_id:target.id,error:String(error?.message||error)});}
  }
  return {checked:q.data.length,items,external_email_sent:false};
}
