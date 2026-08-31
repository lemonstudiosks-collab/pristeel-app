-- Target-specific TED sales state is stored outside the raw TED winner payload,
-- so periodic TED enrichment cannot overwrite a manually verified outreach target.

alter table public.outreach_contacts
  add column if not exists company_type text null,
  add column if not exists cooperation_angle text null,
  add column if not exists outreach_kind text null;

create or replace function public.pppp_ted_award_candidates_by_email_v1(p_email text)
returns table(
  tender_watch_id uuid,
  publication_no text,
  authority text,
  title text,
  status text,
  payload jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select k.id, k.publication_no, k.authority, k.title, k.status, k.payload
  from public.kek_tender_watch k
  where length(trim(coalesce(p_email,''))) >= 5
    and upper(coalesce(k.payload->>'source',''))='TED'
    and coalesce(k.payload->>'notice_phase','')='award'
    and lower(k.payload::text) like '%' || lower(trim(p_email)) || '%'
  order by k.published_date desc nulls last, k.updated_at desc;
$$;
revoke all on function public.pppp_ted_award_candidates_by_email_v1(text) from public;
grant execute on function public.pppp_ted_award_candidates_by_email_v1(text) to service_role;

create or replace view public.pppp_ted_sales_outreach_v1 as
select
  k.id as tender_watch_id,
  k.publication_no,
  k.procurement_no,
  k.published_date,
  k.authority,
  k.title,
  k.category,
  k.relevance_score,
  k.status as opportunity_status,
  k.project_id,
  k.payload #>> '{winner,name}' as winner_name,
  coalesce(nullif(oc.company_type,''), k.payload #>> '{winner,company_type}','unknown') as winner_company_type,
  coalesce(nullif(oc.cooperation_angle,''), k.payload ->> 'cooperation_angle') as cooperation_angle,
  coalesce((k.payload->>'human_action_required')::boolean,false) as human_action_required,
  nullif(k.payload->>'next_check_on','')::date as next_check_on,
  oc.company_name,
  oc.contact_email,
  oc.company_domain,
  oc.touch_1,
  oc.touch_2,
  oc.touch_3,
  oc.status as outreach_status,
  oc.replied,
  oc.meeting,
  oc.bounced,
  oc.closed,
  oc.follow_up_date,
  oc.gmail_message_id as outreach_gmail_message_id,
  oc.gmail_thread_id as outreach_gmail_thread_id,
  le.gmail_message_id as latest_gmail_message_id,
  le.gmail_thread_id as latest_gmail_thread_id,
  le.direction as latest_email_direction,
  le.subject as latest_email_subject,
  le.sent_at as latest_email_at,
  le.gmail_url as latest_gmail_url,
  le.match_method as latest_email_match_method,
  le.match_confidence as latest_email_match_confidence,
  (select count(*) from public.tender_email_links telc where telc.tender_watch_id=k.id) as linked_email_count,
  coalesce(k.payload #>> '{winner,company_type}','unknown') as source_winner_company_type,
  oc.outreach_kind
from public.kek_tender_watch k
left join lateral (
  select o.*
  from public.outreach_contacts o
  where o.tender_watch_id=k.id
  order by coalesce(o.touch_3,o.touch_2,o.touch_1) desc nulls last, o.updated_at desc nulls last, o.id desc
  limit 1
) oc on true
left join lateral (
  select pe.*
  from public.tender_email_links tel
  join public.project_emails pe on pe.gmail_message_id=tel.gmail_message_id
  where tel.tender_watch_id=k.id
  order by pe.sent_at desc, pe.id desc
  limit 1
) le on true
where upper(coalesce(k.payload->>'source',''))='TED'
  and coalesce(k.payload->>'notice_phase','')='award';
