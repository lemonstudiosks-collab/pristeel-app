-- Shared PriSteel outbound coordination for TED + GC research.
-- This migration creates a central planning/suppression surface only.
-- It does NOT send email and keeps all external sends human-gated.

begin;

create table if not exists public.pppp_outbound_policy_v1 (
  id text primary key default 'global',
  starts_on date not null default date '2026-09-21',
  timezone text not null default 'Europe/Belgrade',
  daily_limit integer not null default 50 check (daily_limit between 1 and 200),
  day_start time not null default time '08:00',
  day_end time not null default time '17:00',
  min_gap_minutes integer not null default 5 check (min_gap_minutes >= 5),
  planned_gap_minutes integer not null default 10 check (planned_gap_minutes >= min_gap_minutes),
  max_per_domain_per_day integer not null default 1 check (max_per_domain_per_day >= 1),
  recipient_cooldown_days integer not null default 30 check (recipient_cooldown_days >= 1),
  domain_cooldown_days integer not null default 14 check (domain_cooldown_days >= 1),
  send_enabled boolean not null default false,
  human_send_required boolean not null default true check (human_send_required = true),
  updated_at timestamptz not null default now(),
  constraint pppp_outbound_policy_v1_singleton_chk check (id = 'global')
);

insert into public.pppp_outbound_policy_v1(
  id,starts_on,timezone,daily_limit,day_start,day_end,min_gap_minutes,planned_gap_minutes,
  max_per_domain_per_day,recipient_cooldown_days,domain_cooldown_days,send_enabled,human_send_required
) values (
  'global',date '2026-09-21','Europe/Belgrade',50,time '08:00',time '17:00',5,10,1,30,14,false,true
)
on conflict (id) do update set
  starts_on=excluded.starts_on,
  daily_limit=excluded.daily_limit,
  min_gap_minutes=excluded.min_gap_minutes,
  planned_gap_minutes=excluded.planned_gap_minutes,
  max_per_domain_per_day=excluded.max_per_domain_per_day,
  recipient_cooldown_days=excluded.recipient_cooldown_days,
  domain_cooldown_days=excluded.domain_cooldown_days,
  send_enabled=false,
  human_send_required=true,
  updated_at=now();

create table if not exists public.pppp_outbound_queue_v1 (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('TED','GC')),
  source_record_id uuid,
  source_key text not null unique,
  touch_no smallint not null default 1 check (touch_no between 1 and 3),
  tender_watch_id uuid,
  project_key text,
  project_title text,
  company_name text,
  company_domain text,
  recipient_email text not null,
  recipient_name text,
  contact_role text,
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  priority_score integer not null default 0,
  gmail_draft_id text,
  gmail_draft_message_id text,
  gmail_thread_id text,
  status text not null default 'candidate'
    check (status in ('candidate','planned','suppressed','sent','replied','bounced','do_not_contact','stale')),
  suppression_reason text,
  planned_date date,
  planned_at timestamptz,
  planned_rank integer,
  approved_for_send boolean not null default false,
  human_send_required boolean not null default true check (human_send_required = true),
  sent_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  source_updated_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pppp_outbound_queue_v1_status_idx
  on public.pppp_outbound_queue_v1(status,planned_date,priority_score desc);
create index if not exists pppp_outbound_queue_v1_recipient_idx
  on public.pppp_outbound_queue_v1(lower(recipient_email));
create index if not exists pppp_outbound_queue_v1_domain_idx
  on public.pppp_outbound_queue_v1(lower(company_domain));
create index if not exists pppp_outbound_queue_v1_source_idx
  on public.pppp_outbound_queue_v1(source,source_record_id,touch_no);
create unique index if not exists pppp_outbound_queue_v1_source_touch_uq
  on public.pppp_outbound_queue_v1(source,source_record_id,touch_no)
  where source_record_id is not null;

create or replace function public.pppp_outbound_domain_v1(p_email text,p_domain text default null)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select nullif(
    regexp_replace(
      lower(trim(coalesce(nullif(split_part(coalesce(p_email,''),'@',2),''),nullif(p_domain,'')))),
      '^www\\.','','i'
    ),
    ''
  );
$$;

create or replace function public.pppp_outbound_priority_v1(
  p_email text,
  p_name text,
  p_role text,
  p_relevance integer
)
returns integer
language sql
immutable
set search_path=pg_catalog
as $$
  select least(1000,
    greatest(0,coalesce(p_relevance,0)) * 5
    + case
        when lower(coalesce(p_role,'')) ~ '(procurement|purchas|einkauf|beschaffung|tender|ausschreib|kalkulation|estimating|sourcing|buyer)' then 320
        when nullif(trim(coalesce(p_name,'')),'') is not null then 240
        when lower(split_part(coalesce(p_email,''),'@',1)) ~ '^(info|office|kontakt|contact|mail|sekretariat|reception)$' then 90
        else 160
      end
  );
$$;

create or replace function public.pppp_outbound_sync_v1()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
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
    status=case when excluded.status='sent' then 'sent'
                when public.pppp_outbound_queue_v1.status in ('sent','replied','bounced','do_not_contact') then public.pppp_outbound_queue_v1.status
                else 'candidate' end,
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
    status=excluded.status,sent_at=excluded.sent_at,replied_at=excluded.replied_at,bounced_at=excluded.bounced_at,
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
    status=excluded.status,sent_at=excluded.sent_at,replied_at=excluded.replied_at,bounced_at=excluded.bounced_at,
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
       q.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
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

  select count(*) into v_suppressed from public.pppp_outbound_queue_v1 where status='suppressed';

  return jsonb_build_object(
    'ok',true,'ted_upserted',v_ted,'gc_touch1_upserted',v_gc1,'gc_touch2_upserted',v_gc2,
    'suppressed_total',v_suppressed,'send_enabled',v_policy.send_enabled,
    'human_send_required',true,'daily_limit',v_policy.daily_limit
  );
end;
$$;

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

  -- Re-plan unapproved, unsent rows idempotently.
  update public.pppp_outbound_queue_v1
     set status='candidate',planned_date=null,planned_at=null,planned_rank=null,updated_at=now()
   where planned_date=p_day and status='planned' and approved_for_send=false and sent_at is null;

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

create or replace view public.pppp_outbound_review_v1
with (security_invoker=true)
as
select
  q.id,q.source,q.touch_no,q.source_key,q.tender_watch_id,q.project_key,q.project_title,
  q.company_name,q.company_domain,q.recipient_email,q.recipient_name,q.contact_role,
  q.relevance_score,q.priority_score,q.gmail_draft_id,q.gmail_draft_message_id,q.gmail_thread_id,
  q.status,q.suppression_reason,q.planned_date,q.planned_at,q.planned_rank,q.approved_for_send,
  q.human_send_required,q.sent_at,q.replied_at,q.bounced_at,q.source_updated_at,q.updated_at,
  count(*) over(partition by lower(q.recipient_email)) as same_recipient_candidates,
  count(*) over(partition by lower(coalesce(q.company_domain,''))) as same_domain_candidates
from public.pppp_outbound_queue_v1 q
order by
  case q.status when 'planned' then 1 when 'candidate' then 2 when 'suppressed' then 3 else 9 end,
  q.planned_date nulls last,q.planned_rank nulls last,q.priority_score desc,q.updated_at desc;

create or replace function public.pppp_outbound_status_v1(p_day date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path=public,pg_temp
as $$
  select jsonb_build_object(
    'policy',(select to_jsonb(p) from public.pppp_outbound_policy_v1 p where p.id='global'),
    'day',p_day,
    'queue_total',(select count(*) from public.pppp_outbound_queue_v1),
    'candidate_count',(select count(*) from public.pppp_outbound_queue_v1 where status='candidate'),
    'planned_count',(select count(*) from public.pppp_outbound_queue_v1 where status='planned' and planned_date=p_day),
    'suppressed_count',(select count(*) from public.pppp_outbound_queue_v1 where status='suppressed'),
    'sent_count',(select count(*) from public.pppp_outbound_queue_v1 q,public.pppp_outbound_policy_v1 p
                  where q.sent_at is not null and p.id='global'
                    and (q.sent_at at time zone p.timezone)::date=p_day),
    'ted_open',(select count(*) from public.pppp_outbound_queue_v1 where source='TED' and status in ('candidate','planned')),
    'gc_open',(select count(*) from public.pppp_outbound_queue_v1 where source='GC' and status in ('candidate','planned')),
    'human_send_required',true,
    'auto_send',false
  );
$$;

alter table public.pppp_outbound_policy_v1 enable row level security;
alter table public.pppp_outbound_queue_v1 enable row level security;

drop policy if exists pppp_outbound_policy_authenticated_read on public.pppp_outbound_policy_v1;
create policy pppp_outbound_policy_authenticated_read
on public.pppp_outbound_policy_v1 for select to authenticated using (true);

drop policy if exists pppp_outbound_queue_authenticated_read on public.pppp_outbound_queue_v1;
create policy pppp_outbound_queue_authenticated_read
on public.pppp_outbound_queue_v1 for select to authenticated using (true);

revoke all on public.pppp_outbound_policy_v1 from public,anon;
revoke all on public.pppp_outbound_queue_v1 from public,anon;
grant select on public.pppp_outbound_policy_v1 to authenticated,service_role;
grant select on public.pppp_outbound_queue_v1 to authenticated,service_role;
grant select on public.pppp_outbound_review_v1 to authenticated,service_role;

revoke all on function public.pppp_outbound_sync_v1() from public,anon,authenticated;
revoke all on function public.pppp_outbound_plan_day_v1(date,integer) from public,anon,authenticated;
grant execute on function public.pppp_outbound_sync_v1() to service_role;
grant execute on function public.pppp_outbound_plan_day_v1(date,integer) to service_role;
grant execute on function public.pppp_outbound_status_v1(date) to authenticated,service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_outbound_policy_v1 to supabase_read_only_user;
    grant select on public.pppp_outbound_queue_v1 to supabase_read_only_user;
    grant select on public.pppp_outbound_review_v1 to supabase_read_only_user;
    grant execute on function public.pppp_outbound_status_v1(date) to supabase_read_only_user;
  end if;
end $$;

-- Seed the shared queue from the current TED and GC registries.
select public.pppp_outbound_sync_v1();

commit;
