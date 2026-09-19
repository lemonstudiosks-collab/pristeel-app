-- Keep current priority actions aligned with canonical project state and current operator context.
-- Tasks remain in history; only stale automated tasks are removed from the current-action surface.

create or replace view public.pppp_home_current_actions_v1 as
with eligible as (
  select
    t.id,t.project_id,p.name as project_name,p.client,t.title,t.detail,t.due_date,t.priority,t.status,
    t.source,t.source_ref,t.category,t.created_at,p.operational_state,p.operational_state_at,
    p.pipeline_stage,p.last_activity_at,p.last_email_at
  from public.tasks t
  join public.projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) <> all(array['kryer','done','mbyllur','closed','arkivuar','archived'])
    and lower(coalesce(p.status,'')) <> all(array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar'])
    and not (
      lower(coalesce(p.operational_state,'')) in ('wait_for_client','waiting_for_client')
      and coalesce(t.source,'') in (
        'email_request_auto','supplier_update_auto','commercial_intake_review','procurement_comparison_auto',
        'client_offer_cost_basis_auto','client_offer_final_review_auto','project_decision_auto',
        'semantic_brain_auto','data_integrity_audit','supplier_wait_auto','auto_followup','sla_auto',
        'project_discovery_auto','opportunity_engine_v2','document_bom_review','document_image_review',
        'dynamic_plan_review'
      )
    )
    and not exists (
      select 1
      from public.pppp_project_context_current_v f
      where f.project_id=t.project_id
        and f.category='operator_update'
        and f.fact_status='observed'
        and lower(coalesce(f.value->>'action_required','')) in ('false','0','no')
        and coalesce(t.source,'') in (
          'email_request_auto','supplier_update_auto','commercial_intake_review','procurement_comparison_auto',
          'client_offer_cost_basis_auto','client_offer_final_review_auto','project_decision_auto',
          'semantic_brain_auto','data_integrity_audit','supplier_wait_auto','auto_followup','sla_auto',
          'project_discovery_auto','opportunity_engine_v2','document_bom_review','document_image_review',
          'dynamic_plan_review'
        )
        and (
          (
            coalesce(f.value->>'source_sent_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T'
            and (f.value->>'source_sent_at')::timestamptz >= t.created_at
          )
          or (
            not (coalesce(f.value->>'source_sent_at','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T')
            and f.updated_at >= t.created_at
          )
        )
    )
    and not exists (
      select 1
      from public.pppp_project_context_current_v f
      where f.project_id=t.project_id
        and f.category='operator_update'
        and f.evidence_status='confirmed'
        and f.fact_status='observed'
        and f.updated_at>=t.created_at
        and lower(coalesce(f.value::text,'')) ~ '(nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow)'
    )
),
direct_candidates as (
  select e.*,
    row_number() over (
      partition by e.project_id
      order by case e.source
        when 'manual' then 0
        when 'chatgpt_bridge' then 1
        when 'email_request_auto' then 2
        when 'supplier_update_auto' then 3
        when 'outgoing_invoice_final_review_auto' then 4
        when 'outgoing_invoice_review' then 5
        when 'commercial_intake_review' then 6
        when 'procurement_comparison_auto' then 7
        when 'client_offer_cost_basis_auto' then 8
        when 'client_offer_final_review_auto' then 9
        when 'project_decision_auto' then 10
        when 'kontrate' then 11
        when 'semantic_brain_auto' then 12
        when 'data_integrity_audit' then 13
        else 99
      end,
      e.due_date nulls first,e.created_at desc,e.id
    ) as direct_rn
  from eligible e
  where
    e.source=any(array[
      'outgoing_invoice_final_review_auto','outgoing_invoice_review','commercial_intake_review',
      'procurement_comparison_auto','client_offer_cost_basis_auto','client_offer_final_review_auto'
    ])
    or (
      e.source=any(array['manual','chatgpt_bridge','email_request_auto','supplier_update_auto'])
      and (
        e.due_date is null or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source='project_decision_auto'
      and lower(coalesce(e.operational_state,''))='action_required'
      and e.created_at>=coalesce(e.operational_state_at,e.created_at)
      and (
        e.due_date is null or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source=any(array['semantic_brain_auto','data_integrity_audit'])
      and lower(coalesce(e.operational_state,''))='action_required'
      and e.created_at>=coalesce(e.operational_state_at,e.created_at)
      and (
        e.due_date is null or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source='kontrate'
      and lower(coalesce(e.operational_state,''))='execution'
      and (
        e.due_date is null or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
),
direct_actions as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from direct_candidates where direct_rn=1
),
overdue_wait_candidates as (
  select e.*,
    row_number() over(partition by e.project_id order by e.due_date,e.created_at desc,e.id) as wait_rn
  from eligible e
  where e.source=any(array['supplier_wait_auto','invoice_receivable','email_followup','auto_followup'])
    and e.due_date is not null and e.due_date<current_date
    and not exists(select 1 from direct_actions d where d.project_id=e.project_id)
),
overdue_waits as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from overdue_wait_candidates where wait_rn=1
)
select * from direct_actions
union all
select * from overdue_waits;

select public.pppp_project_memory_baseline_reconcile_v1(true,100);
select public.pppp_intelligence_snapshot_capture_v1('priority_actions_truth_filter_v1');
