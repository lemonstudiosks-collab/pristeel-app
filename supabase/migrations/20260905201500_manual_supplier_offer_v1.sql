-- Human-gated manual supplier offer intake for quotes received outside Gmail.
-- Creates a canonical offers row only. Supplier selection remains a separate explicit human action.
create or replace function public.pppp_create_manual_supplier_offer_v1(p_project_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog','public'
as $function$
declare
  v_project public.projects%rowtype;
  v_offer public.offers%rowtype;
  v_supplier text := btrim(coalesce(p_payload->>'supplier',''));
  v_currency text := upper(btrim(coalesce(p_payload->>'currency','EUR')));
  v_price_kg numeric;
  v_qty_kg numeric;
  v_mechanical numeric;
  v_packaging numeric;
  v_transport numeric;
  v_total numeric;
  v_total_eur numeric;
  v_fx numeric;
  v_delivery integer;
  v_validity integer;
  v_positions jsonb;
  v_actor uuid := auth.uid();
  v_actor_email text := coalesce(auth.jwt()->>'email','');
  v_now timestamptz := now();
begin
  if v_actor is null or not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'Manual supplier offer payload is required';
  end if;
  if v_supplier = '' then raise exception 'Supplier is required'; end if;
  if v_currency !~ '^[A-Z]{3}$' then raise exception 'Valid 3-letter currency is required'; end if;

  begin v_price_kg := replace(coalesce(nullif(p_payload->>'price_kg',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid price_kg'; end;
  begin v_qty_kg := replace(coalesce(nullif(p_payload->>'qty_kg',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid qty_kg'; end;
  begin v_mechanical := replace(coalesce(nullif(p_payload->>'mechanical_eur',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid mechanical_eur'; end;
  begin v_packaging := replace(coalesce(nullif(p_payload->>'packaging_eur',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid packaging_eur'; end;
  begin v_transport := replace(coalesce(nullif(p_payload->>'transport_eur',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid transport_eur'; end;
  begin v_delivery := nullif(p_payload->>'delivery_weeks','')::integer; exception when others then raise exception 'Invalid delivery_weeks'; end;
  begin v_validity := nullif(p_payload->>'validity_days','')::integer; exception when others then raise exception 'Invalid validity_days'; end;

  if least(v_price_kg,v_qty_kg,v_mechanical,v_packaging,v_transport) < 0 then
    raise exception 'Negative commercial values are not allowed';
  end if;
  if v_price_kg > 0 and v_qty_kg <= 0 then raise exception 'qty_kg is required for kg pricing'; end if;
  if v_price_kg <= 0 and (v_mechanical + v_packaging + v_transport) <= 0 then
    raise exception 'At least one positive commercial value is required';
  end if;

  if v_currency='EUR' then
    v_fx := 1;
  else
    begin v_fx := replace(coalesce(nullif(p_payload->>'exchange_rate_to_eur',''),'0'),',','.')::numeric; exception when others then raise exception 'Invalid exchange_rate_to_eur'; end;
    if coalesce(v_fx,0) <= 0 then raise exception 'Reviewed exchange rate to EUR is required for non-EUR offer'; end if;
  end if;

  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception 'Manual supplier offer cannot be added to a terminal project';
  end if;

  v_total := round((v_price_kg*v_qty_kg + v_mechanical + v_packaging + v_transport)::numeric,2);
  v_total_eur := round((v_total*v_fx)::numeric,2);
  v_positions := jsonb_build_array(
    jsonb_build_object('type','production','desc','Fertigung / Produktion','qty',v_qty_kg,'unit','kg','unit_price',v_price_kg,'total',round(v_price_kg*v_qty_kg,2)),
    jsonb_build_object('type','mechanical','desc','Mechanische Bearbeitung','qty',1,'unit','Pauschale','unit_price',v_mechanical,'total',v_mechanical),
    jsonb_build_object('type','packaging','desc','Verpackung','qty',1,'unit','Pauschale','unit_price',v_packaging,'total',v_packaging),
    jsonb_build_object('type','transport','desc','Transport','qty',1,'unit','Pauschale','unit_price',v_transport,'total',v_transport)
  );

  insert into public.offers(
    project_id,supplier,price_kg,total_eur,delivery_weeks,incoterms,cert,notes,origin,
    transport_eur,vat_pct,qty_kg,positions,currency,pricing_unit,payment_terms,inclusions,
    exclusions,validity_days,offer_ref,contact_person,raw_text,exchange_rate_to_eur,total_amount,unit_price
  ) values (
    p_project_id,v_supplier,nullif(v_price_kg,0),v_total_eur,v_delivery,nullif(btrim(coalesce(p_payload->>'incoterms','')),''),
    nullif(btrim(coalesce(p_payload->>'cert','')),''),nullif(btrim(coalesce(p_payload->>'notes','')),''),'manual',
    v_transport,0,v_qty_kg,v_positions,v_currency,case when v_price_kg>0 then 'kg' else 'total' end,
    nullif(btrim(coalesce(p_payload->>'payment_terms','')),''),nullif(btrim(coalesce(p_payload->>'inclusions','')),''),
    nullif(btrim(coalesce(p_payload->>'exclusions','')),''),v_validity,nullif(btrim(coalesce(p_payload->>'offer_ref','')),''),
    nullif(btrim(coalesce(p_payload->>'contact_person','')),''),
    concat('Manual supplier offer entered by ',coalesce(nullif(v_actor_email,''),v_actor::text),' at ',v_now::text,coalesce(E'\nSource: '||nullif(btrim(coalesce(p_payload->>'source','')),''),'')),
    v_fx,v_total,null
  ) returning * into v_offer;

  return jsonb_build_object(
    'ok',true,'offer_id',v_offer.id,'project_id',p_project_id,'supplier',v_supplier,'currency',v_currency,
    'total_amount',v_total,'total_eur',v_total_eur,'origin','manual','selected',false,
    'human_supplier_selection_required',true,'created_at',v_offer.created_at
  );
end;
$function$;

revoke all on function public.pppp_create_manual_supplier_offer_v1(uuid,jsonb) from public;
grant execute on function public.pppp_create_manual_supplier_offer_v1(uuid,jsonb) to authenticated;