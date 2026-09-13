-- One-time audited historical email reconciliation.
-- Uses the service-only reconciler as migration owner; no runtime permissions are widened.
select public.pppp_project_email_thread_history_reconcile_v1(200);
