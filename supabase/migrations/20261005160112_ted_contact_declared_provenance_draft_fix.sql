-- Exact TED declaration permits a brand domain only for the selected canonical winner.
-- CREATE OR REPLACE preserves existing grants and invoker security. No business rows are changed.
CREATE OR REPLACE FUNCTION public.pppp_ted_contact_candidates_v1(p_tender_watch_id uuid)
 RETURNS TABLE(email text, full_name text, job_title text, functional_role text, source_type text, source_url text, confidence_score integer, payload jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
with t as (
  select id,title,source_url,detail_url,payload
  from public.kek_tender_watch
  where id=p_tender_watch_id
    and upper(coalesce(payload->>'source',''))='TED'
    and coalesce(payload->>'notice_phase','')='award'
    and nullif(btrim(payload->'winner'->>'name'),'') is not null
),
w as (
  select t.*,t.payload->'winner' winner,
         public.pppp_opportunity_company_key_v1(t.payload->'winner'->>'name') winner_key
  from t
),
declared as (
  select
    w.*,
    lower(btrim(e.value)) as email,
    e.ord::int as ord,
    coalesce(
      nullif(w.winner->'names'->>((e.ord-1)::int),''),
      nullif(w.winner->>'name','')
    ) as owner_name
  from w
  cross join lateral jsonb_array_elements_text(coalesce(w.winner->'emails','[]'::jsonb))
    with ordinality as e(value,ord)
  union all
  select
    w.*,
    lower(btrim(w.winner->>'email')) as email,
    1 as ord,
    nullif(w.winner->>'name','') as owner_name
  from w
  where nullif(btrim(w.winner->>'email'),'') is not null
    and coalesce(jsonb_array_length(coalesce(w.winner->'names','[]'::jsonb)),0)<=1
),
direct_raw as (
  select distinct
    d.email,
    null::text full_name,
    null::text job_title,
    case when lower(d.email)~'(procurement|purchasing|einkauf|tender|vergabe|przetarg|poptav|nabidk|compras)' then 'procurement'
         when lower(d.email)~'(technical|technik|engineering)' then 'technical'
         when lower(d.email)~'(project|projekt)' then 'project'
         when lower(d.email)~'(sales|commercial|verkauf)' then 'commercial'
         else 'general' end functional_role,
    'ted_winner_organization'::text source_type,
    coalesce(d.detail_url,d.source_url) source_url,
    95 confidence_score,
    jsonb_build_object(
      'company_attribution','ted_winner_organization',
      'recipient_company_name',d.owner_name,
      'recipient_company_identifier',d.winner->>'identifier',
      'identity_version',d.winner->>'identity_version'
    ) payload
  from declared d
  where coalesce(d.winner->>'identity_version','')='ted-winner-canonical-v2'
    and nullif(btrim(d.winner->>'identifier'),'') is not null
    and coalesce(d.email,'')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and public.pppp_opportunity_company_key_v1(d.owner_name)=d.winner_key
    and (
      public.pppp_opportunity_domain_plausible_v1(d.owner_name,split_part(d.email,'@',2))
      or (
        public.pppp_opportunity_company_key_v1(d.owner_name)=d.winner_key
        and exists (
          select 1
          from jsonb_array_elements_text(coalesce(d.winner->'ted_declared_emails','[]'::jsonb)) proof(email)
          where lower(btrim(proof.email))=d.email
        )
      )
    )
    and public.pppp_outreach_contact_tier_v2(d.email,null,null)<>'F'
),
orgs as (
  select w.*,o.org,count(*) over(partition by w.id) org_count,
         public.pppp_opportunity_company_key_v1(o.org->>'name') org_key,
         lower(regexp_replace(
           coalesce(nullif(o.org->>'domain',''),nullif(o.org->>'official_website','')),
           '^https?://(www\.)?|/.*$','','gi'
         )) org_domain
  from w
  cross join lateral jsonb_array_elements(coalesce(w.winner->'contact_enrichment'->'organizations','[]'::jsonb)) o(org)
),
enriched_raw as (
  select
    lower(btrim(c.contact->>'value')) email,
    nullif(coalesce(c.contact->>'name',c.contact->>'full_name',c.contact->>'person_name'),'') full_name,
    nullif(coalesce(c.contact->>'job_title',c.contact->>'title'),'') job_title,
    case when lower(coalesce(c.contact->>'purpose',''))~'(procurement|purchasing|einkauf|tender|vergabe|sourcing)' then 'procurement'
         when lower(coalesce(c.contact->>'purpose',''))~'(technical|technik|engineering)' then 'technical'
         when lower(coalesce(c.contact->>'purpose',''))~'(project|projekt)' then 'project'
         when lower(coalesce(c.contact->>'purpose',''))~'(production|fertigung)' then 'production'
         when lower(coalesce(c.contact->>'purpose',''))~'(sales|commercial|verkauf)' then 'commercial'
         when lower(coalesce(c.contact->>'purpose',''))~'(management|director|geschäfts|geschaefts)' then 'management'
         else 'general' end functional_role,
    coalesce(nullif(c.contact->>'source_type',''),'ted_contact_enrichment') source_type,
    coalesce(nullif(c.contact->>'source_url',''),o.detail_url,o.source_url) source_url,
    greatest(0,least(100,
      case when coalesce(c.contact->>'score','')~'^[0-9]+(\.[0-9]+)?$'
           then round((c.contact->>'score')::numeric)::int
           when lower(coalesce(c.contact->>'confidence',''))='high' then 90
           when lower(coalesce(c.contact->>'confidence',''))='medium' then 80
           else 75 end
    )) confidence_score,
    jsonb_build_object(
      'company_attribution','contact_enrichment',
      'recipient_company_name',o.org->>'name',
      'organization_name',o.org->>'name',
      'organization_domain',nullif(o.org_domain,'')
    ) payload
  from orgs o
  cross join lateral jsonb_array_elements(coalesce(o.org->'contacts','[]'::jsonb)) c(contact)
  where coalesce(c.contact->>'type','')='email'
    and coalesce(c.contact->>'value','')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and lower(coalesce(c.contact->>'draft_eligible','true'))<>'false'
    and (
      lower(coalesce(c.contact->>'confidence','')) in ('high','medium')
      or (
        coalesce(c.contact->>'score','')~'^[0-9]+(\.[0-9]+)?$'
        and (c.contact->>'score')::numeric>=80
      )
    )
    and nullif(o.org_key,'') is not null
    and nullif(o.winner_key,'') is not null
    and (o.org_key=o.winner_key or o.org_count=1)
    and nullif(o.org_domain,'') is not null
    and public.pppp_opportunity_domain_plausible_v1(o.org->>'name',o.org_domain)
    and (
      split_part(lower(c.contact->>'value'),'@',2)=o.org_domain
      or split_part(lower(c.contact->>'value'),'@',2) like '%.'||o.org_domain
    )
    and public.pppp_outreach_contact_tier_v2(
      lower(btrim(c.contact->>'value')),
      nullif(coalesce(c.contact->>'name',c.contact->>'full_name',c.contact->>'person_name'),''),
      nullif(coalesce(c.contact->>'job_title',c.contact->>'title'),'')
    )<>'F'
),
outreach_raw as (
  select
    lower(btrim(o.contact_email)) email,
    null::text full_name,
    null::text job_title,
    case when lower(o.contact_email)~'(procurement|purchasing|einkauf|tender|vergabe|sourcing|przetarg|poptav|nabidk|compras)' then 'procurement'
         when lower(o.contact_email)~'(technical|technik|engineering)' then 'technical'
         when lower(o.contact_email)~'(project|projekt)' then 'project'
         when lower(o.contact_email)~'(sales|commercial|verkauf)' then 'commercial'
         else 'general' end functional_role,
    coalesce(nullif(o.source,''),'outreach_contacts') source_type,
    coalesce(w.detail_url,w.source_url) source_url,
    85 confidence_score,
    jsonb_build_object(
      'company_attribution','outreach_contacts',
      'recipient_company_name',w.winner->>'name'
    ) payload
  from w
  join public.outreach_contacts o
    on nullif(w.winner_key,'') is not null
   and nullif(public.pppp_opportunity_company_key_v1(o.company_name),'') is not null
   and public.pppp_opportunity_company_key_v1(o.company_name)=w.winner_key
  where coalesce(o.contact_email,'')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and coalesce(o.bounced,false)=false
    and public.pppp_opportunity_domain_plausible_v1(
      w.winner->>'name',
      split_part(lower(o.contact_email),'@',2)
    )
    and public.pppp_outreach_contact_tier_v2(lower(o.contact_email),null,null)<>'F'
),
allc as (
  select * from direct_raw
  union all select * from enriched_raw
  union all select * from outreach_raw
)
select distinct on(email)
  email,full_name,job_title,functional_role,source_type,source_url,confidence_score,payload
from allc
where nullif(email,'') is not null
order by email,confidence_score desc,source_type
$function$
