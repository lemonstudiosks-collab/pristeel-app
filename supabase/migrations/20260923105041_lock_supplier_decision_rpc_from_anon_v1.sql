-- Supplier selection is a deliberate, authenticated human action.
-- Keep the public wrapper available to signed-in operators and trusted server code only.
revoke execute on function public.pppp_record_supplier_decision_v1(uuid, uuid, text, text, jsonb)
  from public, anon;

grant execute on function public.pppp_record_supplier_decision_v1(uuid, uuid, text, text, jsonb)
  to authenticated, service_role, postgres;
