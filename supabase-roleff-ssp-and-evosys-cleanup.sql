-- PRISTEEL Roleff follow-up cleanup
-- 1) SSP camera-poles thread is verified by text plus existing manual SSP links.
-- 2) EVOSYS ANF-8910 and generic EVOSYS threads are clearly not Roleff, but
--    no new canonical target is guessed. Manual EVOSYS links remain untouched.
-- No email is deleted.

begin;

-- SSP camera-poles thread -> SSP Smart City Camera Poles.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19dd437fe0897ff8')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id='cfedfdb6-3877-450e-917e-bddd76439096',
    suggested_project_id='cfedfdb6-3877-450e-917e-bddd76439096',
    match_method='thread-verified-ssp',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19dd437fe0897ff8'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

insert into public.project_email_links (project_id,gmail_message_id,gmail_thread_id,link_method)
select 'cfedfdb6-3877-450e-917e-bddd76439096',e.gmail_message_id,e.gmail_thread_id,'thread-verified-ssp'
from public.project_emails e
where e.gmail_thread_id='19dd437fe0897ff8'
  and e.gmail_message_id is not null
  and not exists (
    select 1 from public.project_email_links l
    where l.project_id::text='cfedfdb6-3877-450e-917e-bddd76439096'
      and l.gmail_message_id=e.gmail_message_id
  );

update public.project_emails
set needs_review=false,review_reason=null,updated_at=now()
where gmail_thread_id='19dd437fe0897ff8'
  and project_id='cfedfdb6-3877-450e-917e-bddd76439096'
  and needs_review=true;

-- ANF-8910: clearly not Roleff; preserve existing manual EVOSYS links but do not guess target.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19ede49bb2d9937f')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id=null,
    suggested_project_id=null,
    match_method='user-safety-cleared-from-roleff',
    match_confidence=0,
    needs_review=true,
    review_reason='Removed proven-wrong automatic Roleff assignment; ANF-8910 target not guessed.',
    updated_at=now()
where gmail_thread_id='19ede49bb2d9937f'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- Generic EVOSYS: clearly not Roleff; target remains review-only.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19df2a312599c242')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id=null,
    suggested_project_id=null,
    match_method='user-safety-cleared-from-roleff',
    match_confidence=0,
    needs_review=true,
    review_reason='Removed proven-wrong automatic Roleff assignment; EVOSYS target not guessed.',
    updated_at=now()
where gmail_thread_id='19df2a312599c242'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

commit;
