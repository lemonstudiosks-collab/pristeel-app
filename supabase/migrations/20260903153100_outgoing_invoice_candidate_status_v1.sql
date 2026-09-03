begin;

alter table public.invoice_candidates
  drop constraint if exists invoice_candidates_status_check;

alter table public.invoice_candidates
  add constraint invoice_candidates_status_check
  check (status = any(array['review'::text,'approved'::text,'ignored'::text,'superseded'::text,'pending_event'::text,'rejected'::text]));

commit;
