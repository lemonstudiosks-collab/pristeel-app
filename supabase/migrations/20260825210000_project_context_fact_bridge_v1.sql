create table if not exists public.pppp_project_context_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null default 'general',
  subject text,
  fact_key text not null,
  value jsonb not null default '{}'::jsonb,
  source_type text not null default 'system',
  source_ref text,
  evidence_status text not null default 'unverified',
  confidence numeric,
  fact_status text not null default 'observed',
  supersedes_id uuid references public.pppp_project_context_facts(id) on delete set null,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text not null default 'system',
  constraint pppp_project_context_facts_fact_key_nonempty check (btrim(fact_key) <> ''),
  constraint pppp_project_context_facts_source_type_check check (source_type in ('chatgpt','email','phone','document','system','user','api','other')),
  constraint pppp_project_context_facts_evidence_status_check check (evidence_status in ('unverified','observed','verbal','documented','confirmed')),
  constraint pppp_project_context_facts_fact_status_check check (fact_status in ('observed','suggested','dismissed')),
  constraint pppp_project_context_facts_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create unique index if not exists pppp_project_context_facts_idempotency_uidx
  on public.pppp_project_context_facts(idempotency_key)
  where idempotency_key is not null;

create index if not exists pppp_project_context_facts_project_idx
  on public.pppp_project_context_facts(project_id, updated_at desc);

create index if not exists pppp_project_context_facts_current_idx
  on public.pppp_project_context_facts(project_id, fact_key, created_at desc)
  where fact_status <> 'dismissed';

alter table public.pppp_project_context_facts enable row level security;

drop policy if exists pppp_project_context_facts_read on public.pppp_project_context_facts;
create policy pppp_project_context_facts_read
  on public.pppp_project_context_facts
  for select to authenticated
  using (true);

drop policy if exists pppp_project_context_facts_ins on public.pppp_project_context_facts;
create policy pppp_project_context_facts_ins
  on public.pppp_project_context_facts
  for insert to authenticated
  with check (public.can_write());

drop policy if exists pppp_project_context_facts_upd on public.pppp_project_context_facts;
create policy pppp_project_context_facts_upd
  on public.pppp_project_context_facts
  for update to authenticated
  using (public.can_write())
  with check (public.can_write());

drop policy if exists pppp_project_context_facts_del on public.pppp_project_context_facts;
create policy pppp_project_context_facts_del
  on public.pppp_project_context_facts
  for delete to authenticated
  using (public.can_write());

create or replace function public.pppp_project_context_facts_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pppp_project_context_facts_touch_updated_at on public.pppp_project_context_facts;
create trigger pppp_project_context_facts_touch_updated_at
before update on public.pppp_project_context_facts
for each row execute function public.pppp_project_context_facts_touch_updated_at();

create or replace view public.pppp_project_context_current_v
with (security_invoker = true)
as
select distinct on (f.project_id, f.fact_key)
  f.id,
  f.project_id,
  f.category,
  f.subject,
  f.fact_key,
  f.value,
  f.source_type,
  f.source_ref,
  f.evidence_status,
  f.confidence,
  f.fact_status,
  f.supersedes_id,
  f.created_at,
  f.updated_at,
  f.created_by
from public.pppp_project_context_facts f
where f.fact_status <> 'dismissed'
order by f.project_id, f.fact_key, f.created_at desc, f.id desc;

create or replace function public.pppp_ingest_context_fact_v1(
  p_project_id uuid,
  p_fact_key text,
  p_value jsonb,
  p_category text default 'general',
  p_subject text default null,
  p_source_type text default 'system',
  p_source_ref text default null,
  p_evidence_status text default 'unverified',
  p_confidence numeric default null,
  p_fact_status text default 'observed',
  p_idempotency_key text default null,
  p_created_by text default 'system'
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_previous_id uuid;
begin
  if p_project_id is null or not exists (select 1 from public.projects where id = p_project_id) then
    raise exception 'Valid project_id is required';
  end if;
  if p_fact_key is null or btrim(p_fact_key) = '' then
    raise exception 'fact_key is required';
  end if;
  if p_fact_status not in ('observed','suggested') then
    raise exception 'Automated/context intake may only create observed or suggested facts';
  end if;
  if p_source_type not in ('chatgpt','email','phone','document','system','user','api','other') then
    raise exception 'Unsupported source_type';
  end if;
  if p_evidence_status not in ('unverified','observed','verbal','documented','confirmed') then
    raise exception 'Unsupported evidence_status';
  end if;
  if p_confidence is not null and (p_confidence < 0 or p_confidence > 1) then
    raise exception 'confidence must be between 0 and 1';
  end if;

  if p_idempotency_key is not null then
    select id into v_id from public.pppp_project_context_facts where idempotency_key = p_idempotency_key limit 1;
    if v_id is not null then
      return v_id;
    end if;
  end if;

  select id into v_previous_id
  from public.pppp_project_context_facts
  where project_id = p_project_id
    and fact_key = p_fact_key
    and fact_status <> 'dismissed'
  order by created_at desc, id desc
  limit 1;

  insert into public.pppp_project_context_facts(
    project_id, category, subject, fact_key, value, source_type, source_ref,
    evidence_status, confidence, fact_status, supersedes_id, idempotency_key, created_by
  ) values (
    p_project_id, coalesce(nullif(btrim(p_category),''),'general'), nullif(btrim(p_subject),''), btrim(p_fact_key),
    coalesce(p_value,'{}'::jsonb), p_source_type, nullif(btrim(p_source_ref),''), p_evidence_status,
    p_confidence, p_fact_status, v_previous_id, nullif(btrim(p_idempotency_key),''), coalesce(nullif(btrim(p_created_by),''),'system')
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.pppp_ingest_context_fact_v1(uuid,text,jsonb,text,text,text,text,text,numeric,text,text,text) from public, anon;
grant execute on function public.pppp_ingest_context_fact_v1(uuid,text,jsonb,text,text,text,text,text,numeric,text,text,text) to authenticated, service_role;

grant select on public.pppp_project_context_current_v to authenticated, service_role;
