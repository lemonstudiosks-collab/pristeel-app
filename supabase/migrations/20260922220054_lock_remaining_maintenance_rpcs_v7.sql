-- Final maintenance RPC lock: these privileged reconciliation/scheduler
-- operations have no browser caller or in-function user authorization.

revoke execute on function public.pppp_low_egress_schedule_controller_v1() from public, anon, authenticated;
revoke execute on function public.pppp_supplier_identity_reconcile_v1(boolean) from public, anon, authenticated;
revoke execute on function public.pppp_supplier_master_background_reconcile_v1(integer) from public, anon, authenticated;
revoke execute on function public.pppp_supplier_master_ingest_v1(jsonb) from public, anon, authenticated;

grant execute on function public.pppp_low_egress_schedule_controller_v1() to service_role, postgres;
grant execute on function public.pppp_supplier_identity_reconcile_v1(boolean) to service_role, postgres;
grant execute on function public.pppp_supplier_master_background_reconcile_v1(integer) to service_role, postgres;
grant execute on function public.pppp_supplier_master_ingest_v1(jsonb) to service_role, postgres;
