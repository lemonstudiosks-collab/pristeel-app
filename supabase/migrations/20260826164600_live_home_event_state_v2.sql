-- PPPP live Home / event-state hardening, applied live on 2026-08-26.
-- Canonical behavior is defined in the live database functions below; this file records the production change for repository continuity.
-- 1. project_emails: unique project-contact fallback links only when exactly one active project matches.
-- 2. pppp_sync_execution_release_readiness_v1: confirmed release evidence supersedes technical readiness blockers.
-- 3. pppp_project_email_current_state_v1: newer linked Gmail advances current state and closes obsolete email/offer actions.
-- 4. pppp_context_no_action_reconcile_v1: confirmed operator no-action context closes obsolete automated tasks.
-- 5. pppp_home_current_actions_v1: exposes only user-facing current actions; technical queues, SLA follow-up heuristics and generic execution tasks stay backstage.
-- 6. project-event-intelligence-5m invokes pppp-project-event-intelligence as an optional semantic fallback; direct OpenAI execution currently depends on OPENAI_API_KEY being available to the deployed function.
-- 7. pppp_project_event_intelligence_internal_request(days,limit): keeps the cron secret inside a SECURITY DEFINER request boundary so tests/schedulers never need to expose the secret.
-- 8. Home action projection now applies a seven-day due horizon for normal tasks; urgent/high-priority work remains visible even outside the horizon. Long-range reminders stay in the project until they become timely.
-- 9. pppp-project-event-intelligence v2 fixed a runtime 500 caused by shadowing the global URL constructor. v3 adds a conservative attempt to reuse the existing authenticated PPPP OpenAI assistant when direct OPENAI_API_KEY is unavailable; service-only invocation does not bypass the assistant's project visibility rules.

-- Production migration names / live changes:
-- pppp_live_project_state_and_home_actions_v1
-- pppp_sent_offer_supersession_and_home_focus_v2
-- schedule_project_event_intelligence_v1
-- project_event_intelligence_internal_request_v1
-- home_current_actions_due_horizon_v2

-- Operational note at this checkpoint:
-- The event function is healthy at the HTTP/runtime layer (200 response after the URL-constructor fix), but unattended semantic processing is not yet considered verified because the newly deployed function does not currently see OPENAI_API_KEY and the existing user-scoped assistant rejects a service-only fallback with no_visible_projects. The local Mac mini semantic worker also has pending jobs and has not used its semantic worker key since 2026-08-22. This must not block deterministic Gmail/project-state reconciliation or the Home release, but it remains a separate automation-health item to restore.

-- This marker migration is intentionally non-destructive and idempotent. The live definitions are introspectable in Supabase and are protected by pppp_platform_protected_rules.
select 1;