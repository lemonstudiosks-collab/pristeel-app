-- PRISTEEL document currency support
-- Additive migration. Existing document values remain EUR and are not recalculated.

begin;

alter table public.documents_registry
  add column if not exists currency text,
  add column if not exists total_amount numeric,
  add column if not exists exchange_rate_to_eur numeric;

update public.documents_registry
set currency = coalesce(nullif(currency,''),'EUR'),
    total_amount = coalesce(total_amount,total_eur),
    exchange_rate_to_eur = case
      when coalesce(nullif(currency,''),'EUR')='EUR' and exchange_rate_to_eur is null then 1
      else exchange_rate_to_eur
    end
where currency is null
   or currency=''
   or total_amount is null
   or (coalesce(nullif(currency,''),'EUR')='EUR' and exchange_rate_to_eur is null);

alter table public.invoices_out
  add column if not exists exchange_rate_to_eur numeric;

update public.invoices_out
set currency = coalesce(nullif(currency,''),'EUR'),
    exchange_rate_to_eur = case
      when coalesce(nullif(currency,''),'EUR')='EUR' and exchange_rate_to_eur is null then 1
      else exchange_rate_to_eur
    end
where currency is null
   or currency=''
   or (coalesce(nullif(currency,''),'EUR')='EUR' and exchange_rate_to_eur is null);

commit;
