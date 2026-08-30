create temporary table _pppp_detach_system_backfill on commit drop as
select e.id,e.project_id,e.gmail_message_id
from public.project_emails e
where e.match_method='project-contact-unique-backfill-v1'
  and (
    exists(select 1 from unnest(coalesce(e.to_emails,'{}'::text[])) x where lower(x) like '%hubspot.com%')
    or lower(coalesce(e.subject,'')) like '%is now connected to hubspot%'
  );

delete from public.project_email_links l
using _pppp_detach_system_backfill d
where l.gmail_message_id=d.gmail_message_id and l.project_id=d.project_id::text;

delete from public.project_attachment_links a
using _pppp_detach_system_backfill d
where a.gmail_message_id=d.gmail_message_id and a.project_id=d.project_id::text;

update public.project_emails e
set project_id=null,
    suggested_project_id=null,
    match_method='project-contact-unique-detached-system-v2',
    match_confidence=0,
    needs_review=false,
    review_reason='Detached automatically: platform/CRM system notification is not project evidence.',
    updated_at=now()
from _pppp_detach_system_backfill d
where e.id=d.id;