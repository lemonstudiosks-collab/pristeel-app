-- Restore ACL contracts already declared by the canonical feature migrations.
-- These helpers are reached only through service-role Edge Functions, cron,
-- triggers, or other SECURITY DEFINER database functions.

revoke execute on function public.pppp_email_subject_explicit_project_v1(text) from public, anon, authenticated;
revoke execute on function public.pppp_enqueue_automation_http_v1(text, text, text, integer, integer, uuid, integer) from public, anon, authenticated;
revoke execute on function public.pppp_execution_release_confirmed_v1(uuid) from public, anon, authenticated;
revoke execute on function public.pppp_execution_release_snapshot_v1(uuid) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_bounced_v1(uuid, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_first_sent_v1(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_gmail_history_duplicate_v1(uuid, text) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_no_response_v1(uuid) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_replied_v1(uuid, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.pppp_gc_mark_second_sent_v1(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.pppp_gc_register_contact_v1(uuid) from public, anon, authenticated;
revoke execute on function public.pppp_gc_upsert_prospect_v1(text, text, text, text, text, text, integer, text, text, text, text, integer, jsonb, jsonb, jsonb, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.pppp_project_email_identity_autolink_v1(integer) from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_automation_http_v1(integer) from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_email_context_v1(integer) from public, anon, authenticated;
revoke execute on function public.pppp_refresh_client_wait_followups_v1() from public, anon, authenticated;
revoke execute on function public.pppp_refresh_followup_draft_candidates_v1() from public, anon, authenticated;
revoke execute on function public.pppp_task_lifecycle_reconcile_v1(uuid) from public, anon, authenticated;
revoke execute on function public.semantic_worker_ready_v1(interval) from public, anon, authenticated;

grant execute on function public.pppp_email_subject_explicit_project_v1(text) to service_role, postgres;
grant execute on function public.pppp_enqueue_automation_http_v1(text, text, text, integer, integer, uuid, integer) to service_role, postgres;
grant execute on function public.pppp_execution_release_confirmed_v1(uuid) to service_role, postgres;
grant execute on function public.pppp_execution_release_snapshot_v1(uuid) to service_role, postgres;
grant execute on function public.pppp_gc_mark_bounced_v1(uuid, timestamptz, text) to service_role, postgres;
grant execute on function public.pppp_gc_mark_first_sent_v1(uuid, text, text, timestamptz) to service_role, postgres;
grant execute on function public.pppp_gc_mark_gmail_history_duplicate_v1(uuid, text) to service_role, postgres;
grant execute on function public.pppp_gc_mark_no_response_v1(uuid) to service_role, postgres;
grant execute on function public.pppp_gc_mark_replied_v1(uuid, timestamptz, text) to service_role, postgres;
grant execute on function public.pppp_gc_mark_second_sent_v1(uuid, text, text, timestamptz) to service_role, postgres;
grant execute on function public.pppp_gc_register_contact_v1(uuid) to service_role, postgres;
grant execute on function public.pppp_gc_upsert_prospect_v1(text, text, text, text, text, text, integer, text, text, text, text, integer, jsonb, jsonb, jsonb, text, text, uuid) to service_role, postgres;
grant execute on function public.pppp_project_email_identity_autolink_v1(integer) to service_role, postgres;
grant execute on function public.pppp_reconcile_automation_http_v1(integer) to service_role, postgres;
grant execute on function public.pppp_reconcile_email_context_v1(integer) to service_role, postgres;
grant execute on function public.pppp_refresh_client_wait_followups_v1() to service_role, postgres;
grant execute on function public.pppp_refresh_followup_draft_candidates_v1() to service_role, postgres;
grant execute on function public.pppp_task_lifecycle_reconcile_v1(uuid) to service_role, postgres;
grant execute on function public.semantic_worker_ready_v1(interval) to service_role, postgres;

-- The historical-intelligence helpers were explicitly designed as postgres-only
-- implementation details behind the read-only ChatGPT bridge and hourly cron.
revoke execute on function public.pppp_intelligence_change_from_state_v1(jsonb, integer, integer) from public, anon, authenticated, service_role;
revoke execute on function public.pppp_intelligence_compact_state_v1(integer, integer) from public, anon, authenticated, service_role;
revoke execute on function public.pppp_intelligence_snapshot_capture_v1(text) from public, anon, authenticated, service_role;

grant execute on function public.pppp_intelligence_change_from_state_v1(jsonb, integer, integer) to postgres;
grant execute on function public.pppp_intelligence_compact_state_v1(integer, integer) to postgres;
grant execute on function public.pppp_intelligence_snapshot_capture_v1(text) to postgres;
