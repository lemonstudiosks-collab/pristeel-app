-- PRISTEEL invoice project + offer traceability
-- Additive migrations already applied to production Supabase.

begin;

alter table public.invoices_out
  add column if not exists project_id uuid,
  add column if not exists source_offer_id uuid,
  add column if not exists source_offer_doc_nr text,
  add column if not exists source_milestone_index integer;

alter table public.invoices_in
  add column if not exists project_id uuid;

create index if not exists invoices_out_project_id_idx on public.invoices_out(project_id);
create index if not exists invoices_in_project_id_idx on public.invoices_in(project_id);
create index if not exists invoices_out_source_offer_id_idx on public.invoices_out(source_offer_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='invoices_out_project_id_fkey' and conrelid='public.invoices_out'::regclass
  ) then
    alter table public.invoices_out add constraint invoices_out_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='invoices_in_project_id_fkey' and conrelid='public.invoices_in'::regclass
  ) then
    alter table public.invoices_in add constraint invoices_in_project_id_fkey
      foreign key (project_id) references public.projects(id) on delete set null;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='invoices_out_source_offer_id_fkey' and conrelid='public.invoices_out'::regclass
  ) then
    alter table public.invoices_out add constraint invoices_out_source_offer_id_fkey
      foreign key (source_offer_id) references public.documents_registry(id) on delete set null;
  end if;
end $$;

update public.invoices_out io
set project_id = dr.project_id
from public.documents_registry dr
where io.project_id is null
  and dr.series='INV'
  and dr.project_id is not null
  and dr.doc_nr = io.invoice_nr;

with unique_project_names as (
  select lower(trim(name)) as project_name_key, min(id::text)::uuid as project_id
  from public.projects
  where nullif(trim(name),'') is not null
  group by lower(trim(name))
  having count(*) = 1
)
update public.invoices_in ii
set project_id = u.project_id
from unique_project_names u
where ii.project_id is null
  and nullif(trim(ii.project),'') is not null
  and lower(trim(ii.project)) = u.project_name_key;

commit;
