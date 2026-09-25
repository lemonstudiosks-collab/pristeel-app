create index if not exists pppp_german_commercial_benchmarks_document_idx
  on public.pppp_german_commercial_benchmarks (document_id) where document_id is not null;

create index if not exists pppp_german_commercial_benchmarks_supplier_offer_idx
  on public.pppp_german_commercial_benchmarks (supplier_offer_id) where supplier_offer_id is not null;
