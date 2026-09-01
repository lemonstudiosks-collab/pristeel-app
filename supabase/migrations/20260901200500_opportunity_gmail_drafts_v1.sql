-- PPPP Opportunity Gmail drafts v1
-- Creates Gmail DRAFTS only. There is no send endpoint in this automation.

do $do$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='opportunity-gmail-drafts-15m' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'opportunity-gmail-drafts-15m',
    '11,26,41,56 * * * *',
    $cron$
      select net.http_get(
        url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-opportunity-draft-generator?limit=20',
        headers := jsonb_build_object(
          'x-pppp-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1)
        ),
        timeout_milliseconds := 120000
      );
    $cron$
  );
end;
$do$;
