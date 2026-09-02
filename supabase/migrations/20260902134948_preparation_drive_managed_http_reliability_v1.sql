-- Preparation completeness v1: make Drive reconciliation observable/retryable.
-- The Google Workspace DWD Drive scope is still external configuration; this
-- migration ensures the platform records the 401 correctly, retries through
-- the shared managed-HTTP path, deduplicates the blocker, and auto-closes it
-- after recovery.

create or replace function public.pppp_reconcile_automation_http_v1(p_limit integer default 200)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','net'
as $function$
declare
  r record;
  h record;
  v_limit integer:=least(1000,greatest(10,coalesce(p_limit,200)));
  v_succeeded integer:=0;
  v_retry_wait integer:=0;
  v_retried integer:=0;
  v_failed integer:=0;
  v_delay interval;
  v_task_ref text;
begin
  for r in
    select * from public.pppp_automation_http_runs
    where status='queued'
    order by queued_at
    limit v_limit
  loop
    v_task_ref:=case
      when r.automation_key='project-drive-reconciler' then 'AUTOMATION:http:project-drive-reconciler'
      else 'AUTOMATION:http:'||r.correlation_id::text
    end;

    select id,status_code,timed_out,error_msg,content,created
      into h
      from net._http_response
     where id=r.request_id
     limit 1;

    if not found then
      if r.queued_at<now()-interval '10 minutes' then
        if r.attempt<r.max_attempts then
          update public.pppp_automation_http_runs
             set status='retry_wait',error_message='No pg_net response after 10 minutes',
                 next_retry_at=now()+interval '1 minute',updated_at=now()
           where id=r.id;
          v_retry_wait:=v_retry_wait+1;
        else
          update public.pppp_automation_http_runs
             set status='failed',error_message='No pg_net response after 10 minutes',
                 completed_at=now(),updated_at=now()
           where id=r.id;
          insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
          values('Automation failure · '||r.automation_key,
                 'No pg_net response after 10 minutes; retries exhausted.',
                 current_date,'larte','hapur','automation_failure','intern',v_task_ref)
          on conflict(source,source_ref) do update
             set title=excluded.title,detail=excluded.detail,due_date=current_date,
                 priority='larte',status='hapur',done_at=null;
          v_failed:=v_failed+1;
        end if;
      end if;
      continue;
    end if;

    if coalesce(h.timed_out,false)=false and h.error_msg is null and h.status_code between 200 and 399 then
      update public.pppp_automation_http_runs
         set status='succeeded',http_status=h.status_code,timed_out=coalesce(h.timed_out,false),
             error_message=null,response_excerpt=left(coalesce(h.content,''),1200),
             completed_at=coalesce(h.created,now()),updated_at=now()
       where id=r.id;

      update public.tasks
         set status='kryer',done_at=coalesce(done_at,now()),
             detail=coalesce(detail,'')||E'\nRecovered automatically: managed HTTP call succeeded.'
       where source='automation_failure' and source_ref=v_task_ref
         and lower(coalesce(status,'')) not in ('kryer','mbyllur','done');
      v_succeeded:=v_succeeded+1;
    elsif r.attempt<r.max_attempts then
      v_delay:=case r.attempt when 1 then interval '1 minute' when 2 then interval '5 minutes' else interval '15 minutes' end;
      update public.pppp_automation_http_runs
         set status='retry_wait',http_status=h.status_code,timed_out=coalesce(h.timed_out,false),
             error_message=left(coalesce(h.error_msg,'HTTP '||coalesce(h.status_code::text,'unknown')),1000),
             response_excerpt=left(coalesce(h.content,''),1200),completed_at=coalesce(h.created,now()),
             next_retry_at=now()+v_delay,updated_at=now()
       where id=r.id;
      v_retry_wait:=v_retry_wait+1;
    else
      update public.pppp_automation_http_runs
         set status='failed',http_status=h.status_code,timed_out=coalesce(h.timed_out,false),
             error_message=left(coalesce(h.error_msg,'HTTP '||coalesce(h.status_code::text,'unknown')),1000),
             response_excerpt=left(coalesce(h.content,''),1200),completed_at=coalesce(h.created,now()),updated_at=now()
       where id=r.id;
      insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
      values(
        'Automation failure · '||r.automation_key,
        case
          when r.automation_key='project-drive-reconciler' and coalesce(h.content,'') ilike '%Google token 401%'
            then 'Google Drive project-folder reconciliation is blocked by Google Workspace Domain-Wide Delegation. The service account cannot obtain the delegated Drive scope. PPPP will retry automatically after configuration is corrected.'
          else 'Managed HTTP automation exhausted '||r.max_attempts::text||' attempts. Last result: '||coalesce(h.error_msg,'HTTP '||coalesce(h.status_code::text,'unknown'))
        end,
        current_date,'larte','hapur','automation_failure','intern',v_task_ref
      )
      on conflict(source,source_ref) do update
         set title=excluded.title,detail=excluded.detail,due_date=current_date,
             priority='larte',status='hapur',done_at=null;
      v_failed:=v_failed+1;
    end if;
  end loop;

  for r in
    select * from public.pppp_automation_http_runs
    where status='retry_wait' and next_retry_at<=now()
    order by next_retry_at
    limit v_limit
  loop
    begin
      perform public.pppp_enqueue_automation_http_v1(
        r.automation_key,r.request_url,r.secret_name,r.timeout_ms,
        r.max_attempts,r.correlation_id,r.attempt+1
      );
      update public.pppp_automation_http_runs set status='retried',updated_at=now() where id=r.id;
      v_retried:=v_retried+1;
    exception when others then
      update public.pppp_automation_http_runs
         set error_message=left('Retry enqueue failed: '||sqlerrm,1000),
             next_retry_at=now()+interval '5 minutes',updated_at=now()
       where id=r.id;
    end;
  end loop;

  return jsonb_build_object('succeeded',v_succeeded,'retry_wait',v_retry_wait,
    'retried',v_retried,'failed',v_failed,'generated_at',now());
end;
$function$;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='project-drive-reconciler-30m' limit 1;
  if v_job_id is null then
    perform cron.schedule('project-drive-reconciler-30m','17,47 * * * *',
      'select public.project_drive_reconciler_internal_request(25);');
  else
    perform cron.alter_job(v_job_id,schedule:='17,47 * * * *',
      command:='select public.project_drive_reconciler_internal_request(25);',active:=true);
  end if;
end;
$block$;
