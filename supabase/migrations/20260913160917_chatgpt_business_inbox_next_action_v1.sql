create or replace function public.pppp_chatgpt_business_inbox_v2(
  p_days integer default 30,
  p_limit integer default 50
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select greatest(1, least(coalesce(p_days,30),90)) as days,
         greatest(1, least(coalesce(p_limit,50),200)) as lim
),
incoming_base as (
  select e.id,e.gmail_message_id,e.gmail_thread_id,e.sent_at,
    lower(btrim(e.from_email)) as email,nullif(btrim(e.from_name),'') as from_name,
    e.subject,e.snippet,e.has_attachments,e.match_method,e.match_confidence,e.needs_review,e.suggested_project_id,
    trim(regexp_replace(regexp_replace(lower(coalesce(e.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),'[^a-z0-9]+',' ','g')) as subject_norm,
    regexp_replace(coalesce(e.snippet,''),E'(?is)(\\nfrom:|\\non .{0,200}wrote:|\\n_{5,}).*$','','g') as current_snippet
  from public.project_emails e,params p
  where e.project_id is null and e.direction='incoming'
    and e.sent_at>=now()-make_interval(days=>p.days)
    and nullif(btrim(coalesce(e.from_email,'')),'') is not null
    and public.pppp_email_sender_class_v1(e.from_email,e.from_name,e.subject)='external'
),threaded as (
  select i.*,coalesce(nullif(i.gmail_thread_id,''),'mail:'||i.email||':'||i.subject_norm) conversation_key
  from incoming_base i
),latest_incoming as (
  select * from (select t.*,row_number() over(partition by t.conversation_key order by t.sent_at desc nulls last,t.id desc) rn from threaded t) q where q.rn=1
),with_reply as (
  select l.*,exists(
    select 1 from public.project_emails o where o.direction='outgoing' and o.sent_at>l.sent_at and (
      (nullif(btrim(coalesce(l.gmail_thread_id,'')),'') is not null and o.gmail_thread_id=l.gmail_thread_id)
      or (length(l.subject_norm)>=12 and trim(regexp_replace(regexp_replace(lower(coalesce(o.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),'[^a-z0-9]+',' ','g'))=l.subject_norm
        and exists(select 1 from unnest(coalesce(o.to_emails,'{}'::text[])) x(email) where lower(btrim(x.email))=l.email))
    )) later_outgoing_evidence
  from latest_incoming l
),contact_exact as (
  select lower(btrim(c.email)) email,c.contact_id,c.kind,c.company,c.person,c.role,c.country
  from public.pppp_contact_master_v1 c where nullif(btrim(coalesce(c.email,'')),'') is not null
),partner_group as (
  select lower(btrim(x.email)) email,count(distinct pc.partner_id)::int partner_count,min(pc.partner_id::text)::uuid partner_id
  from public.partner_contacts pc join public.partners p on p.id=pc.partner_id and p.stage='active'
  cross join lateral (values(pc.email),(pc.email_alt)) x(email)
  where nullif(btrim(coalesce(x.email,'')),'') is not null group by lower(btrim(x.email))
),partner_exact as (
  select g.email,g.partner_count,g.partner_id,p.name partner_name,p.relation,p.business_type,p.country
  from partner_group g left join public.partners p on p.id=g.partner_id and g.partner_count=1
),project_evidence as (
  select r.*,public.pppp_email_subject_explicit_project_v1(r.subject) explicit_project_id,
    (select case when count(distinct x.project_id)=1 then min(x.project_id::text)::uuid end from public.project_emails x
     where nullif(btrim(coalesce(r.gmail_thread_id,'')),'') is not null and x.gmail_thread_id=r.gmail_thread_id and x.project_id is not null) thread_anchor_project_id
  from with_reply r
),identity_enriched as (
  select p.*,c.contact_id,c.kind contact_kind,c.company contact_company,c.person contact_person,c.role contact_role,c.country contact_country,
    pe.partner_count,pe.partner_id,pe.partner_name,pe.relation partner_relation,pe.business_type partner_business_type,pe.country partner_country,
    case when p.thread_anchor_project_id is not null then p.thread_anchor_project_id when p.explicit_project_id is not null then p.explicit_project_id else p.suggested_project_id end evidence_project_id,
    case when p.thread_anchor_project_id is not null then 'unique_thread_anchor' when p.explicit_project_id is not null then 'explicit_subject_identity' when p.suggested_project_id is not null then 'existing_non_authoritative_suggestion' end project_evidence_method,
    case when p.thread_anchor_project_id is not null then 100 when p.explicit_project_id is not null then 98 when p.suggested_project_id is not null then least(coalesce(p.match_confidence,0),85) else 0 end project_evidence_confidence,
    (p.thread_anchor_project_id is not null or p.explicit_project_id is not null) project_context_strong,
    lower(coalesce(p.subject,'')||' '||coalesce(p.current_snippet,'')) current_text,
    extract(epoch from (now()-p.sent_at))/3600.0 age_hours
  from project_evidence p left join contact_exact c on c.email=p.email left join partner_exact pe on pe.email=p.email
),signals as (
  select i.*,
    (i.current_text ~ '(absage|nicht in die engere auswahl|not (selected|shortlisted)|unsuccessful|leider.{0,80}nicht berücks|we regret|nicht berücksichtigt)') rejection_signal,
    (i.current_text ~ '(dear valued partner|updated .{0,80}catalog|product catalogue|product portfolio|stock (list|availability)|telegram channel|newsletter|introduce our company|what we can offer is the following|main activity is production|looking for .{0,80} let .{0,40} check)') marketing_signal,
    (i.current_text ~ '(application|bewerbung|curriculum|hiring manager|career|job opportun)') recruitment_signal,
    (i.current_text ~ '(invoice|rechnung|fatur[ëe]|payment|zahlung)') finance_signal,
    (i.current_text ~ '(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection)') legal_signal,
    (lower(coalesce(i.subject,'')) ~ '(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)' or i.current_text ~ '(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))') offer_signal,
    (i.current_text ~ '(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)') request_signal,
    (i.current_text ~ '(thank you.{0,160}stay in touch|happy to stay in touch|reconnect once|look forward.{0,120}future|confirmed[, ]|see you[, ]|as requested.{0,80}attached|sipas k[ëe]rkes[ëe]s.{0,80}bashkangjitur)') acknowledgement_signal,
    (i.current_text ~ '(need(s|ed)? more time|require(s|d)? more time|aufschub|will (send|provide|reply|respond)|werde.{0,60}(senden|schicken)|by [a-z]+day|bis zum|bis [0-9]{1,2}[./-][0-9]{1,2}[./-]20[0-9]{2})') counterparty_commitment_signal,
    (i.current_text ~ '(invitation|einladung|ftes[ëe]|expo|b2b|zoom meeting|teams meeting|calendar invite|terminbestätigung)') event_signal,
    (coalesce(i.has_attachments,false) or i.current_text ~ '(attached|bashkangjitur|bashk[ëe]ngjitur|beigefügt|enclosed|anlage)') document_signal,
    (length(btrim(coalesce(i.current_snippet,'')))<24 and lower(btrim(coalesce(i.subject,''))) in ('','(pa subjekt)','the','re:','fw:','fwd:')) low_information_signal
  from identity_enriched i
),project_joined as (
  select s.*,p.name evidence_project_name,p.status evidence_project_status,p.pipeline_stage evidence_pipeline_stage,p.operational_state evidence_operational_state
  from signals s left join public.projects p on p.id=s.evidence_project_id
),classified as (
  select s.*,
    case when s.later_outgoing_evidence then 'handled' when s.project_context_strong and s.evidence_operational_state='closed' then 'informational'
      when s.legal_signal then 'action_candidate' when s.rejection_signal then 'action_candidate' when s.marketing_signal then 'informational'
      when s.low_information_signal then 'informational' when s.recruitment_signal then 'review_optional' when s.event_signal then 'review_optional'
      when s.finance_signal and s.document_signal then 'process_document' when s.offer_signal then 'action_candidate'
      when s.counterparty_commitment_signal and not s.request_signal then 'waiting' when s.request_signal then 'action_candidate'
      when s.acknowledgement_signal then 'informational' else 'semantic_review' end next_action_state,
    case when s.later_outgoing_evidence then 'already_replied' when s.project_context_strong and s.evidence_operational_state='closed' then 'project_already_terminal'
      when s.legal_signal then 'review_legal_or_collection_matter' when s.rejection_signal then 'review_project_outcome' when s.marketing_signal then 'supplier_marketing_update'
      when s.low_information_signal then 'low_information_no_action' when s.recruitment_signal then 'recruitment_review_optional' when s.event_signal then 'event_invitation_review_optional'
      when s.finance_signal and s.document_signal then 'process_finance_document' when s.offer_signal then 'review_received_offer'
      when s.counterparty_commitment_signal and not s.request_signal then 'wait_for_counterparty' when s.request_signal then 'review_and_reply'
      when s.acknowledgement_signal then 'no_reply_indicated' when s.document_signal then 'review_received_document' else 'semantic_review_needed' end recommended_action,
    case when s.later_outgoing_evidence then 0 when s.project_context_strong and s.evidence_operational_state='closed' then 0 when s.legal_signal then 98 when s.rejection_signal then 96
      when s.marketing_signal then 5 when s.low_information_signal then 5 when s.recruitment_signal then 20 when s.event_signal then 20
      when s.finance_signal and s.document_signal then 78 when s.offer_signal then 88 when s.counterparty_commitment_signal and not s.request_signal then 35
      when s.request_signal then least(95,86+floor(least(s.age_hours,216)/48)::int) when s.acknowledgement_signal then 5 when s.document_signal then 58 else 48 end priority_score,
    case when s.rejection_signal then 'project_won_or_lost_decision' when s.request_signal and not s.marketing_signal then 'external_email_send' end protected_gate,
    case when s.partner_count=1 then 'canonical_partner_contact' when s.contact_id is not null then 'canonical_contact' else 'unresolved_external' end identity_status
  from project_joined s
),limited as (
  select * from classified order by priority_score desc,sent_at desc nulls last,id desc limit (select lim from params)
),items as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'email_row_id',l.id,'gmail_message_id',l.gmail_message_id,'gmail_thread_id',l.gmail_thread_id,'sent_at',l.sent_at,'age_hours',round(l.age_hours::numeric,1),
    'from_email',l.email,'from_name',l.from_name,'subject',l.subject,'current_snippet',left(coalesce(l.current_snippet,''),1200),'has_attachments',coalesce(l.has_attachments,false),
    'identity_status',l.identity_status,'identity',case when l.partner_count=1 then jsonb_strip_nulls(jsonb_build_object('partner_id',l.partner_id,'name',l.partner_name,'relation',l.partner_relation,'business_type',l.partner_business_type,'country',l.partner_country,'source','exact_unique_active_partner_contact')) when l.contact_id is not null then jsonb_strip_nulls(jsonb_build_object('contact_id',l.contact_id,'person',l.contact_person,'company',l.contact_company,'kind',l.contact_kind,'role',l.contact_role,'country',l.contact_country,'source','contact_master_secondary')) end,
    'project_evidence',case when l.evidence_project_id is not null then jsonb_strip_nulls(jsonb_build_object('project_id',l.evidence_project_id,'project_name',l.evidence_project_name,'method',l.project_evidence_method,'confidence',l.project_evidence_confidence,'strong_context',l.project_context_strong,'status',l.evidence_project_status,'pipeline_stage',l.evidence_pipeline_stage,'operational_state',l.evidence_operational_state,'assignment_allowed',false)) end,
    'next_action_state',l.next_action_state,'recommended_action',l.recommended_action,'priority_score',l.priority_score,'protected_gate',l.protected_gate,
    'reply_evidence',jsonb_build_object('later_outgoing',l.later_outgoing_evidence,'missing_reply_alone_is_action',false),
    'signals',jsonb_build_object('rejection',l.rejection_signal,'marketing',l.marketing_signal,'recruitment',l.recruitment_signal,'finance',l.finance_signal,'legal',l.legal_signal,'offer',l.offer_signal,'direct_request',l.request_signal,'acknowledgement',l.acknowledgement_signal,'counterparty_commitment',l.counterparty_commitment_signal,'event',l.event_signal,'document',l.document_signal,'low_information',l.low_information_signal),
    'source_review_flag',coalesce(l.needs_review,false),'action_created',false,'project_assignment_performed',false
  )) order by l.priority_score desc,l.sent_at desc nulls last,l.id desc),'[]'::jsonb) value from limited l
)
select jsonb_build_object('business_inbox_version',2,'read_only',true,'generated_at',now(),'days',(select days from params),
  'policy',jsonb_build_object('thread_level_deduplication',true,'latest_incoming_drives_state',true,'quoted_history_is_excluded_from_primary_signal_scan',true,'missing_reply_evidence_is_not_action_required',true,'identity_does_not_assign_project',true,'project_assignment_allowed',false,'may_create_task_or_action',false,'may_send_email',false,'may_change_client_supplier_role',false,'rejection_never_auto_closes_project',true,'protected_human_gates_preserved',true),
  'stats',jsonb_build_object('conversations',(select count(*) from classified),'action_candidate',(select count(*) from classified where next_action_state='action_candidate'),'process_document',(select count(*) from classified where next_action_state='process_document'),'semantic_review',(select count(*) from classified where next_action_state='semantic_review'),'waiting',(select count(*) from classified where next_action_state='waiting'),'review_optional',(select count(*) from classified where next_action_state='review_optional'),'informational',(select count(*) from classified where next_action_state='informational'),'handled',(select count(*) from classified where next_action_state='handled'),'project_outcome_reviews',(select count(*) from classified where recommended_action='review_project_outcome'),'received_offers',(select count(*) from classified where recommended_action='review_received_offer'),'direct_reply_reviews',(select count(*) from classified where recommended_action='review_and_reply')),
  'items',(select value from items));
$function$;
revoke all on function public.pppp_chatgpt_business_inbox_v2(integer,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_business_inbox_v2(integer,integer) to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_next_action_intelligence_v1(p_days integer default 30,p_limit integer default 25)
returns jsonb language sql stable security definer set search_path=pg_catalog,public as $function$
with params as (select greatest(1,least(coalesce(p_limit,25),100)) lim),
base as (select public.pppp_chatgpt_business_inbox_v2(greatest(1,least(coalesce(p_days,30),90)),200) j),
expanded as (select x.item from base b cross join lateral jsonb_array_elements(coalesce(b.j->'items','[]'::jsonb)) x(item)),
ranked as (select item,coalesce((item->>'priority_score')::int,0) priority_score,item->>'next_action_state' next_action_state,item->>'recommended_action' recommended_action,(item->>'sent_at')::timestamptz sent_at from expanded where item->>'next_action_state' in ('action_candidate','process_document','semantic_review','waiting','review_optional')),
limited as (select * from ranked order by priority_score desc,sent_at desc nulls last limit (select lim from params)),
items as (select coalesce(jsonb_agg(item order by priority_score desc,sent_at desc nulls last),'[]'::jsonb) value from limited)
select jsonb_build_object('next_action_intelligence_version',1,'read_only',true,'generated_at',now(),'days',greatest(1,least(coalesce(p_days,30),90)),
 'policy',jsonb_build_object('recommendations_are_review_only',true,'missing_reply_alone_never_creates_action',true,'no_task_creation',true,'no_email_send',true,'no_project_assignment',true,'no_project_disposition',true,'no_supplier_selection',true,'no_price_or_margin_decision',true,'protected_human_gates_preserved',true),
 'stats',jsonb_build_object('returned',(select count(*) from limited),'high_priority',(select count(*) from limited where priority_score>=85),'medium_priority',(select count(*) from limited where priority_score between 50 and 84),'low_priority',(select count(*) from limited where priority_score<50),'reply_review',(select count(*) from limited where recommended_action='review_and_reply'),'offer_review',(select count(*) from limited where recommended_action='review_received_offer'),'project_outcome_review',(select count(*) from limited where recommended_action='review_project_outcome'),'finance_document',(select count(*) from limited where recommended_action='process_finance_document')),
 'items',(select value from items));
$function$;
revoke all on function public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) to service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v11',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v3(text,integer)',
      'public.pppp_chatgpt_entity_integrity_v2(text,integer)',
      'public.pppp_chatgpt_business_inbox_v2(integer,integer)',
      'public.pppp_chatgpt_next_action_intelligence_v1(integer,integer)',
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
    'protected_actions',jsonb_build_array('external_email_send','supplier_selection_or_commitment','final_selling_price_or_margin','contract_or_purchase_order_commitment','project_won_or_lost_decision'),
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
      'kontrollo inbox / çka kërkon veprim','Use public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) for ranked review-only recommendations. Use public.pppp_chatgpt_business_inbox_v2(integer,integer) for the full deduplicated conversation surface. Missing reply evidence alone is never an action decision.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_business_inbox_v2(integer,integer), then neutral identity resolution and raw email evidence as needed. Identity alone never assigns a project.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For company/person/supplier/manufacturer questions, prefer public.pppp_chatgpt_entity_intelligence_v3(text,integer). For inbox/attention questions, prefer public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) and use public.pppp_chatgpt_business_inbox_v2(integer,integer) for full conversation evidence. Missing reply evidence alone never means action required. Identity never assigns a project. Rejection/outcome evidence is review-only and never auto-closes a project. Preserve all protected human approval gates.'
  );
$function$;
revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to service_role,supabase_read_only_user;
