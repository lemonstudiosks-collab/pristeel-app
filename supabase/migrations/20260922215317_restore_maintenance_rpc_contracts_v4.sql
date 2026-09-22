-- Restore maintenance RPC ACLs declared by their canonical migrations.

revoke execute on function public.pppp_automation_watchdog_v1() from public, anon, authenticated;
revoke execute on function public.pppp_project_discovery_triage_v1(boolean, integer) from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_contact_role_conflicts_v1(boolean) from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_gmail_missing_http_v1(integer) from public, anon, authenticated;
revoke execute on function public.pppp_reconcile_legacy_followups_v1(boolean) from public, anon, authenticated;
revoke execute on function public.pppp_supplier_offer_precision_reconcile_v1(boolean) from public, anon, authenticated;

grant execute on function public.pppp_automation_watchdog_v1() to service_role, postgres;
grant execute on function public.pppp_project_discovery_triage_v1(boolean, integer) to service_role, postgres;
grant execute on function public.pppp_reconcile_contact_role_conflicts_v1(boolean) to service_role, postgres;
grant execute on function public.pppp_reconcile_gmail_missing_http_v1(integer) to service_role, postgres;
grant execute on function public.pppp_reconcile_legacy_followups_v1(boolean) to service_role, postgres;
grant execute on function public.pppp_supplier_offer_precision_reconcile_v1(boolean) to service_role, postgres;
