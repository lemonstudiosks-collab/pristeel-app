-- RFQ & Sourcing handoff over the existing tasks and supplier-decision systems.
-- No automatic supplier commitment, outbound send, price approval, PO, or tender decision.

alter table public.tasks
  add column if not exists assigned_to_email text,
  add column if not exists workstream text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists tasks_assigned_workstream_open_idx
  on public.tasks (lower(assigned_to_email), workstream, status, due_date)
  where assigned_to_email is not null;

comment on column public.tasks.assigned_to_email is
  'Exact authenticated operator email for a human-approved internal handoff.';
comment on column public.tasks.workstream is
  'Bounded work queue key. rfq_sourcing reuses the canonical task lifecycle.';
comment on column public.tasks.metadata is
  'Structured handoff context only; evidence and shortlist data are not supplier commitments.';

create or replace function public.pppp_record_supplier_package_decision_v1(
  p_project_id uuid,
  p_supplier_offer_id uuid,
  p_package_key text,
  p_notes text default null,
  p_evidence jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $$
declare
  v_offer public.offers%rowtype;
  v_project public.projects%rowtype;
  v_decision public.project_supplier_decisions%rowtype;
  v_package text:=lower(trim(coalesce(p_package_key,'')));
  v_type text;
begin
  if auth.uid() is null or not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;
  if v_package not in ('base','zinc','coating','installation','transport','other') then
    raise exception 'Unsupported sourcing package';
  end if;
  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception 'Supplier package decision cannot be recorded on a terminal project';
  end if;
  select * into v_offer from public.offers where id=p_supplier_offer_id and project_id=p_project_id;
  if not found then raise exception 'Supplier offer does not belong to this project'; end if;

  v_type:='selected_component_'||v_package;
  insert into public.project_supplier_decisions(
    project_id,supplier_offer_id,supplier_name,decision_type,status,source,evidence,notes,decided_at,updated_at
  ) values (
    p_project_id,p_supplier_offer_id,coalesce(nullif(trim(v_offer.supplier),''),'Unknown supplier'),v_type,'active',
    'authenticated_human_decision',
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object(
      'human_confirmed',true,'package_key',v_package,'actor_user_id',auth.uid(),
      'recorded_at',now(),'supplier_offer_id',p_supplier_offer_id
    ),nullif(trim(coalesce(p_notes,'')),''),now(),now()
  )
  on conflict(project_id,decision_type) do update
    set supplier_offer_id=excluded.supplier_offer_id,
        supplier_name=excluded.supplier_name,
        status='active',source=excluded.source,evidence=excluded.evidence,
        notes=excluded.notes,decided_at=now(),updated_at=now()
  returning * into v_decision;

  return jsonb_build_object(
    'ok',true,'decision_id',v_decision.id,'project_id',p_project_id,
    'supplier_offer_id',p_supplier_offer_id,'supplier_name',v_decision.supplier_name,
    'package_key',v_package,'decision_type',v_decision.decision_type,
    'human_gate_preserved',true,'supplier_commitment_created',false
  );
end;
$$;

revoke all on function public.pppp_record_supplier_package_decision_v1(uuid,uuid,text,text,jsonb) from public, anon;
grant execute on function public.pppp_record_supplier_package_decision_v1(uuid,uuid,text,text,jsonb) to authenticated;

