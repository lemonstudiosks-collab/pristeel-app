-- PPPP V2 keeps one canonical Project while making its operating workflow explicit.
-- Existing pipeline/operational state remains authoritative; this column selects
-- the correct lane and does not approve, send, select, or commit anything.

alter table public.projects
  add column if not exists workflow_type text;

do $do$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.projects'::regclass
      and conname = 'projects_workflow_type_check'
  ) then
    alter table public.projects
      add constraint projects_workflow_type_check
      check (workflow_type is null or workflow_type in (
        'eu_award_sales',
        'self_tender',
        'steel_trading'
      ));
  end if;
end;
$do$;

comment on column public.projects.workflow_type is
  'PPPP V2 operating lane: eu_award_sales, self_tender, or steel_trading. NULL preserves the established generic project workflow until explicitly classified.';

-- Only deterministic historical classifications are backfilled.
update public.projects p
set workflow_type = 'self_tender'
where p.workflow_type is null
  and exists (
    select 1
    from public.kek_tender_watch k
    where k.project_id = p.id
      and coalesce(k.payload->>'notice_phase', 'opportunity') <> 'award'
  );

update public.projects
set workflow_type = 'steel_trading'
where workflow_type is null
  and lower(coalesce(business_type, '')) = 'trading';
