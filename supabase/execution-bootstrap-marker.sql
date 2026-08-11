-- PRISTEEL won-project execution bootstrap marker
-- Additive migration already applied to production Supabase.
-- The marker prevents retroactive or repeated execution checklists.

begin;

alter table public.projects
  add column if not exists execution_bootstrapped_at timestamptz,
  add column if not exists execution_bootstrap_source text;

create index if not exists projects_execution_bootstrapped_at_idx
  on public.projects(execution_bootstrapped_at);

commit;
