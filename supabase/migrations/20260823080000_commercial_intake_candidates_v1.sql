-- PPPP Phase B1: review-first commercial intake candidates.
-- This migration creates candidate queues and schedules a guarded server intake.
-- It never creates canonical supplier offers/invoices and never sends communication.

create table if not exists public.supplier_offer_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  gmail_message_id text,
  attachment_link_ids bigint[] not null default '{}'::bigint[],
  supplier_name text,
  supplier_email text,
  subject text,
  source_kind text not null default 'email' check (source_kind in ('email','attachment','email_attachment')),
  extracted jsonb not null default '{}'::jsonb,
  raw_text text,
  confidence integer not null default 0 check (confidence between 0 and 100),
  status text not null default 'review' check (status in ('review','approved','ignored','superseded')),
  canonical_offer_id uuid references public.offers(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists supplier_offer_candidates_project_status_idx on public.supplier_offer_candidates(project_id,status,updated_at desc);
create index if not exists supplier_offer_candidates_message_idx on public.supplier_offer_candidates(gmail_message_id);

alter table public.supplier_offer_candidates enable row level security;
drop policy if exists supplier_offer_candidates_read on public.supplier_offer_candidates;
create policy supplier_offer_candidates_read on public.supplier_offer_candidates for select to authenticated using (true);
drop policy if exists supplier_offer_candidates_insert on public.supplier_offer_candidates;
create policy supplier_offer_candidates_insert on public.supplier_offer_candidates for insert to authenticated with check (public.can_write());
drop policy if exists supplier_offer_candidates_update on public.supplier_offer_candidates;
create policy supplier_offer_candidates_update on public.supplier_offer_candidates for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists supplier_offer_candidates_delete on public.supplier_offer_candidates;
create policy supplier_offer_candidates_delete on public.supplier_offer_candidates for delete to authenticated using (public.can_write());

create table if not exists public.invoice_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_key text not null unique,
  project_id uuid not null references public.projects(id) on delete cascade,
  gmail_message_id text,
  attachment_link_ids bigint[] not null default '{}'::bigint[],
  party_name text,
  party_email text,
  direction text not null default 'incoming' check (direction in ('incoming','outgoing')),
  subject text,
  extracted jsonb not null default '{}'::jsonb,
  raw_text text,
  confidence integer not null default 0 check (confidence between 0 and 100),
  status text not null default 'review' check (status in ('review','approved','ignored','superseded')),
  canonical_invoice_in_id uuid references public.invoices_in(id) on delete set null,
  canonical_invoice_out_id uuid references public.invoices_out(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists invoice_candidates_project_status_idx on public.invoice_candidates(project_id,status,updated_at desc);
create index if not exists invoice_candidates_message_idx on public.invoice_candidates(gmail_message_id);

alter table public.invoice_candidates enable row level security;
drop policy if exists invoice_candidates_read on public.invoice_candidates;
create policy invoice_candidates_read on public.invoice_candidates for select to authenticated using (true);
drop policy if exists invoice_candidates_insert on public.invoice_candidates;
create policy invoice_candidates_insert on public.invoice_candidates for insert to authenticated with check (public.can_write());
drop policy if exists invoice_candidates_update on public.invoice_candidates;
create policy invoice_candidates_update on public.invoice_candidates for update to authenticated using (public.can_write()) with check (public.can_write());
drop policy if exists invoice_candidates_delete on public.invoice_candidates;
create policy invoice_candidates_delete on public.invoice_candidates for delete to authenticated using (public.can_write());

create or replace function public.commercial_intake_internal_request(p_limit integer default 250)
returns bigint
language plpgsql
security definer
set search_path='public','vault','net','pg_temp'
as $$
declare
  v_secret text;
  v_id bigint;
  v_limit integer := least(800,greatest(10,coalesce(p_limit,250)));
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/commercial-intake-orchestrator?limit='||v_limit::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_id;
  return v_id;
end;
$$;
revoke all on function public.commercial_intake_internal_request(integer) from public,anon,authenticated;
grant execute on function public.commercial_intake_internal_request(integer) to service_role;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='commercial-intake-10m' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule('commercial-intake-10m','2-52/10 * * * *','select public.commercial_intake_internal_request(250);');
end $$;
