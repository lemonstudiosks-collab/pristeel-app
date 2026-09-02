-- Bound ChatGPT/project-brief payload for Supabase Free egress.
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
      from public.tasks
      where project_id=p_project_id and status not in ('kryer','mbyllur','done','closed')
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
