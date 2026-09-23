-- Restore the service-only ACLs recorded by the August production hardening
-- migrations. No active browser or public Edge caller exists for these helpers.

revoke execute on function public.hubspot_sync_cron_authorized(text) from public, anon, authenticated;
revoke execute on function public.merge_crm_contacts() from public, anon, authenticated;
revoke execute on function public.pppp_rebuild_gmail_contact_master_v1() from public, anon, authenticated;
revoke execute on function public.pppp_refresh_project_decision(uuid) from public, anon, authenticated;
revoke execute on function public.pppp_sync_contact_from_project_email_v1_row(bigint) from public, anon, authenticated;
revoke execute on function public.pppp_sync_execution_release_readiness_v1() from public, anon, authenticated;

grant execute on function public.hubspot_sync_cron_authorized(text) to service_role, postgres;
grant execute on function public.merge_crm_contacts() to service_role, postgres;
grant execute on function public.pppp_rebuild_gmail_contact_master_v1() to service_role, postgres;
grant execute on function public.pppp_refresh_project_decision(uuid) to service_role, postgres;
grant execute on function public.pppp_sync_contact_from_project_email_v1_row(bigint) to service_role, postgres;
grant execute on function public.pppp_sync_execution_release_readiness_v1() to service_role, postgres;
