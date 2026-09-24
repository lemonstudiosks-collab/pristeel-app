alter table public.pppp_dach_steel_targets_v1
  drop constraint if exists pppp_dach_steel_targets_v1_country_check;

alter table public.pppp_dach_steel_targets_v1
  add constraint pppp_dach_steel_targets_v1_country_check
  check (country = any (array[
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
    'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH','ME','RS'
  ]::text[]));

comment on table public.pppp_dach_steel_targets_v1 is
'Canonical Material Trade steel-buyer targets for EU markets plus CH, ME and RS. Legacy dach_steel naming is technical only. Tier 1 prioritizes direct steel consumers/fabricators/manufacturers; Tier 2 permits construction/GC/GU only with evidence of steel procurement relevance. Discovery is independent from TED/Mundësitë.';

create or replace view public.pppp_dach_steel_home_summary_v1
with (security_invoker = true)
as
with active as (
  select
    t.*,
    (
      t.contact_status in ('found','verified')
      or coalesce(t.evidence,'[]'::jsonb)::text ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
    ) as has_resolved_contact
  from public.pppp_dach_steel_targets_v1 t
  where t.target_status not in ('closed','rejected','project_promoted')
    and t.project_id is null
    and (t.source_key like 'eu:%' or t.source_key like 'mt:%')
),
hot as (
  select id, company_name, project_title, quote_readiness, why_now, estimated_tonnes, procurement_timing
  from active
  order by
    case score_band when 'A1' then 1 when 'A2' then 2 when 'B1' then 3 when 'B2' then 4 else 5 end,
    case quote_readiness when 'M3' then 1 when 'M2' then 2 when 'M1' then 3 else 4 end,
    case target_status when 'active' then 1 when 'contact_ready' then 2 when 'qualified' then 3 else 4 end,
    next_action_due, updated_at desc
  limit 1
),
outbound as (
  select
    count(*) filter (where q.sent_at is not null or q.status='sent')::int as sent,
    count(*) filter (where q.replied_at is not null or q.status='replied')::int as replies
  from public.pppp_outbound_queue_v1 q
  join active a on a.id=q.source_record_id
  where q.source='DACH_STEEL_BUYER'
)
select
  (select count(*)::int from active) as targets,
  (select count(*)::int from active where score_band='A1') as a1_targets,
  (select count(*)::int from active where quote_readiness='M3') as quote_ready,
  (select count(*)::int from active where not has_resolved_contact) as needs_contact,
  (select count(*)::int from active
    where has_resolved_contact
      and outreach_status in ('not_ready','ready','queued')) as ready_for_outreach,
  coalesce((select sent from outbound),0) as sent,
  coalesce((select replies from outbound),0) as replies,
  coalesce((select round(sum(estimated_tonnes),3) from active where estimated_tonnes is not null),0::numeric) as identified_tonnes,
  (select id from hot) as hot_target_id,
  (select company_name from hot) as hot_company_name,
  (select project_title from hot) as hot_project_title,
  (select quote_readiness from hot) as hot_quote_readiness,
  (select why_now from hot) as hot_why_now,
  (select estimated_tonnes from hot) as hot_estimated_tonnes,
  (select procurement_timing from hot) as hot_procurement_timing,
  now() as calculated_at;

revoke all on public.pppp_dach_steel_home_summary_v1 from anon;
grant select on public.pppp_dach_steel_home_summary_v1 to authenticated, service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v23()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v jsonb := public.pppp_chatgpt_bridge_manifest_v21();
  v_old_target_purpose text :=
    'DACH Steel Buyer Target v1 adds controlled, approved, idempotent registration of qualified DE/AT/CH direct steel-supply targets and compact evidence-backed Material Intelligence without creating projects, partners, contacts, outbound rows or email sends.';
  v_new_target_purpose text :=
    'Material Trade Buyer Target v1 adds controlled, approved, idempotent registration of qualified steel-material buyers across EU markets plus CH, ME and RS. Tier 1 prioritizes direct steel consumers, fabricators and manufacturers; Tier 2 permits construction/GC/GU only with evidence of steel-procurement relevance. Discovery is independent from TED/Mundësitë and never creates projects, partners, contacts, outbound rows or email sends.';
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v23'::text),true);

  v := jsonb_set(
    v,
    '{purpose}',
    to_jsonb(
      replace(coalesce(v->>'purpose',''), v_old_target_purpose, v_new_target_purpose)
      || ' DACH Steel Outreach Draft v1 registers reviewed Gmail drafts into the existing shared outbound queue with exact target linkage, source guard, cooldown/preflight enforcement, and human send approval.'
      || ' Material Trade project promotion is a human-confirmed PPPP UI action available only after canonical buyer reply evidence; it creates a trading project idempotently, links the target to the new project, and removes the promoted target from the Material Trade operating queue.'
    ),
    true
  );

  v := jsonb_set(v,'{allowed_action_types}',coalesce(v->'allowed_action_types','[]'::jsonb) || '["dach_steel_outreach_draft"]'::jsonb,true);
  v := jsonb_set(v,'{service_write_functions}',coalesce(v->'service_write_functions','[]'::jsonb) || '["public.pppp_chatgpt_register_dach_steel_outreach_draft_v1(text,jsonb,text,jsonb)"]'::jsonb,true);

  v := jsonb_set(
    v,'{write_protocol}',
    coalesce(v->'write_protocol','{}'::jsonb) || jsonb_build_object(
      'dach_steel_target_market_scope',jsonb_build_array(
        'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
        'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH','ME','RS'
      ),
      'material_trade_source_key_prefixes',jsonb_build_array('eu:','mt:'),
      'material_trade_new_source_key_format','Use mt:<country-code-lowercase>:<official-domain> for new discoveries. Existing eu:* keys remain valid and must not be rewritten.',
      'dach_steel_target_priority_model',jsonb_build_object(
        'tier_1','Direct steel consumers, steel/metal fabricators, industrial manufacturers and other recurring steel-material buyers.',
        'tier_2','Construction, GC or GU companies only when public evidence supports real steel-material procurement relevance.',
        'tier_3','Review-only when steel consumption or procurement relevance is unclear.'
      ),
      'material_trade_outreach_language_policy',jsonb_build_object(
        'de','DE, AT, CH',
        'bcs','HR, ME, RS; Latin script / neutral Serbo-Croatian wording',
        'en','All other eligible countries'
      ),
      'material_trade_project_promotion',jsonb_build_object(
        'automatic',false,
        'reply_evidence_required',true,
        'human_confirmation_required',true,
        'project_business_type','trading',
        'project_deal_type','trading',
        'target_status_after_success','project_promoted',
        'operational_result','Promoted target leaves Material Trade queue and continues in Projects'
      ),
      'dach_steel_target_discovery_excludes_ted',true,
      'dach_steel_target_discovery_excludes_opportunities',true,
      'dach_steel_target_legacy_name_note','dach_steel_* identifiers are retained for backward compatibility; they no longer imply DACH-only geography.',
      'dach_steel_outreach_draft_transport','Create/review a Gmail draft first. Then append one approved dach_steel_outreach_draft command with the exact target_source_key, recipient and Gmail draft identity. The trusted worker registers it in shared pppp_outbound_queue_v1 only; it never sends.',
      'dach_steel_outreach_draft_safe_value_json_fields',jsonb_build_array(
        'target_source_key','recipient_email','recipient_name','contact_role',
        'gmail_draft_id','gmail_draft_message_id','gmail_thread_id','subject','approach_mode'
      ),
      'dach_steel_outreach_draft_modes',jsonb_build_array('rfq_request','direct_offer'),
      'dach_steel_outreach_draft_never_sends_email',true,
      'dach_steel_outreach_draft_uses_shared_outbound',true,
      'dach_steel_outreach_draft_requires_human_send_approval',true
    ),true
  );

  v := jsonb_set(
    v,'{operator_shorthand}',
    coalesce(v->'operator_shorthand','{}'::jsonb) || jsonb_build_object(
      'regjistro Steel Buyer target në PPPP',
      'Append one explicitly approved dach_steel_target command for a qualified Material Trade steel buyer in EU + CH + ME + RS. Tier 1 direct steel consumers are preferred; Tier 2 construction/GC/GU requires steel-procurement evidence. Do not use TED/Mundësitë as discovery. Registration never creates a Project, Partner, Contact, outbound row or email send.'
    ),true
  );

  v := jsonb_set(
    v,'{global_instruction}',
    to_jsonb(
      coalesce(v->>'global_instruction','') ||
      ' For Material Trade steel-buyer discovery, legacy dach_steel_* identifiers are backward-compatible names only. Eligible geography is EU + CH + ME + RS. New discoveries should use stable source_key mt:<country-code-lowercase>:<official-domain>; existing eu:* keys remain valid. Prioritize Tier 1 direct steel consumers/fabricators/manufacturers; use construction/GC/GU only as Tier 2 when steel-procurement relevance is evidenced. Never use TED, Mundësitë, kek_tender_watch or tender-award tables as discovery sources for Material Trade. Buyer outreach language is German for DE/AT/CH, neutral Serbo-Croatian in Latin script for HR/ME/RS, and English for all other eligible countries. A Material Trade target may become a Project only after canonical buyer reply/RFQ evidence and explicit human confirmation in PPPP; promotion is never automatic.'
    ),true
  );

  return v;
end;
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v23() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v23() to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select public.pppp_chatgpt_bridge_manifest_v23();
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;
