-- Material Trade defaults contact unification v1
-- Keeps the target-table BEFORE trigger aligned with the unified Material Trade contact grader.

create or replace function public.pppp_material_trade_target_defaults_v1()
returns trigger
language plpgsql
set search_path to ''
as $$
declare
  v_readiness jsonb;
  v_contact_grade jsonb;
begin
  if coalesce(new.outreach_status, '') in ('queued','draft_created','sent','replied') then
    return new;
  end if;

  new.outreach_engine_version := 'v2';
  new.outreach_motion := coalesce(nullif(new.outreach_motion, ''), 'material_buyer');
  new.company_fit_score := coalesce(new.company_fit_score,
    case upper(coalesce(new.score_band, '')) when 'A1' then 92 when 'A2' then 82 when 'B1' then 72 else 58 end);
  new.commercial_timing_score := coalesce(new.commercial_timing_score,
    case
      when lower(coalesce(new.procurement_timing, '')) ~ '(now|current|immediate|active|0.?3)' then 85
      when new.award_date >= current_date - 120 then 65
      when nullif(new.project_title, '') is not null then 50
      else 35
    end);
  new.timing_classification := coalesce(nullif(new.timing_classification, ''),
    case
      when lower(coalesce(new.procurement_timing, '')) ~ '(now|current|immediate|active|0.?3)' then 'active_procurement'
      when new.award_date >= current_date - 120 then 'post_award_window'
      when nullif(new.project_title, '') is not null then 'future_supplier_qualification'
      else 'unknown'
    end);
  new.personalization_facts := case
    when jsonb_array_length(coalesce(new.personalization_facts, '[]'::jsonb)) >= 2 then new.personalization_facts
    when nullif(new.project_title, '') is not null and nullif(new.why_now, '') is not null then jsonb_build_array(new.project_title, new.why_now)
    when nullif(new.why_now, '') is not null and nullif(new.steel_scope, '') is not null then jsonb_build_array(new.why_now, new.steel_scope)
    when nullif(new.project_title, '') is not null and nullif(new.steel_scope, '') is not null then jsonb_build_array(new.project_title, new.steel_scope)
    when nullif(new.why_now, '') is not null then jsonb_build_array(new.why_now)
    when nullif(new.steel_scope, '') is not null then jsonb_build_array(new.steel_scope)
    else '[]'::jsonb
  end;
  new.message_evidence_score := coalesce(new.message_evidence_score,
    case
      when jsonb_array_length(coalesce(new.personalization_facts, '[]'::jsonb)) >= 2 then 78
      when jsonb_array_length(coalesce(new.evidence, '[]'::jsonb)) >= 2 then 70
      else 35
    end);

  v_contact_grade := public.pppp_dach_steel_contact_grade_v1(
    new.canonical_contact_email,
    new.canonical_contact_name,
    new.canonical_contact_role,
    new.company_domain
  );
  new.contact_tier := coalesce(nullif(v_contact_grade->>'tier',''),'F');
  new.contact_quality_score := coalesce((v_contact_grade->>'score')::integer,0);

  v_readiness := public.pppp_outreach_readiness_v2(
    new.company_fit_score,
    new.commercial_timing_score,
    new.contact_quality_score,
    new.message_evidence_score,
    jsonb_array_length(coalesce(new.personalization_facts, '[]'::jsonb)),
    false,
    new.cooldown_until
  );
  new.outreach_readiness_score := (v_readiness->>'score')::integer;
  new.workflow_state := v_readiness->>'state';
  new.readiness_reasons := coalesce(v_readiness->'reasons', '[]'::jsonb);
  return new;
end;
$$;
