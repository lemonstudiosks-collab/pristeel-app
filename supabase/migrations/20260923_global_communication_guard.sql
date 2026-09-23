
create or replace function public.pppp_global_communication_guard_v1(
  p_recipient_email text,
  p_company_domain text default null,
  p_exclude_source text default null,
  p_exclude_source_record_id uuid default null,
  p_exclude_queue_id uuid default null
)
returns jsonb
language sql
stable
set search_path to 'public','pg_temp'
as $function$
with pol as (
  select
    coalesce(recipient_cooldown_days,30)::integer as recipient_days,
    coalesce(domain_cooldown_days,14)::integer as domain_days
  from public.pppp_outbound_policy_v1
  where id='global'
),
ctx as (
  select
    lower(btrim(coalesce(p_recipient_email,''))) as email,
    lower(coalesce(
      nullif(btrim(p_company_domain),''),
      public.pppp_outbound_domain_v1(p_recipient_email,null),
      ''
    )) as domain,
    upper(btrim(coalesce(p_exclude_source,''))) as exclude_source,
    p_exclude_source_record_id as exclude_source_record_id,
    p_exclude_queue_id as exclude_queue_id,
    coalesce((select recipient_days from pol),30) as recipient_days,
    coalesce((select domain_days from pol),14) as domain_days
),
events as (
  select
    'QUEUE:'||upper(coalesce(q.source,'')) as source,
    q.id::text as event_id,
    lower(coalesce(q.recipient_email,'')) as email,
    lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),'')) as domain,
    'sent'::text as kind,
    q.sent_at as event_at
  from public.pppp_outbound_queue_v1 q, ctx c
  where q.sent_at is not null
    and not (
      q.id is not distinct from c.exclude_queue_id
      or (
        upper(coalesce(q.source,''))=c.exclude_source
        and q.source_record_id is not distinct from c.exclude_source_record_id
      )
    )

  union all
  select 'QUEUE:'||upper(coalesce(q.source,'')),q.id::text,
         lower(coalesce(q.recipient_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),'')),
         'replied',q.replied_at
  from public.pppp_outbound_queue_v1 q, ctx c
  where q.replied_at is not null
    and not (
      q.id is not distinct from c.exclude_queue_id
      or (
        upper(coalesce(q.source,''))=c.exclude_source
        and q.source_record_id is not distinct from c.exclude_source_record_id
      )
    )

  union all
  select 'QUEUE:'||upper(coalesce(q.source,'')),q.id::text,
         lower(coalesce(q.recipient_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),'')),
         'bounced',q.bounced_at
  from public.pppp_outbound_queue_v1 q, ctx c
  where q.bounced_at is not null
    and not (
      q.id is not distinct from c.exclude_queue_id
      or (
        upper(coalesce(q.source,''))=c.exclude_source
        and q.source_record_id is not distinct from c.exclude_source_record_id
      )
    )

  union all
  select 'QUEUE:'||upper(coalesce(q.source,'')),q.id::text,
         lower(coalesce(q.recipient_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(q.recipient_email,q.company_domain),'')),
         'active_draft',q.updated_at
  from public.pppp_outbound_queue_v1 q, ctx c
  where q.sent_at is null and q.replied_at is null and q.bounced_at is null
    and q.gmail_draft_id is not null
    and q.status in ('candidate','planned')
    and q.suppression_reason is null
    and not (
      q.id is not distinct from c.exclude_queue_id
      or (
        upper(coalesce(q.source,''))=c.exclude_source
        and q.source_record_id is not distinct from c.exclude_source_record_id
      )
    )

  union all
  select 'GMAIL',pe.gmail_message_id,
         lower(x.email),
         lower(coalesce(public.pppp_outbound_domain_v1(x.email,null),'')),
         'sent',pe.sent_at
  from public.project_emails pe
  cross join lateral unnest(coalesce(pe.to_emails,'{}'::text[])) as x(email)
  where lower(coalesce(pe.direction,''))='outgoing'
    and pe.sent_at is not null
    and lower(coalesce(pe.from_email,'')) like '%@prissteel.com'

  union all
  select 'GMAIL',pe.gmail_message_id,
         lower(coalesce(pe.from_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(pe.from_email,null),'')),
         'replied',pe.sent_at
  from public.project_emails pe
  where lower(coalesce(pe.direction,''))='incoming'
    and pe.sent_at is not null
    and lower(coalesce(pe.from_email,'')) not like '%@prissteel.com'

  union all
  select 'TED',r.id::text,
         lower(coalesce(r.recipient_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(r.recipient_email,null),'')),
         'sent',r.sent_at
  from public.pppp_opportunity_outreach_registry_v1 r, ctx c
  where r.sent_at is not null
    and not (c.exclude_source='TED' and r.id is not distinct from c.exclude_source_record_id)

  union all
  select 'TED',r.id::text,
         lower(coalesce(r.recipient_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(r.recipient_email,null),'')),
         'active_draft',coalesce(r.draft_created_at,r.updated_at)
  from public.pppp_opportunity_outreach_registry_v1 r, ctx c
  where r.sent_at is null
    and r.gmail_draft_id is not null
    and r.status in ('draft_pending','draft_created')
    and not (c.exclude_source='TED' and r.id is not distinct from c.exclude_source_record_id)

  union all
  select 'GC',g.id::text,
         lower(coalesce(g.contact_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(g.contact_email,g.company_domain),'')),
         'sent',coalesce(g.second_sent_at,g.first_sent_at)
  from public.pppp_gc_prospects_v1 g, ctx c
  where coalesce(g.second_sent_at,g.first_sent_at) is not null
    and not (c.exclude_source='GC' and g.id is not distinct from c.exclude_source_record_id)

  union all
  select 'GC',g.id::text,
         lower(coalesce(g.contact_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(g.contact_email,g.company_domain),'')),
         'replied',g.replied_at
  from public.pppp_gc_prospects_v1 g, ctx c
  where g.replied_at is not null
    and not (c.exclude_source='GC' and g.id is not distinct from c.exclude_source_record_id)

  union all
  select 'GC',g.id::text,
         lower(coalesce(g.contact_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(g.contact_email,g.company_domain),'')),
         'bounced',g.bounced_at
  from public.pppp_gc_prospects_v1 g, ctx c
  where g.bounced_at is not null
    and not (c.exclude_source='GC' and g.id is not distinct from c.exclude_source_record_id)

  union all
  select 'GC',g.id::text,
         lower(coalesce(g.contact_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(g.contact_email,g.company_domain),'')),
         'active_draft',g.updated_at
  from public.pppp_gc_prospects_v1 g, ctx c
  where g.first_sent_at is null
    and coalesce(g.first_draft_id,g.second_draft_id) is not null
    and g.status in ('draft_ready','draft_2_ready','followup_due')
    and not (c.exclude_source='GC' and g.id is not distinct from c.exclude_source_record_id)

  union all
  select 'GC',g.id::text,
         lower(coalesce(g.contact_email,'')),
         lower(coalesce(public.pppp_outbound_domain_v1(g.contact_email,g.company_domain),'')),
         'suppressed',g.updated_at
  from public.pppp_gc_prospects_v1 g, ctx c
  where (coalesce(g.do_not_contact,false) or g.status='do_not_contact')
    and not (c.exclude_source='GC' and g.id is not distinct from c.exclude_source_record_id)
),
relevant as (
  select e.*,
         (e.email=c.email and c.email<>'') as exact_recipient,
         (e.domain=c.domain and c.domain<>'') as exact_domain
  from events e cross join ctx c
  where (c.email<>'' and e.email=c.email)
     or (c.domain<>'' and e.domain=c.domain)
),
flags as (
  select
    exists(select 1 from relevant r,ctx c where r.kind='bounced' and r.exact_recipient) as bounced,
    exists(select 1 from relevant r,ctx c where r.kind='replied' and (r.exact_recipient or r.exact_domain)) as replied,
    exists(select 1 from relevant r,ctx c where r.kind='suppressed' and r.exact_recipient) as suppressed,
    exists(select 1 from relevant r,ctx c where r.kind='sent' and r.exact_recipient and r.event_at>=now()-make_interval(days=>c.recipient_days)) as recipient_sent,
    exists(select 1 from relevant r,ctx c where r.kind='sent' and r.exact_domain and r.event_at>=now()-make_interval(days=>c.domain_days)) as domain_sent,
    exists(select 1 from relevant r where r.kind='active_draft' and r.exact_recipient) as recipient_active,
    exists(select 1 from relevant r where r.kind='active_draft' and r.exact_domain) as domain_active,
    (select max(event_at) from relevant) as latest_contact_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'source',r.source,'kind',r.kind,'at',r.event_at,'email',r.email,'domain',r.domain,'event_id',r.event_id
      ) order by r.event_at desc nulls last)
       from (select distinct source,kind,event_at,email,domain,event_id from relevant order by event_at desc nulls last limit 12) r),
      '[]'::jsonb
    ) as conflicts
)
select jsonb_build_object(
  'ok',
    not (
      c.email='' or c.domain='prissteel.com'
      or f.bounced or f.replied or f.suppressed
      or f.recipient_sent or f.domain_sent
      or f.recipient_active or f.domain_active
    ),
  'reason',
    case
      when c.email='' then 'recipient_email_required'
      when c.domain='prissteel.com' then 'internal_pristeel_recipient'
      when f.bounced then 'cross_source_recipient_bounced'
      when f.replied then 'cross_source_reply_history'
      when f.recipient_sent then 'cross_source_recipient_cooldown'
      when f.domain_sent then 'cross_source_domain_cooldown'
      when f.suppressed then 'cross_source_recipient_suppressed'
      when f.recipient_active then 'cross_source_active_recipient_outreach'
      when f.domain_active then 'cross_source_active_domain_outreach'
      else 'clear'
    end,
  'recipient_email',c.email,
  'company_domain',c.domain,
  'recipient_cooldown_days',c.recipient_days,
  'domain_cooldown_days',c.domain_days,
  'latest_contact_at',f.latest_contact_at,
  'conflicts',f.conflicts
)
from ctx c cross join flags f;
$function$;

revoke all on function public.pppp_global_communication_guard_v1(text,text,text,uuid,uuid) from public,anon;
grant execute on function public.pppp_global_communication_guard_v1(text,text,text,uuid,uuid) to authenticated,service_role,supabase_read_only_user;

create or replace function public.pppp_outbound_source_guard_v1(p_queue_id uuid)
returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $function$
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

  v_guard:=public.pppp_global_communication_guard_v1(
    q.recipient_email,q.company_domain,q.source,q.source_record_id,q.id
  );
  if not coalesce((v_guard->>'ok')::boolean,false) then
    return jsonb_build_object(
      'ok',false,
      'reason',coalesce(v_guard->>'reason','global_communication_guard_blocked'),
      'global_guard',v_guard
    );
  end if;

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
$function$;


create or replace view public.pppp_opportunity_communication_state_v1 as
with policy as (
  select coalesce(recipient_cooldown_days,30)::integer as recipient_days
  from public.pppp_outbound_policy_v1
  where id='global'
),
actions as (
  select
    a.id as action_id,
    a.tender_watch_id,
    lower(btrim(coalesce(a.target_email,''))) as target_email,
    lower(coalesce(public.pppp_outbound_domain_v1(a.target_email,null),'')) as target_domain
  from public.pppp_opportunity_actions a
  where a.status not in ('background','resolved','closed','done','superseded')
    and nullif(btrim(coalesce(a.target_email,'')),'') is not null
),
outgoing as (
  select
    a.action_id,
    a.tender_watch_id,
    pe.gmail_message_id,
    pe.gmail_thread_id,
    pe.gmail_url,
    pe.subject,
    pe.sent_at,
    lower(e.email) as matched_email,
    case
      when lower(e.email)=a.target_email then 'exact_recipient'
      else 'company_domain'
    end as match_type,
    row_number() over (
      partition by a.action_id
      order by
        case when lower(e.email)=a.target_email then 0 else 1 end,
        pe.sent_at desc nulls last,
        pe.id desc
    ) as rn
  from actions a
  join public.project_emails pe
    on lower(coalesce(pe.direction,''))='outgoing'
   and pe.sent_at is not null
   and lower(coalesce(pe.from_email,'')) like '%@prissteel.com'
  cross join lateral unnest(coalesce(pe.to_emails,'{}'::text[])) e(email)
  where lower(e.email)=a.target_email
     or (
       a.target_domain<>''
       and lower(coalesce(public.pppp_outbound_domain_v1(e.email,null),''))=a.target_domain
     )
),
incoming as (
  select
    a.action_id,
    pe.gmail_message_id,
    pe.gmail_thread_id,
    pe.gmail_url,
    pe.subject,
    pe.sent_at,
    lower(coalesce(pe.from_email,'')) as matched_email,
    case
      when lower(coalesce(pe.from_email,''))=a.target_email then 'exact_recipient'
      else 'company_domain'
    end as match_type,
    row_number() over (
      partition by a.action_id
      order by
        case when lower(coalesce(pe.from_email,''))=a.target_email then 0 else 1 end,
        pe.sent_at desc nulls last,
        pe.id desc
    ) as rn
  from actions a
  join public.project_emails pe
    on lower(coalesce(pe.direction,''))='incoming'
   and pe.sent_at is not null
   and lower(coalesce(pe.from_email,'')) not like '%@prissteel.com'
  where lower(coalesce(pe.from_email,''))=a.target_email
     or (
       a.target_domain<>''
       and lower(coalesce(public.pppp_outbound_domain_v1(pe.from_email,null),''))=a.target_domain
     )
)
select
  a.action_id,
  a.tender_watch_id,
  a.target_email,
  a.target_domain,
  o.sent_at as last_outgoing_at,
  o.gmail_message_id as last_outgoing_message_id,
  o.gmail_thread_id as last_outgoing_thread_id,
  o.gmail_url as last_outgoing_gmail_url,
  o.subject as last_outgoing_subject,
  o.match_type as outgoing_match_type,
  i.sent_at as last_incoming_at,
  i.gmail_message_id as last_incoming_message_id,
  i.gmail_thread_id as last_incoming_thread_id,
  i.gmail_url as last_incoming_gmail_url,
  i.subject as last_incoming_subject,
  i.match_type as incoming_match_type,
  case
    when i.sent_at is not null
      and o.sent_at is not null
      and i.sent_at>o.sent_at then 'replied'
    when o.sent_at is not null
      and o.sent_at>=now()-make_interval(days=>coalesce((select recipient_days from policy),30))
      then 'waiting'
    when o.sent_at is not null then 'contacted_history'
    else 'new'
  end as communication_state,
  case
    when i.sent_at is not null
      and o.sent_at is not null
      and i.sent_at>o.sent_at then i.sent_at
    else o.sent_at
  end as communication_at,
  case
    when i.sent_at is not null
      and o.sent_at is not null
      and i.sent_at>o.sent_at then i.gmail_url
    else o.gmail_url
  end as communication_gmail_url,
  case
    when i.sent_at is not null
      and o.sent_at is not null
      and i.sent_at>o.sent_at then i.gmail_thread_id
    else o.gmail_thread_id
  end as communication_thread_id
from actions a
left join outgoing o on o.action_id=a.action_id and o.rn=1
left join incoming i on i.action_id=a.action_id and i.rn=1;

revoke all on public.pppp_opportunity_communication_state_v1 from public,anon;
grant select on public.pppp_opportunity_communication_state_v1 to authenticated,service_role,supabase_read_only_user;
