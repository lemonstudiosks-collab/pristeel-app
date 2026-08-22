-- Enable the stabilized v4 local semantic orchestrator after live feedback-loop and human-gate validation.
select cron.unschedule(jobid) from cron.job where jobname='semantic-local-orchestrator-5m';
select cron.schedule(
  'semantic-local-orchestrator-5m',
  '7-57/5 * * * *',
  $$select public.semantic_local_orchestrator_internal_request(10);$$
);
