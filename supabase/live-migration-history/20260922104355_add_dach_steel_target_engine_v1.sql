
create table public.pppp_dach_steel_targets_v1 (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  source_name text,
  source_url text,

  partner_id uuid references public.partners(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,

  company_name text not null,
  company_domain text,
  company_website text,
  country text not null check (country in ('DE','AT','CH')),
  buyer_type text,

  score_band text not null default 'B1'
    check (score_band in ('A1','A2','B1','B2','C')),
  target_status text not null default 'watch'
    check (target_status in (
      'watch','qualified','active','contact_ready','outreach_pending',
      'contacted','replied','rfq','project_promoted','closed','rejected'
    )),

  why_now text,
  project_title text,
  project_reference text,
  award_date date,
  procurement_timing text,

  quote_readiness text not null default 'M0'
    check (quote_readiness in ('M0','M1','M2','M3')),
  steel_scope text,
  products text[] not null default '{}'::text[],
  estimated_tonnes numeric(12,3)
    check (estimated_tonnes is null or estimated_tonnes >= 0),
  material_revision text,
  material_confidence numeric(4,3)
    check (material_confidence is null or (material_confidence >= 0 and material_confidence <= 1)),
  material_scope jsonb not null default '{}'::jsonb
    check (jsonb_typeof(material_scope) = 'object'),
  evidence jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence) = 'array'),

  contact_status text not null default 'missing'
    check (contact_status in ('missing','searching','found','verified')),
  outreach_status text not null default 'not_ready'
    check (outreach_status in ('not_ready','ready','queued','sent','replied','suppressed')),
  outbound_source_key text,

  next_action text,
  next_action_due date,
  last_verified_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pppp_dach_steel_targets_v1 is
'Qualified DACH direct steel-supply targets only. Discovery noise stays outside PPPP. Material Intelligence is compact and evidence-backed.';

comment on column public.pppp_dach_steel_targets_v1.quote_readiness is
'M0 unknown; M1 product/scope known; M2 calculated from drawings/specs; M3 official BOQ/material list suitable for proactive quotation basis.';

comment on column public.pppp_dach_steel_targets_v1.material_scope is
'Compact JSON material intelligence. Expected shape may include basis, revision, total_tonnes, currency-independent technical line_items [{family,designation,grade,standard,dimensions,length_m,qty,unit,tonnes,source_ref,confidence}].';

create index pppp_dach_steel_targets_country_score_idx
  on public.pppp_dach_steel_targets_v1(country, score_band);

create index pppp_dach_steel_targets_status_score_idx
  on public.pppp_dach_steel_targets_v1(target_status, score_band);

create index pppp_dach_steel_targets_quote_readiness_idx
  on public.pppp_dach_steel_targets_v1(quote_readiness);

create index pppp_dach_steel_targets_partner_idx
  on public.pppp_dach_steel_targets_v1(partner_id)
  where partner_id is not null;

create index pppp_dach_steel_targets_project_idx
  on public.pppp_dach_steel_targets_v1(project_id)
  where project_id is not null;

create index pppp_dach_steel_targets_next_action_idx
  on public.pppp_dach_steel_targets_v1(next_action_due)
  where next_action_due is not null
    and target_status not in ('closed','rejected');

alter table public.pppp_dach_steel_targets_v1 enable row level security;

revoke all on public.pppp_dach_steel_targets_v1 from anon;
grant select, insert, update, delete on public.pppp_dach_steel_targets_v1 to authenticated;
grant all on public.pppp_dach_steel_targets_v1 to service_role;

create policy pppp_dach_steel_targets_authenticated_read
  on public.pppp_dach_steel_targets_v1
  for select
  to authenticated
  using (true);

create policy pppp_dach_steel_targets_authenticated_insert
  on public.pppp_dach_steel_targets_v1
  for insert
  to authenticated
  with check ((select public.can_write()));

create policy pppp_dach_steel_targets_authenticated_update
  on public.pppp_dach_steel_targets_v1
  for update
  to authenticated
  using ((select public.can_write()))
  with check ((select public.can_write()));

create policy pppp_dach_steel_targets_authenticated_delete
  on public.pppp_dach_steel_targets_v1
  for delete
  to authenticated
  using ((select public.can_write()));

create or replace view public.pppp_dach_steel_home_summary_v1
with (security_invoker = true)
as
with active as (
  select *
  from public.pppp_dach_steel_targets_v1
  where target_status not in ('closed','rejected')
),
hot as (
  select
    id,
    company_name,
    project_title,
    quote_readiness,
    why_now,
    estimated_tonnes,
    procurement_timing
  from active
  order by
    case score_band
      when 'A1' then 1
      when 'A2' then 2
      when 'B1' then 3
      when 'B2' then 4
      else 5
    end,
    case quote_readiness
      when 'M3' then 1
      when 'M2' then 2
      when 'M1' then 3
      else 4
    end,
    next_action_due nulls last,
    updated_at desc
  limit 1
),
outbound as (
  select
    count(*) filter (where sent_at is not null or status = 'sent')::int as sent,
    count(*) filter (where replied_at is not null or status = 'replied')::int as replies
  from public.pppp_outbound_queue_v1
  where source = 'DACH_STEEL_BUYER'
)
select
  (select count(*)::int from active) as targets,
  (select count(*)::int from active where score_band = 'A1') as a1_targets,
  (select count(*)::int from active where quote_readiness = 'M3') as quote_ready,
  (select count(*)::int from active where contact_status in ('missing','searching')) as needs_contact,
  (select count(*)::int from active where outreach_status = 'ready') as ready_for_outreach,
  coalesce((select sent from outbound),0) as sent,
  coalesce((select replies from outbound),0) as replies,
  coalesce((select round(sum(estimated_tonnes),3) from active where estimated_tonnes is not null),0) as identified_tonnes,
  (select id from hot) as hot_target_id,
  (select company_name from hot) as hot_company_name,
  (select project_title from hot) as hot_project_title,
  (select quote_readiness from hot) as hot_quote_readiness,
  (select why_now from hot) as hot_why_now,
  (select estimated_tonnes from hot) as hot_estimated_tonnes,
  (select procurement_timing from hot) as hot_procurement_timing,
  now() as calculated_at;

revoke all on public.pppp_dach_steel_home_summary_v1 from anon;
grant select on public.pppp_dach_steel_home_summary_v1 to authenticated, service_role;

