create or replace function public.pppp_ted_company_role_v2(p_winner jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog','public'
as $$
declare
  v_winner jsonb := coalesce(p_winner,'{}'::jsonb);
  v_name text := lower(coalesce(p_winner->>'name',''));
  v_domain text := lower(coalesce(
    p_winner#>>'{contact_enrichment,organizations,0,domain}',
    p_winner->>'website',
    ''
  ));
  v_org_text text := '';
  v_text text := '';
  v_legacy text := lower(coalesce(
    p_winner->>'company_type',
    p_winner#>>'{company_classification,company_type}',
    'unknown'
  ));
  v_category text := 'other_unclear';
  v_subcategory text := 'unresolved';
  v_confidence text := 'low';
  v_outreach_model text := 'verify_company_role_before_outreach';
  v_approach text := 'Verify the company role before preparing targeted outreach.';
  v_evidence jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(v_winner#>'{contact_enrichment,organizations}')='array' then
    select lower(coalesce(string_agg(
      concat_ws(' ',
        o->>'name',
        o->>'domain',
        o->>'business_summary',
        o->>'description'
      ), ' '
    ),''))
    into v_org_text
    from jsonb_array_elements(v_winner#>'{contact_enrichment,organizations}') o;
  end if;

  v_text := lower(concat_ws(' ',v_name,v_domain,v_org_text));

  if v_name ~ '(consortium|konsortium|konsorc|consorzio|groupement|coentreprise|joint[ -]?venture|(^|[^a-z])jv([^a-z]|$)|(^|[^a-z])arge([^a-z]|$)|arbeitsgemeinschaft)' then
    v_category := 'consortium_jv';
    v_subcategory := 'joint_venture_or_consortium';
    v_confidence := 'high';
    v_outreach_model := 'identify_steel_scope_member';
    v_approach := 'Identify which consortium member owns the steel scope before targeted outreach.';
    v_evidence := jsonb_build_array('company name explicitly indicates consortium/JV');

  elsif v_text ~ '(trading|trader|(^|[^a-z])handel([^a-z]|$)|handels|distribut|stockhold|service[ -]?cent(er|re)|grosshandel|großhandel|wholesale|n[eé]goce|suministros)' then
    v_category := 'trader_distributor';
    v_subcategory := 'trader_distributor_service_center';
    v_confidence := case when v_name ~ '(trading|trader|handel|handels|distribut|stockhold|service[ -]?cent(er|re)|grosshandel|großhandel|wholesale|n[eé]goce|suministros)' then 'high' else 'medium' end;
    v_outreach_model := 'fabrication_and_processing_partner';
    v_approach := 'Approach as a material/trading company: offer fabrication, processing and project delivery support without assuming in-house fabrication.';
    v_evidence := jsonb_build_array('company evidence indicates trading/distribution/service-center activity');

  elsif v_text ~ '(stahlwerk|steel[ -]?works|steel[ -]?mill|rolling[ -]?mill|walzwerk|aci[eé]rie|siderurg|smelter|foundry|fonderie|metallurg)' then
    v_category := 'steel_mill_producer';
    v_subcategory := 'primary_steel_producer';
    v_confidence := case when v_name ~ '(stahlwerk|steel[ -]?works|steel[ -]?mill|rolling[ -]?mill|walzwerk|aci[eé]rie|siderurg|smelter|foundry|fonderie|metallurg)' then 'high' else 'medium' end;
    v_outreach_model := 'downstream_fabrication_partner';
    v_approach := 'Approach as a primary steel producer: position PRISTEEL for downstream fabrication, processing, documentation and project delivery.';
    v_evidence := jsonb_build_array('company evidence indicates primary steel production/mill activity');

  elsif v_text ~ '(fenster|window|fassad|facade|façade|verglas|glazing|glasbau|flachdach|dachbau|roof|trockenbau|drywall|tischler|carpentry|joinery|bauelemente|t[uü]renbau|door)' then
    v_category := 'specialist_contractor';
    v_subcategory := 'facade_windows_roofing_or_specialist_trade';
    v_confidence := case when v_name ~ '(fenster|window|fassad|facade|façade|verglas|glazing|glasbau|flachdach|dachbau|roof|trockenbau|drywall|tischler|carpentry|joinery|bauelemente|t[uü]renbau|door)' then 'high' else 'medium' end;
    v_outreach_model := 'specialist_scope_fabrication_support';
    v_approach := 'Approach only around the specialist package and any clearly separable fabricated-steel components.';
    v_evidence := jsonb_build_array('company evidence indicates a specialist construction trade');

  elsif v_text ~ '(stahlbau|metallbau|steel[ -]?(fabricat|construction)|structural[ -]?steel|metal[ -]?fabricat|metal[ -]?construction|charpente[^ ]*[ -]?m[eé]tall|konstrukcj[^ ]*[ -]?stal|konstrukc[^ ]*[ -]?ocel|kovov[^ ]*[ -]?konstruk|schlosserei)' then
    v_category := 'steel_fabricator';
    v_subcategory := 'structural_steel_or_metal_fabrication';
    v_confidence := case when v_name ~ '(stahlbau|metallbau|steel[ -]?(fabricat|construction)|structural[ -]?steel|metal[ -]?fabricat|metal[ -]?construction|charpente[^ ]*[ -]?m[eé]tall|konstrukcj[^ ]*[ -]?stal|konstrukc[^ ]*[ -]?ocel|kovov[^ ]*[ -]?konstruk|schlosserei)' then 'high' else 'medium' end;
    v_outreach_model := 'external_fabrication_capacity';
    v_approach := 'Approach as a steel fabricator: offer overflow/external fabrication capacity for clearly separated packages without interfering in the client relationship.';
    v_evidence := jsonb_build_array('company evidence indicates structural-steel/metal fabrication');

  elsif v_text ~ '(bauunternehmen|bauunternehmung|baugesellschaft|general[ -]?contractor|(^|[^a-z])epc([^a-z]|$)|construction|construct|entreprise[^ ]*[ -]?(g[eé]n[eé]rale|construction)|budowlan|entrepren|bygg|obras|bouwbedrijf|anlagenbau)' then
    v_category := 'gc_epc';
    v_subcategory := 'general_contractor_or_epc';
    v_confidence := case when v_name ~ '(bauunternehmen|bauunternehmung|baugesellschaft|general[ -]?contractor|(^|[^a-z])epc([^a-z]|$)|construction|construct|entreprise[^ ]*[ -]?(g[eé]n[eé]rale|construction)|budowlan|entrepren|bygg|obras|bouwbedrijf|anlagenbau)' then 'high' else 'medium' end;
    v_outreach_model := 'steel_package_subcontracting';
    v_approach := 'Approach as GC/EPC: offer PRISTEEL as a subcontractor/supplier for a defined fabricated-steel package with coordinated DAP delivery.';
    v_evidence := jsonb_build_array('company evidence indicates general-contractor/EPC activity');

  elsif v_legacy='gc_epc' then
    v_category := 'gc_epc';
    v_subcategory := 'general_contractor_or_epc';
    v_confidence := 'medium';
    v_outreach_model := 'steel_package_subcontracting';
    v_approach := 'Approach as GC/EPC, while retaining a medium-confidence verification flag.';
    v_evidence := jsonb_build_array('legacy GC/EPC classification retained as medium-confidence fallback');

  elsif v_legacy='producer' then
    v_evidence := jsonb_build_array('legacy producer classification is too broad to distinguish fabricator from mill/manufacturer');

  elsif v_legacy in ('trader_consortium','consortium_mixed') then
    v_evidence := jsonb_build_array('legacy trader/consortium bucket is intentionally not trusted without specific company evidence');
  end if;

  return jsonb_build_object(
    'version','ted-company-role-v2',
    'category',v_category,
    'subcategory',v_subcategory,
    'confidence',v_confidence,
    'evidence',v_evidence,
    'outreach_model',v_outreach_model,
    'approach',v_approach,
    'legacy_company_type',v_legacy,
    'requires_role_verification',(v_category='other_unclear')
  );
end;
$$;

create or replace view public.pppp_tender_watch_company_role_v2
with (security_invoker=true)
as
select
  k.*,
  case
    when upper(coalesce(k.payload->>'source',''))='TED'
     and coalesce(k.payload->>'notice_phase','')='award'
     and jsonb_typeof(k.payload->'winner')='object'
    then public.pppp_ted_company_role_v2(k.payload->'winner')
    else null::jsonb
  end as winner_role_v2
from public.kek_tender_watch k;

create or replace view public.pppp_ted_sales_outreach_role_v2
with (security_invoker=true)
as
select
  s.*,
  r.winner_role_v2
from public.pppp_ted_sales_outreach_v1 s
join public.pppp_tender_watch_company_role_v2 r
  on r.id=s.tender_watch_id;

grant select on public.pppp_tender_watch_company_role_v2 to anon, authenticated;
grant select on public.pppp_ted_sales_outreach_role_v2 to anon, authenticated;
