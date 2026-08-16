-- PPPP project email full-body hydration state.
-- Additive only: does not change project matching, relations or Gmail identity.

alter table public.project_emails
  add column if not exists body_hydrated_at timestamptz,
  add column if not exists body_hydration_method text;

comment on column public.project_emails.body_hydrated_at is
  'Timestamp when the Gmail message body was explicitly fetched in full rather than stored as a short Gmail snippet.';
comment on column public.project_emails.body_hydration_method is
  'Hydration provenance, e.g. server-full-mime-v1, browser-gmail-full-v1, legacy-body-existing-v1.';

-- Gmail search snippets are short. Existing bodies >= 1000 chars were already
-- hydrated by earlier browser/project workflows, so mark them without changing content.
update public.project_emails
set body_hydrated_at = coalesce(updated_at, created_at, now()),
    body_hydration_method = 'legacy-body-existing-v1'
where body_hydrated_at is null
  and length(coalesce(snippet,'')) >= 1000;
