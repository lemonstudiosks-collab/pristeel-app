-- PPPP security hardening: keep internal maintenance/trigger helpers out of public RPC
-- while preserving service/cron execution and authenticated RLS helper behavior.

alter view public.pppp_home_current_actions_v1
  set (security_invoker = true);

alter function public.pppp_email_key_v1(text)
  set search_path = pg_catalog, public;

revoke execute on function public.pppp_context_no_action_reconcile_v1()
  from public, anon, authenticated;
revoke execute on function public.pppp_email_event_canonical_state_guard_v1()
  from public, anon, authenticated;
revoke execute on function public.pppp_project_contact_unique_autolink_v1()
  from public, anon, authenticated;
revoke execute on function public.pppp_project_email_current_state_v1()
  from public, anon, authenticated;

revoke execute on function public.pppp_execution_release_confirmed_v1(uuid)
  from public, anon, authenticated;
revoke execute on function public.pppp_project_email_identity_autolink_v1(integer)
  from public, anon, authenticated;
revoke execute on function public.pppp_project_event_intelligence_internal_request(integer, integer)
  from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_email_context_v1(integer)
  from public, anon, authenticated;
