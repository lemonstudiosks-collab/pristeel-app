-- PPPP automation watchdog running-state guard v2
-- A currently running pg_cron job is healthy unless it has been running for more
-- than 15 minutes. This prevents the watchdog from alerting on itself and on the
-- 1-minute HTTP reconciler while those jobs are executing normally.

create or replace function public.pppp_automation_watchdog_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'cron'
as $function$
declare
  r record;
  v_http jsonb;
  v_opened integer:=0;
  v_closed integer:=0;
  v_rows integer:=0;
  v_ref text;
begin
  v_http:=public.pppp_reconcile_automation_http_v1(500);

  for r in
    select j.jobname,x.status,x.start_time
    from cron.job j
    left join lateral (
      select status,start_time
      from cron.job_run_details d
      where d.jobid=j.jobid
      order by start_time desc
      limit 1
    ) x on true
    where j.active
      and x.status is not null
      and (
        x.status not in ('succeeded','running')
        or (x.status='running' and x.start_time < now()-interval '15 minutes')
      )
  loop
    v_ref:='AUTOMATION:cron:'||r.jobname;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values(
      'Automation failure · cron '||r.jobname,
      case when r.status='running'
        then 'Latest pg_cron run appears stuck: running since '||coalesce(r.start_time::text,'unknown')
        else 'Latest pg_cron run is '||coalesce(r.status,'unknown')||' at '||coalesce(r.start_time::text,'unknown')
      end,
      current_date,'larte','hapur','automation_failure','intern',v_ref
    )
    on conflict(source,source_ref) do update
      set title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
     set status='kryer',
         done_at=coalesce(done_at,now()),
         detail=coalesce(detail,'')||E'\nRecovered automatically: latest cron run is healthy.'
   where t.source='automation_failure'
     and t.source_ref like 'AUTOMATION:cron:%'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
     and exists(
       select 1
       from cron.job j
       left join lateral(
         select status,start_time
         from cron.job_run_details d
         where d.jobid=j.jobid
         order by start_time desc
         limit 1
       ) x on true
       where 'AUTOMATION:cron:'||j.jobname=t.source_ref
         and j.active
         and (
           x.status='succeeded'
           or (x.status='running' and x.start_time >= now()-interval '15 minutes')
         )
     );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  for r in
    select worker_id,last_seen_at
    from public.local_ocr_workers
    where enabled and (last_seen_at is null or last_seen_at<now()-interval '15 minutes')
  loop
    v_ref:='AUTOMATION:worker:ocr:'||r.worker_id;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values('Automation worker stale · OCR '||r.worker_id,'OCR worker heartbeat is older than 15 minutes. Last seen: '||coalesce(r.last_seen_at::text,'never'),current_date,'larte','hapur','automation_failure','intern',v_ref)
    on conflict(source,source_ref) do update set detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
     set status='kryer',done_at=coalesce(done_at,now()),detail=coalesce(detail,'')||E'\nRecovered automatically: OCR worker heartbeat is healthy.'
   where t.source='automation_failure'
     and t.source_ref like 'AUTOMATION:worker:ocr:%'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
     and exists(
       select 1 from public.local_ocr_workers w
       where t.source_ref='AUTOMATION:worker:ocr:'||w.worker_id
         and w.enabled
         and w.last_seen_at>=now()-interval '15 minutes'
     );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  for r in
    select label,last_used_at
    from public.semantic_worker_keys
    where is_active and (last_used_at is null or last_used_at<now()-interval '15 minutes')
  loop
    v_ref:='AUTOMATION:worker:semantic:'||r.label;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values('Automation worker stale · Semantic AI','Semantic worker heartbeat is older than 15 minutes. Worker: '||r.label||'. Last used: '||coalesce(r.last_used_at::text,'never'),current_date,'larte','hapur','automation_failure','intern',v_ref)
    on conflict(source,source_ref) do update set detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
     set status='kryer',done_at=coalesce(done_at,now()),detail=coalesce(detail,'')||E'\nRecovered automatically: Semantic worker heartbeat is healthy.'
   where t.source='automation_failure'
     and t.source_ref like 'AUTOMATION:worker:semantic:%'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
     and exists(
       select 1 from public.semantic_worker_keys w
       where t.source_ref='AUTOMATION:worker:semantic:'||w.label
         and w.is_active
         and w.last_used_at>=now()-interval '15 minutes'
     );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  return jsonb_build_object(
    'http',v_http,
    'alerts_opened_or_refreshed',v_opened,
    'alerts_closed',v_closed,
    'generated_at',now()
  );
end;
$function$;
