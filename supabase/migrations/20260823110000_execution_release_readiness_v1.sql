-- PPPP execution release readiness.
-- This is an evidence gate only: it creates/updates an internal task from known review blockers.
-- It NEVER advances project stage/status and NEVER releases production/transport automatically.

create or replace function public.pppp_execution_release_snapshot_v1(p_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  p public.projects%rowtype;
  v_requirements_review integer:=0;
  v_requirements_confirmed integer:=0;
  v_bom_review integer:=0;
  v_attachment_review integer:=0;
  v_document_tasks integer:=0;
  v_ready boolean:=false;
begin
  select * into p from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;

  select count(*) filter(where status='review'),count(*) filter(where status='confirmed')
    into v_requirements_review,v_requirements_confirmed
  from public.project_requirements where project_id=p_project_id;

  select count(*) into v_bom_review
  from public.bom_items
  where project_id=p_project_id and needs_review is true;

  select count(*) into v_attachment_review
  from public.project_attachment_links a
  where a.project_id=p_project_id::text
    and (
      a.bom_status in ('review','conflict_review')
      or a.analysis_status in ('needs_vision','needs_ocr','local_ocr_queued','local_ocr_failed','image_review')
    );

  select count(*) into v_document_tasks
  from public.tasks t
  where t.project_id=p_project_id
    and t.source in ('document_bom_review','document_image_review')
    and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed');

  v_ready := v_requirements_review=0 and v_bom_review=0 and v_attachment_review=0 and v_document_tasks=0;
  return jsonb_build_object(
    'project_id',p.id,'project_name',p.name,'status',p.status,'pipeline_stage',p.pipeline_stage,
    'requirements_review',v_requirements_review,
    'requirements_confirmed',v_requirements_confirmed,
    'bom_review',v_bom_review,
    'attachment_review',v_attachment_review,
    'document_review_tasks',v_document_tasks,
    'ready',v_ready,
    'generated_at',now()
  );
end;
$$;
revoke all on function public.pppp_execution_release_snapshot_v1(uuid) from public,anon,authenticated;
grant execute on function public.pppp_execution_release_snapshot_v1(uuid) to service_role;

create or replace function public.pppp_sync_execution_release_readiness_v1()
returns jsonb
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  p record;
  s jsonb;
  v_ready boolean;
  v_checked integer:=0;
  v_ready_count integer:=0;
  v_blocked_count integer:=0;
  v_detail text;
begin
  -- Close the automated readiness signal when a project leaves execution or becomes terminal.
  update public.tasks t
     set status='mbyllur',done_at=coalesce(done_at,now())
   where t.source='execution_release_readiness'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
     and not exists(
       select 1 from public.projects p0
       where p0.id=t.project_id
         and p0.pipeline_stage in ('production_control','factory_audit','transport')
         and lower(coalesce(p0.status,'')) not in ('realizuar','mbyllur','closed','humbur','lost','arkivuar','archived','cancelled','canceled')
     );

  for p in
    select id,name,status,pipeline_stage
    from public.projects
    where pipeline_stage in ('production_control','factory_audit','transport')
      and lower(coalesce(status,'')) not in ('realizuar','mbyllur','closed','humbur','lost','arkivuar','archived','cancelled','canceled')
    order by name
  loop
    v_checked:=v_checked+1;
    s:=public.pppp_execution_release_snapshot_v1(p.id);
    v_ready:=coalesce((s->>'ready')::boolean,false);
    if v_ready then v_ready_count:=v_ready_count+1; else v_blocked_count:=v_blocked_count+1; end if;

    v_detail :=
      'PPPP release-readiness evidence check.'||E'\n'||
      'Requirements review: '||coalesce(s->>'requirements_review','0')||E'\n'||
      'BOM needs review: '||coalesce(s->>'bom_review','0')||E'\n'||
      'Attachment/document blockers: '||coalesce(s->>'attachment_review','0')||E'\n'||
      'Open document review tasks: '||coalesce(s->>'document_review_tasks','0')||E'\n'||
      'Confirmed requirements: '||coalesce(s->>'requirements_confirmed','0')||E'\n'||
      case when v_ready
        then 'Nuk ka blocker të njohur në evidence queues. HUMAN GATE: verifiko dosjen dhe bëj release/factory-audit vendimin manualisht.'
        else 'Ka blocker të njohur. Mbylli review-t para release/factory-audit. PPPP nuk avancon stage automatikisht.' end;

    insert into public.tasks(project_id,title,detail,due_date,priority,status,done_at,source,source_ref,category)
    values(
      p.id,
      case when v_ready then '[AUTO] Evidence gati për release review — ' else '[AUTO] Release readiness blocked — ' end||p.name,
      v_detail,
      current_date,
      case when v_ready then 'mesatare' else 'e larte' end,
      case when v_ready then 'kryer' else 'hapur' end,
      case when v_ready then now() else null end,
      'execution_release_readiness',p.id::text,'intern'
    )
    on conflict (source,source_ref) do update
      set project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,due_date=excluded.due_date,
          priority=excluded.priority,status=excluded.status,
          done_at=case when excluded.status='kryer' then coalesce(public.tasks.done_at,excluded.done_at) else null end,
          category=excluded.category;
  end loop;

  return jsonb_build_object('checked',v_checked,'ready',v_ready_count,'blocked',v_blocked_count,'generated_at',now());
end;
$$;
revoke all on function public.pppp_sync_execution_release_readiness_v1() from public,anon,authenticated;
grant execute on function public.pppp_sync_execution_release_readiness_v1() to service_role;

-- Seed current execution projects immediately.
select public.pppp_sync_execution_release_readiness_v1();

-- Keep the evidence signal current. The cron changes tasks only, never project stage/status.
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='execution-release-readiness-hourly' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule('execution-release-readiness-hourly','29 * * * *','select public.pppp_sync_execution_release_readiness_v1();');
end $$;
