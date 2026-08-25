-- Security hardening for PPPP business-intent routing.
-- Keep read semantics unchanged while preventing accidental direct invocation
-- of the trigger helper from browser/authenticated roles.

alter view public.pppp_tender_operating_lanes_v1 set (security_invoker = true);

revoke execute on function public.pppp_new_project_handoff_v1() from public, anon, authenticated;
grant execute on function public.pppp_new_project_handoff_v1() to service_role;
