begin;

create or replace function public.pppp_chatgpt_project_disposition_v1(
  p_command_id text,
  p_project_id uuid,
  p_payload jsonb,
  p_approval text,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_command_id text := nullif(btrim(p_command_id), '');
  v_approval text := lower(coalesce(nullif(btrim(p_approval), ''), ''));
  v_source text := lower(coalesce(nullif(btrim(p_source), ''), 'chatgpt'));
  v_payload jsonb := case
    when jsonb_typeof(coalesce(p_payload, '{}'::jsonb)) = 'object' then coalesce(p_payload, '{}'::jsonb)
    else '{}'::jsonb
  end;
  v_metadata jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object' then coalesce(p_metadata, '{}'::jsonb)
    else '{}'::jsonb
  end;
  v_disposition text;
  v_approved_on date;
  v_fact_key text;
  v_fact_id uuid;
  v_tasks_closed integer := 0;
  v_project public.projects%rowtype;
begin
  if v_command_id is null then
    raise exception using errcode = '22023', message = 'command_id_required';
  end if;
  if length(v_command_id) > 240 then
    raise exception using errcode = '22023', message = 'command_id_too_long';
  end if;
  if p_project_id is null then
    raise exception using errcode = '22023', message = 'project_id_required';
  end if;
  if v_approval <> 'approved' then
    raise exception using errcode = '42501', message = 'explicit_human_approval_required';
  end if;
  if v_source <> 'chatgpt' then
    raise exception using errcode = '22023', message = 'invalid_project_disposition_source';
  end if;

  v_disposition := lower(coalesce(nullif(btrim(v_payload ->> 'disposition'), ''), ''));
  if v_disposition <> 'no_bid' then
    raise exception using errcode = '22023', message = 'unsupported_project_disposition';
  end if;

  begin
    v_approved_on := nullif(btrim(v_payload ->> 'approved_on'), '')::date;
  exception when others then
    raise exception using errcode = '22023', message = 'approved_on_must_be_yyyy_mm_dd';
  end;
  v_approved_on := coalesce(v_approved_on, current_date);

  perform pg_advisory_xact_lock(hashtextextended(v_command_id, 0));

  select * into v_project
  from public.projects
  where id = p_project_id
  for update;

  if not found then
    raise exception using errcode = '22023', message = 'project_not_found';
  end if;

  if public.pppp_project_status_is_terminal_v1(v_project.status)
     and lower(btrim(coalesce(v_project.status, ''))) not in ('mbyllur', 'closed') then
    raise exception using errcode = '23514', message = 'project_already_terminal_conflict';
  end if;

  v_fact_key := 'tender_decision.no_bid.' || to_char(v_approved_on, 'YYYY-MM-DD');

  v_fact_id := public.pppp_ingest_context_fact_v1(
    p_project_id := p_project_id,
    p_fact_key := v_fact_key,
    p_value := v_payload || jsonb_build_object(
      'decision', 'no_bid',
      'disposition', 'no_bid',
      'bridge_action', 'project_disposition',
      'approval', 'approved'
    ),
    p_category := 'tender_decision',
    p_subject := coalesce(nullif(btrim(v_payload ->> 'subject'), ''), 'No Bid – ' || v_project.name),
    p_source_type := 'chatgpt',
    p_source_ref := coalesce(nullif(btrim(v_metadata ->> 'source_ref'), ''), 'chatgpt:' || v_command_id),
    p_evidence_status := 'observed',
    p_confidence := null,
    p_fact_status := 'observed',
    p_idempotency_key := 'chatgpt-project-disposition:' || v_command_id,
    p_created_by := 'chatgpt_pppp_bridge'
  );

  update public.projects
  set status = 'mbyllur',
      operational_state = 'closed',
      operational_state_at = now(),
      operational_state_source = 'chatgpt_project_disposition',
      updated_at = now()
  where id = p_project_id;

  update public.tasks
  set status = 'mbyllur',
      done_at = coalesce(done_at, now())
  where project_id = p_project_id
    and status in ('hapur', 'në proces');
  get diagnostics v_tasks_closed = row_count;

  select * into v_project
  from public.projects
  where id = p_project_id;

  return jsonb_build_object(
    'ok', true,
    'command_id', v_command_id,
    'project_id', p_project_id,
    'disposition', 'no_bid',
    'project_status', v_project.status,
    'operational_state', v_project.operational_state,
    'pipeline_stage', v_project.pipeline_stage,
    'tasks_closed', v_tasks_closed,
    'fact_id', v_fact_id,
    'approval', 'approved',
    'human_approval_gate_preserved', true,
    'source', v_source,
    'metadata', v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) from public;
revoke all on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) from anon;
revoke all on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) from authenticated;
grant execute on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to pg_catalog, public
as $$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v5',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)'
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
      'external_email_send',
      'supplier_selection_or_commitment',
      'final_selling_price_or_margin',
      'contract_or_purchase_order_commitment',
      'project_won_or_lost_decision'
    ),
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
      'supplier_offer_safe_value_json_fields',jsonb_build_array(
        'supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur',
        'extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert',
        'notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'
      ),
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
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. For No Bid or project closure, use project_disposition only after explicit human approval. Preserve all protected human approval gates.'
  );
$$;

commit;
