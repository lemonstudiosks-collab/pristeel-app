-- Verified official/general contacts for the four operator-selected KOSTT / EBRD 55387 candidates.
-- These are routing contacts, not claims that a named person owns the opportunity.
-- Gmail drafts remain manual/user-triggered and no email is sent by this migration.

update public.pppp_representation_targets_v1
set contact_name = null,
    contact_role = 'Corporate contact — route to International T&D',
    contact_email = 'kecindia@kecrpg.com',
    contact_phone = '+91 22 66670200',
    contact_source = 'https://www.kecrpg.com/investorcontact',
    stage = case when stage='found' then 'contact_ready' else stage end,
    updated_at = now()
where id='6dfa150e-b2a4-4963-a87f-5e1b68dc97a6';

update public.pppp_representation_targets_v1
set contact_name = null,
    contact_role = 'Elnos Group HQ — route to Transmission & Substations',
    contact_email = 'officegroup@elnosgroup.com',
    contact_phone = '+387 51 492 222',
    contact_source = 'https://elnosgroup.com/en/contact/',
    stage = case when stage='found' then 'contact_ready' else stage end,
    updated_at = now()
where id='488d49e9-701e-47d3-abf9-59b0ffea3d83';

update public.pppp_representation_targets_v1
set contact_name = null,
    contact_role = 'Central office — route to International HV Projects',
    contact_email = 'office@em.ro',
    contact_phone = '+40 21 450 3028',
    contact_source = 'https://electromontaj.ro/contact/',
    stage = case when stage='found' then 'contact_ready' else stage end,
    updated_at = now()
where id='49a2d2cf-1fdf-4079-a8a5-8e9e30c0faf2';

update public.pppp_representation_targets_v1
set contact_name = null,
    contact_role = 'Business Enquiries — route to T&D International / BD International',
    contact_email = 'info@kalpataruprojects.com',
    contact_phone = '+91 22 3064 2100',
    contact_source = 'https://www.kalpataruprojects.com/contact',
    stage = case when stage='found' then 'contact_ready' else stage end,
    updated_at = now()
where id='4c3528cb-05b4-47fe-85e8-804dbef9df0a';
