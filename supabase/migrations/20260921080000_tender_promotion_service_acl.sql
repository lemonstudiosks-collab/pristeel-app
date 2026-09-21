-- Lock Direct Tender project-promotion RPCs to service-owned execution.
-- Production was hotfixed first; this migration records the same least-privilege boundary.

begin;

revoke execute on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer)
  from public, anon, authenticated;
revoke execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer)
  from public, anon, authenticated;

grant execute on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer)
  to service_role;
grant execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer)
  to service_role;

commit;
