-- PRISTEEL project pipeline normalization
-- Additive, narrow migration.
-- Aligns persisted project data with the existing Projects UI fallback,
-- which treats an empty pipeline_stage as the first stage: rfq_in.
-- Does not touch won/lost/archived/closed projects.

begin;

alter table public.projects
  alter column pipeline_stage set default 'rfq_in';

update public.projects
set pipeline_stage = 'rfq_in'
where pipeline_stage is null
  and lower(coalesce(status, '')) = 'pritje';

commit;
