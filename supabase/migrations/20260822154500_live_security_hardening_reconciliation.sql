-- Persist the live Supabase hardening state verified on 2026-08-22.
-- This is intentionally a narrow reconciliation migration: ACLs, fixed search_path,
-- and the two FK-supporting indexes only. It does not change PPPP business data,
-- project identity, prices, offers, emails, or human approval gates.

-- Keep internal SECURITY DEFINER helpers out of the exposed anon/authenticated RPC surface.
-- can_write(), current_role(), and is_admin() are intentionally excluded because they are
-- caller-scoped RLS helpers used by authenticated policies.
do $$
declare
  signature text;
  fn regprocedure;
begin
  foreach signature in array array[
    'public.gmail_tracker_cron_authorized(text)',
    'public.gmail_tracker_internal_request(text,integer,integer)',
    'public.handle_new_user()',
    'public.hubspot_sync_cron_authorized(text)',
    'public.local_ocr_apply_completed_job(bigint)',
    'public.local_ocr_apply_completed_trigger()',
    'public.local_ocr_auto_queue_trigger()',
    'public.local_ocr_claim_job(text)',
    'public.local_ocr_enqueue_attachment(bigint)',
    'public.local_ocr_fail_job(text,bigint,text)',
    'public.local_ocr_failed_job_trigger()',
    'public.local_ocr_heartbeat(text,bigint)',
    'public.local_ocr_submit_result(text,bigint,text,jsonb)',
    'public.merge_crm_contacts()',
    'public.pppp_canonical_task_detail_guard()',
    'public.pppp_contact_party_guard_v1()',
    'public.pppp_extract_requirements_from_attachment_v1()',
    'public.pppp_project_email_event_engine_v1()',
    'public.pppp_rebuild_gmail_contact_master_v1()',
    'public.pppp_refresh_project_decision(uuid)',
    'public.pppp_refresh_project_decision_trigger()',
    'public.pppp_supplier_email_rate_reactivity()',
    'public.pppp_supplier_history_autolink()',
    'public.pppp_supplier_task_role_guard()',
    'public.pppp_sync_contact_from_project_email_v1()',
    'public.pppp_sync_contact_from_project_email_v1_row(bigint)',
    'public.pppp_sync_project_email_link()',
    'public.project_document_intake_internal_process(bigint)',
    'public.project_document_intake_internal_request(text,integer)',
    'public.semantic_claim_job(text)',
    'public.semantic_complete_job(uuid,text,text,jsonb,text)',
    'public.semantic_local_orchestrator_internal_request(integer)',
    'public.semantic_worker_authorize(text)'
  ]
  loop
    fn := to_regprocedure(signature);
    if fn is not null then
      execute format('revoke all on function %s from public, anon, authenticated', fn);
      execute format('grant execute on function %s to service_role', fn);
    end if;
  end loop;
end
$$;

-- Pin trigger-function name resolution so caller-controlled search paths cannot affect it.
do $$
declare
  signature text;
  fn regprocedure;
begin
  foreach signature in array array[
    'public.pppp_projects_set_updated_at()',
    'public.pppp_touch_project_from_email()',
    'public.pppp_touch_project_from_task()',
    'public.pppp_touch_project_from_analysis()',
    'public.pppp_touch_project_from_document()'
  ]
  loop
    fn := to_regprocedure(signature);
    if fn is not null then
      execute format('alter function %s set search_path = public, pg_catalog', fn);
    end if;
  end loop;
end
$$;

-- FK-supporting indexes identified by the Supabase performance advisor.
create index if not exists local_ocr_jobs_worker_id_idx
  on public.local_ocr_jobs(worker_id);

create index if not exists project_supplier_decisions_supplier_offer_id_idx
  on public.project_supplier_decisions(supplier_offer_id);
