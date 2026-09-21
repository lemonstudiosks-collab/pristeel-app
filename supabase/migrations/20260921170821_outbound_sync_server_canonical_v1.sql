-- Canonical repository representation of the live shared outbound server boundary.
-- No queue row is approved, no email is sent, and send_enabled is not changed here.

begin;

CREATE OR REPLACE FUNCTION public.pppp_outbound_claim_for_dispatch_v1(p_queue_id uuid, p_claim_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  p public.pppp_outbound_policy_v1%rowtype;
  v_today date;
  v_local_time time;
  v_sent_today integer:=0;
  v_domain_sent integer:=0;
  v_last_sent timestamptz;
  v_guard jsonb;
  v_domain text;
begin
  if p_queue_id is null or p_claim_token is null then
    return jsonb_build_object('ok',false,'reason','queue_id_and_claim_token_required');
  end if;

  select * into p from public.pppp_outbound_policy_v1 where id='global';
  if not found then return jsonb_build_object('ok',false,'reason','policy_missing'); end if;
  if not p.send_enabled then return jsonb_build_object('ok',false,'reason','send_disabled'); end if;
  if not p.human_send_required then return jsonb_build_object('ok',false,'reason','human_gate_invalid'); end if;

  v_today:=(now() at time zone p.timezone)::date;
  v_local_time:=(now() at time zone p.timezone)::time;
  if v_local_time<p.day_start or v_local_time>=p.day_end then
    return jsonb_build_object(
      'ok',false,'reason','outside_send_window',
      'local_time',v_local_time,'day_start',p.day_start,'day_end',p.day_end,'timezone',p.timezone
    );
  end if;

  select * into q
  from public.pppp_outbound_queue_v1
  where id=p_queue_id
  for update;
  if not found then return jsonb_build_object('ok',false,'reason','queue_row_missing'); end if;

  if q.status<>'planned' then return jsonb_build_object('ok',false,'reason','not_planned'); end if;
  if not q.approved_for_send then return jsonb_build_object('ok',false,'reason','not_human_approved'); end if;
  if q.sent_at is not null then return jsonb_build_object('ok',false,'reason','already_sent'); end if;
  if q.replied_at is not null then return jsonb_build_object('ok',false,'reason','reply_detected'); end if;
  if q.bounced_at is not null then return jsonb_build_object('ok',false,'reason','bounce_detected'); end if;
  if q.suppression_reason is not null then return jsonb_build_object('ok',false,'reason','suppressed','detail',q.suppression_reason); end if;
  if q.planned_date is distinct from v_today then return jsonb_build_object('ok',false,'reason','wrong_operating_day'); end if;
  if q.planned_at is null or q.planned_at>now() then return jsonb_build_object('ok',false,'reason','not_due'); end if;

  v_domain:=lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));
  if v_domain='prissteel.com' then
    return jsonb_build_object('ok',false,'reason','internal_pristeel_recipient');
  end if;

  v_guard:=public.pppp_outbound_source_guard_v1(q.id);
  if not coalesce((v_guard->>'ok')::boolean,false) then
    return jsonb_build_object(
      'ok',false,
      'reason',coalesce(v_guard->>'reason','source_invalid'),
      'source_guard',v_guard
    );
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
    return jsonb_build_object('ok',false,'reason','live_draft_not_fresh_or_recipient_mismatch');
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

  if exists(
    select 1 from public.pppp_outbound_queue_v1 h
    where h.id<>q.id
      and h.sent_at is not null
      and lower(h.recipient_email)=lower(q.recipient_email)
      and h.sent_at>=now()-make_interval(days=>p.recipient_cooldown_days)
      and not (h.source=q.source and h.source_record_id=q.source_record_id)
  ) then
    return jsonb_build_object('ok',false,'reason','recipient_cooldown_active');
  end if;

  if v_domain<>'' and exists(
    select 1 from public.pppp_outbound_queue_v1 h
    where h.id<>q.id
      and h.sent_at is not null
      and lower(coalesce(public.pppp_outbound_domain_v1(h.recipient_email,h.company_domain),''))=v_domain
      and h.sent_at>=now()-make_interval(days=>p.domain_cooldown_days)
      and not (h.source=q.source and h.source_record_id=q.source_record_id)
  ) then
    return jsonb_build_object('ok',false,'reason','domain_cooldown_active');
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
    and lower(coalesce(public.pppp_outbound_domain_v1(x.recipient_email,x.company_domain),''))=v_domain;
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
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_dispatch_internal_request()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  p public.pppp_outbound_policy_v1%rowtype;
  v_id uuid;
  v_local_time time;
begin
  select * into p from public.pppp_outbound_policy_v1 where id='global';
  if not found or not p.send_enabled or not p.human_send_required then return null; end if;

  v_local_time:=(now() at time zone p.timezone)::time;
  if v_local_time<p.day_start or v_local_time>=p.day_end then
    return null;
  end if;

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
    and coalesce((public.pppp_outbound_source_guard_v1(q.id)->>'ok')::boolean,false)
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
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_plan_day_v1(p_day date DEFAULT CURRENT_DATE, p_limit integer DEFAULT NULL::integer)
 RETURNS TABLE(queue_id uuid, planned_rank integer, planned_at timestamp with time zone, source text, touch_no smallint, company_name text, company_domain text, recipient_email text, recipient_name text, project_title text, relevance_score integer, priority_score integer, gmail_draft_id text, approved_for_send boolean, send_enabled boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_policy public.pppp_outbound_policy_v1%rowtype;
  v_limit integer;
  v_sent integer;
  v_reserved integer;
  v_remaining integer;
begin
  select * into v_policy from public.pppp_outbound_policy_v1 where id='global';
  if p_day < v_policy.starts_on then
    raise exception 'Outbound planning starts on %',v_policy.starts_on;
  end if;

  perform public.pppp_outbound_sync_v1();

  v_limit:=least(v_policy.daily_limit,greatest(1,coalesce(p_limit,v_policy.daily_limit)));
  select count(*) into v_sent
  from public.pppp_outbound_queue_v1 q
  where q.sent_at is not null
    and (q.sent_at at time zone v_policy.timezone)::date=p_day;

  select count(*) into v_reserved
  from public.pppp_outbound_queue_v1 q
  where q.planned_date=p_day and q.status='planned' and q.approved_for_send=true and q.sent_at is null;

  v_remaining:=greatest(0,v_limit-v_sent-v_reserved);

  update public.pppp_outbound_queue_v1 q
     set status='candidate',planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where q.planned_date=p_day and q.status='planned' and q.approved_for_send=false and q.sent_at is null;

  with ranked_recipient as (
    select q.id,
           row_number() over(
             partition by lower(q.recipient_email)
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           ) as rn_email
    from public.pppp_outbound_queue_v1 q
    where q.status='candidate'
      and q.suppression_reason is null
      and q.gmail_draft_id is not null
      and q.sent_at is null
      and q.replied_at is null
      and q.bounced_at is null
      and lower(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain)) <> 'prissteel.com'
      and exists (
        select 1
        from public.pppp_outbound_live_drafts_v1 d
        where d.draft_id=q.gmail_draft_id
          and lower(d.recipient_email)=lower(q.recipient_email)
          and d.captured_at>=now()-interval '4 hours'
      )
      and coalesce((public.pppp_outbound_source_guard_v1(q.id)->>'ok')::boolean,false)
  ),
  ranked_domain as (
    select q.id,
           row_number() over(
             partition by lower(coalesce(q.company_domain,public.pppp_outbound_domain_v1(q.recipient_email,null)))
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           ) as rn_domain
    from public.pppp_outbound_queue_v1 q
    join ranked_recipient e on e.id=q.id and e.rn_email=1
  ),
  chosen as (
    select q.id,
           row_number() over(
             order by q.priority_score desc,q.relevance_score desc,
                      case q.source when 'TED' then 1 else 2 end,
                      q.source_updated_at desc nulls last,q.id
           )::integer as rn
    from public.pppp_outbound_queue_v1 q
    join ranked_domain d on d.id=q.id and d.rn_domain<=v_policy.max_per_domain_per_day
    where not exists (
      select 1 from public.pppp_outbound_queue_v1 x
      where x.planned_date=p_day
        and x.id<>q.id
        and lower(coalesce(x.company_domain,''))=lower(coalesce(q.company_domain,''))
        and x.status in ('planned','sent')
    )
    limit v_remaining
  )
  update public.pppp_outbound_queue_v1 q
     set status='planned',
         planned_date=p_day,
         planned_rank=c.rn+v_sent+v_reserved,
         planned_at=((p_day::timestamp+v_policy.day_start)
                     + make_interval(mins=>v_policy.planned_gap_minutes*(c.rn+v_sent+v_reserved-1)))
                    at time zone v_policy.timezone,
         approved_for_send=false,
         updated_at=now()
    from chosen c
   where q.id=c.id;

  return query
  select q.id,q.planned_rank,q.planned_at,q.source,q.touch_no,q.company_name,q.company_domain,
         q.recipient_email,q.recipient_name,q.project_title,q.relevance_score,q.priority_score,
         q.gmail_draft_id,q.approved_for_send,v_policy.send_enabled
  from public.pppp_outbound_queue_v1 q
  where q.planned_date=p_day and q.status='planned'
  order by q.planned_rank,q.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_preflight_v1(p_day date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
with p as (
  select * from public.pppp_outbound_policy_v1 where id='global'
),
planned0 as (
  select q.*,
         lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),'')) as eff_domain,
         public.pppp_outbound_source_guard_v1(q.id) as source_guard
  from public.pppp_outbound_queue_v1 q
  where q.planned_date=p_day and q.status='planned'
),
planned as (
  select x.*,
         count(*) over(partition by lower(x.recipient_email)) as same_recipient,
         count(*) over(partition by x.eff_domain) as same_domain,
         exists(
           select 1 from public.pppp_outbound_live_drafts_v1 d
           where d.draft_id=x.gmail_draft_id
         ) as draft_exists,
         exists(
           select 1 from public.pppp_outbound_live_drafts_v1 d
           where d.draft_id=x.gmail_draft_id
             and d.captured_at>=now()-interval '4 hours'
         ) as draft_fresh,
         exists(
           select 1 from public.pppp_outbound_live_drafts_v1 d
           where d.draft_id=x.gmail_draft_id
             and d.captured_at>=now()-interval '4 hours'
             and lower(d.recipient_email)=lower(x.recipient_email)
         ) as draft_recipient_match,
         exists(
           select 1 from public.pppp_outbound_queue_v1 h, p
           where h.id<>x.id
             and h.sent_at is not null
             and lower(h.recipient_email)=lower(x.recipient_email)
             and h.sent_at>=now()-make_interval(days=>p.recipient_cooldown_days)
             and not (h.source=x.source and h.source_record_id=x.source_record_id)
         ) as recipient_cooldown_conflict,
         exists(
           select 1 from public.pppp_outbound_queue_v1 h, p
           where h.id<>x.id
             and h.sent_at is not null
             and lower(coalesce(public.pppp_outbound_domain_v1(h.recipient_email,h.company_domain),''))=x.eff_domain
             and h.sent_at>=now()-make_interval(days=>p.domain_cooldown_days)
             and not (h.source=x.source and h.source_record_id=x.source_record_id)
         ) as domain_cooldown_conflict
  from planned0 x
),
stats as (
  select
    count(*) as planned_count,
    count(*) filter(where draft_exists) as live_draft_count,
    count(*) filter(where draft_fresh) as fresh_draft_count,
    count(*) filter(where not draft_exists) as missing_draft_count,
    count(*) filter(where draft_exists and not draft_fresh) as stale_draft_count,
    count(*) filter(where draft_fresh and not draft_recipient_match) as recipient_mismatch_count,
    count(*) filter(where not coalesce((source_guard->>'ok')::boolean,false)) as source_invalid_count,
    count(*) filter(where source_guard->>'reason' in (
      'gc_no_more_auto','gc_human_review_or_history','gc_duplicate_history_review',
      'cross_source_conflict_requires_review','gc_first_touch_not_explicit_ready',
      'gc_followup_not_explicit_ready'
    )) as human_review_block_count,
    count(*) filter(where replied_at is not null) as replied_count,
    count(*) filter(where bounced_at is not null) as bounced_count,
    count(*) filter(where suppression_reason is not null) as suppressed_count,
    count(*) filter(where lower(coalesce(eff_domain,''))='prissteel.com') as internal_recipient_count,
    count(*) filter(where recipient_cooldown_conflict) as recipient_cooldown_blocked,
    count(*) filter(where domain_cooldown_conflict) as domain_cooldown_blocked,
    count(*) filter(where approved_for_send) as approved_count,
    count(*) filter(
      where draft_recipient_match
        and coalesce((source_guard->>'ok')::boolean,false)
        and replied_at is null
        and bounced_at is null
        and suppression_reason is null
        and lower(coalesce(eff_domain,''))<>'prissteel.com'
        and not recipient_cooldown_conflict
        and not domain_cooldown_conflict
        and same_recipient=1
        and same_domain=1
    ) as guard_eligible_count,
    count(*) filter(
      where approved_for_send
        and draft_recipient_match
        and coalesce((source_guard->>'ok')::boolean,false)
        and replied_at is null
        and bounced_at is null
        and suppression_reason is null
        and lower(coalesce(eff_domain,''))<>'prissteel.com'
        and not recipient_cooldown_conflict
        and not domain_cooldown_conflict
        and same_recipient=1
        and same_domain=1
        and planned_at is not null
        and planned_at<=now()
    ) as approved_due_guard_eligible_count
  from planned
),
day_sent as (
  select count(*)::integer as sent_today
  from public.pppp_outbound_queue_v1 q,p
  where q.sent_at is not null
    and (q.sent_at at time zone p.timezone)::date=p_day
),
dups as (
  select
    (select count(*) from (
      select lower(recipient_email) e from planned group by lower(recipient_email) having count(*)>1
    ) r) as duplicate_recipient_count,
    (select count(*) from (
      select eff_domain d from planned where eff_domain<>'' group by eff_domain having count(*)>1
    ) d) as duplicate_domain_count
),
ctx as (
  select p.*,
         (now() at time zone p.timezone)::date as local_day,
         (now() at time zone p.timezone)::time as local_time
  from p
)
select jsonb_build_object(
  'day',p_day,
  'policy',(select to_jsonb(p) from p),
  'planned_count',(select planned_count from stats),
  'canonical_count',(select planned_count-source_invalid_count from stats),
  'live_draft_count',(select live_draft_count from stats),
  'fresh_draft_count',(select fresh_draft_count from stats),
  'missing_draft_count',(select missing_draft_count from stats),
  'stale_draft_count',(select stale_draft_count from stats),
  'recipient_mismatch_count',(select recipient_mismatch_count from stats),
  'source_invalid_count',(select source_invalid_count from stats),
  'human_review_block_count',(select human_review_block_count from stats),
  'replied_count',(select replied_count from stats),
  'bounced_count',(select bounced_count from stats),
  'suppressed_count',(select suppressed_count from stats),
  'internal_recipient_count',(select internal_recipient_count from stats),
  'recipient_cooldown_blocked',(select recipient_cooldown_blocked from stats),
  'domain_cooldown_blocked',(select domain_cooldown_blocked from stats),
  'duplicate_recipient_count',(select duplicate_recipient_count from dups),
  'duplicate_domain_count',(select duplicate_domain_count from dups),
  'approved_count',(select approved_count from stats),
  'guard_eligible_count',(select guard_eligible_count from stats),
  'sent_today',(select sent_today from day_sent),
  'daily_cap_remaining',greatest(0,(select daily_limit from p)-(select sent_today from day_sent)),
  'daily_cap_ok',((select planned_count from stats)+(select sent_today from day_sent)) <= (select daily_limit from p),
  'send_window_open',(
    select local_day=p_day and local_time>=day_start and local_time<day_end from ctx
  ),
  'outside_window_guard_active',true,
  'ready_to_dispatch_count',case
    when (select send_enabled from p)
     and (select human_send_required from p)
     and ((select planned_count from stats)+(select sent_today from day_sent)) <= (select daily_limit from p)
     and (select local_day=p_day and local_time>=day_start and local_time<day_end from ctx)
    then (select approved_due_guard_eligible_count from stats)
    else 0
  end,
  'send_enabled',(select send_enabled from p),
  'human_send_required',(select human_send_required from p),
  'auto_send',false
);
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_reconcile_live_drafts_v1(p_drafts jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_seen integer:=0;
  v_stale integer:=0;
  v_manual integer:=0;
  v_live integer:=0;
begin
  if p_drafts is null or jsonb_typeof(p_drafts)<>'array' then
    raise exception 'p_drafts must be a JSON array';
  end if;

  perform public.pppp_outbound_sync_v1();

  delete from public.pppp_outbound_live_drafts_v1
  where draft_id is not null;

  insert into public.pppp_outbound_live_drafts_v1(
    draft_id,gmail_message_id,gmail_thread_id,recipient_email,subject,captured_at
  )
  select distinct on (x.draft_id)
    x.draft_id,x.gmail_message_id,x.gmail_thread_id,lower(x.recipient_email),x.subject,now()
  from (
    select
      nullif(trim(v->>'draft_id'),'') draft_id,
      nullif(trim(v->>'message_id'),'') gmail_message_id,
      nullif(trim(v->>'thread_id'),'') gmail_thread_id,
      nullif(trim(v->>'recipient_email'),'') recipient_email,
      nullif(trim(v->>'subject'),'') subject
    from jsonb_array_elements(p_drafts) v
  ) x
  where x.draft_id is not null
    and x.recipient_email is not null
    and x.recipient_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  order by x.draft_id;
  get diagnostics v_seen=row_count;

  update public.pppp_outbound_queue_v1 q
     set gmail_draft_message_id=coalesce(d.gmail_message_id,q.gmail_draft_message_id),
         gmail_thread_id=coalesce(d.gmail_thread_id,q.gmail_thread_id),
         recipient_email=d.recipient_email,
         company_domain=public.pppp_outbound_domain_v1(d.recipient_email,q.company_domain),
         status=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then 'candidate'
           else q.status end,
         suppression_reason=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.suppression_reason end,
         planned_date=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_date end,
         planned_at=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_at end,
         planned_rank=case
           when q.status='stale' and q.suppression_reason='gmail_draft_missing' then null
           else q.planned_rank end,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object('gmail_live_verified_at',now()),
         updated_at=now()
    from public.pppp_outbound_live_drafts_v1 d
   where q.gmail_draft_id=d.draft_id
     and q.sent_at is null;

  update public.pppp_outbound_queue_v1 q
     set status='stale',
         suppression_reason='gmail_draft_missing',
         planned_date=null,planned_at=null,planned_rank=null,
         approved_for_send=false,
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object('gmail_missing_checked_at',now()),
         updated_at=now()
   where q.sent_at is null
     and q.gmail_draft_id is not null
     and q.status in ('candidate','planned','suppressed')
     and not exists (
       select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id
     );
  get diagnostics v_stale=row_count;

  insert into public.pppp_outbound_queue_v1(
    source,source_record_id,source_key,touch_no,project_key,project_title,company_name,company_domain,
    recipient_email,recipient_name,contact_role,relevance_score,priority_score,gmail_draft_id,
    gmail_draft_message_id,gmail_thread_id,status,suppression_reason,approved_for_send,human_send_required,
    source_updated_at,payload,updated_at
  )
  select
    'TED',null,'GMAIL:'||d.draft_id,1,'GMAIL:'||d.draft_id,d.subject,
    coalesce((
      select q2.company_name
      from public.pppp_outbound_queue_v1 q2
      where q2.source='TED'
        and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
        and nullif(q2.company_name,'') is not null
      order by q2.relevance_score desc,q2.updated_at desc
      limit 1
    ),public.pppp_outbound_domain_v1(d.recipient_email,null)),
    public.pppp_outbound_domain_v1(d.recipient_email,null),
    d.recipient_email,null,'live_gmail_outreach_draft',
    case when exists(
      select 1 from public.pppp_outbound_queue_v1 q2
      where q2.source='TED' and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
    ) then 90 else 80 end,
    public.pppp_outbound_priority_v1(
      d.recipient_email,null,'live_gmail_outreach_draft',
      case when exists(
        select 1 from public.pppp_outbound_queue_v1 q2
        where q2.source='TED' and q2.company_domain=public.pppp_outbound_domain_v1(d.recipient_email,null)
      ) then 90 else 80 end
    ),
    d.draft_id,d.gmail_message_id,d.gmail_thread_id,'stale','gmail_live_unresolved_noncanonical',false,true,now(),
    jsonb_build_object('manual_live_draft',true,'gmail_live_verified_at',now(),'subject',d.subject),
    now()
  from public.pppp_outbound_live_drafts_v1 d
  where not exists (
      select 1 from public.pppp_outbound_queue_v1 q where q.gmail_draft_id=d.draft_id
    )
    and not exists (
      select 1 from public.pppp_gc_prospects_v1 p
      where p.first_draft_id=d.draft_id or p.second_draft_id=d.draft_id
    )
    and coalesce(d.subject,'') ilike '%PRISTEEL%'
    and lower(public.pppp_outbound_domain_v1(d.recipient_email,null)) <> 'prissteel.com'
  on conflict (source_key) do update set
    gmail_draft_message_id=excluded.gmail_draft_message_id,
    gmail_thread_id=excluded.gmail_thread_id,
    recipient_email=excluded.recipient_email,
    company_domain=excluded.company_domain,
    project_title=excluded.project_title,
    status=case
      when public.pppp_outbound_queue_v1.sent_at is not null then public.pppp_outbound_queue_v1.status
      else 'stale'
    end,
    suppression_reason=case
      when public.pppp_outbound_queue_v1.sent_at is not null then public.pppp_outbound_queue_v1.suppression_reason
      else 'gmail_live_unresolved_noncanonical'
    end,
    source_updated_at=now(),
    payload=excluded.payload,
    updated_at=now();
  get diagnostics v_manual=row_count;

  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='internal_pristeel_recipient',planned_date=null,planned_at=null,
         planned_rank=null,approved_for_send=false,updated_at=now()
   where q.sent_at is null
     and lower(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain))='prissteel.com';

  select count(*) into v_live from public.pppp_outbound_queue_v1 q
  where q.sent_at is null
    and q.status in ('candidate','planned')
    and exists(select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id);

  return jsonb_build_object(
    'ok',true,
    'gmail_drafts_seen',v_seen,
    'queue_rows_marked_stale',v_stale,
    'manual_live_drafts_registered',v_manual,
    'live_send_ready_rows',v_live,
    'human_send_required',true,
    'auto_send',false
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_source_guard_v1(p_queue_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  q public.pppp_outbound_queue_v1%rowtype;
  r public.pppp_opportunity_outreach_registry_v1%rowtype;
  g public.pppp_gc_prospects_v1%rowtype;
  v_domain text;
begin
  select * into q from public.pppp_outbound_queue_v1 where id=p_queue_id;
  if not found then
    return jsonb_build_object('ok',false,'reason','queue_row_missing');
  end if;

  v_domain:=lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),''));

  if q.source='TED' then
    if q.source_record_id is null or q.source_key is distinct from ('TED:'||q.source_record_id::text) then
      return jsonb_build_object('ok',false,'reason','ted_noncanonical_identity');
    end if;

    select * into r
    from public.pppp_opportunity_outreach_registry_v1
    where id=q.source_record_id;

    if not found then
      return jsonb_build_object('ok',false,'reason','ted_registry_missing');
    end if;
    if r.status<>'draft_created' then
      return jsonb_build_object('ok',false,'reason','ted_not_active_candidate','source_status',r.status);
    end if;
    if r.sent_at is not null then
      return jsonb_build_object('ok',false,'reason','ted_already_sent');
    end if;
    if r.gmail_draft_id is distinct from q.gmail_draft_id then
      return jsonb_build_object('ok',false,'reason','ted_draft_identity_mismatch');
    end if;
    if lower(coalesce(r.recipient_email,'')) is distinct from lower(coalesce(q.recipient_email,'')) then
      return jsonb_build_object('ok',false,'reason','ted_recipient_identity_mismatch');
    end if;

    return jsonb_build_object('ok',true,'reason','canonical_ted_candidate');
  end if;

  if q.source='GC' then
    if q.source_record_id is null then
      return jsonb_build_object('ok',false,'reason','gc_source_identity_missing');
    end if;

    select * into g
    from public.pppp_gc_prospects_v1
    where id=q.source_record_id;

    if not found then
      return jsonb_build_object('ok',false,'reason','gc_source_missing');
    end if;

    if coalesce(g.do_not_contact,false) or g.status='do_not_contact' then
      return jsonb_build_object('ok',false,'reason','gc_do_not_contact');
    end if;
    if g.bounced_at is not null or g.status='bounced' then
      return jsonb_build_object('ok',false,'reason','gc_bounced');
    end if;
    if g.replied_at is not null or g.status='replied' then
      return jsonb_build_object('ok',false,'reason','gc_replied');
    end if;
    if coalesce(g.no_more_auto,false) then
      return jsonb_build_object('ok',false,'reason','gc_no_more_auto');
    end if;
    if g.status in ('already_contacted','human_review') then
      return jsonb_build_object('ok',false,'reason','gc_human_review_or_history');
    end if;
    if nullif(trim(coalesce(g.duplicate_reason,'')),'') is not null then
      return jsonb_build_object('ok',false,'reason','gc_duplicate_history_review');
    end if;

    if exists(
      select 1
      from public.pppp_opportunity_outreach_registry_v1 tr
      where tr.status='draft_created'
        and tr.sent_at is null
        and (
          lower(coalesce(tr.recipient_email,''))=lower(coalesce(q.recipient_email,''))
          or (
            v_domain<>''
            and lower(coalesce(public.pppp_outbound_domain_v1(tr.recipient_email,null),''))=v_domain
          )
        )
    ) then
      return jsonb_build_object('ok',false,'reason','cross_source_conflict_requires_review');
    end if;

    if q.touch_no=1 then
      if g.status<>'draft_ready' then
        return jsonb_build_object('ok',false,'reason','gc_first_touch_not_explicit_ready','source_status',g.status);
      end if;
      if g.first_sent_at is not null then
        return jsonb_build_object('ok',false,'reason','gc_first_touch_already_sent');
      end if;
      if g.first_draft_id is distinct from q.gmail_draft_id then
        return jsonb_build_object('ok',false,'reason','gc_first_touch_draft_mismatch');
      end if;
      return jsonb_build_object('ok',true,'reason','gc_first_touch_explicit_ready');
    elsif q.touch_no=2 then
      if g.status<>'draft_2_ready' then
        return jsonb_build_object('ok',false,'reason','gc_followup_not_explicit_ready','source_status',g.status);
      end if;
      if g.first_sent_at is null then
        return jsonb_build_object('ok',false,'reason','gc_followup_missing_first_send');
      end if;
      if g.second_sent_at is not null then
        return jsonb_build_object('ok',false,'reason','gc_followup_already_sent');
      end if;
      if g.second_draft_id is distinct from q.gmail_draft_id then
        return jsonb_build_object('ok',false,'reason','gc_followup_draft_mismatch');
      end if;
      return jsonb_build_object('ok',true,'reason','gc_followup_explicit_ready');
    end if;

    return jsonb_build_object('ok',false,'reason','gc_touch_not_supported');
  end if;

  return jsonb_build_object('ok',false,'reason','unsupported_source');
end;
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_sync_internal_request()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net', 'vault', 'pg_temp'
AS $function$
declare
  v_local timestamp;
  v_hour integer;
  v_minute integer;
  v_isodow integer;
begin
  v_local := now() at time zone 'Europe/Belgrade';
  v_hour := extract(hour from v_local)::integer;
  v_minute := extract(minute from v_local)::integer;
  v_isodow := extract(isodow from v_local)::integer;

  if v_isodow not between 1 and 5
     or v_minute <> 30
     or v_hour not in (7,11,15,18) then
    return null;
  end if;

  if exists (
    select 1
    from public.pppp_automation_http_runs r
    where r.automation_key = 'pppp-outbound-sync'
      and r.queued_at >= now() - interval '20 minutes'
  ) then
    return null;
  end if;

  return public.pppp_enqueue_automation_http_v1(
    'pppp-outbound-sync',
    'https://awqfpnzqwfjrjefoktgd.supabase.co/functions/v1/pppp-outbound-sync',
    'gmail_tracker_cron_secret',
    180000,
    1
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.pppp_outbound_sync_v1()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_ted integer:=0;
  v_gc1 integer:=0;
  v_gc2 integer:=0;
  v_suppressed integer:=0;
  v_policy public.pppp_outbound_policy_v1%rowtype;
begin
  select * into v_policy from public.pppp_outbound_policy_v1 where id='global';

  insert into public.pppp_outbound_queue_v1(
    source,source_record_id,source_key,touch_no,tender_watch_id,project_key,project_title,
    company_name,company_domain,recipient_email,recipient_name,contact_role,relevance_score,priority_score,
    gmail_draft_id,gmail_draft_message_id,gmail_thread_id,status,suppression_reason,human_send_required,
    sent_at,source_updated_at,payload,updated_at
  )
  select
    'TED',r.id,'TED:'||r.id::text,1,r.tender_watch_id,
    coalesce(r.tender_watch_id::text,r.action_key),
    t.title,
    a.target_company,
    public.pppp_outbound_domain_v1(r.recipient_email,null),
    lower(r.recipient_email),
    r.recipient_name,
    coalesce(r.payload->>'recipient_purpose',a.route,a.action_type),
    greatest(0,least(100,coalesce(a.relevance_score,0))),
    public.pppp_outbound_priority_v1(r.recipient_email,r.recipient_name,coalesce(r.payload->>'recipient_purpose',a.route,a.action_type),coalesce(a.relevance_score,0)),
    r.gmail_draft_id,r.gmail_draft_message_id,r.gmail_thread_id,
    case when r.status='sent' then 'sent' else 'candidate' end,
    null,true,r.sent_at,r.updated_at,
    jsonb_build_object('action_id',r.action_id,'action_key',r.action_key,'route',a.route,'generator',r.generator),
    now()
  from public.pppp_opportunity_outreach_registry_v1 r
  join public.pppp_opportunity_action_queue_v2 a on a.id=r.action_id
  left join public.kek_tender_watch t on t.id=r.tender_watch_id
  where r.status in ('draft_created','sent')
  on conflict (source_key) do update set
    tender_watch_id=excluded.tender_watch_id,
    project_key=excluded.project_key,
    project_title=excluded.project_title,
    company_name=excluded.company_name,
    company_domain=excluded.company_domain,
    recipient_email=excluded.recipient_email,
    recipient_name=excluded.recipient_name,
    contact_role=excluded.contact_role,
    relevance_score=excluded.relevance_score,
    priority_score=excluded.priority_score,
    gmail_draft_id=excluded.gmail_draft_id,
    gmail_draft_message_id=excluded.gmail_draft_message_id,
    gmail_thread_id=excluded.gmail_thread_id,
    status=case
                when excluded.status='sent' then 'sent'
                when public.pppp_outbound_queue_v1.status in ('sent','replied','bounced','do_not_contact') then public.pppp_outbound_queue_v1.status
                when public.pppp_outbound_queue_v1.status='stale'
                 and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
                 and public.pppp_outbound_queue_v1.sent_at is null then 'stale'
                else 'candidate' end,
    suppression_reason=case
                when excluded.status='sent' then null
                when public.pppp_outbound_queue_v1.status='stale'
                 and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
                 and public.pppp_outbound_queue_v1.sent_at is null then 'gmail_draft_missing'
                else null end,
    sent_at=coalesce(excluded.sent_at,public.pppp_outbound_queue_v1.sent_at),
    source_updated_at=excluded.source_updated_at,
    payload=excluded.payload,
    updated_at=now();
  get diagnostics v_ted=row_count;

  insert into public.pppp_outbound_queue_v1(
    source,source_record_id,source_key,touch_no,project_key,project_title,company_name,company_domain,
    recipient_email,recipient_name,contact_role,relevance_score,priority_score,gmail_draft_id,
    gmail_draft_message_id,gmail_thread_id,status,suppression_reason,human_send_required,sent_at,replied_at,bounced_at,
    source_updated_at,payload,updated_at
  )
  select
    'GC',p.id,'GC:'||p.id::text||':1',1,p.id::text,
    nullif(p.current_projects->0->>'name',''),p.company_name,
    public.pppp_outbound_domain_v1(p.contact_email,p.company_domain),
    lower(p.contact_email),p.contact_name,p.contact_role,
    greatest(0,least(100,p.relevance_score)),
    public.pppp_outbound_priority_v1(p.contact_email,p.contact_name,p.contact_role,p.relevance_score),
    p.first_draft_id,p.first_gmail_message_id,p.first_gmail_thread_id,
    case
      when p.do_not_contact or p.status='do_not_contact' then 'do_not_contact'
      when p.bounced_at is not null or p.status='bounced' then 'bounced'
      when p.replied_at is not null or p.status='replied' then 'replied'
      when p.first_sent_at is not null then 'sent'
      else 'candidate'
    end,
    null,true,p.first_sent_at,p.replied_at,p.bounced_at,p.updated_at,
    jsonb_build_object('prospect_status',p.status,'discovery_source',p.discovery_source,'country',p.country,'company_type',p.company_type),
    now()
  from public.pppp_gc_prospects_v1 p
  where p.contact_email is not null
    and (p.first_draft_id is not null or p.first_sent_at is not null)
  on conflict (source_key) do update set
    project_title=excluded.project_title,company_name=excluded.company_name,company_domain=excluded.company_domain,
    recipient_email=excluded.recipient_email,recipient_name=excluded.recipient_name,contact_role=excluded.contact_role,
    relevance_score=excluded.relevance_score,priority_score=excluded.priority_score,gmail_draft_id=excluded.gmail_draft_id,
    gmail_draft_message_id=excluded.gmail_draft_message_id,gmail_thread_id=excluded.gmail_thread_id,
    status=case
      when excluded.status in ('sent','replied','bounced','do_not_contact') then excluded.status
      when public.pppp_outbound_queue_v1.status='stale'
       and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
       and public.pppp_outbound_queue_v1.sent_at is null then 'stale'
      else excluded.status end,
    suppression_reason=case
      when excluded.status in ('sent','replied','bounced','do_not_contact') then null
      when public.pppp_outbound_queue_v1.status='stale'
       and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
       and public.pppp_outbound_queue_v1.sent_at is null then 'gmail_draft_missing'
      else null end,
    sent_at=excluded.sent_at,replied_at=excluded.replied_at,bounced_at=excluded.bounced_at,
    source_updated_at=excluded.source_updated_at,payload=excluded.payload,updated_at=now();
  get diagnostics v_gc1=row_count;

  insert into public.pppp_outbound_queue_v1(
    source,source_record_id,source_key,touch_no,project_key,project_title,company_name,company_domain,
    recipient_email,recipient_name,contact_role,relevance_score,priority_score,gmail_draft_id,
    gmail_draft_message_id,gmail_thread_id,status,suppression_reason,human_send_required,sent_at,replied_at,bounced_at,
    source_updated_at,payload,updated_at
  )
  select
    'GC',p.id,'GC:'||p.id::text||':2',2,p.id::text,
    nullif(p.current_projects->0->>'name',''),p.company_name,
    public.pppp_outbound_domain_v1(p.contact_email,p.company_domain),
    lower(p.contact_email),p.contact_name,p.contact_role,
    greatest(0,least(100,p.relevance_score)),
    public.pppp_outbound_priority_v1(p.contact_email,p.contact_name,p.contact_role,p.relevance_score)+40,
    p.second_draft_id,p.second_gmail_message_id,p.first_gmail_thread_id,
    case
      when p.do_not_contact or p.status='do_not_contact' then 'do_not_contact'
      when p.bounced_at is not null or p.status='bounced' then 'bounced'
      when p.replied_at is not null or p.status='replied' then 'replied'
      when p.second_sent_at is not null then 'sent'
      else 'candidate'
    end,
    null,true,p.second_sent_at,p.replied_at,p.bounced_at,p.updated_at,
    jsonb_build_object('prospect_status',p.status,'discovery_source',p.discovery_source,'country',p.country,'company_type',p.company_type,'followup',true),
    now()
  from public.pppp_gc_prospects_v1 p
  where p.contact_email is not null
    and (p.second_draft_id is not null or p.second_sent_at is not null)
  on conflict (source_key) do update set
    project_title=excluded.project_title,company_name=excluded.company_name,company_domain=excluded.company_domain,
    recipient_email=excluded.recipient_email,recipient_name=excluded.recipient_name,contact_role=excluded.contact_role,
    relevance_score=excluded.relevance_score,priority_score=excluded.priority_score,gmail_draft_id=excluded.gmail_draft_id,
    gmail_draft_message_id=excluded.gmail_draft_message_id,gmail_thread_id=excluded.gmail_thread_id,
    status=case
      when excluded.status in ('sent','replied','bounced','do_not_contact') then excluded.status
      when public.pppp_outbound_queue_v1.status='stale'
       and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
       and public.pppp_outbound_queue_v1.sent_at is null then 'stale'
      else excluded.status end,
    suppression_reason=case
      when excluded.status in ('sent','replied','bounced','do_not_contact') then null
      when public.pppp_outbound_queue_v1.status='stale'
       and public.pppp_outbound_queue_v1.suppression_reason='gmail_draft_missing'
       and public.pppp_outbound_queue_v1.sent_at is null then 'gmail_draft_missing'
      else null end,
    sent_at=excluded.sent_at,replied_at=excluded.replied_at,bounced_at=excluded.bounced_at,
    source_updated_at=excluded.source_updated_at,payload=excluded.payload,updated_at=now();
  get diagnostics v_gc2=row_count;

  -- Retire queue rows whose canonical source is no longer send-ready.
  update public.pppp_outbound_queue_v1 q
     set status='stale',suppression_reason='canonical_source_not_send_ready',planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where q.source='TED' and q.source_record_id is not null and q.sent_at is null
     and not exists (
       select 1 from public.pppp_opportunity_outreach_registry_v1 r
       where r.id=q.source_record_id and r.status in ('draft_created','sent')
     );

  update public.pppp_outbound_queue_v1 q
     set status='stale',suppression_reason='canonical_source_not_send_ready',planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where q.source='GC' and q.source_record_id is not null and q.sent_at is null
     and not exists (
       select 1 from public.pppp_gc_prospects_v1 p
       where p.id=q.source_record_id
         and (
           (q.touch_no=1 and (p.first_draft_id is not null or p.first_sent_at is not null))
           or
           (q.touch_no=2 and (p.second_draft_id is not null or p.second_sent_at is not null))
         )
     );

  -- Re-evaluate only unsent/unapproved rows. Human-approved rows are never silently changed.
  update public.pppp_outbound_queue_v1 q
     set status='candidate',suppression_reason=null,planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where q.status in ('candidate','planned','suppressed')
     and q.sent_at is null
     and q.approved_for_send=false;

  -- Invalid / unsafe recipient classes.
  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='unsafe_or_invalid_recipient',updated_at=now()
   where q.status='candidate'
     and (
       q.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       or lower(coalesce(q.company_domain,'')) in (
         'gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','aol.com',
         'lursoft.lv','implisense.com','forbes.pl','aleo.com','example.com','example.org','example.net'
       )
       or lower(split_part(q.recipient_email,'@',1)) in (
         'investorrelations','investor.relations','personalni','nabor','werken','imie.nazwisko','bieterportal-alt',
         'recruiting','jobs','careers','career','hr','humanresources','privacy','gdpr','webmaster','press','presse',
         'media','newsletter','noreply','no-reply','donotreply','dpo','security','abuse'
       )
       or lower(split_part(q.recipient_email,'@',1)) like 'u003e%'
     );

  -- Exact recipient hard suppression after bounce / explicit do-not-contact from the shared outreach history.
  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='recipient_blocked_by_outreach_history',updated_at=now()
   where q.status='candidate'
     and exists (
       select 1 from public.outreach_contacts o
       where lower(coalesce(o.contact_email,''))=lower(q.recipient_email)
         and (coalesce(o.bounced,false) or lower(coalesce(o.status,'')) like '%do not contact%')
     );

  -- A company reply means cold outreach pauses for that domain until a human decides what to do next.
  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='company_reply_requires_human_followup',updated_at=now()
   where q.status='candidate'
     and q.company_domain is not null
     and exists (
       select 1 from public.outreach_contacts o
       where lower(coalesce(o.company_domain,''))=lower(q.company_domain)
         and coalesce(o.replied,false)
     );

  -- Shared cooldown: TED and GC cannot independently cold-contact the same recipient/company.
  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='recipient_cooldown_'||v_policy.recipient_cooldown_days::text||'d',updated_at=now()
   where q.status='candidate'
     and exists (
       select 1 from public.pppp_outbound_queue_v1 h
       where h.id<>q.id and h.sent_at is not null
         and lower(h.recipient_email)=lower(q.recipient_email)
         and h.sent_at >= now() - make_interval(days=>v_policy.recipient_cooldown_days)
         and not (h.source=q.source and h.source_record_id=q.source_record_id)
     );

  update public.pppp_outbound_queue_v1 q
     set status='suppressed',suppression_reason='domain_cooldown_'||v_policy.domain_cooldown_days::text||'d',updated_at=now()
   where q.status='candidate'
     and q.company_domain is not null
     and exists (
       select 1 from public.pppp_outbound_queue_v1 h
       where h.id<>q.id and h.sent_at is not null and h.company_domain is not null
         and lower(h.company_domain)=lower(q.company_domain)
         and h.sent_at >= now() - make_interval(days=>v_policy.domain_cooldown_days)
         and not (h.source=q.source and h.source_record_id=q.source_record_id)
     );

  -- Shared-boundary canonical GC safety: never revive historical/review-only GC rows.
  update public.pppp_outbound_queue_v1 q
     set status='stale',
         suppression_reason=case
           when p.status='already_contacted' then 'historical_already_contacted'
           else 'canonical_gc_not_sendable'
         end,
         planned_date=null,planned_at=null,planned_rank=null,
         approved_for_send=false,
         dispatch_claim_token=null,dispatch_claimed_at=null,
         updated_at=now()
    from public.pppp_gc_prospects_v1 p
   where q.source='GC'
     and q.source_record_id=p.id
     and q.sent_at is null
     and (
       coalesce(p.no_more_auto,false)
       or p.status in ('already_contacted','human_review','bounced','replied','do_not_contact')
     );

  select count(*) into v_suppressed from public.pppp_outbound_queue_v1 where status='suppressed';

  return jsonb_build_object(
    'ok',true,'ted_upserted',v_ted,'gc_touch1_upserted',v_gc1,'gc_touch2_upserted',v_gc2,
    'suppressed_total',v_suppressed,'send_enabled',v_policy.send_enabled,
    'human_send_required',true,'daily_limit',v_policy.daily_limit
  );
end;
$function$;

-- Canonical ACLs: write/execution boundaries are service-role only.
revoke all on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) from public,anon,authenticated;
revoke all on function public.pppp_outbound_plan_day_v1(date,integer) from public,anon,authenticated;
revoke all on function public.pppp_outbound_claim_for_dispatch_v1(uuid,uuid) from public,anon,authenticated;
revoke all on function public.pppp_outbound_dispatch_internal_request() from public,anon,authenticated;
revoke all on function public.pppp_outbound_sync_internal_request() from public,anon,authenticated;
grant execute on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) to service_role;
grant execute on function public.pppp_outbound_plan_day_v1(date,integer) to service_role;
grant execute on function public.pppp_outbound_claim_for_dispatch_v1(uuid,uuid) to service_role;
grant execute on function public.pppp_outbound_dispatch_internal_request() to service_role;
grant execute on function public.pppp_outbound_sync_internal_request() to service_role;

-- Preserve read-only preflight access while keeping mutation boundaries private.
revoke all on function public.pppp_outbound_preflight_v1(date) from public,anon;
grant execute on function public.pppp_outbound_preflight_v1(date) to authenticated,service_role;
grant execute on function public.pppp_outbound_source_guard_v1(uuid) to authenticated,service_role;

-- Exactly one shared sync scheduler and one shared dispatcher scheduler.
do $scheduler$
declare j record;
begin
  for j in select jobid from cron.job where jobname='pppp-outbound-sync-server-4x' loop
    perform cron.unschedule(j.jobid);
  end loop;
  perform cron.schedule(
    'pppp-outbound-sync-server-4x',
    '30 5,6,9,10,13,14,16,17 * * 1-5',
    'select public.pppp_outbound_sync_internal_request();'
  );
  for j in select jobid from cron.job where jobname='pppp-outbound-dispatch-shared-10m' loop
    perform cron.unschedule(j.jobid);
  end loop;
  perform cron.schedule(
    'pppp-outbound-dispatch-shared-10m',
    '*/10 * * * *',
    'select public.pppp_outbound_dispatch_internal_request();'
  );
end;
$scheduler$;

commit;
