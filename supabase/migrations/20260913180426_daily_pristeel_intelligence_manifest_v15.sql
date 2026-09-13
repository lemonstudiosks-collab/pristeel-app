create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v15',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. Project Resolution v2 provides read-only auditable project identity resolution. Situation Intelligence v1 adds read-only cross-project synthesis. Action Orchestrator v1 converts those situations into ranked proposal-only next actions. Daily PriSteel Intelligence v1 provides the standard read-only current operating brief without pretending historical change detection.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v3(text,integer)',
      'public.pppp_chatgpt_entity_integrity_v2(text,integer)',
      'public.pppp_chatgpt_business_inbox_v2(integer,integer)',
      'public.pppp_chatgpt_next_action_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer)',
      'public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer)',
      'public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer)',
      'public.pppp_chatgpt_situation_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_action_orchestrator_v1(integer,integer)',
      'public.pppp_chatgpt_daily_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_entity_intelligence_v2(text,integer)',
      'public.pppp_chatgpt_email_identity_resolution_v1(text,integer)',
      'public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)',
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
    'protected_actions',jsonb_build_array('external_email_send','supplier_selection_or_commitment','final_selling_price_or_margin','contract_or_purchase_order_commitment','project_won_or_lost_decision'),
    'write_protocol',jsonb_build_object(
      'existing_project_actions_require_real_project_id',true,
      'append_only',true,
      'deduplicate_by','command_id',
      'source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),
      'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'new_project_transport','Append one approved create_project row to the command sheet. Leave project_id blank, put the project name in project_name, and put safe optional fields in value_json. The trusted bridge worker calls the service RPC and returns the real project_id.',
      'create_project_safe_value_json_fields',jsonb_build_array('client','reference','location','deadline','notes','deal_type','business_type'),
      'create_project_idempotent_by','command_id',
      'supplier_offer_transport','Append one approved supplier_offer row for an existing project with its real project_id. The trusted worker records the quotation in canonical public.offers only. This action never selects or commits to the supplier.',
      'supplier_offer_safe_value_json_fields',jsonb_build_array('supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur','extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert','notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'),
      'supplier_offer_idempotent_by','command_id',
      'supplier_offer_never_selects_supplier',true,
      'project_disposition_transport','Append one explicitly approved project_disposition row for an existing project with its real project_id. The trusted worker calls the service-only disposition RPC. No Bid closes the project operationally and closes its active tasks while preserving an audit fact.',
      'project_disposition_allowed_values',jsonb_build_array('no_bid'),
      'project_disposition_safe_value_json_fields',jsonb_build_array('disposition','reason','notes','operator_note','approved_by','approved_on','tender_ref','subject'),
      'project_disposition_requires_explicit_approval',true,
      'project_disposition_idempotent_by','command_id',
      'verify_new_project_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_search_projects_v1(text,integer)'),
      'verify_supplier_offer_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_supplier_comparison_v1(uuid)'),
      'verify_project_disposition_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)','public.pppp_chatgpt_priority_actions_v1(integer)')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'briefing i sotëm / Daily PriSteel','Use public.pppp_chatgpt_daily_intelligence_v1(integer,integer) as the standard read-only current operating brief. It does not claim overnight/change detection unless historical snapshots exist.',
      'çfarë po ndodh në PriSteel / ku duhet të fokusohem','Use public.pppp_chatgpt_daily_intelligence_v1(integer,integer) for the standard current operating brief; use public.pppp_chatgpt_situation_intelligence_v1(integer,integer) for deeper cross-project context and public.pppp_chatgpt_action_orchestrator_v1(integer,integer) for proposal details.',
      'çfarë duhet të bëjmë tani','Use public.pppp_chatgpt_action_orchestrator_v1(integer,integer). It returns proposal-only actions and artifacts, never executes them. Human gates and controlled-write approval must be preserved.',
      'situata e këtij projekti','Resolve the project first, then use public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer). Canonical operational state and Project Memory have precedence; current operator actions drive urgency, while legacy workflow-task backlog is transparency only.',
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v3(text,integer). Exact unique partner-contact identity has precedence over conflicting Contact Master company/kind data; integrity conflicts remain review-only and are never auto-written.',
      'kontrollo integritetin e kontakteve','Use public.pppp_chatgpt_entity_integrity_v2(text,integer). Suggested reconciliation is read-only and requires human review.',
      'kontrollo inbox / çka kërkon veprim','Use public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) for ranked review-only recommendations. Use public.pppp_chatgpt_business_inbox_v2(integer,integer) for the full deduplicated conversation surface. Missing reply evidence alone is never an action decision.',
      'cilit projekt i përket emaili/RFQ/oferta/dokumenti','Use public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer). Tier A may resolve; Tier B only suggests; Tier C is context only. assignment_allowed is false in this read-only phase.',
      'kontrollo inbox me project resolution','Use public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer). This enriches the bounded Business Inbox output without changing Business Inbox behavior or project assignments.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer), then neutral identity resolution and raw email evidence as needed. Identity alone never assigns a project.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For the standard daily/current operating brief use public.pppp_chatgpt_daily_intelligence_v1(integer,integer). It is read-only and summarizes current canonical state; historical_delta_available=false means it must not claim overnight or change detection. For deeper cross-project operating-picture use public.pppp_chatgpt_situation_intelligence_v1(integer,integer). For ranked next-step proposals use public.pppp_chatgpt_action_orchestrator_v1(integer,integer). Action Orchestrator v1 is proposal-only and performs zero executions. Any controlled write requires explicit user approval and the existing bridge protocol; protected actions remain human gated. For one resolved project, use public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer). Project Memory and canonical operational state have precedence, current operator actions drive urgency, raw workflow-task backlog does not drive urgency, unresolved inbox items are never forced into projects, and missing reply evidence alone never creates action. For project identity questions use public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer). Preserve external email, supplier selection/commitment, final selling price/margin, contract/PO and won/lost human gates.'
  );
$function$;