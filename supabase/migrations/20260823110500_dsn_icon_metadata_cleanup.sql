-- Deterministic cleanup for tiny system-generated icons attached to delivery-status notifications.
-- This does not delete the attachment; it only removes false visual-review work.

with noisy as (
  select a.id
  from public.project_attachment_links a
  join public.project_emails e on e.gmail_message_id=a.gmail_message_id
  where a.analysis_status='image_review'
    and coalesce(a.attachment_size_bytes,0)<=4096
    and lower(coalesce(a.attachment_name,'')) in ('icon.png','icon.jpg','icon.jpeg')
    and lower(coalesce(e.from_email,'')) in ('mailer-daemon@googlemail.com','mailer-daemon@gmail.com')
    and lower(coalesce(e.subject,'')) like 'delivery status notification%'
)
update public.project_attachment_links a
set analysis_status='metadata_noise',
    analysis_method='delivery-status-system-icon-v1',
    analysis_error=null,
    bom_status='none',
    bom_applied_count=0,
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','metadata_noise','reason','delivery_status_system_icon'),
    updated_at=now()
from noisy n where a.id=n.id;

update public.tasks t
set status='mbyllur',done_at=coalesce(done_at,now())
where t.source='document_image_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists(
    select 1
    from public.project_attachment_links a
    join public.project_emails e on e.gmail_message_id=a.gmail_message_id
    where t.source_ref='ATTACHMENT:'||a.id::text
      and a.analysis_method='delivery-status-system-icon-v1'
      and lower(coalesce(e.from_email,'')) in ('mailer-daemon@googlemail.com','mailer-daemon@gmail.com')
  );
