-- Remove only the first-run UNGM rows created before strict Kosovo beneficiary filtering.
-- Abort rather than delete if any user workflow has already linked an UNGM row.

do $$
begin
  if exists (
    select 1
    from public.kek_tender_watch k
    where upper(coalesce(k.payload ->> 'source', '')) = 'UNGM'
      and k.project_id is not null
  ) then
    raise exception 'UNGM source cleanup aborted: project-linked UNGM row exists';
  end if;

  if exists (
    select 1
    from public.outreach_contacts o
    join public.kek_tender_watch k on k.id = o.tender_watch_id
    where upper(coalesce(k.payload ->> 'source', '')) = 'UNGM'
  ) then
    raise exception 'UNGM source cleanup aborted: outreach-linked UNGM row exists';
  end if;
end
$$;

delete from public.kek_tender_watch
where upper(coalesce(payload ->> 'source', '')) = 'UNGM';