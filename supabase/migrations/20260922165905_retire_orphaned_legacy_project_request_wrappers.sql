-- Retire pre-cutover private request wrappers that still target the inactive
-- Supabase project. Live dependency inspection on 2026-09-22 found no cron,
-- database-function, runtime-source or tracked execution caller for these
-- wrappers. Canonical automation uses the managed HTTP queue and current
-- awqfpnzqwfjrjefoktgd endpoints instead.

drop function if exists private.dynamic_plan_internal_request(integer);
drop function if exists private.gmail_attachment_reconcile_internal_request(integer);
drop function if exists private.gmail_attachment_reconcile_message_request(text, integer);
drop function if exists private.gmail_ted_sales_reconcile_internal_request(integer);
drop function if exists private.project_document_intake_backfill_request(integer);
drop function if exists private.project_document_intake_process_id_request(bigint);
