-- PRISTEEL invoice payment task automation
-- Additive migration already applied to production Supabase.
-- Gives automatic tasks a stable source reference so each invoice has at most one canonical payment task.

begin;

alter table public.tasks
  add column if not exists source_ref text;

create index if not exists tasks_source_ref_idx
  on public.tasks(source, source_ref);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='tasks_source_source_ref_key'
      and conrelid='public.tasks'::regclass
  ) then
    alter table public.tasks
      add constraint tasks_source_source_ref_key unique (source, source_ref);
  end if;
end $$;

commit;
