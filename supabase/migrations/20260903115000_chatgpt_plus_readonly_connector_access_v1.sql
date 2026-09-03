-- PPPP ChatGPT Plus read-only connector access v1
-- The installed ChatGPT Supabase connector runs as supabase_read_only_user with
-- transaction_read_only=on. Grant that database role only the three read contracts.
-- The context-suggestion write helper remains service_role-only.

DO $block$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='supabase_read_only_user') THEN
    GRANT EXECUTE ON FUNCTION public.pppp_chatgpt_search_projects_v1(text,integer)
      TO supabase_read_only_user;
    GRANT EXECUTE ON FUNCTION public.pppp_chatgpt_priority_actions_v1(integer)
      TO supabase_read_only_user;
    GRANT EXECUTE ON FUNCTION public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)
      TO supabase_read_only_user;

    REVOKE ALL ON FUNCTION public.pppp_chatgpt_record_context_suggestion_v1(uuid,text,jsonb,text,text,numeric,text,text)
      FROM supabase_read_only_user;
  END IF;
END
$block$;

comment on function public.pppp_chatgpt_search_projects_v1(text,integer) is
  'Internal ChatGPT Plus read bridge. Executable by service_role and the Supabase read-only connector role when present.';
comment on function public.pppp_chatgpt_priority_actions_v1(integer) is
  'Internal ChatGPT Plus read bridge for canonical operator-safe actions. Executable by service_role and the Supabase read-only connector role when present.';
comment on function public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer) is
  'Internal ChatGPT Plus read-only project snapshot. Executable by service_role and the Supabase read-only connector role when present.';
