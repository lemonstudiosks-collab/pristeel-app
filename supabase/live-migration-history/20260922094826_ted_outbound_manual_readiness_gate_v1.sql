
create or replace function public.pppp_ted_outreach_readiness_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  r public.pppp_opportunity_outreach_registry_v1%rowtype;
  a public.pppp_opportunity_actions%rowtype;
  t public.kek_tender_watch%rowtype;
  ready jsonb;
  winner_type text;
  angle text;
  recipient_domain text;
  verified_domain text;
  local_part text;
  self_risk text;
  contact_quality text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;
  if q.source <> 'TED' then return jsonb_build_object('ok',false,'reason','not_ted'); end if;
  if q.source_record_id is null then return jsonb_build_object('ok',false,'reason','ted_registry_identity_missing'); end if;

  select * into r from public.pppp_opportunity_outreach_registry_v1 where id=q.source_record_id;
  if not found then return jsonb_build_object('ok',false,'reason','ted_registry_missing'); end if;

  select * into a from public.pppp_opportunity_actions where id=r.action_id;
  if not found then return jsonb_build_object('ok',false,'reason','ted_action_missing'); end if;

  select * into t from public.kek_tender_watch where id=coalesce(r.tender_watch_id,a.tender_watch_id,q.tender_watch_id);
  if not found then return jsonb_build_object('ok',false,'reason','ted_tender_missing'); end if;

  winner_type:=lower(coalesce(nullif(t.payload #>> '{winner,company_type}',''),nullif(t.payload #>> '{winner,company_classification,company_type}',''),''));
  angle:=lower(coalesce(nullif(t.payload->>'cooperation_angle',''),''));

  if winner_type='' or winner_type='unknown' then
    return jsonb_build_object('ok',false,'reason','ted_winner_role_unverified','winner_company_type',winner_type);
  end if;
  if angle in ('verify_company_role','verify_supply_or_fabrication_role') then
    return jsonb_build_object('ok',false,'reason','ted_cooperation_role_requires_verification','cooperation_angle',angle);
  end if;

  ready:=coalesce(r.payload->'outreach_readiness_v1',a.payload->'outreach_readiness_v1',t.payload->'outreach_readiness_v1');
  if ready is null or jsonb_typeof(ready)<>'object' then
    return jsonb_build_object('ok',false,'reason','ted_readiness_evidence_missing');
  end if;

  if coalesce((ready->>'winner_role_verified')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_winner_role_not_verified'); end if;
  if coalesce((ready->>'exact_lot_match')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_exact_lot_not_verified'); end if;
  if coalesce((ready->>'pristeel_scope_fit')::boolean,false) is not true or nullif(trim(coalesce(ready->>'pristeel_scope','')),'') is null then
    return jsonb_build_object('ok',false,'reason','ted_pristeel_scope_not_concrete');
  end if;
  if coalesce((ready->>'contact_identity_verified')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_contact_identity_not_verified'); end if;
  if nullif(trim(coalesce(ready->>'buyer_function','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_buyer_function_missing'); end if;
  if nullif(trim(coalesce(ready->>'concrete_question','')),'') is null then return jsonb_build_object('ok',false,'reason','ted_concrete_question_missing'); end if;
  if coalesce((ready->>'timing_fit')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_timing_not_fit'); end if;
  if coalesce((ready->>'previous_contact_guard')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_previous_contact_guard_missing'); end if;
  if coalesce((ready->>'bounce_suppression_guard')::boolean,false) is not true then return jsonb_build_object('ok',false,'reason','ted_bounce_guard_missing'); end if;

  self_risk:=lower(coalesce(ready->>'self_perform_risk','unknown'));
  if self_risk='high' and coalesce((ready->>'outsourcing_evidence')::boolean,false) is not true then
    return jsonb_build_object('ok',false,'reason','ted_self_perform_risk_high');
  end if;

  if coalesce((ready->>'qualification_required')::boolean,false) and coalesce((ready->>'qualification_fit')::boolean,false) is not true then
    return jsonb_build_object('ok',false,'reason','ted_qualification_not_verified');
  end if;

  recipient_domain:=lower(split_part(coalesce(q.recipient_email,''),'@',2));
  verified_domain:=lower(regexp_replace(coalesce(ready->>'verified_company_domain',''),'^www\.','','i'));
  if verified_domain='' then return jsonb_build_object('ok',false,'reason','ted_verified_company_domain_missing'); end if;
  if recipient_domain<>verified_domain
     and recipient_domain not like '%.'||verified_domain
     and verified_domain not like '%.'||recipient_domain then
    return jsonb_build_object('ok',false,'reason','ted_contact_domain_company_mismatch',
                              'recipient_domain',recipient_domain,'verified_company_domain',verified_domain);
  end if;

  local_part:=lower(split_part(coalesce(q.recipient_email,''),'@',1));
  contact_quality:=lower(coalesce(ready->>'contact_quality',''));
  if local_part in ('info','office','contact','kontakt','mail','hello','post','service','sales')
     and contact_quality<>'generic_fallback_reviewed' then
    return jsonb_build_object('ok',false,'reason','ted_generic_contact_not_reviewed');
  end if;

  return jsonb_build_object(
    'ok',true,'reason','ted_manual_readiness_verified',
    'winner_company_type',winner_type,'cooperation_angle',angle,
    'pristeel_scope',ready->>'pristeel_scope','buyer_function',ready->>'buyer_function',
    'contact_quality',contact_quality,'verified_company_domain',verified_domain,
    'self_perform_risk',self_risk,'readiness',ready
  );
end;
$$;

create or replace function public.pppp_outbound_source_guard_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  r public.pppp_opportunity_outreach_registry_v1%rowtype;
  g public.pppp_gc_prospects_v1%rowtype;
  v_domain text;
  v_ted_guard jsonb;
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
    v_ted_guard:=public.pppp_ted_outreach_readiness_v1(q.id);
    return v_ted_guard;
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
  return jsonb_build_object('ok',false,'reason','unsupported_source');
end;
$$;

create or replace function public.pppp_outbound_approve_rows_v1(p_queue_ids uuid[],p_approved_by text,p_approval_note text default null)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_requested integer:=coalesce(array_length(p_queue_ids,1),0);
  v_approved integer:=0;
begin
  if v_requested<1 or v_requested>50 then raise exception 'Approval batch must contain 1..50 queue ids'; end if;
  if nullif(trim(coalesce(p_approved_by,'')),'') is null then raise exception 'approved_by is required'; end if;

  update public.pppp_outbound_queue_v1 q
     set approved_for_send=true,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object(
           'send_approved_by',trim(p_approved_by),'send_approved_at',now(),
           'send_approval_note',nullif(trim(coalesce(p_approval_note,'')),'')
         ),updated_at=now()
   where q.id=any(p_queue_ids)
     and q.status='planned' and q.sent_at is null and q.replied_at is null and q.bounced_at is null
     and q.suppression_reason is null
     and lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''))<>'prissteel.com'
     and coalesce((public.pppp_outbound_source_guard_v1(q.id)->>'ok')::boolean,false)
     and exists(
       select 1 from public.pppp_outbound_live_drafts_v1 d
       where d.draft_id=q.gmail_draft_id
         and lower(d.recipient_email)=lower(q.recipient_email)
         and d.captured_at>=now()-interval '4 hours'
     );
  get diagnostics v_approved=row_count;

  return jsonb_build_object(
    'ok',v_approved=v_requested,'requested',v_requested,'approved',v_approved,
    'send_enabled',(select send_enabled from public.pppp_outbound_policy_v1 where id='global'),
    'human_send_required',true
  );
end;
$$;

