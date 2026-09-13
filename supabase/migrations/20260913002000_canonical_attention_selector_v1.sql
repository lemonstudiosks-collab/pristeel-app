-- PPPP canonical attention selector v1
-- Scope: read-only action selection only. No tasks are created/updated/closed;
-- no project state, email, supplier selection, pricing, contract/PO or disposition
-- approval gate is changed.
--
-- The previous Home/ChatGPT canonical selector intentionally allowed only a
-- narrow set of task sources. That hid proven current actions such as:
--   * human-approved ChatGPT bridge tasks,
--   * supplier updates classified from canonical supplier contacts,
--   * project-decision actions for projects whose canonical state is action_required,
--   * execution contract actions.
--
-- Keep one canonical action per project and preserve the existing no-action
-- operator override, waiting-task fallback and commercial review precedence.

create or replace view public.pppp_home_current_actions_v1
with (security_invoker=true)
as
with eligible as (
  select
    t.id,
    t.project_id,
    p.name as project_name,
    p.client,
    t.title,
    t.detail,
    t.due_date,
    t.priority,
    t.status,
    t.source,
    t.source_ref,
    t.category,
    t.created_at,
    p.operational_state,
    p.operational_state_at,
    p.pipeline_stage,
    p.last_activity_at,
    p.last_email_at
  from public.tasks t
  join public.projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed','arkivuar','archived')
    and lower(coalesce(p.status,'')) not in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar')
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
  select
    e.*,
    row_number() over (
      partition by e.project_id
      order by
        case e.source
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
        e.due_date nulls first,
        e.created_at desc,
        e.id
    ) as direct_rn
  from eligible e
  where
    e.source in (
      'outgoing_invoice_final_review_auto',
      'outgoing_invoice_review',
      'commercial_intake_review',
      'procurement_comparison_auto',
      'client_offer_cost_basis_auto',
      'client_offer_final_review_auto'
    )
    or (
      e.source in ('manual','chatgpt_bridge','email_request_auto','supplier_update_auto')
      and (
        e.due_date is null
        or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source='project_decision_auto'
      and lower(coalesce(e.operational_state,''))='action_required'
      and e.created_at>=coalesce(e.operational_state_at,e.created_at)
      and (
        e.due_date is null
        or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source in ('semantic_brain_auto','data_integrity_audit')
      and lower(coalesce(e.operational_state,''))='action_required'
      and e.created_at>=coalesce(e.operational_state_at,e.created_at)
      and (
        e.due_date is null
        or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
    or (
      e.source='kontrate'
      and lower(coalesce(e.operational_state,''))='execution'
      and (
        e.due_date is null
        or e.due_date<=current_date+7
        or lower(coalesce(e.priority,'')) ~ '(urgjent|urgent|critical|e larte|larte|high)'
      )
    )
),
direct_actions as (
  select
    id,project_id,project_name,client,title,detail,due_date,priority,status,
    source,source_ref,category,created_at,operational_state,operational_state_at,
    pipeline_stage,last_activity_at,last_email_at
  from direct_candidates
  where direct_rn=1
),
overdue_wait_candidates as (
  select
    e.*,
    row_number() over (
      partition by e.project_id
      order by e.due_date,e.created_at desc,e.id
    ) as wait_rn
  from eligible e
  where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup')
    and e.due_date is not null
    and e.due_date<current_date
    and not exists (
      select 1 from direct_actions d where d.project_id=e.project_id
    )
),
overdue_waits as (
  select
    id,project_id,project_name,client,title,detail,due_date,priority,status,
    source,source_ref,category,created_at,operational_state,operational_state_at,
    pipeline_stage,last_activity_at,last_email_at
  from overdue_wait_candidates
  where wait_rn=1
)
select * from direct_actions
union all
select * from overdue_waits;

comment on view public.pppp_home_current_actions_v1 is
  'Canonical one-action-per-project attention selector for PPPP Home and ChatGPT reads. Includes protected-action review gates plus current human-confirmed, supplier-update, action_required project-decision and execution-contract tasks without changing task/state data.';
