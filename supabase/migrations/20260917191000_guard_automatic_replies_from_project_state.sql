-- Keep automatic/out-of-office replies as communication evidence only.
-- They must not change project operational state or drive email-event intelligence.

create or replace function public.pppp_email_is_automatic_reply_v1(
  p_subject text,
  p_snippet text,
  p_from_email text default null
)
returns boolean
language sql
immutable
set search_path to 'pg_catalog','public'
as $$
  select
    lower(coalesce(p_subject,'')) ~ '(automatische[[:space:]]+antwort|automatic[[:space:]]+reply|auto[[:space:]-]*reply|autoreply|out[[:space:]]+of[[:space:]]+office|abwesenheitsnotiz|vacation[[:space:]]+reply)'
    or lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~ '(ich[[:space:]]+bin[[:space:]]+(bis|vom)|nicht[[:space:]]+im[[:space:]]+haus|außer[[:space:]]+haus|ausser[[:space:]]+haus|i[[:space:]]+am[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|will[[:space:]]+be[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|your[[:space:]]+message[[:space:]]+will[[:space:]]+not[[:space:]]+be[[:space:]]+forwarded)'
    or lower(coalesce(p_from_email,'')) ~ '(mailer-daemon|postmaster)';
$$;

-- Defense in depth at trigger level. The production trigger functions also guard
-- automatic replies, but keeping the WHEN clause here prevents future function
-- refactors from accidentally re-introducing OOO-driven state changes.
drop trigger if exists trg_pppp_project_email_event_engine_v1 on public.project_emails;
create trigger trg_pppp_project_email_event_engine_v1
after insert or update of project_id, subject, snippet, direction, from_email, has_attachments
on public.project_emails
for each row
when (
  coalesce(new.match_method,'') !~~ 'historical-link-only:%'
  and not public.pppp_email_is_automatic_reply_v1(new.subject,new.snippet,new.from_email)
)
execute function public.pppp_project_email_event_engine_v1();

drop trigger if exists trg_pppp_project_email_z_current_state_v1 on public.project_emails;
create trigger trg_pppp_project_email_z_current_state_v1
after insert or update of project_id, direction, sent_at, from_email, to_emails, subject, snippet
on public.project_emails
for each row
when (
  coalesce(new.match_method,'') !~~ 'historical-link-only:%'
  and not public.pppp_email_is_automatic_reply_v1(new.subject,new.snippet,new.from_email)
)
execute function public.pppp_project_email_current_state_v1();
