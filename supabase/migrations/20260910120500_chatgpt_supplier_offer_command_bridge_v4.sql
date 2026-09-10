-- Add canonical supplier-offer registration to the controlled ChatGPT command bridge.
-- This action only records a supplier quotation in public.offers. It never selects a
-- supplier, approves a client selling price, sends an email, or creates a commitment.

create or replace function public.pppp_chatgpt_create_supplier_offer_v1(
  p_command_id text,
  p_project_id uuid,
  p_payload jsonb,
  p_source text default 'chatgpt',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_command_id text := nullif(btrim(p_command_id), '');
  v_source text := coalesce(nullif(btrim(p_source), ''), 'chatgpt');
  v_metadata jsonb := case
    when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object' then coalesce(p_metadata, '{}'::jsonb)
    else '{}'::jsonb
  end;
  v_receipt public.pppp_chatgpt_command_receipts%rowtype;
  v_project public.projects%rowtype;
  v_offer public.offers%rowtype;
  v_supplier text;
  v_currency text;
  v_price_kg numeric := 0;
  v_qty_kg numeric := 0;
  v_mechanical numeric := 0;
  v_packaging numeric := 0;
  v_transport numeric := 0;
  v_total numeric := 0;
  v_total_eur numeric := 0;
  v_fx numeric := 1;
  v_delivery integer;
  v_validity integer;
  v_extra_input jsonb;
  v_extra_positions jsonb := '[]'::jsonb;
  v_extra_total numeric := 0;
  v_extra_item jsonb;
  v_extra_label text;
  v_extra_amount numeric;
  v_extra_index integer := 0;
  v_positions jsonb;
  v_result jsonb;
  v_existing_offer_id uuid;
  v_unknown_key text;
begin
  if v_command_id is null then
    raise exception using errcode = '22023', message = 'command_id_required';
  end if;
  if length(v_command_id) > 240 then
    raise exception using errcode = '22023', message = 'command_id_too_long';
  end if;
  if p_project_id is null then
    raise exception using errcode = '22023', message = 'project_id_required';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'supplier_offer_value_json_must_be_object';
  end if;
  if v_source <> 'chatgpt' then
    raise exception using errcode = '22023', message = 'invalid_supplier_offer_source';
  end if;

  select k into v_unknown_key
  from jsonb_object_keys(p_payload) as x(k)
  where k not in (
    'supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur',
    'transport_eur','extra_positions','delivery_weeks','validity_days',
    'exchange_rate_to_eur','incoterms','cert','notes','payment_terms','inclusions',
    'exclusions','offer_ref','contact_person','source'
  )
  limit 1;
  if v_unknown_key is not null then
    raise exception using errcode = '22023', message = 'supplier_offer_field_not_allowed:' || v_unknown_key;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_command_id, 0));

  select * into v_receipt
  from public.pppp_chatgpt_command_receipts
  where command_id = v_command_id
  for update;

  if not found then
    raise exception using errcode = '42501', message = 'approved_bridge_receipt_required';
  end if;
  if v_receipt.action_type <> 'supplier_offer' then
    raise exception using errcode = '23505', message = 'command_id_conflict';
  end if;
  if lower(coalesce(v_receipt.approval, '')) <> 'approved' then
    raise exception using errcode = '42501', message = 'supplier_offer_command_not_approved';
  end if;

  if v_receipt.status = 'succeeded' then
    begin
      v_existing_offer_id := nullif(v_receipt.result->>'offer_id', '')::uuid;
    exception when others then
      v_existing_offer_id := null;
    end;
    if v_existing_offer_id is not null
       and exists (
         select 1 from public.offers o
         where o.id = v_existing_offer_id and o.project_id = p_project_id
       ) then
      return v_receipt.result || jsonb_build_object('created', false);
    end if;
    raise exception using errcode = '23514', message = 'supplier_offer_receipt_offer_missing';
  end if;

  if v_receipt.status <> 'processing' then
    raise exception using errcode = '42501', message = 'supplier_offer_receipt_not_processing';
  end if;

  select * into v_project from public.projects where id = p_project_id;
  if not found then
    raise exception using errcode = '22023', message = 'project_not_found';
  end if;
  if lower(coalesce(v_project.status, '')) in (
    'humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled'
  ) then
    raise exception using errcode = '23514', message = 'supplier_offer_terminal_project';
  end if;

  v_supplier := nullif(btrim(coalesce(p_payload->>'supplier', '')), '');
  v_currency := upper(btrim(coalesce(nullif(p_payload->>'currency', ''), 'EUR')));
  if v_supplier is null then
    raise exception using errcode = '22023', message = 'supplier_required';
  end if;
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception using errcode = '22023', message = 'valid_currency_required';
  end if;

  begin v_price_kg := replace(coalesce(nullif(p_payload->>'price_kg',''),'0'),',','.')::numeric;
  exception when others then raise exception using errcode = '22023', message = 'invalid_price_kg'; end;
  begin v_qty_kg := replace(coalesce(nullif(p_payload->>'qty_kg',''),'0'),',','.')::numeric;
  exception when others then raise exception using errcode = '22023', message = 'invalid_qty_kg'; end;
  begin v_mechanical := replace(coalesce(nullif(p_payload->>'mechanical_eur',''),'0'),',','.')::numeric;
  exception when others then raise exception using errcode = '22023', message = 'invalid_mechanical_eur'; end;
  begin v_packaging := replace(coalesce(nullif(p_payload->>'packaging_eur',''),'0'),',','.')::numeric;
  exception when others then raise exception using errcode = '22023', message = 'invalid_packaging_eur'; end;
  begin v_transport := replace(coalesce(nullif(p_payload->>'transport_eur',''),'0'),',','.')::numeric;
  exception when others then raise exception using errcode = '22023', message = 'invalid_transport_eur'; end;
  begin v_delivery := nullif(p_payload->>'delivery_weeks','')::integer;
  exception when others then raise exception using errcode = '22023', message = 'invalid_delivery_weeks'; end;
  begin v_validity := nullif(p_payload->>'validity_days','')::integer;
  exception when others then raise exception using errcode = '22023', message = 'invalid_validity_days'; end;

  if least(v_price_kg, v_qty_kg, v_mechanical, v_packaging, v_transport) < 0 then
    raise exception using errcode = '22023', message = 'negative_commercial_values_not_allowed';
  end if;
  if v_price_kg > 0 and v_qty_kg <= 0 then
    raise exception using errcode = '22023', message = 'qty_kg_required_for_kg_pricing';
  end if;
  if v_delivery is not null and v_delivery < 0 then
    raise exception using errcode = '22023', message = 'invalid_delivery_weeks';
  end if;
  if v_validity is not null and v_validity < 0 then
    raise exception using errcode = '22023', message = 'invalid_validity_days';
  end if;

  v_extra_input := coalesce(p_payload->'extra_positions', '[]'::jsonb);
  if jsonb_typeof(v_extra_input) <> 'array' then
    raise exception using errcode = '22023', message = 'extra_positions_must_be_array';
  end if;
  if jsonb_array_length(v_extra_input) > 50 then
    raise exception using errcode = '22023', message = 'too_many_extra_positions';
  end if;

  for v_extra_item in select value from jsonb_array_elements(v_extra_input)
  loop
    if jsonb_typeof(v_extra_item) <> 'object' then
      raise exception using errcode = '22023', message = 'extra_position_must_be_object';
    end if;
    v_extra_label := btrim(coalesce(v_extra_item->>'label', ''));
    if char_length(v_extra_label) > 120 then
      raise exception using errcode = '22023', message = 'extra_position_label_too_long';
    end if;
    begin
      v_extra_amount := replace(coalesce(nullif(v_extra_item->>'amount',''),'0'),',','.')::numeric;
    exception when others then
      raise exception using errcode = '22023', message = 'invalid_extra_position_amount';
    end;
    if v_extra_amount < 0 then
      raise exception using errcode = '22023', message = 'negative_extra_position_not_allowed';
    end if;
    if v_extra_amount > 0 and v_extra_label = '' then
      raise exception using errcode = '22023', message = 'extra_position_label_required';
    end if;
    if v_extra_label <> '' and v_extra_amount <= 0 then
      raise exception using errcode = '22023', message = 'extra_position_amount_must_be_positive';
    end if;
    if v_extra_amount > 0 then
      v_extra_index := v_extra_index + 1;
      v_extra_total := v_extra_total + v_extra_amount;
      v_extra_positions := v_extra_positions || jsonb_build_array(
        jsonb_build_object(
          'type','extra',
          'key','extra_' || v_extra_index::text,
          'desc',v_extra_label,
          'qty',1,
          'unit','Pauschale',
          'unit_price',v_extra_amount,
          'total',v_extra_amount
        )
      );
    end if;
  end loop;

  if v_price_kg <= 0 and (v_mechanical + v_packaging + v_transport + v_extra_total) <= 0 then
    raise exception using errcode = '22023', message = 'positive_commercial_value_required';
  end if;

  if v_currency = 'EUR' then
    v_fx := 1;
  else
    begin v_fx := replace(coalesce(nullif(p_payload->>'exchange_rate_to_eur',''),'0'),',','.')::numeric;
    exception when others then raise exception using errcode = '22023', message = 'invalid_exchange_rate_to_eur'; end;
    if coalesce(v_fx,0) <= 0 then
      raise exception using errcode = '22023', message = 'exchange_rate_to_eur_required';
    end if;
  end if;

  v_total := round((v_price_kg * v_qty_kg + v_mechanical + v_packaging + v_transport + v_extra_total)::numeric, 2);
  v_total_eur := round((v_total * v_fx)::numeric, 2);
  v_positions := jsonb_build_array(
    jsonb_build_object('type','production','desc','Fertigung / Produktion','qty',v_qty_kg,'unit','kg','unit_price',v_price_kg,'total',round(v_price_kg*v_qty_kg,2)),
    jsonb_build_object('type','mechanical','desc','Mechanische Bearbeitung','qty',1,'unit','Pauschale','unit_price',v_mechanical,'total',v_mechanical),
    jsonb_build_object('type','packaging','desc','Verpackung','qty',1,'unit','Pauschale','unit_price',v_packaging,'total',v_packaging),
    jsonb_build_object('type','transport','desc','Transport','qty',1,'unit','Pauschale','unit_price',v_transport,'total',v_transport)
  ) || v_extra_positions;

  insert into public.offers(
    project_id,supplier,price_kg,total_eur,delivery_weeks,incoterms,cert,notes,origin,
    transport_eur,vat_pct,qty_kg,positions,currency,pricing_unit,payment_terms,inclusions,
    exclusions,validity_days,offer_ref,contact_person,raw_text,exchange_rate_to_eur,total_amount,unit_price
  ) values (
    p_project_id,v_supplier,nullif(v_price_kg,0),v_total_eur,v_delivery,
    nullif(btrim(coalesce(p_payload->>'incoterms','')),''),
    nullif(btrim(coalesce(p_payload->>'cert','')),''),
    nullif(btrim(coalesce(p_payload->>'notes','')),''),'chatgpt_bridge',
    v_transport,0,v_qty_kg,v_positions,v_currency,case when v_price_kg>0 then 'kg' else 'total' end,
    nullif(btrim(coalesce(p_payload->>'payment_terms','')),''),
    nullif(btrim(coalesce(p_payload->>'inclusions','')),''),
    nullif(btrim(coalesce(p_payload->>'exclusions','')),''),v_validity,
    nullif(btrim(coalesce(p_payload->>'offer_ref','')),''),
    nullif(btrim(coalesce(p_payload->>'contact_person','')),''),
    concat(
      'ChatGPT controlled supplier offer registration', E'\ncommand_id=', v_command_id,
      E'\nsource=', coalesce(nullif(btrim(coalesce(p_payload->>'source','')),''), v_source),
      E'\nmetadata=', v_metadata::text
    ),
    v_fx,v_total,null
  ) returning * into v_offer;

  v_result := jsonb_build_object(
    'ok',true,
    'command_id',v_command_id,
    'project_id',p_project_id,
    'offer_id',v_offer.id,
    'supplier',v_supplier,
    'currency',v_currency,
    'total_amount',v_total,
    'total_eur',v_total_eur,
    'origin','chatgpt_bridge',
    'created',true,
    'selected',false,
    'human_supplier_selection_required',true
  );

  update public.pppp_chatgpt_command_receipts
  set project_id = p_project_id,
      action_type = 'supplier_offer',
      status = 'succeeded',
      result = v_result,
      processed_at = now(),
      updated_at = now()
  where command_id = v_command_id;

  return v_result;
end;
$function$;

revoke all on function public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb) from public;
revoke all on function public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb) from anon;
revoke all on function public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb) from authenticated;
grant execute on function public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb) to service_role;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v4',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects and canonical supplier-offer registrations from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)'
    ),
    'service_write_functions',jsonb_build_array(
      'public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb)',
      'public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb)'
    ),
    'drive_manifest_title','PPPP — GLOBAL CHATGPT BRIDGE MANIFEST',
    'drive_manifest_id','1Yq_qiZQib7O19Z7eGRiKreqPflfBeazfOL8ZMufrXd4',
    'command_sheet_title','PPPP — ChatGPT Command Bridge',
    'command_sheet_id','1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8',
    'command_tab','Commands',
    'allowed_action_types',jsonb_build_array('context_fact','task','create_project','supplier_offer'),
    'approval_required','approved',
    'processing_interval_minutes',10,
    'protected_actions',jsonb_build_array(
      'external_email_send',
      'supplier_selection_or_commitment',
      'final_selling_price_or_margin',
      'contract_or_purchase_order_commitment',
      'project_won_or_lost_decision'
    ),
    'write_protocol',jsonb_build_object(
      'existing_project_actions_require_real_project_id',true,
      'append_only',true,
      'deduplicate_by','command_id',
      'source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),
      'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'new_project_transport','Append one approved create_project row to the command sheet. Leave project_id blank, put the project name in project_name, and put safe optional fields in value_json. The trusted bridge worker calls the service RPC and returns the real project_id.',
      'create_project_safe_value_json_fields',jsonb_build_array('client','reference','location','deadline','notes','deal_type','business_type'),
      'create_project_idempotent_by','command_id',
      'supplier_offer_transport','Append one approved supplier_offer row for an existing project with its real project_id. The trusted worker records the quotation in canonical public.offers only. This action never selects or commits to the supplier.',
      'supplier_offer_safe_value_json_fields',jsonb_build_array(
        'supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur',
        'extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert',
        'notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'
      ),
      'supplier_offer_idempotent_by','command_id',
      'supplier_offer_never_selects_supplier',true,
      'verify_new_project_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_search_projects_v1(text,integer)'),
      'verify_supplier_offer_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_supplier_comparison_v1(uuid)')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. Preserve all protected human approval gates.'
  );
$function$;
