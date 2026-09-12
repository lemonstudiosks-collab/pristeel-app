-- PPPP ChatGPT Entity Intelligence v1
-- Read-only consolidation for companies, people, suppliers/manufacturers and their
-- projects/communications. Does not create tasks, send email, choose suppliers,
-- set pricing, commit contracts/POs, or decide won/lost.

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
      case when (select qn from params) is not null
                 and length((select qn from params))>=3
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
      case when (select qn from params) is not null
                 and length((select qn from params))>=3
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
         mf.value->>'summary' as memory_summary,
         mf.value->'communication' as memory_communication,
         mf.updated_at as memory_updated_at
  from related_project_scores rps
  join public.projects p on p.id=rps.id
  left join public.pppp_project_context_current_v mf
    on mf.project_id=p.id and mf.fact_key='project.memory.baseline.v1' and mf.fact_status='observed'
),
relevant_emails as (
  select e.*
  from public.project_emails e
  where e.project_id in(select id from related_projects)
     or lower(coalesce(e.from_email,'')) in(select email from seed_emails)
     or exists(
       select 1 from unnest(coalesce(e.to_emails,'{}'::text[])) x(email)
       where lower(x.email) in(select email from seed_emails)
     )
     or exists(
       select 1 from unnest(coalesce(e.cc_emails,'{}'::text[])) x(email)
       where lower(x.email) in(select email from seed_emails)
     )
),
email_stats as (
  select count(*)::int as total,
         count(*) filter(where direction='incoming')::int as incoming,
         count(*) filter(where direction='outgoing')::int as outgoing,
         count(distinct gmail_thread_id)::int as threads,
         min(sent_at) as first_email_at,max(sent_at) as last_email_at
  from relevant_emails
),
matched_supplier_offers as (
  select o.*,p.name as project_name
  from public.offers o
  left join public.projects p on p.id=o.project_id
  where o.project_id in(select id from related_projects)
     or (
       (select qn from params) is not null
       and length((select qn from params))>=3
       and public.pppp_gc_normalize_company_v1(o.supplier)=(select qn from params)
     )
     or exists(
       select 1 from matched_partners mp
       where public.pppp_gc_normalize_company_v1(o.supplier)=public.pppp_gc_normalize_company_v1(mp.name)
     )
  order by o.created_at desc
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
    'match_score',p.match_score,'match_reasons',p.match_reasons,'memory_summary',p.memory_summary,
    'memory_communication',p.memory_communication,'memory_updated_at',p.memory_updated_at
  )) order by p.match_score desc,p.last_activity_at desc nulls last,p.name),'[]'::jsonb) as value
  from related_projects p
),
recent_emails_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sent_at desc),'[]'::jsonb) as value
  from (
    select e.project_id,p.name as project_name,e.gmail_message_id,e.gmail_thread_id,e.direction,e.from_email,e.from_name,
           e.to_emails,e.cc_emails,e.subject,left(coalesce(e.snippet,''),1800) as snippet,e.sent_at,e.has_attachments,
           e.match_method,e.match_confidence
    from relevant_emails e
    left join public.projects p on p.id=e.project_id
    order by e.sent_at desc
    limit (select lim from params)*3
  ) x
),
offers_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) as value
  from (
    select id,project_id,project_name,supplier,currency,pricing_unit,price_kg,unit_price,qty_kg,total_amount,total_eur,
           delivery_weeks,incoterms,payment_terms,validity_days,cert,offer_ref,contact_person,transport_eur,
           exchange_rate_to_eur,left(coalesce(notes,''),1200) as notes,created_at
    from matched_supplier_offers
    order by created_at desc
  ) x
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
    'emails',(select total from email_stats),
    'supplier_offers',(select count(*) from matched_supplier_offers),
    'current_actions',(select jsonb_array_length(value) from actions_json)
  ),
  'relationship_summary',case
    when (select q from params)='' then 'Kërkimi është bosh.'
    when (select count(*) from matched_partners)+(select count(*) from matched_people)+(select count(*) from related_projects)=0 then 'Nuk u gjet evidencë e lidhur në PPPP për këtë kërkim.'
    else concat(
      'PPPP gjeti ',(select count(*) from matched_partners),' profile partneri, ',
      (select count(*) from matched_people),' persona/kontakte dhe ',
      (select count(*) from related_projects),' projekte të lidhura. Komunikim i lidhur: ',
      (select total from email_stats),' email-e në ',(select threads from email_stats),' thread-e.'
    )
  end,
  'partners',(select value from partner_json),
  'people',(select value from people_json),
  'projects',(select value from projects_json),
  'communication',jsonb_build_object(
    'total_emails',(select total from email_stats),'incoming',(select incoming from email_stats),'outgoing',(select outgoing from email_stats),
    'threads',(select threads from email_stats),'first_email_at',(select first_email_at from email_stats),'last_email_at',(select last_email_at from email_stats),
    'recent_emails',(select value from recent_emails_json)
  ),
  'supplier_offers',(select value from offers_json),
  'current_actions',(select value from actions_json)
);
$$;

comment on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) is
  'Read-only PPPP entity intelligence for company/person/supplier/manufacturer queries. Consolidates canonical partner/contact/project memory and evidence; performs no writes or protected actions.';

revoke all on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_entity_intelligence_v1(text,integer) to service_role,supabase_read_only_user;

-- Extend the bridge manifest with the new read-only entity intelligence API.
create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path to 'pg_catalog','public'
as $$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v6',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v1(text,integer)'
    ),
    'service_write_functions',jsonb_build_array(
      'public.pppp_chatgpt_create_project_v1(text,text,text,text,text,date,text,text,text,text,jsonb)',
      'public.pppp_chatgpt_create_supplier_offer_v1(text,uuid,jsonb,text,jsonb)',
      'public.pppp_chatgpt_project_disposition_v1(text,uuid,jsonb,text,text,jsonb)'
    ),
    'drive_manifest_title','PPPP — GLOBAL CHATGPT BRIDGE MANIFEST',
    'drive_manifest_id','1Yq_qiZQib7O19Z7eGRiKreqPflfBeazfOL8ZMufrXd4',
    'command_sheet_title','PPPP — ChatGPT Command Bridge',
    'command_sheet_id','1ZoU1-aqHaN0CLI_1bcAUDXtGKdm97ixvopkusB96hZ8',
    'command_tab','Commands',
    'allowed_action_types',jsonb_build_array('context_fact','task','create_project','supplier_offer','project_disposition'),
    'approval_required','approved',
    'processing_interval_minutes',10,
    'protected_actions',jsonb_build_array(
      'external_email_send',
      'supplier_selection_or_commitment',
      'final_selling_price_or_margin',
      'contract_or_purchase_order_commitment',
      'project_won_or_lost_decision'
    ),
    'write_protocol',jsonb_build_object(
      'existing_project_actions_require_real_project_id',true,
      'append_only',true,
      'deduplicate_by','command_id',
      'source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),
      'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'new_project_transport','Append one approved create_project row to the command sheet. Leave project_id blank, put the project name in project_name, and put safe optional fields in value_json. The trusted bridge worker calls the service RPC and returns the real project_id.',
      'create_project_safe_value_json_fields',jsonb_build_array('client','reference','location','deadline','notes','deal_type','business_type'),
      'create_project_idempotent_by','command_id',
      'supplier_offer_transport','Append one approved supplier_offer row for an existing project with its real project_id. The trusted worker records the quotation in canonical public.offers only. This action never selects or commits to the supplier.',
      'supplier_offer_safe_value_json_fields',jsonb_build_array(
        'supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur',
        'extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert',
        'notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'
      ),
      'supplier_offer_idempotent_by','command_id',
      'supplier_offer_never_selects_supplier',true,
      'project_disposition_transport','Append one explicitly approved project_disposition row for an existing project with its real project_id. The trusted worker calls the service-only disposition RPC. No Bid closes the project operationally and closes its active tasks while preserving an audit fact.',
      'project_disposition_allowed_values',jsonb_build_array('no_bid'),
      'project_disposition_safe_value_json_fields',jsonb_build_array('disposition','reason','notes','operator_note','approved_by','approved_on','tender_ref','subject'),
      'project_disposition_requires_explicit_approval',true,
      'project_disposition_idempotent_by','command_id',
      'verify_new_project_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_search_projects_v1(text,integer)'),
      'verify_supplier_offer_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_supplier_comparison_v1(uuid)'),
      'verify_project_disposition_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)','public.pppp_chatgpt_priority_actions_v1(integer)')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v1(text,integer) to consolidate live PPPP entity context.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, use the entity-intelligence read function when relevant. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. For No Bid or project closure, use project_disposition only after explicit human approval. Preserve all protected human approval gates.'
  );
$$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public,anon;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role,supabase_read_only_user,authenticated;
