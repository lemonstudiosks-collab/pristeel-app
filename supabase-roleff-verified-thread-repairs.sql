-- PRISTEEL Roleff verified historical thread repairs
-- Conservative scope: only project_email rows currently assigned to Roleff are moved.
-- Existing correct/manual links on target projects are never removed or overwritten.
-- No email is deleted.

begin;

-- 1) STACON D-22/26 contract/bank-guarantee thread -> STACON Lagerhalle Hamburg.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19ef4c8cd18394ff')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id='38bdf772-d73e-47b2-9d0f-6020e105aa62',
    suggested_project_id='38bdf772-d73e-47b2-9d0f-6020e105aa62',
    match_method='thread-verified-d22',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19ef4c8cd18394ff'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- 2) EVOSYS ANF-8915 confirmed-order thread -> EVOSYS project.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19f26c29a34d71a5')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id='4c158413-4215-4d1f-9d10-551167b087b0',
    suggested_project_id='4c158413-4215-4d1f-9d10-551167b087b0',
    match_method='thread-verified-anf8915',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19f26c29a34d71a5'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- 3) EVOSYS ANF-8915 RFQ thread -> EVOSYS project. Existing manual EVOSYS links remain untouched.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19edf087ed2490ab')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id='4c158413-4215-4d1f-9d10-551167b087b0',
    suggested_project_id='4c158413-4215-4d1f-9d10-551167b087b0',
    match_method='thread-verified-anf8915',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19edf087ed2490ab'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- 4) SSP SMARTCT thread -> SSP Camera Poles project.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19f272db7f79ef77')
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
where gmail_thread_id='19f272db7f79ef77'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- 5) RSB Sindelfingen Preisanfrage 2540416 -> RSB Sindelfingen project.
delete from public.project_email_links
where project_id::text='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and gmail_message_id in (select gmail_message_id from public.project_emails where gmail_thread_id='19e8da9b462443e8')
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id='6945392e-b9ab-4ea1-9f11-3ec026750e95',
    suggested_project_id='6945392e-b9ab-4ea1-9f11-3ec026750e95',
    match_method='thread-verified-sindelfingen',
    match_confidence=100,
    needs_review=false,
    review_reason=null,
    updated_at=now()
where gmail_thread_id='19e8da9b462443e8'
  and project_id='577a3a5f-cb3f-4049-9c2a-45e6bf158703'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

-- Add missing canonical target links for the verified threads.
with mapping(thread_id,target_id,method) as (
  values
    ('19ef4c8cd18394ff','38bdf772-d73e-47b2-9d0f-6020e105aa62','thread-verified-d22'),
    ('19f26c29a34d71a5','4c158413-4215-4d1f-9d10-551167b087b0','thread-verified-anf8915'),
    ('19edf087ed2490ab','4c158413-4215-4d1f-9d10-551167b087b0','thread-verified-anf8915'),
    ('19f272db7f79ef77','cfedfdb6-3877-450e-917e-bddd76439096','thread-verified-ssp'),
    ('19e8da9b462443e8','6945392e-b9ab-4ea1-9f11-3ec026750e95','thread-verified-sindelfingen')
)
insert into public.project_email_links (project_id,gmail_message_id,gmail_thread_id,link_method)
select m.target_id,e.gmail_message_id,e.gmail_thread_id,m.method
from mapping m
join public.project_emails e on e.gmail_thread_id=m.thread_id
where e.gmail_message_id is not null
  and not exists (
    select 1 from public.project_email_links l
    where l.project_id::text=m.target_id
      and l.gmail_message_id=e.gmail_message_id
  );

commit;
