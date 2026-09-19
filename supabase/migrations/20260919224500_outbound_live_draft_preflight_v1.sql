-- Live Gmail draft preflight for the shared TED + GC outbound queue.
-- Planning remains non-executing: no Gmail send path and send_enabled stays false.

begin;

create table if not exists public.pppp_outbound_live_drafts_v1 (
  draft_id text primary key,
  gmail_message_id text,
  gmail_thread_id text,
  recipient_email text not null,
  subject text,
  captured_at timestamptz not null default now()
);

create index if not exists pppp_outbound_live_drafts_v1_recipient_idx
  on public.pppp_outbound_live_drafts_v1(lower(recipient_email));

alter table public.pppp_outbound_live_drafts_v1 enable row level security;
drop policy if exists pppp_outbound_live_drafts_authenticated_read on public.pppp_outbound_live_drafts_v1;
create policy pppp_outbound_live_drafts_authenticated_read
on public.pppp_outbound_live_drafts_v1 for select to authenticated using (true);

revoke all on public.pppp_outbound_live_drafts_v1 from public,anon;
grant select on public.pppp_outbound_live_drafts_v1 to authenticated,service_role;

create or replace function public.pppp_outbound_reconcile_live_drafts_v1(p_drafts jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
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

  delete from public.pppp_outbound_live_drafts_v1;

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

  -- Refresh metadata for queue rows whose Gmail draft is still live.
  update public.pppp_outbound_queue_v1 q
     set gmail_draft_message_id=coalesce(d.gmail_message_id,q.gmail_draft_message_id),
         gmail_thread_id=coalesce(d.gmail_thread_id,q.gmail_thread_id),
         recipient_email=d.recipient_email,
         company_domain=public.pppp_outbound_domain_v1(d.recipient_email,q.company_domain),
         payload=coalesce(q.payload,'{}'::jsonb)||jsonb_build_object('gmail_live_verified_at',now()),
         updated_at=now()
    from public.pppp_outbound_live_drafts_v1 d
   where q.gmail_draft_id=d.draft_id
     and q.sent_at is null;

  -- Any unsent queue item whose referenced Gmail draft no longer exists is not send-ready.
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

  -- Import live PRISTEEL outreach drafts not yet represented by either canonical queue.
  -- GC drafts already owned by pppp_gc_prospects_v1 are excluded.
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
    d.draft_id,d.gmail_message_id,d.gmail_thread_id,'candidate',null,false,true,now(),
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
      else 'candidate'
    end,
    suppression_reason=null,
    source_updated_at=now(),
    payload=excluded.payload,
    updated_at=now();
  get diagnostics v_manual=row_count;

  -- Never schedule internal PriSteel test/self drafts.
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
$$;

-- Planner must fail closed: only Gmail drafts verified in the most recent live snapshot can be planned.
create or replace function public.pppp_outbound_plan_day_v1(
  p_day date default current_date,
  p_limit integer default null
)
returns table(
  queue_id uuid,
  planned_rank integer,
  planned_at timestamptz,
  source text,
  touch_no smallint,
  company_name text,
  company_domain text,
  recipient_email text,
  recipient_name text,
  project_title text,
  relevance_score integer,
  priority_score integer,
  gmail_draft_id text,
  approved_for_send boolean,
  send_enabled boolean
)
language plpgsql
security definer
set search_path=public,pg_temp
as $$
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
      and exists (
        select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=q.gmail_draft_id
      )
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
$$;

revoke all on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) from public,anon,authenticated;
grant execute on function public.pppp_outbound_reconcile_live_drafts_v1(jsonb) to service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_outbound_live_drafts_v1 to supabase_read_only_user;
  end if;
end $$;

commit;
