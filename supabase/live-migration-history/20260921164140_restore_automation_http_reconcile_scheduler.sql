
select cron.schedule(
  'pppp-automation-http-reconcile-5m',
  '*/5 * * * *',
  'select public.pppp_reconcile_automation_http_v1(200);'
);

