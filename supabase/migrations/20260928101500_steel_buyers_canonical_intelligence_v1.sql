-- Steel Buyers canonical company identity, company intelligence and daily discovery v1.
-- Discovery may create reviewable company/target rows, never outbound rows or Gmail drafts.

create table if not exists public.pppp_company_identity_v1 (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  normalized_name text not null,
  official_domain text,
  country_code text,
  legal_registration_id text,
  vat_id text,
  website text,
  size_band text not null default 'unknown' check (size_band in ('micro','small','medium','large','enterprise','unknown')),
  employees_min integer,
  employees_max integer,
  revenue_band text,
  locations_count integer,
  primary_activity text,
  business_summary text,
  production_capacity_summary text,
  consumption_potential text not null default 'unknown' check (consumption_potential in ('low','medium','high','unknown')),
  annual_steel_tonnes_min numeric,
  annual_steel_tonnes_max numeric,
  procurement_model text,
  products text[] not null default '{}',
  certifications text[] not null default '{}',
  evidence jsonb not null default '[]'::jsonb,
  confidence numeric not null default 0 check (confidence between 0 and 1),
  source_first_seen text,
  last_verified_at timestamptz,
  last_enriched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (employees_min is null or employees_min >= 0),
  check (employees_max is null or employees_max >= coalesce(employees_min,0)),
  check (annual_steel_tonnes_min is null or annual_steel_tonnes_min >= 0),
  check (annual_steel_tonnes_max is null or annual_steel_tonnes_max >= coalesce(annual_steel_tonnes_min,0))
);
create unique index if not exists pppp_company_identity_domain_uq on public.pppp_company_identity_v1(official_domain)
  where official_domain is not null and official_domain<>'';
create unique index if not exists pppp_company_identity_legal_country_uq
  on public.pppp_company_identity_v1(normalized_name,coalesce(country_code,''))
  where official_domain is null or official_domain='';
create unique index if not exists pppp_company_identity_registration_uq
  on public.pppp_company_identity_v1(lower(legal_registration_id))
  where legal_registration_id is not null and legal_registration_id<>'';
alter table public.pppp_company_identity_v1 enable row level security;
revoke all on public.pppp_company_identity_v1 from anon;
grant select on public.pppp_company_identity_v1 to authenticated;
grant all on public.pppp_company_identity_v1 to service_role;
drop policy if exists pppp_company_identity_authenticated_read on public.pppp_company_identity_v1;
create policy pppp_company_identity_authenticated_read on public.pppp_company_identity_v1
  for select to authenticated using (true);

create table if not exists public.pppp_company_module_roles_v1 (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.pppp_company_identity_v1(id) on delete cascade,
  module text not null check (module in ('steel_buyers','eu_direct','opportunities','representations','projects','contact_master')),
  role text not null,
  source_record_id text not null,
  active boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(module,source_record_id)
);
create index if not exists pppp_company_module_roles_company_idx on public.pppp_company_module_roles_v1(company_id,active);
alter table public.pppp_company_module_roles_v1 enable row level security;
revoke all on public.pppp_company_module_roles_v1 from anon;
grant select on public.pppp_company_module_roles_v1 to authenticated;
grant all on public.pppp_company_module_roles_v1 to service_role;
drop policy if exists pppp_company_module_roles_authenticated_read on public.pppp_company_module_roles_v1;
create policy pppp_company_module_roles_authenticated_read on public.pppp_company_module_roles_v1
  for select to authenticated using (true);

create table if not exists public.pppp_steel_buyer_discovery_runs_v1 (
  id uuid primary key default gen_random_uuid(),
  run_date date not null unique,
  status text not null check (status in ('running','succeeded','failed','skipped')),
  source text not null default 'wikidata_public_sparql',
  discovered_count integer not null default 0,
  inserted_count integer not null default 0,
  duplicate_count integer not null default 0,
  routing_review_count integer not null default 0,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
alter table public.pppp_steel_buyer_discovery_runs_v1 enable row level security;
revoke all on public.pppp_steel_buyer_discovery_runs_v1 from anon;
grant select on public.pppp_steel_buyer_discovery_runs_v1 to authenticated;
grant all on public.pppp_steel_buyer_discovery_runs_v1 to service_role;
drop policy if exists pppp_steel_buyer_discovery_runs_authenticated_read on public.pppp_steel_buyer_discovery_runs_v1;
create policy pppp_steel_buyer_discovery_runs_authenticated_read on public.pppp_steel_buyer_discovery_runs_v1
  for select to authenticated using (true);

create table if not exists public.pppp_steel_buyer_discovery_candidates_v1 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.pppp_steel_buyer_discovery_runs_v1(id) on delete set null,
  external_key text not null unique,
  company_name text not null,
  normalized_name text not null,
  official_domain text,
  website text,
  country_code text,
  industry text,
  employees integer,
  revenue_text text,
  size_band text not null default 'unknown' check (size_band in ('micro','small','medium','large','enterprise','unknown')),
  consumption_potential text not null default 'unknown' check (consumption_potential in ('low','medium','high','unknown')),
  business_summary text,
  evidence jsonb not null default '[]'::jsonb,
  source_url text,
  status text not null default 'new' check (status in ('new','accepted','duplicate','routing_review','rejected','error')),
  canonical_company_id uuid references public.pppp_company_identity_v1(id),
  target_id uuid references public.pppp_dach_steel_targets_v1(id),
  routing_conflicts text[] not null default '{}',
  reason text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists pppp_steel_buyer_candidates_domain_idx on public.pppp_steel_buyer_discovery_candidates_v1(official_domain);
create index if not exists pppp_steel_buyer_candidates_run_idx on public.pppp_steel_buyer_discovery_candidates_v1(run_id);
create index if not exists pppp_steel_buyer_candidates_company_idx on public.pppp_steel_buyer_discovery_candidates_v1(canonical_company_id);
create index if not exists pppp_steel_buyer_candidates_target_idx on public.pppp_steel_buyer_discovery_candidates_v1(target_id);
alter table public.pppp_steel_buyer_discovery_candidates_v1 enable row level security;
revoke all on public.pppp_steel_buyer_discovery_candidates_v1 from anon;
grant select on public.pppp_steel_buyer_discovery_candidates_v1 to authenticated;
grant all on public.pppp_steel_buyer_discovery_candidates_v1 to service_role;
drop policy if exists pppp_steel_buyer_candidates_authenticated_read on public.pppp_steel_buyer_discovery_candidates_v1;
create policy pppp_steel_buyer_candidates_authenticated_read on public.pppp_steel_buyer_discovery_candidates_v1
  for select to authenticated using (true);

alter table public.pppp_dach_steel_targets_v1
  add column if not exists canonical_company_id uuid references public.pppp_company_identity_v1(id),
  add column if not exists company_profile jsonb not null default '{}'::jsonb,
  add column if not exists verified_company_facts jsonb not null default '[]'::jsonb,
  add column if not exists missing_company_facts jsonb not null default '[]'::jsonb,
  add column if not exists company_analysis_status text not null default 'pending'
    check (company_analysis_status in ('pending','partial','verified','review_required')),
  add column if not exists company_size_band text not null default 'unknown'
    check (company_size_band in ('micro','small','medium','large','enterprise','unknown')),
  add column if not exists primary_activity text,
  add column if not exists consumption_potential text not null default 'unknown'
    check (consumption_potential in ('low','medium','high','unknown')),
  add column if not exists annual_steel_tonnes_min numeric,
  add column if not exists annual_steel_tonnes_max numeric,
  add column if not exists procurement_model text,
  add column if not exists production_capacity_summary text,
  add column if not exists last_company_analysis_at timestamptz,
  add column if not exists discovery_candidate_id uuid references public.pppp_steel_buyer_discovery_candidates_v1(id);
create index if not exists pppp_dach_steel_targets_canonical_company_idx on public.pppp_dach_steel_targets_v1(canonical_company_id);
create index if not exists pppp_dach_steel_targets_discovery_candidate_idx on public.pppp_dach_steel_targets_v1(discovery_candidate_id);

create or replace function public.pppp_normalize_company_name_v1(p_value text)
returns text language sql immutable security invoker set search_path=''
as $$
  select trim(regexp_replace(lower(translate(coalesce(p_value,''),'äöüß','aous')),
    '\m(gmbh|ag|kg|mbh|sarl|srl|spa|bv|nv|llc|ltd|limited|inc|corp|sa|doo|d\.o\.o|shpk|sh\.p\.k)\M|[^a-z0-9]+',' ','g'));
$$;
revoke all on function public.pppp_normalize_company_name_v1(text) from public,anon;
grant execute on function public.pppp_normalize_company_name_v1(text) to authenticated,service_role;

create or replace function public.pppp_company_identity_resolve_v1(
  p_legal_name text,p_domain text default null,p_country_code text default null,
  p_legal_registration_id text default null,p_source text default null
) returns uuid
language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare
  v_id uuid;
  v_name text:=public.pppp_normalize_company_name_v1(p_legal_name);
  v_domain text:=public.pppp_normalize_company_domain_v1(p_domain);
  v_country text:=upper(nullif(btrim(p_country_code),''));
  v_reg text:=lower(nullif(btrim(p_legal_registration_id),''));
begin
  if nullif(v_name,'') is null then raise exception using errcode='22023',message='company_legal_name_required'; end if;
  if v_reg is not null then select id into v_id from public.pppp_company_identity_v1 where lower(legal_registration_id)=v_reg limit 1; end if;
  if v_id is null and nullif(v_domain,'') is not null then select id into v_id from public.pppp_company_identity_v1 where official_domain=v_domain limit 1; end if;
  if v_id is null then
    select id into v_id from public.pppp_company_identity_v1
    where normalized_name=v_name and coalesce(country_code,'')=coalesce(v_country,'')
    order by official_domain nulls last limit 1;
  end if;
  if v_id is null then
    insert into public.pppp_company_identity_v1(
      legal_name,normalized_name,official_domain,country_code,legal_registration_id,website,source_first_seen,last_verified_at
    ) values (
      btrim(p_legal_name),v_name,nullif(v_domain,''),v_country,v_reg,
      case when nullif(v_domain,'') is null then null else 'https://'||v_domain end,
      nullif(btrim(p_source),''),now()
    ) returning id into v_id;
  else
    update public.pppp_company_identity_v1 set
      legal_name=case when length(btrim(p_legal_name))>length(legal_name) then btrim(p_legal_name) else legal_name end,
      official_domain=coalesce(official_domain,nullif(v_domain,'')),country_code=coalesce(country_code,v_country),
      legal_registration_id=coalesce(legal_registration_id,v_reg),updated_at=now()
    where id=v_id;
  end if;
  return v_id;
end;
$$;
revoke all on function public.pppp_company_identity_resolve_v1(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.pppp_company_identity_resolve_v1(text,text,text,text,text) to service_role,postgres;

do $$
declare r record; cid uuid;
begin
  for r in
    select company_name name,coalesce(company_domain,company_website) domain,country,'steel_buyers' module,id::text source_id,'material_buyer' role
    from public.pppp_dach_steel_targets_v1
    union all
    select company_name,coalesce(company_domain,company_website),country,'eu_direct',id::text,'direct_eu_client'
    from public.pppp_eu_direct_targets_v1 where archived_at is null
    union all
    select legal_name,domain,country,'opportunities',id::text,'opportunity_company'
    from public.pppp_opportunity_company_profiles_v1
    union all
    select company_name,coalesce(company_domain,company_website),country,'representations',id::text,'representation_target'
    from public.pppp_representation_targets_v1 where archived_at is null
  loop
    if nullif(btrim(r.name),'') is null then continue; end if;
    cid:=public.pppp_company_identity_resolve_v1(r.name,r.domain,r.country,null,r.module);
    insert into public.pppp_company_module_roles_v1(company_id,module,role,source_record_id)
    values(cid,r.module,r.role,r.source_id)
    on conflict(module,source_record_id) do update set company_id=excluded.company_id,role=excluded.role,active=true,updated_at=now();
    if r.module='steel_buyers' then update public.pppp_dach_steel_targets_v1 set canonical_company_id=cid where id::text=r.source_id; end if;
  end loop;
end$$;

create unique index if not exists pppp_dach_steel_targets_active_domain_uq
  on public.pppp_dach_steel_targets_v1(public.pppp_normalize_company_domain_v1(coalesce(company_domain,company_website)))
  where target_status not in ('closed','rejected','project_promoted') and project_id is null
    and (source_key like 'eu:%' or source_key like 'mt:%');

create or replace function public.pppp_steel_buyer_identity_guard_v1()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare
  v_domain text:=public.pppp_normalize_company_domain_v1(coalesce(new.company_domain,new.company_website));
  v_company uuid; v_conflicts text[]:='{}'::text[];
begin
  if nullif(v_domain,'') is null then raise exception using errcode='22023',message='steel_buyer_official_domain_required'; end if;
  new.company_domain:=v_domain;
  new.company_website:=coalesce(nullif(new.company_website,''),'https://'||v_domain);
  if tg_op='INSERT' then
    if exists(select 1 from public.pppp_eu_direct_targets_v1 e where e.archived_at is null and e.company_domain_normalized=v_domain) then v_conflicts:=array_append(v_conflicts,'eu_direct'); end if;
    if exists(select 1 from public.pppp_representation_targets_v1 r where r.archived_at is null and r.company_domain_normalized=v_domain) then v_conflicts:=array_append(v_conflicts,'representations'); end if;
    if exists(select 1 from public.pppp_opportunity_company_profiles_v1 o where public.pppp_normalize_company_domain_v1(o.domain)=v_domain) then v_conflicts:=array_append(v_conflicts,'opportunities'); end if;
    if cardinality(v_conflicts)>0 then raise exception using errcode='23505',message='cross_module_identity_review_required:'||array_to_string(v_conflicts,','); end if;
  end if;
  v_company:=public.pppp_company_identity_resolve_v1(new.company_name,v_domain,new.country,null,'steel_buyers');
  new.canonical_company_id:=v_company;
  return new;
end;
$$;
revoke all on function public.pppp_steel_buyer_identity_guard_v1() from public,anon,authenticated;
drop trigger if exists pppp_steel_buyer_identity_guard_trg on public.pppp_dach_steel_targets_v1;
create trigger pppp_steel_buyer_identity_guard_trg before insert or update of company_name,company_domain,company_website,country
on public.pppp_dach_steel_targets_v1 for each row execute function public.pppp_steel_buyer_identity_guard_v1();

create or replace function public.pppp_steel_buyer_company_analysis_v1(p_target_id uuid)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare
  t public.pppp_dach_steel_targets_v1%rowtype; c public.pppp_company_identity_v1%rowtype;
  profile jsonb; facts jsonb:='[]'::jsonb; missing jsonb:='[]'::jsonb;
  activity text; size_value text; potential text; tonnes_min numeric; tonnes_max numeric; analysis_value text;
begin
  select * into t from public.pppp_dach_steel_targets_v1 where id=p_target_id;
  if not found then raise exception using errcode='P0002',message='steel_buyer_target_not_found'; end if;
  if t.canonical_company_id is not null then select * into c from public.pppp_company_identity_v1 where id=t.canonical_company_id; end if;
  profile:=coalesce(t.company_profile,'{}'::jsonb);
  activity:=coalesce(nullif(profile->>'primary_activity',''),nullif(t.primary_activity,''),nullif(t.buyer_type,''));
  size_value:=coalesce(nullif(profile->>'size_band',''),nullif(t.company_size_band,''),nullif(c.size_band,''),'unknown');
  if size_value not in ('micro','small','medium','large','enterprise','unknown') then size_value:='unknown'; end if;
  tonnes_min:=coalesce((nullif(profile->>'annual_steel_tonnes_min',''))::numeric,t.annual_steel_tonnes_min,c.annual_steel_tonnes_min);
  tonnes_max:=coalesce((nullif(profile->>'annual_steel_tonnes_max',''))::numeric,t.annual_steel_tonnes_max,c.annual_steel_tonnes_max);
  potential:=coalesce(nullif(profile->>'consumption_potential',''),nullif(t.consumption_potential,''),nullif(c.consumption_potential,''),'unknown');
  if potential='unknown' then
    potential:=case
      when tonnes_max>=1000 or lower(coalesce(activity,''))~'(ship|rail|trailer|heavy|machin|vehicle|industrial fabrication|steel service)' then 'high'
      when tonnes_max>=250 or lower(coalesce(activity,''))~'(stahlbau|metallbau|fabricat|manufacturer|producer|construction)' then 'medium'
      when nullif(activity,'') is not null then 'low' else 'unknown' end;
  end if;
  if nullif(activity,'') is not null then facts:=facts||jsonb_build_array('Aktiviteti kryesor: '||activity); else missing:=missing||'["primary_activity"]'::jsonb; end if;
  if size_value<>'unknown' then facts:=facts||jsonb_build_array('Madhësia e kompanisë: '||size_value); else missing:=missing||'["company_size"]'::jsonb; end if;
  if potential<>'unknown' then facts:=facts||jsonb_build_array('Potenciali i konsumit të çelikut: '||potential); else missing:=missing||'["steel_consumption_potential"]'::jsonb; end if;
  if tonnes_max is not null then facts:=facts||jsonb_build_array('Konsumi vjetor i vlerësuar: '||coalesce(tonnes_min::text,'0')||'–'||tonnes_max::text||' t'); else missing:=missing||'["annual_steel_tonnage"]'::jsonb; end if;
  if nullif(coalesce(t.procurement_model,c.procurement_model),'') is null then missing:=missing||'["procurement_model"]'::jsonb; end if;
  if nullif(coalesce(t.production_capacity_summary,c.production_capacity_summary),'') is null then missing:=missing||'["production_capacity"]'::jsonb; end if;
  if coalesce(jsonb_array_length(t.personalization_facts),0)>0 then facts:=facts||t.personalization_facts; end if;
  analysis_value:=case when jsonb_array_length(missing)=0 then 'verified' when jsonb_array_length(facts)>=2 then 'partial' else 'review_required' end;
  update public.pppp_dach_steel_targets_v1 set primary_activity=activity,company_size_band=size_value,
    consumption_potential=potential,annual_steel_tonnes_min=tonnes_min,annual_steel_tonnes_max=tonnes_max,
    verified_company_facts=facts,missing_company_facts=missing,company_analysis_status=analysis_value,last_company_analysis_at=now()
  where id=t.id;
  if t.canonical_company_id is not null then
    update public.pppp_company_identity_v1 set
      size_band=case when size_value='unknown' then public.pppp_company_identity_v1.size_band else size_value end,
      primary_activity=coalesce(activity,public.pppp_company_identity_v1.primary_activity),
      consumption_potential=case when potential='unknown' then public.pppp_company_identity_v1.consumption_potential else potential end,
      annual_steel_tonnes_min=coalesce(tonnes_min,public.pppp_company_identity_v1.annual_steel_tonnes_min),
      annual_steel_tonnes_max=coalesce(tonnes_max,public.pppp_company_identity_v1.annual_steel_tonnes_max),
      last_enriched_at=now(),updated_at=now() where id=t.canonical_company_id;
  end if;
  return jsonb_build_object('target_id',t.id,'company_id',t.canonical_company_id,'status',analysis_value,
    'size_band',size_value,'primary_activity',activity,'consumption_potential',potential,
    'annual_steel_tonnes_min',tonnes_min,'annual_steel_tonnes_max',tonnes_max,
    'verified_facts',facts,'missing_facts',missing);
end;
$$;
revoke all on function public.pppp_steel_buyer_company_analysis_v1(uuid) from public,anon,authenticated;
grant execute on function public.pppp_steel_buyer_company_analysis_v1(uuid) to service_role,postgres;

create or replace function public.pppp_steel_buyer_company_analysis_trg_v1()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
begin
  if pg_trigger_depth()>1 then return new; end if;
  perform public.pppp_steel_buyer_company_analysis_v1(new.id);
  return new;
end;
$$;
revoke all on function public.pppp_steel_buyer_company_analysis_trg_v1() from public,anon,authenticated;
drop trigger if exists pppp_steel_buyer_company_analysis_trg on public.pppp_dach_steel_targets_v1;
create trigger pppp_steel_buyer_company_analysis_trg
after insert or update of company_profile,buyer_type,steel_scope,products,estimated_tonnes,procurement_timing,
  personalization_facts,evidence,company_size_band,primary_activity,consumption_potential,
  annual_steel_tonnes_min,annual_steel_tonnes_max,procurement_model,production_capacity_summary
on public.pppp_dach_steel_targets_v1 for each row execute function public.pppp_steel_buyer_company_analysis_trg_v1();

create or replace function public.pppp_register_steel_buyer_discovery_candidate_v1(p_run_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare
  v_domain text:=public.pppp_normalize_company_domain_v1(p_payload->>'website');
  v_name text:=nullif(btrim(p_payload->>'company_name'),'');
  v_country text:=upper(nullif(btrim(p_payload->>'country_code'),''));
  v_external text:=coalesce(nullif(p_payload->>'external_key',''),coalesce(v_domain,public.pppp_normalize_company_name_v1(v_name)));
  v_conflicts text[]:='{}'::text[]; v_company uuid; v_candidate uuid; v_target uuid;
  v_size text:=coalesce(nullif(p_payload->>'size_band',''),'unknown');
  v_potential text:=coalesce(nullif(p_payload->>'consumption_potential',''),'unknown');
begin
  if p_run_id is null or v_name is null or nullif(v_external,'') is null then raise exception using errcode='22023',message='invalid_discovery_candidate'; end if;
  if nullif(v_domain,'') is null then
    insert into public.pppp_steel_buyer_discovery_candidates_v1(
      run_id,external_key,company_name,normalized_name,country_code,industry,employees,revenue_text,size_band,
      consumption_potential,business_summary,evidence,source_url,status,reason
    ) values(
      p_run_id,v_external,v_name,public.pppp_normalize_company_name_v1(v_name),v_country,p_payload->>'industry',
      nullif(p_payload->>'employees','')::integer,p_payload->>'revenue_text',v_size,v_potential,p_payload->>'business_summary',
      coalesce(p_payload->'evidence','[]'::jsonb),p_payload->>'source_url','rejected','official_domain_missing'
    ) on conflict(external_key) do update set last_seen_at=now(),run_id=excluded.run_id returning id into v_candidate;
    return jsonb_build_object('status','rejected','reason','official_domain_missing','candidate_id',v_candidate);
  end if;
  if exists(select 1 from public.pppp_dach_steel_targets_v1 t where t.target_status not in('closed','rejected') and public.pppp_normalize_company_domain_v1(coalesce(t.company_domain,t.company_website))=v_domain) then v_conflicts:=array_append(v_conflicts,'steel_buyers'); end if;
  if exists(select 1 from public.pppp_eu_direct_targets_v1 e where e.archived_at is null and e.company_domain_normalized=v_domain) then v_conflicts:=array_append(v_conflicts,'eu_direct'); end if;
  if exists(select 1 from public.pppp_representation_targets_v1 r where r.archived_at is null and r.company_domain_normalized=v_domain) then v_conflicts:=array_append(v_conflicts,'representations'); end if;
  if exists(select 1 from public.pppp_opportunity_company_profiles_v1 o where public.pppp_normalize_company_domain_v1(o.domain)=v_domain) then v_conflicts:=array_append(v_conflicts,'opportunities'); end if;
  v_company:=public.pppp_company_identity_resolve_v1(v_name,v_domain,v_country,null,'steel_buyer_daily_discovery');
  insert into public.pppp_steel_buyer_discovery_candidates_v1(
    run_id,external_key,company_name,normalized_name,official_domain,website,country_code,industry,employees,revenue_text,
    size_band,consumption_potential,business_summary,evidence,source_url,status,canonical_company_id,routing_conflicts,reason
  ) values(
    p_run_id,v_external,v_name,public.pppp_normalize_company_name_v1(v_name),v_domain,p_payload->>'website',v_country,
    p_payload->>'industry',nullif(p_payload->>'employees','')::integer,p_payload->>'revenue_text',v_size,v_potential,
    p_payload->>'business_summary',coalesce(p_payload->'evidence','[]'::jsonb),p_payload->>'source_url',
    case when cardinality(v_conflicts)>0 then case when v_conflicts=array['steel_buyers'] then 'duplicate' else 'routing_review' end else 'new' end,
    v_company,v_conflicts,case when cardinality(v_conflicts)>0 then 'known_company_or_module_route' else null end
  ) on conflict(external_key) do update set
    run_id=excluded.run_id,last_seen_at=now(),industry=coalesce(excluded.industry,public.pppp_steel_buyer_discovery_candidates_v1.industry),
    employees=coalesce(excluded.employees,public.pppp_steel_buyer_discovery_candidates_v1.employees),
    revenue_text=coalesce(excluded.revenue_text,public.pppp_steel_buyer_discovery_candidates_v1.revenue_text),
    evidence=excluded.evidence,routing_conflicts=excluded.routing_conflicts,
    status=case when public.pppp_steel_buyer_discovery_candidates_v1.status='accepted' then 'accepted' else excluded.status end
  returning id,target_id into v_candidate,v_target;
  return jsonb_build_object('candidate_id',v_candidate,'target_id',v_target,'company_id',v_company,
    'status',(select status from public.pppp_steel_buyer_discovery_candidates_v1 where id=v_candidate),
    'routing_conflicts',v_conflicts,'outbound_created',false,'gmail_draft_created',false,'external_email_sent',false);
end;
$$;
revoke all on function public.pppp_register_steel_buyer_discovery_candidate_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pppp_register_steel_buyer_discovery_candidate_v1(uuid,jsonb) to service_role,postgres;

create or replace function public.pppp_register_steel_buyer_discovery_batch_v1(p_run_id uuid,p_candidates jsonb)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare
  item jsonb; result jsonb; status_value text;
  inserted_count integer:=0; duplicate_count integer:=0; routing_review_count integer:=0;
  staged_count integer:=0; error_count integer:=0; error_samples jsonb:='[]'::jsonb;
begin
  if p_run_id is null or jsonb_typeof(p_candidates)<>'array' then
    raise exception using errcode='22023',message='invalid_discovery_batch';
  end if;
  for item in select value from jsonb_array_elements(p_candidates) loop
    begin
      result:=public.pppp_register_steel_buyer_discovery_candidate_v1(p_run_id,item);
      status_value:=coalesce(result->>'status','new');
      if status_value='accepted' then inserted_count:=inserted_count+1;
      elsif status_value='duplicate' then duplicate_count:=duplicate_count+1;
      elsif status_value='routing_review' then routing_review_count:=routing_review_count+1;
      else staged_count:=staged_count+1;
      end if;
    exception when others then
      error_count:=error_count+1;
      if jsonb_array_length(error_samples)<5 then error_samples:=error_samples||jsonb_build_array(sqlstate||':'||sqlerrm); end if;
    end;
  end loop;
  return jsonb_build_object('inserted_count',inserted_count,'duplicate_count',duplicate_count,
    'routing_review_count',routing_review_count,'staged_count',staged_count,'error_count',error_count,
    'error_samples',error_samples,'outbound_created',false,'gmail_draft_created',false,'external_email_sent',false);
end;
$$;
revoke all on function public.pppp_register_steel_buyer_discovery_batch_v1(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.pppp_register_steel_buyer_discovery_batch_v1(uuid,jsonb) to service_role,postgres;

create or replace function public.pppp_accept_steel_buyer_discovery_candidate_v1(p_candidate_id uuid)
returns jsonb language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare c public.pppp_steel_buyer_discovery_candidates_v1%rowtype; v_target uuid;
begin
  if auth.uid() is null then raise exception using errcode='42501',message='authenticated_user_required'; end if;
  select * into c from public.pppp_steel_buyer_discovery_candidates_v1 where id=p_candidate_id for update;
  if not found then raise exception using errcode='P0002',message='discovery_candidate_not_found'; end if;
  if c.target_id is not null then return jsonb_build_object('ok',true,'reused',true,'target_id',c.target_id); end if;
  if c.status<>'new' or cardinality(c.routing_conflicts)>0 then
    raise exception using errcode='23514',message='candidate_requires_routing_review';
  end if;
  if exists(select 1 from public.pppp_dach_steel_targets_v1 t where t.target_status not in('closed','rejected')
    and public.pppp_normalize_company_domain_v1(coalesce(t.company_domain,t.company_website))=c.official_domain) then
    update public.pppp_steel_buyer_discovery_candidates_v1 set status='duplicate',reason='steel_buyer_created_before_acceptance' where id=c.id;
    raise exception using errcode='23505',message='steel_buyer_already_exists';
  end if;
  insert into public.pppp_dach_steel_targets_v1(
    source_key,source_name,source_url,company_name,company_domain,company_website,country,buyer_type,
    score_band,target_status,why_now,quote_readiness,steel_scope,products,material_confidence,evidence,
    contact_status,outreach_status,next_action,last_verified_at,company_profile,company_size_band,primary_activity,
    consumption_potential,canonical_company_id,discovery_candidate_id
  ) values(
    'mt:'||lower(coalesce(c.country_code,'xx'))||':'||c.official_domain,'Wikidata public company discovery',c.source_url,
    c.company_name,c.official_domain,c.website,c.country_code,c.industry,
    case when c.consumption_potential='high' then 'B1' else 'B2' end,'watch',
    'Public company evidence indicates recurring steel-material consumption; verify procurement fit and contact before outreach.',
    'M1',coalesce(c.industry,'Steel-material demand to verify'),'{}'::text[],0.55,c.evidence,'missing','not_ready',
    'Verify company activity, consumption estimate and procurement contact. No draft is created automatically.',now(),
    jsonb_strip_nulls(jsonb_build_object('primary_activity',c.industry,'size_band',c.size_band,
      'consumption_potential',c.consumption_potential,'employees',c.employees,'revenue',c.revenue_text)),
    c.size_band,c.industry,c.consumption_potential,c.canonical_company_id,c.id
  ) returning id into v_target;
  update public.pppp_steel_buyer_discovery_candidates_v1 set status='accepted',target_id=v_target,last_seen_at=now() where id=c.id;
  insert into public.pppp_company_module_roles_v1(company_id,module,role,source_record_id,evidence)
  values(c.canonical_company_id,'steel_buyers','material_buyer',v_target::text,jsonb_build_object('discovery_candidate_id',c.id))
  on conflict(module,source_record_id) do update set company_id=excluded.company_id,active=true,updated_at=now();
  return jsonb_build_object('ok',true,'reused',false,'target_id',v_target,'outbound_created',false,
    'gmail_draft_created',false,'external_email_sent',false);
end;
$$;
revoke all on function public.pppp_accept_steel_buyer_discovery_candidate_v1(uuid) from public,anon;
grant execute on function public.pppp_accept_steel_buyer_discovery_candidate_v1(uuid) to authenticated;

create or replace view public.pppp_steel_buyer_discovery_summary_v1 with (security_invoker=true) as
select
  (select count(*) from public.pppp_steel_buyer_discovery_candidates_v1 where status='new') new_candidates,
  (select count(*) from public.pppp_steel_buyer_discovery_candidates_v1 where status='routing_review') routing_review,
  (select count(*) from public.pppp_steel_buyer_discovery_candidates_v1 where status='accepted') accepted,
  (select max(finished_at) from public.pppp_steel_buyer_discovery_runs_v1 where status='succeeded') last_success_at,
  (select status from public.pppp_steel_buyer_discovery_runs_v1 order by started_at desc limit 1) last_status,
  coalesce((select jsonb_agg(to_jsonb(c) order by
    case c.consumption_potential when 'high' then 1 when 'medium' then 2 else 3 end,c.company_name)
    from (select id,company_name,official_domain,website,country_code,industry,employees,revenue_text,size_band,
      consumption_potential,business_summary,evidence,source_url,first_seen_at
      from public.pppp_steel_buyer_discovery_candidates_v1 where status='new'
      order by case consumption_potential when 'high' then 1 when 'medium' then 2 else 3 end,company_name limit 40) c),'[]'::jsonb) candidates;
grant select on public.pppp_steel_buyer_discovery_summary_v1 to authenticated,service_role;

create or replace view public.pppp_company_cross_module_v1 with (security_invoker=true) as
select c.id company_id,c.legal_name,c.official_domain,c.country_code,c.size_band,c.primary_activity,c.consumption_potential,
  array_agg(distinct r.module order by r.module) filter(where r.active) modules,
  count(*) filter(where r.active) active_roles
from public.pppp_company_identity_v1 c left join public.pppp_company_module_roles_v1 r on r.company_id=c.id
group by c.id;
grant select on public.pppp_company_cross_module_v1 to authenticated,service_role;

do $$ declare r record; begin
  for r in select id from public.pppp_dach_steel_targets_v1 loop
    perform public.pppp_steel_buyer_company_analysis_v1(r.id);
  end loop;
end$$;

-- Three bridge runs/day replace 48/day. Gmail/outbound synchronization schedules stay unchanged.
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname='pppp-chatgpt-command-bridge'),
  schedule := '15 6,12,18 * * *'
);

select cron.schedule(
  'pppp-steel-buyer-discovery-daily',
  '15 20 * * *',
  $cron$
  select net.http_post(
    url:='https://awqfpnzqwfjrjefoktgd.supabase.co/functions/v1/pppp-steel-buyer-discovery',
    headers:=jsonb_build_object(
      'Content-Type','application/json',
      'x-pppp-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret')
    ),
    body:='{"limit":20}'::jsonb,
    timeout_milliseconds:=45000
  );
  $cron$
);

comment on table public.pppp_company_identity_v1 is
  'Canonical company identity shared by commercial modules. Module roles reuse one company identity and outbound history.';
comment on table public.pppp_steel_buyer_discovery_candidates_v1 is
  'Daily public-source Steel Buyer discoveries. Candidate/target creation never creates outbound rows, Gmail drafts or sends.';
comment on function public.pppp_register_steel_buyer_discovery_candidate_v1(uuid,jsonb) is
  'Canonical cross-module-deduplicated Steel Buyer discovery registration. Creates no outbound communication.';

create or replace function public.pppp_steel_buyer_discovery_enrich_existing_v1()
returns trigger language plpgsql security definer set search_path='pg_catalog','public'
as $$
declare v_target uuid;
begin
  if new.official_domain is null or new.status not in ('duplicate','accepted') then return new; end if;
  select id into v_target from public.pppp_dach_steel_targets_v1
  where target_status not in('closed','rejected','project_promoted')
    and public.pppp_normalize_company_domain_v1(coalesce(company_domain,company_website))=new.official_domain
  order by updated_at desc limit 1;
  if v_target is null then return new; end if;
  update public.pppp_dach_steel_targets_v1 set
    company_profile=coalesce(company_profile,'{}'::jsonb)||jsonb_strip_nulls(jsonb_build_object(
      'primary_activity',new.industry,'size_band',new.size_band,'consumption_potential',new.consumption_potential,
      'employees',new.employees,'revenue',new.revenue_text,'discovery_source','wikidata_public_sparql'
    )),
    company_size_band=case when new.size_band='unknown' then company_size_band else new.size_band end,
    primary_activity=coalesce(new.industry,primary_activity),
    consumption_potential=case when new.consumption_potential='unknown' then consumption_potential else new.consumption_potential end,
    discovery_candidate_id=coalesce(discovery_candidate_id,new.id),
    last_verified_at=greatest(coalesce(last_verified_at,'epoch'::timestamptz),now()),
    updated_at=now()
  where id=v_target;
  update public.pppp_company_identity_v1 set
    size_band=case when new.size_band='unknown' then size_band else new.size_band end,
    employees_min=coalesce(new.employees,employees_min),employees_max=coalesce(new.employees,employees_max),
    revenue_band=coalesce(new.revenue_text,revenue_band),primary_activity=coalesce(new.industry,primary_activity),
    business_summary=coalesce(new.business_summary,business_summary),
    consumption_potential=case when new.consumption_potential='unknown' then consumption_potential else new.consumption_potential end,
    evidence=coalesce(evidence,'[]'::jsonb)||coalesce(new.evidence,'[]'::jsonb),
    confidence=greatest(confidence,0.65),last_enriched_at=now(),last_verified_at=now(),updated_at=now()
  where id=new.canonical_company_id;
  return new;
end;
$$;
revoke all on function public.pppp_steel_buyer_discovery_enrich_existing_v1() from public,anon,authenticated;
drop trigger if exists pppp_steel_buyer_discovery_enrich_existing_trg on public.pppp_steel_buyer_discovery_candidates_v1;
create trigger pppp_steel_buyer_discovery_enrich_existing_trg
after insert or update of status,industry,employees,revenue_text,size_band,consumption_potential,evidence
on public.pppp_steel_buyer_discovery_candidates_v1 for each row
execute function public.pppp_steel_buyer_discovery_enrich_existing_v1();
