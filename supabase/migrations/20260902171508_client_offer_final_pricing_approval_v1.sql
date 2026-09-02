create or replace function pppp_internal_api.approve_client_offer_pricing_v1(
  p_project_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public','pppp_internal_api'
as $function$
declare
  v_project public.projects%rowtype;
  v_basis record;
  v_state jsonb:=coalesce(p_payload->'form_state','{}'::jsonb);
  v_positions jsonb:=coalesce(p_payload->'positions','[]'::jsonb);
  v_payment_plan jsonb:=coalesce(p_payload->'payment_plan','[]'::jsonb);
  v_pos jsonb;
  v_qty numeric;
  v_price numeric;
  v_total numeric:=0;
  v_positive_lines integer:=0;
  v_currency text:=upper(trim(coalesce(nullif(p_payload->>'currency',''),nullif(v_state->>'currency',''))));
  v_fx numeric;
  v_total_eur numeric;
  v_email text:=lower(trim(coalesce(nullif(p_payload->>'recipient_email',''),nullif(v_state->>'em',''))));
  v_client text:=trim(coalesce(nullif(p_payload->>'client',''),nullif(v_state->>'cli','')));
  v_contact text:=trim(coalesce(nullif(p_payload->>'contact',''),nullif(v_state->>'con','')));
  v_lang text:=lower(trim(coalesce(nullif(p_payload->>'language',''),nullif(v_state->>'lang',''),'en')));
  v_year integer:=extract(year from current_date)::integer;
  v_seq integer;
  v_doc_nr text;
  v_latest_doc text;
  v_doc public.documents_registry%rowtype;
  v_existing public.documents_registry%rowtype;
  v_revision integer:=1;
  v_offer_state jsonb;
  v_actor uuid:=auth.uid();
  v_actor_email text:=coalesce(auth.jwt()->>'email','');
  v_now timestamptz:=now();
begin
  if v_actor is null or not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;
  if p_payload is null or jsonb_typeof(p_payload)<>'object' then
    raise exception 'Final pricing payload is required';
  end if;
  if jsonb_typeof(v_positions)<>'array' or jsonb_array_length(v_positions)=0 then
    raise exception 'At least one client-offer position is required';
  end if;
  if jsonb_array_length(v_positions)>150 then
    raise exception 'Too many client-offer positions';
  end if;
  if v_currency is null or v_currency !~ '^[A-Z]{3}$' then
    raise exception 'A valid 3-letter currency is required';
  end if;
  if v_email='' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'A valid client email is required before preparing a Gmail draft';
  end if;

  begin
    v_fx:=replace(coalesce(p_payload->>'exchange_rate_to_eur',v_state->>'exchange_rate_to_eur',''),',','.')::numeric;
  exception when others then v_fx:=null; end;
  if v_currency='EUR' then v_fx:=1; end if;
  if v_currency<>'EUR' and coalesce(v_fx,0)<=0 then
    raise exception 'A reviewed exchange rate to EUR is required for non-EUR client pricing';
  end if;

  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception 'Client pricing cannot be approved on a terminal project';
  end if;

  select * into v_basis from public.pppp_selected_supplier_cost_basis_v1 where project_id=p_project_id limit 1;
  if not found then raise exception 'A human supplier decision with canonical cost basis is required first'; end if;
  if v_basis.cost_basis_readiness='blocked' then
    raise exception 'Selected supplier cost basis is blocked: %',coalesce(v_basis.warning_text,'verify supplier offer');
  end if;
  if not coalesce(v_basis.eligible_for_client_offer_handoff,false) then
    raise exception 'Project is not eligible for a new client-offer handoff in its current lifecycle state';
  end if;

  for v_pos in select value from jsonb_array_elements(v_positions)
  loop
    begin v_qty:=replace(coalesce(v_pos->>'qty','0'),',','.')::numeric; exception when others then raise exception 'Invalid quantity in client-offer position'; end;
    begin v_price:=replace(coalesce(v_pos->>'price','0'),',','.')::numeric; exception when others then raise exception 'Invalid price in client-offer position'; end;
    if v_qty<0 or v_price<0 then raise exception 'Negative quantity or price is not allowed'; end if;
    if v_qty>0 and v_price>0 then
      v_total:=v_total+(v_qty*v_price);
      v_positive_lines:=v_positive_lines+1;
    end if;
  end loop;
  if v_positive_lines=0 or v_total<=0 then
    raise exception 'Final client pricing must contain at least one positively priced position';
  end if;
  v_total:=round(v_total,2);
  v_total_eur:=round(v_total*v_fx,2);

  select * into v_existing
  from public.documents_registry d
  where d.project_id=p_project_id
    and d.series='QUO'
    and coalesce(d.offer_state->>'source','')='pppp-client-offer-finalization-v1'
    and coalesce(d.offer_state->>'pst_document_status','') not in ('sent','cancelled','superseded')
  order by d.created_at desc,d.seq desc
  limit 1
  for update;

  if found then
    v_revision:=case when coalesce(v_existing.offer_state->>'pst_revision','') ~ '^[0-9]+$' then (v_existing.offer_state->>'pst_revision')::integer+1 else 2 end;
    v_doc_nr:=v_existing.doc_nr;
  else
    perform pg_advisory_xact_lock(hashtext('documents_registry:QUO:'||v_year::text));
    select coalesce(max(seq),0)+1 into v_seq from public.documents_registry where series='QUO' and year=v_year;
    select doc_nr into v_latest_doc from public.documents_registry where series='QUO' and year=v_year order by seq desc limit 1;
    if coalesce(v_latest_doc,'') ~ '^PST-OFF-[0-9]{4}-[0-9]{2}-[0-9]+$' then
      v_doc_nr:='PST-OFF-'||v_year::text||'-'||to_char(current_date,'MM')||'-'||lpad(v_seq::text,3,'0');
    else
      v_doc_nr:='PST-QUO-'||v_year::text||'-'||lpad(v_seq::text,3,'0');
    end if;
  end if;

  v_offer_state:=coalesce(v_existing.offer_state,'{}'::jsonb)
    || v_state
    || jsonb_build_object(
      'source','pppp-client-offer-finalization-v1',
      'proj',coalesce(nullif(v_state->>'proj',''),v_project.name),
      'cli',coalesce(nullif(v_client,''),v_project.client),
      'con',v_contact,
      'em',v_email,
      'lang',v_lang,
      'currency',v_currency,
      'exchange_rate_to_eur',v_fx,
      'oferPos',v_positions,
      'human_pricing_approved',true,
      'human_review_required',true,
      'pricing_approval',jsonb_build_object(
        'actor_user_id',v_actor,
        'actor_email',v_actor_email,
        'approved_at',v_now,
        'server_calculated_total',v_total,
        'currency',v_currency,
        'exchange_rate_to_eur',v_fx
      ),
      'supplierBasis',jsonb_build_object(
        'supplier',v_basis.selected_supplier,
        'supplier_offer_id',v_basis.supplier_offer_id,
        'decision_id',v_basis.decision_id,
        'decision_type',v_basis.decision_type,
        'offer_ref',v_basis.offer_ref,
        'verified_on',v_basis.decided_at,
        'terms_flowed_down',true
      ),
      'supplierFlowdown',jsonb_strip_nulls(jsonb_build_object(
        'supplier',v_basis.selected_supplier,
        'offerRef',v_basis.offer_ref,
        'priceKg',v_basis.price_kg,
        'unitPrice',v_basis.unit_price,
        'currency',v_basis.currency,
        'unitCostEur',v_basis.unit_cost_eur,
        'qtyKg',v_basis.qty_kg,
        'explicitTotalEur',v_basis.explicit_total_eur,
        'incoterms',v_basis.incoterms,
        'paymentTerms',v_basis.payment_terms,
        'validityDays',v_basis.validity_days,
        'deliveryWeeks',v_basis.delivery_weeks,
        'cert',v_basis.cert,
        'inclusions',v_basis.inclusions,
        'exclusions',v_basis.exclusions,
        'decisionSource',v_basis.decision_source
      )),
      'pst_revision',v_revision,
      'revision_status','draft',
      'pst_document_status','pricing_approved',
      'pdf_status','pending',
      'gmail_draft_stale',true,
      'human_send_required',true
    );

  if v_existing.id is not null then
    update public.documents_registry
    set project=coalesce(nullif(v_state->>'proj',''),v_project.name),
        client=coalesce(nullif(v_client,''),v_project.client),
        total_eur=v_total_eur,
        payment_plan=v_payment_plan,
        offer_state=v_offer_state,
        currency=v_currency,
        total_amount=v_total,
        exchange_rate_to_eur=v_fx
    where id=v_existing.id
    returning * into v_doc;
  else
    insert into public.documents_registry(
      series,year,seq,doc_nr,project,client,total_eur,payment_plan,project_id,offer_state,currency,total_amount,exchange_rate_to_eur
    ) values (
      'QUO',v_year,v_seq,v_doc_nr,coalesce(nullif(v_state->>'proj',''),v_project.name),coalesce(nullif(v_client,''),v_project.client),
      v_total_eur,v_payment_plan,p_project_id,v_offer_state,v_currency,v_total,v_fx
    ) returning * into v_doc;
  end if;

  update public.tasks
  set status='mbyllur',done_at=coalesce(done_at,v_now)
  where project_id=p_project_id and source='client_offer_cost_basis_auto' and status='hapur';

  insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
  values(
    p_project_id,
    'Shqyrto dhe dërgo ofertën · '||v_doc.doc_nr,
    'Çmimi final u aprovua nga njeriu. PPPP po përgatit PDF + Gmail draft për '||v_email||E'.\nTotali i llogaritur nga pozicionet: '||round(v_total,2)::text||' '||v_currency||
    case when v_currency<>'EUR' then ' · ≈ '||round(v_total_eur,2)::text||' EUR' else '' end||
    E'.\nSupplier cost basis: '||coalesce(v_basis.selected_supplier,'—')||coalesce(' · '||round(v_basis.unit_cost_eur,4)::text||' EUR/'||upper(v_basis.pricing_basis),'')||
    E'.\nHuman gate: kontrollo PDF-në dhe Gmail draft-in. PPPP nuk e dërgon emailin automatikisht.',
    current_date,'larte','hapur','client_offer_final_review_auto','klient','COMMERCIAL:'||p_project_id::text||':client-offer-final-review'
  )
  on conflict(source,source_ref) do update
    set title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;

  update public.projects
  set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing') then 'client_offer' else pipeline_stage end,
      operational_state=case when coalesce(operational_state,'')='wait_for_client' then operational_state else 'active_work' end,
      updated_at=v_now
  where id=p_project_id;

  return jsonb_build_object(
    'ok',true,
    'document_id',v_doc.id,
    'doc_nr',v_doc.doc_nr,
    'revision',v_revision,
    'project_id',p_project_id,
    'recipient_email',v_email,
    'currency',v_currency,
    'total_amount',v_total,
    'total_eur',v_total_eur,
    'pst_document_status','pricing_approved',
    'pdf_required',true,
    'gmail_draft_required',true,
    'human_send_required',true
  );
end;
$function$;

revoke all on function pppp_internal_api.approve_client_offer_pricing_v1(uuid,jsonb) from public,anon;
grant execute on function pppp_internal_api.approve_client_offer_pricing_v1(uuid,jsonb) to authenticated,service_role;

create or replace function public.pppp_approve_client_offer_pricing_v1(
  p_project_id uuid,
  p_payload jsonb
)
returns jsonb
language sql
security invoker
set search_path to 'pg_catalog','public','pppp_internal_api'
as $function$
  select pppp_internal_api.approve_client_offer_pricing_v1(p_project_id,p_payload);
$function$;

revoke all on function public.pppp_approve_client_offer_pricing_v1(uuid,jsonb) from public,anon;
grant execute on function public.pppp_approve_client_offer_pricing_v1(uuid,jsonb) to authenticated,service_role;
