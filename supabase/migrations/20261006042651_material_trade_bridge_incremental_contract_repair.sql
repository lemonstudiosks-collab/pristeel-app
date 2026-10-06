do $guard$
begin
  if pg_get_functiondef('public.pppp_chatgpt_upsert_dach_steel_target_v1(text,jsonb,text,jsonb)'::regprocedure) <> $expected$CREATE OR REPLACE FUNCTION public.pppp_chatgpt_upsert_dach_steel_target_v1(p_command_id text, p_payload jsonb, p_source text DEFAULT 'chatgpt'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
$expected$
     or pg_get_functiondef('public.pppp_chatgpt_bridge_manifest_v29()'::regprocedure) <> $expected_manifest$CREATE OR REPLACE FUNCTION public.pppp_chatgpt_bridge_manifest_v29()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  m jsonb := public.pppp_chatgpt_bridge_manifest_v28();
begin
  m := jsonb_set(m,'{bridge_version}','"chatgpt-command-v29"'::jsonb,true);
  m := jsonb_set(m,'{purpose}',to_jsonb((m->>'purpose') || ' Representation Target Update v1 adds controlled in-place enrichment of existing Representation targets with audit history, including verified identity, company intelligence and contact/communication metadata without creating duplicate targets or protected business actions.'),true);
  m := jsonb_set(m,'{read_functions}',coalesce(m->'read_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_representation_target_updates_v1(uuid,integer)'),true);
  m := jsonb_set(m,'{allowed_action_types}',coalesce(m->'allowed_action_types','[]'::jsonb) || jsonb_build_array('representation_target_update'),true);
  m := jsonb_set(m,'{service_write_functions}',coalesce(m->'service_write_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_update_representation_target_v1(text,uuid,jsonb,text,jsonb)'),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_transport}',to_jsonb('Append one explicitly approved representation_target_update row to the command sheet for an existing Representation target. The trusted bridge worker updates only the supplied safe fields in place and writes an audit record. It never creates a duplicate target, Project, Partner, Supplier, Contact, contract or outbound email and never sends email.'::text),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_safe_value_json_fields}',jsonb_build_array(
    'target_id','company_name','company_domain','company_website','country','headquarters',
    'source_name','source_url','sector','product_category','products','product_summary',
    'manufacturer_description','size_band','why_kosovo','market_evidence',
    'relevant_tenders_or_projects','potential_customer_types','strategic_fit_notes',
    'kosovo_presence','existing_partner_name','existing_partner_notes','balkans_presence_notes',
    'target_model','target_territory','stock_required','minimum_purchase_required',
    'local_financing_required','credit_risk_required','estimated_capital_requirement',
    'capital_notes','capital_fit','contact_name','contact_role','contact_email','contact_phone',
    'linkedin_url','contact_source','priority_score','priority_reason','next_action',
    'next_action_due','notes','last_verified_at','stage','last_contact_at',
    'gmail_thread_id','gmail_draft_id','gmail_last_message_id',
    'identity_review_status','identity_review_notes'
  ),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_idempotent_by}',to_jsonb('command_id + target_id'::text),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_preserves_history}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_never_creates_project_partner_supplier_contact_or_contract}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_never_creates_outbound_or_sends_email}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,verify_representation_target_update_with}',jsonb_build_array(
    'public.pppp_chatgpt_command_status_v1(text,integer)',
    'public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)',
    'public.pppp_chatgpt_representation_target_updates_v1(uuid,integer)'
  ),true);
  m := jsonb_set(m,'{operator_shorthand,përditëso target për përfaqësim në PPPP}',to_jsonb('After explicit human approval, append one representation_target_update command for the existing target_id with only verified fields, then verify command status, target read-back and audit history. Never create a duplicate target or send email automatically.'::text),true);
  m := jsonb_set(m,'{global_instruction}',to_jsonb((m->>'global_instruction') || ' For Representation targets, use representation_target_update for verified enrichment of an existing target, including real company identity, company intelligence, contacts and communication metadata. Preserve the stable existing target/source identity, keep an audit trail, and never create a second target merely to update data. Replies and later contact changes should update the existing target through this controlled path; protected commercial decisions and external email sends remain human gated.'),true);
  return m;
end;
$function$
$expected_manifest$ then
    raise exception 'material_trade_bridge_changed_during_inspection';
  end if;
end;
$guard$;

-- Narrow Material Trade bridge repair. Canonical production awqfpnzqwfjrjefoktgd.
-- No business-table DML, no changes to transport, approval gates or worker retries.

CREATE OR REPLACE FUNCTION public.pppp_chatgpt_upsert_dach_steel_target_v1(p_command_id text, p_payload jsonb, p_source text DEFAULT 'chatgpt'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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


  if v_payload ? 'contact_status' and coalesce(v_payload->>'contact_status','') not in ('missing','searching','found','verified') then
    raise exception using errcode='22023',message='invalid_contact_status:allowed=missing,searching,found,verified';
  end if;
  if v_payload ? 'outreach_status' and coalesce(v_payload->>'outreach_status','') not in ('not_ready','ready','queued','sent','replied','suppressed') then
    raise exception using errcode='22023',message='invalid_outreach_status';
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
    source_name=case when v_payload ? 'source_name' then excluded.source_name else public.pppp_dach_steel_targets_v1.source_name end,
    source_url=case when v_payload ? 'source_url' then excluded.source_url else public.pppp_dach_steel_targets_v1.source_url end,
    company_name=case when v_payload ? 'company_name' then excluded.company_name else public.pppp_dach_steel_targets_v1.company_name end,
    company_domain=case when v_payload ? 'company_domain' then excluded.company_domain else public.pppp_dach_steel_targets_v1.company_domain end,
    company_website=case when v_payload ? 'company_website' then excluded.company_website else public.pppp_dach_steel_targets_v1.company_website end,
    country=case when v_payload ? 'country' then excluded.country else public.pppp_dach_steel_targets_v1.country end,
    buyer_type=case when v_payload ? 'buyer_type' then excluded.buyer_type else public.pppp_dach_steel_targets_v1.buyer_type end,
    score_band=case when v_payload ? 'score_band' then excluded.score_band else public.pppp_dach_steel_targets_v1.score_band end,
    target_status=case when v_payload ? 'target_status' then excluded.target_status else public.pppp_dach_steel_targets_v1.target_status end,
    why_now=case when v_payload ? 'why_now' then excluded.why_now else public.pppp_dach_steel_targets_v1.why_now end,
    project_title=case when v_payload ? 'project_title' then excluded.project_title else public.pppp_dach_steel_targets_v1.project_title end,
    project_reference=case when v_payload ? 'project_reference' then excluded.project_reference else public.pppp_dach_steel_targets_v1.project_reference end,
    award_date=case when v_payload ? 'award_date' then excluded.award_date else public.pppp_dach_steel_targets_v1.award_date end,
    procurement_timing=case when v_payload ? 'procurement_timing' then excluded.procurement_timing else public.pppp_dach_steel_targets_v1.procurement_timing end,
    quote_readiness=case when v_payload ? 'quote_readiness' then excluded.quote_readiness else public.pppp_dach_steel_targets_v1.quote_readiness end,
    steel_scope=case when v_payload ? 'steel_scope' then excluded.steel_scope else public.pppp_dach_steel_targets_v1.steel_scope end,
    products=case when v_payload ? 'products' then excluded.products else public.pppp_dach_steel_targets_v1.products end,
    estimated_tonnes=case when v_payload ? 'estimated_tonnes' then excluded.estimated_tonnes else public.pppp_dach_steel_targets_v1.estimated_tonnes end,
    material_revision=case when v_payload ? 'material_revision' then excluded.material_revision else public.pppp_dach_steel_targets_v1.material_revision end,
    material_confidence=case when v_payload ? 'material_confidence' then excluded.material_confidence else public.pppp_dach_steel_targets_v1.material_confidence end,
    material_scope=public.pppp_dach_steel_targets_v1.material_scope || excluded.material_scope,
    evidence=(select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) from (select item,min(ord) ord from jsonb_array_elements(public.pppp_dach_steel_targets_v1.evidence || excluded.evidence) with ordinality e(item,ord) group by item) d),
    contact_status=case when v_payload ? 'contact_status' then excluded.contact_status else public.pppp_dach_steel_targets_v1.contact_status end,
    outreach_status=case when v_payload ? 'outreach_status' then excluded.outreach_status else public.pppp_dach_steel_targets_v1.outreach_status end,
    outbound_source_key=case when v_payload ? 'outbound_source_key' then excluded.outbound_source_key else public.pppp_dach_steel_targets_v1.outbound_source_key end,
    next_action=case when v_payload ? 'next_action' then excluded.next_action else public.pppp_dach_steel_targets_v1.next_action end,
    next_action_due=case when v_payload ? 'next_action_due' then excluded.next_action_due else public.pppp_dach_steel_targets_v1.next_action_due end,
    last_verified_at=case when v_payload ? 'last_verified_at' then excluded.last_verified_at else public.pppp_dach_steel_targets_v1.last_verified_at end,
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
$function$;


CREATE OR REPLACE FUNCTION public.pppp_chatgpt_bridge_manifest_v29()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  m jsonb := public.pppp_chatgpt_bridge_manifest_v28();
begin
  m := jsonb_set(m,'{bridge_version}','"chatgpt-command-v29"'::jsonb,true);
  m := jsonb_set(m,'{purpose}',to_jsonb((m->>'purpose') || ' Representation Target Update v1 adds controlled in-place enrichment of existing Representation targets with audit history, including verified identity, company intelligence and contact/communication metadata without creating duplicate targets or protected business actions.'),true);
  m := jsonb_set(m,'{read_functions}',coalesce(m->'read_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_representation_target_updates_v1(uuid,integer)'),true);
  m := jsonb_set(m,'{allowed_action_types}',coalesce(m->'allowed_action_types','[]'::jsonb) || jsonb_build_array('representation_target_update'),true);
  m := jsonb_set(m,'{service_write_functions}',coalesce(m->'service_write_functions','[]'::jsonb) || jsonb_build_array('public.pppp_chatgpt_update_representation_target_v1(text,uuid,jsonb,text,jsonb)'),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_transport}',to_jsonb('Append one explicitly approved representation_target_update row to the command sheet for an existing Representation target. The trusted bridge worker updates only the supplied safe fields in place and writes an audit record. It never creates a duplicate target, Project, Partner, Supplier, Contact, contract or outbound email and never sends email.'::text),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_safe_value_json_fields}',jsonb_build_array(
    'target_id','company_name','company_domain','company_website','country','headquarters',
    'source_name','source_url','sector','product_category','products','product_summary',
    'manufacturer_description','size_band','why_kosovo','market_evidence',
    'relevant_tenders_or_projects','potential_customer_types','strategic_fit_notes',
    'kosovo_presence','existing_partner_name','existing_partner_notes','balkans_presence_notes',
    'target_model','target_territory','stock_required','minimum_purchase_required',
    'local_financing_required','credit_risk_required','estimated_capital_requirement',
    'capital_notes','capital_fit','contact_name','contact_role','contact_email','contact_phone',
    'linkedin_url','contact_source','priority_score','priority_reason','next_action',
    'next_action_due','notes','last_verified_at','stage','last_contact_at',
    'gmail_thread_id','gmail_draft_id','gmail_last_message_id',
    'identity_review_status','identity_review_notes'
  ),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_idempotent_by}',to_jsonb('command_id + target_id'::text),true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_preserves_history}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_never_creates_project_partner_supplier_contact_or_contract}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,representation_target_update_never_creates_outbound_or_sends_email}','true'::jsonb,true);
  m := jsonb_set(m,'{write_protocol,verify_representation_target_update_with}',jsonb_build_array(
    'public.pppp_chatgpt_command_status_v1(text,integer)',
    'public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)',
    'public.pppp_chatgpt_representation_target_updates_v1(uuid,integer)'
  ),true);
  m := jsonb_set(m,'{operator_shorthand,përditëso target për përfaqësim në PPPP}',to_jsonb('After explicit human approval, append one representation_target_update command for the existing target_id with only verified fields, then verify command status, target read-back and audit history. Never create a duplicate target or send email automatically.'::text),true);
  m := jsonb_set(m,'{global_instruction}',to_jsonb((m->>'global_instruction') || ' For Representation targets, use representation_target_update for verified enrichment of an existing target, including real company identity, company intelligence, contacts and communication metadata. Preserve the stable existing target/source identity, keep an audit trail, and never create a second target merely to update data. Replies and later contact changes should update the existing target through this controlled path; protected commercial decisions and external email sends remain human gated.'),true);
  m := jsonb_set(m,'{write_protocol,dach_steel_target_contact_statuses}',jsonb_build_array('missing','searching','found','verified'),true);
  m := jsonb_set(m,'{write_protocol,dach_steel_target_outreach_statuses}',jsonb_build_array('not_ready','ready','queued','sent','replied','suppressed'),true);
  m := jsonb_set(m,'{write_protocol,material_trade_incremental_enrichment}',jsonb_build_object(
    'patch_semantics','Existing targets retain omitted fields. Evidence is appended and deduplicated; material_scope merges supplied top-level keys. Preserve the existing source_key, company_name and evidence-backed identity.',
    'input','Submit only approved, evidenced missing/high-value fields using the existing dach_steel_target command.',
    'derived_fields',jsonb_build_array('intelligence_profile','intelligence_refreshed_at','intelligence_profile.intelligence_gaps'),
    'refresh','The existing intelligence trigger recalculates the profile after evidence/material/contact-source changes. Do not submit raw calculated intelligence_profile fields.',
    'evidence_shape',jsonb_build_object('url','official source URL','claim','verified factual claim','email','only a published verified email','person','only the named owner of that email when evidenced'),
    'contact_values','Use found for a published contact; verified only with direct verification evidence. verified_public is not a valid status.',
    'failed_commands','Do not automatically replay exhausted failed commands. Review source evidence and validation errors first; never resubmit pending or succeeded commands.'
  ),true);
  return m;
end;
$function$;


-- Read-only execution only; retain SECURITY INVOKER and existing table/RLS access.
grant execute on function public.pppp_chatgpt_dach_steel_target_v1(text) to supabase_read_only_user;
