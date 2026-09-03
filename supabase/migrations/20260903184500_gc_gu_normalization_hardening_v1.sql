begin;

create or replace function public.pppp_gc_normalize_domain_v1(p_value text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  with a as (
    select lower(btrim(coalesce(p_value,''))) as s
  ), b as (
    select regexp_replace(s,'^[a-z][a-z0-9+.-]*://','','i') as s from a
  ), c as (
    select split_part(split_part(split_part(split_part(s,'/',1),'?',1),'#',1),':',1) as s from b
  )
  select nullif(regexp_replace(s,'^www[.]','','i'),'') from c;
$$;

create or replace function public.pppp_gc_normalize_company_v1(p_name text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  with a as (
    select lower(btrim(coalesce(p_name,''))) as s
  ), b as (
    select regexp_replace(s,'[^a-z0-9]+',' ','g') as s from a
  ), c as (
    select btrim(regexp_replace(s,'([[:space:]]+(gmbh|mbh|ag|se|kg|co|ltd|limited|plc|llp|inc|corp|corporation|bv|nv|oy|ab|as|asa|sa|srl|spa|sas|sarl|doo|dd|kft|sp|z|o))+$','','i')) as s from b
  )
  select nullif(regexp_replace(s,'[[:space:]]+',' ','g'),'') from c;
$$;

-- Re-key only untouched prospects. Contacted/replied history is never renumbered by a normalizer change.
update public.pppp_gc_prospects_v1 p
   set company_domain=public.pppp_gc_normalize_domain_v1(coalesce(p.company_domain,p.website_url,public.pppp_gc_domain_from_email_v1(p.contact_email))),
       company_key=public.pppp_gc_company_key_v1(
         p.company_name,
         public.pppp_gc_normalize_domain_v1(coalesce(p.company_domain,p.website_url,public.pppp_gc_domain_from_email_v1(p.contact_email))),
         p.country_code
       ),
       updated_at=now()
 where p.status in ('discovered','research_ready','contact_ready','human_review','already_contacted')
   and p.first_sent_at is null
   and p.second_sent_at is null;

commit;
