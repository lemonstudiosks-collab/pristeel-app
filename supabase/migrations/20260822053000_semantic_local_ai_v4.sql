-- PPPP local semantic AI v4 infrastructure.
-- Worker credentials are provisioned separately and are intentionally not stored in Git.

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

alter table public.semantic_ai_jobs drop constraint if exists semantic_ai_jobs_state_check;
alter table public.semantic_ai_jobs add constraint semantic_ai_jobs_state_check
  check (state in ('pending','claimed','completed','failed','superseded'));
create index if not exists semantic_ai_jobs_pending_idx on public.semantic_ai_jobs(state,created_at);
create index if not exists semantic_ai_jobs_project_idx on public.semantic_ai_jobs(project_id,created_at desc);
create index if not exists semantic_ai_jobs_completed_unapplied_idx on public.semantic_ai_jobs(state,completed_at) where applied_at is null;
alter table public.semantic_ai_jobs enable row level security;

create table if not exists public.semantic_worker_keys (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique,
  label text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.semantic_worker_keys enable row level security;

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
  where is_active=true and key_hash=encode(digest(p_key,'sha256'),'hex')
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
      error=concat_ws(E'\n',nullif(error,''),'Claim expired after 30 minutes'),
      updated_at=now()
  where state='claimed' and claimed_at < now()-interval '30 minutes';

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
  p_job_id uuid,p_worker_label text,p_model text default null,
  p_result jsonb default null,p_error text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_state text;
begin
  select state into v_state from public.semantic_ai_jobs
  where id=p_job_id and coalesce(worker_id,'')=coalesce(p_worker_label,'') for update;
  if not found or v_state not in ('claimed','superseded') then return false; end if;
  if v_state='superseded' then
    update public.semantic_ai_jobs
    set model=coalesce(nullif(p_model,''),model),
        result=case when nullif(p_error,'') is null then coalesce(p_result,result) else result end,
        error=coalesce(error,nullif(p_error,'')),completed_at=coalesce(completed_at,now()),updated_at=now()
    where id=p_job_id;
    return true;
  end if;
  update public.semantic_ai_jobs
  set state=case when nullif(p_error,'') is null then 'completed' else 'failed' end,
      model=coalesce(nullif(p_model,''),model),
      result=case when nullif(p_error,'') is null then coalesce(p_result,'{}'::jsonb) else result end,
      error=nullif(p_error,''),completed_at=now(),updated_at=now()
  where id=p_job_id;
  return true;
end;
$$;

revoke all on function public.semantic_worker_authorize(text) from public;
revoke all on function public.semantic_claim_job(text) from public;
revoke all on function public.semantic_complete_job(uuid,text,text,jsonb,text) from public;
grant execute on function public.semantic_worker_authorize(text) to service_role;
grant execute on function public.semantic_claim_job(text) to service_role;
grant execute on function public.semantic_complete_job(uuid,text,text,jsonb,text) to service_role;

create or replace function public.pppp_semantic_result_safety_v1()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_text text := ''; v_role text := ''; v_stop boolean := false;
begin
  if coalesce(new.state,'') <> 'completed' or new.result is null then return new; end if;
  select lower(coalesce(string_agg(coalesce(x->>'label','') || ' ' || coalesce(x->>'text',''),' '),''))
    into v_text from jsonb_array_elements(coalesce(new.payload->'sources','[]'::jsonb)) x;
  v_role := lower(coalesce(new.payload->'meta'->'latest_incoming'->>'sender_role',''));
  v_stop := v_text ~ '(stop|hold|suspend|pause)[^\n]{0,120}(fabrication|production|manufactur|weld|assembly)'
         or v_text ~ '(fabrication|production|manufactur|weld|assembly)[^\n]{0,120}(stop|hold|suspend|pause)'
         or v_text ~ 'ndal[^\n]{0,90}(prodh|fabrik)'
         or v_text ~ 'zaustav[^\n]{0,90}(proizvod|izrad)'
         or v_text ~ 'produktion[^\n]{0,90}(stop|halt)';
  if coalesce(new.result->>'category','')='production_change' and not v_stop then
    new.result := jsonb_set(new.result,'{category}',to_jsonb(case when v_role='supplier' then 'supplier_update' else 'client_request' end),true);
    if coalesce(new.result->>'priority','')='critical' then new.result:=jsonb_set(new.result,'{priority}','"high"'::jsonb,true); end if;
    new.result := new.result || jsonb_build_object('deterministic_category_override','production_change_not_supported_by_source');
  elsif v_stop then
    new.result:=jsonb_set(new.result,'{action_required}','true'::jsonb,true);
    new.result:=jsonb_set(new.result,'{priority}','"critical"'::jsonb,true);
    new.result:=jsonb_set(new.result,'{category}','"production_change"'::jsonb,true);
  end if;
  return new;
end;
$$;
drop trigger if exists pppp_semantic_result_safety_v1 on public.semantic_ai_jobs;
create trigger pppp_semantic_result_safety_v1 before insert or update of state,result on public.semantic_ai_jobs
for each row execute function public.pppp_semantic_result_safety_v1();

create or replace function public.pppp_semantic_email_task_freshness_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_msg_id text; v_sent_at timestamptz; v_state_at timestamptz; v_note text := 'PPPP: semantic email action suppressed because the source email is not newer than the current canonical project state.';
begin
  if coalesce(new.source,'') <> 'semantic_brain_auto' or coalesce(new.source_ref,'') not like 'semantic:email:%' then return new; end if;
  v_msg_id := substring(new.source_ref from length('semantic:email:')+1);
  select pe.sent_at,p.operational_state_at into v_sent_at,v_state_at
  from public.projects p left join public.project_emails pe on pe.project_id=p.id and pe.gmail_message_id=v_msg_id
  where p.id=new.project_id;
  if v_sent_at is null or (v_state_at is not null and v_sent_at<=v_state_at) then
    new.status:='mbyllur'; new.done_at:=coalesce(new.done_at,now());
    if position(v_note in coalesce(new.detail,''))=0 then new.detail:=concat_ws(E'\n',nullif(new.detail,''),v_note); end if;
  end if;
  return new;
end;
$$;
drop trigger if exists zzz_pppp_semantic_email_task_freshness_guard on public.tasks;
create trigger zzz_pppp_semantic_email_task_freshness_guard before insert or update of project_id,source,source_ref,status,detail on public.tasks
for each row execute function public.pppp_semantic_email_task_freshness_guard();

create or replace function public.semantic_local_orchestrator_internal_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare v_secret text; v_id bigint;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/semantic-local-orchestrator?limit=' || greatest(1,least(coalesce(p_limit,10),30))::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;
revoke all on function public.semantic_local_orchestrator_internal_request(integer) from public;
grant execute on function public.semantic_local_orchestrator_internal_request(integer) to service_role;

-- Cron intentionally not created here. It is enabled only after the live local worker and v4 feedback-loop tests pass.
