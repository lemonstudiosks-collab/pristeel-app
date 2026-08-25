-- PPPP automation health v2
-- pg_cron can report a successful enqueue even when pg_net later receives HTTP 4xx/5xx.
-- Surface those async failures without changing any business workflow.

create or replace function public.pppp_automation_health_v1()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'cron', 'pg_temp'
as $function$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'generated_at', now(),
    'crons', jsonb_build_object(
      'active', (select count(*) from cron.job where active),
      'latest_succeeded', (
        select count(*)
        from cron.job j
        left join lateral (
          select r.status from cron.job_run_details r
          where r.jobid=j.jobid order by r.start_time desc limit 1
        ) x on true
        where j.active and x.status='succeeded'
      ),
      'latest_failed', (
        select count(*)
        from cron.job j
        left join lateral (
          select r.status from cron.job_run_details r
          where r.jobid=j.jobid order by r.start_time desc limit 1
        ) x on true
        where j.active and coalesce(x.status,'') not in ('','succeeded')
      ),
      'http_recent_failed', (
        select count(*)
        from net._http_response r
        where r.created >= now() - interval '60 minutes'
          and (coalesce(r.timed_out,false) or r.error_msg is not null or coalesce(r.status_code,0) >= 400)
      ),
      'http_recent_5xx', (
        select count(*)
        from net._http_response r
        where r.created >= now() - interval '60 minutes'
          and coalesce(r.status_code,0) >= 500
      ),
      'http_latest_failed_at', (
        select max(r.created)
        from net._http_response r
        where r.created >= now() - interval '60 minutes'
          and (coalesce(r.timed_out,false) or r.error_msg is not null or coalesce(r.status_code,0) >= 400)
      ),
      'jobs', coalesce((
        select jsonb_agg(jsonb_build_object(
          'name', j.jobname,
          'schedule', j.schedule,
          'status', x.status,
          'started_at', x.start_time,
          'ended_at', x.end_time
        ) order by j.jobname)
        from cron.job j
        left join lateral (
          select r.status,r.start_time,r.end_time
          from cron.job_run_details r
          where r.jobid=j.jobid order by r.start_time desc limit 1
        ) x on true
        where j.active
      ), '[]'::jsonb)
    ),
    'workers', jsonb_build_object(
      'ocr', coalesce((select jsonb_agg(jsonb_build_object(
        'worker_id',worker_id,'enabled',enabled,'last_seen_at',last_seen_at
      ) order by worker_id) from public.local_ocr_workers),'[]'::jsonb),
      'semantic', coalesce((select jsonb_agg(jsonb_build_object(
        'label',label,'active',is_active,'last_used_at',last_used_at
      ) order by last_used_at desc nulls last) from public.semantic_worker_keys),'[]'::jsonb)
    ),
    'queues', jsonb_build_object(
      'ocr', coalesce((select jsonb_object_agg(status,cnt) from (
        select status,count(*) cnt from public.local_ocr_jobs group by status
      ) q),'{}'::jsonb),
      'semantic', coalesce((select jsonb_object_agg(state,cnt) from (
        select state,count(*) cnt from public.semantic_ai_jobs group by state
      ) q),'{}'::jsonb)
    ),
    'backlog', jsonb_build_object(
      'legacy_needs_vision', (select count(*) from public.project_attachment_links where analysis_status='needs_vision'),
      'needs_ocr', (select count(*) from public.project_attachment_links where analysis_status='needs_ocr'),
      'local_ocr_queued', (select count(*) from public.project_attachment_links where analysis_status='local_ocr_queued'),
      'local_ocr_failed', (select count(*) from public.project_attachment_links where analysis_status='local_ocr_failed'),
      'document_review_tasks', (select count(*) from public.tasks where source='document_bom_review' and lower(coalesce(status,'')) not in ('mbyllur','done','kryer')),
      'rfq_draft_review', (select count(*) from public.rfq_log where status='draft_review'),
      'projects_without_drive', (select count(*) from public.projects where lower(coalesce(status,'')) not in ('humbur','lost','arkivuar','archived','mbyllur','closed','realizuar') and coalesce(nullif(btrim(drive_folder_id),''),nullif(btrim(drive_folder_url),'')) is null),
      'project_discovery_open', (select count(*) from public.project_discovery_candidates where status in ('open','review')),
      'supplier_offers_inbox', (select count(*) from public.offers_inbox),
      'supplier_offers_normalized', (select count(*) from public.offers),
      'supplier_decisions', (select count(*) from public.project_supplier_decisions),
      'invoices_in', (select count(*) from public.invoices_in),
      'invoices_out', (select count(*) from public.invoices_out)
    ),
    'tenders', jsonb_build_object(
      'ted', (select count(*) from public.kek_tender_watch where source_key like 'TED:%'),
      'app_albania', (select count(*) from public.kek_tender_watch where source_key like 'APP_AL:%'),
      'krpp_kek', (select count(*) from public.kek_tender_watch where source_key not like 'TED:%' and source_key not like 'APP_AL:%'),
      'linked_projects', (select count(*) from public.kek_tender_watch where project_id is not null)
    )
  ) into v;
  return v;
end;
$function$;

revoke all on function public.pppp_automation_health_v1() from public, anon;
grant execute on function public.pppp_automation_health_v1() to authenticated, service_role;
