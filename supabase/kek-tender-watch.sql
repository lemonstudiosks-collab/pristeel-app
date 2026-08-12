-- KEK tender monitor: additive, review-first intake table.
-- No project is created automatically. Promotion remains a human action in PPPP.

create table if not exists public.kek_tender_watch (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),

  source_key text not null unique,
  procurement_no text not null,
  publication_no text,
  authority text not null default 'KORPORATA ENERGJETIKE E KOSOVES sh.a.',
  title text not null,
  document_type text,
  fpp text,
  fpp_description text,
  contract_type text,
  contract_value_band text,
  procedure text,
  estimated_value numeric,
  currency text not null default 'EUR',
  deadline date,
  published_date date,
  is_retender boolean not null default false,

  category text not null default 'possible'
    check (category in ('raw_material','steel_structure','possible')),
  relevance_score integer not null default 0
    check (relevance_score between 0 and 100),
  match_reasons text[] not null default '{}',

  status text not null default 'new'
    check (status in ('new','review','ignored','promoted')),
  project_id uuid references public.projects(id) on delete set null,

  source_url text,
  detail_url text,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists kek_tender_watch_status_idx
  on public.kek_tender_watch(status, published_date desc);
create index if not exists kek_tender_watch_category_idx
  on public.kek_tender_watch(category, relevance_score desc);
create index if not exists kek_tender_watch_procurement_idx
  on public.kek_tender_watch(procurement_no);
create index if not exists kek_tender_watch_project_idx
  on public.kek_tender_watch(project_id)
  where project_id is not null;

alter table public.kek_tender_watch enable row level security;

drop policy if exists kek_tender_watch_read on public.kek_tender_watch;
create policy kek_tender_watch_read on public.kek_tender_watch
  for select to authenticated using (true);

drop policy if exists kek_tender_watch_ins on public.kek_tender_watch;
create policy kek_tender_watch_ins on public.kek_tender_watch
  for insert to authenticated with check (can_write());

drop policy if exists kek_tender_watch_upd on public.kek_tender_watch;
create policy kek_tender_watch_upd on public.kek_tender_watch
  for update to authenticated using (can_write()) with check (can_write());

drop policy if exists kek_tender_watch_del on public.kek_tender_watch;
create policy kek_tender_watch_del on public.kek_tender_watch
  for delete to authenticated using (can_write());
