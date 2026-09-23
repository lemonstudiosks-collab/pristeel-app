
create or replace function public.pppp_ted_outreach_history_guard_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  p public.pppp_outbound_policy_v1%rowtype;
  v_email text;
  v_domain text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;
  select * into p from public.pppp_outbound_policy_v1 where id='global';
  v_email:=lower(coalesce(q.recipient_email,''));
  v_domain:=lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));

  if exists(
    select 1 from public.outreach_contacts h
    where lower(coalesce(h.contact_email,''))=v_email and coalesce(h.bounced,false)
  ) or exists(
    select 1 from public.pppp_outbound_queue_v1 h
    where h.id<>q.id and lower(coalesce(h.recipient_email,''))=v_email and h.bounced_at is not null
  ) then
    return jsonb_build_object('ok',false,'reason','ted_recipient_historical_bounce');
  end if;

  if exists(
    select 1 from public.outreach_contacts h
    where lower(coalesce(h.contact_email,''))=v_email and coalesce(h.replied,false)
  ) or exists(
    select 1 from public.pppp_outbound_queue_v1 h
    where h.id<>q.id and lower(coalesce(h.recipient_email,''))=v_email and h.replied_at is not null
  ) then
    return jsonb_build_object('ok',false,'reason','ted_recipient_has_reply_requires_human');
  end if;

  if exists(
    select 1 from public.pppp_outbound_queue_v1 h
    where h.id<>q.id
      and lower(coalesce(h.recipient_email,''))=v_email
      and h.sent_at>=now()-make_interval(days=>coalesce(p.recipient_cooldown_days,30))
  ) or exists(
    select 1 from public.outreach_contacts h
    where lower(coalesce(h.contact_email,''))=v_email
      and coalesce(h.touch_3,h.touch_2,h.touch_1)>=current_date-coalesce(p.recipient_cooldown_days,30)
  ) then
    return jsonb_build_object('ok',false,'reason','ted_recipient_cooldown_active');
  end if;

  if v_domain<>'' and (
    exists(
      select 1 from public.pppp_outbound_queue_v1 h
      where h.id<>q.id
        and lower(coalesce(public.pppp_outbound_domain_v1(h.recipient_email,h.company_domain),''))=v_domain
        and h.sent_at>=now()-make_interval(days=>coalesce(p.domain_cooldown_days,14))
    ) or exists(
      select 1 from public.outreach_contacts h
      where lower(coalesce(public.pppp_outbound_domain_v1(h.contact_email,h.company_domain),''))=v_domain
        and coalesce(h.touch_3,h.touch_2,h.touch_1)>=current_date-coalesce(p.domain_cooldown_days,14)
    )
  ) then
    return jsonb_build_object('ok',false,'reason','ted_domain_cooldown_active');
  end if;

  return jsonb_build_object('ok',true,'reason','ted_history_clear');
end;
$$;

revoke all on function public.pppp_ted_outreach_history_guard_v1(uuid) from public,anon;
grant execute on function public.pppp_ted_outreach_history_guard_v1(uuid) to authenticated,service_role;

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
  v_guard jsonb;
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

  return jsonb_build_object('ok',false,'reason','unsupported_source');
end;
$$;

revoke all on function public.pppp_outbound_source_guard_v1(uuid) from public,anon;
grant execute on function public.pppp_outbound_source_guard_v1(uuid) to authenticated,service_role;

