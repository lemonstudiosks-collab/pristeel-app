-- When a concrete supplier wait exists, it is the canonical action for the
-- project. Generic project-decision tasks remain internal legacy state and must
-- not override the specific wait in Command Center or ChatGPT project briefs.
create or replace function public.pppp_command_center_v1(p_limit integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with base as (
  select p.*,
         sw.title as supplier_wait_title,sw.due_date as supplier_wait_due,sw.contact_email as supplier_wait_email,
         t.title as task_title,t.due_date as task_due,t.priority as task_priority,t.category as task_category,t.source as task_source,
         em.subject as last_email_subject,em.direction as last_email_direction,em.from_email as last_email_from,em.sent_at as last_email_at_live,
         case p.pipeline_stage
           when 'rfq_in' then 20 when 'technical_review' then 32 when 'supplier_selection' then 42
           when 'pricing' then 55 when 'client_offer' then 72 when 'commercial' then 86
           when 'production_control' then 100 when 'factory_audit' then 100 when 'transport' then 100 else 15 end
         + case when coalesce(p.last_email_at,p.last_activity_at,p.updated_at,p.created_at) >= now()-interval '3 days' then 6 else 0 end
         as momentum_score,
         case
           when lower(coalesce(p.status,'')) in ('fituar','won') or p.operational_state='execution' then 'EXECUTION'
           when sw.title is not null then 'WAITING_SUPPLIER'
           when p.operational_state='wait_for_client' then 'WAITING_CLIENT'
           when p.operational_state='action_required' then 'ACTION_NOW'
           when p.pipeline_stage='client_offer' then 'QUOTE_SENT'
           when p.pipeline_stage='pricing' then 'QUOTE_IN_PREPARATION'
           when p.pipeline_stage='rfq_in' then 'NEW_RFQ'
           else 'ACTIVE' end as work_lane,
         case
           when p.operational_state='execution' or lower(coalesce(p.status,'')) in ('fituar','won') then 50
           when sw.title is not null and sw.due_date is not null and sw.due_date<=current_date then 90
           when sw.title is not null then 55
           when p.operational_state='action_required' then 100
           when t.due_date is not null and t.due_date<current_date then 95
           when p.pipeline_stage='pricing' then 78
           when p.pipeline_stage='rfq_in' then 72
           when p.operational_state='wait_for_client' and coalesce(p.last_email_at,p.last_activity_at,p.updated_at,p.created_at)<now()-interval '7 days' then 68
           else 40 end as attention_score
  from public.projects p
  left join lateral (
    select x.title,x.due_date,x.contact_email
    from public.tasks x
    where x.project_id=p.id and x.source='supplier_wait_auto' and x.status not in ('kryer','mbyllur','done','closed')
    order by x.due_date asc nulls last,x.created_at desc limit 1
  ) sw on true
  left join lateral (
    select x.title,x.due_date,x.priority,x.category,x.source
    from public.tasks x
    where x.project_id=p.id and x.status not in ('kryer','mbyllur','done','closed')
      and not (sw.title is not null and x.source='project_decision_auto')
    order by case when x.due_date<current_date then 0 when x.due_date=current_date then 1 else 2 end,
             x.due_date asc nulls last,x.created_at desc limit 1
  ) t on true
  left join lateral (
    select e.subject,e.direction,e.from_email,e.sent_at
    from public.project_emails e
    where e.project_id=p.id
    order by e.sent_at desc nulls last limit 1
  ) em on true
  where lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
), ranked as (
  select *,
         case
           when work_lane='WAITING_SUPPLIER' then coalesce(supplier_wait_title,'Presim furnitorin')
           when work_lane='WAITING_CLIENT' then coalesce(task_title,'Presim përgjigjen e klientit; follow-up vetëm sipas afatit.')
           when work_lane='EXECUTION' then coalesce(task_title,'Vazhdo veprimin e ardhshëm të ekzekutimit.')
           when task_title is not null then task_title
           when work_lane='QUOTE_IN_PREPARATION' then 'Përfundo kalkulimin dhe draft-ofertën.'
           when work_lane='QUOTE_SENT' then 'Monitoro përgjigjen e klientit dhe afatin e follow-up-it.'
           when work_lane='NEW_RFQ' then 'Analizo dokumentet dhe përcakto kalkulimin/partnerin.'
           else 'Shqyrto aktivitetin e fundit dhe cakto veprimin e ardhshëm.' end as next_action
  from base
  order by attention_score desc,momentum_score desc,coalesce(last_email_at,last_activity_at,updated_at,created_at) desc
  limit greatest(1,least(coalesce(p_limit,30),100))
)
select coalesce(jsonb_agg(jsonb_build_object(
  'project_id',id,'project',name,'client',client,'ref',coalesce(business_ref,ref),
  'status',status,'pipeline_stage',pipeline_stage,'work_lane',work_lane,
  'attention_score',attention_score,'momentum_score',least(momentum_score,100),
  'next_action',next_action,
  'due_date',case when work_lane='WAITING_SUPPLIER' then supplier_wait_due else coalesce(task_due,supplier_wait_due) end,
  'supplier_wait_email',supplier_wait_email,
  'last_email',case when last_email_subject is null then null else jsonb_build_object('subject',last_email_subject,'direction',last_email_direction,'from',last_email_from,'sent_at',last_email_at_live) end,
  'last_activity_at',coalesce(last_email_at,last_activity_at,updated_at,created_at)
) order by attention_score desc,momentum_score desc), '[]'::jsonb)
from ranked;
$$;

revoke all on function public.pppp_command_center_v1(integer) from public, anon;
grant execute on function public.pppp_command_center_v1(integer) to authenticated, service_role;

create or replace function public.pppp_project_brief_v1(p_project_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
select jsonb_build_object(
  'project',(select to_jsonb(p) from (
    select id,name,client,ref,business_ref,status,pipeline_stage,operational_state,
           origin_type,work_model,last_activity_at,last_email_at,updated_at
    from public.projects where id=p_project_id
  ) p),
  'open_tasks',coalesce((
    select jsonb_agg(to_jsonb(t) order by t.due_date asc nulls last,t.created_at desc)
    from (
      select id,title,left(coalesce(detail,''),1500) as detail,due_date,priority,status,source,category,contact_email,created_at
      from public.tasks x
      where x.project_id=p_project_id and x.status not in ('kryer','mbyllur','done','closed')
        and not (
          x.source='project_decision_auto'
          and exists (
            select 1 from public.tasks sw
            where sw.project_id=p_project_id and sw.source='supplier_wait_auto'
              and sw.status not in ('kryer','mbyllur','done','closed')
          )
        )
      order by due_date asc nulls last,created_at desc limit 10
    ) t
  ),'[]'::jsonb),
  'recent_emails',coalesce((
    select jsonb_agg(to_jsonb(e) order by e.sent_at desc)
    from (
      select gmail_message_id,gmail_thread_id,from_email,subject,left(coalesce(snippet,''),2500) as snippet,
             sent_at,direction,has_attachments
      from public.project_emails
      where project_id=p_project_id
      order by sent_at desc limit 6
    ) e
  ),'[]'::jsonb),
  'latest_analysis',(
    select jsonb_build_object(
      'executive_summary',left(coalesce(a.analysis->>'executive_summary',''),3000),
      'current_stage',a.analysis->'current_stage',
      'health',a.analysis->'health',
      'recommendation',a.analysis->'recommendation',
      'next_actions',coalesce(a.analysis->'next_actions','[]'::jsonb),
      'risks',coalesce(a.analysis->'risks','[]'::jsonb),
      'missing_information',coalesce(a.analysis->'missing_information','[]'::jsonb),
      'created_at',a.created_at,'model',a.model
    )
    from public.project_analyses a
    where a.project_id=p_project_id::text and a.status='complete'
    order by a.created_at desc limit 1
  )
);
$$;

revoke all on function public.pppp_project_brief_v1(uuid) from public, anon;
grant execute on function public.pppp_project_brief_v1(uuid) to authenticated, service_role;
