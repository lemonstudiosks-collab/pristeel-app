-- Authenticated clients only need read/use access granted through the intended API surface.
-- Remove schema-changing style privileges from views/tables that inherited overly broad grants.
revoke truncate, references, trigger on table public.pppp_home_current_actions_v1 from authenticated;
revoke truncate, references, trigger on table public.pppp_project_context_current_v from authenticated;
revoke truncate, references, trigger on table public.pppp_project_requirements_summary_v1 from authenticated;
revoke truncate, references, trigger on table public.pppp_tender_operating_lanes_v1 from authenticated;

alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
