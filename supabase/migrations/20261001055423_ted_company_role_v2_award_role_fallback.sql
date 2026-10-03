create or replace function public.pppp_ted_company_role_context_v2(p_winner jsonb, p_award_role jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'pg_catalog','public'
as $$
declare
  v_role jsonb := public.pppp_ted_company_role_v2(p_winner);
  v_award_type text := lower(coalesce(p_award_role->>'type',''));
  v_award_conf text := lower(coalesce(p_award_role->>'confidence',''));
begin
  if coalesce(v_role->>'category','other_unclear')='other_unclear'
     and v_award_type='gc_epc'
     and v_award_conf in ('medium','high') then
    return v_role || jsonb_build_object(
      'category','gc_epc',
      'subcategory','general_contractor_or_epc',
      'confidence',v_award_conf,
      'outreach_model','steel_package_subcontracting',
      'approach','Approach as GC/EPC: offer PRISTEEL as a subcontractor/supplier for a defined fabricated-steel package with coordinated DAP delivery.',
      'evidence',jsonb_build_array('TED award-role evidence identifies GC/EPC with '||v_award_conf||' confidence'),
      'requires_role_verification',false
    );
  end if;
  return v_role;
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
    then public.pppp_ted_company_role_context_v2(k.payload->'winner',coalesce(k.payload->'award_role','{}'::jsonb))
    else null::jsonb
  end as winner_role_v2
from public.kek_tender_watch k;

grant select on public.pppp_tender_watch_company_role_v2 to anon, authenticated;
