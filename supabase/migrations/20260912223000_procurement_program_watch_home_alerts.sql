begin;

create table if not exists public.pppp_procurement_source_policy (
  source text primary key,
  participation_mode text not null check (participation_mode in ('bid','award_intelligence','reference')),
  home_eligible boolean not null default false,
  home_min_score integer not null default 65 check (home_min_score between 0 and 100),
  notes text,
  updated_at timestamptz not null default now()
);

alter table public.pppp_procurement_source_policy enable row level security;
drop policy if exists pppp_procurement_source_policy_read on public.pppp_procurement_source_policy;
create policy pppp_procurement_source_policy_read
  on public.pppp_procurement_source_policy
  for select
  to authenticated
  using (true);
grant select on public.pppp_procurement_source_policy to authenticated;

insert into public.pppp_procurement_source_policy(source, participation_mode, home_eligible, home_min_score, notes)
values
  ('TED','award_intelligence',false,100,'Award intelligence only: follow winners and commercial routes; never surface as a direct-bid Home tender.'),
  ('KRPP','bid',true,65,'Direct tender participation source.'),
  ('APP','bid',true,65,'Direct tender participation source.'),
  ('APP_AL','bid',true,65,'Direct tender participation source.'),
  ('MCA_KOSOVO','bid',true,60,'Direct/JV/partner tender participation source.'),
  ('KCF','bid',true,60,'Direct/JV/partner tender participation source.'),
  ('RCF','bid',true,60,'Direct/JV/partner tender participation source.'),
  ('EBRD_ECEPP','bid',true,60,'Direct/JV/partner tender participation source.'),
  ('WORLD_BANK','bid',true,60,'Direct/JV/partner/representation tender participation source.'),
  ('UNGM','bid',true,60,'Direct/JV/partner/representation tender participation source.'),
  ('UNDP_KOSOVO','bid',true,60,'Direct/JV/partner/representation tender participation source.'),
  ('EU_OFFICE_KOSOVO','bid',true,60,'Direct/JV/partner/representation tender participation source.')
on conflict (source) do update set
  participation_mode=excluded.participation_mode,
  home_eligible=excluded.home_eligible,
  home_min_score=excluded.home_min_score,
  notes=excluded.notes,
  updated_at=now();

create table if not exists public.pppp_procurement_program_watches (
  id uuid primary key default gen_random_uuid(),
  source text not null references public.pppp_procurement_source_policy(source),
  program_code text not null,
  parent_source_key text,
  title text not null,
  status text not null default 'active' check (status in ('active','paused','completed')),
  strategic_relevance integer not null default 80 check (strategic_relevance between 0 and 100),
  home_notify_new_opportunity boolean not null default true,
  partner_research_policy text not null default 'dynamic' check (partner_research_policy in ('dynamic','fixed','none')),
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source, program_code)
);

alter table public.pppp_procurement_program_watches enable row level security;
drop policy if exists pppp_procurement_program_watches_read on public.pppp_procurement_program_watches;
create policy pppp_procurement_program_watches_read
  on public.pppp_procurement_program_watches
  for select
  to authenticated
  using (true);
grant select on public.pppp_procurement_program_watches to authenticated;

create table if not exists public.pppp_procurement_package_watches (
  id uuid primary key default gen_random_uuid(),
  program_watch_id uuid not null references public.pppp_procurement_program_watches(id) on delete cascade,
  package_key text not null,
  title text not null,
  estimated_value numeric,
  currency text,
  match_terms text[] not null default '{}'::text[],
  exclude_terms text[] not null default '{}'::text[],
  status text not null default 'watching' check (status in ('watching','published','closed','paused')),
  partner_research_required boolean not null default true,
  notes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(program_watch_id, package_key)
);

alter table public.pppp_procurement_package_watches enable row level security;
drop policy if exists pppp_procurement_package_watches_read on public.pppp_procurement_package_watches;
create policy pppp_procurement_package_watches_read
  on public.pppp_procurement_package_watches
  for select
  to authenticated
  using (true);
grant select on public.pppp_procurement_package_watches to authenticated;

with upsert_program as (
  insert into public.pppp_procurement_program_watches(
    source, program_code, parent_source_key, title, status,
    strategic_relevance, home_notify_new_opportunity, partner_research_policy, notes
  )
  values (
    'WORLD_BANK',
    'P507659',
    'WORLD_BANK:OP00462292',
    'Western Balkans Trade and Transport Facilitation 2.0 – Kosovo',
    'active',
    95,
    true,
    'dynamic',
    jsonb_build_object(
      'program_type','GPN / early procurement pipeline',
      'gpn_reference','OP00462292',
      'monitoring_rule','Track future SPNs and package-specific notices; do not expect a tender dossier at GPN stage.',
      'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor'),
      'partner_rule','Research the best companies for each tender when it is published; SSP/FIVA are examples, not fixed partners.'
    )
  )
  on conflict (source, program_code) do update set
    parent_source_key=excluded.parent_source_key,
    title=excluded.title,
    status='active',
    strategic_relevance=excluded.strategic_relevance,
    home_notify_new_opportunity=true,
    partner_research_policy='dynamic',
    notes=excluded.notes,
    updated_at=now()
  returning id
), program_row as (
  select id from upsert_program
  union all
  select id from public.pppp_procurement_program_watches where source='WORLD_BANK' and program_code='P507659'
  limit 1
)
insert into public.pppp_procurement_package_watches(
  program_watch_id, package_key, title, estimated_value, currency,
  match_terms, exclude_terms, status, partner_research_required, notes
)
select p.id, v.package_key, v.title, v.estimated_value, 'USD', v.match_terms, v.exclude_terms, 'watching', true, v.notes
from program_row p
cross join (values
  ('vermice_terminal','Vërmicë multifunctional customs terminal building',2500000::numeric,
    array['vermice','vermica','vërmicë','customs terminal','multifunctional terminal']::text[],
    array['individual consultant','project coordinator','procurement specialist']::text[],
    jsonb_build_object('route','PriSteel + civil/GC partner or broader consortium')),
  ('railway_crossings','Railway crossing safety improvements',5300000::numeric,
    array['railway crossing','railway crossings','level crossing','level crossings']::text[],
    array['individual consultant','project coordinator','procurement specialist']::text[],
    jsonb_build_object('route','Railway/signalling specialist + civil/steel/JV route')),
  ('road_safety_fushe_kosove_gjurgjice','Fushë Kosovë–Gjurgjicë road safety improvements',2700000::numeric,
    array['fushe kosove','fushë kosovë','gjurgjice','gjurgjicë','road safety']::text[],
    array['individual consultant','project coordinator','procurement specialist']::text[],
    jsonb_build_object('route','Road/civil/traffic-safety consortium route')),
  ('etolling_5g','E-tolling and 5G corridors',11000000::numeric,
    array['e-toll','e toll','etoll','tolling','5g corridor','5g corridors','5g']::text[],
    array['individual consultant','project coordinator','procurement specialist']::text[],
    jsonb_build_object('route','Dynamic technology/integrator/JV/representation route; research partners per SPN')),
  ('border_scanners','Border scanners and associated infrastructure',5250000::numeric,
    array['border scanner','border scanners','scanner','scanners']::text[],
    array['individual consultant','project coordinator','procurement specialist']::text[],
    jsonb_build_object('route','Scanner OEM/integrator + local civil/infrastructure partner route'))
) as v(package_key,title,estimated_value,match_terms,exclude_terms,notes)
on conflict (program_watch_id, package_key) do update set
  title=excluded.title,
  estimated_value=excluded.estimated_value,
  currency=excluded.currency,
  match_terms=excluded.match_terms,
  exclude_terms=excluded.exclude_terms,
  status='watching',
  partner_research_required=true,
  notes=excluded.notes,
  updated_at=now();

update public.kek_tender_watch
set
  relevance_score=greatest(coalesce(relevance_score,0),95),
  match_reasons=coalesce(match_reasons,'{}'::text[]) || array['Strategic GPN / program pipeline: monitor future SPNs and package notices']::text[],
  payload=coalesce(payload,'{}'::jsonb) || jsonb_build_object(
    'program_reference','P507659',
    'workflow_mode','program_monitoring',
    'dossier_expected',false,
    'strategic_relevance','high',
    'partner_research_policy','dynamic',
    'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor'),
    'recommended_lane','pipeline_watch',
    'home_eligible',false
  ),
  updated_at=now()
where source_key='WORLD_BANK:OP00462292';

create or replace view public.pppp_procurement_program_matches_v1
with (security_invoker=true)
as
with tender_base as (
  select
    t.*,
    upper(coalesce(nullif(t.payload->>'source',''), split_part(t.source_key,':',1))) as source_name,
    lower(concat_ws(' ',
      t.title, t.document_type, t.fpp, t.fpp_description, t.contract_type, t.procedure,
      t.procurement_no, t.publication_no, t.authority, t.payload::text
    )) as search_text,
    coalesce(nullif(t.payload->>'notice_phase',''),'opportunity') as notice_phase,
    nullif(t.payload->>'program_reference','') as program_reference
  from public.kek_tender_watch t
), candidates as (
  select
    p.id as program_watch_id,
    p.program_code,
    p.title as program_title,
    p.strategic_relevance,
    p.partner_research_policy,
    p.home_notify_new_opportunity,
    pkg.id as package_watch_id,
    pkg.package_key,
    pkg.title as package_title,
    pkg.partner_research_required,
    t.id as tender_watch_id,
    t.source_name as source,
    t.source_key,
    t.title,
    t.authority,
    t.document_type,
    t.contract_type,
    t.procedure,
    t.relevance_score,
    t.published_date,
    t.deadline,
    t.first_seen_at,
    t.status,
    t.detail_url,
    t.source_url,
    t.payload,
    t.search_text,
    t.program_reference,
    (
      upper(coalesce(t.program_reference,''))=upper(p.program_code)
      or t.search_text like '%'||lower(p.program_code)||'%'
    ) as program_code_match,
    exists (
      select 1 from unnest(pkg.match_terms) term
      where term<>'' and t.search_text like '%'||lower(term)||'%'
    ) as package_term_match,
    not exists (
      select 1 from unnest(pkg.exclude_terms) term
      where term<>'' and t.search_text like '%'||lower(term)||'%'
    ) as exclusion_clear
  from tender_base t
  join public.pppp_procurement_program_watches p
    on p.status='active' and p.source=t.source_name
  join public.pppp_procurement_package_watches pkg
    on pkg.program_watch_id=p.id and pkg.status='watching'
  where t.notice_phase='opportunity'
)
select
  program_watch_id, program_code, program_title, strategic_relevance,
  partner_research_policy, home_notify_new_opportunity,
  package_watch_id, package_key, package_title, partner_research_required,
  tender_watch_id, source, source_key, title, authority, document_type,
  contract_type, procedure, relevance_score, published_date, deadline,
  first_seen_at, status, detail_url, source_url, payload,
  case
    when program_code_match and package_term_match then 'program_code+package_terms'
    when package_term_match then 'package_terms'
    else 'program_code'
  end as match_basis
from candidates
where exclusion_clear
  and (package_term_match or program_code_match)
  and (
    package_term_match
    or lower(coalesce(contract_type,'')) similar to '%(works|goods|supply)%'
    or lower(coalesce(document_type,'')) similar to '%(bid|tender|quotation|contract notice|specific procurement notice)%'
  );

grant select on public.pppp_procurement_program_matches_v1 to authenticated;

create or replace view public.pppp_home_procurement_alerts_v1
with (security_invoker=true)
as
with tender_base as (
  select
    t.*,
    upper(coalesce(nullif(t.payload->>'source',''), split_part(t.source_key,':',1))) as source_name,
    coalesce(nullif(t.payload->>'notice_phase',''),'opportunity') as notice_phase
  from public.kek_tender_watch t
), matched as (
  select m.*
  from public.pppp_procurement_program_matches_v1 m
  join public.pppp_procurement_source_policy sp on sp.source=m.source
  where sp.participation_mode='bid'
    and sp.home_eligible=true
    and m.source<>'TED'
    and m.home_notify_new_opportunity=true
    and coalesce(m.status,'new') not in ('closed','done','ignored','dismissed','superseded','won','lost')
    and (m.deadline is null or m.deadline>=current_date)
    and coalesce(m.published_date,m.first_seen_at::date)>=current_date-120
), general_alerts as (
  select
    t.id as tender_watch_id,
    t.source_name as source,
    t.source_key,
    t.title,
    t.authority,
    t.document_type,
    t.contract_type,
    t.procedure,
    t.relevance_score,
    t.published_date,
    t.deadline,
    t.first_seen_at,
    t.status,
    t.detail_url,
    t.source_url,
    t.payload,
    sp.home_min_score
  from tender_base t
  join public.pppp_procurement_source_policy sp on sp.source=t.source_name
  where sp.participation_mode='bid'
    and sp.home_eligible=true
    and t.source_name<>'TED'
    and t.notice_phase='opportunity'
    and coalesce(t.relevance_score,0)>=sp.home_min_score
    and coalesce(t.status,'new') not in ('closed','done','ignored','dismissed','superseded','won','lost')
    and (t.deadline is null or t.deadline>=current_date)
    and coalesce(t.published_date,t.first_seen_at::date)>=current_date-21
    and lower(coalesce(t.document_type,'')) !~ '(correction|corrigendum|amendment|erratum|korrig)'
    and not exists (select 1 from matched m where m.tender_watch_id=t.id)
)
select
  'watch:'||m.tender_watch_id::text as alert_id,
  m.tender_watch_id,
  m.source,
  coalesce(m.payload->>'source_label',m.source) as source_label,
  m.title,
  m.authority,
  m.document_type,
  m.contract_type,
  m.procedure,
  m.published_date,
  m.deadline,
  m.first_seen_at,
  greatest(coalesce(m.relevance_score,0),m.strategic_relevance) as relevance_score,
  'tracked_program'::text as alert_kind,
  'Tender i ri që përputhet me programin '||m.program_code||' / '||m.package_title as alert_reason,
  m.program_watch_id,
  m.program_code,
  m.program_title,
  m.package_watch_id,
  m.package_title,
  m.partner_research_policy,
  m.partner_research_required,
  coalesce(m.payload->'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor')) as entry_routes,
  coalesce(m.detail_url,m.source_url) as open_url
from matched m
union all
select
  'source:'||g.tender_watch_id::text as alert_id,
  g.tender_watch_id,
  g.source,
  coalesce(g.payload->>'source_label',g.source) as source_label,
  g.title,
  g.authority,
  g.document_type,
  g.contract_type,
  g.procedure,
  g.published_date,
  g.deadline,
  g.first_seen_at,
  g.relevance_score,
  'new_bid_opportunity'::text as alert_kind,
  'Tender i ri nga burim ku PriSteel mund të marrë pjesë; vlerëso hyrjen direkte, JV/konsorciumin, partnerin lokal ose përfaqësimin.'::text as alert_reason,
  null::uuid as program_watch_id,
  null::text as program_code,
  null::text as program_title,
  null::uuid as package_watch_id,
  null::text as package_title,
  'dynamic'::text as partner_research_policy,
  true as partner_research_required,
  coalesce(g.payload->'entry_routes',jsonb_build_array('direct_bid','consortium_jv','local_partner','representation','subcontractor')) as entry_routes,
  coalesce(g.detail_url,g.source_url) as open_url
from general_alerts g;

grant select on public.pppp_home_procurement_alerts_v1 to authenticated;

commit;