begin;

create table if not exists public.pppp_chatgpt_command_receipts (
  command_id text primary key,
  project_id uuid references public.projects(id) on delete set null,
  action_type text not null,
  approval text,
  requested_by text,
  source_ref text,
  sheet_row integer,
  status text not null check (status in ('processing','succeeded','rejected','failed')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  result jsonb not null default '{}'::jsonb,
  requested_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pppp_chatgpt_command_receipts_status_idx
  on public.pppp_chatgpt_command_receipts(status, processed_at desc);
create index if not exists pppp_chatgpt_command_receipts_project_idx
  on public.pppp_chatgpt_command_receipts(project_id, processed_at desc);

alter table public.pppp_chatgpt_command_receipts enable row level security;
revoke all on table public.pppp_chatgpt_command_receipts from public, anon, authenticated;
grant select, insert, update on table public.pppp_chatgpt_command_receipts to service_role;

create or replace function public.pppp_chatgpt_command_status_v1(
  p_command_id text default null,
  p_limit integer default 20
)
returns table(
  command_id text,
  project_id uuid,
  action_type text,
  status text,
  result jsonb,
  requested_at timestamptz,
  processed_at timestamptz
)
language sql
security definer
set search_path = pg_catalog, public
as $$
  select r.command_id, r.project_id, r.action_type, r.status, r.result, r.requested_at, r.processed_at
  from public.pppp_chatgpt_command_receipts r
  where nullif(btrim(p_command_id),'') is null or r.command_id = btrim(p_command_id)
  order by r.processed_at desc nulls last, r.created_at desc
  limit least(100, greatest(1, coalesce(p_limit,20)));
$$;

revoke all on function public.pppp_chatgpt_command_status_v1(text,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_command_status_v1(text,integer) to service_role;
do $$ begin
  if exists (select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_command_status_v1(text,integer) to supabase_read_only_user;
  end if;
end $$;

create or replace function public.chatgpt_command_bridge_internal_request(p_limit integer default 50)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := least(200, greatest(1, coalesce(p_limit,50)));
begin
  return public.pppp_enqueue_automation_http_v1(
    'chatgpt-command-bridge',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/chatgpt-command-bridge?limit=' || v_limit::text,
    'gmail_tracker_cron_secret',
    120000,
    3
  );
end;
$$;

revoke all on function public.chatgpt_command_bridge_internal_request(integer) from public, anon, authenticated;
grant execute on function public.chatgpt_command_bridge_internal_request(integer) to service_role;

-- Keep polling modest: the command sheet is append-only and empty runs are read-only.
do $$
declare
  v_jobid bigint;
  v_command text := 'select public.chatgpt_command_bridge_internal_request(50);';
begin
  select jobid into v_jobid from cron.job where jobname='chatgpt-command-bridge-10m' limit 1;
  if v_jobid is null then
    perform cron.schedule('chatgpt-command-bridge-10m','*/10 * * * *',v_command);
  else
    perform cron.alter_job(job_id => v_jobid, schedule => '*/10 * * * *', command => v_command, active => true);
  end if;
end $$;

commit;
