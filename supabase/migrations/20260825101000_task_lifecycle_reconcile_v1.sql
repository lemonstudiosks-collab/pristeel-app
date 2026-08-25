-- PPPP automated task lifecycle reconciliation v1
-- Narrow additive guard: stale/duplicate automation must not become human workload.
-- Human, contract and finance tasks are intentionally outside this reconciler.

create or replace function public.pppp_task_lifecycle_reconcile_v1(p_project_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_terminal_closed integer := 0;
  v_execution_closed integer := 0;
  v_handoff_closed integer := 0;
  v_duplicates_closed integer := 0;
begin
  -- A terminal project may retain finance/contract obligations, but old automated
  -- offer/procurement/document work must stop surfacing as current human work.
  update public.tasks t
     set status = 'mbyllur',
         done_at = coalesce(t.done_at, now()),
         detail = case
           when position('PPPP: lifecycle-auto-closed — project terminal.' in coalesce(t.detail,'')) > 0 then t.detail
           else concat_ws(E'\n', nullif(t.detail,''), 'PPPP: lifecycle-auto-closed — project terminal.')
         end
    from public.projects p
   where p.id = t.project_id
     and (p_project_id is null or p.id = p_project_id)
     and t.status = 'hapur'
     and lower(coalesce(p.status,'')) in (
       'humbur','lost','arkivuar','archived','mbyllur','closed','closedlost',
       'cancelled','canceled','realizuar'
     )
     and t.source in (
       'project_decision_auto','email_request_auto','supplier_update_auto','dynamic_plan_auto',
       'sla_auto','auto_followup','semantic_brain_auto','commercial_intake_review',
       'project_discovery_auto','execution_won','execution_release_readiness','document_bom_review'
     );
  get diagnostics v_terminal_closed = row_count;

  -- Once execution is explicitly active, offer/procurement discovery automation is
  -- superseded by execution owners. Execution/document/contract/finance tasks remain.
  update public.tasks t
     set status = 'mbyllur',
         done_at = coalesce(t.done_at, now()),
         detail = case
           when position('PPPP: lifecycle-auto-closed — execution superseded this pre-award action.' in coalesce(t.detail,'')) > 0 then t.detail
           else concat_ws(E'\n', nullif(t.detail,''), 'PPPP: lifecycle-auto-closed — execution superseded this pre-award action.')
         end
    from public.projects p
   where p.id = t.project_id
     and (p_project_id is null or p.id = p_project_id)
     and t.status = 'hapur'
     and lower(coalesce(p.operational_state,'')) = 'execution'
     and t.source in (
       'project_decision_auto','email_request_auto','supplier_update_auto','dynamic_plan_auto',
       'sla_auto','auto_followup','semantic_brain_auto','commercial_intake_review','project_discovery_auto'
     );
  get diagnostics v_execution_closed = row_count;

  -- A discovery handoff is transient. Any concrete open action for the same project
  -- supersedes it, even if an older trigger run was missed.
  update public.tasks h
     set status = 'mbyllur',
         done_at = coalesce(h.done_at, now()),
         detail = case
           when position('PPPP: handoff u zëvendësua nga veprimi konkret i projektit.' in coalesce(h.detail,'')) > 0 then h.detail
           else concat_ws(E'\n', nullif(h.detail,''), 'PPPP: handoff u zëvendësua nga veprimi konkret i projektit.')
         end
   where h.status = 'hapur'
     and h.source = 'project_discovery_auto'
     and h.project_id is not null
     and (p_project_id is null or h.project_id = p_project_id)
     and exists (
       select 1
         from public.tasks t2
        where t2.project_id = h.project_id
          and t2.status = 'hapur'
          and coalesce(t2.source,'') <> 'project_discovery_auto'
     );
  get diagnostics v_handoff_closed = row_count;

  -- Multiple emails can describe the same business action. Keep the newest evidence
  -- row per project/source/title and retire older automated duplicates only.
  with ranked as (
    select t.id,
           row_number() over (
             partition by t.project_id,
                          t.source,
                          regexp_replace(lower(btrim(coalesce(t.title,''))), '[[:space:]]+', ' ', 'g')
             order by t.created_at desc, t.id desc
           ) as rn
      from public.tasks t
     where t.status = 'hapur'
       and t.project_id is not null
       and (p_project_id is null or t.project_id = p_project_id)
       and btrim(coalesce(t.title,'')) <> ''
       and t.source in (
         'project_decision_auto','email_request_auto','supplier_update_auto','dynamic_plan_auto',
         'sla_auto','auto_followup','semantic_brain_auto','commercial_intake_review',
         'project_discovery_auto','execution_won','execution_release_readiness','document_bom_review'
       )
  ), duplicates as (
    select id from ranked where rn > 1
  )
  update public.tasks t
     set status = 'mbyllur',
         done_at = coalesce(t.done_at, now()),
         detail = case
           when position('PPPP: lifecycle-dedup — superseded by newer equivalent automated action.' in coalesce(t.detail,'')) > 0 then t.detail
           else concat_ws(E'\n', nullif(t.detail,''), 'PPPP: lifecycle-dedup — superseded by newer equivalent automated action.')
         end
    from duplicates d
   where t.id = d.id;
  get diagnostics v_duplicates_closed = row_count;

  return jsonb_build_object(
    'project_id', p_project_id,
    'terminal_closed', v_terminal_closed,
    'execution_closed', v_execution_closed,
    'handoff_closed', v_handoff_closed,
    'duplicates_closed', v_duplicates_closed,
    'total_closed', v_terminal_closed + v_execution_closed + v_handoff_closed + v_duplicates_closed,
    'reconciled_at', now()
  );
end;
$function$;

revoke all on function public.pppp_task_lifecycle_reconcile_v1(uuid) from public, anon, authenticated;
grant execute on function public.pppp_task_lifecycle_reconcile_v1(uuid) to service_role;

create or replace function public.pppp_task_lifecycle_project_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  perform public.pppp_task_lifecycle_reconcile_v1(new.id);
  return new;
end;
$function$;

create or replace function public.pppp_task_lifecycle_task_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
begin
  if pg_trigger_depth() > 1 then return new; end if;
  if new.project_id is not null then
    perform public.pppp_task_lifecycle_reconcile_v1(new.project_id);
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_task_lifecycle_project_trigger_v1() from public, anon, authenticated;
revoke all on function public.pppp_task_lifecycle_task_trigger_v1() from public, anon, authenticated;
grant execute on function public.pppp_task_lifecycle_project_trigger_v1() to service_role;
grant execute on function public.pppp_task_lifecycle_task_trigger_v1() to service_role;

drop trigger if exists trg_pppp_task_lifecycle_project_v1 on public.projects;
create trigger trg_pppp_task_lifecycle_project_v1
after update of status, operational_state, pipeline_stage
on public.projects
for each row execute function public.pppp_task_lifecycle_project_trigger_v1();

drop trigger if exists trg_pppp_task_lifecycle_task_v1 on public.tasks;
create trigger trg_pppp_task_lifecycle_task_v1
after insert or update of project_id, status, source, title
on public.tasks
for each row execute function public.pppp_task_lifecycle_task_trigger_v1();

-- Triggers are immediate; this sweep is a cheap resilience layer for old/imported rows.
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='task-lifecycle-reconcile-15m' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'task-lifecycle-reconcile-15m',
    '12-57/15 * * * *',
    'select public.pppp_task_lifecycle_reconcile_v1(null);'
  );
end $$;

-- Reconcile existing live backlog once on deployment.
select public.pppp_task_lifecycle_reconcile_v1(null);
