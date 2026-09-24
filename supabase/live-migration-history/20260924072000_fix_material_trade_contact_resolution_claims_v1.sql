create or replace function public.pppp_dach_steel_contact_resolution_v1(p_target_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
with target as (
  select * from public.pppp_dach_steel_targets_v1 where id=p_target_id
),
evidence_rows as (
  select
    t.source_url as target_source_url,
    e.item,
    concat_ws(' ',
      e.item->>'email',
      e.item->>'label',
      e.item->>'claim',
      e.item->>'title',
      e.item->>'source'
    ) as searchable_text
  from target t
  cross join lateral jsonb_array_elements(coalesce(t.evidence,'[]'::jsonb)) e(item)
),
evidence_emails as (
  select
    lower((regexp_match(searchable_text,
      '([A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,})','i'))[1]) as email,
    nullif(btrim(item->>'person'),'') as person,
    case
      when lower(searchable_text) ~ '(einkauf|purchas|procurement|service achats|ufficio acquisti|nabavk|achats|compras|zakupy)' then 'Purchasing / Procurement'
      when lower(searchable_text) like '%commercial department%' then 'Commercial department'
      when lower(searchable_text) like '%official company contact%' then 'Official company contact'
      when lower(searchable_text) like '%company contact%' then 'Public company contact'
      else 'Public contact'
    end as role,
    'target_evidence'::text as source,
    coalesce(item->>'url', target_source_url) as source_url,
    item as source_payload
  from evidence_rows
  where searchable_text ~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
),
target_domain as (
  select
    t.*,
    lower(coalesce(
      nullif(btrim(t.company_domain),''),
      (select split_part(email,'@',2) from evidence_emails where email is not null limit 1),
      ''
    )) as resolved_domain,
    regexp_replace(
      regexp_replace(lower(coalesce(t.company_name,'')),
        '\m(gmbh|mbh|ag|kg|co|und|&|stahlbau|metallbau|fahrzeug|technik|metalltechnik)\M','','g'),
      '[^a-z0-9]+','','g'
    ) as company_key
  from target t
),
contact_master_candidates as (
  select
    lower(cm.email) as email,
    nullif(btrim(cm.person),'') as person,
    nullif(btrim(cm.role),'') as role,
    'contact_master'::text as source,
    null::text as source_url,
    cm.sources as source_payload,
    case
      when lower(coalesce(cm.role,'')) ~ '(einkauf|procurement|materialwirtschaft|technischer einkauf|strategischer einkauf|purchas)' then 115
      when lower(coalesce(cm.role,'')) ~ '(kalkulation|kalkulator|projektleiter|project manager|bauleiter)' then 102
      when lower(coalesce(cm.role,'')) ~ '(geschäftsführer|geschaeftsfuehrer|inhaber|director|owner)' then 92
      when split_part(lower(cm.email),'@',1) in ('info','kontakt','office','mail','zentrale') then 62
      else 84
    end + case when nullif(btrim(cm.person),'') is not null then 8 else 0 end as score
  from public.pppp_contact_master_v1 cm
  cross join target_domain t
  where nullif(btrim(cm.email),'') is not null
    and lower(split_part(cm.email,'@',2)) not in ('gmail.com','hotmail.com','outlook.com','yahoo.com','icloud.com','example.com','example.org','example.net')
    and (
      (t.resolved_domain<>'' and lower(split_part(cm.email,'@',2))=t.resolved_domain)
      or (
        t.company_key<>'' and
        regexp_replace(
          regexp_replace(lower(coalesce(cm.company,'')),
            '\m(gmbh|mbh|ag|kg|co|und|&|stahlbau|metallbau|fahrzeug|technik|metalltechnik)\M','','g'),
          '[^a-z0-9]+','','g'
        )=t.company_key
      )
    )
),
evidence_candidates as (
  select
    ev.email, ev.person, ev.role, ev.source, ev.source_url, ev.source_payload,
    case
      when lower(coalesce(ev.role,'')) ~ '(purchas|procurement|einkauf)' then 114
      when split_part(ev.email,'@',1) ~ '(einkauf|procurement|purchas|material|kalk|achat|acquisti|nabav)' then 108
      when split_part(ev.email,'@',1) in ('info','kontakt','office','mail','zentrale') then 58
      when split_part(ev.email,'@',1) ~ '[._\-]' then 88
      else 80
    end as score
  from evidence_emails ev
),
all_candidates as (
  select * from contact_master_candidates
  union all
  select * from evidence_candidates
),
dedup as (
  select distinct on (email)
    email,person,role,source,source_url,source_payload,score
  from all_candidates
  where email is not null and email<>''
  order by email,score desc,case when source='contact_master' then 0 else 1 end
),
ranked as (
  select *,
    case
      when lower(coalesce(role,'')) ~ '(einkauf|procurement|materialwirtschaft|purchas|achats|acquisti|nabav)' or split_part(email,'@',1) ~ '(einkauf|procurement|purchas|material|achat|acquisti|nabav)' then 'procurement'
      when lower(coalesce(role,'')) ~ '(kalkulation|projektleiter|project manager|bauleiter)' then 'project'
      when lower(coalesce(role,'')) ~ '(geschäftsführer|geschaeftsfuehrer|inhaber|director|owner)' then 'management'
      when split_part(email,'@',1) in ('info','kontakt','office','mail','zentrale') then 'general'
      else 'direct_public'
    end as quality
  from dedup
  order by score desc,case when source='contact_master' then 0 else 1 end,email
),
best as (select * from ranked limit 1)
select jsonb_build_object(
  'target_id',t.id,
  'company_name',t.company_name,
  'company_domain',nullif(t.resolved_domain,''),
  'status',case when b.email is not null then 'found' else 'missing' end,
  'email',b.email,
  'person',b.person,
  'role',b.role,
  'source',b.source,
  'source_url',b.source_url,
  'quality',b.quality,
  'score',b.score,
  'candidates',coalesce((
    select jsonb_agg(jsonb_build_object(
      'email',r.email,'person',r.person,'role',r.role,'source',r.source,
      'source_url',r.source_url,'quality',r.quality,'score',r.score
    ) order by r.score desc,r.email)
    from (select * from ranked limit 8) r
  ),'[]'::jsonb)
)
from target_domain t
left join best b on true;
$function$;
