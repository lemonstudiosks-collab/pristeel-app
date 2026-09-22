-- Enforce the role split declared by pppp_chatgpt_bridge_manifest_v1:
-- read RPCs are available to the dedicated read-only bridge role, while
-- controlled write RPCs are service-only. Neither surface is a public API.

revoke execute on function public.pppp_chatgpt_action_orchestrator_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_artifact_preparation_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_bridge_manifest_v1() from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_business_inbox_project_resolution_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_business_inbox_v2(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_change_intelligence_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_command_status_v1(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_control_tower_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_control_tower_v2(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_create_project_v1(text, text, text, text, text, date, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_create_supplier_offer_v1(text, uuid, jsonb, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_daily_intelligence_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_email_entity_evidence_v1(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_email_identity_resolution_v1(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_entity_integrity_v2(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_entity_intelligence_v1(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_entity_intelligence_v2(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_entity_intelligence_v3(text, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_finance_intelligence_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_morning_brief_safe_v1(integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_next_action_intelligence_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_project_resolution_v2(text, text, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_project_situation_intelligence_v1(uuid, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_situation_intelligence_v1(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_supplier_intelligence_v1(jsonb, uuid, integer, integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_chatgpt_unresolved_business_inbox_v1(integer, integer) from public, anon, authenticated;

grant execute on function public.pppp_chatgpt_action_orchestrator_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_artifact_preparation_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role, postgres;
grant execute on function public.pppp_chatgpt_business_inbox_project_resolution_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_business_inbox_v2(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_change_intelligence_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_command_status_v1(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_control_tower_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_control_tower_v2(integer, integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_create_project_v1(text, text, text, text, text, date, text, text, text, text, jsonb) to service_role, postgres;
grant execute on function public.pppp_chatgpt_create_supplier_offer_v1(text, uuid, jsonb, text, jsonb) to service_role, postgres;
grant execute on function public.pppp_chatgpt_daily_intelligence_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_email_entity_evidence_v1(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_email_identity_resolution_v1(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_entity_integrity_v2(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_entity_intelligence_v1(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_entity_intelligence_v2(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_entity_intelligence_v3(text, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_finance_intelligence_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_morning_brief_safe_v1(integer, integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_next_action_intelligence_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_project_disposition_v1(text, uuid, jsonb, text, text, jsonb) to service_role, postgres;
grant execute on function public.pppp_chatgpt_project_resolution_v2(text, text, jsonb, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_project_situation_intelligence_v1(uuid, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_situation_intelligence_v1(integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_supplier_intelligence_v1(jsonb, uuid, integer, integer, integer) to service_role, postgres;
grant execute on function public.pppp_chatgpt_unresolved_business_inbox_v1(integer, integer) to service_role, postgres;

do $$
declare
  signature text;
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_read_only_user') then
    foreach signature in array array[
      'public.pppp_chatgpt_action_orchestrator_v1(integer,integer)',
      'public.pppp_chatgpt_artifact_preparation_v1(integer,integer)',
      'public.pppp_chatgpt_bridge_manifest_v1()',
      'public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer)',
      'public.pppp_chatgpt_business_inbox_v2(integer,integer)',
      'public.pppp_chatgpt_change_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_control_tower_v1(integer,integer)',
      'public.pppp_chatgpt_control_tower_v2(integer,integer,integer)',
      'public.pppp_chatgpt_daily_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_email_entity_evidence_v1(text,integer)',
      'public.pppp_chatgpt_email_identity_resolution_v1(text,integer)',
      'public.pppp_chatgpt_entity_integrity_v2(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v2(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v3(text,integer)',
      'public.pppp_chatgpt_finance_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_morning_brief_safe_v1(integer,integer,integer)',
      'public.pppp_chatgpt_next_action_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer)',
      'public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer)',
      'public.pppp_chatgpt_situation_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)',
      'public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)'
    ] loop
      execute format('grant execute on function %s to supabase_read_only_user', signature::regprocedure);
    end loop;
  end if;
end;
$$;
