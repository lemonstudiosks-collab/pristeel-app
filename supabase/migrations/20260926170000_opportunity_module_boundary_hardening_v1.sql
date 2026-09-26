-- PPPP opportunity module boundary hardening v1
-- Mundesite owns tender truth. Representation consumes an explicit handoff.
-- Existing rows are preserved; no target, company, project, contact or outbound row is created here.

alter table public.pppp_representation_opportunity_targets_v1
  drop constraint if exists pppp_representation_opportunity_targets_v1_candidate_role_check;

alter table public.pppp_representation_opportunity_targets_v1
  add constraint pppp_representation_opportunity_targets_v1_candidate_role_check
  check (candidate_role = any (array[
    'lead_epc_candidate'::text,
    'oem_specialist_partner'::text,
    'local_partner'::text,
    'representation'::text,
    'jv_consortium_candidate'::text,
    'fabrication_partner'::text,
    'material_supply_partner'::text,
    'competitor_intelligence'::text
  ]));

-- Keep multi-route screening inside the canonical tender record. This trigger
-- is deliberately limited to NEW.payload and has no cross-module writes.
create or replace function public.pppp_tender_multiroute_screen_v2()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_source text := upper(coalesce(new.payload->>'source','KRPP'));
  v_phase text := lower(coalesce(new.payload->>'notice_phase','opportunity'));
  v_country text := upper(coalesce(new.payload->>'country',''));
  v_text text;
  v_kosovo boolean;
  v_active boolean := coalesce(new.status,'new') <> 'ignored';
  v_low_fit boolean;
  v_pristeel_fit boolean;
begin
  new.payload := coalesce(new.payload,'{}'::jsonb);
  v_text := lower(
    coalesce(new.title,'') || ' ' ||
    coalesce(new.fpp_description,'') || ' ' ||
    coalesce(new.payload->>'short_description','') || ' ' ||
    coalesce(new.payload->>'description','')
  );

  v_kosovo :=
       v_source in ('KRPP','MCA_KOSOVO')
    or v_country like 'XK%'
    or v_country like 'KOS%'
    or lower(coalesce(new.authority,'')) like '%kosov%'
    or lower(coalesce(new.title,'')) like '%kosov%';

  v_low_fit :=
       v_text ~ '(cadastre|kadastr|office furniture|mobileri|vehicle body parts repair|software development|property administration|rental scheme platform)'
    or (v_text ~ '(platform|platforme)' and v_text ~ '(software|digital|tregtim.*energj|administration|rental)')
    or (v_text ~ '(lighting system|sistem.*ndri[cç])' and v_text ~ '(office|zyr)')
    or v_text ~ '(kushineta|bearing|aparat.*saldim|welding machine)'
    or v_text ~ '(fertigungskapazit[aä]tstest|pristeel.*test)';

  v_pristeel_fit :=
    v_active
    and not v_low_fit
    and (
      coalesce(new.payload->>'capability_direct_evidence','false') = 'true'
      or (
        lower(coalesce(new.category,'')) in ('steel_structure','raw_material')
        and coalesce(new.relevance_score,0) >= 60
      )
      or v_text ~ '(çelik|celik|steel|metall|metalike|metallic|konstruks|construct.*steel|structural steel|fabricat|shufr|gyp|tube|pipe|plate|profil|rezervuar|tank|termocentral|power plant|substation|substacion|transmission|transmet|grid|rrjet.*energ|tower|pylon|pole|shtyll|gantry|bridge|urë|ure |railway|hekurudh|impiant|plant industrial|industrial plant|wastewater|ujër.*zeza|ujer.*zeza|district heating|ngrohje qendrore|conveyor|transportues|pipe rack|solar|photovolta|battery|bess|energy storage|wind farm|warehouse|hangar|steel hall|kulm|mbuloj|steel roof|facad|stair.*steel|shkall.*metal|rrethoj.*metal|guardrail|mining|processing plant)'
    );

  new.payload := new.payload || jsonb_build_object(
    'candidate_business_routes',jsonb_build_array(
      'direct_bid','fabricated_steel_package','material_supply',
      'external_production_capacity','local_epc_partner','jv_consortium',
      'representation_market_entry','oem_specialist_partner','competitor_intelligence'
    ),
    'partnership_routes',jsonb_build_array(
      'local_epc_partner','jv_consortium','representation_market_entry',
      'oem_specialist_partner','competitor_intelligence'
    ),
    'route_screening_status',case
      when not v_active then 'not_active'
      when v_pristeel_fit then 'pending_business_route_screening'
      else 'pending_relevance_review'
    end,
    'business_mode_v2','multi_route_screening',
    'pristeel_relevance_gate',case
      when not v_active then 'not_active'
      when v_pristeel_fit then 'strong'
      else 'review'
    end,
    'partnership_expansion_required',
      (v_pristeel_fit and v_kosovo and v_phase in ('pipeline','opportunity','award')),
    'partnership_expansion_market',case when v_kosovo then 'kosovo' else 'regional_or_external' end,
    'partner_target_creation_requires_human_approval',true,
    'multi_route_policy','pristeel-multiroute-v2-boundary-safe'
  );

  return new;
end;
$$;

revoke all on function public.pppp_tender_multiroute_screen_v2()
  from public, anon, authenticated;

drop trigger if exists trg_pppp_tender_multiroute_screen_v2 on public.kek_tender_watch;
create trigger trg_pppp_tender_multiroute_screen_v2
before insert or update of payload,status,title,fpp_description,authority,category,relevance_score
on public.kek_tender_watch
for each row execute function public.pppp_tender_multiroute_screen_v2();

-- Remove the hidden cross-module writer. Its historical rows remain intact.
drop trigger if exists trg_pppp_tender_partnership_expansion_sync_v1 on public.kek_tender_watch;
drop function if exists public.pppp_tender_partnership_expansion_sync_v1();

create or replace view public.pppp_partnership_expansion_queue_v1
with (security_invoker = true)
as
with ranked as (
  select
    t.*,
    coalesce(nullif(btrim(t.procurement_no),''),nullif(btrim(t.publication_no),''),t.source_key)
      as canonical_tender_identity,
    row_number() over (
      partition by coalesce(nullif(btrim(t.procurement_no),''),nullif(btrim(t.publication_no),''),t.source_key)
      order by t.updated_at desc nulls last,t.created_at desc
    ) as identity_rank
  from public.kek_tender_watch t
  where t.payload->>'partnership_expansion_required'='true'
    and coalesce(t.status,'new')<>'ignored'
)
select
  t.id as tender_watch_id,
  t.source_key,
  upper(coalesce(t.payload->>'source','KRPP')) as source,
  lower(coalesce(t.payload->>'notice_phase','opportunity')) as procurement_stage,
  t.title,
  t.authority,
  t.status as tender_status,
  t.category,
  t.relevance_score,
  t.estimated_value,
  t.currency,
  t.deadline,
  t.payload->'candidate_business_routes' as candidate_business_routes,
  t.payload->'partnership_routes' as partnership_routes,
  t.payload->>'route_screening_status' as route_screening_status,
  t.payload->>'partnership_expansion_market' as partnership_expansion_market,
  true as partnership_expansion_required,
  ro.id as representation_opportunity_id,
  ro.status as representation_opportunity_status,
  ro.verification_status as representation_verification_status,
  t.source_url,
  t.detail_url,
  t.updated_at,
  t.canonical_tender_identity
from ranked t
left join public.pppp_representation_opportunities_v1 ro
  on ro.source_key='tenderproc:' || t.canonical_tender_identity
where t.identity_rank=1;

revoke all on public.pppp_partnership_expansion_queue_v1 from public, anon;
grant select on public.pppp_partnership_expansion_queue_v1 to authenticated, service_role;

-- Explicit consumer-owned registration. The function only creates a
-- Representation analysis record after a signed-in writer calls it.
create or replace function public.pppp_register_representation_handoff_v1(
  p_tender_watch_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_tender public.kek_tender_watch%rowtype;
  v_identity text;
  v_source_key text;
  v_source text;
  v_phase text;
  v_status text;
  v_official_source text;
  v_currency text;
  v_opportunity_id uuid;
  v_created boolean := false;
begin
  if (select auth.uid()) is null then
    raise exception using errcode='42501',message='authentication_required';
  end if;
  if not (select public.can_write()) then
    raise exception using errcode='42501',message='write_permission_required';
  end if;
  if p_tender_watch_id is null then
    raise exception using errcode='22023',message='tender_watch_id_required';
  end if;

  select * into v_tender
  from public.kek_tender_watch
  where id=p_tender_watch_id;
  if not found then
    raise exception using errcode='P0002',message='tender_not_found';
  end if;
  if coalesce(v_tender.status,'new')='ignored'
     or coalesce(v_tender.payload->>'partnership_expansion_required','false')<>'true' then
    raise exception using errcode='22023',message='active_partnership_handoff_required';
  end if;

  v_identity := coalesce(
    nullif(btrim(v_tender.procurement_no),''),
    nullif(btrim(v_tender.publication_no),''),
    v_tender.source_key
  );
  v_source_key := 'tenderproc:' || v_identity;
  v_source := upper(coalesce(v_tender.payload->>'source','KRPP'));
  v_phase := lower(coalesce(v_tender.payload->>'notice_phase','opportunity'));
  v_status := case
    when v_phase='award' then 'partner_search_ready'
    when v_phase='opportunity' then 'tender_open'
    when v_phase='pipeline' then 'pipeline'
    else 'pipeline'
  end;
  v_official_source := case
    when coalesce(v_tender.detail_url,'') ~* '^https?://' then v_tender.detail_url
    when coalesce(v_tender.source_url,'') ~* '^https?://' then v_tender.source_url
    else null
  end;
  v_currency := case
    when upper(coalesce(v_tender.currency,'')) ~ '^[A-Z]{3}$' then upper(v_tender.currency)
    else null
  end;

  select id into v_opportunity_id
  from public.pppp_representation_opportunities_v1
  where source_key=v_source_key;

  if v_opportunity_id is null then
    insert into public.pppp_representation_opportunities_v1(
      source_key,project_name,funding_institution,tender_reference,official_source,
      total_project_value,currency,status,procurement_stage,tender_deadline,scope,
      verification_status,fact_evidence,last_verified_at,notes
    ) values (
      v_source_key,
      left(coalesce(nullif(btrim(v_tender.title),''),v_tender.source_key),500),
      coalesce(nullif(v_tender.payload->>'funding_institution',''),nullif(v_tender.payload->>'financier',''),v_source),
      v_identity,
      v_official_source,
      v_tender.estimated_value,
      v_currency,
      v_status,
      v_phase,
      case when v_tender.deadline is null then null else v_tender.deadline::timestamp at time zone 'Europe/Belgrade' end,
      coalesce(
        nullif(v_tender.payload->>'short_description',''),
        nullif(v_tender.payload->>'description',''),
        nullif(v_tender.fpp_description,''),
        v_tender.title
      ),
      'review',
      jsonb_build_object(
        'origin','representation_handoff',
        'source_module','mundesite',
        'tender_watch_id',v_tender.id,
        'tender_source',v_source,
        'canonical_tender_identity',v_identity,
        'latest_notice_source_key',v_tender.source_key,
        'candidate_business_routes',v_tender.payload->'candidate_business_routes',
        'partnership_routes',v_tender.payload->'partnership_routes',
        'target_creation_requires_human_approval',true,
        'registered_by',auth.uid(),
        'registered_at',now(),
        'total_project_value',jsonb_build_object('status','assumption','source',v_official_source),
        'procurement_stage',jsonb_build_object('status','assumption','source',v_official_source),
        'scope',jsonb_build_object('status','assumption','source',v_official_source)
      ),
      null,
      'Explicit handoff from Mundësitë. Representation owns subsequent analysis; no target, company, Project, contact or outbound was created.'
    )
    returning id into v_opportunity_id;
    v_created := true;
  end if;

  return jsonb_build_object(
    'ok',true,
    'opportunity_id',v_opportunity_id,
    'created',v_created,
    'source_key',v_source_key,
    'target_created',false,
    'project_created',false,
    'contact_created',false,
    'outbound_created',false,
    'human_approval_preserved',true
  );
end;
$$;

revoke all on function public.pppp_register_representation_handoff_v1(uuid)
  from public, anon;
grant execute on function public.pppp_register_representation_handoff_v1(uuid)
  to authenticated;

-- Retire legacy machine-owned Project promotion paths. Human-approved TED
-- award promotion remains a separate RPC and is intentionally untouched.
do $$
declare
  r record;
begin
  if to_regclass('cron.job') is not null then
    for r in
      select jobid from cron.job
      where jobname in ('tender-project-promotion-hourly','tender-project-promotion-v1-hourly')
    loop
      perform cron.unschedule(r.jobid);
    end loop;
  end if;
end;
$$;

revoke all on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer)
  from public, anon, authenticated, service_role;
revoke all on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer)
  from public, anon, authenticated, service_role;
grant execute on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer)
  to postgres;
grant execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer)
  to postgres;

comment on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer) is
  'Legacy admin-only reconciliation. Not callable by app/service automation; Project creation requires an explicit human-controlled bridge.';
comment on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer) is
  'Legacy admin-only reconciliation. Not callable by app/service automation; Project creation requires an explicit human-controlled bridge.';
