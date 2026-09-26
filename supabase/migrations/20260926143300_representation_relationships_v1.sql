create table if not exists public.pppp_representation_relationships_v1 (
  id uuid primary key default gen_random_uuid(),
  target_id uuid not null references public.pppp_representation_targets_v1(id) on delete restrict,
  opportunity_id uuid null references public.pppp_representation_opportunities_v1(id) on delete set null,
  source_key text not null unique check (length(btrim(source_key)) between 1 and 500),
  related_company_name text not null check (length(btrim(related_company_name)) between 1 and 500),
  related_company_domain text null,
  related_company_domain_normalized text null,
  related_company_country text null,
  relationship_type text not null default 'unknown'
    check (relationship_type = any (array[
      'joint_venture'::text,'consortium'::text,'subcontractor'::text,'supplier'::text,
      'representative'::text,'distributor'::text,'implementation_partner'::text,
      'local_partner'::text,'other'::text,'unknown'::text
    ])),
  relationship_status text not null default 'unknown'
    check (relationship_status = any (array['current'::text,'historical'::text,'unknown'::text])),
  project_or_tender text null,
  project_reference text null,
  relationship_scope text null,
  verification_status text not null default 'unknown'
    check (verification_status = any (array['unknown'::text,'review'::text,'verified'::text])),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  source_name text null,
  source_url text null check (source_url is null or source_url ~* '^https?://'),
  last_verified_at timestamptz null,
  notes text null,
  created_source text not null default 'manual'
    check (created_source = any (array['manual'::text,'chatgpt'::text,'import'::text])),
  created_source_command_id text null unique,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.pppp_representation_relationships_v1 is
'Historical/current local and regional company relationships for Representation targets: JV, consortium, subcontractor, supplier, representative, distributor and similar. No automatic outreach or partner commitment.';

comment on column public.pppp_representation_relationships_v1.verification_status is
'verified requires evidence; review is a lead requiring human review; unknown is not evidence of absence.';

create index if not exists pppp_repr_relationships_target_idx
  on public.pppp_representation_relationships_v1(target_id, archived_at, updated_at desc);
create index if not exists pppp_repr_relationships_opportunity_idx
  on public.pppp_representation_relationships_v1(opportunity_id, archived_at)
  where opportunity_id is not null;
create index if not exists pppp_repr_relationships_company_idx
  on public.pppp_representation_relationships_v1(lower(related_company_name), lower(coalesce(related_company_country,'')));
create index if not exists pppp_repr_relationships_domain_idx
  on public.pppp_representation_relationships_v1(related_company_domain_normalized)
  where related_company_domain_normalized is not null;

alter table public.pppp_representation_relationships_v1 enable row level security;
revoke all on table public.pppp_representation_relationships_v1 from anon, authenticated;
grant all on table public.pppp_representation_relationships_v1 to service_role;

create or replace function public.pppp_chatgpt_representation_relationships_v1(
  p_target_id uuid default null,
  p_country text default null,
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
    select
      r.*,
      t.company_name as target_company_name,
      o.project_name as opportunity_project_name
    from public.pppp_representation_relationships_v1 r
    join public.pppp_representation_targets_v1 t on t.id=r.target_id
    left join public.pppp_representation_opportunities_v1 o on o.id=r.opportunity_id
    where (p_target_id is null or r.target_id=p_target_id)
      and (nullif(btrim(p_country),'') is null or lower(btrim(r.related_company_country))=lower(btrim(p_country)))
      and (coalesce(p_include_archived,false) or r.archived_at is null)
    order by case r.verification_status when 'verified' then 1 when 'review' then 2 else 3 end, r.updated_at desc
    limit least(500,greatest(1,coalesce(p_limit,100)))
  )
  select jsonb_build_object(
    'ok',true,
    'count',(select count(*) from filtered),
    'relationships',coalesce((select jsonb_agg(to_jsonb(f) order by
      case f.verification_status when 'verified' then 1 when 'review' then 2 else 3 end,
      f.updated_at desc) from filtered f),'[]'::jsonb),
    'policy',jsonb_build_object(
      'absence_is_not_proof_of_no_relationship',true,
      'outreach_requires_separate_human_decision',true,
      'relationship_registration_never_creates_partner_or_contact',true
    )
  );
$$;

revoke all on function public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer) from public, anon;
grant execute on function public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer) to authenticated, service_role;

create or replace function public.pppp_chatgpt_register_representation_relationship_v1(
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
  v_metadata jsonb := case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object'
                           then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_unknown_key text;
  v_target_id uuid;
  v_opportunity_id uuid;
  v_source_key text;
  v_company_name text;
  v_domain text;
  v_rel public.pppp_representation_relationships_v1%rowtype;
  v_existing public.pppp_representation_relationships_v1%rowtype;
begin
  if v_command_id is null then raise exception using errcode='22023',message='command_id_required'; end if;
  if length(v_command_id)>240 then raise exception using errcode='22023',message='command_id_too_long'; end if;
  if coalesce(nullif(btrim(p_source),''),'chatgpt') <> 'chatgpt' then
    raise exception using errcode='22023',message='invalid_representation_relationship_source';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023',message='representation_relationship_value_json_must_be_object';
  end if;

  select k into v_unknown_key
  from jsonb_object_keys(v_payload) x(k)
  where k not in (
    'target_id','opportunity_id','source_key','related_company_name','related_company_domain',
    'related_company_country','relationship_type','relationship_status','project_or_tender',
    'project_reference','relationship_scope','verification_status','evidence','source_name',
    'source_url','last_verified_at','notes'
  )
  limit 1;
  if v_unknown_key is not null then
    raise exception using errcode='22023',message='representation_relationship_field_not_allowed:'||v_unknown_key;
  end if;

  begin
    v_target_id := nullif(btrim(v_payload->>'target_id'),'')::uuid;
  exception when others then
    raise exception using errcode='22023',message='valid_target_id_required';
  end;
  if v_target_id is null or not exists(select 1 from public.pppp_representation_targets_v1 where id=v_target_id) then
    raise exception using errcode='22023',message='valid_target_id_required';
  end if;

  if nullif(btrim(v_payload->>'opportunity_id'),'') is not null then
    begin
      v_opportunity_id := (v_payload->>'opportunity_id')::uuid;
    exception when others then
      raise exception using errcode='22023',message='valid_opportunity_id_required';
    end;
    if not exists(select 1 from public.pppp_representation_opportunities_v1 where id=v_opportunity_id) then
      raise exception using errcode='22023',message='valid_opportunity_id_required';
    end if;
  end if;

  v_source_key := nullif(btrim(v_payload->>'source_key'),'');
  v_company_name := nullif(btrim(v_payload->>'related_company_name'),'');
  v_domain := public.pppp_normalize_company_domain_v1(v_payload->>'related_company_domain');
  if v_source_key is null then raise exception using errcode='22023',message='source_key_required'; end if;
  if v_company_name is null then raise exception using errcode='22023',message='related_company_name_required'; end if;

  if coalesce(nullif(btrim(v_payload->>'relationship_type'),''),'unknown') not in (
    'joint_venture','consortium','subcontractor','supplier','representative','distributor',
    'implementation_partner','local_partner','other','unknown'
  ) then raise exception using errcode='22023',message='invalid_relationship_type'; end if;
  if coalesce(nullif(btrim(v_payload->>'relationship_status'),''),'unknown') not in ('current','historical','unknown') then
    raise exception using errcode='22023',message='invalid_relationship_status';
  end if;
  if coalesce(nullif(btrim(v_payload->>'verification_status'),''),'unknown') not in ('unknown','review','verified') then
    raise exception using errcode='22023',message='invalid_verification_status';
  end if;
  if v_payload ? 'evidence' and jsonb_typeof(v_payload->'evidence') <> 'object' then
    raise exception using errcode='22023',message='evidence_must_be_object';
  end if;
  if nullif(v_payload->>'source_url','') is not null and (v_payload->>'source_url') !~* '^https?://' then
    raise exception using errcode='22023',message='source_url_must_be_http_https';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id,0));
  perform pg_advisory_xact_lock(hashtextextended(v_source_key,1));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id=v_command_id
  for update;
  if not found then raise exception using errcode='42501',message='approved_bridge_receipt_required'; end if;
  if v_receipt.action_type <> 'representation_relationship' then
    raise exception using errcode='23505',message='command_id_conflict';
  end if;
  if lower(coalesce(v_receipt.approval,'')) <> 'approved' then
    raise exception using errcode='42501',message='representation_relationship_command_not_approved';
  end if;
  if v_receipt.status not in ('processing','succeeded') then
    raise exception using errcode='42501',message='representation_relationship_receipt_not_processing';
  end if;

  select * into v_existing
  from public.pppp_representation_relationships_v1
  where created_source_command_id=v_command_id
  limit 1;
  if found then
    return jsonb_build_object(
      'ok',true,'command_id',v_command_id,'relationship_id',v_existing.id,
      'target_id',v_existing.target_id,'created',false,'idempotent_replay',true,
      'partner_created',false,'contact_created',false,'outbound_created',false,
      'external_email_sent',false,'relationship_confirmed_automatically',false,'metadata',v_metadata
    );
  end if;

  select * into v_existing
  from public.pppp_representation_relationships_v1
  where source_key=v_source_key
  limit 1;
  if found then
    raise exception using errcode='23505',
      message='duplicate_representation_relationship_review_required:'||v_existing.id::text;
  end if;

  insert into public.pppp_representation_relationships_v1(
    target_id,opportunity_id,source_key,related_company_name,related_company_domain,
    related_company_domain_normalized,related_company_country,relationship_type,
    relationship_status,project_or_tender,project_reference,relationship_scope,
    verification_status,evidence,source_name,source_url,last_verified_at,notes,
    created_source,created_source_command_id
  ) values (
    v_target_id,v_opportunity_id,v_source_key,v_company_name,
    nullif(btrim(v_payload->>'related_company_domain'),''),
    v_domain,nullif(btrim(v_payload->>'related_company_country'),''),
    coalesce(nullif(btrim(v_payload->>'relationship_type'),''),'unknown'),
    coalesce(nullif(btrim(v_payload->>'relationship_status'),''),'unknown'),
    nullif(btrim(v_payload->>'project_or_tender'),''),
    nullif(btrim(v_payload->>'project_reference'),''),
    nullif(btrim(v_payload->>'relationship_scope'),''),
    coalesce(nullif(btrim(v_payload->>'verification_status'),''),'unknown'),
    case when v_payload ? 'evidence' then v_payload->'evidence' else '{}'::jsonb end,
    nullif(btrim(v_payload->>'source_name'),''),
    nullif(btrim(v_payload->>'source_url'),''),
    case when nullif(v_payload->>'last_verified_at','') is null then null
         else (v_payload->>'last_verified_at')::timestamptz end,
    nullif(btrim(v_payload->>'notes'),''),
    'chatgpt',v_command_id
  )
  returning * into v_rel;

  return jsonb_build_object(
    'ok',true,'command_id',v_command_id,'relationship_id',v_rel.id,
    'target_id',v_rel.target_id,'opportunity_id',v_rel.opportunity_id,
    'related_company_name',v_rel.related_company_name,
    'relationship_type',v_rel.relationship_type,'verification_status',v_rel.verification_status,
    'created',true,'idempotent_replay',false,
    'partner_created',false,'contact_created',false,'outbound_created',false,
    'external_email_sent',false,'relationship_confirmed_automatically',false,
    'metadata',v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_register_representation_relationship_v1(text,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_register_representation_relationship_v1(text,jsonb,text,jsonb) to service_role;

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
set search_path to 'pg_catalog','public'
as $$
  with filtered as (
    select t.*
    from public.pppp_representation_targets_v1 t
    where (coalesce(p_include_archived,false) or t.archived_at is null)
      and (nullif(btrim(p_stage),'') is null or t.stage=btrim(p_stage))
      and (
        nullif(btrim(p_query),'') is null
        or t.company_name ilike '%'||btrim(p_query)||'%'
        or t.company_domain_normalized=public.pppp_normalize_company_domain_v1(p_query)
        or t.source_key=btrim(p_query)
      )
    order by t.priority_score desc nulls last,t.updated_at desc
    limit least(200,greatest(1,coalesce(p_limit,50)))
  ),
  enriched as (
    select f.priority_score,f.updated_at,
      to_jsonb(f) || jsonb_build_object(
        'regional_relationships',
        coalesce((
          select jsonb_agg(to_jsonb(r) order by
            case r.verification_status when 'verified' then 1 when 'review' then 2 else 3 end,
            r.updated_at desc)
          from public.pppp_representation_relationships_v1 r
          where r.target_id=f.id and r.archived_at is null
        ),'[]'::jsonb),
        'regional_relationship_count',
        (select count(*) from public.pppp_representation_relationships_v1 r where r.target_id=f.id and r.archived_at is null)
      ) as target_json
    from filtered f
  )
  select jsonb_build_object(
    'ok',true,
    'count',(select count(*) from enriched),
    'targets',coalesce((select jsonb_agg(e.target_json order by e.priority_score desc nulls last,e.updated_at desc) from enriched e),'[]'::jsonb),
    'human_gates',jsonb_build_object(
      'represented_requires_human_decision',true,
      'external_email_send',true,
      'contract_creation',true,
      'relationship_outreach_requires_human_decision',true
    )
  );
$$;

create or replace function public.pppp_chatgpt_bridge_manifest_v27()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  m jsonb := public.pppp_chatgpt_bridge_manifest_v26();
begin
  m := jsonb_set(m,'{bridge_version}','"chatgpt-command-v27"'::jsonb,true);
  m := jsonb_set(m,'{purpose}',to_jsonb((m->>'purpose') || ' Representation Relationship Intelligence v1 stores evidence-backed current or historical Kosovo/Balkan JV, consortium, subcontractor, supplier, representative, distributor and implementation relationships for Representation targets without creating Partners, Contacts or outbound actions.'),true);
  m := jsonb_set(m,'{read_functions}',coalesce(m->'read_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer)'),true);
  m := jsonb_set(m,'{allowed_action_types}',coalesce(m->'allowed_action_types','[]'::jsonb) || jsonb_build_array('representation_relationship'),true);
  m := jsonb_set(m,'{service_write_functions}',coalesce(m->'service_write_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_register_representation_relationship_v1(text,jsonb,text,jsonb)'),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_transport}',to_jsonb('Append one explicitly approved representation_relationship row to the command sheet for an existing Representation target. The trusted bridge worker calls the service-only RPC. This records evidence only; it never creates a Partner, Contact, Project, contract or outbound email.'::text),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_safe_value_json_fields}',jsonb_build_array('target_id','opportunity_id','source_key','related_company_name','related_company_domain','related_company_country','relationship_type','relationship_status','project_or_tender','project_reference','relationship_scope','verification_status','evidence','source_name','source_url','last_verified_at','notes'),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_types}',jsonb_build_array('joint_venture','consortium','subcontractor','supplier','representative','distributor','implementation_partner','local_partner','other','unknown'),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_statuses}',jsonb_build_array('current','historical','unknown'),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_verification_statuses}',jsonb_build_array('unknown','review','verified'),true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_requires_explicit_approval}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,representation_relationship_never_creates_partner_contact_or_outbound}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,verify_representation_relationship_with}',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer)'),true);
  return m;
end;
$$;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog','public'
as $$ select public.pppp_chatgpt_bridge_manifest_v27(); $$;
