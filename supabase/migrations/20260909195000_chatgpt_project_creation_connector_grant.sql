-- The Supabase ChatGPT connector executes SQL as supabase_read_only_user.
-- Grant only this tightly-scoped SECURITY DEFINER RPC so ChatGPT can create a
-- project shell without gaining arbitrary write privileges.
grant execute on function public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb)
  to supabase_read_only_user;
