-- PPPP ChatGPT bridge v2: canonical, idempotent project creation.
-- Scope is intentionally narrow: create a project shell only. Protected commercial
-- approvals remain outside this function.

create or replace function public.pppp_chatgpt_create_project_v1(
  p_command_id text,
  p_name text,
  p_client text default null,
  p_reference text default null,
  p_location text default null,
  p_deadline date default null,
  p_notes text default null,
  p_deal_type text default null,
  p_business_type text default null,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_command_id text := nullif(btrim(p_command_id), '');
  v_name text := nullif(btrim(p_name), '');
  v_client text := nullif(btrim(p_client), '');
  v_reference text := nullif(btrim(p_reference), '');
  v_location text := nullif(btrim(p_location), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_deal_type text := coalesce(nullif(btrim(p_deal_type), ''), 'full');
  v_business_type text := nullif(btrim(p_business_type), '');
  v_source text := coalesce(nullif(btrim(p_source), ''), 'chatgpt');
  v_metadata jsonb := case when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object' then coalesce(p_metadata, '{}'::jsonb) else '{}'::jsonb end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_project public.projects%rowtype;
  v_project_json jsonb;
begin
  if v_command_id is null then
    raise exception using errcode = '22023', message = 'command_id_required';
  end if;
  if length(v_command_id) > 240 then
    raise exception using errcode = '22023', message = 'command_id_too_long';
  end if;
  if v_name is null then
    raise exception using errcode = '22023', message = 'project_name_required';
  end if;
  if length(v_name) > 500 then
    raise exception using errcode = '22023', message = 'project_name_too_long';
  end if;
  if v_business_type is not null and v_business_type not in ('trading','fabrication','hybrid') then
    raise exception using errcode = '22023', message = 'invalid_business_type';
  end if;
  if v_source not in ('chatgpt','pppp_ui') then
    raise exception using errcode = '22023', message = 'invalid_project_create_source';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id, 0));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id = v_command_id;

  if found then
    if v_receipt.action_type <> 'create_project' then
      raise exception using errcode = '23505', message = 'command_id_conflict';
    end if;
    if v_receipt.project_id is null then
      raise exception using errcode = '23514', message = 'create_project_receipt_without_project';
    end if;

    select * into v_project
    from public.projects
    where id = v_receipt.project_id;

    if not found then
      raise exception using errcode = '23514', message = 'create_project_receipt_project_missing';
    end if;

    v_project_json := jsonb_build_object(
      'id', v_project.id,
      'name', v_project.name,
      'client', v_project.client,
      'reference', coalesce(v_project.business_ref, v_project.ref),
      'location', v_project.location,
      'deadline', v_project.deadline,
      'status', v_project.status,
      'pipeline_stage', v_project.pipeline_stage,
      'deal_type', v_project.deal_type,
      'business_type', v_project.business_type,
      'created_at', v_project.created_at
    );

    return jsonb_build_object(
      'ok', true,
      'command_id', v_command_id,
      'project_id', v_project.id,
      'created', false,
      'project', v_project_json
    );
  end if;

  insert into public.projects(
    name, client, ref, business_ref, location, deadline, notes,
    status, pipeline_stage, deal_type, business_type, origin_type
  ) values (
    v_name, v_client, v_reference, v_reference, v_location, p_deadline, v_notes,
    'pritje', 'rfq_in', v_deal_type, v_business_type,
    case when v_source = 'chatgpt' then 'chatgpt' else 'manual' end
  )
  returning * into v_project;

  v_project_json := jsonb_build_object(
    'id', v_project.id,
    'name', v_project.name,
    'client', v_project.client,
    'reference', coalesce(v_project.business_ref, v_project.ref),
    'location', v_project.location,
    'deadline', v_project.deadline,
    'status', v_project.status,
    'pipeline_stage', v_project.pipeline_stage,
    'deal_type', v_project.deal_type,
    'business_type', v_project.business_type,
    'created_at', v_project.created_at
  );

  insert into public.pppp_chatgpt_command_receipts(command_id, action_type, project_id, payload)
  values (
    v_command_id,
    'create_project',
    v_project.id,
    jsonb_build_object(
      'source', v_source,
      'project', v_project_json,
      'metadata', v_metadata
    )
  );

  return jsonb_build_object(
    'ok', true,
    'command_id', v_command_id,
    'project_id', v_project.id,
    'created', true,
    'project', v_project_json
  );
end;
$$;

revoke all on function public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb) from public;
revoke all on function public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb) from anon;
grant execute on function public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb) to authenticated;
grant execute on function public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb) to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v2',
    'purpose','Account-level PPPP bridge for live read plus controlled approved writes and canonical project creation from ChatGPT.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)'
    ),
    'write_functions',jsonb_build_array(
      'public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb)'
    ),
    'drive_manifest_title','PPPP — GLOBAL CHATGPT BRIDGE MANIFEST',
    'drive_manifest_id','1Yq_qiZQib7O19Z7eGRiKreqPflfBeazfOL8ZMufrXd4',
    'command_sheet_title','PPPP — ChatGPT Command Bridge',
    'command_sheet_id','1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8',
    'command_tab','Commands',
    'allowed_action_types',jsonb_build_array('context_fact','task','create_project'),
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
      'resolve_project_first',true,
      'require_real_project_id_for_existing_project_actions',true,
      'create_project_returns_real_project_id',true,
      'create_project_idempotent_by','command_id',
      'append_only',true,
      'deduplicate_by','command_id',
      'source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),
      'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'create_project_safe_fields',jsonb_build_array('name','client','reference','location','deadline','notes','deal_type','business_type')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Call public.pppp_chatgpt_create_project_v1 with a unique stable command_id, then verify the returned project_id with PPPP live reads.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For a brand-new project, use public.pppp_chatgpt_create_project_v1. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;
