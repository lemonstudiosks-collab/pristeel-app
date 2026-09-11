-- Allow signed-in PPPP operators to read the durable outreach lifecycle.
-- Writes remain service-role only and Gmail delivery remains human-gated.
grant select on table public.pppp_opportunity_outreach_registry_v1 to authenticated;

drop policy if exists pppp_opportunity_outreach_registry_authenticated_read
  on public.pppp_opportunity_outreach_registry_v1;

create policy pppp_opportunity_outreach_registry_authenticated_read
  on public.pppp_opportunity_outreach_registry_v1
  for select
  to authenticated
  using ((select auth.uid()) is not null);
