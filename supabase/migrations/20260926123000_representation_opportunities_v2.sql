-- PriSteel Representations v2
-- Adds project/tender opportunity truth and candidate linking without creating
-- canonical Projects, Partners, Contacts, outbound rows or email side effects.

alter table public.pppp_representation_targets_v1
  add column if not exists target_type text not null default 'representation';

alter table public.pppp_representation_targets_v1
  drop constraint if exists pppp_representation_targets_v1_target_type_check;
alter table public.pppp_representation_targets_v1
  add constraint pppp_representation_targets_v1_target_type_check
  check (target_type in ('lead_epc_candidate','oem_specialist_partner','representation'));

comment on column public.pppp_representation_targets_v1.target_type is
  'Business role of the company in this pipeline; it does not create a Partner or Contact.';

create table public.pppp_representation_opportunities_v1 (
  id uuid primary key default gen_random_uuid(),
  source_key text not null check (length(btrim(source_key)) between 1 and 500),
  project_name text not null check (length(btrim(project_name)) between 1 and 500),
  funding_institution text,
  tender_reference text,
  official_source text,
  total_project_value numeric(18,2) check (total_project_value is null or total_project_value >= 0),
  currency text check (currency is null or currency ~ '^[A-Z]{3}$'),
  financing text,
  status text not null default 'pipeline'
    check (status in ('pipeline','approved','signed','waiting_procurement','procurement','tender_open','partner_search_ready','closed')),
  procurement_stage text,
  tender_deadline timestamptz,
  scope text,
  procurement_packages text[] not null default '{}'::text[],
  qualification_criteria text,
  jv_consortium_rules text,
  mandatory_site_visit boolean,
  bid_guarantee text,
  performance_guarantee text,
  verification_status text not null default 'unknown'
    check (verification_status in ('unknown','review','verified')),
  fact_evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(fact_evidence) = 'object'),
  last_verified_at timestamptz,
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pppp_representation_opportunities_source_url_check
    check (official_source is null or official_source ~* '^https?://')
);

comment on table public.pppp_representation_opportunities_v1 is
  'Project/tender opportunity truth for the Representations module. One opportunity may have many candidate companies; no automatic outreach.';
comment on column public.pppp_representation_opportunities_v1.fact_evidence is
  'Per-field evidence object. Each field may carry status confirmed, unknown, or assumption plus source and verified_at. Null/unknown is never a confirmed fact.';

create unique index pppp_representation_opportunities_source_key_uidx
  on public.pppp_representation_opportunities_v1(source_key);
create index pppp_representation_opportunities_status_idx
  on public.pppp_representation_opportunities_v1(status, tender_deadline)
  where archived_at is null;

create table public.pppp_representation_opportunity_targets_v1 (
  opportunity_id uuid not null references public.pppp_representation_opportunities_v1(id) on delete cascade,
  target_id uuid not null references public.pppp_representation_targets_v1(id) on delete cascade,
  candidate_role text not null default 'oem_specialist_partner'
    check (candidate_role in ('lead_epc_candidate','oem_specialist_partner','local_partner','representation')),
  company_fit_status text not null default 'unknown'
    check (company_fit_status in ('unknown','review','verified','rejected')),
  fit_evidence jsonb not null default '{}'::jsonb
    check (jsonb_typeof(fit_evidence) = 'object'),
  fit_verified_at timestamptz,
  next_action text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (opportunity_id,target_id)
);

comment on table public.pppp_representation_opportunity_targets_v1 is
  'Many-to-many candidate links. Outreach is eligible only after project verification, known procurement stage and verified company fit; sending remains manual.';

create index pppp_representation_opportunity_targets_target_idx
  on public.pppp_representation_opportunity_targets_v1(target_id)
  where archived_at is null;

create or replace function public.pppp_representation_opportunities_touch_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'pppp_representation_opportunities_v1' then
    new.source_key := btrim(new.source_key);
    new.project_name := btrim(new.project_name);
    new.currency := upper(nullif(btrim(new.currency),''));
  end if;
  return new;
end;
$$;

revoke all on function public.pppp_representation_opportunities_touch_v1() from public, anon, authenticated;

create trigger pppp_representation_opportunities_touch_v1
before insert or update on public.pppp_representation_opportunities_v1
for each row execute function public.pppp_representation_opportunities_touch_v1();
create trigger pppp_representation_opportunity_targets_touch_v1
before insert or update on public.pppp_representation_opportunity_targets_v1
for each row execute function public.pppp_representation_opportunities_touch_v1();

alter table public.pppp_representation_opportunities_v1 enable row level security;
alter table public.pppp_representation_opportunity_targets_v1 enable row level security;
revoke all on table public.pppp_representation_opportunities_v1 from public, anon;
revoke all on table public.pppp_representation_opportunity_targets_v1 from public, anon;
grant select, insert, update, delete on table public.pppp_representation_opportunities_v1 to authenticated;
grant select, insert, update, delete on table public.pppp_representation_opportunity_targets_v1 to authenticated;
grant all privileges on table public.pppp_representation_opportunities_v1 to service_role, postgres;
grant all privileges on table public.pppp_representation_opportunity_targets_v1 to service_role, postgres;

create policy pppp_representation_opportunities_authenticated_read
  on public.pppp_representation_opportunities_v1 for select to authenticated using (true);
create policy pppp_representation_opportunities_authenticated_insert
  on public.pppp_representation_opportunities_v1 for insert to authenticated
  with check ((select public.can_write()));
create policy pppp_representation_opportunities_authenticated_update
  on public.pppp_representation_opportunities_v1 for update to authenticated
  using ((select public.can_write())) with check ((select public.can_write()));
create policy pppp_representation_opportunities_authenticated_delete
  on public.pppp_representation_opportunities_v1 for delete to authenticated
  using ((select public.can_write()));

create policy pppp_representation_opportunity_targets_authenticated_read
  on public.pppp_representation_opportunity_targets_v1 for select to authenticated using (true);
create policy pppp_representation_opportunity_targets_authenticated_insert
  on public.pppp_representation_opportunity_targets_v1 for insert to authenticated
  with check ((select public.can_write()));
create policy pppp_representation_opportunity_targets_authenticated_update
  on public.pppp_representation_opportunity_targets_v1 for update to authenticated
  using ((select public.can_write())) with check ((select public.can_write()));
create policy pppp_representation_opportunity_targets_authenticated_delete
  on public.pppp_representation_opportunity_targets_v1 for delete to authenticated
  using ((select public.can_write()));

create or replace view public.pppp_representation_outreach_readiness_v1
with (security_invoker = true)
as
select
  l.opportunity_id,
  l.target_id,
  o.project_name,
  t.company_name,
  o.verification_status as project_verification_status,
  o.procurement_stage,
  l.company_fit_status,
  (
    o.verification_status = 'verified'
    and nullif(btrim(o.procurement_stage),'') is not null
    and l.company_fit_status = 'verified'
  ) as outreach_eligible,
  jsonb_strip_nulls(jsonb_build_object(
    'project_verified', case when o.verification_status <> 'verified' then 'Project verification is required' end,
    'procurement_stage_known', case when nullif(btrim(o.procurement_stage),'') is null then 'Procurement stage is required' end,
    'company_fit_verified', case when l.company_fit_status <> 'verified' then 'Company fit verification is required' end
  )) as blockers
from public.pppp_representation_opportunity_targets_v1 l
join public.pppp_representation_opportunities_v1 o on o.id = l.opportunity_id
join public.pppp_representation_targets_v1 t on t.id = l.target_id
where l.archived_at is null and o.archived_at is null and t.archived_at is null;

revoke all on public.pppp_representation_outreach_readiness_v1 from public, anon;
grant select on public.pppp_representation_outreach_readiness_v1 to authenticated, service_role;

