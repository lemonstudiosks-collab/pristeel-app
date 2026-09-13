-- Read-only unresolved business inbox for PPPP.
-- Surfaces unlinked inbound business communication and reply evidence without
-- assigning projects, creating tasks, sending email, or changing commercial state.

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
  when email in ('eprokurimi@rks-gov.net','e-prokurimi@keptrust.org','bieter@dtvp.de')
    or domain='dtvp.de'
    then 'procurement_system'
  when localpart ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc|dmarcreport|mailrobot)([+._-]|$)'
    or email ~ '(ted-no-reply|noreply-dmarc|apps-scripts-notifications)'
    or email in ('welcome@supabase.com','hello@purchaser.wlw.com')
    or domain in (
      'mail.xing.com','e-mail.xing.com','em.linkedin.com','m.learn.coursera.org',
      'e.mailchimp.com','engage.canva.com','mail.apollo.io','hi.pitch.com',
      'mail.goldfish.sh','connect.blinq.me','updates.resend.com',
      'emailnotifications.microsoft.com','communication.microsoft.com',
      'invitations.mailinblack.com'
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

create or replace function public.pppp_chatgpt_unresolved_business_inbox_v1(
  p_days integer default 30,
  p_limit integer default 30
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select greatest(1,least(coalesce(p_days,30),90)) as days,
         greatest(1,least(coalesce(p_limit,30),100)) as lim
),
incoming as (
  select
    e.id,
    e.gmail_message_id,
    e.gmail_thread_id,
    e.sent_at,
    lower(btrim(e.from_email)) as email,
    nullif(btrim(e.from_name),'') as from_name,
    e.subject,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(e.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),
      '[^a-z0-9]+',' ','g'
    )) as subject_norm,
    e.match_method,
    e.match_confidence,
    e.needs_review,
    e.suggested_project_id
  from public.project_emails e, params p
  where e.project_id is null
    and e.direction='incoming'
    and e.sent_at >= now() - make_interval(days => p.days)
    and nullif(btrim(coalesce(e.from_email,'')),'') is not null
    and public.pppp_email_sender_class_v1(e.from_email,e.from_name,e.subject)='external'
),
outgoing as (
  select
    e.gmail_thread_id,
    e.sent_at,
    e.to_emails,
    trim(regexp_replace(
      regexp_replace(lower(coalesce(e.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),
      '[^a-z0-9]+',' ','g'
    )) as subject_norm
  from public.project_emails e, params p
  where e.direction='outgoing'
    and e.sent_at >= now() - make_interval(days => p.days + 7)
),
with_reply_evidence as (
  select
    i.*,
    exists(
      select 1 from outgoing o
      where o.sent_at>i.sent_at
        and nullif(btrim(coalesce(i.gmail_thread_id,'')),'') is not null
        and o.gmail_thread_id=i.gmail_thread_id
    ) as later_outgoing_same_thread,
    exists(
      select 1 from outgoing o
      where o.sent_at>i.sent_at
        and length(i.subject_norm)>=12
        and o.subject_norm=i.subject_norm
        and exists(
          select 1
          from unnest(coalesce(o.to_emails,'{}'::text[])) t(x)
          where lower(btrim(t.x))=i.email
        )
    ) as later_outgoing_same_subject
  from incoming i
),
contact_exact as (
  select lower(btrim(c.email)) as email,
         c.contact_id,c.kind,c.company,c.person,c.role,c.country
  from public.pppp_contact_master_v1 c
  where nullif(btrim(coalesce(c.email,'')),'') is not null
),
partner_group as (
  select lower(btrim(x.email)) as email,
         count(distinct pc.partner_id)::int as partner_count,
         min(pc.partner_id::text)::uuid as partner_id
  from public.partner_contacts pc
  join public.partners p on p.id=pc.partner_id and p.stage='active'
  cross join lateral (values(pc.email),(pc.email_alt)) x(email)
  where nullif(btrim(coalesce(x.email,'')),'') is not null
  group by lower(btrim(x.email))
),
partner_exact as (
  select g.email,g.partner_count,g.partner_id,p.name as partner_name,
         p.relation,p.business_type,p.country
  from partner_group g
  left join public.partners p on p.id=g.partner_id and g.partner_count=1
),
classified as (
  select
    r.*,
    c.contact_id,c.kind as contact_kind,c.company as contact_company,
    c.person as contact_person,c.role as contact_role,c.country as contact_country,
    pe.partner_count,pe.partner_id,pe.partner_name,pe.relation as partner_relation,
    pe.business_type as partner_business_type,pe.country as partner_country,
    p.name as suggested_project_name,
    case
      when pe.partner_count=1 then 'canonical_partner_contact'
      when c.contact_id is not null then 'canonical_contact'
      else 'unresolved_external'
    end as identity_status,
    case
      when r.later_outgoing_same_thread or r.later_outgoing_same_subject
        then 'handled_by_later_outgoing_evidence'
      else 'review_reply_evidence_missing'
    end as review_state,
    case
      when lower(coalesce(r.subject,'')) ~ '(invoice|rechnung|fatur|payment|zahlung)'
        then 'finance'
      when lower(coalesce(r.subject,'')) ~ '(zoll|cbam|customs|dogan)'
        then 'customs_logistics'
      when lower(coalesce(r.subject,'')) ~ '(application|bewerbung|curriculum|\bcv\b|career|job)'
        then 'recruitment'
      when lower(coalesce(r.subject,'')) ~ '(rfq|request for quotation|k[ëe]rkes[ëe] p[ëe]r ofert[ëe]|anfrage|angebot|quotation|ponud)'
        then 'procurement_commercial'
      when lower(coalesce(r.subject,'')) ~ '(cooperation|kooperation|partenaire|partnership|bashk[ëe]pun)'
        then 'partnership'
      else 'general_business'
    end as topic_hint
  from with_reply_evidence r
  left join contact_exact c on c.email=r.email
  left join partner_exact pe on pe.email=r.email
  left join public.projects p on p.id=r.suggested_project_id
),
ranked as (
  select c.*,
    case when c.review_state='review_reply_evidence_missing' then 0 else 1 end as handled_rank,
    case
      when c.partner_count=1 then 0
      when c.contact_id is not null then 1
      else 2
    end as identity_rank
  from classified c
),
limited as (
  select * from ranked
  order by handled_rank, sent_at desc nulls last, identity_rank, id desc
  limit (select lim from params)
),
items as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'email_row_id',l.id,
    'gmail_message_id',l.gmail_message_id,
    'gmail_thread_id',l.gmail_thread_id,
    'sent_at',l.sent_at,
    'from_email',l.email,
    'from_name',l.from_name,
    'subject',l.subject,
    'identity_status',l.identity_status,
    'identity',case
      when l.partner_count=1 then jsonb_strip_nulls(jsonb_build_object(
        'partner_id',l.partner_id,'name',l.partner_name,'relation',l.partner_relation,
        'business_type',l.partner_business_type,'country',l.partner_country,
        'source','exact_partner_contact'
      ))
      when l.contact_id is not null then jsonb_strip_nulls(jsonb_build_object(
        'contact_id',l.contact_id,'person',l.contact_person,'company',l.contact_company,
        'kind',l.contact_kind,'role',l.contact_role,'country',l.contact_country,
        'source','contact_master'
      ))
      else null end,
    'topic_hint',l.topic_hint,
    'review_state',l.review_state,
    'reply_evidence',jsonb_build_object(
      'later_outgoing_same_thread',l.later_outgoing_same_thread,
      'later_outgoing_same_subject',l.later_outgoing_same_subject
    ),
    'existing_project_hint',case when l.suggested_project_id is not null then jsonb_build_object(
      'project_id',l.suggested_project_id,'project_name',l.suggested_project_name,
      'source_match_method',l.match_method,'source_confidence',l.match_confidence,
      'authoritative',false
    ) end,
    'source_review_flag',coalesce(l.needs_review,false),
    'project_identity_allowed',false,
    'action_created',false
  )) order by l.handled_rank,l.sent_at desc nulls last,l.identity_rank,l.id desc),'[]'::jsonb) as value
  from limited l
)
select jsonb_build_object(
  'read_only',true,
  'generated_at',now(),
  'days',(select days from params),
  'policy',jsonb_build_object(
    'missing_reply_evidence_is_not_action_required',true,
    'project_hint_is_non_authoritative',true,
    'may_assign_project',false,
    'may_create_task_or_action',false,
    'may_send_email',false,
    'may_change_client_supplier_role',false,
    'protected_human_gates_preserved',true
  ),
  'stats',jsonb_build_object(
    'business_incoming',(select count(*) from classified),
    'review_reply_evidence_missing',(select count(*) from classified where review_state='review_reply_evidence_missing'),
    'handled_by_later_outgoing_evidence',(select count(*) from classified where review_state='handled_by_later_outgoing_evidence'),
    'canonical_partner_contact',(select count(*) from classified where identity_status='canonical_partner_contact'),
    'canonical_contact',(select count(*) from classified where identity_status='canonical_contact'),
    'unresolved_external',(select count(*) from classified where identity_status='unresolved_external')
  ),
  'items',(select value from items)
);
$function$;

revoke all on function public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)
  to service_role,supabase_read_only_user;

-- Bridge v9 exposes the business review inbox without changing the write protocol.
create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v9',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
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
      'pyet për kompani/person/furnitor','Use public.pppp_chatgpt_entity_intelligence_v2(text,integer). If identity is unresolved or evidence-only, use public.pppp_chatgpt_email_identity_resolution_v1(text,integer).',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer) for the review queue, then neutral identity resolution and raw email evidence as needed. Missing reply evidence is not itself an action-required decision.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, use entity intelligence plus neutral email identity resolution when needed. For unresolved inbound communication, use the unresolved business inbox as a read-only review surface: missing reply evidence does not by itself mean action is required, and project hints are non-authoritative. Never assign a project or client/supplier role from raw email/domain evidence alone. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1()
  from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1()
  to service_role,supabase_read_only_user;
