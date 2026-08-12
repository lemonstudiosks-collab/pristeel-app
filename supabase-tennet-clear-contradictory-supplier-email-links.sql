-- PRISTEEL TenneT/SPIE narrow historical email cleanup
-- Four assignments are objectively contradicted by their own subject/snippet:
-- two explicitly say project in England, two explicitly say Montenegro.
-- All TenneT links are automatic. No email is deleted and no target project is guessed.

begin;

delete from public.project_email_links
where project_id='c937aea1-af5e-4807-ae1e-e36864e46794'
  and gmail_message_id in (
    '19f93e7ef63af536', -- England supplier offer
    '19f7e2c99a65ab2c', -- England RFQ
    '19f4717a7a7d735c', -- Montenegro forwarded RFQ
    '19ed5a41c99eab28'  -- Montenegro sports hall 73.7t
  )
  and lower(coalesce(link_method,'')) not like 'manual%'
  and lower(coalesce(link_method,'')) <> 'gmail-panel';

update public.project_emails
set project_id=null,
    suggested_project_id=null,
    match_method='supplier-domain-safety-cleared',
    match_confidence=0,
    needs_review=true,
    review_reason='Removed contradictory automatic TenneT assignment: email content explicitly identifies another project/location.',
    updated_at=now()
where gmail_message_id in (
    '19f93e7ef63af536',
    '19f7e2c99a65ab2c',
    '19f4717a7a7d735c',
    '19ed5a41c99eab28'
  )
  and project_id='c937aea1-af5e-4807-ae1e-e36864e46794'
  and lower(coalesce(match_method,'')) not like 'manual%'
  and lower(coalesce(match_method,'')) <> 'gmail-panel';

commit;
