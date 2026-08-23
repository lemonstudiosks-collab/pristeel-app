-- PPPP automation operational readiness, phase A
-- Additive only: health visibility, deterministic legacy document cleanup,
-- and a guarded Drive reconciler schedule. No outbound communication,
-- project identity, commercial price, supplier decision or human gate changes.

create or replace function public.pppp_automation_health_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'cron', 'pg_temp'
as $$
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
$$;

revoke all on function public.pppp_automation_health_v1() from public, anon;
grant execute on function public.pppp_automation_health_v1() to authenticated, service_role;

-- The old Vision-era records pre-date the local OCR queue. Reclassifying them to
-- needs_ocr intentionally sends them through the CURRENT document intake first,
-- so Gmail bytes are archived and the existing local_ocr_auto_queue trigger owns
-- queue creation. No OCR-derived BOM facts are auto-confirmed.
update public.project_attachment_links
set analysis_status='needs_ocr',
    analysis_method='local-tesseract-migration-v1',
    analysis_error='Legacy Vision-era item migrated to the current local OCR intake path.',
    updated_at=now()
where analysis_status='needs_vision';

-- Known non-document OCR failures from the initial worker smoke are metadata noise.
with noise as (
  select a.id
  from public.project_attachment_links a
  where a.analysis_status='local_ocr_failed'
    and (lower(coalesce(a.attachment_name,''))='icon.png'
         or lower(coalesce(a.attachment_name,'')) like '~wrd%.jpg')
)
update public.project_attachment_links a
set analysis_status='metadata_noise',
    analysis_method='local-ocr-noise-reconcile-v1',
    analysis_error='Known inline/temporary image with no OCR text; removed from technical review backlog.',
    bom_status='none',
    updated_at=now()
from noise n
where a.id=n.id;

update public.tasks t
set status='kryer', done_at=coalesce(done_at,now()),
    detail=coalesce(detail,'') || E'\nAuto-reconciled: source attachment is known inline/temporary metadata noise.'
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('mbyllur','done','kryer')
  and t.source_ref in (
    select 'ATTACHMENT:'||a.id::text
    from public.project_attachment_links a
    where a.analysis_status='metadata_noise'
      and a.analysis_method='local-ocr-noise-reconcile-v1'
  );

-- S/MIME signatures are not technical project documents.
update public.project_attachment_links
set analysis_status='metadata_noise',
    analysis_method='smime-signature-noise-v1',
    analysis_error='S/MIME signature container; no technical document review required.',
    bom_status='none',
    updated_at=now()
where lower(coalesce(attachment_name,''))='smime.p7s'
  and lower(coalesce(attachment_mime_type,'')) like '%pkcs7%';

update public.tasks t
set status='kryer', done_at=coalesce(done_at,now()),
    detail=coalesce(detail,'') || E'\nAuto-reconciled: S/MIME signature is metadata, not a technical document.'
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('mbyllur','done','kryer')
  and t.source_ref in (
    select 'ATTACHMENT:'||a.id::text from public.project_attachment_links a
    where a.analysis_method='smime-signature-noise-v1'
  );

-- Deterministically collapse legacy unsupported duplicates ONLY where the source
-- content SHA and project are identical. One canonical review item remains per
-- actual binary; commercial/technical values are never altered.
with ranked as (
  select id,project_id,content_sha256,
         first_value(id) over(partition by project_id,content_sha256 order by id) canonical_id,
         row_number() over(partition by project_id,content_sha256 order by id) rn
  from public.project_attachment_links
  where analysis_status='unsupported'
    and bom_status='review'
    and content_sha256 is not null
    and btrim(content_sha256)<>''
), dup as (
  select id,canonical_id from ranked where rn>1
)
update public.project_attachment_links a
set analysis_status='duplicate_content',
    analysis_method='legacy-content-sha-dedupe-v1',
    analysis_error=null,
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb) || jsonb_build_object('duplicate_of_link_id',d.canonical_id,'reconciled_from','unsupported_review'),
    bom_status='already_present',
    updated_at=now()
from dup d where a.id=d.id;

update public.tasks t
set status='kryer', done_at=coalesce(done_at,now()),
    detail=coalesce(detail,'') || E'\nAuto-reconciled: exact same project/source binary already has a canonical review item.'
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('mbyllur','done','kryer')
  and t.source_ref in (
    select 'ATTACHMENT:'||a.id::text
    from public.project_attachment_links a
    where a.analysis_method='legacy-content-sha-dedupe-v1'
  );

-- Drive reconciler internal caller. The Edge function owns Google API behavior;
-- this wrapper only supplies the existing guarded cron secret.
create or replace function public.project_drive_reconciler_internal_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path = 'public', 'vault', 'net', 'pg_temp'
as $$
declare
  v_secret text;
  v_id bigint;
  v_limit integer := least(25,greatest(1,coalesce(p_limit,10)));
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;
  if coalesce(v_secret,'')='' then
    raise exception 'Internal cron secret is unavailable';
  end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-drive-reconciler?mode=apply&limit='||v_limit::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;
revoke all on function public.project_drive_reconciler_internal_request(integer) from public, anon, authenticated;
grant execute on function public.project_drive_reconciler_internal_request(integer) to service_role;

-- Idempotent cron installation.
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='project-drive-reconciler-hourly' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule('project-drive-reconciler-hourly','23 * * * *','select public.project_drive_reconciler_internal_request(10);');
end $$;
