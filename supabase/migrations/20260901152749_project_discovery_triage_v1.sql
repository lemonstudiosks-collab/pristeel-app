-- PPPP Project Discovery triage v1
-- Turns high-confidence Gmail discovery candidates into actionable review tasks
-- without creating projects or sending communication automatically.

create or replace function public.pppp_project_discovery_triage_v1(
  p_apply boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_limit integer := least(500, greatest(1, coalesce(p_limit,100)));
  v_new_review integer := 0;
  v_existing_review integer := 0;
  v_created_new integer := 0;
  v_created_existing integer := 0;
begin
  select count(*) into v_new_review
  from (
    select 1
    from public.project_discovery_candidates c
    where c.status='open'
      and c.match_project_id is null
      and coalesce(c.score,0) >= 96
      and coalesce(c.last_seen_at,c.updated_at,c.discovered_at) >= now()-interval '30 days'
    order by c.score desc, c.last_seen_at desc nulls last
    limit v_limit
  ) x;

  select count(*) into v_existing_review
  from (
    select 1
    from public.project_discovery_candidates c
    where c.status='open'
      and c.match_project_id is not null
      and coalesce(c.match_score,0) between 85 and 99
      and coalesce(c.last_seen_at,c.updated_at,c.discovered_at) >= now()-interval '30 days'
    order by c.match_score desc, c.score desc, c.last_seen_at desc nulls last
    limit v_limit
  ) x;

  if not p_apply then
    return jsonb_build_object(
      'mode','preview',
      'high_confidence_new',v_new_review,
      'existing_project_reviews',v_existing_review,
      'created_new_tasks',0,
      'created_existing_tasks',0,
      'generated_at',now()
    );
  end if;

  with candidates as (
    select c.*
    from public.project_discovery_candidates c
    where c.status='open'
      and c.match_project_id is null
      and coalesce(c.score,0) >= 96
      and coalesce(c.last_seen_at,c.updated_at,c.discovered_at) >= now()-interval '30 days'
    order by c.score desc, c.last_seen_at desc nulls last
    limit v_limit
  ), inserted as (
    insert into public.tasks(
      title,detail,due_date,priority,status,source,category,source_ref
    )
    select
      'New project candidate · '||left(coalesce(nullif(btrim(c.title),''),coalesce(nullif(btrim(c.client),''),'Unknown opportunity')),150),
      'Project Discovery found a high-confidence new opportunity from Gmail. '
      ||'Score: '||coalesce(c.score,0)::text||'. '
      ||'Client: '||coalesce(nullif(btrim(c.client),''),'—')||'. '
      ||'Reference: '||coalesce(nullif(btrim(c.project_ref),''),'—')||'. '
      ||'Domain: '||coalesce(nullif(btrim(c.domain),''),'—')||'. '
      ||'Review the evidence and decide whether to create a canonical PPPP project. No project was created and no communication was sent automatically.',
      current_date,
      'larte',
      'hapur',
      'project_discovery_review',
      'intern',
      'DISCOVERY:new:'||c.candidate_key
    from candidates c
    on conflict(source,source_ref) do nothing
    returning 1
  )
  select count(*) into v_created_new from inserted;

  with candidates as (
    select c.*
    from public.project_discovery_candidates c
    where c.status='open'
      and c.match_project_id is not null
      and coalesce(c.match_score,0) between 85 and 99
      and coalesce(c.last_seen_at,c.updated_at,c.discovered_at) >= now()-interval '30 days'
    order by c.match_score desc, c.score desc, c.last_seen_at desc nulls last
    limit v_limit
  ), inserted as (
    insert into public.tasks(
      project_id,title,detail,due_date,priority,status,source,category,source_ref
    )
    select
      c.match_project_id,
      'Check project link · '||left(coalesce(nullif(btrim(c.title),''),coalesce(nullif(btrim(c.client),''),'Discovery candidate')),150),
      'Project Discovery found email traffic that may belong to this existing project, but the identity match is not strong enough for automatic linking. '
      ||'Discovery score: '||coalesce(c.score,0)::text||'; match score: '||coalesce(c.match_score,0)::text||'. '
      ||'Confirm or reject the project association. No email was relinked automatically by this triage step.',
      current_date + 1,
      'mesatare',
      'hapur',
      'project_discovery_link_review',
      'intern',
      'DISCOVERY:link:'||c.candidate_key
    from candidates c
    on conflict(source,source_ref) do nothing
    returning 1
  )
  select count(*) into v_created_existing from inserted;

  return jsonb_build_object(
    'mode','apply',
    'high_confidence_new',v_new_review,
    'existing_project_reviews',v_existing_review,
    'created_new_tasks',v_created_new,
    'created_existing_tasks',v_created_existing,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_project_discovery_triage_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_project_discovery_triage_v1(boolean,integer) to service_role;

do $do$
declare
  v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname='project-discovery-triage-hourly'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
end
$do$;

select cron.schedule(
  'project-discovery-triage-hourly',
  '27 * * * *',
  $$select public.pppp_project_discovery_triage_v1(true,100);$$
);
