create or replace function public.pppp_chatgpt_project_resolution_v2(
  p_source_type text,
  p_source_ref text,
  p_payload jsonb default '{}'::jsonb,
  p_limit integer default 5
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select lower(btrim(coalesce(p_source_type,''))) as stype,
         btrim(coalesce(p_source_ref,'')) as sref,
         coalesce(p_payload,'{}'::jsonb) as payload,
         greatest(1,least(coalesce(p_limit,5),10)) as lim
),
source_base as (
  select 'email'::text source_kind,e.gmail_message_id source_key,e.gmail_message_id email_id,e.gmail_thread_id thread_id,
         e.project_id direct_project_id,e.suggested_project_id legacy_suggested_project_id,e.match_method,e.match_confidence,
         lower(btrim(coalesce(e.from_email,''))) counterparty_email,e.subject,
         regexp_replace(coalesce(e.snippet,''),E'(?is)(\\nfrom:|\\non .{0,200}wrote:|\\n_{5,}).*$','','g') body_text,
         e.sent_at,
         (e.project_id is not null and coalesce(e.match_confidence,0)>=99 and lower(coalesce(e.match_method,'')) ~ '(manual|verified|gmail-intake|unique-thread|project-identity|historical-link-only)') direct_authoritative
  from public.project_emails e,params p
  where p.stype in ('email','gmail_message','gmail_message_id') and e.gmail_message_id=p.sref

  union all

  select 'conversation',p.sref,e.gmail_message_id,p.sref,null::uuid,e.suggested_project_id,e.match_method,e.match_confidence,
         lower(btrim(coalesce(e.from_email,''))),e.subject,
         regexp_replace(coalesce(e.snippet,''),E'(?is)(\\nfrom:|\\non .{0,200}wrote:|\\n_{5,}).*$','','g'),e.sent_at,false
  from params p
  cross join lateral (
    select x.* from public.project_emails x
    where p.stype in ('conversation','thread','gmail_thread','gmail_thread_id') and x.gmail_thread_id=p.sref
    order by x.sent_at desc nulls last,x.id desc limit 1
  ) e

  union all

  select 'rfq',r.id::text,null,null,r.project_id,null,null,null,lower(btrim(coalesce(r.supplier_email,''))),r.subject,coalesce(r.body,''),coalesce(r.sent_at,r.created_at),true
  from public.rfq_log r,params p
  where p.stype='rfq' and r.id::text=p.sref

  union all

  select 'offer',o.id::text,null,null,o.project_id,null,null,null,null,coalesce(o.offer_ref,o.supplier,'Offer'),coalesce(o.raw_text,'')||' '||coalesce(o.offer_ref,''),o.created_at,true
  from public.offers o,params p
  where p.stype='offer' and (o.id::text=p.sref or (nullif(btrim(coalesce(o.offer_ref,'')),'') is not null and o.offer_ref=p.sref))

  union all

  select 'document',d.id::text,null,null,d.project_id,null,null,null,null,coalesce(d.doc_nr,d.project,'Document'),
         concat_ws(' ',d.doc_nr,d.project,d.client,d.offer_state::text),d.created_at,true
  from public.documents_registry d,params p
  where p.stype in ('document','doc') and (d.id::text=p.sref or (nullif(btrim(coalesce(d.doc_nr,'')),'') is not null and d.doc_nr=p.sref))

  union all

  select 'document',d.id::text,null,null,d.project_id,null,null,null,null,coalesce(d.doc_nr,d.title,d.file_name,'Document'),
         concat_ws(' ',d.doc_nr,d.title,d.party,d.file_name,d.notes),coalesce(d.doc_date::timestamptz,d.created_at),true
  from public.project_docs d,params p
  where p.stype in ('document','doc') and (d.id::text=p.sref or (nullif(btrim(coalesce(d.doc_nr,'')),'') is not null and d.doc_nr=p.sref))

  union all

  select 'event',p.sref,null,null,null::uuid,null,null,null,lower(btrim(coalesce(p.payload->>'counterparty_email',''))),
         coalesce(p.payload->>'subject',''),concat_ws(' ',p.payload->>'body',p.payload->>'reference',p.payload->>'attachment_names'),null::timestamptz,false
  from params p where p.stype in ('event','entity_event','text_event') and p.sref<>''
),
source_rollup as (
  select count(*)::int source_count,
         min(source_kind) source_kind,min(source_key) source_key,min(email_id) email_id,min(thread_id) thread_id,
         case when count(distinct direct_project_id) filter(where direct_project_id is not null)=1 then min(direct_project_id::text)::uuid end direct_project_id,
         count(distinct direct_project_id) filter(where direct_project_id is not null)::int direct_project_count,
         bool_or(coalesce(direct_authoritative,false)) direct_authoritative,
         case when count(distinct legacy_suggested_project_id) filter(where legacy_suggested_project_id is not null)=1 then min(legacy_suggested_project_id::text)::uuid end legacy_suggested_project_id,
         max(match_method) legacy_match_method,max(match_confidence) legacy_match_confidence,
         nullif(max(counterparty_email),'') counterparty_email,
         string_agg(coalesce(subject,''),' ' order by sent_at desc nulls last) subject,
         string_agg(coalesce(body_text,''),' ' order by sent_at desc nulls last) body_text,
         max(sent_at) sent_at
  from source_base
),
source_norm as (
  select s.*,
    trim(regexp_replace(regexp_replace(lower(coalesce(s.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),'[^a-z0-9]+',' ','g')) subject_norm,
    trim(regexp_replace(lower(concat_ws(' ',s.subject,s.body_text)),'[^a-zA-Z0-9]+',' ','g')) text_norm
  from source_rollup s
),
identity_rows as (
  select p.id project_id,'project_name' identity_kind,p.name raw_identity from public.projects p where nullif(btrim(coalesce(p.name,'')),'') is not null
  union all select p.id,'project_ref',p.ref from public.projects p where nullif(btrim(coalesce(p.ref,'')),'') is not null
  union all select p.id,'business_ref',p.business_ref from public.projects p where nullif(btrim(coalesce(p.business_ref,'')),'') is not null
  union all select p.id,'identity_alias',a.alias from public.projects p cross join lateral unnest(coalesce(p.identity_aliases,'{}'::text[])) a(alias) where nullif(btrim(coalesce(a.alias,'')),'') is not null
),
identity_norm as (
  select i.*,trim(regexp_replace(lower(i.raw_identity),'[^a-zA-Z0-9]+',' ','g')) ident_norm
  from identity_rows i
  where length(btrim(i.raw_identity))>=8
),
explicit_identity_evidence as (
  select distinct i.project_id,'A'::text tier,'strong'::text evidence_strength,
         case i.identity_kind when 'business_ref' then 'exact_business_ref' when 'project_ref' then 'exact_project_ref' when 'identity_alias' then 'unique_project_alias_phrase' else 'explicit_project_name_phrase' end method,
         case when i.identity_kind in ('business_ref','project_ref') then 100 else 98 end score,
         jsonb_build_object('identity_kind',i.identity_kind,'matched',i.raw_identity) details
  from identity_norm i cross join source_norm s
  where s.source_count>0 and length(i.ident_norm)>=8
    and i.ident_norm not in ('early warning and alarm system','structural steel fabrication','steel structure fabrication')
    and (' '||s.text_norm||' ') like '% '||i.ident_norm||' %'
),
context_anchor_evidence as (
  select distinct f.project_id,'A'::text tier,'authoritative'::text evidence_strength,'observed_project_context_anchor'::text method,100 score,
         jsonb_strip_nulls(jsonb_build_object('fact_key',f.fact_key,'source_ref',f.source_ref,'gmail_message_id',f.value->>'gmail_message_id','gmail_thread_id',f.value->>'gmail_thread_id')) details
  from public.pppp_project_context_current_v f cross join source_norm s
  where s.source_count>0 and f.fact_status='observed' and f.project_id is not null and (
    (s.email_id is not null and f.value->>'gmail_message_id'=s.email_id)
    or (s.thread_id is not null and f.value->>'gmail_thread_id'=s.thread_id)
    or f.source_ref='gmail:'||coalesce(s.email_id,'')
  )
),
thread_project_rows as (
  select e.project_id
  from public.project_emails e cross join source_norm s
  where s.thread_id is not null and e.gmail_thread_id=s.thread_id and e.project_id is not null
    and coalesce(e.match_confidence,0)>=95 and lower(coalesce(e.match_method,'')) not like '%suggest%'
  union
  select p.id
  from public.project_email_links l join public.projects p on p.id::text=l.project_id cross join source_norm s
  where s.thread_id is not null and l.gmail_thread_id=s.thread_id and coalesce(l.confidence,0)>=95
),
thread_stats as (select count(distinct project_id)::int project_count,case when count(distinct project_id)=1 then min(project_id::text)::uuid end project_id from thread_project_rows),
thread_anchor_evidence as (
  select t.project_id,'A'::text,'strong'::text,'unique_gmail_thread_anchor'::text,99,jsonb_build_object('gmail_thread_id',s.thread_id)
  from thread_stats t cross join source_norm s where t.project_count=1
),
reference_rows as (
  select d.project_id,'document_registry_ref' method,d.doc_nr raw_ref from public.documents_registry d where d.project_id is not null and nullif(btrim(coalesce(d.doc_nr,'')),'') is not null
  union all select d.project_id,'project_document_ref',d.doc_nr from public.project_docs d where d.project_id is not null and nullif(btrim(coalesce(d.doc_nr,'')),'') is not null
  union all select o.project_id,'supplier_offer_ref',o.offer_ref from public.offers o where o.project_id is not null and nullif(btrim(coalesce(o.offer_ref,'')),'') is not null
  union all select k.project_id,'tender_procurement_ref',k.procurement_no from public.kek_tender_watch k where k.project_id is not null and nullif(btrim(coalesce(k.procurement_no,'')),'') is not null
  union all select k.project_id,'tender_publication_ref',k.publication_no from public.kek_tender_watch k where k.project_id is not null and nullif(btrim(coalesce(k.publication_no,'')),'') is not null
),
reference_evidence as (
  select distinct r.project_id,'A'::text,'strong'::text,r.method,99,
         jsonb_build_object('matched_reference',r.raw_ref)
  from reference_rows r cross join source_norm s
  where s.source_count>0 and length(btrim(r.raw_ref))>=6
    and (' '||s.text_norm||' ') like '% '||trim(regexp_replace(lower(r.raw_ref),'[^a-zA-Z0-9]+',' ','g'))||' %'
),
direct_evidence as (
  select s.direct_project_id,
         case when s.direct_authoritative then 'A' else 'B' end,
         case when s.direct_authoritative then 'authoritative' else 'composite' end,
         case when s.source_kind in ('rfq','offer','document') then 'canonical_source_project_id' when s.direct_authoritative then 'verified_existing_email_project_id' else 'existing_email_project_id_non_deterministic' end,
         case when s.source_kind in ('rfq','offer','document') then 100 when s.direct_authoritative then 100 else 88 end,
         jsonb_strip_nulls(jsonb_build_object('source_kind',s.source_kind,'match_method',s.legacy_match_method,'match_confidence',s.legacy_match_confidence))
  from source_norm s where s.direct_project_id is not null
),
same_subject_rows as (
  select e.project_id,count(*)::int hit_count,max(e.sent_at) last_seen
  from public.project_emails e cross join source_norm s join public.projects p on p.id=e.project_id
  where s.source_count>0 and s.counterparty_email is not null and length(s.subject_norm)>=12
    and e.project_id is not null and p.operational_state is distinct from 'closed'
    and e.gmail_message_id is distinct from s.email_id
    and coalesce(e.match_confidence,0)>=95 and lower(coalesce(e.match_method,'')) not like '%suggest%'
    and lower(btrim(coalesce(e.from_email,'')))=s.counterparty_email
    and trim(regexp_replace(regexp_replace(lower(coalesce(e.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),'[^a-z0-9]+',' ','g'))=s.subject_norm
    and (s.sent_at is null or e.sent_at between s.sent_at-interval '180 days' and s.sent_at+interval '30 days')
  group by e.project_id
),
same_subject_evidence as (
  select r.project_id,'B'::text,'composite'::text,'same_counterparty_same_subject_recent_history'::text,82,
         jsonb_build_object('linked_history_messages',r.hit_count,'last_seen_at',r.last_seen)
  from same_subject_rows r
),
rfq_composite_rows as (
  select r.project_id,count(*)::int hit_count,max(coalesce(r.sent_at,r.created_at)) last_seen
  from public.rfq_log r cross join source_norm s join public.projects p on p.id=r.project_id
  where s.source_count>0 and s.counterparty_email is not null and length(s.subject_norm)>=12 and r.project_id is not null
    and p.operational_state is distinct from 'closed'
    and lower(btrim(coalesce(r.supplier_email,'')))=s.counterparty_email
    and trim(regexp_replace(regexp_replace(lower(coalesce(r.subject,'')),'^((re|aw|fw|fwd)\s*:\s*)+','','g'),'[^a-z0-9]+',' ','g'))=s.subject_norm
    and (s.sent_at is null or coalesce(r.sent_at,r.created_at) between s.sent_at-interval '180 days' and s.sent_at+interval '30 days')
  group by r.project_id
),
rfq_composite_evidence as (
  select r.project_id,'B'::text,'composite'::text,'exact_supplier_plus_rfq_subject_temporal_match'::text,84,
         jsonb_build_object('rfq_records',r.hit_count,'last_seen_at',r.last_seen)
  from rfq_composite_rows r
),
legacy_evidence as (
  select s.legacy_suggested_project_id,'C'::text,'hint'::text,'legacy_suggested_project_id_non_authoritative'::text,
         least(greatest(coalesce(s.legacy_match_confidence,0),1),70),
         jsonb_strip_nulls(jsonb_build_object('match_method',s.legacy_match_method,'legacy_confidence',s.legacy_match_confidence,'authoritative',false))
  from source_norm s where s.legacy_suggested_project_id is not null
),
evidence as (
  select * from explicit_identity_evidence
  union all select * from context_anchor_evidence
  union all select * from thread_anchor_evidence
  union all select * from reference_evidence
  union all select * from direct_evidence
  union all select * from same_subject_evidence
  union all select * from rfq_composite_evidence
  union all select * from legacy_evidence
),
candidates as (
  select e.project_id,p.name project_name,p.client,p.status,p.pipeline_stage,p.operational_state,p.operational_state_at,
         bool_or(e.tier='A') has_tier_a,bool_or(e.tier='B') has_tier_b,
         max(e.score)::int base_score,count(*)::int evidence_count,
         least(100,max(e.score)+least(4,greatest(count(*)-1,0))::int)::int confidence,
         coalesce(jsonb_agg(jsonb_build_object('tier',e.tier,'strength',e.evidence_strength,'method',e.method,'score',e.score,'details',e.details) order by case e.tier when 'A' then 3 when 'B' then 2 else 1 end desc,e.score desc),'[]'::jsonb) evidence
  from evidence e join public.projects p on p.id=e.project_id
  group by e.project_id,p.name,p.client,p.status,p.pipeline_stage,p.operational_state,p.operational_state_at
),
ranked as (
  select c.*,row_number() over(order by has_tier_a desc,has_tier_b desc,confidence desc,evidence_count desc,project_name) rn,
         lead(confidence) over(order by has_tier_a desc,has_tier_b desc,confidence desc,evidence_count desc,project_name) next_confidence
  from candidates c
),
counts as (
  select count(*)::int candidate_count,count(*) filter(where has_tier_a)::int tier_a_project_count,count(*) filter(where has_tier_b)::int tier_b_project_count from candidates
),
decision as (
  select case
    when s.source_count=0 then 'unresolved'
    when c.tier_a_project_count>1 then 'ambiguous'
    when c.tier_a_project_count=1 then 'resolved'
    when r.has_tier_b and r.confidence>=75 and (r.next_confidence is null or r.confidence-r.next_confidence>=10) then 'strong_suggestion'
    when c.candidate_count>1 and r.next_confidence is not null and r.confidence-r.next_confidence<10 then 'ambiguous'
    else 'unresolved' end resolution_status,
    case
      when c.tier_a_project_count=1 then (select project_id from ranked where has_tier_a order by confidence desc,evidence_count desc limit 1)
      when c.tier_a_project_count=0 and r.has_tier_b and r.confidence>=75 and (r.next_confidence is null or r.confidence-r.next_confidence>=10) then r.project_id
      else null end recommended_project_id,
    case
      when c.tier_a_project_count=1 then (select confidence from ranked where has_tier_a order by confidence desc,evidence_count desc limit 1)
      when c.tier_a_project_count=0 and r.has_tier_b and r.confidence>=75 and (r.next_confidence is null or r.confidence-r.next_confidence>=10) then r.confidence
      else 0 end confidence
  from source_norm s cross join counts c left join ranked r on r.rn=1
),
conflict_rows as (
  select jsonb_build_object('type','multiple_tier_a_projects','severity','blocking','project_count',c.tier_a_project_count) item from counts c where c.tier_a_project_count>1
  union all select jsonb_build_object('type','thread_has_multiple_project_anchors','severity','blocking','project_count',t.project_count) from thread_stats t where t.project_count>1
  union all select jsonb_build_object('type','source_reference_matches_multiple_project_records','severity','blocking','project_count',s.direct_project_count) from source_norm s where s.direct_project_count>1
  union all select jsonb_build_object('type','legacy_suggestion_conflicts_with_tier_a','severity','informational','legacy_project_id',s.legacy_suggested_project_id,'resolved_project_id',d.recommended_project_id)
    from source_norm s cross join decision d where s.legacy_suggested_project_id is not null and d.resolution_status='resolved' and s.legacy_suggested_project_id is distinct from d.recommended_project_id
  union all select jsonb_build_object('type','future_timestamp_anomaly','severity','blocking','sent_at',s.sent_at) from source_norm s where s.sent_at>now()+interval '1 day'
),
conflicts as (select coalesce(jsonb_agg(item),'[]'::jsonb) value from conflict_rows),
identity_partner as (
  select count(distinct pc.partner_id)::int partner_count,min(pc.partner_id::text)::uuid partner_id
  from source_norm s join public.partner_contacts pc on lower(btrim(coalesce(pc.email,'')))=s.counterparty_email or lower(btrim(coalesce(pc.email_alt,'')))=s.counterparty_email
  join public.partners p on p.id=pc.partner_id and p.stage='active'
  where s.counterparty_email is not null
),
identity_context as (
  select case when ip.partner_count=1 then jsonb_strip_nulls(jsonb_build_object('identity_status','canonical_partner_contact','partner_id',ip.partner_id,'partner_name',p.name,'relation',p.relation,'business_type',p.business_type,'project_identity_allowed',false))
              when cm.contact_id is not null then jsonb_strip_nulls(jsonb_build_object('identity_status','canonical_contact','contact_id',cm.contact_id,'person',cm.person,'company',cm.company,'kind',cm.kind,'role',cm.role,'project_identity_allowed',false))
              when s.counterparty_email is not null then jsonb_build_object('identity_status','unresolved_external','email',s.counterparty_email,'project_identity_allowed',false)
              else null end value
  from source_norm s cross join identity_partner ip
  left join public.partners p on p.id=ip.partner_id and ip.partner_count=1
  left join public.pppp_contact_master_v1 cm on lower(btrim(coalesce(cm.email,'')))=s.counterparty_email
  limit 1
),
alternatives as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object('project_id',r.project_id,'project_name',r.project_name,'client',r.client,'confidence',r.confidence,'has_tier_a',r.has_tier_a,'has_tier_b',r.has_tier_b,'evidence_count',r.evidence_count,'status',r.status,'pipeline_stage',r.pipeline_stage,'operational_state',r.operational_state,'evidence',r.evidence)) order by r.rn),'[]'::jsonb) value
  from ranked r where r.rn<=(select lim from params)
),
recommended as (
  select r.* from ranked r join decision d on d.recommended_project_id=r.project_id limit 1
)
select jsonb_strip_nulls(jsonb_build_object(
  'project_resolution_version',2,
  'read_only',true,
  'generated_at',now(),
  'source',jsonb_strip_nulls(jsonb_build_object('source_type',(select stype from params),'source_ref',(select sref from params),'source_kind',s.source_kind,'source_found',s.source_count>0,'source_record_count',s.source_count,'gmail_message_id',s.email_id,'gmail_thread_id',s.thread_id,'subject',left(s.subject,600),'counterparty_email',s.counterparty_email,'sent_at',s.sent_at)),
  'resolution_status',d.resolution_status,
  'recommended_project_id',d.recommended_project_id,
  'recommended_project_name',r.project_name,
  'confidence',d.confidence,
  'assignment_allowed',false,
  'future_auto_link_eligible',(d.resolution_status='resolved' and (select value from conflicts)='[]'::jsonb),
  'review_required',(d.resolution_status<>'resolved'),
  'assignment_recommendation',case when d.resolution_status='resolved' then 'deterministic_candidate_read_only_no_assignment' when d.resolution_status='strong_suggestion' then 'human_review_required_before_any_link' when d.resolution_status='ambiguous' then 'do_not_assign_resolve_conflict' else 'do_not_assign_insufficient_evidence' end,
  'recommended_project_state',case when r.project_id is not null then jsonb_strip_nulls(jsonb_build_object('status',r.status,'pipeline_stage',r.pipeline_stage,'operational_state',r.operational_state,'operational_state_at',r.operational_state_at)) end,
  'evidence',coalesce(r.evidence,'[]'::jsonb),
  'conflicts',(select value from conflicts),
  'alternative_candidates',(select value from alternatives),
  'identity_context',(select value from identity_context),
  'identity_is_context_only',true,
  'legacy_suggestion_authoritative',false,
  'policy',jsonb_build_object(
    'tier_a_required_for_resolved',true,
    'tier_b_is_suggestion_only',true,
    'tier_c_never_assigns_project',true,
    'company_contact_or_domain_alone_never_assigns_project',true,
    'legacy_suggested_project_id_is_hint_only',true,
    'closed_project_requires_explicit_thread_or_project_specific_strong_evidence',true,
    'closed_project_company_history_fallback_disabled',true,
    'multiple_strong_projects_are_ambiguous',true,
    'future_timestamp_guard_enabled',true,
    'project_state_is_never_mutated',true,
    'rejection_never_closes_project',true,
    'protected_human_gates_preserved',true
  )
))
from source_norm s cross join decision d left join recommended r on true;
$function$;

revoke all on function public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer) to postgres,service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_business_inbox_project_resolution_v1(
  p_days integer default 30,
  p_limit integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
with params as (
  select greatest(1,least(coalesce(p_days,30),90)) days,
         greatest(1,least(coalesce(p_limit,25),50)) lim
),
base as (
  select public.pppp_chatgpt_business_inbox_v2((select days from params),(select lim from params)) j
),
expanded as (
  select x.ord,x.item,
         public.pppp_chatgpt_project_resolution_v2('email',x.item->>'gmail_message_id','{}'::jsonb,5) resolution
  from base b cross join lateral jsonb_array_elements(coalesce(b.j->'items','[]'::jsonb)) with ordinality x(item,ord)
),
items as (
  select coalesce(jsonb_agg(e.item||jsonb_build_object('project_resolution',e.resolution) order by e.ord),'[]'::jsonb) value from expanded e
),
stats as (
  select count(*)::int returned,
         count(*) filter(where resolution->>'resolution_status'='resolved')::int resolved,
         count(*) filter(where resolution->>'resolution_status'='strong_suggestion')::int strong_suggestion,
         count(*) filter(where resolution->>'resolution_status'='ambiguous')::int ambiguous,
         count(*) filter(where resolution->>'resolution_status'='unresolved')::int unresolved
  from expanded
)
select jsonb_build_object(
  'business_inbox_project_resolution_version',1,'read_only',true,'generated_at',now(),
  'days',(select days from params),
  'policy',jsonb_build_object('business_inbox_behavior_unchanged',true,'resolver_is_enrichment_only',true,'bounded_item_limit',50,'project_assignment_allowed',false,'no_task_creation',true,'no_email_send',true,'protected_human_gates_preserved',true),
  'stats',to_jsonb(s),'items',(select value from items)
) from stats s;
$function$;

revoke all on function public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer) from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer) to postgres,service_role,supabase_read_only_user;

create or replace function public.pppp_chatgpt_bridge_manifest_v1()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public
as $function$
  select jsonb_build_object(
    'bridge_version','chatgpt-command-v12',
    'purpose','Account-level PPPP bridge for live reads plus controlled approved writes. Project Resolution v2 adds read-only, auditable evidence fusion for mapping emails, conversations, RFQs, offers, documents and event payloads to project candidates without changing project assignments. New projects, canonical supplier-offer registrations, and explicitly approved project dispositions from ChatGPT travel through the command sheet and trusted bridge worker because the ChatGPT database connector is read-only.',
    'read_functions',jsonb_build_array(
      'public.pppp_chatgpt_search_projects_v1(text,integer)',
      'public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer)',
      'public.pppp_chatgpt_priority_actions_v1(integer)',
      'public.pppp_chatgpt_command_status_v1(text,integer)',
      'public.pppp_chatgpt_entity_intelligence_v3(text,integer)',
      'public.pppp_chatgpt_entity_integrity_v2(text,integer)',
      'public.pppp_chatgpt_business_inbox_v2(integer,integer)',
      'public.pppp_chatgpt_next_action_intelligence_v1(integer,integer)',
      'public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer)',
      'public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer)',
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
      'cilit projekt i përket emaili/RFQ/oferta/dokumenti','Use public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer). Tier A may resolve; Tier B only suggests; Tier C is context only. assignment_allowed is false in this read-only phase.',
      'kontrollo inbox me project resolution','Use public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer). This enriches the bounded Business Inbox output without changing Business Inbox behavior or project assignments.',
      'pyet për email/komunikim të palidhur','Use public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer), then neutral identity resolution and raw email evidence as needed. Identity alone never assigns a project.',
      'regjistroje në PPPP','Resolve an existing project and append one approved controlled command, then verify status.',
      'krijo projekt në PPPP','Append one approved create_project command to the command sheet with a unique stable command_id, then verify the returned project_id after bridge processing.',
      'shto task në PPPP','Append an approved task command for the resolved project.',
      'regjistro ofertë furnitori në PPPP','Append one approved supplier_offer command for an existing project. Registration does not select or commit to the supplier.',
      'mbylle projektin / no bid','After explicit human approval, append one project_disposition command with disposition=no_bid, then verify the project is mbyllur/closed and has no active priority tasks.',
      'a u regjistrua?','Check public.pppp_chatgpt_command_status_v1 for the command_id.'
    ),
    'global_instruction','Whenever the user mentions PPPP or says “regjistroje në PPPP”, call public.pppp_chatgpt_bridge_manifest_v1() first and follow the returned protocol. For project identity questions, use public.pppp_chatgpt_project_resolution_v2(text,text,jsonb,integer): only Tier A may produce resolved, Tier B remains a review-only suggestion, Tier C/identity/company/domain/legacy suggested_project_id never assigns a project, multiple strong candidates are ambiguous, and closed projects require explicit/thread/project-specific strong evidence. For company/person/supplier/manufacturer questions, prefer public.pppp_chatgpt_entity_intelligence_v3(text,integer). For inbox/attention questions, prefer public.pppp_chatgpt_next_action_intelligence_v1(integer,integer) and use public.pppp_chatgpt_business_inbox_project_resolution_v1(integer,integer) when project mapping is needed. Missing reply evidence alone never means action required. Rejection/outcome evidence is review-only and never auto-closes a project. Preserve all protected human approval gates.'
  );
$function$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public,anon,authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to postgres,service_role,supabase_read_only_user;
