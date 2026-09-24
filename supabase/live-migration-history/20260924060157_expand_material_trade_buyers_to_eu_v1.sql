alter table public.pppp_dach_steel_targets_v1
  drop constraint if exists pppp_dach_steel_targets_v1_country_check;

alter table public.pppp_dach_steel_targets_v1
  add constraint pppp_dach_steel_targets_v1_country_check
  check (country = any (array[
    'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT',
    'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH'
  ]::text[]));

comment on table public.pppp_dach_steel_targets_v1 is
'Canonical Material Trade steel-buyer targets for EU markets, with CH retained for backward compatibility. Legacy dach_steel naming is technical only. Tier 1 prioritizes direct steel consumers/fabricators/manufacturers; Tier 2 permits construction/GC/GU only with evidence of steel procurement relevance. Discovery is independent from TED/Mundësitë.';

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
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
    'EU Material Trade Buyer Target v1 adds controlled, approved, idempotent registration of qualified EU steel-material buyers, with CH retained for backward compatibility. Tier 1 prioritizes direct steel consumers, fabricators and manufacturers; Tier 2 permits construction/GC/GU only with evidence of steel-procurement relevance. Discovery is independent from TED/Mundësitë and never creates projects, partners, contacts, outbound rows or email sends.';
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v22'::text),true);

  v := jsonb_set(
    v,
    '{purpose}',
    to_jsonb(
      replace(coalesce(v->>'purpose',''), v_old_target_purpose, v_new_target_purpose)
      || ' DACH Steel Outreach Draft v1 registers reviewed Gmail drafts into the existing shared outbound queue with exact target linkage, source guard, cooldown/preflight enforcement, and human send approval.'
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
        'LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','CH'
      ),
      'dach_steel_target_priority_model',jsonb_build_object(
        'tier_1','Direct steel consumers, steel/metal fabricators, industrial manufacturers and other recurring steel-material buyers.',
        'tier_2','Construction, GC or GU companies only when public evidence supports real steel-material procurement relevance.',
        'tier_3','Review-only when steel consumption or procurement relevance is unclear.'
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
      'Append one explicitly approved dach_steel_target command for a qualified EU Material Trade steel buyer (CH remains eligible for backward compatibility). Tier 1 direct steel consumers are preferred; Tier 2 construction/GC/GU requires steel-procurement evidence. Do not use TED/Mundësitë as discovery. Registration never creates a Project, Partner, Contact, outbound row or email send.'
    ),true
  );

  v := jsonb_set(
    v,'{global_instruction}',
    to_jsonb(
      coalesce(v->>'global_instruction','') ||
      ' For Material Trade steel-buyer discovery, legacy dach_steel_* identifiers are backward-compatible names only. Eligible geography is the EU plus CH. Prioritize Tier 1 direct steel consumers/fabricators/manufacturers; use construction/GC/GU only as Tier 2 when steel-procurement relevance is evidenced. Never use TED, Mundësitë, kek_tender_watch or tender-award tables as discovery sources for Material Trade.'
    ),true
  );

  return v;
end;
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;
