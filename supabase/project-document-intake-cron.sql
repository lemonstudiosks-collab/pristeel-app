-- PPPP project document intake schedule.
-- Production invariant:
--   Gmail tracker runs at :05 each hour.
--   Confirmed-project document intake runs at :10 each hour, max 5 attachment links/run.
-- This script is idempotent by job name and deliberately reuses the private server-only wrapper.

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'project-document-intake-hourly') then
    perform cron.schedule(
      'project-document-intake-hourly',
      '10 * * * *',
      $cron$select public.project_document_intake_internal_request('run',5);$cron$
    );
  end if;
end;
$$;
