-- KRPP: search broadly, classify by PRISTEEL scope, expose main/review narrowly.
-- Does not alter project promotion, Gmail, supplier, pricing, contract or PO workflows.

do $guard$
begin
  if md5(pg_get_functiondef('public.pppp_future_krpp_structure_fit_v1()'::regprocedure))
       <> '72617d00bbe69a74122243e88290592b' then
    raise exception 'Concurrent change detected in pppp_future_krpp_structure_fit_v1';
  end if;
  if md5(pg_get_viewdef('public.pppp_home_procurement_alerts_v1'::regclass, true))
       <> 'ea58ec12867613c1748347b7b6e47076' then
    raise exception 'Concurrent change detected in pppp_home_procurement_alerts_v1';
  end if;
end
$guard$;

create or replace function public.pppp_classify_krpp_relevance_v2(
  p_title text,
  p_fpp text,
  p_fpp_description text,
  p_contract_type text,
  p_procedure text,
  p_payload jsonb
) returns jsonb
language plpgsql
immutable
set search_path = public
as $function$
declare
  v_text text;
  v_fpp text := regexp_replace(coalesce(p_fpp, ''), '\D', '', 'g');
  v_raw_direct boolean;
  v_structure_direct boolean;
  v_energy_context boolean;
  v_industrial_context boolean;
  v_structure_context boolean;
  v_negative boolean;
  v_layer text;
  v_score integer;
  v_category text;
  v_reason text;
begin
  v_text := regexp_replace(
    translate(lower(concat_ws(' ',
      p_title,
      p_fpp,
      p_fpp_description,
      p_contract_type,
      p_procedure,
      p_payload->>'short_description',
      p_payload->>'description',
      p_payload->>'full_description',
      p_payload->>'technical_description',
      p_payload->>'scope',
      p_payload->>'notice_summary',
      p_payload->>'object',
      p_payload->'lots',
      p_payload#>>'{dossier_analysis,analysis,steel_scope}',
      p_payload#>>'{dossier_analysis,analysis,scope_summary}',
      p_payload#>>'{dossier_analysis,analysis,technical_requirements}'
    )), 'çë', 'ce'),
    '\s+', ' ', 'g'
  );

  v_raw_direct :=
    (
      v_text ~ '(llamarin|pllak.{0,20}(celik|metal)|material.{0,20}(celik|metal)|lende e pare.{0,20}metal|profil.{0,20}(celik|metal|hekur)|shufr.{0,20}(celik|metal)|trar.{0,20}(celik|metal)|tub|gyp|pipe|coil|bobin|armatur|rebar|b500|\m(ipe|ipn|hea|heb|hem|upe|upn|unp)\M)'
      and v_text ~ '(furniz|blerj|material|produkt|lende e pare|profil|shufr|llamar|pllak|tub|gyp|pipe|trar|coil|bobin|armatur|rebar|b500)'
    )
    or v_fpp ~ '^2711';

  v_structure_direct :=
    (
      v_text ~ '(konstruks|struktur|steelwork|structural steel|hall|mbuloj|strehe|canopy|cati|platform|shkall|rrethoj|rrethim|gardh|parmak|dere|dyer|porta|grating|shtyll|rezervuar|tank|depo|tubacion|pipe rack|piperack|support|frame|ure|ura|bridge|skel)'
      and v_text ~ '(metal|celik|steel)'
    )
    or v_text ~ '(pipe rack|piperack|structural steel|steelwork|steel bridge)'
    or v_text ~ '((rezervuar|tank).{0,90}(mazut|karburant|termocentral|industrial)|(mazut|karburant|termocentral|industrial).{0,90}(rezervuar|tank))'
    or v_fpp ~ '^(44212220|44212240|44212313|44212410|44212500|45223100|45223110|45223210)';

  v_energy_context := v_text ~ '(nenstacion|substation|linj.{0,20}transmet|transmission line|lattice tower|lattice mast|shtyll.{0,20}transmet|tower|mast|gantry|rrjet.{0,20}energ)';
  v_industrial_context := v_text ~ '(transportues|conveyor|chute|hopper|silo|duct|termocentral|power plant|impiant industrial|impiant minerar|mining plant|platform.{0,20}mirembajt|industrial support|mbajtes.{0,20}industrial|mekanik.{0,20}impiant|punime mekanike|district heating|ngrohje qendrore|wastewater|ujer.{0,20}zeza|dige|dam)';
  v_structure_context := v_text ~ '(platform|walkway|catwalk|grating|shkall|stairs|handrail|parmak|rrethoj|rrethim|fence|fencing|gardh|dere|dyer|porta|mbuloj|canopy|cati|hall|warehouse|depo prefabr|konstruksion prefabr|rezervuar|tank|silo|tubacion|piping|ure|ura|bridge|footbridge|support|mbajtese|frame|skelet)';

  v_negative :=
       v_text ~ '(software|licenc|abonim|subscription|sistem informatik|aplikacion|platform.{0,50}(digjital|online|elektronik|tregt|energji|testim|nettest|inteligjenc)|platforme?.{0,50}(software|licenc|digjital|online|elektronik))'
    or v_text ~ '((makin|pajisje|vegel|aparat).{0,80}(prer|cut|sald|weld|shpim|drill).{0,50}(metal|celik|steel)|(prer|cut|sald|weld|shpim|drill).{0,50}(metal|celik|steel).{0,80}(makin|pajisje|vegel|aparat))'
    or v_text ~ '((rruge|rruga|lagj|fshat|lokacion|segment|kulle|kulla|monument|trashegimi|restaurim|konservim).{0,80}\mcelik\M|\mcelik\M.{0,80}(gjilan|rruge|rruga|lagj|fshat|lokacion|monument|trashegimi|restaurim|konservim))'
    or v_text ~ '(ventilim|klimatizim|ashensor|kushinet|bearing|gazra? (teknik|industrial)|bombol.{0,30}gaz|pelhur|thase? filtrues|filter bags)'
    or (
      v_text ~ '(renov|ripar|mirembajt|ngjyros).{0,90}(shkall|dere|dyer|parahyrje)'
      and v_text !~ '(metal|celik|steel|konstruks)'
    );

  if v_negative then
    v_layer := 'excluded';
    v_score := 0;
    v_category := 'possible';
    v_reason := 'jashtë profilit PRISTEEL sipas kontekstit';
  elsif v_raw_direct or v_structure_direct then
    v_layer := 'main';
    v_score := 86;
    v_category := case when v_structure_direct and not v_raw_direct then 'steel_structure' else 'raw_material' end;
    v_reason := case when v_structure_direct and not v_raw_direct
      then 'scope direkt PRISTEEL: strukturë/fabrikim metalik'
      else 'scope direkt PRISTEEL: furnizim me çelik/material metalik' end;
  elsif v_energy_context or v_industrial_context or v_structure_context then
    v_layer := 'review';
    v_score := 58;
    v_category := 'possible';
    v_reason := 'paketë e mundshme industriale/ndërtimore; kërkon verifikim të scope-it';
  else
    v_layer := 'excluded';
    v_score := 0;
    v_category := 'possible';
    v_reason := 'nuk ka scope të mjaftueshëm PRISTEEL';
  end if;

  return jsonb_build_object(
    'layer', v_layer,
    'score', v_score,
    'category', v_category,
    'reason', v_reason,
    'direct_evidence', v_layer = 'main',
    'review_required', v_layer = 'review',
    'version', 'krpp-authority-neutral-v2'
  );
end
$function$;

revoke all on function public.pppp_classify_krpp_relevance_v2(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.pppp_classify_krpp_relevance_v2(text,text,text,text,text,jsonb) to service_role;

create or replace function public.pppp_future_krpp_structure_fit_v1()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_source text := upper(coalesce(new.payload->>'source', 'KRPP'));
  v_result jsonb;
  v_layer text;
  v_reason text;
  v_active boolean;
  v_manual_ignore boolean := false;
  v_superseded boolean := false;
begin
  if v_source <> 'KRPP' then return new; end if;

  new.payload := coalesce(new.payload, '{}'::jsonb);
  if tg_op = 'UPDATE'
     and new.status = 'ignored'
     and old.status is distinct from 'ignored'
     and coalesce(new.payload, '{}'::jsonb) = coalesce(old.payload, '{}'::jsonb) then
    new.payload := new.payload || jsonb_build_object('krpp_manual_ignore', true, 'krpp_manual_ignore_at', now());
  elsif tg_op = 'UPDATE' and new.status <> 'ignored' and old.status = 'ignored' then
    new.payload := (new.payload - 'krpp_manual_ignore' - 'krpp_manual_ignore_at');
  end if;

  v_result := public.pppp_classify_krpp_relevance_v2(
    new.title, new.fpp, new.fpp_description, new.contract_type, new.procedure, new.payload
  );
  v_layer := v_result->>'layer';
  v_reason := v_result->>'reason';
  v_active := new.deadline is null or new.deadline >= current_date;
  v_manual_ignore := coalesce(new.payload->>'krpp_manual_ignore', 'false') = 'true';
  v_superseded := coalesce(new.payload->>'krpp_superseded_by', '') <> '';

  new.relevance_score := (v_result->>'score')::integer;
  new.category := v_result->>'category';
  new.match_reasons := array[v_reason];
  new.payload := new.payload || jsonb_build_object(
    'capability_profile_version', '2026-09-30.1',
    'capability_fit', case v_layer when 'main' then 'strong' when 'review' then 'possible' else 'weak' end,
    'capability_direct_evidence', (v_result->>'direct_evidence')::boolean,
    'capability_review_required', (v_result->>'review_required')::boolean,
    'krpp_relevance_layer', v_layer,
    'krpp_relevance_reason', v_reason,
    'krpp_relevance_version', v_result->>'version',
    'krpp_classified_at', now()
  );

  if new.project_id is null and coalesce(new.status, 'new') <> 'promoted' and not v_manual_ignore and not v_superseded then
    if not v_active or v_layer = 'excluded' then
      new.status := 'ignored';
    elsif v_layer = 'review' then
      new.status := 'review';
    elsif v_layer = 'main' and coalesce(new.status, 'new') = 'ignored' then
      new.status := 'new';
    end if;
  end if;

  return new;
end
$function$;

revoke all on function public.pppp_future_krpp_structure_fit_v1() from public, anon, authenticated;
grant execute on function public.pppp_future_krpp_structure_fit_v1() to service_role;

drop trigger if exists pppp_future_krpp_structure_fit_v1 on public.kek_tender_watch;
create trigger pppp_future_krpp_structure_fit_v1
before insert or update of title, fpp, fpp_description, contract_type, procedure, document_type,
  deadline, published_date, relevance_score, category, status, project_id, payload, first_seen_at
on public.kek_tender_watch
for each row execute function public.pppp_future_krpp_structure_fit_v1();

create or replace function public.pppp_finalize_krpp_relevance_route_v2()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_layer text;
begin
  if upper(coalesce(new.payload->>'source', 'KRPP')) <> 'KRPP' then return new; end if;
  v_layer := coalesce(new.payload->>'krpp_relevance_layer', 'excluded');
  new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
    'pristeel_relevance_gate', case v_layer when 'main' then 'strong' when 'review' then 'review' else 'not_active' end,
    'route_screening_status', case v_layer when 'main' then 'pending_business_route_screening' when 'review' then 'pending_relevance_review' else 'not_active' end,
    'human_action_required', (v_layer in ('main','review') and coalesce(new.status,'new') <> 'ignored')
  );
  return new;
end
$function$;

revoke all on function public.pppp_finalize_krpp_relevance_route_v2() from public, anon, authenticated;
grant execute on function public.pppp_finalize_krpp_relevance_route_v2() to service_role;

drop trigger if exists zz_pppp_finalize_krpp_relevance_route_v2 on public.kek_tender_watch;
create trigger zz_pppp_finalize_krpp_relevance_route_v2
before insert or update of title, fpp, fpp_description, contract_type, procedure, document_type,
  deadline, published_date, relevance_score, category, status, project_id, payload, first_seen_at
on public.kek_tender_watch
for each row execute function public.pppp_finalize_krpp_relevance_route_v2();

create or replace function public.pppp_krpp_supersede_prior_notices_v2()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if upper(coalesce(new.payload->>'source', 'KRPP')) <> 'KRPP'
     or nullif(new.procurement_no, '') is null then
    return new;
  end if;

  update public.kek_tender_watch old
     set status = 'ignored',
         payload = coalesce(old.payload, '{}'::jsonb) || jsonb_build_object(
           'krpp_superseded_by', new.id,
           'krpp_superseded_at', now()
         ),
         updated_at = greatest(old.updated_at, now())
   where old.id <> new.id
     and upper(coalesce(old.payload->>'source', 'KRPP')) = 'KRPP'
     and old.procurement_no = new.procurement_no
     and old.project_id is null
     and coalesce(old.status, 'new') <> 'promoted'
     and (
       coalesce(old.published_date, date '0001-01-01') < coalesce(new.published_date, date '0001-01-01')
       or (
         coalesce(old.published_date, date '0001-01-01') = coalesce(new.published_date, date '0001-01-01')
         and coalesce(old.first_seen_at, old.created_at) < coalesce(new.first_seen_at, new.created_at)
       )
       or (
         coalesce(old.published_date, date '0001-01-01') = coalesce(new.published_date, date '0001-01-01')
         and coalesce(old.first_seen_at, old.created_at) = coalesce(new.first_seen_at, new.created_at)
         and old.created_at < new.created_at
       )
     )
     and (
       old.status is distinct from 'ignored'
       or coalesce(old.payload->>'krpp_superseded_by', '') <> new.id::text
     );
  return new;
end
$function$;

revoke all on function public.pppp_krpp_supersede_prior_notices_v2() from public, anon, authenticated;
grant execute on function public.pppp_krpp_supersede_prior_notices_v2() to service_role;

drop trigger if exists zz_pppp_krpp_supersede_prior_notices_v2 on public.kek_tender_watch;
create trigger zz_pppp_krpp_supersede_prior_notices_v2
after insert or update of procurement_no, published_date, first_seen_at, payload
on public.kek_tender_watch
for each row execute function public.pppp_krpp_supersede_prior_notices_v2();

create or replace view public.pppp_krpp_opportunity_layers_v1
with (security_invoker = true)
as
with ranked as (
  select t.*,
    row_number() over (
      partition by coalesce(nullif(t.procurement_no, ''), t.source_key)
      order by coalesce(t.published_date, t.first_seen_at::date) desc,
               t.first_seen_at desc, t.created_at desc, t.id desc
    ) as identity_rank
  from public.kek_tender_watch t
  where upper(coalesce(t.payload->>'source', '')) = 'KRPP'
)
select
  r.id, r.created_at, r.updated_at, r.first_seen_at, r.last_seen_at,
  r.source_key, r.procurement_no, r.publication_no, r.authority, r.title,
  r.document_type, r.fpp, r.fpp_description, r.contract_type, r.contract_value_band,
  r.procedure, r.estimated_value, r.currency, r.deadline, r.published_date,
  r.is_retender, r.category, r.relevance_score, r.match_reasons, r.status,
  r.project_id, r.source_url, r.detail_url, r.payload,
  r.payload->>'krpp_relevance_layer' as relevance_layer
from ranked r
where r.identity_rank = 1
  and r.payload->>'krpp_relevance_layer' in ('main','review')
  and coalesce(r.status, 'new') not in ('ignored','closed','done','dismissed','superseded','won','lost')
  and (r.deadline is null or r.deadline >= current_date);

grant select on public.pppp_krpp_opportunity_layers_v1 to anon, authenticated, service_role;

create or replace view public.pppp_home_procurement_alerts_v1
with (security_invoker = true)
as
with tender_base as (
  select t.*,
    upper(coalesce(nullif(t.payload->>'source',''), split_part(t.source_key,':',1))) as source_name,
    coalesce(nullif(t.payload->>'notice_phase',''), 'opportunity') as notice_phase,
    row_number() over (
      partition by case
        when upper(coalesce(nullif(t.payload->>'source',''), split_part(t.source_key,':',1))) = 'KRPP'
          then 'KRPP:' || coalesce(nullif(t.procurement_no,''), t.source_key)
        else t.source_key
      end
      order by coalesce(t.published_date, t.first_seen_at::date) desc,
               t.first_seen_at desc, t.created_at desc, t.id desc
    ) as identity_rank
  from public.kek_tender_watch t
), matched as (
  select m.*
  from public.pppp_procurement_program_matches_v1 m
  join public.pppp_procurement_source_policy sp on sp.source = m.source
  join tender_base t on t.id = m.tender_watch_id
  where sp.participation_mode = 'bid'
    and sp.home_eligible = true
    and m.source <> 'TED'
    and m.home_notify_new_opportunity = true
    and coalesce(m.status,'new') not in ('closed','done','ignored','dismissed','superseded','won','lost')
    and (m.deadline is null or m.deadline >= current_date)
    and coalesce(m.published_date,m.first_seen_at::date) >= current_date - 120
    and (m.source <> 'KRPP' or (t.identity_rank = 1 and t.payload->>'krpp_relevance_layer' = 'main'))
), general_alerts as (
  select t.id as tender_watch_id, t.source_name as source, t.source_key, t.title, t.authority,
    t.document_type, t.contract_type, t.procedure, t.relevance_score, t.published_date,
    t.deadline, t.first_seen_at, t.status, t.detail_url, t.source_url, t.payload,
    sp.home_min_score
  from tender_base t
  join public.pppp_procurement_source_policy sp on sp.source = t.source_name
  where sp.participation_mode = 'bid'
    and sp.home_eligible = true
    and t.source_name <> 'TED'
    and t.notice_phase = 'opportunity'
    and coalesce(t.relevance_score,0) >= sp.home_min_score
    and coalesce(t.status,'new') not in ('closed','done','ignored','dismissed','superseded','won','lost')
    and (t.deadline is null or t.deadline >= current_date)
    and coalesce(t.published_date,t.first_seen_at::date) >= current_date - 21
    and (t.source_name <> 'KRPP' or (t.identity_rank = 1 and t.payload->>'krpp_relevance_layer' = 'main'))
    and (t.source_name = 'KRPP' or lower(coalesce(t.document_type,'')) !~ '(correction|corrigendum|amendment|erratum|korrig)')
    and not exists (select 1 from matched m where m.tender_watch_id = t.id)
)
select 'watch:' || m.tender_watch_id::text as alert_id, m.tender_watch_id, m.source,
  coalesce(m.payload->>'source_label',m.source) as source_label, m.title, m.authority,
  m.document_type, m.contract_type, m.procedure, m.published_date, m.deadline, m.first_seen_at,
  greatest(coalesce(m.relevance_score,0),m.strategic_relevance) as relevance_score,
  'tracked_program'::text as alert_kind,
  'Tender i ri që përputhet me programin ' || m.program_code || ' / ' || m.package_title as alert_reason,
  m.program_watch_id, m.program_code, m.program_title, m.package_watch_id, m.package_title,
  m.partner_research_policy, m.partner_research_required,
  coalesce(m.payload->'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor')) as entry_routes,
  coalesce(m.detail_url,m.source_url) as open_url
from matched m
union all
select 'source:' || g.tender_watch_id::text as alert_id, g.tender_watch_id, g.source,
  coalesce(g.payload->>'source_label',g.source) as source_label, g.title, g.authority,
  g.document_type, g.contract_type, g.procedure, g.published_date, g.deadline, g.first_seen_at,
  g.relevance_score, 'new_bid_opportunity'::text as alert_kind,
  'Tender i ri nga burim ku PriSteel mund të marrë pjesë; vlerëso hyrjen direkte, JV/konsorciumin, partnerin lokal ose përfaqësimin.'::text as alert_reason,
  null::uuid as program_watch_id, null::text as program_code, null::text as program_title,
  null::uuid as package_watch_id, null::text as package_title, 'dynamic'::text as partner_research_policy,
  true as partner_research_required,
  coalesce(g.payload->'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor')) as entry_routes,
  coalesce(g.detail_url,g.source_url) as open_url
from general_alerts g;

grant select on public.pppp_home_procurement_alerts_v1 to anon, authenticated, service_role;

-- Reclassify only the small existing KRPP set; no external source access is triggered.
update public.kek_tender_watch
set payload = coalesce(payload, '{}'::jsonb)
where upper(coalesce(payload->>'source', '')) = 'KRPP';

insert into public.pppp_platform_changelog(kind, summary, details, migration_name, actor, verification)
values (
  'procurement_relevance',
  'KRPP authority-neutral relevance v2: broad discovery, contextual main/review/excluded layers and canonical notice handling.',
  jsonb_build_object(
    'scope','KRPP Mundësitë only',
    'protected_workflows_changed',false,
    'classifier','krpp-authority-neutral-v2',
    'main_threshold',65,
    'review_score',58
  ),
  '20260930173000_krpp_authority_neutral_relevance_v2',
  'ChatGPT Codex',
  jsonb_build_object('status','migration_applied; live verification pending')
);
