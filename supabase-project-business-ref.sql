-- PRISTEEL canonical project business reference
-- Additive only: legacy projects.ref remains untouched for compatibility/history.

begin;

alter table public.projects
  add column if not exists business_ref text;

create index if not exists projects_business_ref_lower_idx
  on public.projects (lower(btrim(business_ref)))
  where business_ref is not null and btrim(business_ref) <> '';

commit;
