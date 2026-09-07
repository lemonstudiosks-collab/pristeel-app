-- #416: resume Opportunity Gmail draft generation for future actions only.
-- Existing Gmail drafts/actions before the rollout cutoff are intentionally excluded.
-- The sent-state reconciler runs one minute before this job.

select cron.unschedule(jobid)
from cron.job
where jobname = 'opportunity-gmail-drafts-15m';

select cron.schedule(
  'opportunity-gmail-drafts-15m',
  '11,26,41,56 * * * *',
  $cron$
    select net.http_get(
      url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-opportunity-draft-generator?limit=1&action_id=' || q.id::text,
      headers := jsonb_build_object(
        'x-pppp-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1)
      ),
      timeout_milliseconds := 120000
    )
    from (
      select id
      from public.pppp_opportunity_action_queue_v2
      where status = 'draft_review'
        and action_type in ('gc_project_outreach_draft','producer_capacity_outreach_draft')
        and created_at >= timestamptz '2026-09-07 14:15:00+00'
      order by created_at asc, id asc
      limit 20
    ) q;
  $cron$
);
