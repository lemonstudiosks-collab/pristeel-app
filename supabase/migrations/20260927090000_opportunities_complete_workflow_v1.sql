begin;

create or replace function public.pppp_opportunity_company_key_v1(p_value text)
returns text language sql immutable set search_path=pg_catalog as $$
  select trim(regexp_replace(lower(translate(coalesce(p_value,''),'ÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝŽŠČĆĐàáâãäåçèéêëìíîïñòóôõöùúûüýžščćđ','AAAAAACEEEEIIIINOOOOOUUUUYZSCCDaaaaaaceeeeiiiinooooouuuuyzsccd')),'[^a-z0-9]+',' ','g'))
$$;

create table if not exists public.pppp_opportunity_company_profiles_v1 (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  legal_name text not null,
  domain text,
  country text,
  company_type text not null default 'unknown',
  business_summary text,
  sectors text[] not null default '{}'::text[],
  products text[] not null default '{}'::text[],
  capabilities text[] not null default '{}'::text[],
  certifications text[] not null default '{}'::text[],
  verification_status text not null default 'research_required' check (verification_status in ('research_required','partial','verified','stale')),
  source_urls jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pppp_opportunity_company_assessments_v1 (
  id uuid primary key default gen_random_uuid(),
  action_id uuid not null unique references public.pppp_opportunity_actions(id) on delete cascade,
  tender_watch_id uuid not null references public.kek_tender_watch(id) on delete cascade,
  company_profile_id uuid not null references public.pppp_opportunity_company_profiles_v1(id) on delete cascade,
  workflow_track text not null check (workflow_track in ('ted_award_outreach','bid_opportunity')),
  company_role text not null default 'unknown',
  tender_summary jsonb not null default '{}'::jsonb,
  company_summary jsonb not null default '{}'::jsonb,
  tender_facts jsonb not null default '[]'::jsonb,
  company_facts jsonb not null default '[]'::jsonb,
  unknowns jsonb not null default '[]'::jsonb,
  source_urls jsonb not null default '[]'::jsonb,
  pristeel_scope text,
  offer_model text not null default 'research_required' check (offer_model in ('fabricated_steel_package','external_production_capacity','material_supply','future_supplier_qualification','consortium_local_partner','research_required','no_outreach')),
  secondary_offer_model text,
  timing_classification text,
  decision_state text not null default 'research_required' check (decision_state in ('research_required','contact_research','ready_for_review','approved','no_outreach','closed')),
  decision_reasons jsonb not null default '[]'::jsonb,
  draft_eligible boolean not null default false,
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pppp_opportunity_contacts_v1 (
  id uuid primary key default gen_random_uuid(),
  company_profile_id uuid not null references public.pppp_opportunity_company_profiles_v1(id) on delete cascade,
  tender_watch_id uuid references public.kek_tender_watch(id) on delete cascade,
  email text not null,
  full_name text,
  job_title text,
  functional_role text not null default 'general' check (functional_role in ('procurement','sourcing','project','technical','production','commercial','management','general')),
  source_type text,
  source_url text,
  verification_status text not null default 'review' check (verification_status in ('review','verified','rejected','stale')),
  confidence_score integer not null default 0 check (confidence_score between 0 and 100),
  draft_eligible boolean not null default false,
  do_not_contact boolean not null default false,
  last_verified_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_profile_id,email),
  check(email=lower(email))
);

alter table public.pppp_opportunity_outreach_registry_v1
  add column if not exists contact_id uuid references public.pppp_opportunity_contacts_v1(id) on delete set null,
  add column if not exists recipient_role text,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists replied_at timestamptz,
  add column if not exists out_of_office_until timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists do_not_contact_at timestamptz,
  add column if not exists closed_at timestamptz;

alter table public.pppp_opportunity_outreach_registry_v1 drop constraint if exists pppp_opportunity_outreach_registry_v1_status_chk;
alter table public.pppp_opportunity_outreach_registry_v1 add constraint pppp_opportunity_outreach_registry_v1_status_chk
  check(status in ('draft_pending','draft_created','draft_missing','sent','replied','bounced','stopped','closed','retired','error'));

create table if not exists public.pppp_opportunity_followup_policy_v1 (
  id text primary key default 'global',
  first_wait_days integer not null default 5 check(first_wait_days between 1 and 60),
  second_wait_days integer not null default 8 check(second_wait_days between 1 and 90),
  max_followups integer not null default 2 check(max_followups between 0 and 5),
  company_cooldown_days integer not null default 7 check(company_cooldown_days between 1 and 90),
  updated_at timestamptz not null default now()
);
insert into public.pppp_opportunity_followup_policy_v1(id) values('global') on conflict(id) do nothing;

create table if not exists public.pppp_opportunity_followups_v1 (
  id uuid primary key default gen_random_uuid(),
  registry_id uuid not null references public.pppp_opportunity_outreach_registry_v1(id) on delete cascade,
  action_id uuid not null references public.pppp_opportunity_actions(id) on delete cascade,
  company_profile_id uuid references public.pppp_opportunity_company_profiles_v1(id) on delete set null,
  contact_id uuid references public.pppp_opportunity_contacts_v1(id) on delete set null,
  stage integer not null check(stage between 1 and 5),
  status text not null default 'candidate' check(status in ('candidate','approved','draft_created','sent','snoozed','superseded','stopped','error')),
  due_at timestamptz not null,
  preview_subject text,
  preview_body text,
  gmail_draft_id text,
  gmail_message_id text,
  gmail_thread_id text,
  suppression_reason text,
  approved_by uuid,
  approved_at timestamptz,
  draft_created_at timestamptz,
  sent_at timestamptz,
  human_send_required boolean not null default true check(human_send_required=true),
  gmail_auto_send boolean not null default false check(gmail_auto_send=false),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(registry_id,stage)
);

create index if not exists pppp_opp_profile_domain_idx on public.pppp_opportunity_company_profiles_v1(domain) where domain is not null;
create index if not exists pppp_opp_assessment_tender_idx on public.pppp_opportunity_company_assessments_v1(tender_watch_id,decision_state);
create index if not exists pppp_opp_contact_tender_idx on public.pppp_opportunity_contacts_v1(tender_watch_id,draft_eligible,confidence_score desc);
create index if not exists pppp_opp_followup_due_idx on public.pppp_opportunity_followups_v1(status,due_at);

create or replace function public.pppp_refresh_opportunity_intelligence_v1(p_limit integer default 600)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_profiles int:=0; v_assessments int:=0; v_contacts int:=0; v_actions int:=0;
begin
  with src as (
    select a.*,t.title,t.authority,t.procurement_no,t.publication_no,t.estimated_value,t.currency,t.deadline,t.published_date,t.source_url,t.detail_url,t.payload as tender_payload,
      coalesce(nullif(a.target_company,''),nullif(t.payload->'winner'->>'name',''),t.authority) legal_name,
      public.pppp_opportunity_company_key_v1(coalesce(nullif(a.target_company,''),nullif(t.payload->'winner'->>'name',''),t.authority)) normalized_name,
      lower(coalesce(nullif(a.payload->'outreach_readiness_v1'->>'verified_company_domain',''),nullif(t.payload->'winner'->'contact_enrichment'->'organizations'->0->>'domain',''),regexp_replace(coalesce(t.payload->'winner'->>'website',''),'^https?://(www\.)?|/.*$','','gi'))) domain,
      lower(coalesce(nullif(t.payload->'winner'->>'company_type',''),nullif(t.payload->'winner'->'company_classification'->>'company_type',''),'unknown')) company_type
    from public.pppp_opportunity_actions a join public.kek_tender_watch t on t.id=a.tender_watch_id
    where a.status='draft_review' order by a.updated_at desc limit least(2000,greatest(1,p_limit))
  )
  insert into public.pppp_opportunity_company_profiles_v1(normalized_name,legal_name,domain,country,company_type,business_summary,verification_status,source_urls,evidence,last_verified_at,updated_at)
  select normalized_name,max(legal_name),max(nullif(domain,'')),max(coalesce(tender_payload->'winner'->>'country',tender_payload->>'country')),max(company_type),
    max(coalesce(nullif(tender_payload->'winner'->'contact_enrichment'->'organizations'->0->>'business_summary',''),nullif(tender_payload->'winner'->'contact_enrichment'->'organizations'->0->>'description',''),nullif(tender_payload->'winner'->'company_classification'->>'summary',''),legal_name||' · '||company_type)),
    case when max(nullif(domain,'')) is not null and max(company_type)<>'unknown' then 'verified' when max(nullif(domain,'')) is not null then 'partial' else 'research_required' end,
    jsonb_path_query_array(jsonb_build_array(max(source_url),max(detail_url),max(tender_payload->'winner'->>'website')),'$[*] ? (@ != null && @ != "")'),
    coalesce((array_agg(tender_payload->'winner'->'company_classification'->'evidence') filter (where tender_payload->'winner'->'company_classification'->'evidence' is not null))[1],'[]'::jsonb),now(),now()
  from src where normalized_name<>'' group by normalized_name
  on conflict(normalized_name) do update set legal_name=excluded.legal_name,domain=coalesce(excluded.domain,public.pppp_opportunity_company_profiles_v1.domain),country=coalesce(excluded.country,public.pppp_opportunity_company_profiles_v1.country),company_type=case when excluded.company_type<>'unknown' then excluded.company_type else public.pppp_opportunity_company_profiles_v1.company_type end,business_summary=coalesce(excluded.business_summary,public.pppp_opportunity_company_profiles_v1.business_summary),verification_status=excluded.verification_status,source_urls=excluded.source_urls,evidence=excluded.evidence,last_verified_at=now(),updated_at=now();
  get diagnostics v_profiles=row_count;

  with src as (
    select a.*,t.title,t.authority,t.procurement_no,t.publication_no,t.estimated_value,t.currency,t.deadline,t.published_date,t.source_url,t.detail_url,t.fpp_description,t.payload as tender_payload,
      p.id profile_id,p.business_summary,p.domain,p.company_type,
      upper(coalesce(t.payload->>'source','KRPP')) source_kind,
      coalesce(nullif(t.payload->>'scope',''),nullif(t.payload->>'description',''),nullif(t.fpp_description,''),t.title) scope_text
    from public.pppp_opportunity_actions a join public.kek_tender_watch t on t.id=a.tender_watch_id
    join public.pppp_opportunity_company_profiles_v1 p on p.normalized_name=public.pppp_opportunity_company_key_v1(coalesce(nullif(a.target_company,''),nullif(t.payload->'winner'->>'name',''),t.authority))
    where a.status='draft_review' order by a.updated_at desc limit least(2000,greatest(1,p_limit))
  ), shaped as (
    select *,case
      when source_kind='TED' and coalesce(tender_payload->>'notice_phase','')='award' then 'ted_award_outreach'
      else 'bid_opportunity' end workflow_track,
    case
      when source_kind<>'TED' or coalesce(tender_payload->>'notice_phase','')<>'award' then 'research_required'
      when coalesce(timing_classification,'')='future_supplier_qualification' then 'future_supplier_qualification'
      when upper(route)='DIRECT_RAW_MATERIAL' then 'material_supply'
      when upper(route)='TED_PRODUCER' then 'external_production_capacity'
      when upper(route)='TED_CONSORTIUM' then 'consortium_local_partner'
      when upper(route) in ('TED_GC','TED_GENERAL') then 'fabricated_steel_package'
      else 'research_required' end selected_model
    from src
  )
  insert into public.pppp_opportunity_company_assessments_v1(action_id,tender_watch_id,company_profile_id,workflow_track,company_role,tender_summary,company_summary,tender_facts,company_facts,unknowns,source_urls,pristeel_scope,offer_model,secondary_offer_model,timing_classification,decision_state,decision_reasons,draft_eligible,confidence_score,assessed_at,updated_at)
  select id,tender_watch_id,profile_id,workflow_track,company_type,
    jsonb_strip_nulls(jsonb_build_object('title',title,'reference',coalesce(publication_no,procurement_no),'authority',authority,'estimated_value',estimated_value,'currency',currency,'deadline',deadline,'published_date',published_date,'scope',scope_text,'source',source_kind)),
    jsonb_strip_nulls(jsonb_build_object('legal_name',target_company,'domain',domain,'company_type',company_type,'business_summary',business_summary)),
    jsonb_path_query_array(jsonb_build_array(jsonb_build_object('type','project','value',title,'status','confirmed','source_url',coalesce(detail_url,source_url)),jsonb_build_object('type','authority','value',authority,'status','confirmed','source_url',coalesce(detail_url,source_url)),jsonb_build_object('type','scope','value',scope_text,'status',case when scope_text=title then 'inferred' else 'confirmed' end,'source_url',coalesce(detail_url,source_url)),case when estimated_value is not null then jsonb_build_object('type','value','value',estimated_value||' '||coalesce(currency,''),'status','confirmed','source_url',coalesce(detail_url,source_url)) end),'$[*] ? (@ != null)'),
    jsonb_path_query_array(jsonb_build_array(jsonb_build_object('type','company_role','value',company_type,'status',case when company_type='unknown' then 'unknown' else 'confirmed' end),jsonb_build_object('type','business_profile','value',business_summary,'status',case when business_summary is null then 'unknown' else 'confirmed' end),case when domain is not null then jsonb_build_object('type','official_domain','value',domain,'status','confirmed') end),'$[*] ? (@ != null)'),
    jsonb_path_query_array(jsonb_build_array(case when company_type='unknown' then 'company_role' end,case when domain is null then 'official_domain' end,case when scope_text=title then 'detailed_scope' end),'$[*] ? (@ != null)'),
    jsonb_path_query_array(jsonb_build_array(source_url,detail_url,tender_payload->'winner'->>'website'),'$[*] ? (@ != null && @ != "")'),scope_text,selected_model,secondary_pristeel_offer_model,timing_classification,
    case when workflow_track='bid_opportunity' then 'research_required' when selected_model='research_required' then 'research_required' when target_email is null then 'contact_research' else 'ready_for_review' end,
    jsonb_build_array('model selected from source, winner role, timing and scope'),
    workflow_track='ted_award_outreach' and selected_model not in ('research_required','no_outreach') and business_summary is not null and title is not null,
    least(100,(case when company_type<>'unknown' then 25 else 0 end)+(case when domain is not null then 20 else 0 end)+(case when scope_text<>title then 25 else 10 end)+(case when target_email is not null then 20 else 0 end)+10),now(),now()
  from shaped
  on conflict(action_id) do update set company_profile_id=excluded.company_profile_id,workflow_track=excluded.workflow_track,company_role=excluded.company_role,tender_summary=excluded.tender_summary,company_summary=excluded.company_summary,tender_facts=excluded.tender_facts,company_facts=excluded.company_facts,unknowns=excluded.unknowns,source_urls=excluded.source_urls,pristeel_scope=excluded.pristeel_scope,offer_model=excluded.offer_model,secondary_offer_model=excluded.secondary_offer_model,timing_classification=excluded.timing_classification,decision_state=excluded.decision_state,decision_reasons=excluded.decision_reasons,draft_eligible=excluded.draft_eligible,confidence_score=excluded.confidence_score,assessed_at=now(),updated_at=now();
  get diagnostics v_assessments=row_count;

  insert into public.pppp_opportunity_contacts_v1(company_profile_id,tender_watch_id,email,full_name,job_title,functional_role,source_type,source_url,verification_status,confidence_score,draft_eligible,last_verified_at,updated_at)
  select distinct on (p.id,lower(trim(o.contact_email))) p.id,o.tender_watch_id,lower(trim(o.contact_email)),null,null,
    case when lower(o.contact_email)~'(procurement|purchasing|einkauf|tender|vergabe)' then 'procurement' when lower(o.contact_email)~'(technical|technik|engineering)' then 'technical' when lower(o.contact_email)~'(project|projekt)' then 'project' when lower(o.contact_email)~'(sales|commercial|verkauf)' then 'commercial' else 'general' end,
    coalesce(o.source,'outreach_contacts'),null,'verified',case when lower(o.contact_email)~'(procurement|purchasing|einkauf|tender|vergabe)' then 90 else 70 end,true,now(),now()
  from public.outreach_contacts o join public.pppp_opportunity_company_profiles_v1 p on p.normalized_name=public.pppp_opportunity_company_key_v1(o.company_name)
  where coalesce(o.contact_email,'')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$' and coalesce(o.bounced,false)=false
  order by p.id,lower(trim(o.contact_email)),o.updated_at desc nulls last
  on conflict(company_profile_id,email) do update set tender_watch_id=excluded.tender_watch_id,verification_status='verified',confidence_score=greatest(public.pppp_opportunity_contacts_v1.confidence_score,excluded.confidence_score),draft_eligible=true,last_verified_at=now(),updated_at=now();
  get diagnostics v_contacts=row_count;

  update public.pppp_opportunity_actions a set
    pristeel_offer_model=s.offer_model,
    personalization_facts=jsonb_path_query_array(jsonb_build_array(s.tender_summary->>'title',s.tender_summary->>'scope',s.company_summary->>'business_summary'),'$[*] ? (@ != null && @ != "")'),
    payload=jsonb_set(coalesce(a.payload,'{}'::jsonb),'{outreach_readiness_v1}',jsonb_strip_nulls(jsonb_build_object('version','opportunity-intelligence-v1','project_fact',s.tender_summary->>'title','scope_evidence',s.tender_summary->>'scope','company_fact',s.company_summary->>'business_summary','verified_company_domain',s.company_summary->>'domain','winner_role_verified',s.company_role<>'unknown','pristeel_scope_fit',s.offer_model not in ('research_required','no_outreach'),'contact_identity_verified',exists(select 1 from public.pppp_opportunity_contacts_v1 c where c.company_profile_id=s.company_profile_id and c.draft_eligible),'timing_fit',coalesce(s.timing_classification,'')<>'too_late','assessment_id',s.id,'company_profile_id',s.company_profile_id)),true),
    workflow_state=case when s.workflow_track='bid_opportunity' then 'research_required' when not s.draft_eligible then 'research_required' when exists(select 1 from public.pppp_opportunity_contacts_v1 c where c.company_profile_id=s.company_profile_id and c.draft_eligible) then 'ready_for_outreach' else 'strong_company_contact_gap' end,
    updated_at=now()
  from public.pppp_opportunity_company_assessments_v1 s where s.action_id=a.id and a.status='draft_review';
  get diagnostics v_actions=row_count;
  return jsonb_build_object('ok',true,'profiles',v_profiles,'assessments',v_assessments,'contacts',v_contacts,'actions_refreshed',v_actions,'gmail_drafts_created',0,'emails_sent',0);
end $$;

create or replace function public.pppp_refresh_opportunity_followup_candidates_v1()
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_added int:=0; v_superseded int:=0;
begin
  update public.pppp_opportunity_followups_v1 f set status='superseded',suppression_reason='reply_or_contact_stop',updated_at=now()
  from public.pppp_opportunity_outreach_registry_v1 r
  where f.registry_id=r.id and f.status in ('candidate','approved','snoozed') and (r.replied_at is not null or r.bounced_at is not null or r.do_not_contact_at is not null or r.status in ('replied','bounced','stopped','closed') or exists(select 1 from public.pppp_opportunity_outreach_registry_v1 x where x.action_id=r.action_id and x.id<>r.id and x.replied_at is not null));
  get diagnostics v_superseded=row_count;
  insert into public.pppp_opportunity_followups_v1(registry_id,action_id,company_profile_id,contact_id,stage,status,due_at,payload)
  select r.id,r.action_id,a.company_profile_id,r.contact_id,1,'candidate',r.sent_at+(p.first_wait_days||' days')::interval,jsonb_build_object('reason','sent_without_reply','recipient_email',r.recipient_email,'recipient_role',r.recipient_role,'offer_model',a.offer_model)
  from public.pppp_opportunity_outreach_registry_v1 r
  join public.pppp_opportunity_company_assessments_v1 a on a.action_id=r.action_id
  cross join public.pppp_opportunity_followup_policy_v1 p
  where p.id='global' and r.status='sent' and r.sent_at is not null and r.sent_at+(p.first_wait_days||' days')::interval<=now()
    and r.replied_at is null and r.bounced_at is null and r.do_not_contact_at is null
    and not exists(select 1 from public.pppp_opportunity_outreach_registry_v1 x where x.action_id=r.action_id and x.replied_at is not null)
    and not exists(select 1 from public.pppp_opportunity_followups_v1 f where f.registry_id=r.id and f.stage=1)
  on conflict(registry_id,stage) do nothing;
  get diagnostics v_added=row_count;
  return jsonb_build_object('ok',true,'candidates_added',v_added,'superseded',v_superseded,'gmail_drafts_created',0,'emails_sent',0);
end $$;

create or replace function public.pppp_opportunity_company_workspace_v1(p_action_id uuid)
returns jsonb language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object('action',to_jsonb(a),'tender',s.tender_summary,'assessment',to_jsonb(s),'company',to_jsonb(p),'contacts',coalesce((select jsonb_agg(to_jsonb(c) order by c.confidence_score desc,c.email) from public.pppp_opportunity_contacts_v1 c where c.company_profile_id=p.id),'[]'::jsonb),'outreach',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.pppp_opportunity_outreach_registry_v1 r where r.action_id=a.id),'[]'::jsonb),'followups',coalesce((select jsonb_agg(to_jsonb(f) order by f.due_at) from public.pppp_opportunity_followups_v1 f where f.action_id=a.id),'[]'::jsonb))
  from public.pppp_opportunity_actions a join public.pppp_opportunity_company_assessments_v1 s on s.action_id=a.id join public.pppp_opportunity_company_profiles_v1 p on p.id=s.company_profile_id where a.id=p_action_id
$$;

alter table public.pppp_opportunity_company_profiles_v1 enable row level security;
alter table public.pppp_opportunity_company_assessments_v1 enable row level security;
alter table public.pppp_opportunity_contacts_v1 enable row level security;
alter table public.pppp_opportunity_followup_policy_v1 enable row level security;
alter table public.pppp_opportunity_followups_v1 enable row level security;
create policy pppp_opp_profiles_read on public.pppp_opportunity_company_profiles_v1 for select to authenticated using ((select auth.uid()) is not null);
create policy pppp_opp_assessments_read on public.pppp_opportunity_company_assessments_v1 for select to authenticated using ((select auth.uid()) is not null);
create policy pppp_opp_contacts_read on public.pppp_opportunity_contacts_v1 for select to authenticated using ((select auth.uid()) is not null);
create policy pppp_opp_followup_policy_read on public.pppp_opportunity_followup_policy_v1 for select to authenticated using ((select auth.uid()) is not null);
create policy pppp_opp_followups_read on public.pppp_opportunity_followups_v1 for select to authenticated using ((select auth.uid()) is not null);
create policy pppp_opp_followups_control on public.pppp_opportunity_followups_v1 for update to authenticated using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null and human_send_required=true and gmail_auto_send=false);
grant select on public.pppp_opportunity_company_profiles_v1,public.pppp_opportunity_company_assessments_v1,public.pppp_opportunity_contacts_v1,public.pppp_opportunity_followup_policy_v1,public.pppp_opportunity_followups_v1 to authenticated;
grant update(status,due_at,approved_by,approved_at,suppression_reason,updated_at) on public.pppp_opportunity_followups_v1 to authenticated;
grant all on public.pppp_opportunity_company_profiles_v1,public.pppp_opportunity_company_assessments_v1,public.pppp_opportunity_contacts_v1,public.pppp_opportunity_followup_policy_v1,public.pppp_opportunity_followups_v1 to service_role;
grant execute on function public.pppp_opportunity_company_workspace_v1(uuid) to authenticated,service_role;
grant execute on function public.pppp_refresh_opportunity_intelligence_v1(integer),public.pppp_refresh_opportunity_followup_candidates_v1() to service_role;
revoke execute on function public.pppp_refresh_opportunity_intelligence_v1(integer),public.pppp_refresh_opportunity_followup_candidates_v1() from public,anon,authenticated;

-- One server-side batch backfill. It creates no Gmail drafts and sends no email.
select public.pppp_refresh_opportunity_intelligence_v1(1000);

commit;
