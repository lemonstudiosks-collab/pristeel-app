-- PPPP live Home / event-state hardening, applied live on 2026-08-26.
-- Canonical behavior is defined in the live database functions below; this file records the production change for repository continuity.
-- 1. project_emails: unique project-contact fallback links only when exactly one active project matches.
-- 2. pppp_sync_execution_release_readiness_v1: confirmed release evidence supersedes technical readiness blockers.
-- 3. pppp_project_email_current_state_v1: newer linked Gmail advances current state and closes obsolete email/offer actions.
-- 4. pppp_context_no_action_reconcile_v1: confirmed operator no-action context closes obsolete automated tasks.
-- 5. pppp_home_current_actions_v1: exposes only user-facing current actions; technical queues, SLA follow-up heuristics and generic execution tasks stay backstage.
-- 6. pppp_project_event_intelligence_internal_request(days,limit): keeps the cron secret inside a SECURITY DEFINER request boundary so tests/schedulers never need to expose the secret.
-- 7. Home action projection applies a seven-day due horizon for normal tasks; urgent/high-priority work remains visible even outside the horizon. Long-range reminders stay in the project until they become timely.
-- 8. pppp-project-event-intelligence v2 fixed a runtime 500 caused by shadowing the global URL constructor.
-- 9. pppp-project-event-intelligence v4 fails closed with a healthy 200/paused_provider_unavailable response when unattended OPENAI_API_KEY is unavailable. It does not create tasks or mutate business state in that condition.
-- 10. project-event-intelligence-5m is paused while the unattended semantic provider is unavailable. Deterministic Gmail/project-state triggers remain active and authoritative.

-- Production migration names / live changes:
-- pppp_live_project_state_and_home_actions_v1
-- pppp_sent_offer_supersession_and_home_focus_v2
-- schedule_project_event_intelligence_v1
-- project_event_intelligence_internal_request_v1
-- home_current_actions_due_horizon_v2

-- The concrete, replayable Home-view/wrapper/cron state is recorded in:
-- 20260826171200_home_actions_and_event_provider_pause.sql

-- Operational note at this checkpoint:
-- The event function is healthy at the HTTP/runtime layer and now fails closed instead of producing repeated provider errors. Unattended semantic processing is not yet considered restored because the event function does not currently receive OPENAI_API_KEY and the Mac mini semantic worker has pending jobs / has not used its semantic worker key since 2026-08-22. This separate automation-health issue must not block deterministic Gmail/project-state reconciliation or the simplified Home release.

select 1;
