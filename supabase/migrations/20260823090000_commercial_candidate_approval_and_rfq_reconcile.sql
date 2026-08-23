-- PPPP Phase B2: human-gated commercial candidate approval + RFQ revision reconciliation.
-- No outbound communication is sent. Prices/amounts become canonical only after an authenticated
-- user with can_write() explicitly approves a review candidate.

-- Keep one CURRENT semantic RFQ review draft per project/supplier/subject while preserving history.
with ranked as (
  select id,
         row_number() over (
           partition by project_id, lower(btrim(coalesce(supplier_email,''))), coalesce(subject,'')
           order by created_at desc, id desc
         ) rn
  from public.rfq_log
  where status='draft_review'
), old as (
  select id from ranked where rn>1
)
update public.rfq_log r
set status='superseded',
    notes=concat_ws(E'\n',nullif(r.notes,''),'Auto-reconciled by PPPP: newer RFQ review revision is current; this revision is retained as history.')
from old o where r.id=o.id;

create or replace function public.pppp_rfq_single_current_review_v1()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
begin
  if new.status='draft_review' then
    update public.rfq_log r
    set status='superseded',
        notes=concat_ws(E'\n',nullif(r.notes,''),'Auto-reconciled by PPPP: superseded by a newer RFQ review revision.')
    where r.id<>new.id
      and r.status='draft_review'
      and r.project_id is not distinct from new.project_id
      and lower(btrim(coalesce(r.supplier_email,'')))=lower(btrim(coalesce(new.supplier_email,'')))
      and coalesce(r.subject,'')=coalesce(new.subject,'');
  end if;
  return new;
end;
$$;
revoke all on function public.pppp_rfq_single_current_review_v1() from public,anon,authenticated;

drop trigger if exists pppp_rfq_single_current_review_v1 on public.rfq_log;
create trigger pppp_rfq_single_current_review_v1
after insert or update of status,project_id,supplier_email,subject on public.rfq_log
for each row execute function public.pppp_rfq_single_current_review_v1();

create or replace function public.pppp_approve_supplier_offer_candidate_v1(p_candidate_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path='public','pg_temp'
as $$
declare
  c public.supplier_offer_candidates%rowtype;
  v_offer public.offers%rowtype;
  v_currency text;
  v_price numeric;
  v_total numeric;
  v_qty numeric;
  v_zinc numeric;
  v_transport numeric;
  v_delivery integer;
  v_validity integer;
  v_existing uuid;
begin
  if not public.can_write() then raise exception 'Write permission required' using errcode='42501'; end if;
  select * into c from public.supplier_offer_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Supplier offer candidate not found'; end if;
  if c.status='approved' and c.canonical_offer_id is not null then
    return jsonb_build_object('ok',true,'status','already_approved','offer_id',c.canonical_offer_id);
  end if;
  if c.status<>'review' then raise exception 'Candidate is not in review state'; end if;

  v_currency=upper(btrim(coalesce(c.extracted->>'currency','')));
  v_price=nullif(c.extracted->>'price_kg','')::numeric;
  v_total=nullif(c.extracted->>'total_amount','')::numeric;
  v_qty=nullif(c.extracted->>'qty_kg','')::numeric;
  v_zinc=coalesce(nullif(c.extracted->>'zinc_kg','')::numeric,nullif(c.extracted->>'zinc_eur_kg','')::numeric);
  v_transport=nullif(c.extracted->>'transport_eur','')::numeric;
  v_delivery=nullif(c.extracted->>'delivery_weeks','')::numeric::integer;
  v_validity=nullif(c.extracted->>'validity_days','')::numeric::integer;

  if coalesce(v_currency,'')='' then raise exception 'Currency must be reviewed before approval'; end if;
  if coalesce(v_price,0)<=0 and coalesce(v_total,0)<=0 then
    raise exception 'A reviewed commercial price or total is required before approval';
  end if;

  -- Exact source-text duplicate protection only. Never collapse different revisions by price alone.
  select o.id into v_existing
  from public.offers o
  where o.project_id=c.project_id
    and lower(btrim(coalesce(o.supplier,'')))=lower(btrim(coalesce(c.supplier_name,c.supplier_email,'')))
    and coalesce(o.raw_text,'')<>''
    and o.raw_text=coalesce(c.raw_text,'')
  order by o.created_at desc limit 1;

  if v_existing is null then
    insert into public.offers(
      project_id,supplier,price_kg,total_eur,delivery_weeks,incoterms,cert,notes,origin,
      zinc_kg,transport_eur,qty_kg,currency,pricing_unit,payment_terms,validity_days,
      offer_ref,contact_person,raw_text,total_amount,exchange_rate_to_eur
    ) values (
      c.project_id,coalesce(nullif(c.supplier_name,''),c.supplier_email),v_price,
      case when v_currency='EUR' then v_total else nullif(c.extracted->>'total_eur','')::numeric end,
      v_delivery,nullif(c.extracted->>'incoterms',''),nullif(c.extracted->>'cert',''),
      'Approved from PPPP review candidate '||c.id::text,nullif(c.extracted->>'origin',''),
      v_zinc,v_transport,coalesce(v_qty,0),v_currency,'kg',nullif(c.extracted->>'payment_terms',''),
      v_validity,nullif(c.extracted->>'offer_ref',''),c.supplier_email,c.raw_text,v_total,
      nullif(c.extracted->>'exchange_rate_to_eur','')::numeric
    ) returning * into v_offer;
    v_existing=v_offer.id;
  end if;

  update public.supplier_offer_candidates
  set status='approved',canonical_offer_id=v_existing,reviewed_at=now(),updated_at=now()
  where id=c.id;

  -- A real approved supplier response can close only a genuinely SENT RFQ to the same supplier.
  update public.rfq_log r
  set status='replied',replied_at=coalesce(replied_at,now()),offer_id=coalesce(offer_id,v_existing)
  where r.id=(
    select x.id from public.rfq_log x
    where x.project_id=c.project_id and x.status='sent'
      and lower(btrim(coalesce(x.supplier_email,'')))=lower(btrim(coalesce(c.supplier_email,'')))
    order by x.sent_at desc nulls last,x.created_at desc limit 1
  );

  if not exists(select 1 from public.supplier_offer_candidates where project_id=c.project_id and status='review') then
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now())
    where project_id=c.project_id and source='commercial_intake_review'
      and source_ref='commercial-intake:'||c.project_id::text||':offer' and status='hapur';
  end if;

  return jsonb_build_object('ok',true,'status','approved','offer_id',v_existing,'project_id',c.project_id);
end;
$$;
revoke all on function public.pppp_approve_supplier_offer_candidate_v1(uuid) from public,anon;
grant execute on function public.pppp_approve_supplier_offer_candidate_v1(uuid) to authenticated,service_role;

create or replace function public.pppp_approve_invoice_candidate_v1(p_candidate_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path='public','pg_temp'
as $$
declare
  c public.invoice_candidates%rowtype;
  p public.projects%rowtype;
  v_id uuid;
  v_nr text;
  v_currency text;
  v_total numeric;
  v_vat numeric;
  v_existing uuid;
begin
  if not public.can_write() then raise exception 'Write permission required' using errcode='42501'; end if;
  select * into c from public.invoice_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Invoice candidate not found'; end if;
  if c.status='approved' and c.canonical_invoice_in_id is not null then
    return jsonb_build_object('ok',true,'status','already_approved','invoice_id',c.canonical_invoice_in_id);
  end if;
  if c.status<>'review' then raise exception 'Candidate is not in review state'; end if;
  if c.direction<>'incoming' then raise exception 'Only incoming supplier invoices may be approved here'; end if;
  select * into p from public.projects where id=c.project_id;
  if not found then raise exception 'Project not found'; end if;

  v_nr=btrim(coalesce(c.extracted->>'invoice_number',''));
  v_currency=upper(btrim(coalesce(c.extracted->>'currency','')));
  v_total=nullif(c.extracted->>'total_amount','')::numeric;
  v_vat=nullif(c.extracted->>'vat_pct','')::numeric;
  if v_nr='' then raise exception 'Invoice number must be reviewed before approval'; end if;
  if v_currency='' then raise exception 'Currency must be reviewed before approval'; end if;
  if coalesce(v_total,0)<=0 then raise exception 'Invoice total must be reviewed before approval'; end if;

  select i.id into v_existing from public.invoices_in i
  where i.project_id=c.project_id
    and lower(btrim(coalesce(i.supplier,'')))=lower(btrim(coalesce(c.party_name,c.party_email,'')))
    and btrim(coalesce(i.supplier_invoice_nr,''))=v_nr
  order by i.created_at desc limit 1;

  if v_existing is null then
    insert into public.invoices_in(
      supplier,supplier_invoice_nr,date,project,amount,currency,notes,vat_applicable,vat_rate,
      payment_terms,paid,due_date,project_id
    ) values (
      coalesce(nullif(c.party_name,''),c.party_email),v_nr,nullif(c.extracted->>'date','')::date,
      p.name,v_total,v_currency,'Approved from PPPP review candidate '||c.id::text,
      case when v_vat is null then null else v_vat>0 end,v_vat,nullif(c.extracted->>'payment_terms',''),
      false,nullif(c.extracted->>'due_date','')::date,c.project_id
    ) returning id into v_id;
    v_existing=v_id;
  end if;

  update public.invoice_candidates
  set status='approved',canonical_invoice_in_id=v_existing,reviewed_at=now(),updated_at=now()
  where id=c.id;

  if not exists(select 1 from public.invoice_candidates where project_id=c.project_id and status='review') then
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now())
    where project_id=c.project_id and source='commercial_intake_review'
      and source_ref='commercial-intake:'||c.project_id::text||':invoice' and status='hapur';
  end if;

  return jsonb_build_object('ok',true,'status','approved','invoice_id',v_existing,'project_id',c.project_id);
end;
$$;
revoke all on function public.pppp_approve_invoice_candidate_v1(uuid) from public,anon;
grant execute on function public.pppp_approve_invoice_candidate_v1(uuid) to authenticated,service_role;

create or replace function public.pppp_ignore_commercial_candidate_v1(p_kind text,p_candidate_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path='public','pg_temp'
as $$
declare v_project uuid; v_kind text:=lower(btrim(coalesce(p_kind,'')));
begin
  if not public.can_write() then raise exception 'Write permission required' using errcode='42501'; end if;
  if v_kind='offer' then
    update public.supplier_offer_candidates set status='ignored',reviewed_at=now(),updated_at=now()
    where id=p_candidate_id and status='review' returning project_id into v_project;
  elsif v_kind='invoice' then
    update public.invoice_candidates set status='ignored',reviewed_at=now(),updated_at=now()
    where id=p_candidate_id and status='review' returning project_id into v_project;
  else raise exception 'Unsupported candidate kind'; end if;
  if v_project is null then raise exception 'Review candidate not found'; end if;
  return jsonb_build_object('ok',true,'status','ignored','kind',v_kind,'project_id',v_project);
end;
$$;
revoke all on function public.pppp_ignore_commercial_candidate_v1(text,uuid) from public,anon;
grant execute on function public.pppp_ignore_commercial_candidate_v1(text,uuid) to authenticated,service_role;
