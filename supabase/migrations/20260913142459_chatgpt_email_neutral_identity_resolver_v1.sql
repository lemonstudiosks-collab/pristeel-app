-- Neutral, read-only email identity resolution for PPPP.
-- This layer recognizes people/companies/services without assigning project identity
-- or inventing client/supplier roles from raw email evidence.

create or replace function public.pppp_email_sender_class_v1(
  p_email text,
  p_name text default null,
  p_subject text default null
)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $function$
with x as (
  select
    lower(btrim(coalesce(p_email,''))) as email,
    lower(split_part(btrim(coalesce(p_email,'')),'@',1)) as localpart,
    lower(split_part(btrim(coalesce(p_email,'')),'@',2)) as domain,
    lower(coalesce(p_name,'')) as sender_name,
    lower(coalesce(p_subject,'')) as subject
)
select case
  when email='' then 'unknown'
  when domain='prissteel.com' then 'internal'
  when email='eprokurimi@rks-gov.net' or email='bieter@dtvp.de' or domain='dtvp.de'
    then 'procurement_system'
  when localpart ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc|dmarcreport|mailrobot)([+._-]|$)'
    or email ~ '(ted-no-reply|noreply-dmarc|apps-scripts-notifications)'
    or domain in (
      'mail.xing.com','e-mail.xing.com','em.linkedin.com','m.learn.coursera.org',
      'e.mailchimp.com','engage.canva.com','mail.apollo.io','hi.pitch.com',
      'mail.goldfish.sh','connect.blinq.me'
    )
    or sender_name like '%dmarc aggregate report%'
    or subject like '%report domain:%submitter:%report-id:%'
    then 'automated_service'
  else 'external'
end
from x;
$function$;

revoke all on function public.pppp_email_sender_class_v1(text,text,text)
  from public,anon,authenticated;
grant execute on function public.pppp_email_sender_class_v1(text,text,text)
  to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_email_identity_resolution_v1(
  p_query text,
  p_limit integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select lower(btrim(coalesce(p_query,''))) as q,
         greatest(1,least(coalesce(p_limit,20),50)) as lim
),
counterpart_events as (
  select lower(btrim(e.from_email)) as email,
         nullif(btrim(e.from_name),'') as display_name,
         e.sent_at,e.direction,e.project_id,e.gmail_thread_id
  from public.project_emails e
  where e.direction='incoming'
    and nullif(btrim(coalesce(e.from_email,'')),'') is not null
  union all
  select lower(btrim(x.email)) as email,
         null::text as display_name,
         e.sent_at,e.direction,e.project_id,e.gmail_thread_id
  from public.project_emails e
  cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) x(email)
  where e.direction='outgoing'
    and nullif(btrim(coalesce(x.email,'')),'') is not null
    and lower(split_part(btrim(x.email),'@',2))<>'prissteel.com'
),
email_rollup as (
  select ce.email,
         lower(split_part(ce.email,'@',2)) as domain,
         (array_agg(ce.display_name order by ce.sent_at desc nulls last)
           filter (where ce.display_name is not null))[1] as display_name,
         min(ce.sent_at) as first_seen_at,
         max(ce.sent_at) as last_seen_at,
         count(*)::int as message_count,
         count(*) filter (where ce.direction='incoming')::int as incoming_count,
         count(*) filter (where ce.direction='outgoing')::int as outgoing_count,
         count(*) filter (where ce.project_id is not null)::int as linked_project_messages,
         count(*) filter (where ce.project_id is null)::int as unresolved_messages,
         count(distinct ce.gmail_thread_id)::int as thread_count
  from counterpart_events ce
  group by ce.email
),
contact_exact as (
  select lower(btrim(c.email)) as email,
         c.contact_id,c.kind,c.company,c.person,c.role,c.country,
         c.project_email_count,c.projects
  from public.pppp_contact_master_v1 c
  where nullif(btrim(coalesce(c.email,'')),'') is not null
),
partner_email_group as (
  select lower(btrim(x.email)) as email,
         count(distinct pc.partner_id)::int as partner_count,
         min(pc.partner_id::text)::uuid as partner_id,
         bool_or(coalesce(pc.is_primary,false)) as is_primary
  from public.partner_contacts pc
  join public.partners p on p.id=pc.partner_id and p.stage='active'
  cross join lateral (values(pc.email),(pc.email_alt)) x(email)
  where nullif(btrim(coalesce(x.email,'')),'') is not null
  group by lower(btrim(x.email))
),
partner_exact as (
  select g.email,g.partner_count,g.partner_id,g.is_primary,
         p.name as partner_name,p.relation,p.business_type,p.country
  from partner_email_group g
  left join public.partners p on p.id=g.partner_id and g.partner_count=1
),
domain_partner_group as (
  select lower(split_part(btrim(x.email),'@',2)) as domain,
         count(distinct pc.partner_id)::int as partner_count,
         min(pc.partner_id::text)::uuid as partner_id
  from public.partner_contacts pc
  join public.partners p on p.id=pc.partner_id and p.stage='active'
  cross join lateral (values(pc.email),(pc.email_alt)) x(email)
  where nullif(btrim(coalesce(x.email,'')),'') is not null
    and lower(split_part(btrim(x.email),'@',2)) not in (
      'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','me.com','microsoft.com','prissteel.com'
    )
  group by lower(split_part(btrim(x.email),'@',2))
),
domain_partner as (
  select g.domain,g.partner_count,g.partner_id,p.name as partner_name
  from domain_partner_group g
  left join public.partners p on p.id=g.partner_id and g.partner_count=1
),
domain_company_norm as (
  select lower(split_part(btrim(c.email),'@',2)) as domain,
         public.pppp_gc_normalize_company_v1(c.company) as company_norm,
         min(c.company) as company_name
  from public.contacts c
  where nullif(btrim(coalesce(c.email,'')),'') is not null
    and nullif(btrim(coalesce(c.company,'')),'') is not null
    and lower(split_part(btrim(c.email),'@',2)) not in (
      'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','me.com','microsoft.com','prissteel.com'
    )
  group by lower(split_part(btrim(c.email),'@',2)),public.pppp_gc_normalize_company_v1(c.company)
),
domain_company as (
  select domain,count(*)::int as company_count,min(company_name) as company_name
  from domain_company_norm
  where nullif(company_norm,'') is not null
  group by domain
),
resolved as (
  select e.*,
         public.pppp_email_sender_class_v1(e.email,e.display_name,null) as sender_class,
         c.contact_id,c.kind as contact_kind,c.company as contact_company,c.person as contact_person,
         c.role as contact_role,c.country as contact_country,c.project_email_count,c.projects as contact_projects,
         pe.partner_count as exact_partner_count,pe.partner_id as exact_partner_id,pe.partner_name as exact_partner_name,
         pe.relation as exact_partner_relation,pe.business_type as exact_partner_business_type,pe.country as exact_partner_country,
         dp.partner_count as domain_partner_count,dp.partner_id as domain_partner_id,dp.partner_name as domain_partner_name,
         dc.company_count as domain_company_count,dc.company_name as domain_company_name,
         case
           when pe.partner_count=1 and c.contact_id is not null
             and nullif(public.pppp_gc_normalize_company_v1(c.company),'') is not null
             and public.pppp_gc_normalize_company_v1(c.company)
                 is distinct from public.pppp_gc_normalize_company_v1(pe.partner_name)
           then true else false
         end as secondary_contact_conflict
  from email_rollup e
  left join contact_exact c on c.email=e.email
  left join partner_exact pe on pe.email=e.email
  left join domain_partner dp on dp.domain=e.domain
  left join domain_company dc on dc.domain=e.domain
),
classified as (
  select r.*,
         case
           when r.sender_class='internal' then 'internal'
           when r.sender_class in ('procurement_system','automated_service') then 'system'
           when r.exact_partner_count=1 then 'canonical_partner_contact'
           when r.contact_id is not null then 'canonical_contact'
           when r.domain_partner_count=1 then 'partner_domain_hint'
           when r.domain_company_count=1 then 'company_domain_hint'
           else 'unresolved_external'
         end as identity_status,
         case
           when r.sender_class in ('internal','procurement_system','automated_service') then 100
           when r.exact_partner_count=1 then 100
           when r.contact_id is not null then 98
           when r.domain_partner_count=1 then 82
           when r.domain_company_count=1 then 78
           else 0
         end as identity_confidence,
         case
           when r.sender_class in ('internal','procurement_system','automated_service') then false
           when r.exact_partner_count=1 then r.secondary_contact_conflict
           when r.contact_id is not null then false
           else true
         end as needs_review
  from resolved r
),
scored as (
  select c.*,
         greatest(
           case when c.email=(select q from params) then 100 else 0 end,
           case when length((select q from params))>=3 and c.email like '%'||(select q from params)||'%' then 92 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.display_name,'')) like '%'||(select q from params)||'%' then 90 else 0 end,
           case when length((select q from params))>=3 and c.domain like '%'||(select q from params)||'%' then 86 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.contact_person,'')) like '%'||(select q from params)||'%' then 90 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.contact_company,'')) like '%'||(select q from params)||'%' then 88 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.exact_partner_name,'')) like '%'||(select q from params)||'%' then 88 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.domain_partner_name,'')) like '%'||(select q from params)||'%' then 80 else 0 end,
           case when length((select q from params))>=3 and lower(coalesce(c.domain_company_name,'')) like '%'||(select q from params)||'%' then 76 else 0 end
         ) as query_match_score
  from classified c
),
matched as (
  select * from scored
  where (select q from params)='' or query_match_score>0
  order by query_match_score desc,last_seen_at desc nulls last,email
  limit (select lim from params)
),
identity_json as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'email',m.email,
    'display_name',m.display_name,
    'domain',m.domain,
    'sender_class',m.sender_class,
    'identity_status',m.identity_status,
    'identity_confidence',m.identity_confidence,
    'needs_review',m.needs_review,
    'secondary_contact_conflict',m.secondary_contact_conflict,
    'message_stats',jsonb_build_object(
      'message_count',m.message_count,'incoming',m.incoming_count,'outgoing',m.outgoing_count,
      'threads',m.thread_count,'linked_project_messages',m.linked_project_messages,
      'unresolved_messages',m.unresolved_messages,'first_seen_at',m.first_seen_at,'last_seen_at',m.last_seen_at
    ),
    'canonical_contact',case when m.contact_id is not null then jsonb_strip_nulls(jsonb_build_object(
      'contact_id',m.contact_id,'person',m.contact_person,'company',m.contact_company,
      'kind',m.contact_kind,'role',m.contact_role,'country',m.contact_country,
      'project_email_count',m.project_email_count,'projects',m.contact_projects
    )) end,
    'canonical_partner',case when m.exact_partner_count=1 then jsonb_strip_nulls(jsonb_build_object(
      'partner_id',m.exact_partner_id,'name',m.exact_partner_name,'relation',m.exact_partner_relation,
      'business_type',m.exact_partner_business_type,'country',m.exact_partner_country,
      'match_method','exact_partner_contact'
    )) end,
    'company_hint',case
      when m.exact_partner_count=1 then null
      when m.domain_partner_count=1 then jsonb_build_object('name',m.domain_partner_name,'partner_id',m.domain_partner_id,'method','unique_partner_contact_domain','confidence',82)
      when m.domain_company_count=1 then jsonb_build_object('name',m.domain_company_name,'method','unique_contact_company_domain','confidence',78)
      else null end,
    'query_match_score',m.query_match_score,
    'project_identity_allowed',false,
    'raw_email_may_assign_role',false
  )) order by m.query_match_score desc,m.last_seen_at desc nulls last,m.email),'[]'::jsonb) as value
  from matched m
)
select jsonb_build_object(
  'query',p_query,
  'read_only',true,
  'generated_at',now(),
  'policy',jsonb_build_object(
    'exact_partner_contact_precedence',true,
    'domain_matches_are_hints_only',true,
    'contact_uniqueness_may_assign_project',false,
    'domain_hint_may_assign_project',false,
    'raw_email_may_assign_client_supplier_role',false,
    'project_identity_allowed',false
  ),
  'match_counts',jsonb_build_object(
    'returned',(select count(*) from matched),
    'canonical_partner_contact',(select count(*) from matched where identity_status='canonical_partner_contact'),
    'canonical_contact',(select count(*) from matched where identity_status='canonical_contact'),
    'partner_domain_hint',(select count(*) from matched where identity_status='partner_domain_hint'),
    'company_domain_hint',(select count(*) from matched where identity_status='company_domain_hint'),
    'unresolved_external',(select count(*) from matched where identity_status='unresolved_external'),
    'system',(select count(*) from matched where identity_status='system'),
    'internal',(select count(*) from matched where identity_status='internal'),
    'secondary_contact_conflicts',(select count(*) from matched where secondary_contact_conflict)
  ),
  'identities',(select value from identity_json)
);
$function$;

revoke all on function public.pppp_chatgpt_email_identity_resolution_v1(text,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_email_identity_resolution_v1(text,integer)
  to service_role,supabase_read_only_user;

-- Bridge v8: expose the neutral resolver as a read surface. Write protocol and
-- all protected human approval gates remain unchanged.
create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v8',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v2(text,integer)',
      'public.pppp_chatgpt_email_identity_resolution_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v1(text,integer)',
      'public.pppp_chatgpt_email_entity_evidence_v1(text,integer)'
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
      'external_email_send','supplier_selection_or_commitment','final_selling_price_or_margin',
      'contract_or_purchase_order_commitment','project_won_or_lost_decision'
    ),
    'write_protocol',jsonb_build_object(
      'existing_project_actions_require_real_project_id',true,'append_only',true,'deduplicate_by','command_id','source_type','chatgpt',
      'context_fact_statuses',jsonb_build_array('observed','suggested'),'task_value_json_required_fields',jsonb_build_array('title','due_date'),
      'new_project_transport','Append one approved create_project row to the command sheet. Leave project_id blank, put the project name in project_name, and put safe optional fields in value_json. The trusted bridge worker calls the service RPC and returns the real project_id.',
      'create_project_safe_value_json_fields',jsonb_build_array('client','reference','location','deadline','notes','deal_type','business_type'),'create_project_idempotent_by','command_id',
      'supplier_offer_transport','Append one approved supplier_offer row for an existing project with its real project_id. The trusted worker records the quotation in canonical public.offers only. This action never selects or commits to the supplier.',
      'supplier_offer_safe_value_json_fields',jsonb_build_array('supplier','currency','price_kg','qty_kg','mechanical_eur','packaging_eur','transport_eur','extra_positions','delivery_weeks','validity_days','exchange_rate_to_eur','incoterms','cert','notes','payment_terms','inclusions','exclusions','offer_ref','contact_person','source'),
      'supplier_offer_idempotent_by','command_id','supplier_offer_never_selects_supplier',true,
      'project_disposition_transport','Append one explicitly approved project_disposition row for an existing project with its real project_id. The trusted worker calls the service-only disposition RPC. No Bid closes the project operationally and closes its active tasks while preserving an audit fact.',
      'project_disposition_allowed_values',jsonb_build_array('no_bid'),'project_disposition_safe_value_json_fields',jsonb_build_array('disposition','reason','notes','operator_note','approved_by','approved_on','tender_ref','subject'),
      'project_disposition_requires_explicit_approval',true,'project_disposition_idempotent_by','command_id',
      'verify_new_project_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_search_projects_v1(text,integer)'),
      'verify_supplier_offer_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_supplier_comparison_v1(uuid)'),
      'verify_project_disposition_with',jsonb_build_array('public.pppp_chatgpt_command_status_v1(text,integer)','public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)','public.pppp_chatgpt_priority_actions_v1(integer)')
    ),
    'operator_shorthand',jsonb_build_object(
      'kontrollo PPPP','Read live PPPP state using the bridge read functions.',
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v2(text,integer). If identity is unresolved or evidence-only, use public.pppp_chatgpt_email_identity_resolution_v1(text,integer) to distinguish canonical contacts/partners, domain hints, system mail and unresolved external identities without assigning a project.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_email_identity_resolution_v1(text,integer) first, then public.pppp_chatgpt_email_entity_evidence_v1(text,integer) for message-level evidence. Domain/contact hints are never project identity.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, use public.pppp_chatgpt_entity_intelligence_v2(text,integer). When identity is unresolved or evidence-only, use public.pppp_chatgpt_email_identity_resolution_v1(text,integer) to separate canonical contact/partner identity from domain-only hints, system mail and unresolved external communication. This neutral resolver never assigns a project and never creates client/supplier roles from raw email evidence. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. For No Bid or project closure, use project_disposition only after explicit human approval. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1()
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1()
  to service_role,supabase_read_only_user;
