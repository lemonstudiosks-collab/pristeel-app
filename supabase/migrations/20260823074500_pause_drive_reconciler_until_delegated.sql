-- Drive automation external-auth guard.
-- The server-side reconciler is valid and remains deployed, but the current
-- Google Workspace service account is not delegated for Drive scope.
-- Pause only the hourly cron to avoid repeated 401 failures. Existing browser
-- lifecycle and current canonical Drive links remain intact.
do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='project-drive-reconciler-hourly' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
end $$;
