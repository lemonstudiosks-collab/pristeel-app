-- PRISTEEL Andrijevica thread repair
-- Gmail thread 19ed08e9d93251a5 explicitly starts with:
-- "sportsku salu u Andrijevici" and follow-ups repeatedly say Montenegro.
-- Target project exists: ITALIAN STYLE - SPORTSKA HALA ANDRIJEVICA.
-- Three historical Roleff links are automatic, not manual.
-- No email is deleted.

begin;

-- Remove only the proven-wrong automatic Roleff links from this thread.
delete from public.project_email_links
where project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (
    select gmail_message_id
    from public.project_emails
    where gmail_thread_id='19ed08e9d93251a5'
  )
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

-- Canonically assign the complete verified thread to Andrijevica.
update public.project_emails
set project_id='0c94bd4d-dae9-4cc1-990c-555b12ca3328',
    suggested_project_id='0c94bd4d-dae9-4cc1-990c-555b12ca3328',
    match_method='thread-verified-andrijevica',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19ed08e9d93251a5'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- Add explicit relation rows for every message in the verified thread.
insert into public.project_email_links (project_id,gmail_message_id,gmail_thread_id,link_method)
select '0c94bd4d-dae9-4cc1-990c-555b12ca3328',
       e.gmail_message_id,
       e.gmail_thread_id,
       'thread-verified-andrijevica'
from public.project_emails e
where e.gmail_thread_id='19ed08e9d93251a5'
  and e.gmail_message_id is not null
  and not exists (
    select 1
    from public.project_email_links l
    where l.project_id::text='0c94bd4d-dae9-4cc1-990c-555b12ca3328'
      and l.gmail_message_id=e.gmail_message_id
  );

commit;
