
create or replace function public.pppp_chatgpt_register_dach_steel_outreach_draft_v1(
  p_command_id text,
  p_payload jsonb,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_command_id text := nullif(btrim(p_command_id),'');
  v_source text := coalesce(nullif(btrim(p_source),''),'chatgpt');
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
  v_metadata jsonb := case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_target public.pppp_dach_steel_targets_v1%rowtype;
  v_queue public.pppp_outbound_queue_v1%rowtype;
  v_unknown_key text;
  v_target_source_key text;
  v_recipient_email text;
  v_recipient_name text;
  v_contact_role text;
  v_draft_id text;
  v_draft_message_id text;
  v_thread_id text;
  v_subject text;
  v_mode text;
  v_domain text;
  v_queue_key text;
  v_relevance integer;
begin
  if v_command_id is null then raise exception using errcode='22023',message='command_id_required'; end if;
  if v_source <> 'chatgpt' then raise exception using errcode='22023',message='invalid_dach_outreach_source'; end if;
  if jsonb_typeof(v_payload) <> 'object' then raise exception using errcode='22023',message='dach_outreach_value_json_must_be_object'; end if;

  select k into v_unknown_key
  from jsonb_object_keys(v_payload) x(k)
  where k not in (
    'target_source_key','recipient_email','recipient_name','contact_role',
    'gmail_draft_id','gmail_draft_message_id','gmail_thread_id',
    'subject','approach_mode'
  )
  limit 1;
  if v_unknown_key is not null then
    raise exception using errcode='22023',message='dach_outreach_field_not_allowed:'||v_unknown_key;
  end if;

  v_target_source_key := nullif(btrim(v_payload->>'target_source_key'),'');
  v_recipient_email := lower(nullif(btrim(v_payload->>'recipient_email'),''));
  v_recipient_name := nullif(btrim(v_payload->>'recipient_name'),'');
  v_contact_role := nullif(btrim(v_payload->>'contact_role'),'');
  v_draft_id := nullif(btrim(v_payload->>'gmail_draft_id'),'');
  v_draft_message_id := nullif(btrim(v_payload->>'gmail_draft_message_id'),'');
  v_thread_id := nullif(btrim(v_payload->>'gmail_thread_id'),'');
  v_subject := nullif(btrim(v_payload->>'subject'),'');
  v_mode := lower(nullif(btrim(v_payload->>'approach_mode'),''));

  if v_target_source_key is null then raise exception using errcode='22023',message='target_source_key_required'; end if;
  if v_recipient_email is null or v_recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023',message='valid_recipient_email_required';
  end if;
  if v_draft_id is null then raise exception using errcode='22023',message='gmail_draft_id_required'; end if;
  if v_subject is null then raise exception using errcode='22023',message='subject_required'; end if;
  if v_mode not in ('rfq_request','direct_offer') then raise exception using errcode='22023',message='invalid_approach_mode'; end if;

  v_domain := lower(split_part(v_recipient_email,'@',2));
  if v_domain in ('gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','aol.com',
                  'example.com','example.org','example.net') then
    raise exception using errcode='22023',message='personal_or_test_recipient_domain_not_allowed';
  end if;
  if lower(split_part(v_recipient_email,'@',1)) in
     ('jobs','careers','career','hr','privacy','gdpr','webmaster','press','presse','media','newsletter','noreply','no-reply','donotreply','dpo','security','abuse') then
    raise exception using errcode='22023',message='unsafe_recipient_localpart';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id,0));
  perform pg_advisory_xact_lock(hashtextextended(v_target_source_key,1));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id=v_command_id
  for update;

  if not found then raise exception using errcode='42501',message='approved_bridge_receipt_required'; end if;
  if v_receipt.action_type <> 'dach_steel_outreach_draft' then raise exception using errcode='23505',message='command_id_conflict'; end if;
  if lower(coalesce(v_receipt.approval,'')) <> 'approved' then raise exception using errcode='42501',message='dach_outreach_command_not_approved'; end if;

  if v_receipt.status='succeeded' then
    return v_receipt.result || jsonb_build_object('created',false,'idempotent_replay',true);
  end if;
  if v_receipt.status <> 'processing' then raise exception using errcode='42501',message='dach_outreach_receipt_not_processing'; end if;

  select * into v_target
  from public.pppp_dach_steel_targets_v1
  where source_key=v_target_source_key
  for update;

  if not found then raise exception using errcode='23503',message='dach_target_not_found'; end if;
  if v_target.target_status in ('closed','rejected') then raise exception using errcode='23514',message='dach_target_not_active'; end if;

  if v_target.quote_readiness='M3' and v_mode<>'direct_offer' then
    raise exception using errcode='23514',message='m3_requires_direct_offer_mode';
  end if;
  if v_target.quote_readiness in ('M0','M1','M2') and v_mode<>'rfq_request' then
    raise exception using errcode='23514',message='m0_m2_require_rfq_request_mode';
  end if;

  if v_target.company_domain is not null and lower(v_target.company_domain) <> v_domain then
    raise exception using errcode='23514',message='recipient_domain_mismatch';
  end if;

  v_queue_key := 'DACH_STEEL_BUYER:'||v_target.id::text||':1';
  v_relevance := case v_target.score_band
    when 'A1' then 95 when 'A2' then 85 when 'B1' then 70 when 'B2' then 60 else 40 end;

  select * into v_queue
  from public.pppp_outbound_queue_v1
  where source='DACH_STEEL_BUYER' and source_record_id=v_target.id and touch_no=1
  for update;

  if found and (v_queue.sent_at is not null or v_queue.approved_for_send) then
    raise exception using errcode='23514',message='existing_dach_outreach_locked_after_send_or_approval';
  end if;

  if found then
    update public.pppp_outbound_queue_v1
       set source_key=v_queue_key,
           project_key=v_target.source_key,
           project_title=v_target.project_title,
           company_name=v_target.company_name,
           company_domain=coalesce(v_target.company_domain,v_domain),
           recipient_email=v_recipient_email,
           recipient_name=v_recipient_name,
           contact_role=coalesce(v_contact_role,'Project / Procurement routing'),
           relevance_score=v_relevance,
           priority_score=public.pppp_outbound_priority_v1(v_recipient_email,v_recipient_name,coalesce(v_contact_role,'Project / Procurement routing'),v_relevance),
           gmail_draft_id=v_draft_id,
           gmail_draft_message_id=v_draft_message_id,
           gmail_thread_id=v_thread_id,
           status='candidate',
           suppression_reason=null,
           planned_date=null,
           planned_at=null,
           planned_rank=null,
           approved_for_send=false,
           human_send_required=true,
           source_updated_at=v_target.updated_at,
           payload=jsonb_build_object(
             'approach_mode',v_mode,
             'target_source_key',v_target.source_key,
             'subject',v_subject,
             'quote_readiness',v_target.quote_readiness,
             'why_now',v_target.why_now,
             'steel_scope',v_target.steel_scope,
             'country',v_target.country
           ),
           updated_at=now()
     where id=v_queue.id
     returning * into v_queue;
  else
    insert into public.pppp_outbound_queue_v1(
      source,source_record_id,source_key,touch_no,project_key,project_title,
      company_name,company_domain,recipient_email,recipient_name,contact_role,
      relevance_score,priority_score,gmail_draft_id,gmail_draft_message_id,gmail_thread_id,
      status,suppression_reason,approved_for_send,human_send_required,
      source_updated_at,payload,updated_at
    ) values (
      'DACH_STEEL_BUYER',v_target.id,v_queue_key,1,v_target.source_key,v_target.project_title,
      v_target.company_name,coalesce(v_target.company_domain,v_domain),v_recipient_email,v_recipient_name,
      coalesce(v_contact_role,'Project / Procurement routing'),
      v_relevance,
      public.pppp_outbound_priority_v1(v_recipient_email,v_recipient_name,coalesce(v_contact_role,'Project / Procurement routing'),v_relevance),
      v_draft_id,v_draft_message_id,v_thread_id,
      'candidate',null,false,true,
      v_target.updated_at,
      jsonb_build_object(
        'approach_mode',v_mode,
        'target_source_key',v_target.source_key,
        'subject',v_subject,
        'quote_readiness',v_target.quote_readiness,
        'why_now',v_target.why_now,
        'steel_scope',v_target.steel_scope,
        'country',v_target.country
      ),
      now()
    )
    returning * into v_queue;
  end if;

  update public.pppp_dach_steel_targets_v1
     set company_domain=coalesce(company_domain,v_domain),
         contact_status='found',
         outreach_status='queued',
         outbound_source_key=v_queue_key,
         next_action='Review RFQ/direct-offer draft in Gmail and shared outbound preflight; sending remains human-approved.',
         updated_at=now()
   where id=v_target.id;

  return jsonb_build_object(
    'ok',true,
    'command_id',v_command_id,
    'target_id',v_target.id,
    'queue_id',v_queue.id,
    'source_key',v_queue.source_key,
    'recipient_email',v_queue.recipient_email,
    'gmail_draft_id',v_queue.gmail_draft_id,
    'approach_mode',v_mode,
    'approved_for_send',false,
    'human_send_required',true,
    'external_email_sent',false,
    'project_created',false,
    'metadata',v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_register_dach_steel_outreach_draft_v1(text,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_register_dach_steel_outreach_draft_v1(text,jsonb,text,jsonb) to service_role;

create or replace function public.pppp_outbound_source_guard_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path to public, pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  r public.pppp_opportunity_outreach_registry_v1%rowtype;
  g public.pppp_gc_prospects_v1%rowtype;
  d public.pppp_dach_steel_targets_v1%rowtype;
  v_domain text;
  v_guard jsonb;
  v_mode text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;
  v_domain:=lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));

  if q.source='TED' then
    if q.source_record_id is null or q.source_key is distinct from ('TED:'||q.source_record_id::text) then return jsonb_build_object('ok',false,'reason','ted_noncanonical_identity'); end if;
    select * into r from public.pppp_opportunity_outreach_registry_v1 where id=q.source_record_id;
    if not found then return jsonb_build_object('ok',false,'reason','ted_registry_missing'); end if;
    if r.status<>'draft_created' then return jsonb_build_object('ok',false,'reason','ted_not_active_candidate','source_status',r.status); end if;
    if r.sent_at is not null then return jsonb_build_object('ok',false,'reason','ted_already_sent'); end if;
    if r.gmail_draft_id is distinct from q.gmail_draft_id then return jsonb_build_object('ok',false,'reason','ted_draft_identity_mismatch'); end if;
    if lower(coalesce(r.recipient_email,'')) is distinct from lower(coalesce(q.recipient_email,'')) then return jsonb_build_object('ok',false,'reason','ted_recipient_identity_mismatch'); end if;
    v_guard:=public.pppp_ted_outreach_history_guard_v1(q.id);
    if not coalesce((v_guard->>'ok')::boolean,false) then return v_guard; end if;
    return public.pppp_ted_outreach_readiness_v1(q.id);
  end if;

  if q.source='GC' then
    if q.source_record_id is null then return jsonb_build_object('ok',false,'reason','gc_source_identity_missing'); end if;
    select * into g from public.pppp_gc_prospects_v1 where id=q.source_record_id;
    if not found then return jsonb_build_object('ok',false,'reason','gc_source_missing'); end if;
    if coalesce(g.do_not_contact,false) or g.status='do_not_contact' then return jsonb_build_object('ok',false,'reason','gc_do_not_contact'); end if;
    if g.bounced_at is not null or g.status='bounced' then return jsonb_build_object('ok',false,'reason','gc_bounced'); end if;
    if g.replied_at is not null or g.status='replied' then return jsonb_build_object('ok',false,'reason','gc_replied'); end if;
    if coalesce(g.no_more_auto,false) then return jsonb_build_object('ok',false,'reason','gc_no_more_auto'); end if;
    if g.status in ('already_contacted','human_review') then return jsonb_build_object('ok',false,'reason','gc_human_review_or_history'); end if;
    if nullif(trim(coalesce(g.duplicate_reason,'')),'') is not null then return jsonb_build_object('ok',false,'reason','gc_duplicate_history_review'); end if;
    if exists(
      select 1 from public.pppp_opportunity_outreach_registry_v1 tr
      where tr.status='draft_created' and tr.sent_at is null
        and (lower(coalesce(tr.recipient_email,''))=lower(coalesce(q.recipient_email,''))
          or (v_domain<>'' and lower(coalesce(public.pppp_outbound_domain_v1(tr.recipient_email,null),''))=v_domain))
    ) then return jsonb_build_object('ok',false,'reason','cross_source_conflict_requires_review'); end if;
    if q.touch_no=1 then
      if g.status<>'draft_ready' then return jsonb_build_object('ok',false,'reason','gc_first_touch_not_explicit_ready','source_status',g.status); end if;
      if g.first_sent_at is not null then return jsonb_build_object('ok',false,'reason','gc_first_touch_already_sent'); end if;
      if g.first_draft_id is distinct from q.gmail_draft_id then return jsonb_build_object('ok',false,'reason','gc_first_touch_draft_mismatch'); end if;
      return jsonb_build_object('ok',true,'reason','gc_first_touch_explicit_ready');
    elsif q.touch_no=2 then
      if g.status<>'draft_2_ready' then return jsonb_build_object('ok',false,'reason','gc_followup_not_explicit_ready','source_status',g.status); end if;
      if g.first_sent_at is null then return jsonb_build_object('ok',false,'reason','gc_followup_missing_first_send'); end if;
      if g.second_sent_at is not null then return jsonb_build_object('ok',false,'reason','gc_followup_already_sent'); end if;
      if g.second_draft_id is distinct from q.gmail_draft_id then return jsonb_build_object('ok',false,'reason','gc_followup_draft_mismatch'); end if;
      return jsonb_build_object('ok',true,'reason','gc_followup_explicit_ready');
    end if;
    return jsonb_build_object('ok',false,'reason','gc_touch_not_supported');
  end if;

  if q.source='DACH_STEEL_BUYER' then
    if q.source_record_id is null then return jsonb_build_object('ok',false,'reason','dach_source_identity_missing'); end if;
    if q.touch_no<>1 then return jsonb_build_object('ok',false,'reason','dach_touch_not_supported'); end if;
    if q.source_key is distinct from ('DACH_STEEL_BUYER:'||q.source_record_id::text||':1') then
      return jsonb_build_object('ok',false,'reason','dach_noncanonical_identity');
    end if;

    select * into d from public.pppp_dach_steel_targets_v1 where id=q.source_record_id;
    if not found then return jsonb_build_object('ok',false,'reason','dach_target_missing'); end if;
    if d.target_status in ('closed','rejected') then return jsonb_build_object('ok',false,'reason','dach_target_not_active'); end if;
    if d.outreach_status<>'queued' then return jsonb_build_object('ok',false,'reason','dach_target_not_queued','source_status',d.outreach_status); end if;
    if d.outbound_source_key is distinct from q.source_key then return jsonb_build_object('ok',false,'reason','dach_queue_identity_mismatch'); end if;
    if d.contact_status not in ('found','verified') then return jsonb_build_object('ok',false,'reason','dach_contact_not_ready'); end if;
    if q.gmail_draft_id is null then return jsonb_build_object('ok',false,'reason','dach_draft_missing'); end if;
    if d.company_domain is not null and lower(d.company_domain) is distinct from v_domain then
      return jsonb_build_object('ok',false,'reason','dach_recipient_domain_mismatch');
    end if;

    v_mode:=lower(coalesce(q.payload->>'approach_mode',''));
    if d.quote_readiness='M3' and v_mode<>'direct_offer' then
      return jsonb_build_object('ok',false,'reason','dach_m3_mode_mismatch');
    end if;
    if d.quote_readiness in ('M0','M1','M2') and v_mode<>'rfq_request' then
      return jsonb_build_object('ok',false,'reason','dach_rfq_mode_required');
    end if;

    return jsonb_build_object('ok',true,'reason','dach_target_and_draft_ready','approach_mode',v_mode);
  end if;

  return jsonb_build_object('ok',false,'reason','unsupported_source');
end;
$$;

alter function public.pppp_chatgpt_bridge_manifest_v1() rename to pppp_chatgpt_bridge_manifest_v21;

create function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb := public.pppp_chatgpt_bridge_manifest_v21();
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v22'::text),true);
  v := jsonb_set(v,'{purpose}',to_jsonb((v->>'purpose') || ' DACH Steel Outreach Draft v1 registers reviewed Gmail drafts into the existing shared outbound queue with exact target linkage, source guard, cooldown/preflight enforcement, and human send approval.'),true);
  v := jsonb_set(v,'{allowed_action_types}',coalesce(v->'allowed_action_types','[]'::jsonb) || '["dach_steel_outreach_draft"]'::jsonb,true);
  v := jsonb_set(v,'{service_write_functions}',coalesce(v->'service_write_functions','[]'::jsonb) || '["public.pppp_chatgpt_register_dach_steel_outreach_draft_v1(text,jsonb,text,jsonb)"]'::jsonb,true);
  v := jsonb_set(
    v,'{write_protocol}',
    coalesce(v->'write_protocol','{}'::jsonb) || jsonb_build_object(
      'dach_steel_outreach_draft_transport','Create/review a Gmail draft first. Then append one approved dach_steel_outreach_draft command with the exact target_source_key, recipient and Gmail draft identity. The trusted worker registers it in shared pppp_outbound_queue_v1 only; it never sends.',
      'dach_steel_outreach_draft_safe_value_json_fields',jsonb_build_array(
        'target_source_key','recipient_email','recipient_name','contact_role',
        'gmail_draft_id','gmail_draft_message_id','gmail_thread_id','subject','approach_mode'
      ),
      'dach_steel_outreach_draft_modes',jsonb_build_array('rfq_request','direct_offer'),
      'dach_steel_outreach_draft_never_sends_email',true,
      'dach_steel_outreach_draft_uses_shared_outbound',true,
      'dach_steel_outreach_draft_requires_human_send_approval',true
    ),true
  );
  return v;
end;
$$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v21() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v21() to service_role;

