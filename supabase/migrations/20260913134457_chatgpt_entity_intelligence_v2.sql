-- Add a backwards-compatible entity intelligence surface that preserves
-- canonical v1 truth while attaching raw email evidence as a strictly read-only,
-- evidence-only layer. Raw evidence never creates roles, project links, tasks or
-- protected commercial decisions.

create or replace function public.pppp_chatgpt_entity_intelligence_v2(
  p_query text,
  p_limit integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with canonical as (
  select public.pppp_chatgpt_entity_intelligence_v1(p_query,p_limit) as j
), raw as (
  select public.pppp_chatgpt_email_entity_evidence_v1(p_query,p_limit) as j
), metrics as (
  select
    coalesce((c.j#>>'{match_counts,partners}')::int,0) as partners,
    coalesce((c.j#>>'{match_counts,people}')::int,0) as people,
    coalesce((c.j#>>'{match_counts,projects}')::int,0) as projects,
    coalesce((r.j#>>'{stats,total_emails}')::int,0) as raw_total,
    coalesce((r.j#>>'{stats,linked_to_project}')::int,0) as raw_linked,
    coalesce((r.j#>>'{stats,suggested_project}')::int,0) as raw_suggested,
    coalesce((r.j#>>'{stats,unresolved}')::int,0) as raw_unresolved,
    coalesce((r.j#>>'{stats,best_match_score}')::int,0) as raw_best_score,
    coalesce((
      select bool_or(coalesce((x->>'needs_review')::boolean,false))
      from jsonb_array_elements(coalesce(r.j->'recent_emails','[]'::jsonb)) x
    ),false) as raw_needs_review
  from canonical c cross join raw r
)
select c.j || jsonb_build_object(
  'entity_intelligence_version',2,
  'identity_status',case
    when m.partners+m.people+m.projects>0 then 'canonical'
    when m.raw_total>0 then 'evidence_only'
    else 'none'
  end,
  'evidence_summary',jsonb_build_object(
    'canonical_match_count',m.partners+m.people+m.projects,
    'raw_email_total',m.raw_total,
    'raw_linked_to_project',m.raw_linked,
    'raw_suggested_project',m.raw_suggested,
    'raw_unresolved',m.raw_unresolved,
    'raw_best_match_score',m.raw_best_score,
    'review_required',m.raw_needs_review or m.raw_unresolved>0 or m.raw_suggested>0,
    'raw_evidence_used_for_identity',false
  ),
  'raw_email_evidence',r.j,
  'evidence_policy',jsonb_build_object(
    'canonical_truth_source','public.pppp_chatgpt_entity_intelligence_v1(text,integer)',
    'raw_evidence_source','public.pppp_chatgpt_email_entity_evidence_v1(text,integer)',
    'raw_evidence_may_assign_person_role',false,
    'raw_evidence_may_assign_company_role',false,
    'raw_evidence_may_auto_link_project',false,
    'raw_evidence_may_create_task_or_action',false,
    'raw_evidence_may_change_project_state',false,
    'human_approval_gates_preserved',true,
    'note','Raw email evidence is contextual evidence only. Canonical partner/person/project relationships come only from the v1 canonical intelligence layer.'
  )
)
from canonical c cross join raw r cross join metrics m;
$function$;

revoke all on function public.pppp_chatgpt_entity_intelligence_v2(text,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_entity_intelligence_v2(text,integer)
  to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v7',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v2(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v1(text,integer)',
      'public.pppp_chatgpt_email_entity_evidence_v1(text,integer)'
    ),
    'service_write_functions',jsonb_build_array(
      'public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb)',
      'public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb)',
      'public.pppp_chatgpt_project_disposition_v1(text,uuid,jsonb,text,text,jsonb)'
    ),
    'drive_manifest_title','PPPP — GLOBAL CHATGPT BRIDGE MANIFEST',
    'drive_manifest_id','1Yq_qiZQib7O19Z7eGRiKreqPflfBeazfOL8ZMufrXd4',
    'command_sheet_title','PPPP — ChatGPT Command Bridge',
    'command_sheet_id','1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8',
    'command_tab','Commands',
    'allowed_action_types',jsonb_build_array('context_fact','task','create_project','supplier_offer','project_disposition'),
    'approval_required','approved',
    'processing_interval_minutes',10,
    'protected_actions',jsonb_build_array(
      'external_email_send','supplier_selection_or_commitment','final_selling_price_or_margin',
      'contract_or_purchase_order_commitment','project_won_or_lost_decision'
    ),
    'write_protocol',jsonb_build_object(
      'existing_project_actions_require_real_project_id',true,'append_only',true,'deduplicate_by','command_id','source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'new_project_transport','Append one approved create_project row to the command sheet. Leave project_id blank, put the project name in project_name, and put safe optional fields in value_json. The trusted bridge worker calls the service RPC and returns the real project_id.',
      'create_project_safe_value_json_fields',jsonb_build_array('client','reference','location','deadline','notes','deal_type','business_type'),'create_project_idempotent_by','command_id',
      'supplier_offer_transport','Append one approved supplier_offer row for an existing project with its real project_id. The trusted worker records the quotation in canonical public.offers only. This action never selects or commits to the supplier.',
      'supplier_offer_safe_value_json_fields',jsonb_build_array('supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur','extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert','notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'),
      'supplier_offer_idempotent_by','command_id','supplier_offer_never_selects_supplier',true,
      'project_disposition_transport','Append one explicitly approved project_disposition row for an existing project with its real project_id. The trusted worker calls the service-only disposition RPC. No Bid closes the project operationally and closes its active tasks while preserving an audit fact.',
      'project_disposition_allowed_values',jsonb_build_array('no_bid'),'project_disposition_safe_value_json_fields',jsonb_build_array('disposition','reason','notes','operator_note','approved_by','approved_on','tender_ref','subject'),
      'project_disposition_requires_explicit_approval',true,'project_disposition_idempotent_by','command_id',
      'verify_new_project_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_search_projects_v1(text,integer)'),
      'verify_supplier_offer_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_supplier_comparison_v1(uuid)'),
      'verify_project_disposition_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)','public.pppp_chatgpt_priority_actions_v1(integer)')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v2(text,integer). Canonical v1 relationships remain authoritative; raw email evidence attached by v2 is evidence-only and must not create or change role/project identity.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_email_entity_evidence_v1(text,integer). Treat its output as evidence only; do not infer client/supplier role or project identity from it.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, use public.pppp_chatgpt_entity_intelligence_v2(text,integer). Its canonical v1 layer is authoritative; attached raw email evidence is read-only context and must never by itself assign a client/supplier/person role, link a project, create an action, or change project state. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. For No Bid or project closure, use project_disposition only after explicit human approval. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1()
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1()
  to service_role,supabase_read_only_user;