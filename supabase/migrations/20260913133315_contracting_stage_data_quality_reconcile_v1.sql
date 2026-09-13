-- Reconcile projects whose observed human/data-quality facts place them in
-- pre-execution / contracting, while the canonical pipeline still says pricing.
-- This prevents stale sourcing automations from reopening after a one-time cleanup.

create temporary table pppp_contracting_stage_repair_candidates on commit drop as
with corrections as (
  select f.project_id,max(f.created_at) as correction_at
  from public.pppp_project_context_facts f
  where f.category='data_quality'
    and f.fact_status='observed'
    and jsonb_typeof(f.value->'stale_tasks')='array'
    and lower(coalesce(f.value->>'canonical_interpretation','')) like '%jv/contracting%'
    and lower(coalesce(f.value->>'canonical_interpretation','')) like '%old/mislinked events%'
  group by f.project_id
), contracting_phase as (
  select f.project_id,max(f.created_at) as phase_fact_at
  from public.pppp_project_context_facts f
  where f.category='project_gaps'
    and f.fact_status='observed'
    and lower(coalesce(f.value->>'project_phase','')) like '%pre-execution%'
    and lower(coalesce(f.value->>'project_phase','')) like '%contracting%'
  group by f.project_id
)
select p.id as project_id,
       p.pipeline_stage as old_pipeline_stage,
       c.correction_at,
       g.phase_fact_at
from public.projects p
join corrections c on c.project_id=p.id
join contracting_phase g on g.project_id=p.id
where p.pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing')
  and p.operational_state='active_work'
  and p.operational_state_source='data_quality_reconcile_v1'
  and not exists(
    select 1 from public.project_supplier_decisions d
    where d.project_id=p.id and d.status='active'
  );

do $block$
declare v_count integer;
begin
  select count(*) into v_count from pppp_contracting_stage_repair_candidates;
  if v_count>5 then
    raise exception 'contracting-stage data-quality repair candidate count % exceeds safety limit 5',v_count;
  end if;
end
$block$;

-- Commercial is the existing canonical post-pricing stage. It does not imply a
-- signed contract, supplier appointment, approved final price, PO, or project win.
update public.projects p
   set pipeline_stage='commercial',
       updated_at=now()
  from pppp_contracting_stage_repair_candidates c
 where p.id=c.project_id
   and p.pipeline_stage=c.old_pipeline_stage;

-- Close only sourcing tasks that pre-date the authoritative correction. New
-- evidence after the correction is intentionally not blanket-suppressed.
update public.tasks t
   set status='mbyllur',
       done_at=coalesce(t.done_at,now()),
       detail=case
         when position('[data-quality-stage-reconcile-v1]' in coalesce(t.detail,''))>0 then t.detail
         else concat_ws(E'\n',nullif(t.detail,''),
           '[data-quality-stage-reconcile-v1] Closed because the authoritative project facts place the project in pre-execution/contracting rather than active sourcing.')
       end
  from pppp_contracting_stage_repair_candidates c
 where t.project_id=c.project_id
   and t.status='hapur'
   and t.created_at<=c.correction_at
   and (
     t.source in ('sla_auto','auto_followup','procurement_comparison_auto')
     or (
       t.source='semantic_brain_auto'
       and t.source_ref='semantic:rfq-review:'||c.project_id::text
     )
   );

insert into public.pppp_project_context_facts(
  project_id,category,fact_key,fact_status,subject,value,source_type,source_ref,
  confidence,evidence_status,created_by,idempotency_key,created_at,updated_at
)
select
  c.project_id,
  'data_quality',
  'data_quality.pipeline_stage_reconciled.contracting_v1',
  'observed',
  'Pipeline stage reconciled to contracting/commercial phase',
  jsonb_build_object(
    'old_pipeline_stage',c.old_pipeline_stage,
    'new_pipeline_stage','commercial',
    'authoritative_phase','PRE-EXECUTION / CONTRACTING',
    'correction_at',c.correction_at,
    'phase_fact_at',c.phase_fact_at,
    'memory_only',true,
    'action_required',false,
    'supplier_selected',false,
    'final_price_approved',false,
    'contract_committed',false,
    'project_won_or_lost_decided',false
  ),
  'system',
  c.project_id::text,
  1,
  'confirmed',
  'pppp-contracting-stage-data-quality-reconcile-v1',
  'contracting-stage-data-quality-reconcile-v1:'||c.project_id::text,
  now(),now()
from pppp_contracting_stage_repair_candidates c
on conflict (idempotency_key) where idempotency_key is not null do nothing;

-- Refresh baseline memory only for repaired projects.
with prepared as (
  select
    c.project_id,
    p.name,
    public.pppp_project_memory_fingerprint_v2(c.project_id) as fp,
    public.pppp_project_memory_payload_v2(c.project_id) as payload,
    (
      select f.id
      from public.pppp_project_context_facts f
      where f.project_id=c.project_id
        and f.fact_key='project.memory.baseline.v1'
        and f.fact_status<>'dismissed'
      order by f.created_at desc,f.id desc
      limit 1
    ) as supersedes_id
  from pppp_contracting_stage_repair_candidates c
  join public.projects p on p.id=c.project_id
)
insert into public.pppp_project_context_facts(
  project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,
  confidence,fact_status,supersedes_id,idempotency_key,created_by
)
select
  x.project_id,
  'project_memory',
  'Memoria bazë — '||x.name,
  'project.memory.baseline.v1',
  x.payload,
  'system',
  x.project_id::text,
  'observed',
  1,
  'observed',
  x.supersedes_id,
  'project-memory-baseline-v2:'||x.project_id::text||':'||x.fp,
  'pppp-project-memory-baseline-v2'
from prepared x
where x.fp is not null
on conflict do nothing;