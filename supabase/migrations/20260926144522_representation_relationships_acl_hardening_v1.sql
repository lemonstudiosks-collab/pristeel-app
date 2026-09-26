revoke all on function public.pppp_chatgpt_bridge_manifest_v27() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v27() to service_role, supabase_read_only_user;

revoke all on function public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_representation_relationships_v1(uuid,text,boolean,integer) to service_role, supabase_read_only_user;
