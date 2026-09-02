create schema if not exists pppp_internal_api;
revoke all on schema pppp_internal_api from public,anon,authenticated;
grant usage on schema pppp_internal_api to authenticated,service_role;

create or replace function pppp_internal_api.record_supplier_decision_v1(
  p_project_id uuid,
  p_supplier_offer_id uuid,
  p_decision_type text default 'selected_producer',
  p_notes text default null,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pppp_internal_api'
as $function$
declare
  v_offer public.offers%rowtype;
  v_project public.projects%rowtype;
  v_decision public.project_supplier_decisions%rowtype;
  v_type text:=lower(trim(coalesce(p_decision_type,'selected_producer')));
  v_handoff jsonb;
begin
  if auth.uid() is null or not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;
  if v_type not in ('selected_producer','pricing_basis') then
    raise exception 'Unsupported supplier decision type';
  end if;

  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception 'Supplier decision cannot be recorded on a terminal project';
  end if;

  select * into v_offer from public.offers where id=p_supplier_offer_id and project_id=p_project_id;
  if not found then raise exception 'Supplier offer does not belong to this project'; end if;

  insert into public.project_supplier_decisions(
    project_id,supplier_offer_id,supplier_name,decision_type,status,source,evidence,notes,decided_at,updated_at
  ) values (
    p_project_id,p_supplier_offer_id,coalesce(nullif(trim(v_offer.supplier),''),'Unknown supplier'),v_type,'active',
    'authenticated_human_decision',
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object(
      'human_confirmed',true,
      'actor_user_id',auth.uid(),
      'recorded_at',now(),
      'supplier_offer_id',p_supplier_offer_id
    ),
    nullif(trim(coalesce(p_notes,'')),''),now(),now()
  )
  on conflict(project_id,decision_type) do update
    set supplier_offer_id=excluded.supplier_offer_id,
        supplier_name=excluded.supplier_name,
        status='active',
        source=excluded.source,
        evidence=excluded.evidence,
        notes=excluded.notes,
        decided_at=now(),
        updated_at=now()
  returning * into v_decision;

  update public.tasks
  set status='mbyllur',done_at=coalesce(done_at,now())
  where project_id=p_project_id and source='procurement_comparison_auto' and status='hapur';

  if v_project.pipeline_stage in ('rfq_in','technical_review','supplier_selection') then
    update public.projects set pipeline_stage='pricing',updated_at=now() where id=p_project_id;
  end if;

  v_handoff:=public.pppp_selected_supplier_handoff_reconcile_v1(true,100,p_project_id);

  return jsonb_build_object(
    'ok',true,
    'decision_id',v_decision.id,
    'project_id',p_project_id,
    'supplier_offer_id',p_supplier_offer_id,
    'supplier_name',v_decision.supplier_name,
    'decision_type',v_decision.decision_type,
    'handoff',v_handoff,
    'human_gate_preserved',true
  );
end;
$function$;

revoke all on function pppp_internal_api.record_supplier_decision_v1(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function pppp_internal_api.record_supplier_decision_v1(uuid,uuid,text,text,jsonb) to authenticated,service_role;

create or replace function public.pppp_record_supplier_decision_v1(
  p_project_id uuid,
  p_supplier_offer_id uuid,
  p_decision_type text default 'selected_producer',
  p_notes text default null,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language sql
security invoker
set search_path to 'pg_catalog','public','pppp_internal_api'
as $function$
  select pppp_internal_api.record_supplier_decision_v1(p_project_id,p_supplier_offer_id,p_decision_type,p_notes,p_evidence);
$function$;

revoke all on function public.pppp_record_supplier_decision_v1(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.pppp_record_supplier_decision_v1(uuid,uuid,text,text,jsonb) to authenticated,service_role;
