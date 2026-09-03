begin;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v1',
    'purpose','Account-level PPPP bridge for live read plus controlled approved writes from ChatGPT.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)'
    ),
    'drive_manifest_title','PPPP — GLOBAL CHATGPT BRIDGE MANIFEST',
    'drive_manifest_id','1Yq_qiZQib7O19Z7eGRiKreqPflfBeazfOL8ZMufrXd4',
    'command_sheet_title','PPPP — ChatGPT Command Bridge',
    'command_sheet_id','1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8',
    'command_tab','Commands',
    'allowed_action_types',jsonb_build_array('context_fact','task'),
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
      'require_real_project_id',true,
      'append_only',true,
      'deduplicate_by','command_id',
      'source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),
      'task_value_json_required_fields',jsonb_build_array('title','due_date')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'regjistroje në PPPP','Resolve project, append one approved controlled command, then verify status.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. Preserve all protected human approval gates.'
  );
$$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to supabase_read_only_user;
  end if;
end $$;

commit;
