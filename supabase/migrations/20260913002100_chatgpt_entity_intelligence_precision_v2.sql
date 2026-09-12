-- PPPP Entity Intelligence precision pass.
-- Keeps the public bridge signature stable while separating direct entity
-- communication from wider project context and separating supplier quotes
-- from PRISTEEL client offers. Read-only; no operational writes.

create or replace function public.pppp_chatgpt_entity_intelligence_v1(
  p_query text,
  p_limit integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
with params as (
  select
    btrim(coalesce(p_query,'')) as q,
    lower(btrim(coalesce(p_query,''))) as ql,
    public.pppp_gc_normalize_company_v1(p_query) as qn,
    greatest(1,least(coalesce(p_limit,10),20)) as lim
),
partner_candidates as (
  select p.*,
    greatest(
      case when lower(coalesce(p.name,''))=(select ql from params) then 100 else 0 end,
      case when exists(select 1 from unnest(coalesce(p.aliases,'{}'::text[])) a where lower(a)=(select ql from params)) then 98 else 0 end,
      case when (select qn from params) is not null and length((select qn from params))>=3
                 and public.pppp_gc_normalize_company_v1(p.name)=(select qn from params) then 96 else 0 end,
      case when length((select ql from params))>=3
                 and lower(coalesce(p.name,'')) like '%'||(select ql from params)||'%' then 86 else 0 end,
      case when length((select ql from params))>=3
                 and exists(select 1 from unnest(coalesce(p.aliases,'{}'::text[])) a where lower(a) like '%'||(select ql from params)||'%') then 84 else 0 end,
      case when length((select ql from params))>=4
                 and lower(coalesce(p.website,'')) like '%'||(select ql from params)||'%' then 82 else 0 end
    ) as match_score
  from public.partners p
  where (select q from params)<>''
),
matched_partners as (
  select * from partner_candidates
  where match_score>0
  order by match_score desc,importance desc nulls last,name
  limit (select lim from params)
),
people_candidates as (
  select c.*,
    greatest(
      case when lower(coalesce(c.email,''))=(select ql from params) then 100 else 0 end,
      case when lower(coalesce(c.person,''))=(select ql from params) then 98 else 0 end,
      case when (select qn from params) is not null and length((select qn from params))>=3
                 and public.pppp_gc_normalize_company_v1(c.company)=(select qn from params) then 94 else 0 end,
      case when length((select ql from params))>=3
                 and lower(coalesce(c.person,'')) like '%'||(select ql from params)||'%' then 88 else 0 end,
      case when length((select ql from params))>=3
                 and lower(coalesce(c.company,'')) like '%'||(select ql from params)||'%' then 86 else 0 end,
      case when length((select ql from params))>=4
                 and lower(coalesce(c.email,'')) like '%'||(select ql from params)||'%' then 84 else 0 end
    ) as match_score
  from public.pppp_contact_master_v1 c
  where (select q from params)<>''
),
matched_people as (
  select * from people_candidates
  where match_score>0
  order by match_score desc,project_email_count desc nulls last,last_seen_at desc nulls last
  limit (select lim from params)*2
),
seed_emails as (
  select lower(email) as email
  from matched_people
  where nullif(btrim(email),'') is not null
  union
  select lower(pc.email)
  from public.partner_contacts pc
  where pc.partner_id in(select id from matched_partners)
    and nullif(btrim(pc.email),'') is not null
  union
  select lower(pc.email_alt)
  from public.partner_contacts pc
  where pc.partner_id in(select id from matched_partners)
    and nullif(btrim(pc.email_alt),'') is not null
),
project_candidates as (
  select p.id,100 as match_score,'direct_exact'::text as reason
  from public.projects p,params x
  where x.q<>'' and (
    lower(coalesce(p.name,''))=x.ql
    or lower(coalesce(p.ref,''))=x.ql
    or lower(coalesce(p.business_ref,''))=x.ql
  )
  union all
  select p.id,94,'normalized_client'
  from public.projects p,params x
  where x.qn is not null and length(x.qn)>=3
    and public.pppp_gc_normalize_company_v1(p.client)=x.qn
  union all
  select p.id,92,'partner_client'
  from public.projects p
  join matched_partners mp
    on public.pppp_gc_normalize_company_v1(p.client)=public.pppp_gc_normalize_company_v1(mp.name)
  where public.pppp_gc_normalize_company_v1(mp.name) is not null
  union all
  select p.id,90,'contact_email'
  from public.projects p
  join public.project_contacts pc on pc.project_id=p.id::text
  join seed_emails se on lower(coalesce(pc.email,''))=se.email
  union all
  select p.id,88,'contact_company'
  from public.projects p
  join public.project_contacts pc on pc.project_id=p.id::text
  join matched_partners mp
    on public.pppp_gc_normalize_company_v1(pc.company)=public.pppp_gc_normalize_company_v1(mp.name)
  where public.pppp_gc_normalize_company_v1(mp.name) is not null
  union all
  select p.id,82,'text_contains'
  from public.projects p,params x
  where length(x.ql)>=3 and (
    lower(coalesce(p.name,'')) like '%'||x.ql||'%'
    or lower(coalesce(p.client,'')) like '%'||x.ql||'%'
    or lower(coalesce(p.ref,'')) like '%'||x.ql||'%'
    or lower(coalesce(p.business_ref,'')) like '%'||x.ql||'%'
  )
),
related_project_scores as (
  select pc.id,max(pc.match_score) as match_score,string_agg(distinct pc.reason,',' order by pc.reason) as match_reasons
  from project_candidates pc
  group by pc.id
  order by max(pc.match_score) desc,pc.id
  limit (select lim from params)*2
),
related_projects as (
  select p.*,rps.match_score,rps.match_reasons,
         coalesce(mf.value->>'summary',pa.analysis->>'executive_summary') as memory_summary,
         case when mf.value is not null then 'project.memory.baseline.v1'
              when pa.analysis is not null then 'latest_project_analysis'
              else null end as memory_source,
         mf.value->'communication' as memory_communication,
         coalesce(mf.updated_at,pa.created_at) as memory_updated_at
  from related_project_scores rps
  join public.projects p on p.id=rps.id
  left join public.pppp_project_context_current_v mf
    on mf.project_id=p.id and mf.fact_key='project.memory.baseline.v1' and mf.fact_status='observed'
  left join lateral (
    select a.analysis,a.created_at
    from public.project_analyses a
    where a.project_id=p.id::text and a.status='complete'
    order by a.created_at desc limit 1
  ) pa on true
),
direct_entity_emails as (
  select e.*
  from public.project_emails e
  where lower(coalesce(e.from_email,'')) in(select email from seed_emails)
     or exists(select 1 from unnest(coalesce(e.to_emails,'{}'::text[])) x(email) where lower(x.email) in(select email from seed_emails))
     or exists(select 1 from unnest(coalesce(e.cc_emails,'{}'::text[])) x(email) where lower(x.email) in(select email from seed_emails))
),
project_context_emails as (
  select e.*
  from public.project_emails e
  where e.project_id in(select id from related_projects)
),
direct_email_stats as (
  select count(*)::int as total,
         count(*) filter(where direction='incoming')::int as incoming,
         count(*) filter(where direction='outgoing')::int as outgoing,
         count(distinct gmail_thread_id)::int as threads,
         min(sent_at) as first_email_at,max(sent_at) as last_email_at
  from direct_entity_emails
),
project_email_stats as (
  select count(*)::int as total,
         count(*) filter(where direction='incoming')::int as incoming,
         count(*) filter(where direction='outgoing')::int as outgoing,
         count(distinct gmail_thread_id)::int as threads,
         min(sent_at) as first_email_at,max(sent_at) as last_email_at
  from project_context_emails
),
matched_supplier_offers as (
  select o.*,p.name as project_name
  from public.offers o
  left join public.projects p on p.id=o.project_id
  where coalesce(o.supplier,'') !~* '(pristeel|oferta[[:space:]]+jone|our[[:space:]]+offer)'
    and (
      o.project_id in(select id from related_projects)
      or (
        (select qn from params) is not null
        and length((select qn from params))>=3
        and public.pppp_gc_normalize_company_v1(o.supplier)=(select qn from params)
      )
      or exists(
        select 1 from matched_partners mp
        where public.pppp_gc_normalize_company_v1(o.supplier)=public.pppp_gc_normalize_company_v1(mp.name)
      )
    )
  order by o.created_at desc
  limit (select lim from params)*3
),
matched_client_offers as (
  select d.id,d.project_id,p.name as project_name,d.doc_nr,d.client,d.currency,d.total_amount,d.total_eur,
         d.followup_status,d.last_followup_at,d.followup_count,d.created_at
  from public.documents_registry d
  left join public.projects p on p.id=d.project_id
  where d.project_id in(select id from related_projects)
    and upper(coalesce(d.series,''))='QUO'
  order by d.created_at desc
  limit (select lim from params)*3
),
partner_json as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',mp.id,'name',mp.name,'aliases',mp.aliases,'country',mp.country,'city',mp.city,'website',mp.website,
    'business_type',mp.business_type,'relation',mp.relation,'categories',mp.categories,'grades',mp.grades,
    'class_approval',mp.class_approval,'certifications',mp.certifications,'length_max_mm',mp.length_max_mm,
    'width_max_mm',mp.width_max_mm,'thickness_min_mm',mp.thickness_min_mm,'thickness_max_mm',mp.thickness_max_mm,
    'origin_countries',mp.origin_countries,'cbam_eur_per_t',mp.cbam_eur_per_t,'price_indicative',mp.price_indicative,
    'payment_terms',mp.payment_terms,'lead_time_days',mp.lead_time_days,'stage',mp.stage,'importance',mp.importance,
    'importance_reason',mp.importance_reason,'data_confidence',mp.data_confidence,'notes',mp.notes,'source',mp.source,
    'match_score',mp.match_score,
    'contacts',coalesce((select jsonb_agg(to_jsonb(x) order by x.is_primary desc nulls last,x.full_name,x.email)
      from (select pc.full_name,pc.email,pc.email_alt,pc.phone,pc.role,pc.language,pc.is_primary,pc.last_contact_at,pc.next_action,pc.next_action_date,pc.notes
            from public.partner_contacts pc where pc.partner_id=mp.id order by pc.is_primary desc nulls last,pc.created_at limit 30) x),'[]'::jsonb)
  )) order by mp.match_score desc,mp.importance desc nulls last,mp.name),'[]'::jsonb) as value
  from matched_partners mp
),
people_json as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'contact_id',m.contact_id,'kind',m.kind,'company',m.company,'person',m.person,'email',m.email,'phone',m.phone,
    'country',m.country,'role',m.role,'last_contact',m.last_contact,'project_email_count',m.project_email_count,
    'last_seen_at',m.last_seen_at,'projects',m.projects,'sources',m.sources,'match_score',m.match_score
  )) order by m.match_score desc,m.project_email_count desc nulls last,m.last_seen_at desc nulls last),'[]'::jsonb) as value
  from matched_people m
),
projects_json as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id',p.id,'name',p.name,'client',p.client,'reference',p.ref,'business_ref',p.business_ref,'location',p.location,
    'deadline',p.deadline,'status',p.status,'pipeline_stage',p.pipeline_stage,'operational_state',p.operational_state,
    'operational_state_at',p.operational_state_at,'origin_type',p.origin_type,'work_model',p.work_model,
    'deal_type',p.deal_type,'business_type',p.business_type,'last_activity_at',p.last_activity_at,'last_email_at',p.last_email_at,
    'match_score',p.match_score,'match_reasons',p.match_reasons,'memory_summary',p.memory_summary,'memory_source',p.memory_source,
    'memory_communication',p.memory_communication,'memory_updated_at',p.memory_updated_at
  )) order by p.match_score desc,p.last_activity_at desc nulls last,p.name),'[]'::jsonb) as value
  from related_projects p
),
direct_recent_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sent_at desc),'[]'::jsonb) as value
  from (
    select e.project_id,p.name as project_name,e.gmail_message_id,e.gmail_thread_id,e.direction,e.from_email,e.from_name,
           e.to_emails,e.cc_emails,e.subject,left(coalesce(e.snippet,''),1600) as snippet,e.sent_at,e.has_attachments,
           e.match_method,e.match_confidence
    from direct_entity_emails e
    left join public.projects p on p.id=e.project_id
    order by e.sent_at desc
    limit (select lim from params)*2
  ) x
),
project_recent_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sent_at desc),'[]'::jsonb) as value
  from (
    select e.project_id,p.name as project_name,e.gmail_message_id,e.gmail_thread_id,e.direction,e.from_email,e.from_name,
           e.to_emails,e.cc_emails,e.subject,left(coalesce(e.snippet,''),1200) as snippet,e.sent_at,e.has_attachments,
           e.match_method,e.match_confidence
    from project_context_emails e
    left join public.projects p on p.id=e.project_id
    order by e.sent_at desc
    limit (select lim from params)*2
  ) x
),
offers_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) as value
  from (
    select id,project_id,project_name,supplier,currency,pricing_unit,price_kg,unit_price,qty_kg,total_amount,total_eur,
           delivery_weeks,incoterms,payment_terms,validity_days,cert,offer_ref,contact_person,transport_eur,
           exchange_rate_to_eur,left(coalesce(notes,''),1200) as notes,created_at
    from matched_supplier_offers order by created_at desc
  ) x
),
client_offers_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) as value
  from matched_client_offers x
),
actions_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.due_date nulls last,x.created_at desc),'[]'::jsonb) as value
  from (
    select a.id,a.project_id,a.project_name,a.client,a.title,a.detail,a.due_date,a.priority,a.source,a.source_ref,a.category,
           a.operational_state,a.pipeline_stage,a.created_at
    from public.pppp_home_current_actions_v1 a
    where a.project_id in(select id from related_projects)
    order by a.due_date nulls last,a.created_at desc
    limit (select lim from params)*2
  ) x
),
attention_json as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'type','action_required_without_current_action','severity','high','project_id',p.id,'project_name',p.name,
    'message','Projekti është në operational_state=action_required por nuk ka veprim canonical në Home/priority actions.'
  ) order by p.last_activity_at desc nulls last),'[]'::jsonb) as value
  from related_projects p
  where lower(coalesce(p.operational_state,''))='action_required'
    and not exists(select 1 from public.pppp_home_current_actions_v1 a where a.project_id=p.id)
)
select jsonb_build_object(
  'query',(select q from params),
  'normalized_query',(select qn from params),
  'read_only',true,
  'generated_at',now(),
  'match_counts',jsonb_build_object(
    'partners',(select count(*) from matched_partners),
    'people',(select count(*) from matched_people),
    'projects',(select count(*) from related_projects),
    'direct_emails',(select total from direct_email_stats),
    'project_context_emails',(select total from project_email_stats),
    'supplier_offers',(select count(*) from matched_supplier_offers),
    'client_offers',(select count(*) from matched_client_offers),
    'current_actions',(select jsonb_array_length(value) from actions_json),
    'attention_flags',(select jsonb_array_length(value) from attention_json)
  ),
  'relationship_summary',case
    when (select q from params)='' then 'Kërkimi është bosh.'
    when (select count(*) from matched_partners)+(select count(*) from matched_people)+(select count(*) from related_projects)=0 then 'Nuk u gjet evidencë e lidhur në PPPP për këtë kërkim.'
    else concat(
      'PPPP gjeti ',(select count(*) from matched_partners),' profile partneri, ',
      (select count(*) from matched_people),' persona/kontakte dhe ',
      (select count(*) from related_projects),' projekte të lidhura. Komunikim direkt me entitetin: ',
      (select total from direct_email_stats),' email-e; kontekst i projekteve të lidhura: ',
      (select total from project_email_stats),' email-e.'
    )
  end,
  'partners',(select value from partner_json),
  'people',(select value from people_json),
  'projects',(select value from projects_json),
  'communication',jsonb_build_object(
    'direct_entity',jsonb_build_object(
      'total_emails',(select total from direct_email_stats),'incoming',(select incoming from direct_email_stats),
      'outgoing',(select outgoing from direct_email_stats),'threads',(select threads from direct_email_stats),
      'first_email_at',(select first_email_at from direct_email_stats),'last_email_at',(select last_email_at from direct_email_stats),
      'recent_emails',(select value from direct_recent_json)
    ),
    'project_context',jsonb_build_object(
      'total_emails',(select total from project_email_stats),'incoming',(select incoming from project_email_stats),
      'outgoing',(select outgoing from project_email_stats),'threads',(select threads from project_email_stats),
      'first_email_at',(select first_email_at from project_email_stats),'last_email_at',(select last_email_at from project_email_stats),
      'recent_emails',(select value from project_recent_json)
    )
  ),
  'supplier_offers',(select value from offers_json),
  'client_offers',(select value from client_offers_json),
  'current_actions',(select value from actions_json),
  'attention_flags',(select value from attention_json)
);
$$;

comment on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) is
  'Read-only PPPP entity intelligence. Separates direct entity communication from project context, supplier quotes from PRISTEEL client offers, and exposes non-mutating attention flags.';

revoke all on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) to service_role,supabase_read_only_user;
