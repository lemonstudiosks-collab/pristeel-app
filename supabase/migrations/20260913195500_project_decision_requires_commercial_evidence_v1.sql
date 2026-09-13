-- The project decision engine is commercial-state logic. If a project has no supplier
-- offer, no dynamic plan and no PRISTEEL quotation draft, it must not fabricate an
-- urgent commercial-review task or force a client_offer analysis stage.

do $$
declare
  v_def text;
  v_new text;
  v_anchor text := '  if v_draft_pending and v_install_count>=2 and v_scope_risk and v_plan_id is not null then';
  v_guard text := $guard$
  if v_offer_count=0 and v_plan_id is null and v_draft_nr is null then
    delete from public.project_analyses
    where project_id=p_project::text
      and model='project-decision-snapshot-v1';

    update public.tasks
    set status='mbyllur',
        done_at=coalesce(done_at,now()),
        detail=concat_ws(E'\n',nullif(detail,''),'PPPP: nuk ka provë komerciale aktive (ofertë furnitori, plan dinamik ose draft ofertë PRISTEEL); task-u automatik komercial u mbyll.')
    where project_id=p_project
      and source='project_decision_auto'
      and source_ref='PROJECT_STATE:'||p_project::text
      and lower(coalesce(status,'')) not in ('kryer','done','mbyllur','closed');

    update public.projects set updated_at=now() where id=p_project;
    return;
  end if;

$guard$;
begin
  select pg_get_functiondef('public.pppp_refresh_project_decision(uuid)'::regprocedure) into v_def;
  if position(v_anchor in v_def)=0 then
    raise exception 'pppp_refresh_project_decision source shape changed; review commercial-evidence guard migration';
  end if;
  v_new := replace(v_def,v_anchor,v_guard||v_anchor);
  execute v_new;
end
$$;

-- Reconcile any currently open generic commercial-decision task that has no commercial
-- evidence. This is derived state only; operator tasks and protected decisions are untouched.
update public.tasks t
set status='mbyllur',
    done_at=coalesce(t.done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'PPPP: nuk ka provë komerciale aktive; task-u automatik komercial u mbyll.')
where t.source='project_decision_auto'
  and t.source_ref='PROJECT_STATE:'||t.project_id::text
  and lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed')
  and not exists (select 1 from public.offers o where o.project_id=t.project_id)
  and not exists (
    select 1 from public.project_attachment_links pal
    where pal.project_id::text=t.project_id::text
      and (pal.extracted_data->>'document_type'='dynamic_plan' or pal.extracted_data ? 'dynamic_plan')
  )
  and not exists (select 1 from public.documents_registry d where d.project_id=t.project_id and d.series='QUO');

delete from public.project_analyses a
where a.model='project-decision-snapshot-v1'
  and exists (
    select 1 from public.projects p
    where p.id::text=a.project_id
      and not exists (select 1 from public.offers o where o.project_id=p.id)
      and not exists (
        select 1 from public.project_attachment_links pal
        where pal.project_id::text=p.id::text
          and (pal.extracted_data->>'document_type'='dynamic_plan' or pal.extracted_data ? 'dynamic_plan')
      )
      and not exists (select 1 from public.documents_registry d where d.project_id=p.id and d.series='QUO')
  );
