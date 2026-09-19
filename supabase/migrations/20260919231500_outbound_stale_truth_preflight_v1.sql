-- Keep Gmail-missing queue rows stale until a live draft reappears.
-- Adds one low-cost batch preflight for the shared TED + GC outbound queue.

begin;

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

  select count(*) into v_suppressed from public.pppp_outbound_queue_v1 where status='suppressed';

  return jsonb_build_object(
    'ok',true,'ted_upserted',v_ted,'gc_touch1_upserted',v_gc1,'gc_touch2_upserted',v_gc2,
    'suppressed_total',v_suppressed,'send_enabled',v_policy.send_enabled,
    'human_send_required',true,'daily_limit',v_policy.daily_limit
  );
end;
$$;

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

create or replace function public.pppp_outbound_preflight_v1(p_day date default current_date)
returns jsonb
language sql
stable
security invoker
set search_path=public,pg_temp
as $$
  with p as (
    select * from public.pppp_outbound_policy_v1 where id='global'
  ),
  planned as (
    select q.*
    from public.pppp_outbound_queue_v1 q
    where q.planned_date=p_day and q.status='planned'
  ),
  checks as (
    select
      count(*) as planned_count,
      count(*) filter (where exists(select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=planned.gmail_draft_id)) as live_draft_count,
      count(*) filter (where not exists(select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=planned.gmail_draft_id)) as missing_draft_count,
      count(*) filter (where lower(public.pppp_outbound_domain_v1(planned.recipient_email,planned.company_domain))='prissteel.com') as internal_recipient_count,
      count(*) filter (where planned.approved_for_send) as approved_count,
      count(*) filter (
        where planned.approved_for_send
          and exists(select 1 from public.pppp_outbound_live_drafts_v1 d where d.draft_id=planned.gmail_draft_id)
      ) as approved_live_count
    from planned
  )
  select jsonb_build_object(
    'day',p_day,
    'policy',(select to_jsonb(p) from p),
    'planned_count',(select planned_count from checks),
    'live_draft_count',(select live_draft_count from checks),
    'missing_draft_count',(select missing_draft_count from checks),
    'internal_recipient_count',(select internal_recipient_count from checks),
    'approved_count',(select approved_count from checks),
    'approved_live_count',(select approved_live_count from checks),
    'duplicate_recipient_count',(
      select count(*) from (
        select lower(recipient_email) e from planned group by lower(recipient_email) having count(*)>1
      ) x
    ),
    'duplicate_domain_count',(
      select count(*) from (
        select lower(public.pppp_outbound_domain_v1(recipient_email,company_domain)) d
        from planned
        group by lower(public.pppp_outbound_domain_v1(recipient_email,company_domain))
        having count(*)>1
      ) x
    ),
    'ready_to_dispatch_count',case
      when (select send_enabled from p)
       and (select human_send_required from p)
      then (select approved_live_count from checks)
      else 0 end,
    'send_enabled',(select send_enabled from p),
    'human_send_required',(select human_send_required from p),
    'auto_send',false
  );
$$;

revoke all on function public.pppp_outbound_preflight_v1(date) from public,anon;
grant execute on function public.pppp_outbound_preflight_v1(date) to authenticated,service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_outbound_preflight_v1(date) to supabase_read_only_user;
  end if;
end $$;

commit;
