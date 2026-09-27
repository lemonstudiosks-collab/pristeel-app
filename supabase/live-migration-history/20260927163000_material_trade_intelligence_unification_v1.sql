-- Material Trade intelligence unification v1
-- Production project: awqfpnzqwfjrjefoktgd
-- Applied 2026-09-27. Keeps Material Trade separate from TED/Mundesite and preserves human send approval.

alter table public.pppp_dach_steel_targets_v1
  add column if not exists intelligence_profile jsonb not null default '{}'::jsonb,
  add column if not exists intelligence_refreshed_at timestamptz;

create or replace function public.pppp_dach_steel_contact_grade_v1(
  p_email text,
  p_person text default null,
  p_role text default null,
  p_company_domain text default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $$
declare
  v_email text := lower(nullif(btrim(p_email),''));
  v_person text := nullif(btrim(p_person),'');
  v_role text := lower(coalesce(nullif(btrim(p_role),''),''));
  v_company_domain text := lower(coalesce(nullif(btrim(p_company_domain),''),''));
  v_domain text;
  v_local text;
  v_named boolean := false;
  v_proc boolean := false;
  v_project boolean := false;
  v_rolebox boolean := false;
  v_general boolean := false;
  v_tier text := 'F';
  v_score integer := 0;
  v_kind text := 'blocked';
begin
  if v_email is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return jsonb_build_object('email',v_email,'tier','F','score',0,'outreach_allowed',false,'kind','blocked','reason','invalid_email');
  end if;
  v_domain := split_part(v_email,'@',2);
  v_local := split_part(v_email,'@',1);
  if v_domain in ('gmail.com','googlemail.com','hotmail.com','outlook.com','live.com','yahoo.com','icloud.com','aol.com','example.com','example.org','example.net') then
    return jsonb_build_object('email',v_email,'tier','F','score',0,'outreach_allowed',false,'kind','blocked','reason','personal_or_test_domain');
  end if;
  if v_local in ('jobs','careers','career','hr','humanresources','recruiting','privacy','gdpr','webmaster','press','presse','media','marketing','newsletter','noreply','no-reply','donotreply','dpo','security','abuse') then
    return jsonb_build_object('email',v_email,'tier','F','score',0,'outreach_allowed',false,'kind','blocked','reason','unsafe_recipient_localpart');
  end if;
  if v_company_domain <> '' and v_domain <> v_company_domain then
    return jsonb_build_object('email',v_email,'tier','F','score',0,'outreach_allowed',false,'kind','blocked','reason','recipient_domain_mismatch');
  end if;
  v_named := v_person is not null or (v_local ~ '^[a-z][a-z0-9]{1,}[._-][a-z][a-z0-9]{1,}$' and v_local !~ '(info|office|contact|kontakt|hello|mail|admin|sekretariat|zentrale|enquir|sales|verkauf|einkauf|procurement|purchas|sourcing|material|supply|rfq|quote|quotation)');
  v_proc := v_role ~ '(einkauf|procurement|purchas|sourcing|beschaffung|materialwirtschaft|buyer|achats|acquisti|nabav)' or v_local ~ '(einkauf|procurement|purchas|sourcing|beschaffung|material|buyer|achat|acquisti|nabav)';
  v_project := v_role ~ '(projekt|project|technical|technik|commercial|kaufm|construction|bauleit|geschäfts|geschaefts|director|owner|manager|leiter)';
  v_rolebox := v_local ~ '(sales|verkauf|anfrage|rfq|quote|quotation|tender|vergabe|steel|stahl|supply|material|procurement|purchas|einkauf|sourcing|enquir)';
  v_general := v_local in ('info','office','contact','kontakt','hello','mail','admin','sekretariat','zentrale','enquiries','enquiry','general');
  if v_proc and v_named then
    v_tier := 'A'; v_score := 95; v_kind := 'procurement_direct';
  elsif v_project and v_named then
    v_tier := 'B'; v_score := 82; v_kind := 'project_or_management_direct';
  elsif v_proc or v_rolebox then
    v_tier := 'C'; v_score := 70; v_kind := 'role_mailbox';
  elsif v_named then
    v_tier := 'D'; v_score := 60; v_kind := 'direct_public';
  elsif v_company_domain <> '' and v_domain = v_company_domain then
    v_tier := 'D'; v_score := 55; v_kind := case when v_general then 'official_company_fallback' else 'official_domain_contact' end;
  else
    v_tier := 'E'; v_score := 35; v_kind := 'unverified_public_contact';
  end if;
  return jsonb_build_object('email',v_email,'person',v_person,'role',nullif(p_role,''),'tier',v_tier,'score',v_score,'outreach_allowed',(v_score>=50),'kind',v_kind,'reason',null);
end;
$$;

create or replace function public.pppp_dach_steel_contact_intelligence_v1(p_target_id uuid)
returns jsonb
language sql
stable
set search_path to 'public','pg_temp'
as $$
with target as (
  select * from public.pppp_dach_steel_targets_v1 where id=p_target_id
),
resolved as (
  select t.*, x.r,
         lower(coalesce(nullif(btrim(t.company_domain),''),nullif(x.r->>'company_domain',''))) as resolved_domain
  from target t
  cross join lateral (select public.pppp_dach_steel_contact_resolution_v1(t.id) as r) x
),
raw_candidates as (
  select r.id,r.company_name,r.resolved_domain,c.item as candidate,c.ord
  from resolved r
  cross join lateral jsonb_array_elements(coalesce(r.r->'candidates','[]'::jsonb)) with ordinality c(item,ord)
),
with_top as (
  select * from raw_candidates
  union all
  select r.id,r.company_name,r.resolved_domain,
         jsonb_build_object('email',r.r->>'email','person',r.r->>'person','role',r.r->>'role','source',r.r->>'source','source_url',r.r->>'source_url','quality',r.r->>'quality'),0
  from resolved r
  where nullif(r.r->>'email','') is not null
    and not exists (select 1 from raw_candidates x where lower(x.candidate->>'email')=lower(r.r->>'email'))
),
graded as (
  select w.*, public.pppp_dach_steel_contact_grade_v1(w.candidate->>'email',w.candidate->>'person',w.candidate->>'role',w.resolved_domain) as grade
  from with_top w
),
valid as (
  select * from graded where coalesce((grade->>'outreach_allowed')::boolean,false)
),
best as (
  select * from valid
  order by (grade->>'score')::int desc,case when candidate->>'source'='contact_master' then 0 else 1 end,ord,lower(candidate->>'email')
  limit 1
)
select jsonb_build_object(
  'target_id',r.id,'company_name',r.company_name,'company_domain',nullif(r.resolved_domain,''),
  'status',case when b.candidate is not null then 'found' else 'missing' end,
  'selected',case when b.candidate is null then null else b.candidate || jsonb_build_object('tier',b.grade->>'tier','contact_quality_score',(b.grade->>'score')::int,'outreach_allowed',(b.grade->>'outreach_allowed')::boolean,'contact_kind',b.grade->>'kind') end,
  'candidates',coalesce((select jsonb_agg(g.candidate || jsonb_build_object('tier',g.grade->>'tier','contact_quality_score',(g.grade->>'score')::int,'outreach_allowed',(g.grade->>'outreach_allowed')::boolean,'contact_kind',g.grade->>'kind','block_reason',g.grade->>'reason') order by (g.grade->>'score')::int desc,g.ord,lower(g.candidate->>'email')) from graded g),'[]'::jsonb)
)
from resolved r
left join best b on true;
$$;

create or replace function public.pppp_dach_steel_target_intelligence_v1(p_target_id uuid,p_contact jsonb default null)
returns jsonb
language plpgsql
stable
set search_path to 'public','pg_temp'
as $$
declare
  t public.pppp_dach_steel_targets_v1%rowtype;
  ci jsonb; selected jsonb; grade jsonb;
  facts jsonb := '[]'::jsonb;
  reasons text[] := '{}'::text[]; gaps text[] := '{}'::text[];
  company_fit integer; timing integer; timing_class text; message_evidence integer;
  contact_score integer := 0; contact_tier text := 'F'; readiness integer; workflow text;
  evidence_count integer := 0; fact_count integer := 0; freshness_days integer := null; supplier_signal boolean := false;
begin
  select * into t from public.pppp_dach_steel_targets_v1 where id=p_target_id;
  if not found then raise exception using errcode='23503',message='dach_target_not_found'; end if;
  ci := public.pppp_dach_steel_contact_intelligence_v1(t.id);
  selected := ci->'selected';
  if p_contact is not null and jsonb_typeof(p_contact)='object' and nullif(btrim(p_contact->>'email'),'') is not null then
    grade := public.pppp_dach_steel_contact_grade_v1(p_contact->>'email',p_contact->>'person',p_contact->>'role',coalesce(nullif(t.company_domain,''),ci->>'company_domain'));
    if coalesce((grade->>'outreach_allowed')::boolean,false) then
      selected := jsonb_build_object('email',lower(p_contact->>'email'),'person',nullif(btrim(p_contact->>'person'),''),'role',nullif(btrim(p_contact->>'role'),''),'source',coalesce(nullif(p_contact->>'source',''),'selected_contact'),'source_url',p_contact->>'source_url','quality',coalesce(nullif(p_contact->>'quality',''),grade->>'kind'),'tier',grade->>'tier','contact_quality_score',(grade->>'score')::int,'outreach_allowed',true,'contact_kind',grade->>'kind');
    else selected := null; end if;
  end if;
  with candidates as (
    select ord0::int as ord,nullif(btrim(x),'') as fact
    from unnest(array[
      case when jsonb_typeof(t.personalization_facts)='array' then t.personalization_facts->>0 end,
      case when jsonb_typeof(t.personalization_facts)='array' then t.personalization_facts->>1 end,
      case when jsonb_typeof(t.personalization_facts)='array' then t.personalization_facts->>2 end,
      case when jsonb_typeof(t.personalization_facts)='array' then t.personalization_facts->>3 end,
      t.project_title,t.why_now,t.steel_scope
    ]) with ordinality u(x,ord0)
    where nullif(btrim(x),'') is not null
    union all
    select 100+e.ord::int,nullif(btrim(coalesce(e.item->>'claim',e.item->>'title',e.item->>'label')),'')
    from jsonb_array_elements(coalesce(t.evidence,'[]'::jsonb)) with ordinality e(item,ord)
  ), cleaned as (
    select fact,min(ord) ord
    from candidates
    where fact is not null and fact !~* '[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}'
      and lower(fact) !~ '(prepare (a )?draft|draft only|do not send|mos e dergo|përgatit draft|pergatit draft)'
    group by fact order by min(ord) limit 4
  )
  select coalesce(jsonb_agg(fact order by ord),'[]'::jsonb),count(*) into facts,fact_count from cleaned;
  evidence_count := case when jsonb_typeof(t.evidence)='array' then jsonb_array_length(t.evidence) else 0 end;
  company_fit := case upper(coalesce(t.score_band,'')) when 'A1' then 92 when 'A2' then 82 when 'B1' then 72 when 'B2' then 58 else 50 end;
  if lower(coalesce(t.procurement_timing,'')) ~ '(now|current|immediate|active|0.?3)' then timing:=85;timing_class:='active_procurement';
  elsif t.award_date is not null and t.award_date>=current_date-120 then timing:=65;timing_class:='post_award_window';
  elsif nullif(btrim(t.project_title),'') is not null then timing:=50;timing_class:='future_supplier_qualification';
  else timing:=35;timing_class:='unknown'; end if;
  message_evidence := case when fact_count>=2 then 78 when evidence_count>=2 then 70 else 35 end;
  if selected is not null then contact_score:=coalesce((selected->>'contact_quality_score')::int,0);contact_tier:=coalesce(nullif(selected->>'tier',''),'F'); end if;
  if company_fit<65 then reasons:=array_append(reasons,'company_fit_below_65'); end if;
  if contact_score<50 then reasons:=array_append(reasons,'contact_quality_below_50'); end if;
  if message_evidence<60 then reasons:=array_append(reasons,'message_evidence_below_60'); end if;
  if fact_count<2 then reasons:=array_append(reasons,'fewer_than_two_specific_facts'); end if;
  if timing<35 then reasons:=array_append(reasons,'commercial_timing_below_35'); end if;
  readiness:=round(company_fit*.32+timing*.24+contact_score*.28+message_evidence*.16);
  workflow:=case when company_fit>=65 and contact_score<50 then 'strong_company_contact_gap' when cardinality(reasons)=0 then 'ready_for_outreach' when company_fit<65 then 'disqualified' else 'research_required' end;
  supplier_signal:=lower(coalesce(t.evidence::text,'')) ~ '(supplier|supplied by|source from|purchased from|procure.*from|vendor|lieferant|bezogen von|bezugsquelle)';
  if t.estimated_tonnes is null then gaps:=array_append(gaps,'capacity_or_tonnage'); end if;
  if nullif(btrim(t.procurement_timing),'') is null then gaps:=array_append(gaps,'procurement_timing'); end if;
  if selected is null or nullif(btrim(selected->>'person'),'') is null then gaps:=array_append(gaps,'named_contact'); end if;
  if selected is null or coalesce(selected->>'contact_kind','') not in ('procurement_direct','role_mailbox') then gaps:=array_append(gaps,'procurement_contact'); end if;
  if not supplier_signal then gaps:=array_append(gaps,'supplier_or_sourcing_evidence'); end if;
  if t.last_verified_at is null then gaps:=array_append(gaps,'verification_date'); else freshness_days:=greatest(0,(current_date-t.last_verified_at::date)); if freshness_days>90 then gaps:=array_append(gaps,'stale_verification'); end if; end if;
  return jsonb_build_object('version','material-trade-intelligence-v1','target_id',t.id,'company_fit_score',company_fit,'commercial_timing_score',timing,'timing_classification',timing_class,'message_evidence_score',message_evidence,'contact_quality_score',contact_score,'contact_tier',contact_tier,'outreach_readiness_score',readiness,'workflow_state',workflow,'readiness_reasons',to_jsonb(reasons),'personalization_facts',facts,'contact',selected,'contact_intelligence',ci,'intelligence_gaps',to_jsonb(gaps),'evidence_count',evidence_count,'specific_fact_count',fact_count,'evidence_freshness_days',freshness_days,'supplier_sourcing_evidence_found',supplier_signal,'recommended_offer_model','material_supply','outreach_allowed',(workflow='ready_for_outreach'),'calculated_at',now());
end;
$$;

create or replace function public.pppp_dach_steel_refresh_intelligence_v1(p_target_id uuid,p_contact jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
declare intel jsonb; c jsonb; current_outreach text;
begin
  intel:=public.pppp_dach_steel_target_intelligence_v1(p_target_id,p_contact);
  c:=intel->'contact';
  select outreach_status into current_outreach from public.pppp_dach_steel_targets_v1 where id=p_target_id;
  update public.pppp_dach_steel_targets_v1
  set canonical_contact_email=nullif(c->>'email',''),canonical_contact_name=nullif(c->>'person',''),canonical_contact_role=nullif(c->>'role',''),
      contact_tier=coalesce(nullif(intel->>'contact_tier',''),'F'),contact_quality_score=coalesce((intel->>'contact_quality_score')::int,0),
      company_fit_score=(intel->>'company_fit_score')::int,commercial_timing_score=(intel->>'commercial_timing_score')::int,
      timing_classification=intel->>'timing_classification',message_evidence_score=(intel->>'message_evidence_score')::int,
      outreach_readiness_score=(intel->>'outreach_readiness_score')::int,workflow_state=intel->>'workflow_state',
      personalization_facts=coalesce(intel->'personalization_facts','[]'::jsonb),readiness_reasons=coalesce(intel->'readiness_reasons','[]'::jsonb),
      contact_status=case when c is not null and nullif(c->>'email','') is not null then 'found' else 'missing' end,
      outreach_status=case when current_outreach in ('queued','sent','replied','suppressed') then current_outreach when intel->>'workflow_state'='ready_for_outreach' then 'ready' else 'not_ready' end,
      pristeel_offer_model=coalesce(nullif(pristeel_offer_model,''),intel->>'recommended_offer_model'),
      intelligence_profile=intel,intelligence_refreshed_at=now(),updated_at=now()
  where id=p_target_id;
  return intel;
end;
$$;

create or replace function public.pppp_dach_steel_refresh_intelligence_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $$
begin
  perform public.pppp_dach_steel_refresh_intelligence_v1(new.id,null);
  return new;
end;
$$;

drop trigger if exists pppp_dach_steel_refresh_intelligence_trg on public.pppp_dach_steel_targets_v1;
create trigger pppp_dach_steel_refresh_intelligence_trg
after insert or update of source_url,company_name,company_domain,company_website,country,buyer_type,score_band,why_now,project_title,project_reference,award_date,procurement_timing,steel_scope,products,estimated_tonnes,material_scope,evidence,last_verified_at
on public.pppp_dach_steel_targets_v1
for each row execute function public.pppp_dach_steel_refresh_intelligence_trigger_v1();

create or replace view public.pppp_dach_steel_home_summary_v1 as
with active as (
  select t.*,(nullif(t.canonical_contact_email,'') is not null and coalesce(t.contact_quality_score,0)>=50) as has_resolved_contact
  from public.pppp_dach_steel_targets_v1 t
  where t.target_status not in ('closed','rejected','project_promoted') and t.project_id is null and (t.source_key like 'eu:%' or t.source_key like 'mt:%')
), hot as (
  select a.id,a.company_name,a.project_title,a.quote_readiness,a.why_now,a.estimated_tonnes,a.procurement_timing
  from active a
  where a.workflow_state='ready_for_outreach' and a.outreach_status in ('not_ready','ready','queued')
  order by case a.score_band when 'A1' then 1 when 'A2' then 2 when 'B1' then 3 when 'B2' then 4 else 5 end,a.outreach_readiness_score desc nulls last,case a.quote_readiness when 'M3' then 1 when 'M2' then 2 when 'M1' then 3 else 4 end,a.next_action_due,a.updated_at desc
  limit 1
), outbound as (
  select count(*) filter (where q.sent_at is not null or q.status='sent')::integer as sent,count(*) filter (where q.replied_at is not null or q.status='replied')::integer as replies
  from public.pppp_outbound_queue_v1 q join active a on a.id=q.source_record_id where q.source='DACH_STEEL_BUYER'
)
select
  (select count(*)::integer from active) targets,
  (select count(*)::integer from active where score_band='A1') a1_targets,
  (select count(*)::integer from active where quote_readiness='M3') quote_ready,
  (select count(*)::integer from active where not has_resolved_contact) needs_contact,
  (select count(*)::integer from active where workflow_state='ready_for_outreach' and outreach_status in ('not_ready','ready','queued')) ready_for_outreach,
  coalesce((select sent from outbound),0) sent,coalesce((select replies from outbound),0) replies,
  coalesce((select round(sum(estimated_tonnes),3) from active where estimated_tonnes is not null),0::numeric) identified_tonnes,
  (select id from hot) hot_target_id,(select company_name from hot) hot_company_name,(select project_title from hot) hot_project_title,
  (select quote_readiness from hot) hot_quote_readiness,(select why_now from hot) hot_why_now,(select estimated_tonnes from hot) hot_estimated_tonnes,
  (select procurement_timing from hot) hot_procurement_timing,now() calculated_at;

grant execute on function public.pppp_dach_steel_contact_grade_v1(text,text,text,text) to authenticated,service_role;
grant execute on function public.pppp_dach_steel_contact_intelligence_v1(uuid) to authenticated,service_role;
grant execute on function public.pppp_dach_steel_target_intelligence_v1(uuid,jsonb) to authenticated,service_role;
grant execute on function public.pppp_dach_steel_refresh_intelligence_v1(uuid,jsonb) to authenticated,service_role;
