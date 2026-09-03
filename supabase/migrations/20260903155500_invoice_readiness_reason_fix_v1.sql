begin;

create or replace view public.pppp_outgoing_invoice_milestones_v1
with (security_invoker = true)
as
with won_offers as (
  select
    d.id as offer_id,
    d.doc_nr as offer_doc_nr,
    d.project_id,
    d.project as offer_project,
    d.client,
    coalesce(d.total_amount,d.total_eur) as offer_total,
    upper(coalesce(nullif(d.currency,''),'EUR')) as currency,
    d.exchange_rate_to_eur,
    d.payment_plan,
    d.offer_state,
    d.created_at as offer_created_at,
    p.name as project_name,
    p.status as project_status,
    p.pipeline_stage,
    p.operational_state,
    public.pppp_project_delivery_date_v1(d.project_id) as delivery_date
  from public.documents_registry d
  join public.projects p on p.id=d.project_id
  where d.series='QUO'
    and lower(coalesce(d.followup_status,''))='won'
    and jsonb_typeof(d.payment_plan)='array'
    and jsonb_array_length(d.payment_plan)>0
    and coalesce(d.total_amount,d.total_eur)>0
), expanded as (
  select
    o.*,
    (m.ordinality-1)::integer as milestone_index,
    lower(btrim(coalesce(m.item->>'ev','milestone'))) as milestone_event,
    coalesce(nullif(btrim(m.item->>'label'),''),nullif(btrim(m.item->>'ev'),''),'Milestone '||m.ordinality::text) as milestone_label,
    case
      when coalesce(m.item->>'pct','') ~ '^\s*[0-9]+([\.,][0-9]+)?\s*$'
        then replace(btrim(m.item->>'pct'),',','.')::numeric
      else null::numeric
    end as milestone_pct,
    case
      when coalesce(m.item->>'days','') ~ '^\s*[0-9]+\s*$' then btrim(m.item->>'days')::integer
      else 0
    end as payment_days
  from won_offers o
  cross join lateral jsonb_array_elements(o.payment_plan) with ordinality as m(item,ordinality)
), priced as (
  select e.*,case when e.milestone_pct is not null then round(e.offer_total*e.milestone_pct/100.0,2) end as milestone_amount
  from expanded e
), ranked as (
  select p.*,row_number() over(partition by p.offer_id,p.milestone_amount order by p.milestone_index) as same_amount_rank
  from priced p
), invoice_mapped as (
  select r.*,
    coalesce(di.id,li.id) as invoice_id,
    coalesce(di.invoice_nr,li.invoice_nr) as invoice_nr,
    coalesce(di.paid,li.paid) as invoice_paid,
    coalesce(di.paid_date,li.paid_date) as invoice_paid_date,
    coalesce(di.date,li.date) as invoice_date
  from ranked r
  left join lateral (
    select i.id,i.invoice_nr,i.paid,i.paid_date,i.date
    from public.invoices_out i
    where i.source_offer_id=r.offer_id and i.source_milestone_index=r.milestone_index
    order by i.created_at desc limit 1
  ) di on true
  left join lateral (
    select i.id,i.invoice_nr,i.paid,i.paid_date,i.date
    from public.invoices_out i
    where di.id is null and i.project_id=r.project_id and i.source_offer_id is null
      and r.milestone_amount is not null
      and abs(coalesce(i.total_price,i.gross_amount,i.net_amount,0)-r.milestone_amount)<=0.01
    order by i.created_at,i.id
    offset greatest(r.same_amount_rank-1,0) limit 1
  ) li on true
), evaluated as (
  select m.*,exists(
    select 1 from invoice_mapped prior
    where prior.offer_id=m.offer_id and prior.milestone_index<m.milestone_index and prior.invoice_id is null
  ) as prior_invoice_missing
  from invoice_mapped m
), stated as (
  select e.*,
    case
      when e.invoice_id is not null then 'invoiced'
      when e.milestone_pct is null or coalesce(e.milestone_amount,0)<=0 then 'invalid'
      when e.prior_invoice_missing then 'waiting_previous_invoice'
      when e.milestone_index=0 and (lower(coalesce(e.project_status,'')) in ('fituar','won') or e.operational_state='execution') then 'review'
      when e.milestone_event ~ '(before.*del|before_del|pred.*ispor|vor.*liefer)' and e.delivery_date is not null and e.delivery_date<=current_date+14 then 'review'
      when e.milestone_event ~ '(after.*del|after_del|nakon.*ispor|nach.*liefer)' and e.delivery_date is not null and e.delivery_date<=current_date then 'review'
      else 'pending_event'
    end as readiness
  from evaluated e
)
select
  s.offer_id,s.offer_doc_nr,s.project_id,s.project_name,s.client,s.project_status,s.pipeline_stage,s.operational_state,
  s.offer_total,s.currency,s.exchange_rate_to_eur,s.milestone_index,s.milestone_event,s.milestone_label,s.milestone_pct,
  s.milestone_amount,s.payment_days,s.delivery_date,s.invoice_id,s.invoice_nr,s.invoice_paid,s.invoice_paid_date,s.invoice_date,
  'outgoing:'||s.offer_id::text||':milestone:'||s.milestone_index::text as candidate_key,
  s.readiness,
  case
    when s.readiness='invoiced' then 'Milestone already invoiced.'
    when s.readiness='invalid' then 'Milestone percentage or amount is invalid and requires data review.'
    when s.readiness='waiting_previous_invoice' then 'A prior quotation milestone must be invoiced first.'
    when s.readiness='review' and s.milestone_index=0 then 'Initial/order milestone of a won quotation is ready for human invoice approval.'
    when s.readiness='review' and s.milestone_event ~ '(before.*del|before_del|pred.*ispor|vor.*liefer)' then 'Confirmed delivery is within 14 days; milestone is ready for human invoice approval.'
    when s.readiness='review' and s.milestone_event ~ '(after.*del|after_del|nakon.*ispor|nach.*liefer)' then 'Confirmed delivery date has been reached; milestone is ready for human invoice approval.'
    when s.milestone_event ~ '(before.*del|before_del|pred.*ispor|vor.*liefer)' and s.delivery_date is not null then 'Waiting until 14 days before confirmed delivery ('||s.delivery_date::text||').'
    when s.milestone_event ~ '(after.*del|after_del|nakon.*ispor|nach.*liefer)' and s.delivery_date is not null then 'Waiting until confirmed delivery date ('||s.delivery_date::text||').'
    when s.delivery_date is null then 'Waiting for a confirmed delivery/transport date or explicit operator trigger.'
    else 'Waiting for the milestone event.'
  end as readiness_reason,
  ic.id as candidate_id,ic.status as candidate_status,ic.canonical_invoice_out_id
from stated s
left join public.invoice_candidates ic
  on ic.candidate_key='outgoing:'||s.offer_id::text||':milestone:'||s.milestone_index::text and ic.direction='outgoing';

commit;
