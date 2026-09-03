-- PPPP automation backlog hardening v1
-- Scope: backend/automation only. No Home/UI behavior is changed here.
--
-- 1) Enable semantic-local orchestration only while a real local worker is fresh.
-- 2) Give concrete downstream client-offer evidence precedence over stale quote tasks.
-- 3) Prevent any new documents_registry doc_nr collision atomically without rewriting history.

create or replace function public.semantic_worker_ready_v1(
  p_max_age interval default interval '15 minutes'
)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $function$
  select exists(
    select 1
    from public.semantic_worker_keys w
    where w.is_active
      and w.last_used_at is not null
      and w.last_used_at >= now() - greatest(coalesce(p_max_age,interval '15 minutes'),interval '1 minute')
  );
$function$;

revoke all on function public.semantic_worker_ready_v1(interval) from public,anon,authenticated;
grant execute on function public.semantic_worker_ready_v1(interval) to service_role;

-- The managed HTTP queue remains the single dispatcher. A stale/offline local worker
-- makes this a no-op, so cron cannot create an unattended semantic backlog.
create or replace function public.semantic_local_orchestrator_internal_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if not public.semantic_worker_ready_v1(interval '15 minutes') then
    return null;
  end if;

  return public.pppp_enqueue_automation_http_v1(
    'semantic-local-orchestrator',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-orchestrator?limit='||greatest(1,least(coalesce(p_limit,10),30))::text,
    'gmail_tracker_cron_secret',120000,3
  );
end;
$function$;

revoke all on function public.semantic_local_orchestrator_internal_request(integer) from public,anon,authenticated;
grant execute on function public.semantic_local_orchestrator_internal_request(integer) to service_role;

-- Preserve the established health payload and add an explicit semantic readiness block.
create or replace function public.pppp_automation_control_health_v1()
returns jsonb
language plpgsql
security definer
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
    'semantic_local',jsonb_build_object(
      'ready',public.semantic_worker_ready_v1(interval '15 minutes'),
      'active_workers',(select count(*) from public.semantic_worker_keys where is_active),
      'fresh_workers',(select count(*) from public.semantic_worker_keys where is_active and last_used_at>=now()-interval '15 minutes'),
      'pending_jobs',(select count(*) from public.semantic_ai_jobs where state='pending'),
      'claimed_jobs',(select count(*) from public.semantic_ai_jobs where state='claimed'),
      'oldest_pending_at',(select min(created_at) from public.semantic_ai_jobs where state='pending'),
      'cron_enabled',exists(select 1 from cron.job where jobname='semantic-local-orchestrator-5m' and active)
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

-- Safe to enable unattended cadence now: dispatch is gated by a fresh worker heartbeat.
do $do$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname='semantic-local-orchestrator-5m'
  loop
    perform cron.unschedule(v_jobid);
  end loop;

  perform cron.schedule(
    'semantic-local-orchestrator-5m',
    '7-57/5 * * * *',
    $cmd$select public.semantic_local_orchestrator_internal_request(10);$cmd$
  );
end;
$do$;

-- A concrete outbound client offer on the same project is stronger lifecycle evidence
-- than an older project_decision_auto/quote task, even when the document sequence differs
-- (e.g. quote 022 -> commercial offer 023).
create or replace function public.pppp_task_lifecycle_close_enforcer_v1()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_downstream_offer boolean:=false;
begin
  if position('PPPP: lifecycle-auto-closed —' in coalesce(new.detail,'')) > 0
     or position('PPPP: lifecycle-dedup —' in coalesce(new.detail,'')) > 0
     or position('PPPP: handoff u zëvendësua nga veprimi konkret i projektit.' in coalesce(new.detail,'')) > 0
     or position('PPPP: downstream-client-offer-auto-closed —' in coalesce(new.detail,'')) > 0 then
    new.status := 'mbyllur';
    new.done_at := coalesce(new.done_at, now());
    return new;
  end if;

  if new.project_id is not null
     and new.source='project_decision_auto'
     and lower(coalesce(new.status,'')) not in ('kryer','mbyllur','done','closed') then
    select
      exists(
        select 1
        from public.documents_registry d
        where d.project_id=new.project_id
          and d.series='QUO'
          and (
            lower(coalesce(d.offer_state->>'pst_document_status',''))='sent'
            or nullif(d.offer_state->>'sent_at','') is not null
          )
      )
      or exists(
        select 1
        from public.project_emails e
        where e.project_id=new.project_id
          and e.direction='outgoing'
          and e.sent_at >= coalesce(new.created_at,'epoch'::timestamptz)
          and coalesce(e.has_attachments,false)
          and lower(coalesce(e.subject,'')||' '||coalesce(e.snippet,''))
              ~ '(offer|quotation|quote|angebot|offerte|ponuda|ofert[aeë])'
      )
    into v_downstream_offer;

    if v_downstream_offer then
      new.status:='mbyllur';
      new.done_at:=coalesce(new.done_at,now());
      new.detail:=concat_ws(E'\n',nullif(new.detail,''),
        'PPPP: downstream-client-offer-auto-closed — një ofertë outbound e lidhur me të njëjtin projekt e ka zëvendësuar këtë quote/decision task.');
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.pppp_task_lifecycle_close_enforcer_v1() from public,anon,authenticated;
grant execute on function public.pppp_task_lifecycle_close_enforcer_v1() to service_role;

-- Trigger already exists on upgraded databases, but recreate it so fresh installs and
-- restored environments use the same final-precedence ordering.
drop trigger if exists zzzz_pppp_task_lifecycle_close_enforcer_v1 on public.tasks;
create trigger zzzz_pppp_task_lifecycle_close_enforcer_v1
before insert or update of project_id,status,source,title,detail,done_at
on public.tasks
for each row execute function public.pppp_task_lifecycle_close_enforcer_v1();

-- Re-evaluate only the legacy generic decision tasks; human/manual task state is untouched.
update public.tasks
set status=status
where source='project_decision_auto'
  and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');

-- Prevent future document-number collisions without attempting to rewrite historical rows.
-- The advisory lock makes the check safe against concurrent inserts from different flows.
create or replace function public.pppp_documents_registry_doc_nr_guard_v1()
returns trigger
language plpgsql
set search_path='public','pg_temp'
as $function$
declare
  v_doc_nr text:=lower(btrim(coalesce(new.doc_nr,'')));
begin
  if v_doc_nr='' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('documents_registry:doc_nr:'||v_doc_nr));

  if exists(
    select 1
    from public.documents_registry d
    where lower(btrim(coalesce(d.doc_nr,'')))=v_doc_nr
      and d.id is distinct from new.id
  ) then
    raise exception 'Document number already exists: %',new.doc_nr using errcode='23505';
  end if;

  return new;
end;
$function$;

revoke all on function public.pppp_documents_registry_doc_nr_guard_v1() from public,anon,authenticated;
grant execute on function public.pppp_documents_registry_doc_nr_guard_v1() to service_role;

create index if not exists documents_registry_doc_nr_normalized_lookup_idx
on public.documents_registry ((lower(btrim(doc_nr))))
where nullif(btrim(doc_nr),'') is not null;

drop trigger if exists pppp_documents_registry_doc_nr_guard_v1 on public.documents_registry;
create trigger pppp_documents_registry_doc_nr_guard_v1
before insert or update of doc_nr
on public.documents_registry
for each row execute function public.pppp_documents_registry_doc_nr_guard_v1();

comment on function public.semantic_worker_ready_v1(interval) is
  'True only when an active semantic worker has authenticated within the freshness window; used to gate unattended semantic orchestration.';
comment on function public.pppp_documents_registry_doc_nr_guard_v1() is
  'Atomic advisory-lock guard preventing new normalized documents_registry.doc_nr collisions while preserving historical rows.';
