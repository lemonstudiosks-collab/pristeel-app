-- Read-only, bounded operational evidence for the existing Automation Health screen.
-- No business records, schedules, provider configuration or human gates are changed.
create or replace function private.pppp_automation_operating_health_v1()
returns jsonb language plpgsql stable security definer
set search_path to pg_catalog, public, net
as $function$
declare r record; payload jsonb; latest jsonb:='{}'::jsonb; key text; stamp jsonb;
begin
  if coalesce(auth.role(),'') <> 'service_role' and not coalesce(public.is_admin(),false) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  for r in select status_code,timed_out,error_msg,content,created
    from net._http_response where created>=now()-interval '24 hours'
    order by created desc limit 128
  loop
    begin payload:=r.content::jsonb; exception when others then continue; end;
    key:=case
      when payload ? 'bridge' then 'command_bridge'
      when payload ? 'new_messages' and payload ? 'listed' then 'gmail_ingest'
      when payload ? 'unmatched' and payload ? 'tasks_created' then 'project_intake'
      when payload ? 'synthesized' and payload ? 'configured' then 'memory_synthesis'
      when payload ? 'provider_configured' then 'event_intelligence'
      when payload ? 'pairs_scanned' then 'attachments'
      else null end;
    if key is null or latest ? key then continue; end if;
    stamp:=jsonb_build_object('at',r.created,'http_status',r.status_code,
      'timed_out',r.timed_out,'error',left(coalesce(r.error_msg,payload->>'reason',payload->>'error'),180));
    -- Return only counters/configuration, never raw emails, URLs, credentials or provider output.
    select stamp||coalesce(jsonb_object_agg(e.key,e.value),'{}'::jsonb) into stamp
    from jsonb_each(payload) e where e.key=any(array[
      'ok','checked','processed','succeeded','failed','skipped','listed','new_messages','inserted',
      'linked','review','unmatched','identity_conflicts','tasks_created','quotes_created','analyses_created',
      'configured','synthesized','projects_checked','provider','provider_configured',
      'queued','candidates','messages_fetched','rows_registered','pairs_scanned']);
    latest:=latest||jsonb_build_object(key,stamp);
  end loop;
  return jsonb_build_object('runtime',latest,'generated_at',now(),
    'commands_7d',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
      select action_type,status,count(*) as count,max(updated_at) as latest
      from public.pppp_chatgpt_command_receipts where created_at>=now()-interval '7 days'
      group by action_type,status) x),
    'tender_fetch',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
      select status,count(*) as count,max(last_attempt_at) as last_attempt,min(requested_at) as oldest
      from public.pppp_tender_fetch_queue group by status) x),
    'steel_discovery',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
      select run_date,status,discovered_count,inserted_count,finished_at,left(error_message,180) as error
      from public.pppp_steel_buyer_discovery_runs_v1 order by started_at desc limit 3) x),
    'outbound_sync',(select jsonb_build_object('status',status,'at',completed_at,'error',left(error_message,180))
      from public.pppp_automation_http_runs where automation_key='pppp-outbound-sync' order by created_at desc limit 1)
  );
end;
$function$;
revoke all on function private.pppp_automation_operating_health_v1() from public,anon;
grant execute on function private.pppp_automation_operating_health_v1() to authenticated,service_role;

create or replace function public.pppp_automation_health_v1()
returns jsonb language plpgsql stable
set search_path to pg_catalog,public,private
as $function$
begin
  if coalesce(auth.role(),'') <> 'service_role' and not coalesce(public.is_admin(),false) then
    raise exception 'forbidden' using errcode='42501';
  end if;
  return private.pppp_automation_health_internal()||
    jsonb_build_object('operating',private.pppp_automation_operating_health_v1());
end;
$function$;
revoke all on function public.pppp_automation_health_v1() from public,anon;
grant execute on function public.pppp_automation_health_v1() to authenticated,service_role;
