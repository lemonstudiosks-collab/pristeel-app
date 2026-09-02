update public.partner_contacts pc
set email='ksaylik@erdemir.com.tr',
    source=coalesce(pc.source,'crm_exact_company_backfill_v1'),
    notes=case when coalesce(pc.notes,'') ilike '%CRM exact-company backfill%' then pc.notes else concat_ws(E'\n',nullif(pc.notes,''),'CRM exact-company backfill: matched Erdemir + Kaan Saylik from existing supplier CRM record.') end
from public.partners p
where pc.partner_id=p.id
  and p.name='Erdemir'
  and lower(pc.full_name) like 'kaan say%'
  and nullif(trim(pc.email),'') is null;

insert into public.partner_contacts(partner_id,full_name,email,language,is_primary,source,notes)
select p.id,'Asude Kayrak','akayrak@erdemir.com.tr','en',false,'crm_exact_company_backfill_v1','CRM exact-company backfill: matched existing Erdemir supplier CRM contact.'
from public.partners p
where p.name='Erdemir'
  and not exists(select 1 from public.partner_contacts pc where lower(coalesce(pc.email,''))='akayrak@erdemir.com.tr');

update public.partner_contacts pc
set email='aleksandar@gis.com.mk',
    source=coalesce(pc.source,'crm_exact_company_backfill_v1'),
    notes=case when coalesce(pc.notes,'') ilike '%CRM exact-company backfill%' then pc.notes else concat_ws(E'\n',nullif(pc.notes,''),'CRM exact-company backfill: matched GIS + Aleksandar from existing supplier CRM record.') end
from public.partners p
where pc.partner_id=p.id
  and p.name='GIS'
  and lower(pc.full_name) like 'aleksandar%'
  and nullif(trim(pc.email),'') is null;

insert into public.partner_contacts(partner_id,full_name,email,language,is_primary,source,notes)
select p.id,'Makstil Sales','sales@makstil.com.mk','en',false,'crm_exact_company_backfill_v1','CRM exact-company backfill: matched existing Makstil supplier CRM contact.'
from public.partners p
where p.name='Makstil'
  and not exists(select 1 from public.partner_contacts pc where lower(coalesce(pc.email,''))='sales@makstil.com.mk');