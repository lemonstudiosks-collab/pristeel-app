begin;

-- The browser only needs the lifecycle/linkage fields below to classify an
-- opportunity after PPPP has prepared a Gmail draft. Do not expose payloads,
-- subjects, errors or other registry internals.
grant select (
  tender_watch_id,
  recipient_email,
  status,
  draft_created_at,
  sent_at,
  gmail_thread_id,
  gmail_message_id,
  updated_at
) on table public.pppp_opportunity_outreach_registry_v1 to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname='public'
      and tablename='pppp_opportunity_outreach_registry_v1'
      and policyname='pppp_opportunity_outreach_registry_authenticated_read'
  ) then
    create policy pppp_opportunity_outreach_registry_authenticated_read
      on public.pppp_opportunity_outreach_registry_v1
      for select
      to authenticated
      using (true);
  end if;
end $$;

-- UNDP Kosovo is retired from active PPPP procurement monitoring. Historical
-- records stay intact for audit/history, but the source is no longer Home-active.
update public.pppp_procurement_source_policy
set participation_mode='reference',
    home_eligible=false,
    home_min_score=100,
    notes='Retired from active Kosovo procurement monitoring on 2026-09-13; historical records retained only.',
    updated_at=now()
where source='UNDP_KOSOVO';

commit;
