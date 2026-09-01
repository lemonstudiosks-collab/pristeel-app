-- Route existing PPPP async HTTP automations through the managed dispatcher.
-- Existing function signatures, endpoint URLs and cron cadence are preserved.

create or replace function private.dynamic_plan_internal_request(p_limit integer default 10)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
declare v_limit integer:=least(20,greatest(1,coalesce(p_limit,10))); begin
 return public.pppp_enqueue_automation_http_v1(
   'project-dynamic-plan-intake',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-dynamic-plan-intake?limit='||v_limit::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function private.gmail_attachment_reconcile_internal_request(p_limit integer default 40)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
declare v_limit integer:=least(200,greatest(1,coalesce(p_limit,40))); begin
 return public.pppp_enqueue_automation_http_v1(
   'gmail-attachment-reconciler',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-attachment-reconciler?limit='||v_limit::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function private.gmail_ted_sales_reconcile_internal_request(p_limit integer default 300)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
begin
 return public.pppp_enqueue_automation_http_v1(
   'gmail-ted-sales-reconciler',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-ted-sales-reconciler?days=3&limit='||greatest(20,least(coalesce(p_limit,300),1000))::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function public.commercial_intake_internal_request(p_limit integer default 250)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
declare v_limit integer:=least(800,greatest(10,coalesce(p_limit,250))); begin
 return public.pppp_enqueue_automation_http_v1(
   'commercial-intake-orchestrator',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/commercial-intake-orchestrator?limit='||v_limit::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function public.project_drive_reconciler_internal_request(p_limit integer default 10)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
declare v_limit integer:=least(25,greatest(1,coalesce(p_limit,10))); begin
 return public.pppp_enqueue_automation_http_v1(
   'project-drive-reconciler',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-drive-reconciler?mode=apply&limit='||v_limit::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function public.semantic_local_orchestrator_internal_request(p_limit integer default 10)
returns bigint language plpgsql security definer set search_path to 'pg_catalog','public' as $function$
begin
 return public.pppp_enqueue_automation_http_v1(
   'semantic-local-orchestrator',
   'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-orchestrator?limit='||greatest(1,least(coalesce(p_limit,10),30))::text,
   'gmail_tracker_cron_secret',120000,3
 );
end;$function$;

create or replace function public.gmail_tracker_internal_request(
  p_action text default 'run',p_days integer default 7,p_limit integer default 20
) returns bigint
language plpgsql security definer set search_path to 'pg_catalog','public'
as $function$
declare
  v_action text;
  v_days integer:=least(14,greatest(1,coalesce(p_days,7)));
  v_limit integer:=least(40,greatest(1,coalesce(p_limit,20)));
  v_url text;
begin
  if p_action not in ('ping','ingest_preview','ingest','body_hydrate','attachment_sync','scan_preview','scan','sla','run') then
    raise exception 'Unsupported gmail tracker action: %',p_action;
  end if;
  v_action:=p_action;
  v_url:='https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-tracker?action='||v_action;
  if v_action in ('ingest_preview','ingest','scan_preview','scan') then
    v_url:=v_url||'&days='||v_days;
  elsif v_action in ('body_hydrate','attachment_sync') then
    v_url:=v_url||'&limit='||v_limit;
  elsif v_action='run' then
    v_url:=v_url||'&days='||v_days||'&body_limit='||v_limit||'&attachment_limit='||v_limit;
  end if;
  return public.pppp_enqueue_automation_http_v1(
    'gmail-tracker-'||v_action,v_url,'gmail_tracker_cron_secret',120000,3
  );
end;$function$;

create or replace function public.pppp_project_event_intelligence_internal_request(
  p_days integer default 3,p_limit integer default 2
) returns bigint
language plpgsql security definer set search_path to 'pg_catalog','public'
as $function$
declare
  v_days integer:=greatest(1,least(coalesce(p_days,3),7));
  v_limit integer:=greatest(1,least(coalesce(p_limit,2),20));
begin
  return public.pppp_enqueue_automation_http_v1(
    'project-event-intelligence',
    format('https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-project-event-intelligence?days=%s&limit=%s',v_days,v_limit),
    'gmail_tracker_cron_secret',120000,3
  );
end;$function$;

-- Preserve the existing large-file resource guard and route only the final Edge call.
create or replace function public.project_document_intake_internal_request(
  p_action text default 'run',p_limit integer default 5
) returns bigint
language plpgsql security definer set search_path to 'pg_catalog','public'
as $function$
declare
  v_action text:=case when p_action in ('run','preview','ping') then p_action else 'run' end;
  v_limit integer:=least(3,greatest(1,coalesce(p_limit,3)));
begin
  if v_action='run' then
    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
    select
      pal.project_id::uuid,
      'Rishiko dokumentin e madh: '||coalesce(nullif(pal.attachment_name,''),'attachment'),
      'PPPP e ndaloi përpunimin automatik sepse skedari kalon kufirin e sigurt të memories për Edge Function. Burimi ruhet; kërkohet përpunim lokal/manual ose konvertim. Attachment link #'||pal.id::text,
      current_date,'larte','hapur','document_bom_review','ATTACHMENT:'||pal.id::text,'intern'
    from public.project_attachment_links pal
    where pal.analysis_status in ('pending','retry','archived','needs_email_parse','needs_ocr')
      and (
        coalesce(pal.attachment_size_bytes,0)>12582912
        or (lower(coalesce(pal.attachment_name,'')) ~ '\.(zip|rar|7z)$' and coalesce(pal.attachment_size_bytes,0)>5242880)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.(xlsx|xls)$' or lower(coalesce(pal.attachment_mime_type,'')) like '%spreadsheet%') and coalesce(pal.attachment_size_bytes,0)>3145728)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.eml$' or lower(coalesce(pal.attachment_mime_type,''))='message/rfc822') and coalesce(pal.attachment_size_bytes,0)>5242880)
      )
    on conflict(source,source_ref) do nothing;

    update public.project_attachment_links pal
    set analysis_status='review',
        analysis_method='resource-guard-v2',
        analysis_error='File exceeds the safe automatic Edge intake resource limit; local/manual large-file processing is required.',
        analyzed_at=coalesce(analyzed_at,now()),
        updated_at=now(),
        bom_status=case when coalesce(bom_status,'none')='none' then 'review' else bom_status end
    where pal.analysis_status in ('pending','retry','archived','needs_email_parse','needs_ocr')
      and (
        coalesce(pal.attachment_size_bytes,0)>12582912
        or (lower(coalesce(pal.attachment_name,'')) ~ '\.(zip|rar|7z)$' and coalesce(pal.attachment_size_bytes,0)>5242880)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.(xlsx|xls)$' or lower(coalesce(pal.attachment_mime_type,'')) like '%spreadsheet%') and coalesce(pal.attachment_size_bytes,0)>3145728)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.eml$' or lower(coalesce(pal.attachment_mime_type,''))='message/rfc822') and coalesce(pal.attachment_size_bytes,0)>5242880)
      );
  end if;

  return public.pppp_enqueue_automation_http_v1(
    'project-document-intake',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action='||v_action||'&limit='||v_limit::text,
    'gmail_tracker_cron_secret',120000,3
  );
end;$function$;

-- Replace only the direct-HTTP cron definitions; cadence remains unchanged.
do $do$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job
    where jobname in (
      'hubspot-sync-every-15min','gmail-tracker-hourly','gmail-fast-ingest-5m',
      'gmail-project-intake-5m','project-action-engine-5m','project-event-intelligence-5m'
    )
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'hubspot-sync-every-15min','*/15 * * * *',
    $cmd$select public.pppp_enqueue_automation_http_v1('hubspot-sync','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/hubspot-sync?action=pull','hubspot_sync_cron_secret',60000,3);$cmd$
  );
  perform cron.schedule(
    'gmail-tracker-hourly','5 * * * *',
    $cmd$select public.pppp_enqueue_automation_http_v1('gmail-tracker-run','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-tracker?action=run&days=7','gmail_tracker_cron_secret',120000,3);$cmd$
  );
  perform cron.schedule(
    'gmail-fast-ingest-5m','1-56/5 * * * *',
    $cmd$select public.pppp_enqueue_automation_http_v1('gmail-fast-ingest','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-tracker?action=ingest&days=1','gmail_tracker_cron_secret',120000,3);$cmd$
  );
  perform cron.schedule(
    'gmail-project-intake-5m','2-57/5 * * * *',
    $cmd$select private.gmail_ted_sales_reconcile_internal_request(300); select public.pppp_reconcile_email_context_v1(7); select public.pppp_enqueue_automation_http_v1('gmail-project-intake','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-project-intake?days=2&limit=300','gmail_tracker_cron_secret',120000,3);$cmd$
  );
  perform cron.schedule(
    'project-action-engine-5m','3-58/5 * * * *',
    $cmd$select public.pppp_enqueue_automation_http_v1('project-action-engine','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-action-engine?days=3&limit=500','gmail_tracker_cron_secret',120000,3);$cmd$
  );
  perform cron.schedule(
    'project-event-intelligence-5m','9-59/5 * * * *',
    $cmd$select public.pppp_enqueue_automation_http_v1('project-event-intelligence','https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-project-event-intelligence?days=3&limit=8','gmail_tracker_cron_secret',120000,3);$cmd$
  );
end;
$do$;
