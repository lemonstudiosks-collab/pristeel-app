
revoke all on function public.pppp_ted_outreach_readiness_v1(uuid) from public,anon;
grant execute on function public.pppp_ted_outreach_readiness_v1(uuid) to authenticated,service_role;
revoke all on function public.pppp_outbound_source_guard_v1(uuid) from public,anon;
grant execute on function public.pppp_outbound_source_guard_v1(uuid) to authenticated,service_role;

