begin;

create or replace view public.pppp_home_current_actions_v1
with (security_invoker = true)
as
with eligible as (
  select
    t.id,t.project_id,p.name as project_name,p.client,t.title,t.detail,t.due_date,t.priority,t.status,
    t.source,t.source_ref,t.category,t.created_at,p.operational_state,p.operational_state_at,
    p.pipeline_stage,p.last_activity_at,p.last_email_at
  from public.tasks t
  join public.projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) <> all (array['kryer','done','mbyllur','closed','arkivuar','archived'])
    and lower(coalesce(p.status,'')) <> all (array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar'])
    and not exists (
      select 1 from public.pppp_project_context_current_v f
      where f.project_id=t.project_id
        and f.category='operator_update'
        and f.evidence_status='confirmed'
        and f.fact_status='observed'
        and f.updated_at>=t.created_at
        and lower(coalesce(f.value::text,'')) ~ '(nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow)'
    )
), direct_actions as (
  select e.*
  from eligible e
  where e.source in ('manual','email_request_auto')
    and (
      e.due_date is null
      or e.due_date <= current_date+7
      or lower(coalesce(e.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
    )
), overdue_wait_candidates as (
  select
    e.*,
    row_number() over (
      partition by e.project_id
      order by e.due_date asc nulls last,e.created_at desc,e.id
    ) as wait_rn
  from eligible e
  where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup')
    and e.due_date is not null
    and e.due_date < current_date
    and not exists (select 1 from direct_actions d where d.project_id=e.project_id)
), overdue_waits as (
  select
    id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
    created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from overdue_wait_candidates
  where wait_rn=1
)
select * from direct_actions
union all
select * from overdue_waits;

commit;
