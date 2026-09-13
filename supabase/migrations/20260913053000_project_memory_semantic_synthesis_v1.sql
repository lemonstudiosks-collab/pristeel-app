-- PPPP historical semantic memory synthesis v1
-- Service-only automation wrapper for a backstage memory synthesis Edge Function.
-- This layer never creates tasks, RFQ drafts, project-state changes, emails,
-- supplier commitments, pricing decisions, contracts/POs, or won/lost decisions.

create or replace function public.pppp_project_memory_synthesis_internal_request(
  p_limit integer default 2
)
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_limit integer := greatest(1,least(coalesce(p_limit,2),2));
begin
  return public.pppp_enqueue_automation_http_v1(
    'project-memory-synthesis',
    format(
      'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-project-memory-synthesis?limit=%s',
      v_limit
    ),
    'gmail_tracker_cron_secret',
    120000,
    1
  );
end;
$function$;

revoke all on function public.pppp_project_memory_synthesis_internal_request(integer)
  from public,anon,authenticated;
grant execute on function public.pppp_project_memory_synthesis_internal_request(integer)
  to service_role;

comment on function public.pppp_project_memory_synthesis_internal_request(integer) is
  'Queues the memory-only historical semantic synthesis worker. Max two changed projects per run and one HTTP attempt only; no operational action is authorized by this wrapper.';

do $block$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname='project-memory-semantic-synthesis-30m'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'project-memory-semantic-synthesis-30m',
    '22,52 * * * *',
    $cmd$select public.pppp_project_memory_synthesis_internal_request(2);$cmd$
  );
end;
$block$;
