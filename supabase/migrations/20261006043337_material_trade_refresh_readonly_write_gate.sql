-- Calculated Material Trade refresh remains available to authenticated PPPP UI
-- and the trusted worker/owner-trigger, never to anon or the read-only connector.
revoke execute on function public.pppp_dach_steel_refresh_intelligence_v1(uuid,jsonb)
from PUBLIC, anon, supabase_read_only_user;
