-- Communication state must be based on canonical tender-email links only.
-- Domain and recipient guesses were both ambiguous and made this view slow.
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
),
outgoing as (
  select
    a.action_id,
    pe.gmail_message_id,
    pe.gmail_thread_id,
    pe.gmail_url,
    pe.subject,
    pe.sent_at,
    'explicit_tender'::text as match_type,
    row_number() over (
      partition by a.action_id
      order by pe.sent_at desc nulls last,pe.id desc
    ) as rn
  from actions a
  join public.project_emails pe
    on pe.tender_watch_id=a.tender_watch_id
   and lower(coalesce(pe.direction,''))='outgoing'
   and pe.sent_at is not null
   and lower(coalesce(pe.from_email,'')) like '%@prissteel.com'
),
incoming as (
  select
    a.action_id,
    pe.gmail_message_id,
    pe.gmail_thread_id,
    pe.gmail_url,
    pe.subject,
    pe.sent_at,
    'explicit_tender'::text as match_type,
    row_number() over (
      partition by a.action_id
      order by pe.sent_at desc nulls last,pe.id desc
    ) as rn
  from actions a
  join public.project_emails pe
    on pe.tender_watch_id=a.tender_watch_id
   and lower(coalesce(pe.direction,''))='incoming'
   and pe.sent_at is not null
   and lower(coalesce(pe.from_email,'')) not like '%@prissteel.com'
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
    when i.sent_at is not null and o.sent_at is not null and i.sent_at>o.sent_at then 'replied'
    when o.sent_at is not null and o.sent_at>=now()-make_interval(days=>coalesce((select recipient_days from policy),30)) then 'waiting'
    when o.sent_at is not null then 'contacted_history'
    else 'new'
  end as communication_state,
  case when i.sent_at is not null and o.sent_at is not null and i.sent_at>o.sent_at then i.sent_at else o.sent_at end as communication_at,
  case when i.sent_at is not null and o.sent_at is not null and i.sent_at>o.sent_at then i.gmail_url else o.gmail_url end as communication_gmail_url,
  case when i.sent_at is not null and o.sent_at is not null and i.sent_at>o.sent_at then i.gmail_thread_id else o.gmail_thread_id end as communication_thread_id
from actions a
left join outgoing o on o.action_id=a.action_id and o.rn=1
left join incoming i on i.action_id=a.action_id and i.rn=1;

revoke all on public.pppp_opportunity_communication_state_v1 from public,anon;
grant select on public.pppp_opportunity_communication_state_v1 to authenticated,service_role,supabase_read_only_user;
