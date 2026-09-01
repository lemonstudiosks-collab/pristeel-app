-- PPPP Project Discovery triage precision v2
-- Keep the automated triage conservative: only surface genuinely new, high-confidence
-- Gmail candidates. Existing-project semantic matches remain under the established
-- identity-autolink and manual-review mechanisms because weak semantic matches can be noisy.

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
  v_candidates integer := 0;
  v_created integer := 0;
begin
  select count(*) into v_candidates
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

  if not p_apply then
    return jsonb_build_object(
      'mode','preview',
      'high_confidence_new',v_candidates,
      'created_tasks',0,
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
  select count(*) into v_created from inserted;

  return jsonb_build_object(
    'mode','apply',
    'high_confidence_new',v_candidates,
    'created_tasks',v_created,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_project_discovery_triage_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_project_discovery_triage_v1(boolean,integer) to service_role;
