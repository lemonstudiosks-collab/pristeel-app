-- Remove only the first-run World Bank/MCA rows created by the new multilateral collector.
-- The first production audit found that the World Bank URL filter was ignored and MCA footer headings
-- were parsed as notices. These source keys did not exist before the multilateral rollout.
-- Abort rather than delete if any user workflow has already linked one of these rows.

do $$
begin
  if exists (
    select 1
    from public.kek_tender_watch k
    where upper(coalesce(k.payload ->> 'source', '')) in ('WORLD_BANK', 'MCA_KOSOVO')
      and k.project_id is not null
  ) then
    raise exception 'multilateral source cleanup aborted: project-linked WORLD_BANK/MCA_KOSOVO row exists';
  end if;

  if exists (
    select 1
    from public.outreach_contacts o
    join public.kek_tender_watch k on k.id = o.tender_watch_id
    where upper(coalesce(k.payload ->> 'source', '')) in ('WORLD_BANK', 'MCA_KOSOVO')
  ) then
    raise exception 'multilateral source cleanup aborted: outreach-linked WORLD_BANK/MCA_KOSOVO row exists';
  end if;
end
$$;

delete from public.kek_tender_watch
where upper(coalesce(payload ->> 'source', '')) in ('WORLD_BANK', 'MCA_KOSOVO');
