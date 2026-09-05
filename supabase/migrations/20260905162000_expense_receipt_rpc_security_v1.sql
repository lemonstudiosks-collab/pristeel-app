begin;

-- Receipt confirmation/ignore remain explicit signed-in human actions.
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, so revoke
-- PUBLIC explicitly before restoring only the intended authenticated roles.
revoke all on function public.pppp_confirm_expense_receipt_v1(uuid,jsonb) from public,anon;
revoke all on function public.pppp_ignore_expense_receipt_v1(uuid) from public,anon;
grant execute on function public.pppp_confirm_expense_receipt_v1(uuid,jsonb) to authenticated,service_role;
grant execute on function public.pppp_ignore_expense_receipt_v1(uuid) to authenticated,service_role;

commit;
