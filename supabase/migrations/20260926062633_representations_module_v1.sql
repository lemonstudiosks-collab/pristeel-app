-- PriSteel Representations v1
-- Dedicated manufacturer-representation pipeline. This module is intentionally
-- separate from Projects, Partners, Suppliers, Material Trade and outbound email.

create or replace function public.pppp_normalize_company_domain_v1(p_value text)
returns text
language sql
immutable
security invoker
set search_path = pg_catalog
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(coalesce(p_value,''))), '^https?://', ''),
        '^www\.', ''
      ),
      '[/#:?].*$', ''
    ),
    ''
  );
$$;

revoke all on function public.pppp_normalize_company_domain_v1(text) from public, anon;
grant execute on function public.pppp_normalize_company_domain_v1(text) to authenticated, service_role;

create table public.pppp_representation_targets_v1 (
  id uuid primary key default gen_random_uuid(),
  company_name text not null check (length(btrim(company_name)) between 1 and 500),
  company_domain text,
  company_domain_normalized text,
  company_website text,
  country text,
  headquarters text,
  source_key text not null check (length(btrim(source_key)) between 1 and 500),
  source_name text,
  source_url text,

  sector text,
  product_category text,
  products text[] not null default '{}'::text[],
  product_summary text,
  manufacturer_description text,
  size_band text,

  why_kosovo text,
  market_evidence text,
  relevant_tenders_or_projects text,
  potential_customer_types text,
  strategic_fit_notes text,

  kosovo_presence text not null default 'unknown'
    check (kosovo_presence in ('unknown','none_found','indirect','distributor','representative','own_office')),
  existing_partner_name text,
  existing_partner_notes text,
  balkans_presence_notes text,

  target_model text not null default 'unknown'
    check (target_model in ('commercial_agent','market_development_partner','distributor_no_stock','distributor_with_stock','project_based_representation','unknown')),
  target_territory text not null default 'Kosovo',

  stock_required boolean,
  minimum_purchase_required boolean,
  local_financing_required boolean,
  credit_risk_required boolean,
  estimated_capital_requirement text,
  capital_notes text,
  capital_fit text not null default 'unknown'
    check (capital_fit in ('good','review','poor','unknown')),

  contact_name text,
  contact_role text,
  contact_email text,
  contact_phone text,
  linkedin_url text,
  contact_source text,

  stage text not null default 'found'
    check (stage in ('found','verified','contact_ready','draft_ready','contacted','replied','meeting','negotiation','pilot','represented','closed')),
  priority_score integer check (priority_score between 0 and 100),
  priority_reason text,
  last_contact_at timestamptz,
  next_action text,
  next_action_due date,
  notes text,

  gmail_thread_id text,
  gmail_draft_id text,
  gmail_last_message_id text,

  proposed_commission_pct numeric(7,4) check (proposed_commission_pct is null or proposed_commission_pct between 0 and 100),
  agreed_commission_pct numeric(7,4) check (agreed_commission_pct is null or agreed_commission_pct between 0 and 100),
  proposed_retainer numeric(14,2) check (proposed_retainer is null or proposed_retainer >= 0),
  exclusivity_status text,
  agreement_status text,
  territory_agreed text,
  commercial_notes text,

  identity_review_status text not null default 'clear'
    check (identity_review_status in ('clear','review')),
  identity_review_notes text,
  archive_reason text,
  archived_at timestamptz,
  created_source text not null default 'manual'
    check (created_source in ('manual','chatgpt','import')),
  created_source_command_id text,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pppp_representation_website_url_check
    check (company_website is null or company_website ~* '^https?://'),
  constraint pppp_representation_source_url_check
    check (source_url is null or source_url ~* '^https?://'),
  constraint pppp_representation_linkedin_url_check
    check (linkedin_url is null or linkedin_url ~* '^https?://'),
  constraint pppp_representation_contact_email_check
    check (contact_email is null or contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint pppp_representation_archive_check
    check (archived_at is null or archive_reason is not null)
);

comment on table public.pppp_representation_targets_v1 is
  'Dedicated PriSteel manufacturer-representation pipeline. No automatic Project, Partner, Supplier, Contact, contract or outbound-email side effects.';
comment on column public.pppp_representation_targets_v1.stage is
  'Human-controlled pipeline. represented is never assigned by automation.';
comment on column public.pppp_representation_targets_v1.company_domain_normalized is
  'Canonical duplicate-protection key derived from official domain or website.';

create or replace function public.pppp_representation_targets_normalize_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
begin
  new.company_name := btrim(new.company_name);
  new.source_key := btrim(new.source_key);
  new.company_domain := nullif(lower(btrim(new.company_domain)),'');
  new.company_website := nullif(btrim(new.company_website),'');
  new.country := nullif(btrim(new.country),'');
  new.contact_email := lower(nullif(btrim(new.contact_email),''));
  new.company_domain_normalized := public.pppp_normalize_company_domain_v1(
    coalesce(new.company_domain,new.company_website)
  );
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.pppp_representation_targets_normalize_v1() from public, anon, authenticated;

create trigger pppp_representation_targets_normalize_v1
before insert or update on public.pppp_representation_targets_v1
for each row execute function public.pppp_representation_targets_normalize_v1();

create unique index pppp_representation_targets_source_key_uidx
  on public.pppp_representation_targets_v1(source_key);
create unique index pppp_representation_targets_domain_uidx
  on public.pppp_representation_targets_v1(company_domain_normalized)
  where company_domain_normalized is not null;
create unique index pppp_representation_targets_name_country_uidx
  on public.pppp_representation_targets_v1(lower(btrim(company_name)), lower(btrim(country)))
  where country is not null;
create unique index pppp_representation_targets_command_uidx
  on public.pppp_representation_targets_v1(created_source_command_id)
  where created_source_command_id is not null;
create index pppp_representation_targets_pipeline_idx
  on public.pppp_representation_targets_v1(stage, priority_score desc nulls last)
  where archived_at is null;
create index pppp_representation_targets_filters_idx
  on public.pppp_representation_targets_v1(country, sector, capital_fit)
  where archived_at is null;
create index pppp_representation_targets_next_action_idx
  on public.pppp_representation_targets_v1(next_action_due)
  where archived_at is null and next_action_due is not null;

alter table public.pppp_representation_targets_v1 enable row level security;
revoke all on table public.pppp_representation_targets_v1 from public, anon;
grant select, insert, update, delete on table public.pppp_representation_targets_v1 to authenticated;
grant all privileges on table public.pppp_representation_targets_v1 to service_role, postgres;

create policy pppp_representation_targets_authenticated_read
  on public.pppp_representation_targets_v1
  for select to authenticated
  using (true);

create policy pppp_representation_targets_authenticated_insert
  on public.pppp_representation_targets_v1
  for insert to authenticated
  with check ((select public.can_write()));

create policy pppp_representation_targets_authenticated_update
  on public.pppp_representation_targets_v1
  for update to authenticated
  using ((select public.can_write()))
  with check ((select public.can_write()));

create policy pppp_representation_targets_authenticated_delete
  on public.pppp_representation_targets_v1
  for delete to authenticated
  using ((select public.can_write()));

create or replace function public.pppp_chatgpt_representation_targets_v1(
  p_query text default null,
  p_stage text default null,
  p_include_archived boolean default false,
  p_limit integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with filtered as (
    select t.*
    from public.pppp_representation_targets_v1 t
    where (coalesce(p_include_archived,false) or t.archived_at is null)
      and (nullif(btrim(p_stage),'') is null or t.stage = btrim(p_stage))
      and (
        nullif(btrim(p_query),'') is null
        or t.company_name ilike '%' || btrim(p_query) || '%'
        or t.company_domain_normalized = public.pppp_normalize_company_domain_v1(p_query)
        or t.source_key = btrim(p_query)
      )
    order by t.priority_score desc nulls last, t.updated_at desc
    limit least(200,greatest(1,coalesce(p_limit,50)))
  )
  select jsonb_build_object(
    'ok',true,
    'count',(select count(*) from filtered),
    'targets',coalesce((select jsonb_agg(to_jsonb(f) order by f.priority_score desc nulls last,f.updated_at desc) from filtered f),'[]'::jsonb),
    'human_gates',jsonb_build_object(
      'represented_requires_human_decision',true,
      'external_email_send',true,
      'contract_creation',true
    )
  );
$$;

revoke all on function public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer) from public, anon;
grant execute on function public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer) to authenticated, service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)
      to supabase_read_only_user;
  end if;
end
$$;

create or replace function public.pppp_chatgpt_register_representation_target_v1(
  p_command_id text,
  p_payload jsonb,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_command_id text := nullif(btrim(p_command_id),'');
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
  v_metadata jsonb := case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_unknown_key text;
  v_source_key text;
  v_company_name text;
  v_country text;
  v_domain text;
  v_products text[] := '{}'::text[];
  v_existing public.pppp_representation_targets_v1%rowtype;
  v_target public.pppp_representation_targets_v1%rowtype;
begin
  if v_command_id is null then raise exception using errcode='22023',message='command_id_required'; end if;
  if length(v_command_id)>240 then raise exception using errcode='22023',message='command_id_too_long'; end if;
  if coalesce(nullif(btrim(p_source),''),'chatgpt') <> 'chatgpt' then
    raise exception using errcode='22023',message='invalid_representation_target_source';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023',message='representation_target_value_json_must_be_object';
  end if;

  select k into v_unknown_key
  from jsonb_object_keys(v_payload) x(k)
  where k not in (
    'source_key','source_name','source_url','company_name','company_domain','company_website',
    'country','headquarters','sector','product_category','products','product_summary',
    'manufacturer_description','size_band','why_kosovo','market_evidence',
    'relevant_tenders_or_projects','potential_customer_types','strategic_fit_notes',
    'kosovo_presence','existing_partner_name','existing_partner_notes','balkans_presence_notes',
    'target_model','target_territory','stock_required','minimum_purchase_required',
    'local_financing_required','credit_risk_required','estimated_capital_requirement',
    'capital_notes','capital_fit','contact_name','contact_role','contact_email','contact_phone',
    'linkedin_url','contact_source','priority_score','priority_reason','next_action',
    'next_action_due','notes','last_verified_at'
  )
  limit 1;
  if v_unknown_key is not null then
    raise exception using errcode='22023',message='representation_target_field_not_allowed:'||v_unknown_key;
  end if;

  v_source_key := nullif(btrim(v_payload->>'source_key'),'');
  v_company_name := nullif(btrim(v_payload->>'company_name'),'');
  v_country := nullif(btrim(v_payload->>'country'),'');
  v_domain := public.pppp_normalize_company_domain_v1(coalesce(v_payload->>'company_domain',v_payload->>'company_website'));
  if v_source_key is null then raise exception using errcode='22023',message='source_key_required'; end if;
  if v_company_name is null then raise exception using errcode='22023',message='company_name_required'; end if;
  if nullif(v_payload->>'company_website','') is not null and (v_payload->>'company_website') !~* '^https?://' then
    raise exception using errcode='22023',message='company_website_must_be_http_https';
  end if;
  if nullif(v_payload->>'source_url','') is not null and (v_payload->>'source_url') !~* '^https?://' then
    raise exception using errcode='22023',message='source_url_must_be_http_https';
  end if;
  if nullif(v_payload->>'contact_email','') is not null
     and (v_payload->>'contact_email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception using errcode='22023',message='valid_contact_email_required';
  end if;
  if v_payload ? 'products' then
    if jsonb_typeof(v_payload->'products') <> 'array' then
      raise exception using errcode='22023',message='products_must_be_array';
    end if;
    if jsonb_array_length(v_payload->'products') > 50 then
      raise exception using errcode='22023',message='too_many_products';
    end if;
    select coalesce(array_agg(nullif(btrim(value),'')) filter (where nullif(btrim(value),'') is not null),'{}'::text[])
      into v_products
    from jsonb_array_elements_text(v_payload->'products') t(value);
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id,0));
  perform pg_advisory_xact_lock(hashtextextended(coalesce(v_domain,v_source_key),1));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id=v_command_id
  for update;
  if not found then raise exception using errcode='42501',message='approved_bridge_receipt_required'; end if;
  if v_receipt.action_type <> 'representation_target' then
    raise exception using errcode='23505',message='command_id_conflict';
  end if;
  if lower(coalesce(v_receipt.approval,'')) <> 'approved' then
    raise exception using errcode='42501',message='representation_target_command_not_approved';
  end if;
  if v_receipt.status not in ('processing','succeeded') then
    raise exception using errcode='42501',message='representation_target_receipt_not_processing';
  end if;

  select * into v_existing
  from public.pppp_representation_targets_v1
  where created_source_command_id=v_command_id
  limit 1;
  if found then
    return jsonb_build_object(
      'ok',true,'command_id',v_command_id,'target_id',v_existing.id,
      'source_key',v_existing.source_key,'company_name',v_existing.company_name,
      'created',false,'idempotent_replay',true,'stage',v_existing.stage,
      'project_created',false,'partner_created',false,'contact_created',false,
      'supplier_created',false,'outbound_created',false,'contract_created',false,
      'external_email_sent',false,'represented_automatically',false,'metadata',v_metadata
    );
  end if;

  select * into v_existing
  from public.pppp_representation_targets_v1 t
  where t.source_key=v_source_key
     or (v_domain is not null and t.company_domain_normalized=v_domain)
     or (v_country is not null and lower(btrim(t.company_name))=lower(v_company_name) and lower(btrim(t.country))=lower(v_country))
  order by case when t.source_key=v_source_key then 1 when t.company_domain_normalized=v_domain then 2 else 3 end
  limit 1;
  if found then
    raise exception using errcode='23505',
      message='duplicate_representation_target_review_required:'||v_existing.id::text;
  end if;

  insert into public.pppp_representation_targets_v1(
    company_name,company_domain,company_website,country,headquarters,
    source_key,source_name,source_url,sector,product_category,products,product_summary,
    manufacturer_description,size_band,why_kosovo,market_evidence,relevant_tenders_or_projects,
    potential_customer_types,strategic_fit_notes,kosovo_presence,existing_partner_name,
    existing_partner_notes,balkans_presence_notes,target_model,target_territory,
    stock_required,minimum_purchase_required,local_financing_required,credit_risk_required,
    estimated_capital_requirement,capital_notes,capital_fit,contact_name,contact_role,
    contact_email,contact_phone,linkedin_url,contact_source,stage,priority_score,
    priority_reason,next_action,next_action_due,notes,created_source,
    created_source_command_id,last_verified_at
  ) values (
    v_company_name,nullif(btrim(v_payload->>'company_domain'),''),
    nullif(btrim(v_payload->>'company_website'),''),v_country,
    nullif(btrim(v_payload->>'headquarters'),''),v_source_key,
    nullif(btrim(v_payload->>'source_name'),''),nullif(btrim(v_payload->>'source_url'),''),
    nullif(btrim(v_payload->>'sector'),''),nullif(btrim(v_payload->>'product_category'),''),
    v_products,nullif(btrim(v_payload->>'product_summary'),''),
    nullif(btrim(v_payload->>'manufacturer_description'),''),nullif(btrim(v_payload->>'size_band'),''),
    nullif(btrim(v_payload->>'why_kosovo'),''),nullif(btrim(v_payload->>'market_evidence'),''),
    nullif(btrim(v_payload->>'relevant_tenders_or_projects'),''),
    nullif(btrim(v_payload->>'potential_customer_types'),''),
    nullif(btrim(v_payload->>'strategic_fit_notes'),''),
    coalesce(nullif(btrim(v_payload->>'kosovo_presence'),''),'unknown'),
    nullif(btrim(v_payload->>'existing_partner_name'),''),
    nullif(btrim(v_payload->>'existing_partner_notes'),''),
    nullif(btrim(v_payload->>'balkans_presence_notes'),''),
    coalesce(nullif(btrim(v_payload->>'target_model'),''),'unknown'),
    coalesce(nullif(btrim(v_payload->>'target_territory'),''),'Kosovo'),
    case when v_payload ? 'stock_required' then (v_payload->>'stock_required')::boolean else null end,
    case when v_payload ? 'minimum_purchase_required' then (v_payload->>'minimum_purchase_required')::boolean else null end,
    case when v_payload ? 'local_financing_required' then (v_payload->>'local_financing_required')::boolean else null end,
    case when v_payload ? 'credit_risk_required' then (v_payload->>'credit_risk_required')::boolean else null end,
    nullif(btrim(v_payload->>'estimated_capital_requirement'),''),
    nullif(btrim(v_payload->>'capital_notes'),''),
    coalesce(nullif(btrim(v_payload->>'capital_fit'),''),'unknown'),
    nullif(btrim(v_payload->>'contact_name'),''),nullif(btrim(v_payload->>'contact_role'),''),
    lower(nullif(btrim(v_payload->>'contact_email'),'')),nullif(btrim(v_payload->>'contact_phone'),''),
    nullif(btrim(v_payload->>'linkedin_url'),''),nullif(btrim(v_payload->>'contact_source'),''),
    'found',
    case when nullif(v_payload->>'priority_score','') is null then null else (v_payload->>'priority_score')::integer end,
    nullif(btrim(v_payload->>'priority_reason'),''),nullif(btrim(v_payload->>'next_action'),''),
    case when nullif(v_payload->>'next_action_due','') is null then null else (v_payload->>'next_action_due')::date end,
    nullif(btrim(v_payload->>'notes'),''),'chatgpt',v_command_id,
    case when nullif(v_payload->>'last_verified_at','') is null then null else (v_payload->>'last_verified_at')::timestamptz end
  )
  returning * into v_target;

  return jsonb_build_object(
    'ok',true,'command_id',v_command_id,'target_id',v_target.id,
    'source_key',v_target.source_key,'company_name',v_target.company_name,
    'created',true,'idempotent_replay',false,'stage',v_target.stage,
    'project_created',false,'partner_created',false,'contact_created',false,
    'supplier_created',false,'outbound_created',false,'contract_created',false,
    'external_email_sent',false,'represented_automatically',false,'metadata',v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_register_representation_target_v1(text,jsonb,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_register_representation_target_v1(text,jsonb,text,jsonb)
  to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v26()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb := public.pppp_chatgpt_bridge_manifest_v25();
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v26'::text),true);
  v := jsonb_set(
    v,'{purpose}',
    to_jsonb(coalesce(v->>'purpose','') || ' Representation Targets v1 adds a separate manufacturer-representation pipeline with controlled approved idempotent target registration. It never creates Projects, Partners, Suppliers, Contacts, contracts, outbound rows or email sends, and never marks a target represented automatically.'),
    true
  );
  v := jsonb_set(v,'{allowed_action_types}',coalesce(v->'allowed_action_types','[]'::jsonb) || '["representation_target"]'::jsonb,true);
  v := jsonb_set(v,'{read_functions}',coalesce(v->'read_functions','[]'::jsonb) || '["public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)"]'::jsonb,true);
  v := jsonb_set(v,'{service_write_functions}',coalesce(v->'service_write_functions','[]'::jsonb) || '["public.pppp_chatgpt_register_representation_target_v1(text,jsonb,text,jsonb)"]'::jsonb,true);
  v := jsonb_set(
    v,'{write_protocol}',
    coalesce(v->'write_protocol','{}'::jsonb) || jsonb_build_object(
      'representation_target_transport','Append one explicitly approved representation_target row to the command sheet. The trusted bridge worker calls the service-only RPC.',
      'representation_target_idempotent_by','command_id',
      'representation_target_duplicate_hierarchy',jsonb_build_array('normalized official domain','official website/domain','exact company name + country','stable source_key'),
      'representation_target_safe_value_json_fields',jsonb_build_array(
        'source_key','source_name','source_url','company_name','company_domain','company_website',
        'country','headquarters','sector','product_category','products','product_summary',
        'manufacturer_description','size_band','why_kosovo','market_evidence',
        'relevant_tenders_or_projects','potential_customer_types','strategic_fit_notes',
        'kosovo_presence','existing_partner_name','existing_partner_notes','balkans_presence_notes',
        'target_model','target_territory','stock_required','minimum_purchase_required',
        'local_financing_required','credit_risk_required','estimated_capital_requirement',
        'capital_notes','capital_fit','contact_name','contact_role','contact_email','contact_phone',
        'linkedin_url','contact_source','priority_score','priority_reason','next_action',
        'next_action_due','notes','last_verified_at'
      ),
      'representation_target_requires_explicit_approval',true,
      'representation_target_never_creates_project_partner_supplier_contact_or_contract',true,
      'representation_target_never_creates_outbound_or_sends_email',true,
      'representation_target_never_sets_represented_automatically',true,
      'verify_representation_target_with',jsonb_build_array(
        'public.pppp_chatgpt_command_status_v1(text,integer)',
        'public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)'
      )
    ),
    true
  );
  v := jsonb_set(
    v,'{operator_shorthand}',
    coalesce(v->'operator_shorthand','{}'::jsonb) || jsonb_build_object(
      'regjistro target për përfaqësim në PPPP','After explicit human approval, append one representation_target command, then verify command status and read back the target. Never send email or create another business entity.'
    ),
    true
  );
  return v;
end;
$$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v26() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v26() to service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_bridge_manifest_v26() to supabase_read_only_user;
  end if;
end
$$;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $$ select public.pppp_chatgpt_bridge_manifest_v26(); $$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role;

do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to supabase_read_only_user;
  end if;
end
$$;

