-- PPPP Procurement comparison currency guard v1
-- Never assume missing currency is EUR. Unknown-currency offers remain non-comparable until a rate or canonical EUR total is present.

create or replace view public.pppp_supplier_offer_comparison_v1
with (security_invoker=true)
as
with base as (
  select
    o.id as offer_id,o.project_id,o.supplier,o.created_at,
    upper(coalesce(nullif(btrim(o.currency),''),'UNKNOWN')) as currency,
    lower(coalesce(nullif(btrim(o.pricing_unit),''),
      case when coalesce(o.price_kg,0)>0 then 'kg' when coalesce(o.unit_price,0)>0 then 'unit' when coalesce(o.total_eur,o.total_amount,0)>0 then 'total' else 'unknown' end)) as pricing_basis,
    o.price_kg,o.unit_price,o.total_amount,o.total_eur,o.qty_kg,o.delivery_weeks,o.incoterms,
    o.payment_terms,o.validity_days,o.cert,o.offer_ref,o.transport_eur,o.zinc_kg,o.exchange_rate_to_eur,
    case
      when upper(coalesce(nullif(btrim(o.currency),''),'UNKNOWN'))='EUR' then 1::numeric
      else o.exchange_rate_to_eur
    end as rate_to_eur
  from public.offers o
), calc as (
  select b.*,
    case
      when coalesce(b.price_kg,0)>0 and b.rate_to_eur is not null then b.price_kg*b.rate_to_eur
      when coalesce(b.unit_price,0)>0 and b.rate_to_eur is not null then b.unit_price*b.rate_to_eur
      when coalesce(b.total_eur,0)>0 then b.total_eur
      when coalesce(b.total_amount,0)>0 and b.rate_to_eur is not null then b.total_amount*b.rate_to_eur
      else null
    end as comparison_value_eur,
    (
      case when coalesce(b.price_kg,b.unit_price,b.total_eur,b.total_amount) is not null then 30 else 0 end +
      case when b.rate_to_eur is not null or coalesce(b.total_eur,0)>0 then 15 else 0 end +
      case when nullif(btrim(coalesce(b.incoterms,'')),'') is not null then 10 else 0 end +
      case when b.delivery_weeks is not null then 15 else 0 end +
      case when nullif(btrim(coalesce(b.payment_terms,'')),'') is not null then 10 else 0 end +
      case when nullif(btrim(coalesce(b.cert,'')),'') is not null then 10 else 0 end +
      case when b.validity_days is not null then 5 else 0 end +
      case when nullif(btrim(coalesce(b.offer_ref,'')),'') is not null then 5 else 0 end
    )::integer as completeness_score
  from base b
)
select
  c.*,
  (c.comparison_value_eur is not null and c.comparison_value_eur>0 and c.pricing_basis<>'unknown') as comparable,
  case when c.comparison_value_eur is not null and c.comparison_value_eur>0 then
    dense_rank() over(partition by c.project_id,c.pricing_basis order by c.comparison_value_eur asc,c.created_at desc)
  else null end as price_rank_within_basis,
  count(*) filter(where c.comparison_value_eur is not null and c.comparison_value_eur>0)
    over(partition by c.project_id,c.pricing_basis) as comparable_count_in_basis
from calc c;

grant select on public.pppp_supplier_offer_comparison_v1 to authenticated,service_role;
