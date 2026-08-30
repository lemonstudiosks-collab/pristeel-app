-- Link supplier offer review candidates to their originating RFQ and support unit-priced offers.
alter table public.supplier_offer_candidates
  add column if not exists matched_rfq_id uuid references public.rfq_log(id) on delete set null;
create index if not exists supplier_offer_candidates_matched_rfq_id_idx
  on public.supplier_offer_candidates(matched_rfq_id)
  where matched_rfq_id is not null;

alter table public.offers add column if not exists unit_price numeric;

update public.supplier_offer_candidates c
set matched_rfq_id = (
  select r.id
  from public.rfq_log r
  where r.project_id=c.project_id
    and lower(btrim(coalesce(r.supplier_email,'')))=lower(btrim(coalesce(c.supplier_email,'')))
    and r.status in ('sent','replied')
    and (r.sent_at is null or r.sent_at <= coalesce(
      (select e.sent_at from public.project_emails e where e.gmail_message_id=c.gmail_message_id order by e.sent_at desc limit 1),
      now()))
  order by r.sent_at desc nulls last,r.created_at desc
  limit 1
)
where c.matched_rfq_id is null and nullif(btrim(coalesce(c.supplier_email,'')),'') is not null;

update public.rfq_log r
set status='replied',replied_at=coalesce(r.replied_at,e.sent_at,c.updated_at,now())
from public.supplier_offer_candidates c
left join public.project_emails e on e.gmail_message_id=c.gmail_message_id
where r.id=c.matched_rfq_id and r.status='sent';

create or replace function public.pppp_approve_supplier_offer_candidate_v1(p_candidate_id uuid)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $$
declare
  c public.supplier_offer_candidates%rowtype;
  v_offer public.offers%rowtype;
  v_currency text;
  v_price numeric;
  v_unit_price numeric;
  v_pricing_unit text;
  v_total numeric;
  v_qty numeric;
  v_zinc numeric;
  v_transport numeric;
  v_delivery integer;
  v_validity integer;
  v_existing uuid;
  v_received_at timestamptz;
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
  v_unit_price=nullif(c.extracted->>'unit_price','')::numeric;
  v_pricing_unit=lower(btrim(coalesce(c.extracted->>'pricing_unit','')));
  v_total=nullif(c.extracted->>'total_amount','')::numeric;
  v_qty=nullif(c.extracted->>'qty_kg','')::numeric;
  v_zinc=coalesce(nullif(c.extracted->>'zinc_kg','')::numeric,nullif(c.extracted->>'zinc_eur_kg','')::numeric);
  v_transport=nullif(c.extracted->>'transport_eur','')::numeric;
  v_delivery=nullif(c.extracted->>'delivery_weeks','')::numeric::integer;
  v_validity=nullif(c.extracted->>'validity_days','')::numeric::integer;

  if coalesce(v_currency,'')='' then raise exception 'Currency must be reviewed before approval'; end if;
  if coalesce(v_price,0)<=0 and coalesce(v_unit_price,0)<=0 and coalesce(v_total,0)<=0 then
    raise exception 'A reviewed commercial unit price, kg price, or total is required before approval';
  end if;
  if coalesce(v_price,0)>0 then v_pricing_unit='kg';
  elsif coalesce(v_unit_price,0)>0 and coalesce(v_pricing_unit,'')='' then v_pricing_unit='unit';
  elsif coalesce(v_pricing_unit,'')='' then v_pricing_unit='total'; end if;

  select o.id into v_existing
  from public.offers o
  where o.project_id=c.project_id
    and lower(btrim(coalesce(o.supplier,'')))=lower(btrim(coalesce(c.supplier_name,c.supplier_email,'')))
    and coalesce(o.raw_text,'')<>'' and o.raw_text=coalesce(c.raw_text,'')
  order by o.created_at desc limit 1;

  if v_existing is null then
    insert into public.offers(
      project_id,supplier,price_kg,unit_price,total_eur,delivery_weeks,incoterms,cert,notes,origin,
      zinc_kg,transport_eur,qty_kg,currency,pricing_unit,payment_terms,validity_days,
      offer_ref,contact_person,raw_text,total_amount,exchange_rate_to_eur
    ) values (
      c.project_id,coalesce(nullif(c.supplier_name,''),c.supplier_email),v_price,v_unit_price,
      case when v_currency='EUR' then v_total else nullif(c.extracted->>'total_eur','')::numeric end,
      v_delivery,nullif(c.extracted->>'incoterms',''),nullif(c.extracted->>'cert',''),
      'Approved from PPPP review candidate '||c.id::text,nullif(c.extracted->>'origin',''),
      v_zinc,v_transport,coalesce(v_qty,0),v_currency,v_pricing_unit,nullif(c.extracted->>'payment_terms',''),
      v_validity,nullif(c.extracted->>'offer_ref',''),c.supplier_email,c.raw_text,v_total,
      nullif(c.extracted->>'exchange_rate_to_eur','')::numeric
    ) returning * into v_offer;
    v_existing=v_offer.id;
  end if;

  update public.supplier_offer_candidates
  set status='approved',canonical_offer_id=v_existing,reviewed_at=now(),updated_at=now()
  where id=c.id;

  select e.sent_at into v_received_at from public.project_emails e
  where e.gmail_message_id=c.gmail_message_id order by e.sent_at desc limit 1;
  v_received_at=coalesce(v_received_at,now());

  if c.matched_rfq_id is not null then
    update public.rfq_log
    set status='replied',replied_at=coalesce(replied_at,v_received_at),offer_id=coalesce(offer_id,v_existing)
    where id=c.matched_rfq_id;
  end if;

  if not exists(select 1 from public.supplier_offer_candidates where project_id=c.project_id and status='review') then
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now())
    where project_id=c.project_id and source='commercial_intake_review'
      and source_ref='commercial-intake:'||c.project_id::text||':offer' and status='hapur';
  end if;

  return jsonb_build_object('ok',true,'status','approved','offer_id',v_existing,'project_id',c.project_id,'matched_rfq_id',c.matched_rfq_id);
end;
$$;
