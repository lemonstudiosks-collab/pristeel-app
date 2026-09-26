-- Keep the ChatGPT-facing read contract out of the regular signed-in API surface.
-- The application UI reads the RLS-protected table directly; only the bridge
-- service and the dedicated read-only role need this SECURITY DEFINER RPC.
revoke execute on function public.pppp_chatgpt_representation_targets_v1(text,text,boolean,integer)
  from authenticated;

