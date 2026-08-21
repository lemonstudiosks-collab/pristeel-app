-- PRISTEEL PPPP local semantic AI runtime
-- Reproducible schema/RPC/cron source. No plaintext worker key is stored in Git.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.semantic_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  context_fingerprint text not null,
  state text not null default 'pending',
  payload jsonb not null,
  result jsonb,
  model text,
  worker_id text,
  attempts integer not null default 0,
  error text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  application_error text,
  unique(project_id,context_fingerprint)
);

create table if not exists public.semantic_worker_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

alter table public.semantic_ai_jobs enable row level security;
alter table public.semantic_worker_keys enable row level security;

-- Service-role Edge Functions own access. No anon/authenticated policies are created.

create index if not exists semantic_ai_jobs_pending_idx on public.semantic_ai_jobs(state,created_at);
create index if not exists semantic_ai_jobs_project_idx on public.semantic_ai_jobs(project_id,created_at desc);
create index if not exists semantic_ai_jobs_completed_unapplied_idx on public.semantic_ai_jobs(state,completed_at) where applied_at is null;

alter table public.semantic_ai_jobs drop constraint if exists semantic_ai_jobs_state_check;
alter table public.semantic_ai_jobs add constraint semantic_ai_jobs_state_check
check (state = any(array['pending'::text,'claimed'::text,'completed'::text,'failed'::text,'superseded'::text]));

create or replace function public.semantic_worker_authorize(p_key text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare v_label text;
begin
  if coalesce(p_key,'')='' then return null; end if;
  update public.semantic_worker_keys
  set last_used_at=now()
  where is_active=true
    and key_hash=encode(digest(p_key,'sha256'),'hex')
  returning label into v_label;
  return v_label;
end;
$$;

create or replace function public.semantic_claim_job(p_worker_label text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_job public.semantic_ai_jobs%rowtype;
begin
  update public.semantic_ai_jobs
  set state='superseded',
      error=coalesce(error,'') || case when coalesce(error,'')='' then '' else E'\n' end || 'Claim expired after 30 minutes',
      updated_at=now()
  where state='claimed'
    and claimed_at < now()-interval '30 minutes';

  select * into v_job
  from public.semantic_ai_jobs
  where state='pending'
  order by created_at asc
  for update skip locked
  limit 1;

  if not found then return null; end if;

  update public.semantic_ai_jobs
  set state='claimed',worker_id=p_worker_label,attempts=coalesce(attempts,0)+1,
      claimed_at=now(),updated_at=now(),error=null
  where id=v_job.id
  returning * into v_job;

  return to_jsonb(v_job);
end;
$$;

create or replace function public.semantic_complete_job(
  p_job_id uuid,
  p_worker_label text,
  p_model text default null,
  p_result jsonb default null,
  p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.semantic_ai_jobs
  set state=case when nullif(p_error,'') is null then 'completed' else 'failed' end,
      model=coalesce(nullif(p_model,''),model),
      result=case when nullif(p_error,'') is null then coalesce(p_result,'{}'::jsonb) else result end,
      error=nullif(p_error,''),completed_at=now(),updated_at=now()
  where id=p_job_id
    and state='claimed'
    and coalesce(worker_id,'')=coalesce(p_worker_label,'');
  return found;
end;
$$;

create or replace function public.semantic_local_orchestrator_internal_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare v_secret text; v_id bigint;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;

  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-orchestrator?limit=' || greatest(1,least(coalesce(p_limit,10),30))::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;

revoke all on function public.semantic_worker_authorize(text) from public;
revoke all on function public.semantic_claim_job(text) from public;
revoke all on function public.semantic_complete_job(uuid,text,text,jsonb,text) from public;
revoke all on function public.semantic_local_orchestrator_internal_request(integer) from public;
grant execute on function public.semantic_worker_authorize(text) to service_role;
grant execute on function public.semantic_claim_job(text) to service_role;
grant execute on function public.semantic_complete_job(uuid,text,text,jsonb,text) to service_role;
grant execute on function public.semantic_local_orchestrator_internal_request(integer) to service_role;

-- Create a worker key outside source control, for example from a secure admin session:
-- insert into public.semantic_worker_keys(key_hash,label)
-- values (encode(extensions.digest('<random-key>','sha256'),'hex'),'Mac mini local semantic worker');

-- Idempotent production cadence. It applies completed results first, then queues only changed/relevant projects.
do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='semantic-local-orchestrator-5m' loop
    perform cron.unschedule(r.jobid);
  end loop;
end $$;
select cron.schedule('semantic-local-orchestrator-5m','7-57/5 * * * *',$$select public.semantic_local_orchestrator_internal_request(10);$$);
