-- PPPP Gmail attachment metadata scan state.
-- Internal machine state only. This table records that a confirmed
-- project + Gmail message pair has already been inspected for downloadable
-- attachments, including the valid case where Gmail exposes only inline assets.

create table if not exists public.project_attachment_scan_state (
  project_id text not null,
  gmail_message_id text not null,
  gmail_thread_id text,
  outcome text not null check (outcome in ('registered','no_downloadable')),
  attachment_count integer not null default 0 check (attachment_count >= 0),
  scan_method text not null default 'server-metadata-v1',
  scanned_at timestamptz not null default now(),
  primary key (project_id, gmail_message_id)
);

comment on table public.project_attachment_scan_state is
  'Internal Gmail attachment metadata scan state. Prevents repeated scans of confirmed project-message pairs, including messages with only inline/non-downloadable MIME parts.';

alter table public.project_attachment_scan_state enable row level security;

-- Existing registered attachment metadata was already scanned successfully.
insert into public.project_attachment_scan_state (
  project_id,
  gmail_message_id,
  gmail_thread_id,
  outcome,
  attachment_count,
  scan_method,
  scanned_at
)
select
  project_id,
  gmail_message_id,
  max(gmail_thread_id) as gmail_thread_id,
  'registered' as outcome,
  count(*)::integer as attachment_count,
  'server-metadata-v1' as scan_method,
  max(coalesce(linked_at, now())) as scanned_at
from public.project_attachment_links
where link_method = 'server-metadata-v1'
  and project_id is not null
  and gmail_message_id is not null
group by project_id, gmail_message_id
on conflict (project_id, gmail_message_id) do update
set gmail_thread_id = excluded.gmail_thread_id,
    outcome = excluded.outcome,
    attachment_count = excluded.attachment_count,
    scan_method = excluded.scan_method,
    scanned_at = greatest(public.project_attachment_scan_state.scanned_at, excluded.scanned_at);
