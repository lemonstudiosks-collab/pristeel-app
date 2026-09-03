begin;

-- Canonical operator-safe waiting lane. One row per active project.
create or replace view public.pppp_home_waiting_projects_v1
with (security_invoker = true)
as
with open_projects as (
  select p.*
  from public.projects p
  where lower(coalesce(p.status,'')) <> all (
    array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar']
  )
), ranked_wait_tasks as (
  select
    t.id as task_id,
    t.project_id,
    p.name as project_name,
    p.client,
    case
      when t.source='supplier_wait_auto' then 'supplier'
      when t.source='invoice_receivable' then 'payment'
      when t.source in ('email_followup','auto_followup') and lower(coalesce(t.category,''))='klient' then 'client'
      when t.source in ('email_followup','auto_followup') then 'reply'
      else 'other'
    end as waiting_on,
    t.title as waiting_reason,
    t.due_date,
    (t.due_date is not null and t.due_date < current_date) as is_overdue,
    case when t.due_date is not null and t.due_date < current_date then (current_date-t.due_date)::integer else 0 end as days_overdue,
    t.source,
    t.source_ref,
    t.priority,
    t.created_at,
    p.operational_state,
    p.operational_state_at,
    p.operational_state_source,
    p.pipeline_stage,
    p.last_activity_at,
    p.last_email_at,
    row_number() over (
      partition by t.project_id
      order by t.due_date nulls last, t.created_at desc, t.id
    ) as rn
  from public.tasks t
  join open_projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) <> all (
    array['kryer','done','mbyllur','closed','arkivuar','archived']
  )
    and (
      t.source in ('supplier_wait_auto','invoice_receivable')
      or (t.source in ('email_followup','auto_followup'))
    )
), task_waits as (
  select * from ranked_wait_tasks where rn=1
), state_waits as (
  select
    null::uuid as task_id,
    p.id as project_id,
    p.name as project_name,
    p.client,
    case
      when p.operational_state_source='supplier-wait-auto-v1' then 'supplier'
      when p.operational_state='wait_for_client' then 'client'
      else 'reply'
    end as waiting_on,
    case
      when p.operational_state_source='supplier-wait-auto-v1' then 'Në pritje të furnitorit.'
      when p.operational_state='wait_for_client' then 'Në pritje të klientit.'
      else 'Në pritje të palës tjetër.'
    end as waiting_reason,
    null::date as due_date,
    false as is_overdue,
    0 as days_overdue,
    'operational_state'::text as source,
    p.operational_state_source::text as source_ref,
    null::text as priority,
    coalesce(p.operational_state_at,p.updated_at,p.created_at) as created_at,
    p.operational_state,
    p.operational_state_at,
    p.operational_state_source,
    p.pipeline_stage,
    p.last_activity_at,
    p.last_email_at,
    1::bigint as rn
  from open_projects p
  where (
    p.operational_state='wait_for_client'
    or p.operational_state_source='supplier-wait-auto-v1'
  )
    and not exists (select 1 from task_waits tw where tw.project_id=p.id)
)
select
  task_id,project_id,project_name,client,waiting_on,waiting_reason,due_date,is_overdue,days_overdue,
  source,source_ref,priority,created_at,operational_state,operational_state_at,operational_state_source,
  pipeline_stage,last_activity_at,last_email_at
from task_waits
union all
select
  task_id,project_id,project_name,client,waiting_on,waiting_reason,due_date,is_overdue,days_overdue,
  source,source_ref,priority,created_at,operational_state,operational_state_at,operational_state_source,
  pipeline_stage,last_activity_at,last_email_at
from state_waits;

-- Keep Priority Actions quiet while waiting, but automatically escalate explicit missed wait deadlines.
create or replace view public.pppp_home_current_actions_v1
with (security_invoker = true)
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
  where lower(coalesce(t.status,'')) <> all (
    array['kryer','done','mbyllur','closed','arkivuar','archived']
  )
    and lower(coalesce(p.status,'')) <> all (
      array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar']
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
), direct_actions as (
  select e.*
  from eligible e
  where e.source in ('manual','email_request_auto')
    and (
      e.due_date is null
      or e.due_date <= current_date+7
      or lower(coalesce(e.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
    )
), overdue_waits as (
  select e.*
  from eligible e
  where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup')
    and e.due_date is not null
    and e.due_date < current_date
    and not exists (
      select 1 from direct_actions d where d.project_id=e.project_id
    )
)
select * from direct_actions
union all
select * from overdue_waits;

create or replace function public.pppp_chatgpt_waiting_projects_v1(p_limit integer default 50)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.is_overdue desc, x.due_date nulls last, x.last_activity_at desc nulls last),
    '[]'::jsonb
  )
  from (
    select *
    from public.pppp_home_waiting_projects_v1
    order by is_overdue desc, due_date nulls last, last_activity_at desc nulls last
    limit greatest(1,least(coalesce(p_limit,50),100))
  ) x;
$$;

revoke all on function public.pppp_chatgpt_waiting_projects_v1(integer) from public, anon;
grant execute on function public.pppp_chatgpt_waiting_projects_v1(integer) to authenticated, service_role;

do $$ begin
  if exists (select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_waiting_projects_v1(integer) to supabase_read_only_user;
    grant select on public.pppp_home_waiting_projects_v1 to supabase_read_only_user;
  end if;
end $$;

grant select on public.pppp_home_waiting_projects_v1 to authenticated, service_role;

commit;
