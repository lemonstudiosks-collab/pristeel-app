create index if not exists invoice_candidates_canonical_invoice_in_id_idx
  on public.invoice_candidates (canonical_invoice_in_id);

create index if not exists invoice_candidates_canonical_invoice_out_id_idx
  on public.invoice_candidates (canonical_invoice_out_id);

create index if not exists pppp_project_context_facts_supersedes_id_idx
  on public.pppp_project_context_facts (supersedes_id);

create index if not exists supplier_offer_candidates_canonical_offer_id_idx
  on public.supplier_offer_candidates (canonical_offer_id);
