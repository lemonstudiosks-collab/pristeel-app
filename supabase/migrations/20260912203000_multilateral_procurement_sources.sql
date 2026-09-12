-- PPPP multilateral procurement sources: additive registrations + direct-tender routing.
-- Existing TED/KRPP/APP behavior is intentionally preserved.

insert into public.pppp_platform_integrations (
  integration_key,
  display_name,
  role,
  state,
  source_of_truth,
  orchestration_policy,
  metadata
)
values
  ('mca_kosovo', 'MCA Kosovo', 'MCA Kosovo tender discovery source', 'configured', 'MCA Kosovo public procurement page', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','MCA_KOSOVO','source_url','https://www.mcakosovo.org/procurement/','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('kcf', 'Kosovo Challenge Fund', 'Kosovo Challenge Fund tender discovery source', 'configured', 'KCF public procurement page', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','KCF','source_url','https://kcf-kosovo.org/kcf-procurement/','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('rcf', 'Regional Challenge Fund Kosovo', 'Regional Challenge Fund tender discovery source', 'configured', 'RCF Kosovo public procurement page', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','RCF','source_url','https://rcf-wb6.org/procurement-in-kosovo/','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('ebrd_ecepp', 'EBRD ECEPP', 'EBRD procurement discovery source', 'configured', 'EBRD ECEPP public procurement notices', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','EBRD_ECEPP','source_url','https://ecepp.ebrd.com/','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('world_bank', 'World Bank Procurement', 'World Bank procurement discovery source', 'configured', 'World Bank public procurement notices/API', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','WORLD_BANK','source_url','https://projects.worldbank.org/en/projects-operations/procurement','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('ungm', 'UNGM', 'UNGM procurement discovery source', 'configured', 'UNGM public procurement notices', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','UNGM','source_url','https://www.ungm.org/Public/Notice','kind','procurement_discovery','collector','multilateral-procurement-sync')),
  ('undp_kosovo', 'UNDP Kosovo', 'UNDP Kosovo procurement discovery source', 'configured', 'UNDP Kosovo public procurement page', 'Scheduled public-source collector + UNGM cross-source dedupe + manual review fallback', jsonb_build_object('source_key','UNDP_KOSOVO','source_url','https://www.undp.org/kosovo/procurement','kind','procurement_discovery','collector','multilateral-procurement-sync','dedupe_with',jsonb_build_array('UNGM'))),
  ('eu_office_kosovo', 'EU Office Kosovo', 'EU Office Kosovo tender discovery source', 'configured', 'EEAS / EU Office in Kosovo public tenders', 'Scheduled public-source collector + manual review fallback', jsonb_build_object('source_key','EU_OFFICE_KOSOVO','source_url','https://www.eeas.europa.eu/eeas/tenders_en?s=113','kind','procurement_discovery','collector','multilateral-procurement-sync'))
on conflict (integration_key) do update
set display_name = excluded.display_name,
    role = excluded.role,
    source_of_truth = excluded.source_of_truth,
    orchestration_policy = excluded.orchestration_policy,
    metadata = coalesce(public.pppp_platform_integrations.metadata, '{}'::jsonb) || excluded.metadata,
    updated_at = now();

create or replace view public.pppp_tender_operating_lanes_v1 as
select
  k.id,
  k.created_at,
  k.updated_at,
  k.first_seen_at,
  k.last_seen_at,
  k.source_key,
  k.procurement_no,
  k.publication_no,
  k.authority,
  k.title,
  k.document_type,
  k.fpp,
  k.fpp_description,
  k.contract_type,
  k.contract_value_band,
  k.procedure,
  k.estimated_value,
  k.currency,
  k.deadline,
  k.published_date,
  k.is_retender,
  k.category,
  k.relevance_score,
  k.match_reasons,
  k.status,
  k.project_id,
  k.source_url,
  k.detail_url,
  k.payload,
  case
    when upper(coalesce(k.payload ->> 'source', 'KRPP')) = any (array[
      'KRPP'::text,
      'APP'::text,
      'APP_AL'::text,
      'MCA_KOSOVO'::text,
      'KCF'::text,
      'RCF'::text,
      'EBRD_ECEPP'::text,
      'WORLD_BANK'::text,
      'UNGM'::text,
      'UNDP_KOSOVO'::text,
      'EU_OFFICE_KOSOVO'::text
    ]) and coalesce(k.payload ->> 'notice_phase', 'opportunity') = 'opportunity'
      then 'direct_tender'::text
    when upper(coalesce(k.payload ->> 'source', '')) = 'TED'
      and coalesce(k.payload ->> 'notice_phase', 'opportunity') = 'opportunity'
      then 'ted_watch'::text
    when upper(coalesce(k.payload ->> 'source', '')) = 'TED'
      and coalesce(k.payload ->> 'notice_phase', '') = 'award'
      then 'ted_award_sales'::text
    else 'reference'::text
  end as operating_lane,
  nullif(k.payload ->> 'next_check_on', '')::date as next_check_on,
  coalesce((k.payload ->> 'human_action_required')::boolean, false) as human_action_required,
  coalesce(nullif(oc.company_type, ''), k.payload #>> '{winner,company_type}', 'unknown') as winner_company_type,
  coalesce(nullif(oc.cooperation_angle, ''), k.payload ->> 'cooperation_angle') as cooperation_angle
from public.kek_tender_watch k
left join lateral (
  select o.company_type, o.cooperation_angle
  from public.outreach_contacts o
  where o.tender_watch_id = k.id
  order by coalesce(o.touch_3, o.touch_2, o.touch_1) desc nulls last,
           o.updated_at desc nulls last,
           o.id desc
  limit 1
) oc on true;
