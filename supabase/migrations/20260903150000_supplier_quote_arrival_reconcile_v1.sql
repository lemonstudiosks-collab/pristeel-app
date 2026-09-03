begin;

create or replace function public.pppp_supplier_quote_arrival_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 200
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_limit integer := least(1000,greatest(1,coalesce(p_limit,200)));
  v_seen integer := 0;
  v_closeable integer := 0;
  v_closed integer := 0;
  v_state_released integer := 0;
  v_review jsonb := '{}'::jsonb;
  v_compare jsonb := '{}'::jsonb;
begin
  for r in
    with open_waits as (
      select
        t.id,
        t.project_id,
        t.source_ref,
        regexp_replace(coalesce(t.source_ref,''),'^.*:supplier:','','') as supplier_email,
        p.pipeline_stage,
        p.operational_state,
        p.operational_state_source,
        exists(
          select 1
          from public.rfq_log q
          where q.project_id=t.project_id
            and lower(coalesce(q.supplier_email,''))=lower(regexp_replace(coalesce(t.source_ref,''),'^.*:supplier:','',''))
            and (
              lower(coalesce(q.status,''))='replied'
              or q.replied_at is not null
              or q.offer_id is not null
            )
        ) as has_supplier_reply,
        (
          p.pipeline_stage in ('client_offer','commercial','production_control','factory_audit','transport')
          or coalesce(p.operational_state,'')='execution'
          or lower(coalesce(p.status,'')) in ('fituar','won')
        ) as lifecycle_superseded
      from public.tasks t
      join public.projects p on p.id=t.project_id
      where t.source='supplier_wait_auto'
        and lower(coalesce(t.status,'')) <> all (array['kryer','done','mbyllur','closed','arkivuar','archived'])
      order by t.due_date nulls last,t.created_at
      limit v_limit
    )
    select * from open_waits
  loop
    v_seen := v_seen+1;
    if r.has_supplier_reply or r.lifecycle_superseded then
      v_closeable := v_closeable+1;
      if p_apply then
        update public.tasks
           set status='mbyllur',
               done_at=coalesce(done_at,now()),
               detail=concat_ws(E'\n',nullif(detail,''),
                 case
                   when r.has_supplier_reply then 'PPPP: pritja u mbyll automatikisht sepse përgjigjja/oferta e furnitorit është regjistruar.'
                   else 'PPPP: pritja u mbyll automatikisht sepse projekti ka kaluar përtej fazës së pritjes së furnitorit.'
                 end)
         where id=r.id
           and lower(coalesce(status,'')) <> all (array['kryer','done','mbyllur','closed','arkivuar','archived']);
        if found then v_closed:=v_closed+1; end if;
      end if;
    end if;
  end loop;

  if p_apply then
    with released as (
      update public.projects p
         set operational_state='active_work',
             operational_state_at=now(),
             operational_state_source='supplier-response-reconcile-v1',
             updated_at=now()
       where p.operational_state_source='supplier-wait-auto-v1'
         and not exists(
           select 1 from public.tasks t
           where t.project_id=p.id
             and t.source='supplier_wait_auto'
             and lower(coalesce(t.status,'')) <> all (array['kryer','done','mbyllur','closed','arkivuar','archived'])
         )
       returning p.id
    ) select count(*)::int into v_state_released from released;

    v_review := public.pppp_commercial_review_intelligence_reconcile_v1(true,least(v_limit,500));
    v_compare := public.pppp_procurement_comparison_reconcile_v1(true,least(v_limit,500));
  else
    v_review := public.pppp_commercial_review_intelligence_reconcile_v1(false,least(v_limit,500));
    v_compare := public.pppp_procurement_comparison_reconcile_v1(false,least(v_limit,500));
  end if;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'open_supplier_waits_seen',v_seen,
    'closeable_waits',v_closeable,
    'waits_closed',v_closed,
    'project_wait_states_released',v_state_released,
    'commercial_review',v_review,
    'supplier_comparison',v_compare,
    'human_supplier_selection_required',true,
    'generated_at',now()
  );
end;
$$;

revoke all on function public.pppp_supplier_quote_arrival_reconcile_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_supplier_quote_arrival_reconcile_v1(boolean,integer) to service_role;

create or replace function public.pppp_chatgpt_supplier_comparison_v1(p_project_id uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select public.pppp_supplier_offer_comparison_json_v1(p_project_id);
$$;

revoke all on function public.pppp_chatgpt_supplier_comparison_v1(uuid) from public, anon;
grant execute on function public.pppp_chatgpt_supplier_comparison_v1(uuid) to authenticated, service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_supplier_comparison_v1(uuid) to supabase_read_only_user;
  end if;
end $$;

-- Supplier review/comparison is a real human action, not backstage automation noise.
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
), direct_candidates as (
  select e.*,
         row_number() over(
           partition by e.project_id
           order by
             case e.source
               when 'manual' then 0
               when 'email_request_auto' then 1
               when 'commercial_intake_review' then 2
               when 'procurement_comparison_auto' then 3
               else 9
             end,
             e.due_date nulls first,e.created_at desc,e.id
         ) as direct_rn
  from eligible e
  where e.source in ('manual','email_request_auto','commercial_intake_review','procurement_comparison_auto')
    and (
      e.source in ('commercial_intake_review','procurement_comparison_auto')
      or e.due_date is null
      or e.due_date <= current_date+7
      or lower(coalesce(e.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
    )
), direct_actions as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from direct_candidates where direct_rn=1
), overdue_wait_candidates as (
  select e.*,
         row_number() over(partition by e.project_id order by e.due_date asc nulls last,e.created_at desc,e.id) as wait_rn
  from eligible e
  where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup')
    and e.due_date is not null
    and e.due_date < current_date
    and not exists(select 1 from direct_actions d where d.project_id=e.project_id)
), overdue_waits as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from overdue_wait_candidates where wait_rn=1
)
select * from direct_actions
union all
select * from overdue_waits;

-- Run shortly after commercial intake; empty runs are cheap and idempotent.
do $$
declare
  v_jobid bigint;
  v_command text := 'select public.pppp_supplier_quote_arrival_reconcile_v1(true,250);';
begin
  select jobid into v_jobid from cron.job where jobname='supplier-quote-arrival-reconcile-10m' limit 1;
  if v_jobid is null then
    perform cron.schedule('supplier-quote-arrival-reconcile-10m','4,14,24,34,44,54 * * * *',v_command);
  else
    perform cron.alter_job(job_id=>v_jobid,schedule=>'4,14,24,34,44,54 * * * *',command=>v_command,active=>true);
  end if;
end $$;

commit;
