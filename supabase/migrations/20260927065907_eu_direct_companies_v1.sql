create table if not exists public.pppp_eu_direct_targets_v1 (
  id uuid primary key default gen_random_uuid(),
  source_key text not null unique,
  company_name text not null,
  company_domain text not null,
  company_domain_normalized text not null,
  company_website text,
  country text,
  country_code text,
  company_type text not null default 'gc_gu',
  business_scope text[] not null default '{}'::text[],
  why_relevant text,
  evidence jsonb not null default '[]'::jsonb,
  source_name text,
  source_url text,
  discovery_source text not null default 'web_search',
  stage text not null default 'found',
  priority_score integer not null default 0,
  contact_name text,
  contact_role text,
  contact_email text,
  contact_source_url text,
  contact_status text not null default 'unknown',
  outreach_status text not null default 'not_ready',
  do_not_contact boolean not null default false,
  gmail_draft_id text,
  gmail_thread_id text,
  last_contact_at timestamptz,
  next_action text,
  next_action_due date,
  notes text,
  last_verified_at timestamptz,
  archived_at timestamptz,
  archive_reason text,
  created_source text not null default 'chatgpt',
  created_source_command_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pppp_eu_direct_source_key_check check (source_key ~ '^eud:[a-z]{2}:[a-z0-9.-]+$'),
  constraint pppp_eu_direct_company_type_check check (company_type in ('gc_gu','epc_industrial','industrial_contractor','developer','manufacturer','steel_contractor','other_direct_client')),
  constraint pppp_eu_direct_stage_check check (stage in ('found','verified','contact_ready','draft_ready','contacted','replied','qualified','closed')),
  constraint pppp_eu_direct_contact_status_check check (contact_status in ('unknown','found','verified','review')),
  constraint pppp_eu_direct_outreach_status_check check (outreach_status in ('not_ready','ready','draft','contacted','replied','qualified','blocked','review')),
  constraint pppp_eu_direct_priority_check check (priority_score between 0 and 100),
  constraint pppp_eu_direct_evidence_check check (jsonb_typeof(evidence) in ('array','object'))
);

create unique index if not exists pppp_eu_direct_targets_domain_uq
  on public.pppp_eu_direct_targets_v1(company_domain_normalized)
  where archived_at is null;

create index if not exists pppp_eu_direct_targets_stage_idx
  on public.pppp_eu_direct_targets_v1(stage, priority_score desc, updated_at desc);

create or replace function public.pppp_eu_direct_target_normalize_v1()
returns trigger
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $$
declare
  v_domain text;
begin
  v_domain := public.pppp_normalize_company_domain_v1(coalesce(nullif(new.company_domain,''), nullif(new.company_website,'')));
  if nullif(v_domain,'') is null then
    raise exception using errcode='22023', message='company_domain_required';
  end if;
  new.company_domain_normalized := v_domain;
  new.company_domain := v_domain;
  if nullif(new.company_website,'') is null then new.company_website := 'https://' || v_domain; end if;
  if nullif(new.country_code,'') is not null then new.country_code := upper(btrim(new.country_code)); end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_pppp_eu_direct_target_normalize_v1 on public.pppp_eu_direct_targets_v1;
create trigger trg_pppp_eu_direct_target_normalize_v1
before insert or update on public.pppp_eu_direct_targets_v1
for each row execute function public.pppp_eu_direct_target_normalize_v1();

alter table public.pppp_eu_direct_targets_v1 enable row level security;

drop policy if exists pppp_eu_direct_targets_authenticated_read on public.pppp_eu_direct_targets_v1;
create policy pppp_eu_direct_targets_authenticated_read
on public.pppp_eu_direct_targets_v1 for select to authenticated
using (true);

drop policy if exists pppp_eu_direct_targets_authenticated_insert on public.pppp_eu_direct_targets_v1;
create policy pppp_eu_direct_targets_authenticated_insert
on public.pppp_eu_direct_targets_v1 for insert to authenticated
with check ((select public.can_write()));

drop policy if exists pppp_eu_direct_targets_authenticated_update on public.pppp_eu_direct_targets_v1;
create policy pppp_eu_direct_targets_authenticated_update
on public.pppp_eu_direct_targets_v1 for update to authenticated
using ((select public.can_write()))
with check ((select public.can_write()));

drop policy if exists pppp_eu_direct_targets_authenticated_delete on public.pppp_eu_direct_targets_v1;
create policy pppp_eu_direct_targets_authenticated_delete
on public.pppp_eu_direct_targets_v1 for delete to authenticated
using ((select public.can_write()));

grant select on public.pppp_eu_direct_targets_v1 to authenticated;
grant insert,update,delete on public.pppp_eu_direct_targets_v1 to authenticated;

create or replace view public.pppp_eu_direct_operational_v1
with (security_invoker=true)
as
with base as (
  select
    t.id,
    'canonical'::text as record_origin,
    t.source_key,
    t.company_name,
    t.company_domain,
    t.company_domain_normalized,
    t.company_website,
    t.country,
    t.country_code,
    t.company_type,
    t.business_scope,
    t.why_relevant,
    t.evidence,
    t.source_name,
    t.source_url,
    t.discovery_source,
    t.stage,
    t.priority_score,
    t.contact_name,
    t.contact_role,
    t.contact_email,
    t.contact_source_url,
    t.contact_status,
    t.outreach_status,
    t.do_not_contact,
    t.gmail_draft_id,
    t.gmail_thread_id,
    t.last_contact_at,
    t.next_action,
    t.next_action_due,
    t.notes,
    t.last_verified_at,
    t.archived_at,
    t.archive_reason,
    t.created_at,
    t.updated_at
  from public.pppp_eu_direct_targets_v1 t

  union all

  select
    g.id,
    'historike_gc'::text,
    ('legacy-gc:' || g.id::text)::text,
    g.company_name,
    public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url)),
    public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url)),
    g.website_url,
    g.country,
    g.country_code,
    case
      when lower(coalesce(g.company_type,'')) like '%gc%' or lower(coalesce(g.company_type,'')) like '%gu%' then 'gc_gu'
      else 'other_direct_client'
    end,
    array_remove(array[nullif(g.pristeel_offer_model,''),nullif(g.secondary_pristeel_offer_model,'')],null)::text[],
    coalesce(nullif(g.pristeel_offer_model,''),'Klient i drejtpërdrejtë për kapacitet dhe paketa çeliku të fabrikuar.'),
    g.evidence,
    g.discovery_source,
    g.source_url,
    g.discovery_source,
    case
      when g.replied_at is not null then 'replied'
      when g.first_sent_at is not null or g.second_sent_at is not null then 'contacted'
      when g.first_draft_id is not null or g.second_draft_id is not null then 'draft_ready'
      when nullif(g.contact_email,'') is not null then 'contact_ready'
      else 'verified'
    end,
    greatest(0,least(100,coalesce(g.relevance_score,0))),
    g.contact_name,
    g.contact_role,
    g.contact_email,
    g.contact_source_url,
    case when nullif(g.contact_email,'') is not null then 'verified' else 'unknown' end,
    case
      when g.replied_at is not null then 'replied'
      when g.first_sent_at is not null or g.second_sent_at is not null then 'contacted'
      when g.first_draft_id is not null or g.second_draft_id is not null then 'draft'
      else 'not_ready'
    end,
    g.do_not_contact,
    coalesce(g.second_draft_id,g.first_draft_id),
    g.first_gmail_thread_id,
    greatest(g.second_sent_at,g.first_sent_at,g.replied_at),
    null::text,
    g.followup_due_date,
    null::text,
    g.researched_at,
    null::timestamptz,
    null::text,
    g.first_discovered_at,
    g.updated_at
  from public.pppp_gc_prospects_v1 g
  where g.discovery_source='manual_web_verified_2026-09-22'
    and not exists (
      select 1 from public.pppp_eu_direct_targets_v1 t
      where t.archived_at is null
        and t.company_domain_normalized=public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url))
    )
),
flags as (
  select b.*,
    exists (
      select 1 from public.pppp_dach_steel_targets_v1 m
      where m.target_status <> 'archived'
        and public.pppp_normalize_company_domain_v1(coalesce(m.company_domain,m.company_website))=b.company_domain_normalized
    ) as in_material_trade,
    exists (
      select 1 from public.pppp_representation_targets_v1 r
      where r.archived_at is null
        and r.company_domain_normalized=b.company_domain_normalized
    ) as in_representations,
    exists (
      select 1 from public.pppp_opportunity_company_profiles_v1 o
      where public.pppp_normalize_company_domain_v1(o.domain)=b.company_domain_normalized
    ) as in_opportunities,
    exists (
      select 1 from public.pppp_outbound_queue_v1 q
      where (
        public.pppp_normalize_company_domain_v1(q.company_domain)=b.company_domain_normalized
        or split_part(lower(coalesce(q.recipient_email,'')),'@',2)=b.company_domain_normalized
      )
        and q.gmail_draft_id is not null
        and q.sent_at is null
        and coalesce(q.status,'') not in ('suppressed','closed')
    ) as has_active_draft,
    greatest(
      (select max(q.sent_at) from public.pppp_outbound_queue_v1 q
       where public.pppp_normalize_company_domain_v1(q.company_domain)=b.company_domain_normalized
          or split_part(lower(coalesce(q.recipient_email,'')),'@',2)=b.company_domain_normalized),
      (select max(o.sent_at) from public.pppp_opportunity_outreach_registry_v1 o
       where split_part(lower(coalesce(o.recipient_email,'')),'@',2)=b.company_domain_normalized),
      b.last_contact_at
    ) as last_outbound_at,
    (select max(c.last_contact)::timestamptz
     from public.pppp_contact_master_v1 c
     where split_part(lower(coalesce(c.email,'')),'@',2)=b.company_domain_normalized
        or lower(btrim(coalesce(c.company,'')))=lower(btrim(b.company_name))
    ) as contact_master_last_contact,
    exists (
      select 1 from public.pppp_contact_master_v1 c
      where split_part(lower(coalesce(c.email,'')),'@',2)=b.company_domain_normalized
         or lower(btrim(coalesce(c.company,'')))=lower(btrim(b.company_name))
    ) as known_in_contact_master
  from base b
),
guarded as (
  select f.*,
    array_remove(array[
      case when f.in_material_trade then 'material_trade' end,
      case when f.in_representations then 'representations' end,
      case when f.in_opportunities then 'opportunities' end
    ],null)::text[] as routing_conflicts,
    case
      when f.do_not_contact then 'blocked'
      when f.has_active_draft then 'existing_draft'
      when greatest(f.last_outbound_at,f.contact_master_last_contact) >= now()-interval '30 days' then 'cooldown_30d'
      when f.in_material_trade or f.in_representations or f.in_opportunities then 'routing_review'
      when greatest(f.last_outbound_at,f.contact_master_last_contact) is not null then 'contacted_before'
      else 'clear'
    end as outreach_guard,
    case
      when f.in_material_trade or f.in_representations or f.in_opportunities then 'review'
      else 'clear'
    end as routing_state
  from flags f
)
select * from guarded;

grant select on public.pppp_eu_direct_operational_v1 to authenticated;

create or replace function public.pppp_chatgpt_eu_direct_targets_v1(
  p_query text default null,
  p_include_archived boolean default false,
  p_limit integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
  with filtered as (
    select v.*
    from public.pppp_eu_direct_operational_v1 v
    where (coalesce(p_include_archived,false) or v.archived_at is null)
      and (
        nullif(btrim(p_query),'') is null
        or v.company_name ilike '%'||btrim(p_query)||'%'
        or v.company_domain_normalized=public.pppp_normalize_company_domain_v1(p_query)
        or v.contact_email ilike '%'||btrim(p_query)||'%'
        or v.source_key=btrim(p_query)
      )
    order by v.priority_score desc, v.updated_at desc
    limit least(500,greatest(1,coalesce(p_limit,100)))
  )
  select jsonb_build_object(
    'ok',true,
    'count',(select count(*) from filtered),
    'targets',coalesce((select jsonb_agg(to_jsonb(f) order by f.priority_score desc,f.updated_at desc) from filtered f),'[]'::jsonb),
    'routing',jsonb_build_object(
      'opportunities','Tenderë/projekte konkrete; TED jashtë Kosovës përdoret për ndjekjen e fituesve, ndërsa tenderët e Kosovës mund të ndiqen për pjesëmarrje direkte ose partneritet.',
      'material_trade','Vetëm blerës të lëndës së parë: pllaka, tuba, profile, trarë, shufra dhe materiale të ngjashme.',
      'representations','Prodhues ose kompani për përfaqësim, partner lokal, JV, konsorcium ose hyrje në tregun e Kosovës/Ballkanit.',
      'eu_direct','Klientë të drejtpërdrejtë në Evropë për paketa çeliku të fabrikuar, kapacitet prodhues ose nënkontraktim, kur nuk hyjnë në tri grupet e tjera.'
    ),
    'human_gates',jsonb_build_object('external_email_send',true,'project_creation',true,'commercial_commitment',true)
  );
$$;

revoke all on function public.pppp_chatgpt_eu_direct_targets_v1(text,boolean,integer) from public,anon;
grant execute on function public.pppp_chatgpt_eu_direct_targets_v1(text,boolean,integer) to authenticated,service_role,postgres;
do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    execute 'grant execute on function public.pppp_chatgpt_eu_direct_targets_v1(text,boolean,integer) to supabase_read_only_user';
  end if;
end$$;

create or replace function public.pppp_chatgpt_register_eu_direct_target_v1(
  p_command_id text,
  p_payload jsonb,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_command_id text := nullif(btrim(p_command_id),'');
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
  v_metadata jsonb := coalesce(p_metadata,'{}'::jsonb);
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_existing public.pppp_eu_direct_targets_v1%rowtype;
  v_target public.pppp_eu_direct_targets_v1%rowtype;
  v_domain text;
  v_country_code text;
  v_source_key text;
  v_conflicts text[] := '{}'::text[];
  v_history boolean := false;
  v_last_contact timestamptz;
  v_contact_status text;
  v_outreach_status text;
begin
  if v_command_id is null then raise exception using errcode='22023',message='command_id_required'; end if;
  if jsonb_typeof(v_payload) <> 'object' then raise exception using errcode='22023',message='payload_must_be_object'; end if;
  if nullif(btrim(v_payload->>'company_name'),'') is null then raise exception using errcode='22023',message='company_name_required'; end if;

  v_domain := public.pppp_normalize_company_domain_v1(coalesce(nullif(v_payload->>'company_domain',''),nullif(v_payload->>'company_website','')));
  if nullif(v_domain,'') is null then raise exception using errcode='22023',message='company_domain_required'; end if;

  v_country_code := lower(nullif(btrim(v_payload->>'country_code'),''));
  if v_country_code is null or v_country_code !~ '^[a-z]{2}$' then raise exception using errcode='22023',message='country_code_required_iso2'; end if;

  v_source_key := nullif(btrim(v_payload->>'source_key'),'');
  if v_source_key is null then v_source_key := 'eud:'||v_country_code||':'||v_domain; end if;
  if v_source_key !~ '^eud:[a-z]{2}:[a-z0-9.-]+$' then raise exception using errcode='22023',message='invalid_eu_direct_source_key'; end if;

  if coalesce(nullif(v_payload->>'discovery_source',''),'web_search') not in ('web_search','company_website','industry_directory','manual_research','historical_import') then
    raise exception using errcode='22023',message='invalid_eu_direct_discovery_source';
  end if;
  if coalesce(nullif(v_payload->>'company_type',''),'gc_gu') not in ('gc_gu','epc_industrial','industrial_contractor','developer','manufacturer','steel_contractor','other_direct_client') then
    raise exception using errcode='22023',message='invalid_eu_direct_company_type';
  end if;
  if v_payload ? 'business_scope' and jsonb_typeof(v_payload->'business_scope') <> 'array' then
    raise exception using errcode='22023',message='business_scope_must_be_array';
  end if;
  if v_payload ? 'evidence' and jsonb_typeof(v_payload->'evidence') not in ('array','object') then
    raise exception using errcode='22023',message='evidence_must_be_array_or_object';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id,0));
  perform pg_advisory_xact_lock(hashtextextended(v_domain,1));

  select * into v_receipt from public.pppp_chatgpt_command_receipts
  where command_id=v_command_id for update;
  if not found then raise exception using errcode='42501',message='approved_bridge_receipt_required'; end if;
  if v_receipt.action_type <> 'eu_direct_target' then raise exception using errcode='23505',message='command_id_conflict'; end if;
  if lower(coalesce(v_receipt.approval,'')) <> 'approved' then raise exception using errcode='42501',message='eu_direct_target_command_not_approved'; end if;
  if v_receipt.status not in ('processing','succeeded') then raise exception using errcode='42501',message='eu_direct_target_receipt_not_processing'; end if;

  select * into v_existing from public.pppp_eu_direct_targets_v1
  where created_source_command_id=v_command_id limit 1;
  if found then
    return jsonb_build_object(
      'ok',true,'command_id',v_command_id,'target_id',v_existing.id,'created',false,'idempotent_replay',true,
      'project_created',false,'partner_created',false,'contact_created',false,'outbound_created',false,
      'external_email_sent',false,'human_email_approval_required',true,'metadata',v_metadata
    );
  end if;

  select * into v_existing from public.pppp_eu_direct_targets_v1
  where archived_at is null and company_domain_normalized=v_domain limit 1;
  if found then
    raise exception using errcode='23505',message='duplicate_eu_direct_target_review_required:'||v_existing.id::text;
  end if;

  if exists (
    select 1 from public.pppp_gc_prospects_v1 g
    where g.discovery_source='manual_web_verified_2026-09-22'
      and public.pppp_normalize_company_domain_v1(coalesce(g.company_domain,g.website_url))=v_domain
  ) then
    raise exception using errcode='23505',message='legacy_eu_direct_company_already_known';
  end if;

  if exists(select 1 from public.pppp_dach_steel_targets_v1 m where m.target_status <> 'archived' and public.pppp_normalize_company_domain_v1(coalesce(m.company_domain,m.company_website))=v_domain) then
    v_conflicts := array_append(v_conflicts,'material_trade');
  end if;
  if exists(select 1 from public.pppp_representation_targets_v1 r where r.archived_at is null and r.company_domain_normalized=v_domain) then
    v_conflicts := array_append(v_conflicts,'representations');
  end if;
  if exists(select 1 from public.pppp_opportunity_company_profiles_v1 o where public.pppp_normalize_company_domain_v1(o.domain)=v_domain) then
    v_conflicts := array_append(v_conflicts,'opportunities');
  end if;
  if cardinality(v_conflicts)>0 then
    raise exception using errcode='23505',message='cross_module_identity_review_required:'||array_to_string(v_conflicts,',');
  end if;

  select coalesce(max(x.at),null),count(*)>0
  into v_last_contact,v_history
  from (
    select q.sent_at as at from public.pppp_outbound_queue_v1 q
    where public.pppp_normalize_company_domain_v1(q.company_domain)=v_domain
       or split_part(lower(coalesce(q.recipient_email,'')),'@',2)=v_domain
    union all
    select o.sent_at from public.pppp_opportunity_outreach_registry_v1 o
    where split_part(lower(coalesce(o.recipient_email,'')),'@',2)=v_domain
    union all
    select c.last_contact::timestamptz from public.pppp_contact_master_v1 c
    where split_part(lower(coalesce(c.email,'')),'@',2)=v_domain
       or lower(btrim(coalesce(c.company,'')))=lower(btrim(v_payload->>'company_name'))
  ) x
  where x.at is not null;

  v_contact_status := case when nullif(v_payload->>'contact_email','') is not null then 'found' else 'unknown' end;
  v_outreach_status := case when v_history then 'review' when nullif(v_payload->>'contact_email','') is not null then 'ready' else 'not_ready' end;

  insert into public.pppp_eu_direct_targets_v1(
    source_key,company_name,company_domain,company_domain_normalized,company_website,
    country,country_code,company_type,business_scope,why_relevant,evidence,source_name,source_url,
    discovery_source,stage,priority_score,contact_name,contact_role,contact_email,contact_source_url,
    contact_status,outreach_status,do_not_contact,last_contact_at,next_action,next_action_due,notes,
    last_verified_at,created_source,created_source_command_id
  ) values (
    v_source_key,btrim(v_payload->>'company_name'),v_domain,v_domain,
    coalesce(nullif(v_payload->>'company_website',''),'https://'||v_domain),
    nullif(btrim(v_payload->>'country'),''),upper(v_country_code),
    coalesce(nullif(v_payload->>'company_type',''),'gc_gu'),
    case when v_payload ? 'business_scope' then array(select jsonb_array_elements_text(v_payload->'business_scope')) else '{}'::text[] end,
    nullif(v_payload->>'why_relevant',''),
    coalesce(v_payload->'evidence','[]'::jsonb),
    nullif(v_payload->>'source_name',''),nullif(v_payload->>'source_url',''),
    coalesce(nullif(v_payload->>'discovery_source',''),'web_search'),
    case when nullif(v_payload->>'contact_email','') is not null then 'contact_ready' else 'verified' end,
    least(100,greatest(0,coalesce((v_payload->>'priority_score')::integer,0))),
    nullif(v_payload->>'contact_name',''),nullif(v_payload->>'contact_role',''),
    nullif(lower(btrim(v_payload->>'contact_email')),''),nullif(v_payload->>'contact_source_url',''),
    v_contact_status,v_outreach_status,coalesce((v_payload->>'do_not_contact')::boolean,false),
    v_last_contact,nullif(v_payload->>'next_action',''),
    case when nullif(v_payload->>'next_action_due','') is null then null else (v_payload->>'next_action_due')::date end,
    nullif(v_payload->>'notes',''),
    case when nullif(v_payload->>'last_verified_at','') is null then now() else (v_payload->>'last_verified_at')::timestamptz end,
    'chatgpt',v_command_id
  ) returning * into v_target;

  return jsonb_build_object(
    'ok',true,'command_id',v_command_id,'target_id',v_target.id,'source_key',v_target.source_key,
    'company_name',v_target.company_name,'company_domain',v_target.company_domain_normalized,
    'created',true,'idempotent_replay',false,'historical_contact_found',v_history,
    'outreach_status',v_target.outreach_status,
    'project_created',false,'partner_created',false,'contact_created',false,'outbound_created',false,
    'external_email_sent',false,'human_email_approval_required',true,'metadata',v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_register_eu_direct_target_v1(text,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_register_eu_direct_target_v1(text,jsonb,text,jsonb) to service_role,postgres;

create or replace function public.pppp_chatgpt_bridge_manifest_v28()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  m jsonb := public.pppp_chatgpt_bridge_manifest_v27();
begin
  m := jsonb_set(m,'{bridge_version}','"chatgpt-command-v28"'::jsonb,true);
  m := jsonb_set(m,'{purpose}',to_jsonb((m->>'purpose') || ' EU Direct Companies v1 adds a separate direct-business pipeline for European clients seeking fabricated-steel packages, external production capacity or subcontracted fabrication. It excludes tender/opportunity targets, raw-material buyers and representation targets, while sharing identity and outbound-history guards across modules.'),true);
  m := jsonb_set(m,'{read_functions}',coalesce(m->'read_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_eu_direct_targets_v1(text,boolean,integer)'),true);
  m := jsonb_set(m,'{allowed_action_types}',coalesce(m->'allowed_action_types','[]'::jsonb) || jsonb_build_array('eu_direct_target'),true);
  m := jsonb_set(m,'{service_write_functions}',coalesce(m->'service_write_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_register_eu_direct_target_v1(text,jsonb,text,jsonb)'),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_transport}',to_jsonb('Append one explicitly approved eu_direct_target row to the command sheet. The trusted bridge worker calls the service-only RPC after cross-module identity checks. Registration creates only the EU Direct target; it never creates Projects, Partners, Contacts, outbound rows or email sends.'::text),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_safe_value_json_fields}',jsonb_build_array(
    'source_key','company_name','company_domain','company_website','country','country_code','company_type',
    'business_scope','why_relevant','evidence','source_name','source_url','discovery_source','priority_score',
    'contact_name','contact_role','contact_email','contact_source_url','do_not_contact','next_action',
    'next_action_due','notes','last_verified_at'
  ),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_idempotent_by}',to_jsonb('command_id + normalized official domain'::text),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_duplicate_hierarchy}',jsonb_build_array('normalized official domain','verified contact email','exact company name + country'),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_routing_exclusions}',jsonb_build_array('Mundësitë / opportunity company profiles','Material – Ofertë / Material Trade','Përfaqësime / Representation'),true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_never_creates_project_partner_contact_or_outbound}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,eu_direct_target_never_sends_email}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,verify_eu_direct_target_with}',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_eu_direct_targets_v1(text,boolean,integer)'),true);
  m := jsonb_set(m,'{operator_shorthand,regjistro kompani EU direkte në PPPP}',to_jsonb('After explicit approval, append one eu_direct_target command only after checking that the company does not belong to Mundësitë, Material – Ofertë or Përfaqësime; then verify command status and read back the target. Never send email automatically.'::text),true);
  m := jsonb_set(m,'{global_instruction}',to_jsonb((m->>'global_instruction') || ' For EU Direct company discovery, use the separate EU Direct pipeline only for direct European clients for fabricated-steel packages, external production capacity, overflow capacity or subcontracted fabrication. Do not route TED or other tender-winner leads here when they belong to Mundësitë. Do not route raw-material buyers here; they belong to Material Trade. Do not route representation/JV/local-market-entry targets here; they belong to Representation. Before any EU Direct registration or outreach preparation, check normalized company domain, verified contact identity and shared outbound history across modules. Existing contact history must be preserved and never treated as a new untouched lead.'),true);
  return m;
end;
$$;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog','public'
as $$ select public.pppp_chatgpt_bridge_manifest_v28(); $$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v28() from public,anon;
grant execute on function public.pppp_chatgpt_bridge_manifest_v28() to authenticated,service_role,postgres;
do $$
begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    execute 'grant execute on function public.pppp_chatgpt_bridge_manifest_v28() to supabase_read_only_user';
  end if;
end$$;
