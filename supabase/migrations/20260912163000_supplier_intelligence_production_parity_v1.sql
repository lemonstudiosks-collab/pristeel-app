begin;

-- PPPP Supplier Intelligence production parity v1
-- Additive only. This migration does not send email, select/commit a supplier,
-- change selling prices, or modify the existing supplier-offer comparison engine.

create schema if not exists private;

create or replace function private.pppp_supplier_norm_v1(v text)
returns text
language sql
immutable
set search_path to pg_catalog
as $$
  select regexp_replace(lower(coalesce(v,'')),'[^a-z0-9]+','','g');
$$;

create or replace function private.pppp_text_array_union_v1(a text[], b text[])
returns text[]
language sql
immutable
set search_path to pg_catalog
as $$
  select coalesce(array_agg(x order by x) filter(where x<>''),'{}'::text[])
  from (
    select distinct btrim(x) x
    from unnest(coalesce(a,'{}'::text[]) || coalesce(b,'{}'::text[])) u(x)
    where nullif(btrim(x),'') is not null
  ) s;
$$;

create or replace function public.pppp_jsonb_text_array_v1(p_value jsonb)
returns text[]
language sql
immutable
set search_path to pg_catalog
as $$
select case
  when p_value is null or p_value='null'::jsonb then '{}'::text[]
  when jsonb_typeof(p_value)='array' then coalesce((select array_agg(x) from jsonb_array_elements_text(p_value) x),'{}'::text[])
  when jsonb_typeof(p_value)='string' then array[trim(both '"' from p_value::text)]
  else array[p_value::text]
end;
$$;

create table if not exists public.supplier_capabilities_v1 (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  family text not null,
  product_type text,
  product_tags text[] not null default '{}'::text[],
  standards text[] not null default '{}'::text[],
  grades text[] not null default '{}'::text[],
  certifications text[] not null default '{}'::text[],
  thickness_min_mm numeric,
  thickness_max_mm numeric,
  width_max_mm integer,
  length_max_mm integer,
  diameter_min_mm numeric,
  diameter_max_mm numeric,
  source text not null default 'manual',
  source_ref text,
  confidence integer not null default 50 check(confidence between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supplier_capabilities_partner_idx on public.supplier_capabilities_v1(partner_id,is_active);
create index if not exists supplier_capabilities_family_idx on public.supplier_capabilities_v1(family,is_active);

create table if not exists public.supplier_evidence_v1 (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  source text not null,
  source_ref text not null,
  evidence_type text not null,
  evidence_summary text not null,
  direction text,
  evidence_at timestamptz,
  confidence integer not null default 50 check(confidence between 0 and 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(partner_id,source,source_ref,evidence_type)
);
create index if not exists supplier_evidence_partner_idx on public.supplier_evidence_v1(partner_id,evidence_at desc);

create table if not exists public.supplier_discovery_requests_v1 (
  id uuid primary key default gen_random_uuid(),
  request_key text not null unique,
  project_id uuid references public.projects(id) on delete cascade,
  requirement jsonb not null default '{}'::jsonb,
  min_qualified integer not null default 3 check(min_qualified between 1 and 20),
  match_threshold integer not null default 70 check(match_threshold between 0 and 100),
  status text not null default 'queued' check(status in ('queued','searching','review','complete','no_result','failed','cancelled')),
  next_tier text not null default 'local' check(next_tier in ('local','regional','turkey','greece','eu','complete')),
  qualified_existing integer not null default 0,
  coverage_snapshot jsonb not null default '{}'::jsonb,
  last_search_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supplier_discovery_requests_status_idx on public.supplier_discovery_requests_v1(status,next_tier,created_at);
create index if not exists supplier_discovery_requests_project_idx on public.supplier_discovery_requests_v1(project_id);

create table if not exists public.supplier_discovery_candidates_v1 (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.supplier_discovery_requests_v1(id) on delete cascade,
  company_name text not null,
  company_domain text,
  website_url text,
  country text,
  country_code text,
  city text,
  source_tier text not null,
  contact_name text,
  contact_email text,
  contact_role text,
  language text,
  match_score integer not null default 0 check(match_score between 0 and 100),
  capability jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  source_url text,
  status text not null default 'human_review' check(status in ('human_review','approved','rejected','already_known','promoted')),
  linked_partner_id uuid references public.partners(id) on delete set null,
  duplicate_reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id,company_name,company_domain)
);
create index if not exists supplier_discovery_candidates_request_idx on public.supplier_discovery_candidates_v1(request_id,status,match_score desc);
create index if not exists supplier_discovery_candidates_domain_idx on public.supplier_discovery_candidates_v1(company_domain);

create table if not exists public.supplier_identity_candidates_v1 (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null unique,
  company_name text,
  company_domain text,
  country text,
  primary_email text,
  contact_name text,
  source_contact_ids uuid[] not null default '{}'::uuid[],
  contact_kinds text[] not null default '{}'::text[],
  procurement_messages integer not null default 0,
  incoming_offer_signals integer not null default 0,
  outgoing_rfq_signals integer not null default 0,
  first_evidence_at timestamptz,
  last_evidence_at timestamptz,
  linked_partner_id uuid references public.partners(id) on delete set null,
  identity_status text not null default 'review',
  profile_status text not null default 'unknown',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supplier_identity_candidates_domain_idx on public.supplier_identity_candidates_v1(company_domain);
create index if not exists supplier_identity_candidates_partner_idx on public.supplier_identity_candidates_v1(linked_partner_id);
create index if not exists supplier_identity_candidates_status_idx on public.supplier_identity_candidates_v1(identity_status,profile_status);

alter table public.supplier_capabilities_v1 enable row level security;
alter table public.supplier_evidence_v1 enable row level security;
alter table public.supplier_discovery_requests_v1 enable row level security;
alter table public.supplier_discovery_candidates_v1 enable row level security;
alter table public.supplier_identity_candidates_v1 enable row level security;

drop policy if exists supplier_capabilities_read on public.supplier_capabilities_v1;
create policy supplier_capabilities_read on public.supplier_capabilities_v1 for select to authenticated using (true);
drop policy if exists supplier_evidence_read on public.supplier_evidence_v1;
create policy supplier_evidence_read on public.supplier_evidence_v1 for select to authenticated using (true);
drop policy if exists supplier_discovery_requests_read on public.supplier_discovery_requests_v1;
create policy supplier_discovery_requests_read on public.supplier_discovery_requests_v1 for select to authenticated using (true);
drop policy if exists supplier_discovery_candidates_read on public.supplier_discovery_candidates_v1;
create policy supplier_discovery_candidates_read on public.supplier_discovery_candidates_v1 for select to authenticated using (true);
drop policy if exists supplier_identity_candidates_read on public.supplier_identity_candidates_v1;
create policy supplier_identity_candidates_read on public.supplier_identity_candidates_v1 for select to authenticated using (true);

grant select on public.supplier_capabilities_v1,public.supplier_evidence_v1,public.supplier_discovery_requests_v1,public.supplier_discovery_candidates_v1,public.supplier_identity_candidates_v1 to authenticated,service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.supplier_capabilities_v1,public.supplier_evidence_v1,public.supplier_discovery_requests_v1,public.supplier_discovery_candidates_v1,public.supplier_identity_candidates_v1 to supabase_read_only_user;
  end if;
end $$;

create or replace function public.pppp_supplier_family_v1(p_text text)
returns text
language sql
immutable
set search_path to pg_catalog,public
as $$
select case
  when lower(trim(coalesce(p_text,''))) in ('heavy_plate','sheet','profiles','tubes','hardware','mro','fabrication','coating','galvanizing','machining') then lower(trim(coalesce(p_text,'')))
  when lower(coalesce(p_text,'')) ~ '(galvan|zink|zinc|feuerverzink)' then 'galvanizing'
  when lower(coalesce(p_text,'')) ~ '(paint|coating|powder|plastifik|lackier|surface treatment)' then 'coating'
  when lower(coalesce(p_text,'')) ~ '(bolt|bulon|screw|nut|washer|fastener|anker|anchor)' then 'hardware'
  when lower(coalesce(p_text,'')) ~ '(shtyll|pole|mast)' then 'fabrication'
  when lower(coalesce(p_text,'')) ~ '(^|[^a-z0-9])(hop|rhs|shs|chs)[[:space:]]*[0-9]|(tube|pipe|rohr|tub)' then 'tubes'
  when lower(coalesce(p_text,'')) ~ '(^|[^a-z0-9])(hea|heb|hem|ipe|ipn|ipb|upn|upe)[[:space:]]*[0-9]|(channel|angle|profil|beam|round[[:space:]]*bar|flat[[:space:]]*bar|rod)|(^|[^a-z0-9])(2l|l)[[:space:]]*[0-9]' then 'profiles'
  when lower(coalesce(p_text,'')) ~ '(heavy[ _-]?plate|quarto|plate|pllak|blech)' then 'heavy_plate'
  when lower(coalesce(p_text,'')) ~ '(^|[^0-9])[0-9]{4,}[[:space:]]*[x×][[:space:]]*[0-9]{3,4}[[:space:]]*[x×][[:space:]]*[0-9]+([.,][0-9]+)?([^0-9]|$)' then 'heavy_plate'
  when lower(coalesce(p_text,'')) ~ '(sheet|coil|llamarin|lim)' then 'sheet'
  when lower(coalesce(p_text,'')) ~ '(fabricat|weld|fabrik|prodh|steelwork|konstruksion)' then 'fabrication'
  when lower(coalesce(p_text,'')) ~ '(mro|consumable|electrode|wire|welding consum|tool|abrasive)' then 'mro'
  else null
end;
$$;

-- Idempotent bootstrap from the existing Supplier Master. It only fills missing family rows.
insert into public.supplier_capabilities_v1(
  partner_id,family,grades,certifications,thickness_min_mm,thickness_max_mm,width_max_mm,length_max_mm,source,source_ref,confidence
)
select p.id,f.family,coalesce(p.grades,'{}'::text[]),coalesce(p.certifications,'{}'::text[]),p.thickness_min_mm,p.thickness_max_mm,p.width_max_mm,p.length_max_mm,
       'partner_master_bootstrap','partner:'||p.id::text,case lower(coalesce(p.data_confidence,'')) when 'verified' then 75 when 'partial' then 60 else 45 end
from public.partners p
cross join lateral (
  select distinct public.pppp_supplier_family_v1(x) family from unnest(coalesce(p.categories,'{}'::text[])) x
) f
where 'supplier'=any(coalesce(p.relation,'{}'::text[])) and f.family is not null
  and not exists(select 1 from public.supplier_capabilities_v1 c where c.partner_id=p.id and c.family=f.family and c.is_active);

create or replace function public.pppp_project_procurement_requirements_v1(p_project_id uuid)
returns table(family text,requirement jsonb)
language sql
stable
set search_path to pg_catalog,public
as $$
with rows as (
  select public.pppp_supplier_family_v1(concat_ws(' ',b.profile,b.materiali,b.pozicioni,b.dimensionet,b.dim)) family,
    nullif(trim(coalesce(b.profile,b.pozicioni,b.materiali,'')),'') product_type,
    nullif(trim(coalesce(b.grade,b.materiali,'')),'') grade,nullif(trim(coalesce(b.std,'')),'') standard,
    nullif(trim(coalesce(b.cert,'')),'') cert,nullif(trim(coalesce(b.surface,'')),'') surface,
    coalesce(b.kg,case when b.kg_unit is not null and b.sasia is not null then b.kg_unit*b.sasia else null end,0) kg,
    coalesce(b.pcs,b.sasia,0) pcs,b.len_mm,coalesce(b.needs_review,false) needs_review
  from public.bom_items b where b.project_id=p_project_id
), grouped as (
  select family,array_remove(array_agg(distinct product_type),null) product_types,array_remove(array_agg(distinct grade),null) grades,
    array_remove(array_agg(distinct standard),null) standards,array_remove(array_agg(distinct cert),null) certs,
    array_remove(array_agg(distinct surface),null) surfaces,sum(kg) quantity_kg,sum(pcs) quantity_pcs,max(len_mm) length_mm,
    count(*)::int bom_rows,count(*) filter(where needs_review)::int needs_review_rows
  from rows where family is not null group by family
)
select g.family,jsonb_build_object('family',g.family,'product_type',coalesce(g.product_types[1],g.family),'product_types',g.product_types,
  'grades',g.grades,'standards',g.standards,'certifications',g.certs,'surfaces',g.surfaces,'quantity_kg',round(g.quantity_kg,3),
  'quantity_pcs',g.quantity_pcs,'length_mm',g.length_mm,'bom_rows',g.bom_rows,'needs_review_rows',g.needs_review_rows,
  'source','bom_items','project_id',p_project_id)
from grouped g order by g.family;
$$;

create or replace function public.pppp_supplier_master_ingest_v1(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog,public,private
as $$
declare
  v_partner_id uuid; v_created boolean:=false; v_name text:=btrim(coalesce(p_payload->>'name',''));
  v_email text:=lower(nullif(btrim(coalesce(p_payload->>'email','')),'')); v_full_name text:=nullif(btrim(coalesce(p_payload->>'full_name','')),'');
  v_role text:=nullif(btrim(coalesce(p_payload->>'role','')),''); v_language text:=nullif(btrim(coalesce(p_payload->>'language','')),'');
  v_country text:=nullif(btrim(coalesce(p_payload->>'country','')),''); v_city text:=nullif(btrim(coalesce(p_payload->>'city','')),'');
  v_website text:=nullif(btrim(coalesce(p_payload->>'website','')),''); v_business_type text:=nullif(btrim(coalesce(p_payload->>'business_type','')),'');
  v_conf text:=lower(coalesce(nullif(btrim(p_payload->>'data_confidence'),''),'partial'));
  v_source text:=coalesce(nullif(btrim(p_payload->>'source'),''),'supplier_master_ingest_v1');
  v_aliases text[]:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'aliases','[]'::jsonb))),'{}'::text[]);
  v_categories text[]:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'categories','[]'::jsonb))),'{}'::text[]);
  v_grades text[]:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'grades','[]'::jsonb))),'{}'::text[]);
  v_certs text[]:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'certifications','[]'::jsonb))),'{}'::text[]);
  v_class text[]:=coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'class_approval','[]'::jsonb))),'{}'::text[]);
  v_contact_id uuid; cap jsonb; ev jsonb; v_cap_id uuid; v_family text; v_source_ref text; v_cap_count integer:=0; v_evidence_count integer:=0;
begin
  if v_name='' and coalesce(p_payload->>'partner_id','')='' then raise exception 'Supplier name or partner_id is required'; end if;
  if nullif(p_payload->>'partner_id','') is not null then
    v_partner_id:=(p_payload->>'partner_id')::uuid;
    if not exists(select 1 from public.partners where id=v_partner_id) then raise exception 'Partner not found: %',v_partner_id; end if;
  end if;
  if v_partner_id is null and v_email is not null then
    select pc.partner_id into v_partner_id from public.partner_contacts pc where lower(btrim(coalesce(pc.email,'')))=v_email
    order by pc.is_primary desc nulls last,pc.created_at limit 1;
  end if;
  if v_partner_id is null and v_name<>'' then
    select p.id into v_partner_id from public.partners p where private.pppp_supplier_norm_v1(p.name)=private.pppp_supplier_norm_v1(v_name)
      or exists(select 1 from unnest(coalesce(p.aliases,'{}'::text[])) a where private.pppp_supplier_norm_v1(a)=private.pppp_supplier_norm_v1(v_name))
    order by p.created_at limit 1;
  end if;
  if v_partner_id is null then
    insert into public.partners(name,aliases,country,city,website,business_type,relation,categories,grades,class_approval,certifications,stage,data_confidence,source,notes)
    values(v_name,v_aliases,v_country,v_city,v_website,v_business_type,array['supplier']::text[],v_categories,v_grades,v_class,v_certs,
      'active',v_conf,v_source,'Supplier Master controlled ingest. No supplier selection or external communication is implied.') returning id into v_partner_id;
    v_created:=true;
  else
    update public.partners p set
      aliases=private.pppp_text_array_union_v1(p.aliases,private.pppp_text_array_union_v1(v_aliases,case when private.pppp_supplier_norm_v1(p.name)<>private.pppp_supplier_norm_v1(v_name) and v_name<>'' then array[v_name] else '{}'::text[] end)),
      country=coalesce(p.country,v_country),city=coalesce(p.city,v_city),website=coalesce(p.website,v_website),
      business_type=case when coalesce((p_payload->>'allow_business_type_upgrade')::boolean,false) and v_business_type is not null then v_business_type else coalesce(p.business_type,v_business_type) end,
      relation=private.pppp_text_array_union_v1(p.relation,array['supplier']::text[]),categories=private.pppp_text_array_union_v1(p.categories,v_categories),
      grades=private.pppp_text_array_union_v1(p.grades,v_grades),certifications=private.pppp_text_array_union_v1(p.certifications,v_certs),
      class_approval=private.pppp_text_array_union_v1(p.class_approval,v_class),
      data_confidence=case when v_conf='verified' then 'verified' when coalesce(p.data_confidence,'unverified')='verified' then p.data_confidence when v_conf='partial' then 'partial' else coalesce(p.data_confidence,v_conf) end,
      source=coalesce(p.source,v_source),updated_at=now() where p.id=v_partner_id;
  end if;
  if v_email is not null then
    select pc.id into v_contact_id from public.partner_contacts pc where pc.partner_id=v_partner_id and lower(btrim(coalesce(pc.email,'')))=v_email limit 1;
    if v_contact_id is null then
      insert into public.partner_contacts(partner_id,full_name,email,role,language,is_primary,last_contact_at,notes,source)
      values(v_partner_id,coalesce(v_full_name,v_email),v_email,v_role,v_language,not exists(select 1 from public.partner_contacts where partner_id=v_partner_id and coalesce(is_primary,false)),
        nullif(p_payload->>'last_contact_at','')::date,'Imported/enriched through controlled Supplier Master ingest.',v_source) returning id into v_contact_id;
    else
      update public.partner_contacts set full_name=case when full_name=email and v_full_name is not null then v_full_name else full_name end,
        role=coalesce(role,v_role),language=coalesce(language,v_language),last_contact_at=greatest(last_contact_at,nullif(p_payload->>'last_contact_at','')::date),source=coalesce(source,v_source)
      where id=v_contact_id;
    end if;
  end if;
  for cap in select value from jsonb_array_elements(coalesce(p_payload->'capabilities','[]'::jsonb)) loop
    v_family:=lower(btrim(coalesce(cap->>'family',''))); if v_family='' then continue; end if;
    v_source_ref:=coalesce(nullif(btrim(cap->>'source_ref'),''),nullif(btrim(p_payload#>>'{evidence,source_ref}'),''));
    select c.id into v_cap_id from public.supplier_capabilities_v1 c where c.partner_id=v_partner_id and lower(c.family)=v_family and c.is_active order by c.confidence desc,c.updated_at desc limit 1;
    if v_cap_id is null then
      insert into public.supplier_capabilities_v1(partner_id,family,product_type,product_tags,standards,grades,certifications,thickness_min_mm,thickness_max_mm,width_max_mm,length_max_mm,diameter_min_mm,diameter_max_mm,source,source_ref,confidence,is_active)
      values(v_partner_id,v_family,nullif(cap->>'product_type',''),coalesce(array(select jsonb_array_elements_text(coalesce(cap->'product_tags','[]'::jsonb))),'{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(coalesce(cap->'standards','[]'::jsonb))),'{}'::text[]),coalesce(array(select jsonb_array_elements_text(coalesce(cap->'grades','[]'::jsonb))),'{}'::text[]),
        coalesce(array(select jsonb_array_elements_text(coalesce(cap->'certifications','[]'::jsonb))),'{}'::text[]),nullif(cap->>'thickness_min_mm','')::numeric,nullif(cap->>'thickness_max_mm','')::numeric,
        nullif(cap->>'width_max_mm','')::integer,nullif(cap->>'length_max_mm','')::integer,nullif(cap->>'diameter_min_mm','')::numeric,nullif(cap->>'diameter_max_mm','')::numeric,
        'supplier_master_enrichment',v_source_ref,coalesce(nullif(cap->>'confidence','')::integer,70),true) returning id into v_cap_id;
    else
      update public.supplier_capabilities_v1 c set product_type=coalesce(c.product_type,nullif(cap->>'product_type','')),
        product_tags=private.pppp_text_array_union_v1(c.product_tags,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'product_tags','[]'::jsonb))),'{}'::text[])),
        standards=private.pppp_text_array_union_v1(c.standards,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'standards','[]'::jsonb))),'{}'::text[])),
        grades=private.pppp_text_array_union_v1(c.grades,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'grades','[]'::jsonb))),'{}'::text[])),
        certifications=private.pppp_text_array_union_v1(c.certifications,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'certifications','[]'::jsonb))),'{}'::text[])),
        thickness_min_mm=coalesce(c.thickness_min_mm,nullif(cap->>'thickness_min_mm','')::numeric),thickness_max_mm=coalesce(c.thickness_max_mm,nullif(cap->>'thickness_max_mm','')::numeric),
        width_max_mm=coalesce(c.width_max_mm,nullif(cap->>'width_max_mm','')::integer),length_max_mm=coalesce(c.length_max_mm,nullif(cap->>'length_max_mm','')::integer),
        diameter_min_mm=coalesce(c.diameter_min_mm,nullif(cap->>'diameter_min_mm','')::numeric),diameter_max_mm=coalesce(c.diameter_max_mm,nullif(cap->>'diameter_max_mm','')::numeric),
        source=case when coalesce(nullif(cap->>'confidence','')::integer,70)>=c.confidence then 'supplier_master_enrichment' else c.source end,
        source_ref=case when coalesce(nullif(cap->>'confidence','')::integer,70)>=c.confidence then coalesce(v_source_ref,c.source_ref) else c.source_ref end,
        confidence=greatest(c.confidence,coalesce(nullif(cap->>'confidence','')::integer,70)),updated_at=now() where c.id=v_cap_id;
    end if;
    update public.partners p set categories=private.pppp_text_array_union_v1(p.categories,array[v_family]),
      grades=private.pppp_text_array_union_v1(p.grades,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'grades','[]'::jsonb))),'{}'::text[])),
      certifications=private.pppp_text_array_union_v1(p.certifications,coalesce(array(select jsonb_array_elements_text(coalesce(cap->'certifications','[]'::jsonb))),'{}'::text[])),updated_at=now()
    where p.id=v_partner_id; v_cap_count:=v_cap_count+1;
  end loop;
  ev:=coalesce(p_payload->'evidence','{}'::jsonb);
  if coalesce(nullif(btrim(ev->>'source_ref'),''),'')<>'' then
    insert into public.supplier_evidence_v1(partner_id,source,source_ref,evidence_type,evidence_summary,direction,evidence_at,confidence,metadata)
    values(v_partner_id,coalesce(nullif(ev->>'source',''),v_source),ev->>'source_ref',coalesce(nullif(ev->>'evidence_type',''),'supplier_evidence'),
      coalesce(nullif(ev->>'summary',''),'Supplier evidence'),nullif(ev->>'direction',''),nullif(ev->>'evidence_at','')::timestamptz,coalesce(nullif(ev->>'confidence','')::integer,70),coalesce(ev->'metadata','{}'::jsonb))
    on conflict(partner_id,source,source_ref,evidence_type) do update set evidence_summary=excluded.evidence_summary,direction=coalesce(excluded.direction,public.supplier_evidence_v1.direction),
      evidence_at=coalesce(excluded.evidence_at,public.supplier_evidence_v1.evidence_at),confidence=greatest(public.supplier_evidence_v1.confidence,excluded.confidence),metadata=public.supplier_evidence_v1.metadata||excluded.metadata,updated_at=now();
    v_evidence_count:=1;
  end if;
  return jsonb_build_object('ok',true,'partner_id',v_partner_id,'created',v_created,'contact_id',v_contact_id,'capabilities_processed',v_cap_count,'evidence_processed',v_evidence_count,
    'human_supplier_selection_required',true,'external_email_send_requires_human_approval',true);
end;
$$;

create or replace function public.pppp_supplier_match_v1(p_requirement jsonb,p_limit integer default 30,p_threshold integer default 0)
returns table(partner_id uuid,partner_name text,country text,city text,website text,business_type text,primary_email text,contact_language text,match_score integer,qualified boolean,source_tier text,dimension_conflict boolean,match_reasons jsonb)
language sql
stable
set search_path to pg_catalog,public
as $$
with req as (
  select array_remove(array(select distinct public.pppp_supplier_family_v1(v) from unnest(public.pppp_jsonb_text_array_v1(p_requirement->'families')||public.pppp_jsonb_text_array_v1(p_requirement->'family')) v),null) families,
    lower(coalesce(p_requirement->>'product_type',p_requirement->>'description','')) product_text,
    array(select lower(x) from unnest(public.pppp_jsonb_text_array_v1(p_requirement->'grades')||public.pppp_jsonb_text_array_v1(p_requirement->'grade')) x where nullif(trim(x),'') is not null) grades,
    array(select lower(x) from unnest(public.pppp_jsonb_text_array_v1(p_requirement->'standards')||public.pppp_jsonb_text_array_v1(p_requirement->'standard')) x where nullif(trim(x),'') is not null) standards,
    array(select lower(x) from unnest(public.pppp_jsonb_text_array_v1(p_requirement->'certifications')||public.pppp_jsonb_text_array_v1(p_requirement->'cert')) x where nullif(trim(x),'') is not null) certs,
    case when trim(coalesce(p_requirement->>'thickness_mm','')) ~ '^[0-9]+([.][0-9]+)?$' then (p_requirement->>'thickness_mm')::numeric end thickness_mm,
    case when trim(coalesce(p_requirement->>'width_mm','')) ~ '^[0-9]+([.][0-9]+)?$' then (p_requirement->>'width_mm')::numeric end width_mm,
    case when trim(coalesce(p_requirement->>'length_mm','')) ~ '^[0-9]+([.][0-9]+)?$' then (p_requirement->>'length_mm')::numeric end length_mm,
    case when trim(coalesce(p_requirement->>'diameter_mm','')) ~ '^[0-9]+([.][0-9]+)?$' then (p_requirement->>'diameter_mm')::numeric end diameter_mm
), cap as (
  select c.partner_id,array_agg(distinct c.family) filter(where c.is_active) cap_families,
    array_agg(distinct lower(g)) filter(where g is not null) cap_grades,array_agg(distinct lower(s)) filter(where s is not null) cap_standards,
    array_agg(distinct lower(z)) filter(where z is not null) cap_certs,string_agg(distinct lower(coalesce(c.product_type,'')||' '||array_to_string(c.product_tags,' ')),' ') cap_product_text,
    min(c.thickness_min_mm) filter(where c.is_active) thickness_min_mm,max(c.thickness_max_mm) filter(where c.is_active) thickness_max_mm,
    max(c.width_max_mm) filter(where c.is_active) width_max_mm,max(c.length_max_mm) filter(where c.is_active) length_max_mm,
    min(c.diameter_min_mm) filter(where c.is_active) diameter_min_mm,max(c.diameter_max_mm) filter(where c.is_active) diameter_max_mm
  from public.supplier_capabilities_v1 c left join lateral unnest(coalesce(c.grades,'{}'::text[])) g on true
  left join lateral unnest(coalesce(c.standards,'{}'::text[])) s on true left join lateral unnest(coalesce(c.certifications,'{}'::text[])) z on true
  where c.is_active group by c.partner_id
), hist as (
  select p.id partner_id,least(6,count(distinct o.id))::int offer_history_score,least(4,count(distinct r.id) filter(where r.replied_at is not null or r.status='replied'))::int reply_history_score
  from public.partners p left join public.offers o on lower(trim(o.supplier))=lower(trim(p.name)) left join public.rfq_log r on lower(trim(r.supplier_name))=lower(trim(p.name)) group by p.id
), base as (
  select p.*,ct.email primary_email,ct.language contact_language,
    coalesce(cap.cap_families,'{}'::text[])||array(select distinct public.pppp_supplier_family_v1(x) from unnest(coalesce(p.categories,'{}'::text[])) x) all_families,
    coalesce(cap.cap_grades,'{}'::text[])||array(select lower(x) from unnest(coalesce(p.grades,'{}'::text[])) x) all_grades,
    coalesce(cap.cap_standards,'{}'::text[]) all_standards,coalesce(cap.cap_certs,'{}'::text[])||array(select lower(x) from unnest(coalesce(p.certifications,'{}'::text[])) x) all_certs,
    lower(coalesce(cap.cap_product_text,'')||' '||coalesce(p.industry_note,'')||' '||coalesce(p.notes,'')) product_haystack,
    coalesce(cap.thickness_min_mm,p.thickness_min_mm) eff_thickness_min,coalesce(cap.thickness_max_mm,p.thickness_max_mm) eff_thickness_max,
    coalesce(cap.width_max_mm,p.width_max_mm) eff_width_max,coalesce(cap.length_max_mm,p.length_max_mm) eff_length_max,cap.diameter_min_mm eff_diameter_min,cap.diameter_max_mm eff_diameter_max,
    coalesce(hist.offer_history_score,0)+coalesce(hist.reply_history_score,0) history_score
  from public.partners p left join cap on cap.partner_id=p.id left join hist on hist.partner_id=p.id
  left join lateral(select pc.email,pc.language from public.partner_contacts pc where pc.partner_id=p.id and nullif(trim(pc.email),'') is not null order by pc.is_primary desc nulls last,pc.created_at asc limit 1) ct on true
  where 'supplier'=any(coalesce(p.relation,'{}'::text[])) and lower(coalesce(p.stage,'active')) not in ('inactive','blocked','rejected','archived')
), scored as (
  select b.*,r.families req_families,r.product_text req_product_text,r.grades req_grades,r.standards req_standards,r.certs req_certs,
    r.thickness_mm req_thickness_mm,r.width_mm req_width_mm,r.length_mm req_length_mm,r.diameter_mm req_diameter_mm,
    case when cardinality(r.families)=0 then 0 when exists(select 1 from unnest(r.families) f where f=any(b.all_families)) then 35
      when exists(select 1 from unnest(r.families) f where (f='heavy_plate' and 'sheet'=any(b.all_families)) or (f='sheet' and 'heavy_plate'=any(b.all_families))) then 25 else 0 end family_score,
    case when r.product_text='' then 10 when b.product_haystack like '%'||r.product_text||'%' then 10 when public.pppp_supplier_family_v1(r.product_text)=any(b.all_families) then 7 else 0 end product_score,
    case when cardinality(r.grades)=0 then 15 when exists(select 1 from unnest(r.grades) x where x=any(b.all_grades)) then 15
      when exists(select 1 from unnest(r.grades) x cross join unnest(b.all_grades) y where regexp_replace(x,'(jr|j0|j2|nl|ml|mc|n|m)$','','i')=regexp_replace(y,'(jr|j0|j2|nl|ml|mc|n|m)$','','i')) then 11
      when cardinality(b.all_grades)=0 then 4 else -10 end grade_score,
    case when cardinality(r.standards)=0 then 15 when exists(select 1 from unnest(r.standards) x where x=any(b.all_standards)) then 15 when cardinality(b.all_standards)=0 then 2 else -15 end standard_score,
    case when cardinality(r.certs)=0 then 5 when exists(select 1 from unnest(r.certs) x where x=any(b.all_certs)) then 5 when cardinality(b.all_certs)=0 then 1 else -5 end cert_score,
    ((r.thickness_mm is not null and ((b.eff_thickness_min is not null and r.thickness_mm<b.eff_thickness_min) or (b.eff_thickness_max is not null and r.thickness_mm>b.eff_thickness_max)))
      or (r.width_mm is not null and b.eff_width_max is not null and r.width_mm>b.eff_width_max) or (r.length_mm is not null and b.eff_length_max is not null and r.length_mm>b.eff_length_max)
      or (r.diameter_mm is not null and ((b.eff_diameter_min is not null and r.diameter_mm<b.eff_diameter_min) or (b.eff_diameter_max is not null and r.diameter_mm>b.eff_diameter_max)))) dim_conflict,
    case when r.thickness_mm is null and r.width_mm is null and r.length_mm is null and r.diameter_mm is null then 10
      when (b.eff_thickness_min is not null or b.eff_thickness_max is not null or b.eff_width_max is not null or b.eff_length_max is not null or b.eff_diameter_min is not null or b.eff_diameter_max is not null) then 10 else 3 end dimension_score,
    case when b.primary_email is not null then 5 else 0 end contact_score,
    case upper(coalesce(b.country,'')) when 'XK' then 8 when 'AL' then 6 when 'MK' then 6 when 'ME' then 6 when 'RS' then 6 when 'BA' then 6 when 'HR' then 6 when 'BG' then 6 when 'RO' then 6 when 'SI' then 6 when 'TR' then 5 when 'GR' then 4 else 3 end location_score,
    least(10,b.history_score) history_bonus,least(5,greatest(0,coalesce(b.importance,0))) importance_score,
    case lower(coalesce(b.data_confidence,'')) when 'verified' then 5 when 'partial' then 2 else 1 end confidence_score
  from base b cross join req r
), final as (
  select s.*,greatest(0,least(100,s.family_score+s.product_score+s.grade_score+s.standard_score+s.cert_score+s.dimension_score+s.contact_score+s.location_score+s.history_bonus+s.importance_score+s.confidence_score))::int total_score from scored s
)
select f.id,f.name,f.country,f.city,f.website,f.business_type,f.primary_email,f.contact_language,f.total_score,
  (f.family_score>=25 and not f.dim_conflict and f.total_score>=greatest(0,least(100,coalesce(p_threshold,0))) and (cardinality(f.req_standards)=0 or exists(select 1 from unnest(f.req_standards) x where x=any(f.all_standards) or f.product_haystack like '%'||x||'%'))) qualified,
  case upper(coalesce(f.country,'')) when 'XK' then 'local' when 'TR' then 'turkey' when 'GR' then 'greece' when 'AL' then 'regional' when 'MK' then 'regional' when 'ME' then 'regional' when 'RS' then 'regional' when 'BA' then 'regional' when 'HR' then 'regional' when 'BG' then 'regional' when 'RO' then 'regional' when 'SI' then 'regional' else 'eu' end source_tier,
  f.dim_conflict,jsonb_build_object('family_score',f.family_score,'product_score',f.product_score,'grade_score',f.grade_score,'standard_score',f.standard_score,'certificate_score',f.cert_score,
    'dimension_score',f.dimension_score,'contact_score',f.contact_score,'location_score',f.location_score,'history_score',f.history_bonus,'importance_score',f.importance_score,
    'data_confidence_score',f.confidence_score,'requested_families',f.req_families,'supplier_families',f.all_families)
from final f where f.family_score>0 order by f.total_score desc,f.importance desc nulls last,f.name limit greatest(1,least(200,coalesce(p_limit,30)));
$$;

create or replace function public.pppp_supplier_coverage_v1(p_requirement jsonb,p_min_qualified integer default 3,p_threshold integer default 70)
returns jsonb
language sql
stable
set search_path to pg_catalog,public
as $$
with m as (select * from public.pppp_supplier_match_v1(p_requirement,100,p_threshold)), x as (
  select count(*) filter(where qualified)::int capability_q,count(*) filter(where qualified and primary_email is not null)::int rfq_ready_q,count(*)::int total,
    coalesce(jsonb_agg(jsonb_build_object('partner_id',partner_id,'name',partner_name,'country',country,'city',city,'email',primary_email,'score',match_score,'qualified',qualified,
      'rfq_ready',(qualified and primary_email is not null),'source_tier',source_tier,'reasons',match_reasons) order by match_score desc) filter(where partner_id is not null),'[]'::jsonb) matches from m
)
select jsonb_build_object('requirement',coalesce(p_requirement,'{}'::jsonb),'threshold',p_threshold,'min_qualified',p_min_qualified,'qualified_existing',x.rfq_ready_q,
  'capability_qualified_existing',x.capability_q,'rfq_ready_existing',x.rfq_ready_q,'matched_existing',x.total,
  'sufficient',x.rfq_ready_q>=greatest(1,coalesce(p_min_qualified,3)),'next_tier',case when x.rfq_ready_q>=greatest(1,coalesce(p_min_qualified,3)) then 'complete' else 'local' end,
  'matches',x.matches,'human_supplier_selection_required',true,'external_email_send_requires_human_approval',true,'generated_at',now()) from x;
$$;

create or replace function public.pppp_supplier_routing_plan_v1(p_project_id uuid,p_min_qualified integer default 3,p_threshold integer default 70)
returns jsonb
language sql
stable
set search_path to pg_catalog,public
as $$
with req as (select * from public.pppp_project_procurement_requirements_v1(p_project_id)), cov as (
  select r.family,r.requirement,public.pppp_supplier_coverage_v1(r.requirement,p_min_qualified,p_threshold) coverage from req r
)
select jsonb_build_object('project_id',p_project_id,'requirements',coalesce(jsonb_agg(jsonb_build_object('family',family,'requirement',requirement,'coverage',coverage) order by family),'[]'::jsonb),
  'all_requirements_covered',coalesce(bool_and((coverage->>'sufficient')::boolean),false),'human_supplier_selection_required',true,'external_email_send_requires_human_approval',true,'generated_at',now()) from cov;
$$;

create or replace view public.pppp_supplier_identity_reconcile_source_v1
with (security_invoker=true)
as
with public_domains(domain) as (
  values ('gmail.com'),('googlemail.com'),('outlook.com'),('hotmail.com'),('live.com'),('yahoo.com'),('icloud.com'),('aol.com'),('gmx.com'),('gmx.de'),('web.de'),('mail.com'),('proton.me'),('protonmail.com')
), contact_domains as (
  select lower(split_part(c.email,'@',2)) domain,array_agg(distinct c.id) contact_ids,
    array_agg(distinct lower(coalesce(c.kind,''))) filter(where nullif(trim(c.kind),'') is not null) kinds,
    (array_agg(nullif(trim(c.company),'') order by case when nullif(trim(c.company),'') is null then 1 else 0 end,length(coalesce(c.company,'')) desc))[1] company,
    (array_agg(nullif(trim(c.country),'') order by case when nullif(trim(c.country),'') is null then 1 else 0 end))[1] country,
    (array_agg(lower(c.email) order by case when lower(coalesce(c.kind,''))='supplier' then 0 else 1 end,c.created_at desc nulls last))[1] email,
    (array_agg(nullif(trim(c.person),'') order by case when nullif(trim(c.person),'') is null then 1 else 0 end,c.created_at desc nulls last))[1] person
  from public.contacts c where c.email like '%@%' and lower(split_part(c.email,'@',2)) not in(select domain from public_domains)
    and lower(split_part(c.email,'@',2)) not in ('prissteel.com','pristeel.com') group by lower(split_part(c.email,'@',2))
), message_domains as (
  select lower(split_part(e.from_email,'@',2)) domain,'incoming'::text side,e.gmail_message_id,e.subject,e.snippet,e.sent_at from public.project_emails e
  where lower(coalesce(e.direction,''))='incoming' and e.from_email like '%@%'
  union all
  select lower(split_part(x,'@',2)) domain,'outgoing'::text side,e.gmail_message_id,e.subject,e.snippet,e.sent_at from public.project_emails e
  cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) x where lower(coalesce(e.direction,''))='outgoing' and x like '%@%'
), msg_score as (
  select m.domain,
    count(distinct m.gmail_message_id) filter(where (m.side='outgoing' and lower(coalesce(m.subject,'')) ~ '(\brfq\b|request for quotation|request for offer|request for quote|anfrage.*angebot|zahtev za ponudu|k[eë]rkes[ëe].*ofert)')
      or (m.side='incoming' and lower(coalesce(m.subject,'')||' '||coalesce(m.snippet,'')) ~ '(quotation|\bquote\b|\boffer\b|angebot|ponuda|eur/t|eur\/t|price/set|price\/set|unit price)'))::int procurement_messages,
    count(distinct m.gmail_message_id) filter(where m.side='incoming' and lower(coalesce(m.subject,'')||' '||coalesce(m.snippet,'')) ~ '(quotation|\bquote\b|\boffer\b|angebot|ponuda|eur/t|eur\/t|price/set|price\/set|unit price)')::int incoming_offer_signals,
    count(distinct m.gmail_message_id) filter(where m.side='outgoing' and lower(coalesce(m.subject,'')) ~ '(\brfq\b|request for quotation|request for offer|request for quote|anfrage.*angebot|zahtev za ponudu|k[eë]rkes[ëe].*ofert)')::int outgoing_rfq_signals,
    min(m.sent_at) filter(where (m.side='outgoing' and lower(coalesce(m.subject,'')) ~ '(\brfq\b|request for quotation|request for offer|request for quote|anfrage.*angebot|zahtev za ponudu|k[eë]rkes[ëe].*ofert)')
      or (m.side='incoming' and lower(coalesce(m.subject,'')||' '||coalesce(m.snippet,'')) ~ '(quotation|\bquote\b|\boffer\b|angebot|ponuda|eur/t|eur\/t|price/set|price\/set|unit price)')) first_evidence_at,
    max(m.sent_at) filter(where (m.side='outgoing' and lower(coalesce(m.subject,'')) ~ '(\brfq\b|request for quotation|request for offer|request for quote|anfrage.*angebot|zahtev za ponudu|k[eë]rkes[ëe].*ofert)')
      or (m.side='incoming' and lower(coalesce(m.subject,'')||' '||coalesce(m.snippet,'')) ~ '(quotation|\bquote\b|\boffer\b|angebot|ponuda|eur/t|eur\/t|price/set|price\/set|unit price)')) last_evidence_at,
    (array_agg(distinct m.subject) filter(where nullif(trim(m.subject),'') is not null))[1:8] sample_subjects
  from message_domains m where m.domain not in(select domain from public_domains) and m.domain not in ('prissteel.com','pristeel.com') group by m.domain
), partner_domains as (
  select p.id partner_id,lower(regexp_replace(split_part(regexp_replace(coalesce(p.website,''),'^https?://(www\.)?','','i'),'/',1),'^www\.','','i')) domain from public.partners p where nullif(trim(p.website),'') is not null
  union select pc.partner_id,lower(split_part(pc.email,'@',2)) from public.partner_contacts pc where pc.email like '%@%'
), domain_base as (
  select coalesce(cd.domain,ms.domain) domain,cd.contact_ids,cd.kinds,cd.company,cd.country,cd.email,cd.person,
    coalesce(ms.procurement_messages,0) procurement_messages,coalesce(ms.incoming_offer_signals,0) incoming_offer_signals,coalesce(ms.outgoing_rfq_signals,0) outgoing_rfq_signals,
    ms.first_evidence_at,ms.last_evidence_at,ms.sample_subjects from contact_domains cd full join msg_score ms on ms.domain=cd.domain where coalesce(cd.domain,ms.domain) is not null
)
select 'domain:'||d.domain identity_key,coalesce(nullif(trim(d.company),''),split_part(d.domain,'.',1)) company_name,d.domain company_domain,d.country,d.email primary_email,d.person contact_name,
  coalesce(d.contact_ids,'{}'::uuid[]) source_contact_ids,coalesce(d.kinds,'{}'::text[]) contact_kinds,d.procurement_messages,d.incoming_offer_signals,d.outgoing_rfq_signals,d.first_evidence_at,d.last_evidence_at,
  pd.partner_id linked_partner_id,
  case when pd.partner_id is not null then 'linked_existing' when d.incoming_offer_signals>0 or d.outgoing_rfq_signals>0 then 'confirmed_procurement_identity'
    when 'supplier'=any(coalesce(d.kinds,'{}'::text[])) then 'contact_supplier_unverified' else 'review' end identity_status,
  case when pd.partner_id is not null and exists(select 1 from public.supplier_capabilities_v1 sc where sc.partner_id=pd.partner_id and sc.is_active and sc.confidence>=70) then 'profiled'
    when pd.partner_id is not null then 'needs_enrichment' when d.incoming_offer_signals>0 or d.outgoing_rfq_signals>0 then 'needs_supplier_master' else 'unknown' end profile_status,
  jsonb_build_object('domain',d.domain,'sample_subjects',coalesce(to_jsonb(d.sample_subjects),'[]'::jsonb),'source','contacts+project_emails','contact_kinds',coalesce(to_jsonb(d.kinds),'[]'::jsonb)) evidence
from domain_base d left join lateral(select x.partner_id from partner_domains x where x.domain=d.domain order by x.partner_id limit 1) pd on true
where d.procurement_messages>0 or 'supplier'=any(coalesce(d.kinds,'{}'::text[]));

create or replace function public.pppp_supplier_identity_reconcile_v1(p_apply boolean default false)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog,public
as $$
declare r jsonb;
begin
  select jsonb_build_object('mode',case when p_apply then 'apply_not_available_via_readonly_connector' else 'preview' end,'identity_rows',count(*),
    'linked_existing',count(*) filter(where linked_partner_id is not null),'unlinked',count(*) filter(where linked_partner_id is null),
    'confirmed_procurement_unlinked',count(*) filter(where identity_status='confirmed_procurement_identity'),'needs_supplier_master',count(*) filter(where profile_status='needs_supplier_master'),
    'needs_enrichment',count(*) filter(where profile_status='needs_enrichment'),'profiled',count(*) filter(where profile_status='profiled'),'generated_at',now()) into r
  from public.pppp_supplier_identity_reconcile_source_v1;
  return r;
end;
$$;

create or replace view public.pppp_supplier_profile_status_v1
with (security_invoker=true)
as
select s.id,s.identity_key,s.company_name,s.company_domain,s.country,s.primary_email,s.contact_name,s.linked_partner_id,p.name partner_name,p.stage partner_stage,p.business_type,p.categories,p.grades,p.certifications,p.data_confidence,
  s.procurement_messages,s.incoming_offer_signals,s.outgoing_rfq_signals,s.first_evidence_at,s.last_evidence_at,s.identity_status,s.profile_status,s.evidence,
  coalesce((select count(*) from public.supplier_capabilities_v1 sc where sc.partner_id=s.linked_partner_id and sc.is_active),0) capability_rows,
  case when s.linked_partner_id is null and s.procurement_messages>0 then 'register_supplier_master'
    when s.linked_partner_id is not null and coalesce((select count(*) from public.supplier_capabilities_v1 sc where sc.partner_id=s.linked_partner_id and sc.is_active and sc.confidence>=70),0)=0 then 'enrich_profile'
    when s.linked_partner_id is not null then 'ready_or_review_details' else 'review_identity' end recommended_action
from public.supplier_identity_candidates_v1 s left join public.partners p on p.id=s.linked_partner_id;

grant select on public.pppp_supplier_identity_reconcile_source_v1,public.pppp_supplier_profile_status_v1 to authenticated,service_role;

create or replace function public.pppp_supplier_master_background_reconcile_v1(p_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path to pg_catalog,public
as $$
declare r record; v_payload jsonb; v_caps jsonb; v_processed integer:=0; v_snapshot integer:=0; v_limit integer:=least(500,greatest(1,coalesce(p_limit,100)));
begin
  for r in
    with public_domains(domain) as (values ('gmail.com'),('googlemail.com'),('outlook.com'),('hotmail.com'),('live.com'),('yahoo.com'),('icloud.com'),('aol.com'),('gmx.com'),('gmx.de'),('web.de'),('mail.com'),('proton.me'),('protonmail.com')),
    base as (
      select lower(split_part(x.supplier_email,'@',2)) domain,max(nullif(trim(x.supplier_name),'')) supplier_name,
        (array_agg(lower(x.supplier_email) order by coalesce(x.sent_at,x.created_at) desc))[1] email,max(coalesce(x.sent_at,x.created_at)) last_rfq,
        count(*) filter(where x.status='replied' or x.offer_id is not null)::int replied_or_offer
      from public.rfq_log x where x.supplier_email like '%@%' group by lower(split_part(x.supplier_email,'@',2))
    ) select b.* from base b where b.domain not in(select domain from public_domains) and b.domain not in ('prissteel.com','pristeel.com') order by b.last_rfq desc limit v_limit
  loop
    select coalesce(jsonb_agg(cap order by cap->>'family'),'[]'::jsonb) into v_caps from (
      select jsonb_build_object('family',q.family,'product_type',coalesce(q.requirement->>'product_type',q.family),'product_tags',coalesce(q.requirement->'product_types','[]'::jsonb),
        'standards',coalesce(q.requirement->'standards','[]'::jsonb),'grades',coalesce(q.requirement->'grades','[]'::jsonb),'certifications',coalesce(q.requirement->'certifications','[]'::jsonb),
        'length_max_mm',nullif(q.requirement->>'length_mm',''),'source_ref','rfq-domain:'||r.domain,'confidence',case when r.replied_or_offer>0 then 82 else 60 end) cap
      from (select distinct on(req.family) req.family,req.requirement from public.rfq_log rl cross join lateral public.pppp_project_procurement_requirements_v1(rl.project_id) req
        where lower(split_part(coalesce(rl.supplier_email,''),'@',2))=r.domain and rl.project_id is not null order by req.family,coalesce(rl.sent_at,rl.created_at) desc) q
    ) z;
    v_payload:=jsonb_build_object('name',coalesce(r.supplier_name,initcap(split_part(r.domain,'.',1))),'email',r.email,'website','https://'||r.domain,'source','rfq_background_reconcile_v1',
      'data_confidence',case when r.replied_or_offer>0 then 'verified' else 'partial' end,'last_contact_at',r.last_rfq::date,'capabilities',v_caps,
      'evidence',jsonb_build_object('source','rfq_log','source_ref','rfq-domain:'||r.domain,'evidence_type','supplier_relationship',
        'summary',case when r.replied_or_offer>0 then 'Supplier identity confirmed by PPPP RFQ history and response/offer.' else 'Supplier identity recorded as an RFQ recipient in PPPP.' end,
        'direction','outgoing_rfq','evidence_at',r.last_rfq,'confidence',case when r.replied_or_offer>0 then 95 else 88 end,'metadata',jsonb_build_object('domain',r.domain,'replied_or_offer',r.replied_or_offer)));
    perform public.pppp_supplier_master_ingest_v1(v_payload); v_processed:=v_processed+1;
  end loop;
  insert into public.supplier_identity_candidates_v1(identity_key,company_name,company_domain,country,primary_email,contact_name,source_contact_ids,contact_kinds,procurement_messages,incoming_offer_signals,outgoing_rfq_signals,first_evidence_at,last_evidence_at,linked_partner_id,identity_status,profile_status,evidence,updated_at)
  select identity_key,company_name,company_domain,country,primary_email,contact_name,source_contact_ids,contact_kinds,procurement_messages,incoming_offer_signals,outgoing_rfq_signals,first_evidence_at,last_evidence_at,linked_partner_id,identity_status,profile_status,evidence,now()
  from public.pppp_supplier_identity_reconcile_source_v1
  on conflict(identity_key) do update set company_name=excluded.company_name,company_domain=excluded.company_domain,country=coalesce(excluded.country,public.supplier_identity_candidates_v1.country),
    primary_email=coalesce(excluded.primary_email,public.supplier_identity_candidates_v1.primary_email),contact_name=coalesce(excluded.contact_name,public.supplier_identity_candidates_v1.contact_name),
    source_contact_ids=excluded.source_contact_ids,contact_kinds=excluded.contact_kinds,procurement_messages=excluded.procurement_messages,incoming_offer_signals=excluded.incoming_offer_signals,
    outgoing_rfq_signals=excluded.outgoing_rfq_signals,first_evidence_at=excluded.first_evidence_at,last_evidence_at=excluded.last_evidence_at,
    linked_partner_id=coalesce(excluded.linked_partner_id,public.supplier_identity_candidates_v1.linked_partner_id),
    identity_status=case when public.supplier_identity_candidates_v1.identity_status in ('approved','ignored') then public.supplier_identity_candidates_v1.identity_status else excluded.identity_status end,
    profile_status=case when public.supplier_identity_candidates_v1.profile_status='profiled' then 'profiled' else excluded.profile_status end,evidence=excluded.evidence,updated_at=now();
  get diagnostics v_snapshot=row_count;
  return jsonb_build_object('rfq_supplier_domains_processed',v_processed,'identity_snapshot_rows',v_snapshot,'external_email_send',false,'supplier_selection',false,'generated_at',now());
end;
$$;

revoke all on function public.pppp_supplier_master_ingest_v1(jsonb) from public,anon,authenticated;
grant execute on function public.pppp_supplier_master_ingest_v1(jsonb) to service_role;
revoke all on function public.pppp_supplier_master_background_reconcile_v1(integer) from public,anon,authenticated;
grant execute on function public.pppp_supplier_master_background_reconcile_v1(integer) to service_role;
revoke all on function public.pppp_supplier_identity_reconcile_v1(boolean) from public,anon;
grant execute on function public.pppp_supplier_identity_reconcile_v1(boolean) to authenticated,service_role;
grant execute on function public.pppp_supplier_match_v1(jsonb,integer,integer),public.pppp_supplier_coverage_v1(jsonb,integer,integer),public.pppp_supplier_routing_plan_v1(uuid,integer,integer),public.pppp_project_procurement_requirements_v1(uuid) to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_supplier_identity_reconcile_source_v1,public.pppp_supplier_profile_status_v1 to supabase_read_only_user;
    grant execute on function public.pppp_supplier_identity_reconcile_v1(boolean),public.pppp_supplier_match_v1(jsonb,integer,integer),public.pppp_supplier_coverage_v1(jsonb,integer,integer),public.pppp_supplier_routing_plan_v1(uuid,integer,integer),public.pppp_project_procurement_requirements_v1(uuid) to supabase_read_only_user;
  end if;
end $$;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='supplier-master-background-reconcile-daily' loop perform cron.unschedule(j); end loop;
    perform cron.schedule('supplier-master-background-reconcile-daily','37 3 * * *','select public.pppp_supplier_master_background_reconcile_v1(250);');
  end if;
end $$;

commit;
