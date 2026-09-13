-- Read-only Entity / Contact Master integrity layer.
-- Exact unique partner-contact identity has precedence over stale Contact Master
-- company/kind fields, but this migration never mutates contacts or partners.

create or replace function public.pppp_chatgpt_entity_integrity_v2(
  p_query text default '',
  p_limit integer default 100
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select lower(btrim(coalesce(p_query,''))) as q,
         greatest(1,least(coalesce(p_limit,100),250)) as lim
),
contact_rows as (
  select lower(btrim(c.email)) as email,
         c.contact_id,c.kind,c.company,c.person,c.role,c.country,
         c.project_email_count,c.projects
  from public.pppp_contact_master_v1 c
  where nullif(btrim(coalesce(c.email,'')),'') is not null
),
contact_counts as (
  select email,count(*)::int as contact_count
  from contact_rows
  group by email
),
partner_groups as (
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
         p.name as partner_name,p.relation,p.business_type,p.country as partner_country
  from partner_groups g
  left join public.partners p on p.id=g.partner_id and g.partner_count=1
),
overlap_base as (
  select c.*,cc.contact_count,
         pe.partner_count,pe.partner_id,pe.is_primary,pe.partner_name,
         pe.relation as partner_relation,pe.business_type as partner_business_type,
         pe.partner_country,
         lower(split_part(c.email,'@',2)) as email_domain,
         public.pppp_gc_normalize_company_v1(c.company) as contact_company_norm,
         public.pppp_gc_normalize_company_v1(pe.partner_name) as partner_name_norm
  from contact_rows c
  join contact_counts cc using(email)
  join partner_exact pe using(email)
),
company_reuse as (
  select public.pppp_gc_normalize_company_v1(c.company) as company_norm,
         count(distinct pe.partner_id)::int as mapped_partner_count
  from contact_rows c
  join partner_exact pe using(email)
  where pe.partner_count=1
    and nullif(public.pppp_gc_normalize_company_v1(c.company),'') is not null
  group by public.pppp_gc_normalize_company_v1(c.company)
),
classified as (
  select b.*,
    coalesce(cr.mapped_partner_count,0) as contact_company_partner_count,
    (b.partner_count=1) as unique_partner_authority,
    (b.contact_count>1) as contact_email_duplicate,
    (b.partner_count>1) as partner_email_ambiguous,
    (
      b.partner_count=1
      and coalesce(b.kind,'')='client'
      and coalesce(b.partner_relation,array[]::text[])
          && array['supplier','manufacturer','subcontractor']::text[]
    ) as supplier_role_conflict,
    (
      b.partner_count=1
      and coalesce(b.kind,'')='supplier'
      and coalesce(b.partner_relation,array[]::text[])
          && array['buyer','client']::text[]
    ) as buyer_role_conflict,
    (
      b.partner_count=1
      and nullif(b.contact_company_norm,'') is not null
      and nullif(b.partner_name_norm,'') is not null
      and b.contact_company_norm is distinct from b.partner_name_norm
      and position(b.contact_company_norm in b.partner_name_norm)=0
      and position(b.partner_name_norm in b.contact_company_norm)=0
    ) as company_label_review,
    (
      coalesce(b.company,'')=''
      or lower(coalesce(b.company,''))=b.email_domain
    ) as company_sparse_or_domain,
    (
      nullif(b.person,'') is not null
      and lower(btrim(b.person))=b.email
    ) as person_is_email,
    (
      coalesce(cr.mapped_partner_count,0)>1
    ) as reused_company_across_partners
  from overlap_base b
  left join company_reuse cr
    on cr.company_norm=b.contact_company_norm
),
scored as (
  select c.*,
    case
      when c.contact_email_duplicate or c.partner_email_ambiguous then 'high'
      when c.supplier_role_conflict or c.buyer_role_conflict or c.reused_company_across_partners then 'high'
      when c.company_label_review or c.company_sparse_or_domain or c.person_is_email then 'medium'
      else 'consistent'
    end as severity,
    case
      when c.unique_partner_authority then 'partner_registry'
      else 'manual_review'
    end as identity_authority,
    case
      when c.partner_count=1 and coalesce(c.partner_relation,array[]::text[])
           && array['supplier','manufacturer','subcontractor']::text[] then 'supplier'
      when c.partner_count=1 and coalesce(c.partner_relation,array[]::text[])
           && array['buyer','client']::text[] then 'client'
      else c.kind
    end as suggested_contact_kind,
    case when c.partner_count=1 then c.partner_name else null end as suggested_company,
    array_remove(array[
      case when c.contact_email_duplicate then 'contact_email_duplicate' end,
      case when c.partner_email_ambiguous then 'partner_email_ambiguous' end,
      case when c.supplier_role_conflict then 'contact_kind_client_vs_partner_supplier' end,
      case when c.buyer_role_conflict then 'contact_kind_supplier_vs_partner_buyer' end,
      case when c.company_label_review then 'contact_company_vs_partner_name_review' end,
      case when c.reused_company_across_partners then 'contact_company_reused_across_multiple_partners' end,
      case when c.company_sparse_or_domain then 'contact_company_sparse_or_domain_placeholder' end,
      case when c.person_is_email then 'contact_person_is_email_placeholder' end
    ],null)::text[] as issues,
    greatest(
      case when c.email=(select q from params) then 100 else 0 end,
      case when length((select q from params))>=3 and c.email like '%'||(select q from params)||'%' then 95 else 0 end,
      case when length((select q from params))>=3 and lower(coalesce(c.person,'')) like '%'||(select q from params)||'%' then 92 else 0 end,
      case when length((select q from params))>=3 and lower(coalesce(c.company,'')) like '%'||(select q from params)||'%' then 90 else 0 end,
      case when length((select q from params))>=3 and lower(coalesce(c.partner_name,'')) like '%'||(select q from params)||'%' then 94 else 0 end
    ) as query_match_score
  from classified c
),
matched as (
  select * from scored
  where (select q from params)='' or query_match_score>0
),
limited as (
  select * from matched
  order by
    case severity when 'high' then 0 when 'medium' then 1 else 2 end,
    query_match_score desc,email
  limit (select lim from params)
),
items as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'email',l.email,
    'severity',l.severity,
    'issues',to_jsonb(l.issues),
    'identity_authority',l.identity_authority,
    'partner_authority',case when l.partner_count=1 then jsonb_strip_nulls(jsonb_build_object(
      'partner_id',l.partner_id,'name',l.partner_name,'relation',l.partner_relation,
      'business_type',l.partner_business_type,'country',l.partner_country,
      'match_method','exact_unique_active_partner_contact'
    )) end,
    'contact_master',jsonb_strip_nulls(jsonb_build_object(
      'contact_id',l.contact_id,'kind',l.kind,'company',l.company,'person',l.person,
      'role',l.role,'country',l.country,'project_email_count',l.project_email_count,'projects',l.projects
    )),
    'suggested_reconciliation',jsonb_strip_nulls(jsonb_build_object(
      'suggested_kind',l.suggested_contact_kind,
      'suggested_company',l.suggested_company,
      'source','partner_registry_precedence',
      'apply_automatically',false,
      'requires_human_review',l.severity<>'consistent'
    )),
    'flags',jsonb_build_object(
      'contact_email_duplicate',l.contact_email_duplicate,
      'partner_email_ambiguous',l.partner_email_ambiguous,
      'supplier_role_conflict',l.supplier_role_conflict,
      'buyer_role_conflict',l.buyer_role_conflict,
      'company_label_review',l.company_label_review,
      'company_sparse_or_domain',l.company_sparse_or_domain,
      'person_is_email',l.person_is_email,
      'reused_company_across_partners',l.reused_company_across_partners
    ),
    'query_match_score',l.query_match_score
  )) order by case l.severity when 'high' then 0 when 'medium' then 1 else 2 end,l.query_match_score desc,l.email),'[]'::jsonb) as value
  from limited l
)
select jsonb_build_object(
  'integrity_version',2,
  'query',p_query,
  'read_only',true,
  'generated_at',now(),
  'policy',jsonb_build_object(
    'exact_unique_partner_contact_is_primary_identity_authority',true,
    'contact_master_is_secondary_when_conflicting',true,
    'company_label_difference_is_review_signal_not_auto_correction',true,
    'may_mutate_contacts',false,
    'may_mutate_partners',false,
    'may_assign_project',false,
    'may_change_client_supplier_role',false,
    'auto_reconciliation_allowed',false,
    'protected_human_gates_preserved',true
  ),
  'stats',jsonb_build_object(
    'cross_registry_overlaps',(select count(*) from scored),
    'returned',(select count(*) from limited),
    'high',(select count(*) from scored where severity='high'),
    'medium',(select count(*) from scored where severity='medium'),
    'consistent',(select count(*) from scored where severity='consistent'),
    'supplier_role_conflicts',(select count(*) from scored where supplier_role_conflict),
    'buyer_role_conflicts',(select count(*) from scored where buyer_role_conflict),
    'company_label_review',(select count(*) from scored where company_label_review),
    'company_sparse_or_domain',(select count(*) from scored where company_sparse_or_domain),
    'reused_company_across_partners',(select count(*) from scored where reused_company_across_partners),
    'contact_email_duplicates',(select count(*) from scored where contact_email_duplicate),
    'partner_email_ambiguities',(select count(*) from scored where partner_email_ambiguous)
  ),
  'items',(select value from items)
);
$function$;

revoke all on function public.pppp_chatgpt_entity_integrity_v2(text,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_entity_integrity_v2(text,integer)
  to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_entity_intelligence_v3(
  p_query text,
  p_limit integer default 10
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with base as (
  select public.pppp_chatgpt_entity_intelligence_v2(p_query,p_limit) as j
), identity as (
  select public.pppp_chatgpt_email_identity_resolution_v1(p_query,p_limit) as j
), integrity as (
  select public.pppp_chatgpt_entity_integrity_v2(p_query,p_limit) as j
)
select b.j || jsonb_build_object(
  'entity_intelligence_version',3,
  'neutral_identity_resolution',i.j,
  'contact_integrity',g.j,
  'identity_authority_policy',jsonb_build_object(
    'exact_unique_partner_contact_precedence',true,
    'contact_master_person_role_retained_as_secondary_evidence',true,
    'conflicting_contact_master_company_or_kind_is_not_authoritative',true,
    'domain_only_identity_is_hint_only',true,
    'raw_email_evidence_is_context_only',true,
    'no_automatic_contact_rewrite',true,
    'no_project_assignment_from_identity',true,
    'human_review_required_for_reconciliation',true
  )
)
from base b cross join identity i cross join integrity g;
$function$;

revoke all on function public.pppp_chatgpt_entity_intelligence_v3(text,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_entity_intelligence_v3(text,integer)
  to service_role,supabase_read_only_user;

-- Bridge v10 prefers Entity Intelligence v3 and exposes the integrity review surface.
create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v10',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v3(text,integer)',
      'public.pppp_chatgpt_entity_integrity_v2(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v2(text,integer)',
      'public.pppp_chatgpt_email_identity_resolution_v1(text,integer)',
      'public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)',
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
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v3(text,integer). Exact unique partner-contact identity has precedence over conflicting Contact Master company/kind data; integrity conflicts remain review-only and are never auto-written.',
      'kontrollo integritetin e kontakteve','Use public.pppp_chatgpt_entity_integrity_v2(text,integer). Suggested reconciliation is read-only and requires human review.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer) for the review queue, then neutral identity resolution and raw email evidence as needed. Missing reply evidence is not itself an action-required decision.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, prefer public.pppp_chatgpt_entity_intelligence_v3(text,integer). Exact unique active partner-contact identity is the primary identity authority when Contact Master conflicts; Contact Master person/role may remain secondary evidence pending review. Use public.pppp_chatgpt_entity_integrity_v2(text,integer) for reconciliation review. Never auto-rewrite contacts, assign a project, or infer client/supplier role from raw email/domain evidence alone. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1()
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1()
  to service_role,supabase_read_only_user;
