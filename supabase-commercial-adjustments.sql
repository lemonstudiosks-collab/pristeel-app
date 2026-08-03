-- PRISTEEL Document Center
-- Stores credit notes and debit notes without changing existing offers or invoices.

begin;

create table if not exists public.commercial_adjustments (
  id uuid primary key default gen_random_uuid(),
  document_type text not null check (document_type in ('credit_note', 'debit_note')),
  series text not null check (series in ('CN', 'DN')),
  year integer not null,
  seq integer not null check (seq > 0),
  document_nr text not null unique,
  document_date date not null default current_date,

  original_invoice_id text not null,
  original_invoice_nr text not null,

  project_id text,
  project text,
  client text not null,
  contact text,
  email text,
  address text,
  currency text not null default 'EUR',

  reason_code text not null,
  reason_text text not null,
  adjustment_mode text not null check (adjustment_mode in ('full', 'partial')),
  items jsonb not null default '[]'::jsonb,

  net_amount numeric(18,2) not null check (net_amount >= 0),
  vat_rate numeric(8,4) not null default 0,
  vat_amount numeric(18,2) not null default 0 check (vat_amount >= 0),
  gross_amount numeric(18,2) not null check (gross_amount > 0),

  notes text,
  status text not null default 'issued' check (status in ('draft', 'issued', 'cancelled')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (document_type, year, seq)
);

create index if not exists commercial_adjustments_original_invoice_idx
  on public.commercial_adjustments (original_invoice_id);

create index if not exists commercial_adjustments_document_date_idx
  on public.commercial_adjustments (document_date desc);

create index if not exists commercial_adjustments_client_idx
  on public.commercial_adjustments (client);

alter table public.commercial_adjustments enable row level security;

drop policy if exists commercial_adjustments_select on public.commercial_adjustments;
drop policy if exists commercial_adjustments_insert on public.commercial_adjustments;
drop policy if exists commercial_adjustments_update on public.commercial_adjustments;
drop policy if exists commercial_adjustments_delete on public.commercial_adjustments;

create policy commercial_adjustments_select
  on public.commercial_adjustments
  for select to authenticated
  using (true);

create policy commercial_adjustments_insert
  on public.commercial_adjustments
  for insert to authenticated
  with check (true);

create policy commercial_adjustments_update
  on public.commercial_adjustments
  for update to authenticated
  using (true)
  with check (true);

create policy commercial_adjustments_delete
  on public.commercial_adjustments
  for delete to authenticated
  using (true);

grant select, insert, update, delete
  on public.commercial_adjustments
  to authenticated;

create or replace function public.pst_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists commercial_adjustments_set_updated_at
  on public.commercial_adjustments;

create trigger commercial_adjustments_set_updated_at
before update on public.commercial_adjustments
for each row execute function public.pst_set_updated_at();

commit;
