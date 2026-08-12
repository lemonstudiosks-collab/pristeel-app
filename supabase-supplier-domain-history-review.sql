-- PRISTEEL historical supplier-domain review queue
-- Conservative data marking only. No project/email links are removed here.
-- Marks old automatic email assignments that relied on supplier email ownership
-- without reference/project-name/client evidence, excluding manual and gmail-panel.

with supplier_names as (
  select distinct lower(btrim(x.name)) as name
  from public.partners p
  cross join lateral unnest(array_append(coalesce(p.aliases,array[]::text[]),p.name)) x(name)
  where p.relation @> array['supplier']::text[]
    and x.name is not null
    and length(btrim(x.name)) >= 4
), supplier_domains as (
  select distinct split_part(lower(c.email),'@',2) as domain
  from public.contacts c
  where c.email is not null
    and position('@' in c.email) > 0
    and (
      lower(coalesce(c.kind,''))='supplier'
      or exists (
        select 1 from supplier_names s
        where lower(coalesce(c.company,'')) like '%'||s.name||'%'
           or s.name like '%'||lower(coalesce(c.company,''))||'%'
      )
    )
), suspects as (
  select e.id
  from public.project_emails e
  where e.project_id is not null
    and lower(coalesce(e.match_method,'')) not like 'manual%'
    and lower(coalesce(e.match_method,'')) <> 'gmail-panel'
    and (lower(coalesce(e.match_method,'')) like '%email-unique%'
         or lower(coalesce(e.match_method,'')) like '%email-shared%')
    and lower(coalesce(e.match_method,'')) not like '%reference%'
    and lower(coalesce(e.match_method,'')) not like '%project-name%'
    and lower(coalesce(e.match_method,'')) not like '%client%'
    and exists (
      select 1
      from unnest(array_append(coalesce(e.to_emails,array[]::text[])||coalesce(e.cc_emails,array[]::text[]),e.from_email)) a
      where split_part(lower(a),'@',2) in (select domain from supplier_domains)
    )
)
update public.project_emails e
set needs_review=true,
    review_reason=case
      when nullif(btrim(coalesce(e.review_reason,'')),'') is null
        then 'Historical supplier-domain-only auto-match; review project assignment.'
      else e.review_reason
    end,
    updated_at=now()
where e.id in (select id from suspects)
  and coalesce(e.needs_review,false)=false;
