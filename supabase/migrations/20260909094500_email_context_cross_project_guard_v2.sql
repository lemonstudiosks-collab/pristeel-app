-- Prevent a shared supplier correspondent from seeding the wrong project thread.
-- Also remove the verified Kropp -> EVOSYS ANF-9203 contamination and close
-- ANF-9203 after the client's explicit rejection, as approved by the operator.

create or replace function public.pppp_reconcile_email_context_v1(p_days integer default 7)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_thread integer := 0;
  v_rfq integer := 0;
  v_review integer := 0;
  v_days integer := greatest(1,least(coalesce(p_days,7),30));
begin
  -- Thread propagation may only start from a stable/non-inferred anchor.
  -- An RFQ-correspondent guess is deliberately not allowed to seed a thread.
  with thread_map as (
    select gmail_thread_id, min(project_id::text)::uuid as project_id
    from public.project_emails
    where project_id is not null
      and gmail_thread_id is not null
      and gmail_thread_id <> ''
      and coalesce(match_method,'') not in (
        'server-context-thread-v1',
        'server-context-rfq-v1',
        'server-context-rfq-review-v1',
        'server-context-cross-project-review-v2'
      )
    group by gmail_thread_id
    having count(distinct project_id)=1
  ), upd as (
    update public.project_emails e
       set project_id=t.project_id,
           suggested_project_id=t.project_id,
           match_method='server-context-thread-v1',
           match_confidence=100,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from thread_map t
     where e.project_id is null
       and e.sent_at >= now() - make_interval(days=>v_days)
       and e.gmail_thread_id=t.gmail_thread_id
    returning e.gmail_message_id,e.gmail_thread_id,e.project_id
  )
  select count(*) into v_thread from upd;

  insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at)
  select e.project_id,e.gmail_message_id,e.gmail_thread_id,e.match_method,e.match_confidence,now()
  from public.project_emails e
  where e.project_id is not null
    and e.sent_at >= now()-make_interval(days=>v_days)
    and e.match_method='server-context-thread-v1'
  on conflict (gmail_message_id,project_id) do nothing;

  -- Supplier/correspondent fallback is safe only when that correspondent has
  -- exactly one active project RFQ in the lookback window. Shared suppliers
  -- must be held for review instead of using "latest RFQ wins".
  with recent_rfq as (
    select public.pppp_email_key_v1(r.supplier_email) email_key,
           r.project_id,
           max(coalesce(r.sent_at,r.created_at)) last_rfq
    from public.rfq_log r
    join public.projects p on p.id=r.project_id
    where coalesce(r.supplier_email,'')<>''
      and coalesce(r.sent_at,r.created_at) >= now()-interval '30 days'
      and lower(coalesce(r.status,'')) not in ('superseded','draft_review','lost','cancelled','canceled')
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closedlost','cancelled','canceled','archived','lost')
    group by 1,2
  ), counts as (
    select email_key,
           count(distinct project_id) as project_count
    from recent_rfq
    where email_key<>''
    group by email_key
  ), winner as (
    select r.email_key,
           min(r.project_id::text)::uuid as project_id,
           max(r.last_rfq) as last_rfq
    from recent_rfq r
    join counts c using (email_key)
    where c.project_count=1
    group by r.email_key
  ), upd as (
    update public.project_emails e
       set project_id=w.project_id,
           suggested_project_id=w.project_id,
           match_method='server-context-rfq-v1',
           match_confidence=96,
           needs_review=false,
           review_reason=null,
           updated_at=now()
      from winner w
     where e.project_id is null
       and e.direction='incoming'
       and e.sent_at >= now()-make_interval(days=>v_days)
       and public.pppp_email_key_v1(e.from_email)=w.email_key
    returning e.gmail_message_id,e.gmail_thread_id,e.project_id
  )
  select count(*) into v_rfq from upd;

  insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at)
  select e.project_id,e.gmail_message_id,e.gmail_thread_id,e.match_method,e.match_confidence,now()
  from public.project_emails e
  where e.project_id is not null
    and e.sent_at >= now()-make_interval(days=>v_days)
    and e.match_method='server-context-rfq-v1'
  on conflict (gmail_message_id,project_id) do nothing;

  with recent_rfq as (
    select public.pppp_email_key_v1(r.supplier_email) email_key,
           r.project_id,
           max(coalesce(r.sent_at,r.created_at)) last_rfq
    from public.rfq_log r
    join public.projects p on p.id=r.project_id
    where coalesce(r.supplier_email,'')<>''
      and coalesce(r.sent_at,r.created_at) >= now()-interval '30 days'
      and lower(coalesce(r.status,'')) not in ('superseded','draft_review','lost','cancelled','canceled')
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','closedlost','cancelled','canceled','archived','lost')
    group by 1,2
  ), counts as (
    select email_key,
           count(distinct project_id) as project_count
    from recent_rfq
    where email_key<>''
    group by email_key
  ), ranked as (
    select r.*,
           row_number() over(partition by r.email_key order by r.last_rfq desc,r.project_id) rn
    from recent_rfq r
    where r.email_key<>''
  ), ambiguous as (
    select r.email_key,r.project_id
    from ranked r
    join counts c using (email_key)
    where r.rn=1 and c.project_count>1
  ), upd as (
    update public.project_emails e
       set suggested_project_id=a.project_id,
           match_method='server-context-rfq-review-v1',
           match_confidence=74,
           needs_review=true,
           review_reason='Multiple active project RFQs exist for this correspondent; automatic linking was intentionally withheld.',
           updated_at=now()
      from ambiguous a
     where e.project_id is null
       and e.direction='incoming'
       and e.sent_at >= now()-make_interval(days=>v_days)
       and public.pppp_email_key_v1(e.from_email)=a.email_key
       and coalesce(e.match_confidence,0)<80
    returning e.id
  )
  select count(*) into v_review from upd;

  return jsonb_build_object('ok',true,'thread_linked',v_thread,'rfq_linked',v_rfq,'held_for_review',v_review,'days',v_days);
end
$function$;

-- Targeted production cleanup. Safety guards make this a no-op if the known
-- project/thread identity is not exactly the verified EVOSYS/Kropp case.
do $cleanup$
declare
  v_evosys uuid := 'fc96208d-356c-410a-a356-96ce9e9b4d2f'::uuid;
  v_thread text := '1a06c809996869a3';
  v_last_valid_email timestamptz;
begin
  if not exists (
    select 1
    from public.projects
    where id=v_evosys
      and upper(replace(coalesce(ref,''),' ',''))='ANF-9203'
      and lower(coalesce(client,'')) like '%evosys%'
  ) then
    raise exception 'EVOSYS ANF-9203 safety identity check failed';
  end if;

  -- Remove only system-derived facts created from the verified wrong Kropp thread.
  delete from public.pppp_project_context_facts f
  where f.project_id=v_evosys
    and f.category='email_event_ai'
    and f.source_type='system'
    and f.source_ref in (
      select e.gmail_message_id
      from public.project_emails e
      where e.gmail_thread_id=v_thread
        and e.subject ilike '%Kropp Bau%'
    );

  -- Remove the wrong relationship rows, never the Gmail messages themselves.
  delete from public.project_email_links l
  where l.project_id=v_evosys
    and l.gmail_thread_id=v_thread;

  update public.project_emails e
     set project_id=null,
         suggested_project_id=null,
         match_method='server-context-cross-project-review-v2',
         match_confidence=0,
         needs_review=true,
         review_reason='Shared supplier correspondent across projects; this thread identifies Kropp Bau, not EVOSYS ANF-9203.',
         updated_at=now()
   where e.project_id=v_evosys
     and e.gmail_thread_id=v_thread
     and e.subject ilike '%Kropp Bau%';

  select max(e.sent_at)
    into v_last_valid_email
  from public.project_emails e
  where e.project_id=v_evosys;

  -- Human-approved terminal outcome: EVOSYS rejected PST-OFF-2026-09-028 on 2026-09-08.
  -- The existing project lifecycle trigger closes obsolete automated tasks.
  update public.projects
     set status='humbur',
         business_type='fabrication',
         operational_state='closed',
         operational_state_at='2026-09-08 08:02:03+00'::timestamptz,
         operational_state_source='human_approved_cleanup_20260909',
         last_email_at=v_last_valid_email,
         last_activity_at=v_last_valid_email
   where id=v_evosys;

  -- EVOSYS' two other known opportunities are fabrication as well.
  update public.projects
     set business_type='fabrication'
   where id in (
     '4c158413-4215-4d1f-9d10-551167b087b0'::uuid,
     'b7b673e0-ee6b-4b4e-8386-79af6a61a09f'::uuid
   )
     and business_type is null;
end
$cleanup$;
