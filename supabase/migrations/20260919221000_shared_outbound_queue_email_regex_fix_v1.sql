-- Correct the outbound recipient email validation regex in the already-deployed sync function.

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
       q.recipient_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+
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

select public.pppp_outbound_sync_v1();

commit;
