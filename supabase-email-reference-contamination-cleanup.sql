-- PRISTEEL email reference contamination cleanup
-- Narrow data repair after removing unsafe free-text legacy refs from Gmail identity matching.
-- No email rows are deleted.

begin;

-- High-confidence official references from client email subjects.
update public.projects
set business_ref='LSA104604'
where id='007666c1-4893-4a84-b451-ab89b37c99a5'
  and (business_ref is null or btrim(business_ref)='');

update public.projects
set business_ref='BUNT'
where id='c937aea1-af5e-4807-ae1e-e36864e46794'
  and (business_ref is null or btrim(business_ref)='');

-- Five Bilfinger links were created only by the unsafe generic legacy ref "referenzen".
-- All five point to unrelated companies and none is manual.
delete from public.project_email_links
where project_id='007666c1-4893-4a84-b451-ab89b37c99a5'
  and gmail_message_id in (
    '19fd5c49ca26da5e', -- Reuter Bau
    '19f1338a162d7276', -- MCE-HG
    '19e96741791b91e8', -- HABAU Deutschland
    '19e3b0041fdeb47b', -- Hellmich
    '19e3a29b837b883f'  -- RSB
  )
  and lower(coalesce(link_method,'')) not like 'manual%';

update public.project_emails
set project_id=null,
    suggested_project_id=null,
    match_method='reference-safety-cleared',
    match_confidence=0,
    needs_review=true,
    review_reason='Removed false Bilfinger assignment caused by unsafe legacy ref: referenzen',
    updated_at=now()
where gmail_message_id in (
    '19fd5c49ca26da5e',
    '19f1338a162d7276',
    '19e96741791b91e8',
    '19e3b0041fdeb47b',
    '19e3a29b837b883f'
  )
  and project_id='007666c1-4893-4a84-b451-ab89b37c99a5'
  and lower(coalesce(match_method,'')) not like 'manual%';

commit;
