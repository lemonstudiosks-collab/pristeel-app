-- Durable Gmail delivery registry for Opportunity outreach drafts.
-- One row represents one opportunity/action + recipient outreach lifecycle.
create table if not exists public.pppp_opportunity_outreach_registry_v1 (
  id uuid primary key default gen_random_uuid(),
  outreach_id uuid not null default gen_random_uuid(),
  action_id uuid not null references public.pppp_opportunity_actions(id) on delete cascade,
  action_key text not null,
  tender_watch_id uuid null,
  recipient_email text not null,
  recipient_name text null,
  gmail_user text not null,
  gmail_draft_id text null,
  gmail_draft_message_id text null,
  gmail_message_id text null,
  gmail_thread_id text null,
  rfc_message_id text not null,
  status text not null default 'draft_pending',
  language text null,
  subject text null,
  mime_type text null,
  html boolean not null default true,
  human_send_required boolean not null default true,
  gmail_auto_send boolean not null default false,
  draft_created_at timestamptz null,
  sent_at timestamptz null,
  last_checked_at timestamptz null,
  last_error text null,
  generator text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pppp_opportunity_outreach_registry_v1_outreach_uq unique (outreach_id),
  constraint pppp_opportunity_outreach_registry_v1_action_recipient_uq unique (action_id, recipient_email),
  constraint pppp_opportunity_outreach_registry_v1_rfc_message_uq unique (rfc_message_id),
  constraint pppp_opportunity_outreach_registry_v1_recipient_lower_chk check (recipient_email = lower(recipient_email)),
  constraint pppp_opportunity_outreach_registry_v1_status_chk check (status in ('draft_pending','draft_created','draft_missing','sent','error')),
  constraint pppp_opportunity_outreach_registry_v1_human_send_chk check (human_send_required = true),
  constraint pppp_opportunity_outreach_registry_v1_auto_send_chk check (gmail_auto_send = false)
);

create index if not exists pppp_opportunity_outreach_registry_v1_status_idx
  on public.pppp_opportunity_outreach_registry_v1(status, updated_at);
create index if not exists pppp_opportunity_outreach_registry_v1_action_idx
  on public.pppp_opportunity_outreach_registry_v1(action_id, status);
create index if not exists pppp_opportunity_outreach_registry_v1_draft_idx
  on public.pppp_opportunity_outreach_registry_v1(gmail_draft_id)
  where gmail_draft_id is not null;
create index if not exists pppp_opportunity_outreach_registry_v1_message_idx
  on public.pppp_opportunity_outreach_registry_v1(gmail_message_id)
  where gmail_message_id is not null;

alter table public.pppp_opportunity_outreach_registry_v1 enable row level security;

-- Keep the reconciliation run immediately before the draft generator cron so a manually
-- sent draft is marked sent before any regeneration decision is made.
select cron.unschedule(jobid)
from cron.job
where jobname = 'opportunity-outreach-sent-sync-15m';

select cron.schedule(
  'opportunity-outreach-sent-sync-15m',
  '10,25,40,55 * * * *',
  $cron$
    select net.http_get(
      url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-opportunity-outreach-sent-sync?limit=250',
      headers := jsonb_build_object(
        'x-pppp-cron-secret',
        (select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1)
      ),
      timeout_milliseconds := 120000
    );
  $cron$
);
