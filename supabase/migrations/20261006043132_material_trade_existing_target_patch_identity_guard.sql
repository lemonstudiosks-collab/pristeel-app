-- Existing-target patches must survive BEFORE INSERT identity validation.
-- Intelligence refresh preserves established outbound workflow state.
-- Only function definitions change; no production target is rewritten here.
do $guard$
begin
  if pg_get_functiondef('public.pppp_chatgpt_upsert_dach_steel_target_v1(text,jsonb,text,jsonb)'::regprocedure) <> $original_write$CREATE OR REPLACE FUNCTION public.pppp_chatgpt_upsert_dach_steel_target_v1(p_command_id text, p_payload jsonb, p_source text DEFAULT 'chatgpt'::text, p_metadata jsonb DEFAULT '{}'::jsonb)
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
$function$
$original_write$
    or pg_get_functiondef('public.pppp_dach_steel_refresh_intelligence_v1(uuid,jsonb)'::regprocedure) <> $original_refresh$CREATE OR REPLACE FUNCTION public.pppp_dach_steel_refresh_intelligence_v1(p_target_id uuid, p_contact jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  intel jsonb;
  c jsonb;
  current_outreach text;
begin
  intel := public.pppp_dach_steel_target_intelligence_v1(p_target_id,p_contact);
  c := intel->'contact';
  select outreach_status into current_outreach from public.pppp_dach_steel_targets_v1 where id=p_target_id;

  update public.pppp_dach_steel_targets_v1
  set canonical_contact_email = nullif(c->>'email',''),
      canonical_contact_name = nullif(c->>'person',''),
      canonical_contact_role = nullif(c->>'role',''),
      contact_tier = coalesce(nullif(intel->>'contact_tier',''),'F'),
      contact_quality_score = coalesce((intel->>'contact_quality_score')::int,0),
      company_fit_score = (intel->>'company_fit_score')::int,
      commercial_timing_score = (intel->>'commercial_timing_score')::int,
      timing_classification = intel->>'timing_classification',
      message_evidence_score = (intel->>'message_evidence_score')::int,
      outreach_readiness_score = (intel->>'outreach_readiness_score')::int,
      workflow_state = intel->>'workflow_state',
      personalization_facts = coalesce(intel->'personalization_facts','[]'::jsonb),
      readiness_reasons = coalesce(intel->'readiness_reasons','[]'::jsonb),
      contact_status = case when c is not null and nullif(c->>'email','') is not null then 'found' else 'missing' end,
      outreach_status = case
        when current_outreach in ('queued','sent','replied','suppressed') then current_outreach
        when intel->>'workflow_state'='ready_for_outreach' then 'ready'
        else 'not_ready'
      end,
      pristeel_offer_model = coalesce(nullif(pristeel_offer_model,''),intel->>'recommended_offer_model'),
      intelligence_profile = intel,
      intelligence_refreshed_at = now(),
      updated_at = now()
  where id=p_target_id;

  return intel;
end;
$function$
$original_refresh$ then
    raise exception 'material_trade_enrichment_changed_during_verification';
  end if;
end;
$guard$;

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

  -- INSERT triggers run before ON CONFLICT. Use the locked existing identity
  -- for omitted fields without turning them into supplied patch fields.
  select * into v_target
  from public.pppp_dach_steel_targets_v1
  where source_key=v_source_key
  for update;
  v_existing_id := v_target.id;
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
    coalesce(nullif(btrim(v_payload->>'company_domain'),''),v_target.company_domain),
    coalesce(nullif(btrim(v_payload->>'company_website'),''),v_target.company_website),
    coalesce(upper(nullif(btrim(v_payload->>'country'),'')),v_target.country),
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


CREATE OR REPLACE FUNCTION public.pppp_dach_steel_refresh_intelligence_v1(p_target_id uuid, p_contact jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  intel jsonb;
  c jsonb;
  current_outreach text;
  current_workflow text;
begin
  intel := public.pppp_dach_steel_target_intelligence_v1(p_target_id,p_contact);
  c := intel->'contact';
  select outreach_status,workflow_state into current_outreach,current_workflow from public.pppp_dach_steel_targets_v1 where id=p_target_id;

  update public.pppp_dach_steel_targets_v1
  set canonical_contact_email = nullif(c->>'email',''),
      canonical_contact_name = nullif(c->>'person',''),
      canonical_contact_role = nullif(c->>'role',''),
      contact_tier = coalesce(nullif(intel->>'contact_tier',''),'F'),
      contact_quality_score = coalesce((intel->>'contact_quality_score')::int,0),
      company_fit_score = (intel->>'company_fit_score')::int,
      commercial_timing_score = (intel->>'commercial_timing_score')::int,
      timing_classification = intel->>'timing_classification',
      message_evidence_score = (intel->>'message_evidence_score')::int,
      outreach_readiness_score = (intel->>'outreach_readiness_score')::int,
      workflow_state = case when current_outreach in ('queued','sent','replied','suppressed') then current_workflow else intel->>'workflow_state' end,
      personalization_facts = coalesce(intel->'personalization_facts','[]'::jsonb),
      readiness_reasons = coalesce(intel->'readiness_reasons','[]'::jsonb),
      contact_status = case when c is not null and nullif(c->>'email','') is not null then 'found' else 'missing' end,
      outreach_status = case
        when current_outreach in ('queued','sent','replied','suppressed') then current_outreach
        when intel->>'workflow_state'='ready_for_outreach' then 'ready'
        else 'not_ready'
      end,
      pristeel_offer_model = coalesce(nullif(pristeel_offer_model,''),intel->>'recommended_offer_model'),
      intelligence_profile = intel,
      intelligence_refreshed_at = now(),
      updated_at = now()
  where id=p_target_id;

  return intel;
end;
$function$;

