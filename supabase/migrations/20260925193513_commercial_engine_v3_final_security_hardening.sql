alter view public.pppp_opportunity_communication_state_v1
  set (security_invoker = true);

revoke all on public.pppp_opportunity_communication_state_v1 from public, anon, authenticated, service_role;
grant select on public.pppp_opportunity_communication_state_v1 to authenticated, service_role;

revoke execute on function public.pppp_pristeel_offer_model_v1(text,text,text,text,text) from public, anon;
grant execute on function public.pppp_pristeel_offer_model_v1(text,text,text,text,text) to authenticated, service_role;
