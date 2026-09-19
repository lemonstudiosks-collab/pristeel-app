-- PPPP post-migration runtime repair v1.
-- Scope: repair stale backend URLs, restore deterministic/no-AI schedules,
-- enforce a non-null operational state for newly inserted active projects,
-- backfill existing null active states, and refresh read-only memory/snapshot layers.

do $repair_urls$
declare
  r record;
  v_def text;
  v_new_def text;
begin
  for r in
    select p.oid
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.prokind in ('f','p')
      and pg_get_functiondef(p.oid) ilike '%isymxqfqzkchbsrbhucf%'
  loop
    v_def := pg_get_functiondef(r.oid);
    v_new_def := replace(
      v_def,
      'https://isymxqfqzkchbsrbhucf.supabase.co',
      'https://awqfpnzqwfjrjefoktgd.supabase.co'
    );
    if v_new_def = v_def then
      raise exception 'old_project_url_repair_failed_for_%', r.oid::regprocedure::text;
    end if;
    execute v_new_def;
  end loop;
end
$repair_urls$;

create or replace function public.pppp_projects_default_operational_state_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $fn$
begin
  if new.operational_state is null
     and lower(coalesce(new.status,'pritje')) not in
       ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled','archived')
  then
    new.operational_state := 'active_work';
    new.operational_state_at := coalesce(new.operational_state_at, clock_timestamp());
    new.operational_state_source := coalesce(nullif(new.operational_state_source,''),'project-insert-default-v1');
  end if;
  return new;
end;
$fn$;

drop trigger if exists trg_pppp_projects_default_operational_state_v1 on public.projects;
create trigger trg_pppp_projects_default_operational_state_v1
before insert on public.projects
for each row
execute function public.pppp_projects_default_operational_state_v1();

update public.projects
set operational_state='active_work',
    operational_state_at=coalesce(operational_state_at,last_activity_at,created_at,clock_timestamp()),
    operational_state_source=coalesce(nullif(operational_state_source,''),'project-state-null-repair-v1')
where operational_state is null
  and lower(coalesce(status,'pritje')) not in
    ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled','archived');

do $schedule$
declare
  v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='project-memory-baseline-hourly'
  loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'project-memory-baseline-hourly',
    '12 * * * *',
    'select public.pppp_project_memory_baseline_reconcile_v1(true,100);'
  );

  for v_job in select jobid from cron.job where jobname='pppp-intelligence-snapshot-hourly-v1'
  loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'pppp-intelligence-snapshot-hourly-v1',
    '5 * * * *',
    'select public.pppp_intelligence_snapshot_capture_v1(''cron'');'
  );
end
$schedule$;

select public.pppp_project_memory_baseline_reconcile_v1(true,100);
select public.pppp_intelligence_snapshot_capture_v1('post_migration_runtime_repair_v1');
