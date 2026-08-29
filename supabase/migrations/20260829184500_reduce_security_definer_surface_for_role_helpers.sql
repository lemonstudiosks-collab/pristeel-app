-- PPPP security hardening: role helper wrappers do not need elevated execution.
-- current_role() remains SECURITY DEFINER because it is the controlled RLS-aware identity lookup.

alter function public.can_write() security invoker;
alter function public.can_write() set search_path = pg_catalog, public;

alter function public.is_admin() security invoker;
alter function public.is_admin() set search_path = pg_catalog, public;
