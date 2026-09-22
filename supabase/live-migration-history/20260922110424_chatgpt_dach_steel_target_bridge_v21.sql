
create or replace function public.pppp_chatgpt_upsert_dach_steel_target_v1(
  p_command_id text,
  p_payload jsonb,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_command_id text := nullif(btrim(p_command_id),'');
  v_source text := coalesce(nullif(btrim(p_source),''),'chatgpt');
  v_payload jsonb := coalesce(p_payload,'{}'::jsonb);
  v_metadata jsonb := case when jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then coalesce(p_metadata,'{}'::jsonb) else '{}'::jsonb end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_unknown_key text;
  v_source_key text;
  v_company_name text;
  v_products text[] := '{}'::text[];
  v_material_scope jsonb := '{}'::jsonb;
  v_evidence jsonb := '[]'::jsonb;
  v_existing_id uuid;
  v_target public.pppp_dach_steel_targets_v1%rowtype;
  v_created boolean := false;
begin
  if v_command_id is null then
    raise exception using errcode='22023', message='command_id_required';
  end if;
  if length(v_command_id)>240 then
    raise exception using errcode='22023', message='command_id_too_long';
  end if;
  if v_source <> 'chatgpt' then
    raise exception using errcode='22023', message='invalid_dach_steel_target_source';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode='22023', message='dach_steel_target_value_json_must_be_object';
  end if;

  select k into v_unknown_key
  from jsonb_object_keys(v_payload) x(k)
  where k not in (
    'source_key','source_name','source_url',
    'company_name','company_domain','company_website','country','buyer_type',
    'score_band','target_status','why_now',
    'project_title','project_reference','award_date','procurement_timing',
    'quote_readiness','steel_scope','products','estimated_tonnes',
    'material_revision','material_confidence','material_scope','evidence',
    'contact_status','outreach_status','outbound_source_key',
    'next_action','next_action_due','last_verified_at'
  )
  limit 1;
  if v_unknown_key is not null then
    raise exception using errcode='22023', message='dach_steel_target_field_not_allowed:'||v_unknown_key;
  end if;

  v_source_key := nullif(btrim(v_payload->>'source_key'),'');
  v_company_name := nullif(btrim(v_payload->>'company_name'),'');
  if v_source_key is null then raise exception using errcode='22023', message='source_key_required'; end if;
  if length(v_source_key)>500 then raise exception using errcode='22023', message='source_key_too_long'; end if;
  if v_company_name is null then raise exception using errcode='22023', message='company_name_required'; end if;
  if length(v_company_name)>500 then raise exception using errcode='22023', message='company_name_too_long'; end if;

  if nullif(v_payload->>'source_url','') is not null
     and (v_payload->>'source_url') !~* '^https?://' then
    raise exception using errcode='22023', message='source_url_must_be_http_https';
  end if;
  if nullif(v_payload->>'company_website','') is not null
     and (v_payload->>'company_website') !~* '^https?://' then
    raise exception using errcode='22023', message='company_website_must_be_http_https';
  end if;

  if v_payload ? 'products' then
    if jsonb_typeof(v_payload->'products') <> 'array' then
      raise exception using errcode='22023', message='products_must_be_array';
    end if;
    if jsonb_array_length(v_payload->'products') > 30 then
      raise exception using errcode='22023', message='too_many_products';
    end if;
    select coalesce(array_agg(value),'{}'::text[]) into v_products
    from jsonb_array_elements_text(v_payload->'products') as t(value);
  end if;

  v_material_scope := coalesce(v_payload->'material_scope','{}'::jsonb);
  if jsonb_typeof(v_material_scope) <> 'object' then
    raise exception using errcode='22023', message='material_scope_must_be_object';
  end if;
  if v_material_scope ? 'line_items' then
    if jsonb_typeof(v_material_scope->'line_items') <> 'array' then
      raise exception using errcode='22023', message='material_scope_line_items_must_be_array';
    end if;
    if jsonb_array_length(v_material_scope->'line_items') > 200 then
      raise exception using errcode='22023', message='too_many_material_line_items';
    end if;
  end if;

  v_evidence := coalesce(v_payload->'evidence','[]'::jsonb);
  if jsonb_typeof(v_evidence) <> 'array' then
    raise exception using errcode='22023', message='evidence_must_be_array';
  end if;
  if jsonb_array_length(v_evidence)>30 then
    raise exception using errcode='22023', message='too_many_evidence_items';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id,0));
  perform pg_advisory_xact_lock(hashtextextended(v_source_key,1));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id=v_command_id
  for update;

  if not found then
    raise exception using errcode='42501', message='approved_bridge_receipt_required';
  end if;
  if v_receipt.action_type <> 'dach_steel_target' then
    raise exception using errcode='23505', message='command_id_conflict';
  end if;
  if lower(coalesce(v_receipt.approval,'')) <> 'approved' then
    raise exception using errcode='42501', message='dach_steel_target_command_not_approved';
  end if;

  if v_receipt.status='succeeded' then
    begin v_existing_id := nullif(v_receipt.result->>'target_id','')::uuid;
    exception when others then v_existing_id := null; end;
    if v_existing_id is not null and exists(select 1 from public.pppp_dach_steel_targets_v1 where id=v_existing_id) then
      return v_receipt.result || jsonb_build_object('created',false,'idempotent_replay',true);
    end if;
    raise exception using errcode='23514', message='dach_steel_target_receipt_target_missing';
  end if;
  if v_receipt.status <> 'processing' then
    raise exception using errcode='42501', message='dach_steel_target_receipt_not_processing';
  end if;

  select id into v_existing_id
  from public.pppp_dach_steel_targets_v1
  where source_key=v_source_key;
  v_created := v_existing_id is null;

  insert into public.pppp_dach_steel_targets_v1(
    source_key,source_name,source_url,
    company_name,company_domain,company_website,country,buyer_type,
    score_band,target_status,why_now,
    project_title,project_reference,award_date,procurement_timing,
    quote_readiness,steel_scope,products,estimated_tonnes,
    material_revision,material_confidence,material_scope,evidence,
    contact_status,outreach_status,outbound_source_key,
    next_action,next_action_due,last_verified_at,updated_at
  ) values (
    v_source_key,
    nullif(btrim(v_payload->>'source_name'),''),
    nullif(btrim(v_payload->>'source_url'),''),
    v_company_name,
    nullif(btrim(v_payload->>'company_domain'),''),
    nullif(btrim(v_payload->>'company_website'),''),
    upper(nullif(btrim(v_payload->>'country'),'')),
    nullif(btrim(v_payload->>'buyer_type'),''),
    coalesce(nullif(btrim(v_payload->>'score_band'),''),'B1'),
    coalesce(nullif(btrim(v_payload->>'target_status'),''),'watch'),
    nullif(btrim(v_payload->>'why_now'),''),
    nullif(btrim(v_payload->>'project_title'),''),
    nullif(btrim(v_payload->>'project_reference'),''),
    case when nullif(v_payload->>'award_date','') is null then null else (v_payload->>'award_date')::date end,
    nullif(btrim(v_payload->>'procurement_timing'),''),
    coalesce(nullif(btrim(v_payload->>'quote_readiness'),''),'M0'),
    nullif(btrim(v_payload->>'steel_scope'),''),
    v_products,
    case when nullif(v_payload->>'estimated_tonnes','') is null then null else (v_payload->>'estimated_tonnes')::numeric end,
    nullif(btrim(v_payload->>'material_revision'),''),
    case when nullif(v_payload->>'material_confidence','') is null then null else (v_payload->>'material_confidence')::numeric end,
    v_material_scope,
    v_evidence,
    coalesce(nullif(btrim(v_payload->>'contact_status'),''),'missing'),
    coalesce(nullif(btrim(v_payload->>'outreach_status'),''),'not_ready'),
    nullif(btrim(v_payload->>'outbound_source_key'),''),
    nullif(btrim(v_payload->>'next_action'),''),
    case when nullif(v_payload->>'next_action_due','') is null then null else (v_payload->>'next_action_due')::date end,
    case when nullif(v_payload->>'last_verified_at','') is null then now() else (v_payload->>'last_verified_at')::timestamptz end,
    now()
  )
  on conflict(source_key) do update set
    source_name=excluded.source_name,
    source_url=excluded.source_url,
    company_name=excluded.company_name,
    company_domain=excluded.company_domain,
    company_website=excluded.company_website,
    country=excluded.country,
    buyer_type=excluded.buyer_type,
    score_band=excluded.score_band,
    target_status=excluded.target_status,
    why_now=excluded.why_now,
    project_title=excluded.project_title,
    project_reference=excluded.project_reference,
    award_date=excluded.award_date,
    procurement_timing=excluded.procurement_timing,
    quote_readiness=excluded.quote_readiness,
    steel_scope=excluded.steel_scope,
    products=excluded.products,
    estimated_tonnes=excluded.estimated_tonnes,
    material_revision=excluded.material_revision,
    material_confidence=excluded.material_confidence,
    material_scope=excluded.material_scope,
    evidence=excluded.evidence,
    contact_status=excluded.contact_status,
    outreach_status=excluded.outreach_status,
    outbound_source_key=excluded.outbound_source_key,
    next_action=excluded.next_action,
    next_action_due=excluded.next_action_due,
    last_verified_at=excluded.last_verified_at,
    updated_at=now()
  returning * into v_target;

  return jsonb_build_object(
    'ok',true,
    'command_id',v_command_id,
    'target_id',v_target.id,
    'source_key',v_target.source_key,
    'company_name',v_target.company_name,
    'score_band',v_target.score_band,
    'quote_readiness',v_target.quote_readiness,
    'created',v_created,
    'project_created',false,
    'partner_created',false,
    'contact_created',false,
    'outbound_created',false,
    'external_email_sent',false,
    'human_email_approval_required',true,
    'metadata',v_metadata
  );
end;
$$;

revoke all on function public.pppp_chatgpt_upsert_dach_steel_target_v1(text,jsonb,text,jsonb) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_upsert_dach_steel_target_v1(text,jsonb,text,jsonb) to service_role;

create or replace function public.pppp_chatgpt_dach_steel_target_v1(p_source_key text)
returns jsonb
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce(
    (select to_jsonb(t) from public.pppp_dach_steel_targets_v1 t where t.source_key=nullif(btrim(p_source_key),'') limit 1),
    '{}'::jsonb
  );
$$;

revoke all on function public.pppp_chatgpt_dach_steel_target_v1(text) from public, anon;
grant execute on function public.pppp_chatgpt_dach_steel_target_v1(text) to authenticated, service_role;

alter function public.pppp_chatgpt_bridge_manifest_v1() rename to pppp_chatgpt_bridge_manifest_v20;

create function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v jsonb := public.pppp_chatgpt_bridge_manifest_v20();
begin
  v := jsonb_set(v,'{bridge_version}',to_jsonb('chatgpt-command-v21'::text),true);
  v := jsonb_set(v,'{purpose}',to_jsonb((v->>'purpose') || ' DACH Steel Buyer Target v1 adds controlled, approved, idempotent registration of qualified DE/AT/CH direct steel-supply targets and compact evidence-backed Material Intelligence without creating projects, partners, contacts, outbound rows or email sends.'),true);
  v := jsonb_set(v,'{allowed_action_types}',coalesce(v->'allowed_action_types','[]'::jsonb) || '["dach_steel_target"]'::jsonb,true);
  v := jsonb_set(v,'{read_functions}',coalesce(v->'read_functions','[]'::jsonb) || '["public.pppp_chatgpt_dach_steel_target_v1(text)"]'::jsonb,true);
  v := jsonb_set(v,'{service_write_functions}',coalesce(v->'service_write_functions','[]'::jsonb) || '["public.pppp_chatgpt_upsert_dach_steel_target_v1(text,jsonb,text,jsonb)"]'::jsonb,true);
  v := jsonb_set(
    v,'{write_protocol}',
    coalesce(v->'write_protocol','{}'::jsonb) || jsonb_build_object(
      'dach_steel_target_transport','Append one approved dach_steel_target row to the command sheet with qualified evidence in value_json. The trusted bridge worker calls the service-only target RPC.',
      'dach_steel_target_safe_value_json_fields',jsonb_build_array(
        'source_key','source_name','source_url','company_name','company_domain','company_website','country','buyer_type',
        'score_band','target_status','why_now','project_title','project_reference','award_date','procurement_timing',
        'quote_readiness','steel_scope','products','estimated_tonnes','material_revision','material_confidence',
        'material_scope','evidence','contact_status','outreach_status','outbound_source_key','next_action','next_action_due','last_verified_at'
      ),
      'dach_steel_target_idempotent_by','command_id + source_key',
      'dach_steel_target_never_creates_project',true,
      'dach_steel_target_never_creates_partner_or_contact',true,
      'dach_steel_target_never_creates_outbound_or_sends_email',true,
      'verify_dach_steel_target_with',jsonb_build_array('public.pppp_chatgpt_dach_steel_target_v1(text)','public.pppp_chatgpt_command_status_v1(text,integer)')
    ),true
  );
  v := jsonb_set(
    v,'{operator_shorthand}',
    coalesce(v->'operator_shorthand','{}'::jsonb) || jsonb_build_object(
      'regjistro Steel Buyer target në PPPP','Append one explicitly approved dach_steel_target command for a qualified DACH steel buyer. Registration never creates a Project, Partner, Contact, outbound row or email send.'
    ),true
  );
  return v;
end;
$$;

