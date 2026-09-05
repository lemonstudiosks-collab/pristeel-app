begin;

-- Tighten managed follow-up draft latency without changing any UI/runtime owner.
-- Gmail intake runs every 5 minutes and supplier quote reconciliation every 10 minutes;
-- this cadence runs after those loops often enough to prepare drafts promptly while
-- preserving the existing human-send gate in pppp-followup-draft-generator.
do $do$
begin
  if exists (
    select 1 from cron.job where jobname = 'pppp-followup-drafts-hourly'
  ) then
    perform cron.unschedule('pppp-followup-drafts-hourly');
  end if;

  if exists (
    select 1 from cron.job where jobname = 'pppp-followup-drafts-15m'
  ) then
    perform cron.unschedule('pppp-followup-drafts-15m');
  end if;

  perform cron.schedule(
    'pppp-followup-drafts-15m',
    '10,25,40,55 * * * *',
    'select public.pppp_followup_draft_generator_internal_request(20);'
  );
end
$do$;

commit;
