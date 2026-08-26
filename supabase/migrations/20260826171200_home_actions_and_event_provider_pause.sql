-- PPPP Home/current-event stabilization applied live on 2026-08-26.
-- This migration mirrors the live state so a future environment does not depend on chat history.

create or replace view public.pppp_home_current_actions_v1 as
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
where lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed')
  and lower(coalesce(p.status,'')) not in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar')
  and t.source not in (
    'execution_release_readiness',
    'document_bom_review',
    'document_image_review',
    'data_integrity_audit',
    'project_discovery_auto',
    'commercial_intake_review',
    'sla_auto',
    'execution_won'
  )
  and not (t.source='semantic_brain_auto' and coalesce(t.source_ref,'') like 'semantic:rfq-%')
  and not (
    coalesce(t.source,'') <> 'manual'
    and p.operational_state='wait_for_client'
    and coalesce(p.operational_state_at,'1970-01-01'::timestamptz) >= coalesce(t.created_at,'1970-01-01'::timestamptz)
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
  and (
    t.due_date is null
    or t.due_date <= current_date + 7
    or lower(coalesce(t.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
  );

create or replace function public.pppp_project_event_intelligence_internal_request(
  p_days integer default 3,
  p_limit integer default 2
)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_days integer := greatest(1, least(coalesce(p_days,3), 7));
  v_limit integer := greatest(1, least(coalesce(p_limit,2), 4));
begin
  select decrypted_secret
    into v_secret
    from vault.decrypted_secrets
   where name='gmail_tracker_cron_secret'
   limit 1;

  if coalesce(v_secret,'')='' then
    raise exception 'gmail_tracker_cron_secret missing';
  end if;

  select net.http_get(
    url := format(
      'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-project-event-intelligence?days=%s&limit=%s',
      v_days,
      v_limit
    ),
    headers := jsonb_build_object('x-pppp-cron-secret', v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.pppp_project_event_intelligence_internal_request(integer,integer) from public;
grant execute on function public.pppp_project_event_intelligence_internal_request(integer,integer) to postgres, service_role;

-- The new unattended event-intelligence function fails closed when OPENAI_API_KEY is not
-- available in its runtime. Do not repeatedly run a provider-unavailable cron. Deterministic
-- Gmail/project-state triggers remain active and authoritative. Re-enable only after a real
-- end-to-end semantic event succeeds.
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname='project-event-intelligence-5m'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(job_id := v_jobid, active := false);
  end if;
end;
$$;
