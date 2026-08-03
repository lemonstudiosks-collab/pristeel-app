-- PRISTEEL: shared dashboard action state across all browsers and devices

create table if not exists public.dashboard_action_states (
  action_key text primary key,
  state text not null check (state in ('completed', 'dismissed')),
  action_type text,
  title text,
  meta text,
  source_ref text,
  updated_by text,
  updated_at timestamptz not null default now()
);

alter table public.dashboard_action_states enable row level security;

drop policy if exists "dashboard_action_states_select" on public.dashboard_action_states;
drop policy if exists "dashboard_action_states_insert" on public.dashboard_action_states;
drop policy if exists "dashboard_action_states_update" on public.dashboard_action_states;
drop policy if exists "dashboard_action_states_delete" on public.dashboard_action_states;

create policy "dashboard_action_states_select"
on public.dashboard_action_states
for select
to authenticated
using (true);

create policy "dashboard_action_states_insert"
on public.dashboard_action_states
for insert
to authenticated
with check (true);

create policy "dashboard_action_states_update"
on public.dashboard_action_states
for update
to authenticated
using (true)
with check (true);

create policy "dashboard_action_states_delete"
on public.dashboard_action_states
for delete
to authenticated
using (true);

grant select, insert, update, delete on public.dashboard_action_states to authenticated;

create index if not exists dashboard_action_states_updated_at_idx
  on public.dashboard_action_states (updated_at desc);
