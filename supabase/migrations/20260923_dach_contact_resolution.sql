
create or replace function public.pppp_dach_steel_contact_resolution_v1(p_target_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public','pg_temp'
as $function$
with target as (
  select *
  from public.pppp_dach_steel_targets_v1
  where id=p_target_id
),
evidence_emails as (
  select
    lower((regexp_match(coalesce(e.item->>'label',''),
      '([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})','i'))[1]) as email,
    null::text as person,
    case
      when lower(coalesce(e.item->>'label','')) like '%winner contact%' then 'Public winner contact'
      when lower(coalesce(e.item->>'label','')) like '%company contact%' then 'Public company contact'
      when lower(coalesce(e.item->>'label','')) like '%official company contact%' then 'Official company contact'
      else 'Public contact'
    end as role,
    'target_evidence'::text as source,
    coalesce(e.item->>'url', t.source_url) as source_url,
    e.item as source_payload
  from target t
  cross join lateral jsonb_array_elements(coalesce(t.evidence,'[]'::jsonb)) e(item)
  where coalesce(e.item->>'label','') ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
),
target_domain as (
  select
    t.*,
    lower(coalesce(
      nullif(btrim(t.company_domain),''),
      (select split_part(email,'@',2) from evidence_emails where email is not null limit 1),
      ''
    )) as resolved_domain,
    regexp_replace(
      regexp_replace(lower(coalesce(t.company_name,'')),
        '\m(gmbh|mbh|ag|kg|co|und|&|stahlbau|metallbau|fahrzeug|technik|metalltechnik)\M','','g'),
      '[^a-z0-9]+','','g'
    ) as company_key
  from target t
),
contact_master_candidates as (
  select
    lower(cm.email) as email,
    nullif(btrim(cm.person),'') as person,
    nullif(btrim(cm.role),'') as role,
    'contact_master'::text as source,
    null::text as source_url,
    cm.sources as source_payload,
    case
      when lower(coalesce(cm.role,'')) ~ '(einkauf|procurement|materialwirtschaft|technischer einkauf|strategischer einkauf|purchas)' then 115
      when lower(coalesce(cm.role,'')) ~ '(kalkulation|kalkulator|projektleiter|project manager|bauleiter)' then 102
      when lower(coalesce(cm.role,'')) ~ '(geschäftsführer|geschaeftsfuehrer|inhaber|director|owner)' then 92
      when split_part(lower(cm.email),'@',1) in ('info','kontakt','office','mail','zentrale') then 62
      else 84
    end
    + case when nullif(btrim(cm.person),'') is not null then 8 else 0 end
    as score
  from public.pppp_contact_master_v1 cm
  cross join target_domain t
  where nullif(btrim(cm.email),'') is not null
    and lower(split_part(cm.email,'@',2)) not in ('gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','example.com','example.org','example.net')
    and (
      (t.resolved_domain<>'' and lower(split_part(cm.email,'@',2))=t.resolved_domain)
      or (
        t.company_key<>'' and
        regexp_replace(
          regexp_replace(lower(coalesce(cm.company,'')),
            '\m(gmbh|mbh|ag|kg|co|und|&|stahlbau|metallbau|fahrzeug|technik|metalltechnik)\M','','g'),
          '[^a-z0-9]+','','g'
        )=t.company_key
      )
    )
),
evidence_candidates as (
  select
    ev.email, ev.person, ev.role, ev.source, ev.source_url, ev.source_payload,
    case
      when split_part(ev.email,'@',1) ~ '(einkauf|procurement|purchas|material|kalk)' then 108
      when split_part(ev.email,'@',1) in ('info','kontakt','office','mail','zentrale') then 58
      when split_part(ev.email,'@',1) ~ '[._\-]' then 88
      else 80
    end
    + case when lower(coalesce(ev.role,'')) like '%winner%' then 4 else 0 end
    as score
  from evidence_emails ev
),
all_candidates as (
  select * from contact_master_candidates
  union all
  select * from evidence_candidates
),
dedup as (
  select distinct on (email)
    email,person,role,source,source_url,source_payload,score
  from all_candidates
  where email is not null and email<>''
  order by email,score desc,case when source='contact_master' then 0 else 1 end
),
ranked as (
  select *,
    case
      when lower(coalesce(role,'')) ~ '(einkauf|procurement|materialwirtschaft|purchas)' or split_part(email,'@',1) ~ '(einkauf|procurement|purchas|material)' then 'procurement'
      when lower(coalesce(role,'')) ~ '(kalkulation|projektleiter|project manager|bauleiter)' then 'project'
      when lower(coalesce(role,'')) ~ '(geschäftsführer|geschaeftsfuehrer|inhaber|director|owner)' then 'management'
      when split_part(email,'@',1) in ('info','kontakt','office','mail','zentrale') then 'general'
      else 'direct_public'
    end as quality
  from dedup
  order by score desc,case when source='contact_master' then 0 else 1 end,email
),
best as (
  select * from ranked limit 1
)
select jsonb_build_object(
  'target_id',t.id,
  'company_name',t.company_name,
  'company_domain',nullif(t.resolved_domain,''),
  'status',case when b.email is not null then 'found' else 'missing' end,
  'email',b.email,
  'person',b.person,
  'role',b.role,
  'source',b.source,
  'source_url',b.source_url,
  'quality',b.quality,
  'score',b.score,
  'candidates',coalesce((
    select jsonb_agg(jsonb_build_object(
      'email',r.email,'person',r.person,'role',r.role,'source',r.source,
      'source_url',r.source_url,'quality',r.quality,'score',r.score
    ) order by r.score desc,r.email)
    from (select * from ranked limit 8) r
  ),'[]'::jsonb)
)
from target_domain t
left join best b on true;
$function$;

revoke all on function public.pppp_dach_steel_contact_resolution_v1(uuid) from public,anon;
grant execute on function public.pppp_dach_steel_contact_resolution_v1(uuid) to authenticated,service_role,supabase_read_only_user;

create or replace view public.pppp_dach_steel_operational_v1
with (security_invoker=true)
as
select
  t.*,
  c.contact_resolution,
  nullif(c.contact_resolution->>'email','') as resolved_contact_email,
  nullif(c.contact_resolution->>'person','') as resolved_contact_name,
  nullif(c.contact_resolution->>'role','') as resolved_contact_role,
  nullif(c.contact_resolution->>'source','') as resolved_contact_source,
  nullif(c.contact_resolution->>'quality','') as resolved_contact_quality,
  case when (c.contact_resolution->>'score') ~ '^[0-9]+$' then (c.contact_resolution->>'score')::integer else null end as resolved_contact_score,
  case when nullif(c.contact_resolution->>'email','') is not null then 'found' else t.contact_status end as operational_contact_status
from public.pppp_dach_steel_targets_v1 t
cross join lateral (
  select public.pppp_dach_steel_contact_resolution_v1(t.id) as contact_resolution
) c;

revoke all on public.pppp_dach_steel_operational_v1 from public,anon;
grant select on public.pppp_dach_steel_operational_v1 to authenticated,service_role,supabase_read_only_user;


create or replace view public.pppp_dach_steel_home_summary_v1
with (security_invoker=true)
as
with active as (
  select t.*,
    (
      t.contact_status in ('found','verified')
      or coalesce(t.evidence,'[]'::jsonb)::text ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
    ) as has_resolved_contact
  from public.pppp_dach_steel_targets_v1 t
  where t.target_status not in ('closed','rejected')
),
hot as (
  select id,company_name,project_title,quote_readiness,why_now,estimated_tonnes,procurement_timing
  from active
  order by
    case score_band when 'A1' then 1 when 'A2' then 2 when 'B1' then 3 when 'B2' then 4 else 5 end,
    case quote_readiness when 'M3' then 1 when 'M2' then 2 when 'M1' then 3 else 4 end,
    case target_status when 'active' then 1 when 'contact_ready' then 2 when 'qualified' then 3 else 4 end,
    next_action_due,award_date desc nulls last,updated_at desc
  limit 1
),
outbound as (
  select
    count(*) filter(where sent_at is not null or status='sent')::integer as sent,
    count(*) filter(where replied_at is not null or status='replied')::integer as replies
  from public.pppp_outbound_queue_v1
  where source='DACH_STEEL_BUYER'
)
select
  (select count(*)::integer from active) as targets,
  (select count(*)::integer from active where score_band='A1') as a1_targets,
  (select count(*)::integer from active where quote_readiness='M3') as quote_ready,
  (select count(*)::integer from active where not has_resolved_contact) as needs_contact,
  (select count(*)::integer from active where has_resolved_contact and outreach_status in ('not_ready','ready','queued') and project_id is null) as ready_for_outreach,
  coalesce((select sent from outbound),0) as sent,
  coalesce((select replies from outbound),0) as replies,
  coalesce((select round(sum(estimated_tonnes),3) from active where estimated_tonnes is not null),0::numeric) as identified_tonnes,
  (select id from hot) as hot_target_id,
  (select company_name from hot) as hot_company_name,
  (select project_title from hot) as hot_project_title,
  (select quote_readiness from hot) as hot_quote_readiness,
  (select why_now from hot) as hot_why_now,
  (select estimated_tonnes from hot) as hot_estimated_tonnes,
  (select procurement_timing from hot) as hot_procurement_timing,
  now() as calculated_at;

revoke all on public.pppp_dach_steel_home_summary_v1 from public,anon;
grant select on public.pppp_dach_steel_home_summary_v1 to authenticated,service_role,supabase_read_only_user;
