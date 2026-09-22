-- These queues, control tables, and worker state tables have no browser caller.
-- RLS already denied rows by default; explicit ACLs now also deny direct Data API
-- access while preserving service workers and the audited read-only bridge.

revoke all privileges on table public.local_ocr_jobs from public, anon, authenticated;
revoke all privileges on table public.local_ocr_workers from public, anon, authenticated;
revoke all privileges on table public.pppp_automation_http_runs from public, anon, authenticated;
revoke all privileges on table public.pppp_chatgpt_command_receipts from public, anon, authenticated;
revoke all privileges on table public.pppp_intelligence_snapshots_v1 from public, anon, authenticated;
revoke all privileges on table public.pppp_platform_changelog from public, anon, authenticated;
revoke all privileges on table public.pppp_platform_context from public, anon, authenticated;
revoke all privileges on table public.pppp_platform_integrations from public, anon, authenticated;
revoke all privileges on table public.pppp_platform_protected_rules from public, anon, authenticated;
revoke all privileges on table public.pppp_tender_project_promotions from public, anon, authenticated;
revoke all privileges on table public.project_attachment_scan_state from public, anon, authenticated;
revoke all privileges on table public.semantic_ai_jobs from public, anon, authenticated;
revoke all privileges on table public.semantic_worker_keys from public, anon, authenticated;

grant all privileges on table public.local_ocr_jobs to service_role, postgres;
grant all privileges on table public.local_ocr_workers to service_role, postgres;
grant all privileges on table public.pppp_automation_http_runs to service_role, postgres;
grant all privileges on table public.pppp_chatgpt_command_receipts to service_role, postgres;
grant all privileges on table public.pppp_intelligence_snapshots_v1 to service_role, postgres;
grant all privileges on table public.pppp_platform_changelog to service_role, postgres;
grant all privileges on table public.pppp_platform_context to service_role, postgres;
grant all privileges on table public.pppp_platform_integrations to service_role, postgres;
grant all privileges on table public.pppp_platform_protected_rules to service_role, postgres;
grant all privileges on table public.pppp_tender_project_promotions to service_role, postgres;
grant all privileges on table public.project_attachment_scan_state to service_role, postgres;
grant all privileges on table public.semantic_ai_jobs to service_role, postgres;
grant all privileges on table public.semantic_worker_keys to service_role, postgres;
