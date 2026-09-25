-- PPPP outbound sales v2: evidence-led readiness, hard contact quality gates,
-- explicit workflow states and a small human-reviewed pilot queue.

alter table public.pppp_dach_steel_targets_v1
  add column if not exists outreach_engine_version text not null default 'legacy',
  add column if not exists outreach_motion text,
  add column if not exists workflow_state text,
  add column if not exists company_fit_score integer,
  add column if not exists commercial_timing_score integer,
  add column if not exists contact_quality_score integer,
  add column if not exists message_evidence_score integer,
  add column if not exists outreach_readiness_score integer,
  add column if not exists contact_tier text,
  add column if not exists timing_classification text,
  add column if not exists canonical_contact_email text,
  add column if not exists canonical_contact_name text,
  add column if not exists canonical_contact_role text,
  add column if not exists personalization_facts jsonb not null default '[]'::jsonb,
  add column if not exists readiness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists reply_classification text,
  add column if not exists reply_evidence jsonb not null default '{}'::jsonb,
  add column if not exists cooldown_until timestamptz;

alter table public.pppp_opportunity_actions
  add column if not exists outreach_engine_version text not null default 'legacy',
  add column if not exists outreach_motion text,
  add column if not exists workflow_state text,
  add column if not exists company_fit_score integer,
  add column if not exists commercial_timing_score integer,
  add column if not exists contact_quality_score integer,
  add column if not exists message_evidence_score integer,
  add column if not exists outreach_readiness_score integer,
  add column if not exists contact_tier text,
  add column if not exists timing_classification text,
  add column if not exists target_name text,
  add column if not exists target_role text,
  add column if not exists personalization_facts jsonb not null default '[]'::jsonb,
  add column if not exists readiness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists reply_classification text,
  add column if not exists reply_evidence jsonb not null default '{}'::jsonb,
  add column if not exists cooldown_until timestamptz;

alter table public.pppp_outbound_queue_v1
  add column if not exists outreach_engine_version text not null default 'legacy',
  add column if not exists outreach_motion text,
  add column if not exists workflow_state text,
  add column if not exists company_fit_score integer,
  add column if not exists commercial_timing_score integer,
  add column if not exists contact_quality_score integer,
  add column if not exists message_evidence_score integer,
  add column if not exists outreach_readiness_score integer,
  add column if not exists contact_tier text,
  add column if not exists timing_classification text,
  add column if not exists personalization_facts jsonb not null default '[]'::jsonb,
  add column if not exists readiness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists reply_classification text,
  add column if not exists reply_evidence jsonb not null default '{}'::jsonb,
  add column if not exists delivered_at timestamptz,
  add column if not exists cooldown_until timestamptz;

alter table public.pppp_opportunity_outreach_registry_v1
  add column if not exists outreach_engine_version text not null default 'legacy',
  add column if not exists outreach_motion text,
  add column if not exists contact_tier text,
  add column if not exists outreach_readiness_score integer,
  add column if not exists personalization_facts jsonb not null default '[]'::jsonb,
  add column if not exists reply_classification text,
  add column if not exists reply_evidence jsonb not null default '{}'::jsonb,
  add column if not exists delivered_at timestamptz;

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
    select
      lower(coalesce(p_email, '')) as email,
      lower(split_part(coalesce(p_email, ''), '@', 1)) as local_part,
      lower(coalesce(p_name, '')) as person_name,
      lower(coalesce(p_role, '')) as role_name
  )
  select case
    when email = '' or email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then 'F'
    when local_part ~ '(marketing|press|presse|media|news|career|karriere|jobs?|recruit|human.?resources|^hr$|privacy|datenschutz|legal|invoice|rechnung)' or role_name ~ '(marketing|press|presse|media|career|karriere|recruit|human resources|personalwesen|^hr$)' then 'F'
    when local_part ~ '(einkauf|procurement|purchas|sourcing|beschaffung|ausschreibung|tender|vergabe)' then 'C'
    when local_part ~ '^(info|office|contact|kontakt|hello|mail|admin|sekretariat|zentrale|general)$' then 'E'
    when person_name <> '' and role_name ~ '(einkauf|procurement|purchas|sourcing|beschaffung|material|supply|buyer)' then 'A'
    when person_name <> '' and role_name ~ '(project|projekt|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|manag|director|leiter)' then 'B'
    when person_name <> '' or local_part ~ '^[a-z]+[._-][a-z]+$' then 'D'
    else 'E'
  end
  from x;
$$;

create or replace function public.pppp_outreach_contact_score_v2(
  p_email text,
  p_name text default null,
  p_role text default null
) returns integer
language sql
immutable
security invoker
set search_path = ''
as $$
  select case public.pppp_outreach_contact_tier_v2(p_email, p_name, p_role)
    when 'A' then 95 when 'B' then 82 when 'C' then 70
    when 'D' then 55 when 'E' then 25 else 0 end;
$$;

create or replace function public.pppp_outreach_readiness_v2(
  p_company_fit integer,
  p_timing integer,
  p_contact_quality integer,
  p_message_evidence integer,
  p_fact_count integer default 0,
  p_previous_contact boolean default false,
  p_cooldown_until timestamptz default null
) returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with s as (
    select
      greatest(0, least(100, coalesce(p_company_fit, 0))) company_fit,
      greatest(0, least(100, coalesce(p_timing, 0))) timing,
      greatest(0, least(100, coalesce(p_contact_quality, 0))) contact_quality,
      greatest(0, least(100, coalesce(p_message_evidence, 0))) message_evidence,
      greatest(0, coalesce(p_fact_count, 0)) fact_count
  ), r as (
    select *, round(company_fit * .32 + timing * .24 + contact_quality * .28 + message_evidence * .16)::integer as score,
      array_remove(array[
        case when company_fit < 65 then 'company_fit_below_65' end,
        case when contact_quality < 50 then 'contact_quality_below_50' end,
        case when message_evidence < 60 then 'message_evidence_below_60' end,
        case when fact_count < 2 then 'fewer_than_two_specific_facts' end,
        case when timing < 35 then 'commercial_timing_below_35' end,
        case when p_previous_contact then 'previous_contact_requires_thread_review' end,
        case when p_cooldown_until > now() then 'cooldown_active' end
      ], null) reasons
    from s
  )
  select jsonb_build_object(
    'score', score,
    'ready', cardinality(reasons) = 0,
    'state', case
      when p_previous_contact then 'thread_review'
      when p_cooldown_until > now() then 'cooldown'
      when company_fit >= 65 and contact_quality < 50 then 'strong_company_contact_gap'
      when cardinality(reasons) = 0 then 'ready_for_outreach'
      when company_fit < 65 then 'disqualified'
      else 'research_required'
    end,
    'reasons', to_jsonb(reasons),
    'weights', jsonb_build_object('company_fit', 32, 'commercial_timing', 24, 'contact_quality', 28, 'message_evidence', 16),
    'human_send_required', true
  ) from r;
$$;

create or replace function public.pppp_outreach_reply_classification_v2(
  p_subject text,
  p_snippet text
) returns jsonb
language sql
immutable
security invoker
set search_path = ''
as $$
  with x as (select lower(coalesce(p_subject, '') || ' ' || coalesce(p_snippet, '')) body), c as (
    select case
      when body ~ '(unsubscribe|abbestellen|keine weiteren|do not contact)' then 'opt_out'
      when body ~ '(falsche person|wrong person|nicht zuständig)' and body ~ '(kolleg|contact|zuständig|weitergeleitet|forward)' then 'referral'
      when body ~ '(angebot|quotation|quote|rfq|anfrage|ausschreibung|stückliste|bom)' then 'rfq_received'
      when body ~ '(interess|future|zukünftig|lieferantenliste|supplier list|qualif)' then 'future_interest'
      when body ~ '(bereits vergeben|already awarded|schon vergeben|verhandlungen|negotiations)' then 'project_already_covered'
      when body ~ '(kein interesse|not interested|no interest)' then 'not_interested'
      when body ~ '(termin|meeting|teams|call|telefon)' then 'meeting_requested'
      else 'needs_human_review'
    end as category, body from x
  )
  select jsonb_build_object(
    'category', category,
    'evidence', jsonb_build_object('subject', left(coalesce(p_subject, ''), 180), 'snippet', left(coalesce(p_snippet, ''), 320)),
    'human_review_required', true
  ) from c;
$$;

revoke all on function public.pppp_outreach_contact_tier_v2(text,text,text) from public, anon;
revoke all on function public.pppp_outreach_contact_score_v2(text,text,text) from public, anon;
revoke all on function public.pppp_outreach_readiness_v2(integer,integer,integer,integer,integer,boolean,timestamptz) from public, anon;
revoke all on function public.pppp_outreach_reply_classification_v2(text,text) from public, anon;
grant execute on function public.pppp_outreach_contact_tier_v2(text,text,text) to authenticated, service_role;
grant execute on function public.pppp_outreach_contact_score_v2(text,text,text) to authenticated, service_role;
grant execute on function public.pppp_outreach_readiness_v2(integer,integer,integer,integer,integer,boolean,timestamptz) to authenticated, service_role;
grant execute on function public.pppp_outreach_reply_classification_v2(text,text) to authenticated, service_role;

-- Existing communications remain legacy. Only uncontacted candidates enter v2.
update public.pppp_dach_steel_targets_v1 t
set
  outreach_engine_version = case when coalesce(t.outreach_status, '') in ('sent','replied','draft_created') then 'legacy' else 'v2' end,
  outreach_motion = coalesce(t.outreach_motion, 'material_buyer'),
  canonical_contact_email = coalesce(t.canonical_contact_email, (select oq.recipient_email from public.pppp_outbound_queue_v1 oq where oq.source_record_id=t.id order by coalesce(oq.sent_at,oq.updated_at,oq.created_at) desc limit 1)),
  canonical_contact_name = coalesce(t.canonical_contact_name, (select oq.recipient_name from public.pppp_outbound_queue_v1 oq where oq.source_record_id=t.id order by coalesce(oq.sent_at,oq.updated_at,oq.created_at) desc limit 1)),
  canonical_contact_role = coalesce(t.canonical_contact_role, (select oq.contact_role from public.pppp_outbound_queue_v1 oq where oq.source_record_id=t.id order by coalesce(oq.sent_at,oq.updated_at,oq.created_at) desc limit 1)),
  company_fit_score = coalesce(t.company_fit_score, case upper(coalesce(t.score_band,'')) when 'A1' then 92 when 'A2' then 82 when 'B1' then 72 else 58 end),
  commercial_timing_score = coalesce(t.commercial_timing_score, case when lower(coalesce(t.procurement_timing,'')) ~ '(now|current|immediate|active|0.?3)' then 85 when t.award_date >= current_date - 120 then 65 when t.project_title is not null then 50 else 35 end),
  timing_classification = coalesce(t.timing_classification, case when lower(coalesce(t.procurement_timing,'')) ~ '(now|current|immediate|active|0.?3)' then 'active_procurement' when t.award_date >= current_date - 120 then 'post_award_window' when t.project_title is not null then 'future_supplier_qualification' else 'unknown' end),
  personalization_facts = case
    when jsonb_array_length(coalesce(t.personalization_facts,'[]'::jsonb)) >= 2 then t.personalization_facts
    when nullif(t.project_title,'') is not null and nullif(t.why_now,'') is not null then jsonb_build_array(t.project_title,t.why_now)
    when nullif(t.project_title,'') is not null then jsonb_build_array(t.project_title)
    when nullif(t.why_now,'') is not null then jsonb_build_array(t.why_now)
    else '[]'::jsonb end,
  message_evidence_score = coalesce(t.message_evidence_score, case when t.project_title is not null and t.why_now is not null then 78 when jsonb_array_length(coalesce(t.evidence,'[]'::jsonb)) >= 2 then 70 else 35 end);

-- Also backfill targets that do not yet have a queue row.
update public.pppp_dach_steel_targets_v1 t
set
  outreach_engine_version = case when coalesce(t.outreach_status, '') in ('sent','replied','draft_created') then 'legacy' else 'v2' end,
  outreach_motion = coalesce(t.outreach_motion, 'material_buyer'),
  company_fit_score = coalesce(t.company_fit_score, case upper(coalesce(t.score_band,'')) when 'A1' then 92 when 'A2' then 82 when 'B1' then 72 else 58 end),
  commercial_timing_score = coalesce(t.commercial_timing_score, case when lower(coalesce(t.procurement_timing,'')) ~ '(now|current|immediate|active|0.?3)' then 85 when t.award_date >= current_date - 120 then 65 when t.project_title is not null then 50 else 35 end),
  timing_classification = coalesce(t.timing_classification, case when lower(coalesce(t.procurement_timing,'')) ~ '(now|current|immediate|active|0.?3)' then 'active_procurement' when t.award_date >= current_date - 120 then 'post_award_window' when t.project_title is not null then 'future_supplier_qualification' else 'unknown' end),
  personalization_facts = case
    when jsonb_array_length(coalesce(t.personalization_facts,'[]'::jsonb)) >= 2 then t.personalization_facts
    when nullif(t.project_title,'') is not null and nullif(t.why_now,'') is not null then jsonb_build_array(t.project_title,t.why_now)
    when nullif(t.project_title,'') is not null then jsonb_build_array(t.project_title)
    when nullif(t.why_now,'') is not null then jsonb_build_array(t.why_now)
    else '[]'::jsonb end,
  message_evidence_score = coalesce(t.message_evidence_score, case when t.project_title is not null and t.why_now is not null then 78 when jsonb_array_length(coalesce(t.evidence,'[]'::jsonb)) >= 2 then 70 else 35 end)
where t.company_fit_score is null or t.outreach_motion is null;

update public.pppp_dach_steel_targets_v1 t
set
  contact_tier = public.pppp_outreach_contact_tier_v2(t.canonical_contact_email, t.canonical_contact_name, t.canonical_contact_role),
  contact_quality_score = public.pppp_outreach_contact_score_v2(t.canonical_contact_email, t.canonical_contact_name, t.canonical_contact_role);

update public.pppp_dach_steel_targets_v1 t
set (outreach_readiness_score,workflow_state,readiness_reasons) = (
  select (r->>'score')::integer,
    case when t.outreach_engine_version='legacy' then coalesce(nullif(t.outreach_status,''),'legacy') else r->>'state' end,
    r->'reasons'
  from (select public.pppp_outreach_readiness_v2(t.company_fit_score,t.commercial_timing_score,t.contact_quality_score,t.message_evidence_score,jsonb_array_length(coalesce(t.personalization_facts,'[]'::jsonb)),coalesce(t.outreach_status,'') in ('sent','replied','draft_created'),t.cooldown_until) r) x
);

update public.pppp_opportunity_actions a
set
  outreach_engine_version = case when exists (select 1 from public.pppp_opportunity_outreach_registry_v1 r where r.action_id=a.id and r.status in ('draft_created','sent','replied')) then 'legacy' else 'v2' end,
  outreach_motion = coalesce(a.outreach_motion, case when lower(coalesce(a.action_type,'')) like '%producer%' then 'future_supplier_qualification' else 'awarded_project_gc' end),
  target_name = coalesce(a.target_name, nullif(a.payload->>'contact_name','')),
  target_role = coalesce(a.target_role, nullif(a.payload->>'contact_role','')),
  company_fit_score = coalesce(a.company_fit_score, case lower(coalesce(a.priority,'')) when 'urgent' then 90 when 'high' then 82 when 'medium' then 70 else 58 end),
  commercial_timing_score = coalesce(a.commercial_timing_score, case when a.due_date >= current_date then 82 when a.created_at >= now()-interval '120 days' then 60 else 38 end),
  timing_classification = coalesce(a.timing_classification, case when a.due_date >= current_date then 'active_procurement' when a.created_at >= now()-interval '120 days' then 'post_award_window' else 'future_supplier_qualification' end),
  personalization_facts = case
    when jsonb_array_length(coalesce(a.personalization_facts,'[]'::jsonb)) >= 2 then a.personalization_facts
    when nullif(a.payload->>'project_title','') is not null and nullif(a.draft_brief,'') is not null then jsonb_build_array(a.payload->>'project_title',a.draft_brief)
    when nullif(a.payload->>'project_title','') is not null then jsonb_build_array(a.payload->>'project_title')
    when nullif(a.draft_brief,'') is not null then jsonb_build_array(a.draft_brief)
    else '[]'::jsonb end,
  message_evidence_score = coalesce(a.message_evidence_score, case when nullif(a.payload->>'project_title','') is not null and nullif(a.draft_brief,'') is not null then 78 when nullif(a.subject_hint,'') is not null and nullif(a.draft_brief,'') is not null then 68 else 35 end);

update public.pppp_opportunity_actions a
set
  contact_tier = public.pppp_outreach_contact_tier_v2(a.target_email, a.target_name, a.target_role),
  contact_quality_score = public.pppp_outreach_contact_score_v2(a.target_email, a.target_name, a.target_role);

update public.pppp_opportunity_actions a
set (outreach_readiness_score,workflow_state,readiness_reasons) = (
  select (r->>'score')::integer,
    case when a.outreach_engine_version='legacy' then coalesce(nullif(a.status,''),'legacy') else r->>'state' end,
    r->'reasons'
  from (select public.pppp_outreach_readiness_v2(a.company_fit_score,a.commercial_timing_score,a.contact_quality_score,a.message_evidence_score,jsonb_array_length(coalesce(a.personalization_facts,'[]'::jsonb)),exists (select 1 from public.pppp_opportunity_outreach_registry_v1 x where x.action_id=a.id and x.status in ('draft_created','sent','replied')),a.cooldown_until) r) x
);

update public.pppp_outbound_queue_v1 q
set
  outreach_engine_version = coalesce(nullif(q.payload->>'outreach_engine_version',''), 'legacy'),
  contact_tier = public.pppp_outreach_contact_tier_v2(q.recipient_email, q.recipient_name, q.contact_role),
  contact_quality_score = public.pppp_outreach_contact_score_v2(q.recipient_email, q.recipient_name, q.contact_role),
  workflow_state = case when q.replied_at is not null then 'replied' when q.sent_at is not null then 'sent' when q.gmail_draft_id is not null then 'draft_created' else coalesce(q.workflow_state,'queued') end,
  delivered_at = coalesce(q.delivered_at, case when q.sent_at is not null and q.bounced_at is null then q.sent_at end);

update public.pppp_opportunity_outreach_registry_v1 r
set
  outreach_engine_version = coalesce(nullif(r.payload->>'outreach_engine_version',''), 'legacy'),
  contact_tier = public.pppp_outreach_contact_tier_v2(r.recipient_email, r.recipient_name, r.payload->>'contact_role'),
  delivered_at = coalesce(r.delivered_at, r.sent_at);

create or replace view public.pppp_outreach_v2_workbench_v1
with (security_invoker = true)
as
select
  'material_trade'::text channel,
  'dach_target'::text source_type,
  t.id source_id,
  t.source_key,
  t.company_name,
  coalesce(t.why_now, t.buyer_type) why_company,
  coalesce(t.procurement_timing, t.why_now) commercial_signal,
  t.project_title,
  t.canonical_contact_email contact_email,
  t.canonical_contact_name contact_name,
  t.canonical_contact_role contact_role,
  t.contact_tier,
  t.contact_quality_score,
  t.company_fit_score,
  t.commercial_timing_score,
  t.message_evidence_score,
  t.outreach_readiness_score,
  t.outreach_motion,
  t.timing_classification,
  t.workflow_state,
  t.personalization_facts,
  t.readiness_reasons,
  t.outreach_engine_version,
  t.reply_classification,
  t.reply_evidence,
  q.sent_at last_contact_at,
  q.replied_at,
  q.bounced_at,
  q.gmail_thread_id,
  t.project_id,
  coalesce(t.next_action, case
    when t.workflow_state='strong_company_contact_gap' then 'Find or improve procurement contact'
    when t.workflow_state='ready_for_outreach' then 'Review evidence-led draft'
    when t.workflow_state='thread_review' then 'Open Gmail thread'
    else 'Research evidence and timing' end) next_action,
  true human_send_required
from public.pppp_dach_steel_targets_v1 t
left join lateral (
  select oq.sent_at, oq.replied_at, oq.bounced_at, oq.gmail_thread_id
  from public.pppp_outbound_queue_v1 oq where oq.source_record_id=t.id
  order by coalesce(oq.sent_at,oq.updated_at,oq.created_at) desc limit 1
) q on true
union all
select
  'ted_awarded'::text channel,
  'opportunity_action'::text source_type,
  a.id source_id,
  a.action_key source_key,
  a.target_company company_name,
  coalesce(a.payload->>'why_company', a.draft_brief) why_company,
  coalesce(a.payload->>'commercial_signal', a.subject_hint) commercial_signal,
  a.payload->>'project_title' project_title,
  a.target_email contact_email,
  a.target_name contact_name,
  a.target_role contact_role,
  a.contact_tier,
  a.contact_quality_score,
  a.company_fit_score,
  a.commercial_timing_score,
  a.message_evidence_score,
  a.outreach_readiness_score,
  a.outreach_motion,
  a.timing_classification,
  a.workflow_state,
  a.personalization_facts,
  a.readiness_reasons,
  a.outreach_engine_version,
  a.reply_classification,
  a.reply_evidence,
  r.sent_at last_contact_at,
  case when r.status='replied' then r.updated_at end replied_at,
  null::timestamptz bounced_at,
  r.gmail_thread_id,
  a.project_id,
  case
    when a.workflow_state='strong_company_contact_gap' then 'Find or improve procurement contact'
    when a.workflow_state='ready_for_outreach' then 'Review evidence-led draft'
    when r.gmail_thread_id is not null then 'Open Gmail thread'
    when a.timing_classification='future_supplier_qualification' then 'Qualify for future supplier list'
    else 'Research evidence and timing' end next_action,
  true human_send_required
from public.pppp_opportunity_actions a
left join lateral (
  select x.sent_at,x.updated_at,x.status,x.gmail_thread_id
  from public.pppp_opportunity_outreach_registry_v1 x where x.action_id=a.id
  order by coalesce(x.sent_at,x.updated_at,x.created_at) desc limit 1
) r on true
where a.action_type in ('gc_contact_research','gc_project_outreach_draft','producer_contact_research','producer_capacity_outreach_draft','consortium_member_review','consortium_project_outreach_draft','general_project_outreach_draft','manual_tender_outreach_draft');

create or replace view public.pppp_outreach_v2_pilot_queue_v1
with (security_invoker = true)
as
select *
from public.pppp_outreach_v2_workbench_v1
where outreach_engine_version='v2'
  and workflow_state='ready_for_outreach'
  and contact_quality_score >= 50
  and message_evidence_score >= 60
  and jsonb_array_length(coalesce(personalization_facts,'[]'::jsonb)) >= 2
  and last_contact_at is null
order by outreach_readiness_score desc, company_fit_score desc
limit 25;

create or replace view public.pppp_outreach_v2_funnel_v1
with (security_invoker = true)
as
select
  channel,
  outreach_engine_version,
  count(*) discovered,
  count(*) filter (where company_fit_score >= 65) qualified,
  count(*) filter (where contact_email is not null) contact_found,
  count(*) filter (where contact_tier in ('A','B')) named_decision_maker,
  count(*) filter (where workflow_state='ready_for_outreach') ready_for_outreach,
  count(*) filter (where workflow_state='draft_created') drafted,
  count(*) filter (where last_contact_at is not null) sent,
  count(*) filter (where last_contact_at is not null and bounced_at is null) delivered,
  count(*) filter (where replied_at is not null or reply_classification is not null) replied,
  count(*) filter (where reply_classification in ('future_interest','meeting_requested')) positive_replies,
  count(*) filter (where reply_classification='referral') referrals,
  count(*) filter (where reply_classification='rfq_received') rfqs,
  count(*) filter (where project_id is not null) projects_created
from public.pppp_outreach_v2_workbench_v1
group by channel, outreach_engine_version;

create or replace view public.pppp_outreach_v2_deliverability_v1
with (security_invoker = true)
as
select
  case when source='dach_steel_target' then 'material_trade' else 'ted_awarded' end channel,
  outreach_engine_version,
  count(*) total_records,
  count(*) filter (where sent_at is not null) sent,
  count(*) filter (where delivered_at is not null) delivered,
  count(*) filter (where bounced_at is not null) bounced,
  count(*) filter (where replied_at is not null) replied,
  round(100.0 * count(*) filter (where bounced_at is not null) / nullif(count(*) filter (where sent_at is not null),0), 1) bounce_rate_pct,
  round(100.0 * count(*) filter (where replied_at is not null) / nullif(count(*) filter (where delivered_at is not null),0), 1) reply_rate_pct
from public.pppp_outbound_queue_v1
group by 1,2;

create or replace view public.pppp_outreach_pattern_library_v2
with (security_invoker = true)
as
select * from (values
  ('RSB','material_buyer','Named purchasing contact + certifications/capacity + DAP question','A concrete first exchange can progress into real RFQs.'),
  ('KROPP','material_buyer','Named Einkauf contact + project-specific basis and optimized alternative','Specific scope and a commercial option create a useful buying conversation.'),
  ('B+H Bau','future_supplier_qualification','Named commercial contact + awarded project context + low-friction future-supplier CTA','When the current package is already in negotiation, switch to future qualification.'),
  ('ROLEFF','awarded_project_gc','Named decision-maker + verified project fact + precise steel relevance','Project context must be verified before requesting a conversation.')
) as v(company_reference,outreach_motion,reusable_pattern,lesson);

revoke all on public.pppp_outreach_v2_workbench_v1 from public, anon;
revoke all on public.pppp_outreach_v2_pilot_queue_v1 from public, anon;
revoke all on public.pppp_outreach_v2_funnel_v1 from public, anon;
revoke all on public.pppp_outreach_v2_deliverability_v1 from public, anon;
revoke all on public.pppp_outreach_pattern_library_v2 from public, anon;
grant select on public.pppp_outreach_v2_workbench_v1 to authenticated, service_role;
grant select on public.pppp_outreach_v2_pilot_queue_v1 to authenticated, service_role;
grant select on public.pppp_outreach_v2_funnel_v1 to authenticated, service_role;
grant select on public.pppp_outreach_v2_deliverability_v1 to authenticated, service_role;
grant select on public.pppp_outreach_pattern_library_v2 to authenticated, service_role;

comment on view public.pppp_outreach_v2_pilot_queue_v1 is 'Maximum 25 evidence-ready, contact-qualified prospects. Read-only; draft creation remains an explicit human action and sending is never automatic.';

