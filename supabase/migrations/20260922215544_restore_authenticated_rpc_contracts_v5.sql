-- Restore signed-in UI/admin RPC contracts without changing their behavior.

revoke execute on function public.pppp_automation_control_health_v1() from public, anon;
revoke execute on function public.pppp_confirm_expense_receipt_v1(uuid, jsonb) from public, anon;
revoke execute on function public.pppp_create_manual_supplier_offer_v1(uuid, jsonb) from public, anon;
revoke execute on function public.pppp_ignore_expense_receipt_v1(uuid) from public, anon;

grant execute on function public.pppp_automation_control_health_v1() to authenticated, service_role, postgres;
grant execute on function public.pppp_confirm_expense_receipt_v1(uuid, jsonb) to authenticated, service_role, postgres;
grant execute on function public.pppp_create_manual_supplier_offer_v1(uuid, jsonb) to authenticated, service_role, postgres;
grant execute on function public.pppp_ignore_expense_receipt_v1(uuid) to authenticated, service_role, postgres;
