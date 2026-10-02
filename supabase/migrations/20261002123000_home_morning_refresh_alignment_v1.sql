-- PPPP Home morning freshness alignment v1
-- Keeps the existing sync pipeline and moves the Morning Edition capture
-- after Gmail ingest -> project intake -> event intelligence -> memory synthesis.
-- The function itself checks Europe/Belgrade local hour=6 and edition uniqueness,
-- therefore scheduling both UTC candidates makes the job DST-safe.

do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname='pppp-morning-edition-0630-local'
  limit 1;

  if v_jobid is not null then
    perform cron.alter_job(
      v_jobid,
      schedule => '30 4,5 * * *',
      command => 'select public.pppp_refresh_morning_edition_v1(false);',
      active => true
    );
  end if;
end $$;
