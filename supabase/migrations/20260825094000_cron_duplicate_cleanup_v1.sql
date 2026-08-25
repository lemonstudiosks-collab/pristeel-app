-- The 5-minute pipeline is now the canonical owner for these three stages.
-- Remove the older hourly copies to avoid duplicate scans, races and needless load.
-- Gmail tracker hourly remains in place because it performs the broader tracker pass.

do $$
declare
  v_jobid bigint;
  v_name text;
begin
  foreach v_name in array array[
    'project-document-intake-hourly',
    'gmail-project-intake-hourly',
    'project-action-engine-hourly'
  ]
  loop
    select jobid into v_jobid from cron.job where jobname=v_name limit 1;
    if v_jobid is not null then
      perform cron.unschedule(v_jobid);
      v_jobid := null;
    end if;
  end loop;
end $$;
