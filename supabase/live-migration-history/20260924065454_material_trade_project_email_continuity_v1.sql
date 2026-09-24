create or replace function public.pppp_chatgpt_bridge_manifest_v24()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v jsonb := public.pppp_chatgpt_bridge_manifest_v23();
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v24'::text),true);
  v := jsonb_set(
    v,'{write_protocol}',
    coalesce(v->'write_protocol','{}'::jsonb) || jsonb_build_object(
      'material_trade_project_email_continuity',jsonb_build_object(
        'required',true,
        'identity_key','gmail_thread_id',
        'conflict_policy','Never overwrite a project_emails row already linked to a different project; block promotion for human review instead.',
        'link_behavior','On successful human-confirmed promotion, link currently unassigned project_emails rows in the buyer Gmail thread to the new Project with match_method=material_trade_promotion and confidence=100.',
        'rfq_continuity','The buyer conversation and RFQ email thread continue inside the promoted Project.'
      )
    ),true
  );
  v := jsonb_set(
    v,'{global_instruction}',
    to_jsonb(
      coalesce(v->>'global_instruction','') ||
      ' When a Material Trade buyer reply/RFQ is human-confirmed for Project promotion, preserve communication continuity by linking unassigned project_emails rows from the exact Gmail thread to the new Project. Never overwrite a thread already linked to another Project; treat that as an identity conflict requiring review.'
    ),true
  );
  return v;
end;
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v24() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v24() to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select public.pppp_chatgpt_bridge_manifest_v24();
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;
