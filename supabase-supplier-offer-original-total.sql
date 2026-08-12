-- PRISTEEL supplier offer original-currency total
-- Preserve the amount exactly as quoted, separately from normalized EUR reporting.

begin;

alter table public.offers
  add column if not exists total_amount numeric;

-- Existing rows stored their displayed/raw total in total_eur.
-- Copy it first so no historical amount is lost.
update public.offers
set total_amount = total_eur
where total_amount is null
  and total_eur is not null;

-- For foreign-currency rows without an explicit FX rate, the old total_eur value
-- is not a verified EUR amount. Keep the original amount above and clear only
-- the misleading normalized-EUR field.
update public.offers
set total_eur = null
where upper(coalesce(currency, 'EUR')) <> 'EUR'
  and (exchange_rate_to_eur is null or exchange_rate_to_eur <= 0);

commit;
