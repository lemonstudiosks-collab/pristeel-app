-- PRISTEEL supplier offer FX safety
-- Additive metadata only. Existing monetary values are not rewritten.
-- EUR offers get rate 1. Foreign-currency offers stay NULL until a rate is explicitly recorded.

begin;

alter table public.offers
  add column if not exists exchange_rate_to_eur numeric;

update public.offers
set exchange_rate_to_eur = 1
where upper(coalesce(currency, 'EUR')) = 'EUR'
  and exchange_rate_to_eur is null;

commit;
