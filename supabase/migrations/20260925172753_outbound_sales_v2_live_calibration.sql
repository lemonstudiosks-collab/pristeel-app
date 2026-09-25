-- Calibrate v2 scoring to the production priority vocabulary and tighten invalid mailboxes.
create or replace function public.pppp_outreach_contact_tier_v2(
  p_email text,
  p_name text default null,
  p_role text default null
) returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  with x as (
    select lower(coalesce(p_email,'')) email,
      lower(split_part(coalesce(p_email,''),'@',1)) local_part,
      lower(coalesce(p_name,'')) person_name,
      lower(coalesce(p_role,'')) role_name
  )
  select case
    when email='' or email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then 'F'
    when split_part(email,'@',2) in ('gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','aol.com','example.com','example.org','example.net') then 'F'
    when local_part ~ '(marketing|press|presse|media|news|career|karriere|jobs?|recruit|human.?resources|^hr$|privacy|datenschutz|legal|invoice|rechnung|dummy|bieterportal)' or role_name ~ '(marketing|press|presse|media|career|karriere|recruit|human resources|personalwesen|^hr$)' then 'F'
    when local_part ~ '(einkauf|procurement|purchas|sourcing|beschaffung|ausschreibung|tender|vergabe)' then 'C'
    when local_part ~ '^(info|office|contact|kontakt|hello|mail|admin|sekretariat|zentrale|general)$' then 'E'
    when person_name<>'' and role_name ~ '(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)' then 'A'
    when person_name<>'' and role_name ~ '(project|projekt|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|manag|director|leiter)' then 'B'
    when person_name<>'' or local_part ~ '^[a-z]+[._-][a-z]+$' then 'D'
    else 'E' end
  from x;
$$;

update public.pppp_opportunity_actions
set company_fit_score=case lower(coalesce(priority,''))
  when 'urgent' then 90 when 'high' then 82 when 'larte' then 82
  when 'medium' then 70 when 'mesatare' then 70 else company_fit_score end
where outreach_engine_version='v2';

update public.pppp_opportunity_actions a
set contact_tier=public.pppp_outreach_contact_tier_v2(a.target_email,a.target_name,a.target_role),
    contact_quality_score=public.pppp_outreach_contact_score_v2(a.target_email,a.target_name,a.target_role),
    outreach_motion=case when a.timing_classification='future_supplier_qualification' then 'future_supplier_qualification' else a.outreach_motion end;

update public.pppp_opportunity_actions a
set (outreach_readiness_score,workflow_state,readiness_reasons)=(
  select (r->>'score')::integer,r->>'state',r->'reasons'
  from (select public.pppp_outreach_readiness_v2(a.company_fit_score,a.commercial_timing_score,a.contact_quality_score,a.message_evidence_score,jsonb_array_length(coalesce(a.personalization_facts,'[]'::jsonb)),false,a.cooldown_until) r) x
)
where a.outreach_engine_version='v2';

update public.pppp_dach_steel_targets_v1 t
set contact_tier=public.pppp_outreach_contact_tier_v2(t.canonical_contact_email,t.canonical_contact_name,t.canonical_contact_role),
    contact_quality_score=public.pppp_outreach_contact_score_v2(t.canonical_contact_email,t.canonical_contact_name,t.canonical_contact_role)
where t.outreach_engine_version='v2';

update public.pppp_dach_steel_targets_v1 t
set (outreach_readiness_score,workflow_state,readiness_reasons)=(
  select (r->>'score')::integer,r->>'state',r->'reasons'
  from (select public.pppp_outreach_readiness_v2(t.company_fit_score,t.commercial_timing_score,t.contact_quality_score,t.message_evidence_score,jsonb_array_length(coalesce(t.personalization_facts,'[]'::jsonb)),false,t.cooldown_until) r) x
)
where t.outreach_engine_version='v2';

