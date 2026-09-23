
create or replace view public.pppp_dach_steel_home_summary_v1
with (security_invoker = true)
as
with active as (
  select *
  from public.pppp_dach_steel_targets_v1
  where target_status not in ('closed','rejected')
),
hot as (
  select
    id,
    company_name,
    project_title,
    quote_readiness,
    why_now,
    estimated_tonnes,
    procurement_timing
  from active
  order by
    case score_band
      when 'A1' then 1
      when 'A2' then 2
      when 'B1' then 3
      when 'B2' then 4
      else 5
    end,
    case quote_readiness
      when 'M3' then 1
      when 'M2' then 2
      when 'M1' then 3
      else 4
    end,
    case target_status
      when 'active' then 1
      when 'contact_ready' then 2
      when 'qualified' then 3
      else 4
    end,
    next_action_due nulls last,
    award_date desc nulls last,
    updated_at desc
  limit 1
),
outbound as (
  select
    count(*) filter (where sent_at is not null or status = 'sent')::int as sent,
    count(*) filter (where replied_at is not null or status = 'replied')::int as replies
  from public.pppp_outbound_queue_v1
  where source = 'DACH_STEEL_BUYER'
)
select
  (select count(*)::int from active) as targets,
  (select count(*)::int from active where score_band = 'A1') as a1_targets,
  (select count(*)::int from active where quote_readiness = 'M3') as quote_ready,
  (select count(*)::int from active where contact_status in ('missing','searching')) as needs_contact,
  (select count(*)::int from active where outreach_status = 'ready') as ready_for_outreach,
  coalesce((select sent from outbound),0) as sent,
  coalesce((select replies from outbound),0) as replies,
  coalesce((select round(sum(estimated_tonnes),3) from active where estimated_tonnes is not null),0) as identified_tonnes,
  (select id from hot) as hot_target_id,
  (select company_name from hot) as hot_company_name,
  (select project_title from hot) as hot_project_title,
  (select quote_readiness from hot) as hot_quote_readiness,
  (select why_now from hot) as hot_why_now,
  (select estimated_tonnes from hot) as hot_estimated_tonnes,
  (select procurement_timing from hot) as hot_procurement_timing,
  now() as calculated_at;

