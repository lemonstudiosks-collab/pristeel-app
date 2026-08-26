-- PPPP live Home / event-state hardening, applied live on 2026-08-26.
-- Canonical behavior is defined in the live database functions below; this file records the production change for repository continuity.
-- 1. project_emails: unique project-contact fallback links only when exactly one active project matches.
-- 2. pppp_sync_execution_release_readiness_v1: confirmed release evidence supersedes technical readiness blockers.
-- 3. pppp_project_email_current_state_v1: newer linked Gmail advances current state and closes obsolete email/offer actions.
-- 4. pppp_context_no_action_reconcile_v1: confirmed operator no-action context closes obsolete automated tasks.
-- 5. pppp_home_current_actions_v1: exposes only user-facing current actions; technical queues, SLA follow-up heuristics and generic execution tasks stay backstage.
-- 6. project-event-intelligence-5m cron invokes pppp-project-event-intelligence as a server OpenAI fallback when local semantic AI is unavailable.

-- Production migration names:
-- pppp_live_project_state_and_home_actions_v1
-- pppp_sent_offer_supersession_and_home_focus_v2
-- schedule_project_event_intelligence_v1

-- This marker migration is intentionally non-destructive and idempotent. The live definitions are introspectable in Supabase and are protected by pppp_platform_protected_rules.
select 1;