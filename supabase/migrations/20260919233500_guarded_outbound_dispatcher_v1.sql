-- Guarded outbound dispatcher primitives.
-- No cron is enabled here. No row is approved here. Global send_enabled stays false.

begin;

alter table public.pppp_outbound_queue_v1
  add column if not exists dispatch_claim_token uuid,
  add column if not exists dispatch_claimed_at timestamptz,
  add column if not exists dispatch_last_error text,
  add column if not exists dispatch_attempts integer not null default 0;

create or replace function public.pppp_outbound_internal_recipient_guard_v1()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.sent_at is null
     and lower(coalesce(public.pppp_outbound_domain_v1(new.recipient_email,new.company_domain),''))='prissteel.com' then
    new.status:='suppressed';
    new.suppression_reason:='internal_pristeel_recipient';
    new.planned_date:=null;
    new.planned_at:=null;
    new.planned_rank:=null;
    new.approved_for_send:=false;
    new.dispatch_claim_token:=null;
    new.dispatch_claimed_at:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists pppp_outbound_internal_recipient_guard_v1 on public.pppp_outbound_queue_v1;
create trigger pppp_outbound_internal_recipient_guard_v1
before insert or update of recipient_email,company_domain,sent_at,status,planned_date,approved_for_send
on public.pppp_outbound_queue_v1
for each row execute function public.pppp_outbound_internal_recipient_guard_v1();

update public.pppp_outbound_queue_v1 q
   set status='suppressed',
       suppression_reason='internal_pristeel_recipient',
       planned_date=null,planned_at=null,planned_rank=null,
       approved_for_send=false,
       dispatch_claim_token=null,dispatch_claimed_at=null,
       updated_at=now()
 where q.sent_at is null
   and lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''))='prissteel.com';

create or replace function public.pppp_outbound_approve_rows_v1(
  p_queue_ids uuid[],
  p_approved_by text,
  p_approval_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_requested integer:=coalesce(array_length(p_queue_ids,1),0);
  v_approved integer:=0;
begin
  if v_requested<1 or v_requested>50 then
    raise exception 'Approval batch must contain 1..50 queue ids';
  end if;
  if nullif(trim(coalesce(p_approved_by,'')),'') is null then
    raise exception 'approved_by is required';
  end if;

  update public.pppp_outbound_queue_v1 q
     set approved_for_send=true,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object(
           'send_approved_by',trim(p_approved_by),
           'send_approved_at',now(),
           'send_approval_note',nullif(trim(coalesce(p_approval_note,'')),'')
         ),
         updated_at=now()
   where q.id=any(p_queue_ids)
     and q.status='planned'
     and q.sent_at is null
     and q.replied_at is null
     and q.bounced_at is null
     and q.suppression_reason is null
     and lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''))<>'prissteel.com'
     and exists(
       select 1
       from public.pppp_outbound_live_drafts_v1 d
       where d.draft_id=q.gmail_draft_id
         and d.captured_at>=now()-interval '4 hours'
     );
  get diagnostics v_approved=row_count;

  return jsonb_build_object(
    'ok',v_approved=v_requested,
    'requested',v_requested,
    'approved',v_approved,
    'send_enabled',(select send_enabled from public.pppp_outbound_policy_v1 where id='global'),
    'human_send_required',true
  );
end;
$$;

create or replace function public.pppp_outbound_claim_for_dispatch_v1(
  p_queue_id uuid,
  p_claim_token uuid
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  p public.pppp_outbound_policy_v1%rowtype;
  v_today date;
  v_sent_today integer:=0;
  v_domain_sent integer:=0;
  v_last_sent timestamptz;
begin
  if p_queue_id is null or p_claim_token is null then
    return jsonb_build_object('ok',false,'reason','queue_id_and_claim_token_required');
  end if;

  select * into p from public.pppp_outbound_policy_v1 where id='global';
  if not found then return jsonb_build_object('ok',false,'reason','policy_missing'); end if;
  if not p.send_enabled then return jsonb_build_object('ok',false,'reason','send_disabled'); end if;
  if not p.human_send_required then return jsonb_build_object('ok',false,'reason','human_gate_invalid'); end if;

  select * into q
  from public.pppp_outbound_queue_v1
  where id=p_queue_id
  for update;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;

  v_today:=(now() at time zone p.timezone)::date;

  if q.status<>'planned' then return jsonb_build_object('ok',false,'reason','not_planned'); end if;
  if not q.approved_for_send then return jsonb_build_object('ok',false,'reason','not_human_approved'); end if;
  if q.sent_at is not null then return jsonb_build_object('ok',false,'reason','already_sent'); end if;
  if q.replied_at is not null then return jsonb_build_object('ok',false,'reason','reply_detected'); end if;
  if q.bounced_at is not null then return jsonb_build_object('ok',false,'reason','bounce_detected'); end if;
  if q.suppression_reason is not null then return jsonb_build_object('ok',false,'reason','suppressed','detail',q.suppression_reason); end if;
  if q.planned_date is distinct from v_today then return jsonb_build_object('ok',false,'reason','wrong_operating_day'); end if;
  if q.planned_at is null or q.planned_at>now() then return jsonb_build_object('ok',false,'reason','not_due'); end if;
  if lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''))='prissteel.com' then
    return jsonb_build_object('ok',false,'reason','internal_pristeel_recipient');
  end if;

  if q.dispatch_claim_token is not null
     and q.dispatch_claim_token<>p_claim_token
     and q.dispatch_claimed_at>now()-interval '15 minutes' then
    return jsonb_build_object('ok',false,'reason','already_claimed');
  end if;

  if not exists(
    select 1
    from public.pppp_outbound_live_drafts_v1 d
    where d.draft_id=q.gmail_draft_id
      and lower(d.recipient_email)=lower(q.recipient_email)
      and d.captured_at>=now()-interval '4 hours'
  ) then
    return jsonb_build_object('ok',false,'reason','live_draft_not_fresh');
  end if;

  if exists(
    select 1
    from public.outreach_contacts o
    where lower(coalesce(o.contact_email,''))=lower(q.recipient_email)
      and (coalesce(o.bounced,false) or lower(coalesce(o.status,'')) like '%do not contact%')
  ) then
    return jsonb_build_object('ok',false,'reason','recipient_blocked_by_history');
  end if;

  if q.company_domain is not null and exists(
    select 1
    from public.outreach_contacts o
    where lower(coalesce(o.company_domain,''))=lower(q.company_domain)
      and coalesce(o.replied,false)
  ) then
    return jsonb_build_object('ok',false,'reason','company_reply_requires_human_followup');
  end if;

  select count(*) into v_sent_today
  from public.pppp_outbound_queue_v1 x
  where x.sent_at is not null
    and (x.sent_at at time zone p.timezone)::date=v_today;
  if v_sent_today>=p.daily_limit then return jsonb_build_object('ok',false,'reason','daily_limit_reached'); end if;

  select max(x.sent_at) into v_last_sent
  from public.pppp_outbound_queue_v1 x
  where x.sent_at is not null
    and (x.sent_at at time zone p.timezone)::date=v_today;
  if v_last_sent is not null and v_last_sent>now()-make_interval(mins=>p.min_gap_minutes) then
    return jsonb_build_object('ok',false,'reason','minimum_gap_not_elapsed','last_sent_at',v_last_sent);
  end if;

  select count(*) into v_domain_sent
  from public.pppp_outbound_queue_v1 x
  where x.sent_at is not null
    and (x.sent_at at time zone p.timezone)::date=v_today
    and lower(coalesce(public.pppp_outbound_domain_v1(x.recipient_email,x.company_domain),''))=
        lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));
  if v_domain_sent>=p.max_per_domain_per_day then
    return jsonb_build_object('ok',false,'reason','domain_daily_limit_reached');
  end if;

  update public.pppp_outbound_queue_v1
     set dispatch_claim_token=p_claim_token,
         dispatch_claimed_at=now(),
         dispatch_attempts=dispatch_attempts+1,
         dispatch_last_error=null,
         updated_at=now()
   where id=q.id;

  return jsonb_build_object(
    'ok',true,
    'queue_id',q.id,
    'draft_id',q.gmail_draft_id,
    'recipient_email',q.recipient_email,
    'company_domain',q.company_domain,
    'planned_at',q.planned_at,
    'sent_today',v_sent_today,
    'daily_limit',p.daily_limit,
    'claim_token',p_claim_token
  );
end;
$$;

create or replace function public.pppp_outbound_mark_dispatch_failed_v1(
  p_queue_id uuid,
  p_claim_token uuid,
  p_error text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.pppp_outbound_queue_v1
     set dispatch_claim_token=null,
         dispatch_claimed_at=null,
         dispatch_last_error=left(coalesce(p_error,'dispatch_failed'),1000),
         updated_at=now()
   where id=p_queue_id
     and dispatch_claim_token=p_claim_token
     and sent_at is null;

  return jsonb_build_object('ok',found);
end;
$$;

create or replace function public.pppp_outbound_mark_sent_v1(
  p_queue_id uuid,
  p_claim_token uuid,
  p_message_id text,
  p_thread_id text,
  p_sent_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  v_sent_at timestamptz:=coalesce(p_sent_at,now());
begin
  select * into q
  from public.pppp_outbound_queue_v1
  where id=p_queue_id
  for update;
  if not found then raise exception 'Queue row not found'; end if;
  if q.sent_at is not null then
    return jsonb_build_object('ok',true,'already_recorded',true,'sent_at',q.sent_at);
  end if;
  if q.dispatch_claim_token is distinct from p_claim_token then
    raise exception 'Dispatch claim mismatch';
  end if;
  if nullif(trim(coalesce(p_message_id,'')),'') is null then raise exception 'message_id required'; end if;

  update public.pppp_outbound_queue_v1
     set status='sent',
         sent_at=v_sent_at,
         gmail_draft_message_id=coalesce(gmail_draft_message_id,p_message_id),
         gmail_thread_id=coalesce(p_thread_id,gmail_thread_id),
         approved_for_send=false,
         dispatch_claim_token=null,
         dispatch_claimed_at=null,
         dispatch_last_error=null,
         payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object(
           'dispatched_at',v_sent_at,
           'gmail_sent_message_id',p_message_id,
           'gmail_sent_thread_id',p_thread_id
         ),
         updated_at=now()
   where id=q.id;

  if q.source='TED' and q.source_record_id is not null then
    update public.pppp_opportunity_outreach_registry_v1
       set status='sent',
           gmail_message_id=p_message_id,
           gmail_thread_id=coalesce(p_thread_id,gmail_thread_id),
           sent_at=v_sent_at,
           last_checked_at=now(),
           last_error=null,
           updated_at=now()
     where id=q.source_record_id;
  elsif q.source='GC' and q.source_record_id is not null then
    if q.touch_no=1 then
      perform public.pppp_gc_mark_first_sent_v1(q.source_record_id,p_message_id,p_thread_id,v_sent_at);
    elsif q.touch_no=2 then
      perform public.pppp_gc_mark_second_sent_v1(q.source_record_id,p_message_id,p_thread_id,v_sent_at);
    end if;
  end if;

  return jsonb_build_object('ok',true,'queue_id',q.id,'status','sent','sent_at',v_sent_at);
end;
$$;

create or replace function public.pppp_outbound_dispatch_internal_request()
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  p public.pppp_outbound_policy_v1%rowtype;
  v_id uuid;
begin
  select * into p from public.pppp_outbound_policy_v1 where id='global';
  if not found or not p.send_enabled then return null; end if;

  select q.id into v_id
  from public.pppp_outbound_queue_v1 q
  where q.status='planned'
    and q.approved_for_send=true
    and q.sent_at is null
    and q.replied_at is null
    and q.bounced_at is null
    and q.suppression_reason is null
    and q.planned_date=(now() at time zone p.timezone)::date
    and q.planned_at<=now()
    and (q.dispatch_claimed_at is null or q.dispatch_claimed_at<=now()-interval '15 minutes')
    and lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''))<>'prissteel.com'
    and exists(
      select 1 from public.pppp_outbound_live_drafts_v1 d
      where d.draft_id=q.gmail_draft_id
        and lower(d.recipient_email)=lower(q.recipient_email)
        and d.captured_at>=now()-interval '4 hours'
    )
  order by q.planned_rank nulls last,q.planned_at,q.id
  limit 1;

  if v_id is null then return null; end if;

  return public.pppp_enqueue_automation_http_v1(
    'pppp-outbound-dispatch',
    'https://awqfpnzqwfjrjefoktgd.supabase.co/functions/v1/pppp-outbound-dispatch?queue_id='||v_id::text,
    'gmail_tracker_cron_secret',
    120000,
    1
  );
end;
$$;

revoke all on function public.pppp_outbound_approve_rows_v1(uuid[],text,text) from public,anon,authenticated;
revoke all on function public.pppp_outbound_claim_for_dispatch_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.pppp_outbound_mark_dispatch_failed_v1(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.pppp_outbound_mark_sent_v1(uuid,uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.pppp_outbound_dispatch_internal_request() from public,anon,authenticated;

grant execute on function public.pppp_outbound_approve_rows_v1(uuid[],text,text) to service_role;
grant execute on function public.pppp_outbound_claim_for_dispatch_v1(uuid,uuid) to service_role;
grant execute on function public.pppp_outbound_mark_dispatch_failed_v1(uuid,uuid,text) to service_role;
grant execute on function public.pppp_outbound_mark_sent_v1(uuid,uuid,text,text,timestamptz) to service_role;
grant execute on function public.pppp_outbound_dispatch_internal_request() to service_role;

-- Important: no cron.schedule here. Activation remains a separate explicit human-approved step.

commit;
