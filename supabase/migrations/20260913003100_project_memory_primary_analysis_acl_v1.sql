-- Lock project-memory helper RPCs to service_role only.
-- Supabase default function privileges may grant EXECUTE explicitly to
-- authenticated even after revoking PUBLIC, so revoke all exposed roles
-- explicitly.

revoke all on function public.pppp_project_primary_analysis_v1(uuid) from public, anon, authenticated;
revoke all on function public.pppp_project_memory_fingerprint_v2(uuid) from public, anon, authenticated;
revoke all on function public.pppp_project_memory_payload_v2(uuid) from public, anon, authenticated;

grant execute on function public.pppp_project_primary_analysis_v1(uuid) to service_role;
grant execute on function public.pppp_project_memory_fingerprint_v2(uuid) to service_role;
grant execute on function public.pppp_project_memory_payload_v2(uuid) to service_role;
