begin;

create or replace function public.pppp_enforce_procurement_program_watch_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  w public.pppp_procurement_program_watches%rowtype;
  strategic_reason constant text := 'Strategic program watch: monitor future SPNs and package notices';
begin
  select *
    into w
  from public.pppp_procurement_program_watches
  where status = 'active'
    and parent_source_key = new.source_key
  order by updated_at desc, created_at desc
  limit 1;

  if not found then
    return new;
  end if;

  new.relevance_score := greatest(coalesce(new.relevance_score, 0), w.strategic_relevance);

  if not (strategic_reason = any(coalesce(new.match_reasons, '{}'::text[]))) then
    new.match_reasons := coalesce(new.match_reasons, '{}'::text[]) || strategic_reason;
  end if;

  new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
    'program_reference', w.program_code,
    'workflow_mode', 'program_monitoring',
    'dossier_expected', false,
    'strategic_relevance', 'high',
    'partner_research_policy', w.partner_research_policy,
    'entry_routes', coalesce(
      w.notes -> 'entry_routes',
      jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor')
    ),
    'recommended_lane', 'pipeline_watch',
    'home_eligible', false,
    'notice_phase', 'pipeline',
    'human_action_required', false,
    'competition_mode', 'Program monitoring / future SPN tracking'
  );

  return new;
end;
$$;

revoke all on function public.pppp_enforce_procurement_program_watch_v1() from public;

DROP TRIGGER IF EXISTS trg_pppp_enforce_procurement_program_watch_v1 ON public.kek_tender_watch;
CREATE TRIGGER trg_pppp_enforce_procurement_program_watch_v1
BEFORE INSERT OR UPDATE ON public.kek_tender_watch
FOR EACH ROW
EXECUTE FUNCTION public.pppp_enforce_procurement_program_watch_v1();

create or replace view public.pppp_tender_operating_lanes_v1
with (security_invoker=true)
as
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
    when upper(coalesce(k.payload ->> 'source','KRPP')) = any(array[
      'KRPP','APP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO'
    ]::text[])
      and (
        coalesce(k.payload ->> 'workflow_mode','') = 'program_monitoring'
        or coalesce(k.payload ->> 'recommended_lane','') = 'pipeline_watch'
        or coalesce(k.payload ->> 'notice_phase','') = 'pipeline'
        or lower(coalesce(k.document_type,'')) like '%general procurement notice%'
      )
      then 'pipeline_watch'
    when upper(coalesce(k.payload ->> 'source','KRPP')) = any(array[
      'KRPP','APP','APP_AL','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO'
    ]::text[])
      and coalesce(k.payload ->> 'notice_phase','opportunity') = 'opportunity'
      then 'direct_tender'
    when upper(coalesce(k.payload ->> 'source','')) = 'TED'
      and coalesce(k.payload ->> 'notice_phase','opportunity') = 'opportunity'
      then 'ted_watch'
    when upper(coalesce(k.payload ->> 'source','')) = 'TED'
      and coalesce(k.payload ->> 'notice_phase','') = 'award'
      then 'ted_award_sales'
    else 'reference'
  end as operating_lane,
  nullif(k.payload ->> 'next_check_on','')::date as next_check_on,
  coalesce((k.payload ->> 'human_action_required')::boolean, false) as human_action_required,
  coalesce(nullif(oc.company_type,''), k.payload #>> '{winner,company_type}', 'unknown') as winner_company_type,
  coalesce(nullif(oc.cooperation_angle,''), k.payload ->> 'cooperation_angle') as cooperation_angle
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

grant select on public.pppp_tender_operating_lanes_v1 to authenticated;

-- Re-run the current tracked parent notice through the guard so production state is repaired immediately.
update public.kek_tender_watch
set updated_at = now()
where source_key in (
  select parent_source_key
  from public.pppp_procurement_program_watches
  where status = 'active'
    and parent_source_key is not null
);

commit;
