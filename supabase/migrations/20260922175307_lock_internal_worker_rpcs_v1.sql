-- Restore the intended service-only contract for scheduler wrappers and worker
-- RPCs. All active callers use postgres/pg_cron or an Edge Function client
-- initialized with the service-role key.

revoke execute on function public.chatgpt_command_bridge_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.commercial_intake_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.gmail_tracker_internal_request(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.local_ocr_apply_completed_job(bigint) from public, anon, authenticated;
revoke execute on function public.local_ocr_claim_job(text) from public, anon, authenticated;
revoke execute on function public.local_ocr_enqueue_attachment(bigint) from public, anon, authenticated;
revoke execute on function public.local_ocr_enqueue_expense_receipt_v1(uuid) from public, anon, authenticated;
revoke execute on function public.local_ocr_fail_job(text, bigint, text) from public, anon, authenticated;
revoke execute on function public.local_ocr_heartbeat(text, bigint) from public, anon, authenticated;
revoke execute on function public.local_ocr_submit_result(text, bigint, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pppp_apply_expense_receipt_ocr_v1(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.pppp_expense_drive_ingest_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.pppp_followup_draft_generator_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.pppp_gc_discovery_internal_request(integer, boolean) from public, anon, authenticated;
revoke execute on function public.pppp_gc_outreach_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.pppp_project_event_intelligence_internal_request(integer, integer) from public, anon, authenticated;
revoke execute on function public.pppp_project_memory_synthesis_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.project_document_intake_internal_process(bigint) from public, anon, authenticated;
revoke execute on function public.project_document_intake_internal_request(text, integer) from public, anon, authenticated;
revoke execute on function public.project_drive_reconciler_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.semantic_claim_job(text) from public, anon, authenticated;
revoke execute on function public.semantic_complete_job(uuid, text, text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.semantic_local_orchestrator_internal_request(integer) from public, anon, authenticated;
revoke execute on function public.semantic_worker_authorize(text) from public, anon, authenticated;

grant execute on function public.chatgpt_command_bridge_internal_request(integer) to service_role, postgres;
grant execute on function public.commercial_intake_internal_request(integer) to service_role, postgres;
grant execute on function public.gmail_tracker_internal_request(text, integer, integer) to service_role, postgres;
grant execute on function public.local_ocr_apply_completed_job(bigint) to service_role, postgres;
grant execute on function public.local_ocr_claim_job(text) to service_role, postgres;
grant execute on function public.local_ocr_enqueue_attachment(bigint) to service_role, postgres;
grant execute on function public.local_ocr_enqueue_expense_receipt_v1(uuid) to service_role, postgres;
grant execute on function public.local_ocr_fail_job(text, bigint, text) to service_role, postgres;
grant execute on function public.local_ocr_heartbeat(text, bigint) to service_role, postgres;
grant execute on function public.local_ocr_submit_result(text, bigint, text, jsonb) to service_role, postgres;
grant execute on function public.pppp_apply_expense_receipt_ocr_v1(uuid, text, jsonb) to service_role, postgres;
grant execute on function public.pppp_expense_drive_ingest_internal_request(integer) to service_role, postgres;
grant execute on function public.pppp_followup_draft_generator_internal_request(integer) to service_role, postgres;
grant execute on function public.pppp_gc_discovery_internal_request(integer, boolean) to service_role, postgres;
grant execute on function public.pppp_gc_outreach_internal_request(integer) to service_role, postgres;
grant execute on function public.pppp_project_event_intelligence_internal_request(integer, integer) to service_role, postgres;
grant execute on function public.pppp_project_memory_synthesis_internal_request(integer) to service_role, postgres;
grant execute on function public.project_document_intake_internal_process(bigint) to service_role, postgres;
grant execute on function public.project_document_intake_internal_request(text, integer) to service_role, postgres;
grant execute on function public.project_drive_reconciler_internal_request(integer) to service_role, postgres;
grant execute on function public.semantic_claim_job(text) to service_role, postgres;
grant execute on function public.semantic_complete_job(uuid, text, text, jsonb, text) to service_role, postgres;
grant execute on function public.semantic_local_orchestrator_internal_request(integer) to service_role, postgres;
grant execute on function public.semantic_worker_authorize(text) to service_role, postgres;
