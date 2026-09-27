-- TED opportunity contact/action fix.
-- Keeps browser writes read-only for pppp_opportunity_actions and exposes a narrow server-side RPC.
-- No Gmail draft is created and no email is sent by these functions.

create or replace function public.pppp_ted_contact_candidates_v1(p_tender_watch_id uuid)
returns table(email text,full_name text,job_title text,functional_role text,source_type text,source_url text,confidence_score integer,payload jsonb)
language sql stable security invoker
set search_path to 'pg_catalog','public'
as $$
with t as (
  select id,title,source_url,detail_url,payload
  from public.kek_tender_watch
  where id=p_tender_watch_id
    and upper(coalesce(payload->>'source',''))='TED'
    and coalesce(payload->>'notice_phase','')='award'
    and nullif(btrim(payload->'winner'->>'name'),'') is not null
),
w as (
  select t.*,t.payload->'winner' winner,
         public.pppp_opportunity_company_key_v1(t.payload->'winner'->>'name') winner_key
  from t
),
direct_raw as (
  select lower(btrim(x.email)) email,null::text full_name,null::text job_title,
         case when lower(x.email)~'(procurement|purchasing|einkauf|tender|vergabe)' then 'procurement'
              when lower(x.email)~'(technical|technik|engineering)' then 'technical'
              when lower(x.email)~'(project|projekt)' then 'project'
              when lower(x.email)~'(sales|commercial|verkauf)' then 'commercial'
              else 'general' end functional_role,
         'ted_winner_organization'::text source_type,
         coalesce(w.detail_url,w.source_url) source_url,95 confidence_score,
         jsonb_build_object('company_attribution','ted_winner_organization','recipient_company_name',w.winner->>'name','recipient_company_identifier',w.winner->>'identifier','identity_version',w.winner->>'identity_version') payload
  from w
  cross join lateral (
    select w.winner->>'email' email
    union
    select jsonb_array_elements_text(coalesce(w.winner->'emails','[]'::jsonb))
  ) x
  where coalesce(w.winner->>'identity_version','')='ted-winner-canonical-v2'
    and nullif(btrim(w.winner->>'identifier'),'') is not null
    and coalesce(x.email,'')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
),
orgs as (
  select w.*,o.org,count(*) over(partition by w.id) org_count,
         public.pppp_opportunity_company_key_v1(o.org->>'name') org_key,
         lower(regexp_replace(coalesce(nullif(o.org->>'domain',''),nullif(o.org->>'official_website','')),'^https?://(www\.)?|/.*$','','gi')) org_domain
  from w
  cross join lateral jsonb_array_elements(coalesce(w.winner->'contact_enrichment'->'organizations','[]'::jsonb)) o(org)
),
enriched_raw as (
  select lower(btrim(c.contact->>'value')) email,
         nullif(coalesce(c.contact->>'name',c.contact->>'full_name',c.contact->>'person_name'),'') full_name,
         nullif(coalesce(c.contact->>'job_title',c.contact->>'title'),'') job_title,
         case when lower(coalesce(c.contact->>'purpose',''))~'(procurement|purchasing|einkauf|tender|vergabe|sourcing)' then 'procurement'
              when lower(coalesce(c.contact->>'purpose',''))~'(technical|technik|engineering)' then 'technical'
              when lower(coalesce(c.contact->>'purpose',''))~'(project|projekt)' then 'project'
              when lower(coalesce(c.contact->>'purpose',''))~'(production|fertigung)' then 'production'
              when lower(coalesce(c.contact->>'purpose',''))~'(sales|commercial|verkauf)' then 'commercial'
              when lower(coalesce(c.contact->>'purpose',''))~'(management|director|geschäfts|geschaefts)' then 'management'
              else 'general' end functional_role,
         coalesce(nullif(c.contact->>'source_type',''),'ted_contact_enrichment') source_type,
         coalesce(nullif(c.contact->>'source_url',''),o.detail_url,o.source_url) source_url,
         greatest(0,least(100,case when coalesce(c.contact->>'score','')~'^[0-9]+(\.[0-9]+)?$' then round((c.contact->>'score')::numeric)::int
                                    when lower(coalesce(c.contact->>'confidence',''))='high' then 90
                                    when lower(coalesce(c.contact->>'confidence',''))='medium' then 80 else 75 end)) confidence_score,
         jsonb_build_object('company_attribution','contact_enrichment','recipient_company_name',o.winner->>'name','organization_name',o.org->>'name','organization_domain',nullif(o.org_domain,'')) payload
  from orgs o
  cross join lateral jsonb_array_elements(coalesce(o.org->'contacts','[]'::jsonb)) c(contact)
  where coalesce(c.contact->>'type','')='email'
    and coalesce(c.contact->>'value','')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and lower(coalesce(c.contact->>'draft_eligible','true'))<>'false'
    and (lower(coalesce(c.contact->>'confidence','')) in ('high','medium')
         or (coalesce(c.contact->>'score','')~'^[0-9]+(\.[0-9]+)?$' and (c.contact->>'score')::numeric>=80))
    and (o.org_key=o.winner_key or o.org_count=1)
    and (nullif(o.org_domain,'') is null
         or split_part(lower(c.contact->>'value'),'@',2)=o.org_domain
         or split_part(lower(c.contact->>'value'),'@',2) like '%.'||o.org_domain)
),
outreach_raw as (
  select lower(btrim(o.contact_email)) email,null::text full_name,null::text job_title,
         case when lower(o.contact_email)~'(procurement|purchasing|einkauf|tender|vergabe|sourcing)' then 'procurement'
              when lower(o.contact_email)~'(technical|technik|engineering)' then 'technical'
              when lower(o.contact_email)~'(project|projekt)' then 'project'
              when lower(o.contact_email)~'(sales|commercial|verkauf)' then 'commercial'
              else 'general' end functional_role,
         coalesce(nullif(o.source,''),'outreach_contacts') source_type,
         coalesce(w.detail_url,w.source_url) source_url,85 confidence_score,
         jsonb_build_object('company_attribution','outreach_contacts','recipient_company_name',w.winner->>'name') payload
  from w
  join public.outreach_contacts o
    on public.pppp_opportunity_company_key_v1(o.company_name)=w.winner_key
  where coalesce(o.contact_email,'')~*'^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
    and coalesce(o.bounced,false)=false
),
allc as (
  select * from direct_raw
  union all select * from enriched_raw
  union all select * from outreach_raw
)
select distinct on(email) email,full_name,job_title,functional_role,source_type,source_url,confidence_score,payload
from allc
where nullif(email,'') is not null
order by email,confidence_score desc,source_type;
$$;

revoke all on function public.pppp_ted_contact_candidates_v1(uuid) from public,anon;
grant execute on function public.pppp_ted_contact_candidates_v1(uuid) to authenticated,service_role,postgres;

create or replace function public.pppp_sync_ted_contacts_after_assessment_v1()
returns trigger
language plpgsql security definer
set search_path to 'pg_catalog','public'
as $$
begin
  if new.workflow_track<>'ted_award_outreach' or new.company_profile_id is null then return new; end if;
  insert into public.pppp_opportunity_contacts_v1(
    company_profile_id,tender_watch_id,email,full_name,job_title,functional_role,source_type,source_url,
    verification_status,confidence_score,draft_eligible,last_verified_at,payload,updated_at
  )
  select new.company_profile_id,new.tender_watch_id,c.email,c.full_name,c.job_title,c.functional_role,c.source_type,c.source_url,
         'verified',c.confidence_score,true,now(),c.payload,now()
  from public.pppp_ted_contact_candidates_v1(new.tender_watch_id)c
  on conflict(company_profile_id,email) do update set
    tender_watch_id=excluded.tender_watch_id,
    full_name=coalesce(excluded.full_name,public.pppp_opportunity_contacts_v1.full_name),
    job_title=coalesce(excluded.job_title,public.pppp_opportunity_contacts_v1.job_title),
    functional_role=excluded.functional_role,
    source_type=coalesce(excluded.source_type,public.pppp_opportunity_contacts_v1.source_type),
    source_url=coalesce(excluded.source_url,public.pppp_opportunity_contacts_v1.source_url),
    verification_status=case when public.pppp_opportunity_contacts_v1.verification_status='rejected' then 'rejected' else 'verified' end,
    confidence_score=greatest(public.pppp_opportunity_contacts_v1.confidence_score,excluded.confidence_score),
    draft_eligible=case when public.pppp_opportunity_contacts_v1.do_not_contact then false else true end,
    last_verified_at=now(),
    payload=coalesce(public.pppp_opportunity_contacts_v1.payload,'{}'::jsonb)||excluded.payload,
    updated_at=now();
  return new;
end;
$$;

revoke all on function public.pppp_sync_ted_contacts_after_assessment_v1() from public,anon,authenticated;
drop trigger if exists trg_pppp_sync_ted_contacts_after_assessment_v1 on public.pppp_opportunity_company_assessments_v1;
create trigger trg_pppp_sync_ted_contacts_after_assessment_v1
after insert or update of company_profile_id,tender_watch_id,workflow_track
on public.pppp_opportunity_company_assessments_v1
for each row execute function public.pppp_sync_ted_contacts_after_assessment_v1();

create or replace function public.pppp_ensure_ted_opportunity_action_v1(p_tender_watch_id uuid)
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_t public.kek_tender_watch%rowtype;
  v_company text; v_email text; v_role text; v_route text; v_action_type text; v_action_key text; v_brief text;
  v_action public.pppp_opportunity_actions%rowtype; v_created boolean:=false; v_profile_id uuid; v_contact_count integer:=0;
begin
  select * into v_t from public.kek_tender_watch where id=p_tender_watch_id;
  if not found then raise exception using errcode='22023',message='tender_not_found'; end if;
  if upper(coalesce(v_t.payload->>'source',''))<>'TED' or coalesce(v_t.payload->>'notice_phase','')<>'award'
    then raise exception using errcode='22023',message='ted_award_required'; end if;
  v_company:=nullif(btrim(v_t.payload->'winner'->>'name'),'');
  if v_company is null then raise exception using errcode='22023',message='winner_identity_missing'; end if;

  select c.email into v_email from public.pppp_ted_contact_candidates_v1(p_tender_watch_id)c
  order by c.confidence_score desc,c.email limit 1;
  if v_email is null then raise exception using errcode='22023',message='verified_ted_winner_contact_missing'; end if;

  v_role:=lower(coalesce(nullif(v_t.payload->'winner'->>'company_type',''),nullif(v_t.payload->'winner'->'company_classification'->>'company_type',''),'unknown'));
  if v_role='unknown' and lower(coalesce(v_t.payload->'award_role'->>'type',''))='gc_epc'
     and lower(coalesce(v_t.payload->'award_role'->>'confidence','')) in('medium','high') then v_role:='gc_epc'; end if;
  if v_role='producer' then v_route:='TED_PRODUCER';v_action_type:='producer_capacity_outreach_draft';
  elsif v_role in('trader_consortium','consortium_mixed') then v_route:='TED_CONSORTIUM';v_action_type:='consortium_project_outreach_draft';
  elsif v_role='gc_epc' then v_route:='TED_GC';v_action_type:='gc_project_outreach_draft';
  else v_route:='TED_GENERAL';v_action_type:='general_project_outreach_draft'; end if;

  v_action_key:='TENDER:'||p_tender_watch_id::text||':'||v_action_type;
  v_brief:=v_company||' ka fituar “'||coalesce(v_t.title,'Opportunity')||'”. Përgatit draft neutral dhe profesional për furnizim/prodhim çeliku sipas projektit; vetëm draft, mos e dërgo automatikisht.';

  select * into v_action from public.pppp_opportunity_actions
  where tender_watch_id=p_tender_watch_id and action_type=v_action_type and status='draft_review'
  order by updated_at desc limit 1;

  if found then
    update public.pppp_opportunity_actions set
      target_company=v_company,target_email=coalesce(nullif(target_email,''),v_email),route=v_route,
      subject_hint=coalesce(nullif(subject_hint,''),'Steel fabrication support · '||left(coalesce(v_t.title,'Opportunity'),300)),
      draft_brief=coalesce(nullif(draft_brief,''),v_brief),outreach_engine_version='v2',outreach_motion='awarded_project_gc',
      payload=coalesce(payload,'{}'::jsonb)||jsonb_build_object('company_type',v_role,'project_title',v_t.title,'engine_version','manual-opportunity-action-rpc-v1','human_approval_required',true),
      updated_at=now()
    where id=v_action.id returning * into v_action;
  else
    insert into public.pppp_opportunity_actions(
      tender_watch_id,action_key,action_type,route,status,priority,target_company,target_email,subject_hint,draft_brief,payload,
      outreach_engine_version,outreach_motion,workflow_state,company_fit_score,commercial_timing_score,contact_quality_score,
      message_evidence_score,outreach_readiness_score,contact_tier,personalization_facts,readiness_reasons,pristeel_offer_model
    ) values(
      p_tender_watch_id,v_action_key,v_action_type,v_route,'draft_review','lartë',v_company,v_email,
      'Steel fabrication support · '||left(coalesce(v_t.title,'Opportunity'),300),v_brief,
      jsonb_build_object('company_type',v_role,'project_title',v_t.title,'engine_version','manual-opportunity-action-rpc-v1','human_approval_required',true),
      'v2','awarded_project_gc','strong_company_contact_gap',70,60,70,78,70,'C',jsonb_build_array(v_t.title,v_brief),'[]'::jsonb,'fabricated_steel_package'
    )
    on conflict(action_key) do update set
      target_company=excluded.target_company,
      target_email=coalesce(nullif(public.pppp_opportunity_actions.target_email,''),excluded.target_email),
      route=excluded.route,updated_at=now()
    returning * into v_action;
    v_created:=true;
  end if;

  perform public.pppp_refresh_opportunity_intelligence_v1(1);

  select s.company_profile_id into v_profile_id
  from public.pppp_opportunity_company_assessments_v1 s where s.action_id=v_action.id limit 1;

  if v_profile_id is not null then
    insert into public.pppp_opportunity_contacts_v1(
      company_profile_id,tender_watch_id,email,full_name,job_title,functional_role,source_type,source_url,
      verification_status,confidence_score,draft_eligible,last_verified_at,payload,updated_at
    )
    select v_profile_id,p_tender_watch_id,c.email,c.full_name,c.job_title,c.functional_role,c.source_type,c.source_url,
           'verified',c.confidence_score,true,now(),c.payload,now()
    from public.pppp_ted_contact_candidates_v1(p_tender_watch_id)c
    on conflict(company_profile_id,email) do update set
      tender_watch_id=excluded.tender_watch_id,
      full_name=coalesce(excluded.full_name,public.pppp_opportunity_contacts_v1.full_name),
      job_title=coalesce(excluded.job_title,public.pppp_opportunity_contacts_v1.job_title),
      functional_role=excluded.functional_role,
      source_type=coalesce(excluded.source_type,public.pppp_opportunity_contacts_v1.source_type),
      source_url=coalesce(excluded.source_url,public.pppp_opportunity_contacts_v1.source_url),
      verification_status=case when public.pppp_opportunity_contacts_v1.verification_status='rejected' then 'rejected' else 'verified' end,
      confidence_score=greatest(public.pppp_opportunity_contacts_v1.confidence_score,excluded.confidence_score),
      draft_eligible=case when public.pppp_opportunity_contacts_v1.do_not_contact then false else true end,
      last_verified_at=now(),
      payload=coalesce(public.pppp_opportunity_contacts_v1.payload,'{}'::jsonb)||excluded.payload,
      updated_at=now();

    select count(*) into v_contact_count from public.pppp_opportunity_contacts_v1
    where company_profile_id=v_profile_id and verification_status='verified' and draft_eligible and not do_not_contact;
    if v_contact_count>0 then
      update public.pppp_opportunity_actions set
        workflow_state='ready_for_outreach',
        payload=jsonb_set(coalesce(payload,'{}'::jsonb),'{outreach_readiness_v1}',
          coalesce(payload->'outreach_readiness_v1','{}'::jsonb)||jsonb_build_object('contact_identity_verified',true),true),
        updated_at=now()
      where id=v_action.id;
    end if;
  end if;

  return jsonb_build_object('ok',true,'action_id',v_action.id,'created',v_created,'tender_watch_id',p_tender_watch_id,
    'company',v_company,'contact_email',v_email,'canonical_contact_count',v_contact_count,
    'gmail_drafts_created',0,'emails_sent',0,'human_approval_required',true);
end;
$$;

revoke all on function public.pppp_ensure_ted_opportunity_action_v1(uuid) from public,anon;
grant execute on function public.pppp_ensure_ted_opportunity_action_v1(uuid) to authenticated,service_role,postgres;
