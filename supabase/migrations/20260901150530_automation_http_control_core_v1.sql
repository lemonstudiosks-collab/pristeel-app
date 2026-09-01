-- PPPP managed automation HTTP control core v1
-- Tracks real pg_net outcomes, retries bounded failures, and surfaces final failures as internal tasks.

create table if not exists public.pppp_automation_http_runs (
  id uuid primary key default gen_random_uuid(),
  automation_key text not null,
  correlation_id uuid not null,
  attempt integer not null default 1 check (attempt between 1 and 5),
  max_attempts integer not null default 3 check (max_attempts between 1 and 5),
  request_id bigint unique,
  request_url text not null,
  secret_name text not null,
  timeout_ms integer not null default 120000,
  status text not null default 'queued' check (status in ('queued','succeeded','retry_wait','retried','failed')),
  http_status integer,
  timed_out boolean,
  error_message text,
  response_excerpt text,
  queued_at timestamptz not null default now(),
  completed_at timestamptz,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (correlation_id, attempt)
);

create index if not exists pppp_automation_http_runs_status_idx
  on public.pppp_automation_http_runs(status,next_retry_at,queued_at);
create index if not exists pppp_automation_http_runs_key_idx
  on public.pppp_automation_http_runs(automation_key,created_at desc);

alter table public.pppp_automation_http_runs enable row level security;
revoke all on table public.pppp_automation_http_runs from public,anon,authenticated;
grant select,insert,update,delete on table public.pppp_automation_http_runs to service_role;

create or replace function public.pppp_enqueue_automation_http_v1(
  p_automation_key text,
  p_url text,
  p_secret_name text default 'gmail_tracker_cron_secret',
  p_timeout_ms integer default 120000,
  p_max_attempts integer default 3,
  p_correlation_id uuid default null,
  p_attempt integer default 1
) returns bigint
language plpgsql security definer
set search_path to 'pg_catalog','public','vault','net'
as $function$
declare
  v_secret text;
  v_request_id bigint;
  v_correlation uuid := coalesce(p_correlation_id,gen_random_uuid());
  v_attempt integer := least(5,greatest(1,coalesce(p_attempt,1)));
  v_max integer := least(5,greatest(v_attempt,coalesce(p_max_attempts,3)));
  v_timeout integer := least(180000,greatest(5000,coalesce(p_timeout_ms,120000)));
begin
  if coalesce(btrim(p_automation_key),'')='' then raise exception 'automation_key is required'; end if;
  if coalesce(btrim(p_url),'')='' then raise exception 'url is required'; end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name=p_secret_name
  limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret % is unavailable',p_secret_name; end if;

  select net.http_get(
    url:=p_url,
    headers:=jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds:=v_timeout
  ) into v_request_id;

  insert into public.pppp_automation_http_runs(
    automation_key,correlation_id,attempt,max_attempts,request_id,request_url,secret_name,timeout_ms,status,queued_at,created_at,updated_at
  ) values (
    p_automation_key,v_correlation,v_attempt,v_max,v_request_id,p_url,p_secret_name,v_timeout,'queued',now(),now(),now()
  )
  on conflict(correlation_id,attempt) do update set
    request_id=excluded.request_id,
    request_url=excluded.request_url,
    secret_name=excluded.secret_name,
    timeout_ms=excluded.timeout_ms,
    status='queued',
    http_status=null,
    timed_out=null,
    error_message=null,
    response_excerpt=null,
    queued_at=now(),
    completed_at=null,
    next_retry_at=null,
    updated_at=now();

  return v_request_id;
exception when others then
  begin
    insert into public.pppp_automation_http_runs(
      automation_key,correlation_id,attempt,max_attempts,request_url,secret_name,timeout_ms,status,error_message,completed_at,created_at,updated_at
    ) values (
      coalesce(nullif(btrim(p_automation_key),''),'unknown'),v_correlation,v_attempt,v_max,
      coalesce(nullif(btrim(p_url),''),'unknown'),coalesce(nullif(btrim(p_secret_name),''),'unknown'),
      v_timeout,'failed',left(sqlerrm,1000),now(),now(),now()
    )
    on conflict(correlation_id,attempt) do update set
      status='failed',error_message=left(sqlerrm,1000),completed_at=now(),updated_at=now();

    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values(
      'Automation failure · '||coalesce(nullif(btrim(p_automation_key),''),'unknown'),
      'PPPP could not enqueue the managed HTTP automation. '||left(sqlerrm,800),
      current_date,'larte','hapur','automation_failure','intern','AUTOMATION:http:'||v_correlation::text
    )
    on conflict(source,source_ref) do update set
      title=excluded.title,detail=excluded.detail,due_date=excluded.due_date,priority='larte',status='hapur',done_at=null;
  exception when others then null;
  end;
  raise;
end;
$function$;

revoke all on function public.pppp_enqueue_automation_http_v1(text,text,text,integer,integer,uuid,integer) from public,anon,authenticated;
grant execute on function public.pppp_enqueue_automation_http_v1(text,text,text,integer,integer,uuid,integer) to service_role;

create or replace function public.pppp_reconcile_automation_http_v1(p_limit integer default 200)
returns jsonb
language plpgsql security definer
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
begin
  for r in
    select * from public.pppp_automation_http_runs
    where status='queued'
    order by queued_at
    limit v_limit
  loop
    select id,status_code,timed_out,error_msg,content,created
      into h
      from net._http_response
      where id=r.request_id
      limit 1;

    if not found then
      if r.queued_at<now()-interval '10 minutes' then
        if r.attempt<r.max_attempts then
          update public.pppp_automation_http_runs
          set status='retry_wait',error_message='No pg_net response after 10 minutes',next_retry_at=now()+interval '1 minute',updated_at=now()
          where id=r.id;
          v_retry_wait:=v_retry_wait+1;
        else
          update public.pppp_automation_http_runs
          set status='failed',error_message='No pg_net response after 10 minutes',completed_at=now(),updated_at=now()
          where id=r.id;
          insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
          values(
            'Automation failure · '||r.automation_key,
            'No pg_net response after 10 minutes; retries exhausted.',
            current_date,'larte','hapur','automation_failure','intern','AUTOMATION:http:'||r.correlation_id::text
          )
          on conflict(source,source_ref) do update set
            title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
          v_failed:=v_failed+1;
        end if;
      end if;
      continue;
    end if;

    if coalesce(h.timed_out,false)=false and h.error_msg is null and h.status_code between 200 and 399 then
      update public.pppp_automation_http_runs
      set status='succeeded',http_status=h.status_code,timed_out=coalesce(h.timed_out,false),error_message=null,
          response_excerpt=left(coalesce(h.content,''),1200),completed_at=coalesce(h.created,now()),updated_at=now()
      where id=r.id;
      v_succeeded:=v_succeeded+1;
    elsif r.attempt<r.max_attempts then
      v_delay:=case r.attempt when 1 then interval '1 minute' when 2 then interval '5 minutes' else interval '15 minutes' end;
      update public.pppp_automation_http_runs
      set status='retry_wait',http_status=h.status_code,timed_out=coalesce(h.timed_out,false),
          error_message=left(coalesce(h.error_msg,'HTTP '||coalesce(h.status_code::text,'unknown')),1000),
          response_excerpt=left(coalesce(h.content,''),1200),completed_at=coalesce(h.created,now()),next_retry_at=now()+v_delay,updated_at=now()
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
        'Managed HTTP automation exhausted '||r.max_attempts::text||' attempts. Last result: '||coalesce(h.error_msg,'HTTP '||coalesce(h.status_code::text,'unknown')),
        current_date,'larte','hapur','automation_failure','intern','AUTOMATION:http:'||r.correlation_id::text
      )
      on conflict(source,source_ref) do update set
        title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
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
        r.automation_key,r.request_url,r.secret_name,r.timeout_ms,r.max_attempts,r.correlation_id,r.attempt+1
      );
      update public.pppp_automation_http_runs set status='retried',updated_at=now() where id=r.id;
      v_retried:=v_retried+1;
    exception when others then
      update public.pppp_automation_http_runs
      set error_message=left('Retry enqueue failed: '||sqlerrm,1000),next_retry_at=now()+interval '5 minutes',updated_at=now()
      where id=r.id;
    end;
  end loop;

  return jsonb_build_object(
    'succeeded',v_succeeded,'retry_wait',v_retry_wait,'retried',v_retried,'failed',v_failed,'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_reconcile_automation_http_v1(integer) from public,anon,authenticated;
grant execute on function public.pppp_reconcile_automation_http_v1(integer) to service_role;

create or replace function public.pppp_automation_watchdog_v1()
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public','cron'
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
      select status,start_time from cron.job_run_details d where d.jobid=j.jobid order by start_time desc limit 1
    ) x on true
    where j.active and x.status is not null and x.status<>'succeeded'
  loop
    v_ref:='AUTOMATION:cron:'||r.jobname;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values(
      'Automation failure · cron '||r.jobname,
      'Latest pg_cron run is '||coalesce(r.status,'unknown')||' at '||coalesce(r.start_time::text,'unknown'),
      current_date,'larte','hapur','automation_failure','intern',v_ref
    )
    on conflict(source,source_ref) do update set
      title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
  set status='kryer',done_at=coalesce(done_at,now()),detail=coalesce(detail,'')||E'\nRecovered automatically: latest cron run is healthy.'
  where t.source='automation_failure'
    and t.source_ref like 'AUTOMATION:cron:%'
    and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
    and exists(
      select 1 from cron.job j
      left join lateral(select status from cron.job_run_details d where d.jobid=j.jobid order by start_time desc limit 1)x on true
      where 'AUTOMATION:cron:'||j.jobname=t.source_ref and j.active and x.status='succeeded'
    );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  for r in
    select worker_id,last_seen_at from public.local_ocr_workers
    where enabled and (last_seen_at is null or last_seen_at<now()-interval '15 minutes')
  loop
    v_ref:='AUTOMATION:worker:ocr:'||r.worker_id;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values(
      'Automation worker stale · OCR '||r.worker_id,
      'OCR worker heartbeat is older than 15 minutes. Last seen: '||coalesce(r.last_seen_at::text,'never'),
      current_date,'larte','hapur','automation_failure','intern',v_ref
    )
    on conflict(source,source_ref) do update set
      detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
  set status='kryer',done_at=coalesce(done_at,now()),detail=coalesce(detail,'')||E'\nRecovered automatically: OCR worker heartbeat is healthy.'
  where t.source='automation_failure'
    and t.source_ref like 'AUTOMATION:worker:ocr:%'
    and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
    and exists(
      select 1 from public.local_ocr_workers w
      where t.source_ref='AUTOMATION:worker:ocr:'||w.worker_id and w.enabled and w.last_seen_at>=now()-interval '15 minutes'
    );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  for r in
    select label,last_used_at from public.semantic_worker_keys
    where is_active and (last_used_at is null or last_used_at<now()-interval '15 minutes')
  loop
    v_ref:='AUTOMATION:worker:semantic:'||r.label;
    insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
    values(
      'Automation worker stale · Semantic AI',
      'Semantic worker heartbeat is older than 15 minutes. Worker: '||r.label||'. Last used: '||coalesce(r.last_used_at::text,'never'),
      current_date,'larte','hapur','automation_failure','intern',v_ref
    )
    on conflict(source,source_ref) do update set
      detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
    v_opened:=v_opened+1;
  end loop;

  update public.tasks t
  set status='kryer',done_at=coalesce(done_at,now()),detail=coalesce(detail,'')||E'\nRecovered automatically: Semantic worker heartbeat is healthy.'
  where t.source='automation_failure'
    and t.source_ref like 'AUTOMATION:worker:semantic:%'
    and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done')
    and exists(
      select 1 from public.semantic_worker_keys w
      where t.source_ref='AUTOMATION:worker:semantic:'||w.label and w.is_active and w.last_used_at>=now()-interval '15 minutes'
    );
  get diagnostics v_rows=row_count;
  v_closed:=v_closed+v_rows;

  return jsonb_build_object(
    'http',v_http,'alerts_opened_or_refreshed',v_opened,'alerts_closed',v_closed,'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_automation_watchdog_v1() from public,anon,authenticated;
grant execute on function public.pppp_automation_watchdog_v1() to service_role;

create or replace function public.pppp_automation_control_health_v1()
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if coalesce(auth.role(),'')<>'service_role' and not public.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;
  return jsonb_build_object(
    'generated_at',now(),
    'managed_http',jsonb_build_object(
      'queued',(select count(*) from public.pppp_automation_http_runs where status='queued'),
      'retry_wait',(select count(*) from public.pppp_automation_http_runs where status='retry_wait'),
      'failed_24h',(select count(*) from public.pppp_automation_http_runs where status='failed' and updated_at>=now()-interval '24 hours'),
      'succeeded_24h',(select count(*) from public.pppp_automation_http_runs where status='succeeded' and updated_at>=now()-interval '24 hours'),
      'latest_failed_at',(select max(updated_at) from public.pppp_automation_http_runs where status='failed')
    ),
    'open_failure_tasks',(
      select count(*) from public.tasks
      where source='automation_failure' and lower(coalesce(status,'')) not in ('kryer','mbyllur','done')
    )
  );
end;
$function$;

revoke all on function public.pppp_automation_control_health_v1() from public,anon;
grant execute on function public.pppp_automation_control_health_v1() to authenticated,service_role;

do $do$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname in ('automation-http-reconcile-1m','automation-watchdog-10m')
  loop
    perform cron.unschedule(v_jobid);
  end loop;
  perform cron.schedule(
    'automation-http-reconcile-1m','* * * * *',$cmd$select public.pppp_reconcile_automation_http_v1(500);$cmd$
  );
  perform cron.schedule(
    'automation-watchdog-10m','0-50/10 * * * *',$cmd$select public.pppp_automation_watchdog_v1();$cmd$
  );
end;
$do$;
