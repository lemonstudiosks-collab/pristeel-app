-- Reconcile PPPP internal registry tables with the live service-role-only posture.
alter table if exists public.pppp_platform_changelog enable row level security;
alter table if exists public.pppp_platform_context enable row level security;
alter table if exists public.pppp_platform_integrations enable row level security;
alter table if exists public.pppp_platform_protected_rules enable row level security;

revoke all on table public.pppp_platform_changelog from public, anon, authenticated;
revoke all on table public.pppp_platform_context from public, anon, authenticated;
revoke all on table public.pppp_platform_integrations from public, anon, authenticated;
revoke all on table public.pppp_platform_protected_rules from public, anon, authenticated;

grant all on table public.pppp_platform_changelog to service_role;
grant all on table public.pppp_platform_context to service_role;
grant all on table public.pppp_platform_integrations to service_role;
grant all on table public.pppp_platform_protected_rules to service_role;
