-- Read-only raw email evidence for entities that are not yet resolved into
-- Contact Master / partners / projects. This deliberately does not create or
-- classify contacts and does not mutate project state.

create or replace function public.pppp_chatgpt_email_entity_evidence_v1(
  p_query text,
  p_limit integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select
    btrim(coalesce(p_query,'')) as q,
    lower(btrim(coalesce(p_query,''))) as ql,
    greatest(1,least(coalesce(p_limit,10),20)) as lim,
    position('@' in lower(btrim(coalesce(p_query,''))))>0 as is_email
), scored as (
  select
    e.*,
    greatest(
      case when lower(coalesce(e.from_email,''))=(select ql from params) then 100 else 0 end,
      case when exists(select 1 from unnest(coalesce(e.to_emails,'{}'::text[])) x(email) where lower(trim(x.email))=(select ql from params)) then 100 else 0 end,
      case when exists(select 1 from unnest(coalesce(e.cc_emails,'{}'::text[])) x(email) where lower(trim(x.email))=(select ql from params)) then 100 else 0 end,
      case when lower(coalesce(e.gmail_message_id,''))=(select ql from params) then 100 else 0 end,
      case when lower(coalesce(e.gmail_thread_id,''))=(select ql from params) then 98 else 0 end,
      case when not (select is_email from params) and lower(btrim(coalesce(e.from_name,'')))=(select ql from params) then 96 else 0 end,
      case when not (select is_email from params) and position('.' in (select ql from params))>0 and split_part(lower(trim(coalesce(e.from_email,''))),'@',2)=(select ql from params) then 94 else 0 end,
      case when not (select is_email from params) and position('.' in (select ql from params))>0 and exists(select 1 from unnest(coalesce(e.to_emails,'{}'::text[])) x(email) where split_part(lower(trim(x.email)),'@',2)=(select ql from params)) then 94 else 0 end,
      case when not (select is_email from params) and position('.' in (select ql from params))>0 and exists(select 1 from unnest(coalesce(e.cc_emails,'{}'::text[])) x(email) where split_part(lower(trim(x.email)),'@',2)=(select ql from params)) then 94 else 0 end,
      case when not (select is_email from params) and length((select ql from params))>=4 and lower(coalesce(e.from_name,'')) like '%'||(select ql from params)||'%' then 86 else 0 end,
      case when not (select is_email from params) and length((select ql from params))>=5 and lower(coalesce(e.subject,'')) like '%'||(select ql from params)||'%' then 76 else 0 end
    ) as match_score
  from public.project_emails e
  where (select q from params)<>''
), matched as (
  select * from scored where match_score>0
), stats as (
  select
    count(*)::int total,
    count(*) filter(where direction='incoming')::int incoming,
    count(*) filter(where direction='outgoing')::int outgoing,
    count(distinct gmail_thread_id)::int threads,
    count(*) filter(where project_id is not null)::int linked_to_project,
    count(*) filter(where project_id is null and suggested_project_id is not null)::int suggested_project,
    count(*) filter(where project_id is null)::int unresolved,
    min(sent_at) first_email_at,
    max(sent_at) last_email_at,
    max(match_score)::int best_match_score
  from matched
), addresses as (
  select lower(trim(from_email)) email from matched where nullif(trim(from_email),'') is not null
  union
  select lower(trim(x.email)) from matched m cross join lateral unnest(coalesce(m.to_emails,'{}'::text[])) x(email) where nullif(trim(x.email),'') is not null
  union
  select lower(trim(x.email)) from matched m cross join lateral unnest(coalesce(m.cc_emails,'{}'::text[])) x(email) where nullif(trim(x.email),'') is not null
), address_json as (
  select coalesce(jsonb_agg(email order by email),'[]'::jsonb) value from addresses
), names as (
  select distinct btrim(from_name) name from matched where nullif(btrim(from_name),'') is not null
), names_json as (
  select coalesce(jsonb_agg(name order by name),'[]'::jsonb) value from names
), related_projects as (
  select p.id,p.name,p.client,p.status,p.pipeline_stage,p.operational_state,'linked'::text relation
  from public.projects p
  where p.id in(select distinct project_id from matched where project_id is not null)
  union all
  select p.id,p.name,p.client,p.status,p.pipeline_stage,p.operational_state,'suggested'::text relation
  from public.projects p
  where p.id in(select distinct suggested_project_id from matched where project_id is null and suggested_project_id is not null)
    and p.id not in(select distinct project_id from matched where project_id is not null)
), projects_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.relation,x.name),'[]'::jsonb) value from related_projects x
), recent_json as (
  select coalesce(jsonb_agg(to_jsonb(x) order by x.sent_at desc nulls last),'[]'::jsonb) value
  from (
    select
      m.gmail_message_id,m.gmail_thread_id,m.direction,m.from_email,m.from_name,m.to_emails,m.cc_emails,
      m.subject,left(coalesce(m.snippet,''),1600) snippet,m.sent_at,m.has_attachments,
      m.project_id,p.name project_name,m.suggested_project_id,sp.name suggested_project_name,
      m.match_method,m.match_confidence,m.needs_review,m.match_score,
      (split_part(lower(trim(coalesce(m.from_email,''))),'@',1) ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
        or lower(coalesce(m.from_email,'')) ~ '(ted-no-reply|noreply-dmarc|email\.openai|tm\.openai|supabase\.com|bitrix24\.com|apps-scripts-notifications)') as sender_system_like
    from matched m
    left join public.projects p on p.id=m.project_id
    left join public.projects sp on sp.id=m.suggested_project_id
    order by m.match_score desc,m.sent_at desc nulls last
    limit (select lim from params)*3
  ) x
)
select jsonb_build_object(
  'query',(select q from params),
  'read_only',true,
  'generated_at',now(),
  'match_found',coalesce((select total from stats),0)>0,
  'stats',jsonb_build_object(
    'total_emails',coalesce((select total from stats),0),
    'incoming',coalesce((select incoming from stats),0),
    'outgoing',coalesce((select outgoing from stats),0),
    'threads',coalesce((select threads from stats),0),
    'linked_to_project',coalesce((select linked_to_project from stats),0),
    'suggested_project',coalesce((select suggested_project from stats),0),
    'unresolved',coalesce((select unresolved from stats),0),
    'first_email_at',(select first_email_at from stats),
    'last_email_at',(select last_email_at from stats),
    'best_match_score',(select best_match_score from stats)
  ),
  'observed_email_addresses',(select value from address_json),
  'observed_sender_names',(select value from names_json),
  'related_projects',(select value from projects_json),
  'recent_emails',(select value from recent_json),
  'classification_note','Raw communication evidence only. No person/company role, client/supplier status, or project identity is inferred by this function.'
);
$function$;

revoke all on function public.pppp_chatgpt_email_entity_evidence_v1(text,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_email_entity_evidence_v1(text,integer)
  to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v6',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
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
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v1(text,integer) to consolidate live PPPP entity context. If the entity is missing or unresolved, also use public.pppp_chatgpt_email_entity_evidence_v1(text,integer) for raw communication evidence.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_email_entity_evidence_v1(text,integer). Treat its output as evidence only; do not infer client/supplier role or project identity from it.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, use entity intelligence and, when identity is unresolved, raw email entity evidence. Raw email evidence is read-only and must not be treated as client/supplier or project identity by itself. For a brand-new project, use the approved create_project command-sheet transport. For a supplier quotation, use supplier_offer registration only and preserve the separate human supplier-selection gate. For No Bid or project closure, use project_disposition only after explicit human approval. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1()
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1()
  to service_role,supabase_read_only_user;
