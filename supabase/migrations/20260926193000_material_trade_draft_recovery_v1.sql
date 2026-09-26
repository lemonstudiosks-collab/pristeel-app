-- Material Trade draft recovery v1
-- New ChatGPT-bridge targets must enter the V2 qualification flow instead of
-- inheriting the legacy default. Existing sent/draft/replied history is untouched.

create or replace function public.pppp_material_trade_target_defaults_v1()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_readiness jsonb;
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
  new.contact_tier := public.pppp_outreach_contact_tier_v2(new.canonical_contact_email, new.canonical_contact_name, new.canonical_contact_role);
  new.contact_quality_score := public.pppp_outreach_contact_score_v2(new.canonical_contact_email, new.canonical_contact_name, new.canonical_contact_role);

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

revoke all on function public.pppp_material_trade_target_defaults_v1() from public, anon;
grant execute on function public.pppp_material_trade_target_defaults_v1() to authenticated, service_role;

drop trigger if exists pppp_material_trade_target_defaults_v1 on public.pppp_dach_steel_targets_v1;
create trigger pppp_material_trade_target_defaults_v1
before insert or update of score_band, procurement_timing, award_date, project_title, why_now, steel_scope, evidence,
  canonical_contact_email, canonical_contact_name, canonical_contact_role, outreach_status, personalization_facts
on public.pppp_dach_steel_targets_v1
for each row execute function public.pppp_material_trade_target_defaults_v1();

-- Repair only uncontacted rows produced after the V2 migration. The no-op
-- assignment deliberately invokes the trigger without changing source facts.
update public.pppp_dach_steel_targets_v1
set personalization_facts = coalesce(personalization_facts, '[]'::jsonb)
where outreach_engine_version = 'legacy'
  and coalesce(outreach_status, '') not in ('queued','draft_created','sent','replied')
  and target_status not in ('closed','rejected','project_promoted');

comment on function public.pppp_material_trade_target_defaults_v1() is
  'Assigns Material Trade V2 qualification defaults to new/uncontacted targets; never sends email.';
