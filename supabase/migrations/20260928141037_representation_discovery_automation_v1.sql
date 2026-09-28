-- Isolated discovery inbox for Representation market-entry and JV/consortium work.
-- Discovery never creates Projects, Partners, Contacts, Suppliers, drafts or email.

create table if not exists public.pppp_representation_discovery_runs_v1 (
  id uuid primary key default gen_random_uuid(),
  lane text not null check (lane in ('market_entry','consortium_opportunity')),
  run_date date not null default current_date,
  status text not null default 'running' check (status in ('running','succeeded','failed','skipped')),
  discovered_count integer not null default 0 check (discovered_count >= 0),
  new_count integer not null default 0 check (new_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'),
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  unique(lane,run_date)
);

create table if not exists public.pppp_representation_discovery_candidates_v1 (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references public.pppp_representation_discovery_runs_v1(id) on delete set null,
  lane text not null check (lane in ('market_entry','consortium_opportunity')),
  candidate_kind text not null check (candidate_kind in ('company','opportunity')),
  source_key text not null check (length(btrim(source_key)) between 3 and 700),
  source_name text not null,
  source_url text check (source_url is null or source_url ~* '^https?://'),
  title text not null,
  company_name text,
  company_domain text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  tender_watch_id uuid references public.kek_tender_watch(id) on delete set null,
  opportunity_source_key text,
  score integer not null default 0 check (score between 0 and 100),
  reasons text[] not null default '{}'::text[],
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence)='object'),
  routing_conflicts text[] not null default '{}'::text[],
  status text not null default 'new' check (status in ('new','review','accepted','rejected','duplicate')),
  target_id uuid references public.pppp_representation_targets_v1(id) on delete set null,
  opportunity_id uuid references public.pppp_representation_opportunities_v1(id) on delete set null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  review_note text,
  unique(lane,source_key)
);

create index if not exists pppp_representation_discovery_status_idx
  on public.pppp_representation_discovery_candidates_v1(lane,status,score desc,last_seen_at desc);
create index if not exists pppp_representation_discovery_domain_idx
  on public.pppp_representation_discovery_candidates_v1(company_domain)
  where company_domain is not null;
create index if not exists pppp_representation_discovery_tender_idx
  on public.pppp_representation_discovery_candidates_v1(tender_watch_id)
  where tender_watch_id is not null;

alter table public.pppp_representation_discovery_runs_v1 enable row level security;
alter table public.pppp_representation_discovery_candidates_v1 enable row level security;
revoke all on public.pppp_representation_discovery_runs_v1 from public,anon,authenticated;
revoke all on public.pppp_representation_discovery_candidates_v1 from public,anon,authenticated;
grant select on public.pppp_representation_discovery_runs_v1 to authenticated;
grant select on public.pppp_representation_discovery_candidates_v1 to authenticated;
grant update(company_name,company_domain,country_code,routing_conflicts,status,target_id,opportunity_id,reviewed_at,reviewed_by,review_note)
  on public.pppp_representation_discovery_candidates_v1 to authenticated;
grant all on public.pppp_representation_discovery_runs_v1 to service_role,postgres;
grant all on public.pppp_representation_discovery_candidates_v1 to service_role,postgres;

drop policy if exists pppp_representation_discovery_runs_read on public.pppp_representation_discovery_runs_v1;
create policy pppp_representation_discovery_runs_read
  on public.pppp_representation_discovery_runs_v1 for select to authenticated using (true);
drop policy if exists pppp_representation_discovery_candidates_read on public.pppp_representation_discovery_candidates_v1;
create policy pppp_representation_discovery_candidates_read
  on public.pppp_representation_discovery_candidates_v1 for select to authenticated using (true);
drop policy if exists pppp_representation_discovery_candidates_review on public.pppp_representation_discovery_candidates_v1;
create policy pppp_representation_discovery_candidates_review
  on public.pppp_representation_discovery_candidates_v1 for update to authenticated
  using ((select public.can_write()))
  with check ((select public.can_write()) and status in ('new','review','accepted','rejected','duplicate'));

create or replace function public.pppp_representation_discovery_conflicts_v1(p_domain text)
returns text[]
language plpgsql stable security invoker set search_path='pg_catalog','public'
as $$
declare v_domain text:=public.pppp_normalize_company_domain_v1(p_domain); v_conflicts text[]:='{}'::text[];
begin
  if v_domain is null then return array['missing_official_domain']; end if;
  if exists(select 1 from public.pppp_representation_targets_v1 where archived_at is null and company_domain_normalized=v_domain) then
    v_conflicts:=array_append(v_conflicts,'representations');
  end if;
  if exists(select 1 from public.pppp_eu_direct_targets_v1 where archived_at is null and company_domain_normalized=v_domain) then
    v_conflicts:=array_append(v_conflicts,'eu_direct');
  end if;
  if exists(select 1 from public.pppp_dach_steel_targets_v1 where target_status not in ('closed','rejected','archived','project_promoted') and public.pppp_normalize_company_domain_v1(coalesce(company_domain,company_website))=v_domain) then
    v_conflicts:=array_append(v_conflicts,'material_trade');
  end if;
  if exists(select 1 from public.pppp_opportunity_company_profiles_v1 where public.pppp_normalize_company_domain_v1(domain)=v_domain) then
    v_conflicts:=array_append(v_conflicts,'opportunities');
  end if;
  if exists(select 1 from public.pppp_gc_prospects_v1 where public.pppp_normalize_company_domain_v1(coalesce(company_domain,website_url))=v_domain and status not in ('rejected','archived')) then
    v_conflicts:=array_append(v_conflicts,'gc_prospects');
  end if;
  return v_conflicts;
end;
$$;
revoke all on function public.pppp_representation_discovery_conflicts_v1(text) from public,anon;
grant execute on function public.pppp_representation_discovery_conflicts_v1(text) to authenticated,service_role,postgres;

create or replace function public.pppp_register_representation_market_signal_v1(p_payload jsonb,p_run_id uuid default null)
returns jsonb
language plpgsql security invoker set search_path='pg_catalog','public'
as $$
declare
  v_source_key text:=nullif(btrim(p_payload->>'source_key'),'');
  v_title text:=nullif(btrim(p_payload->>'title'),'');
  v_domain text:=public.pppp_normalize_company_domain_v1(p_payload->>'company_domain');
  v_conflicts text[]; v_id uuid; v_status text;
begin
  if jsonb_typeof(p_payload)<>'object' then raise exception using errcode='22023',message='payload_object_required'; end if;
  if v_source_key is null or v_title is null then raise exception using errcode='22023',message='source_key_and_title_required'; end if;
  if coalesce(p_payload->>'country_code','US') !~ '^[A-Z]{2}$' then raise exception using errcode='22023',message='country_code_iso2_required'; end if;
  v_conflicts:=public.pppp_representation_discovery_conflicts_v1(v_domain);
  v_status:=case when cardinality(v_conflicts)>0 then 'review' else 'new' end;
  insert into public.pppp_representation_discovery_candidates_v1(
    run_id,lane,candidate_kind,source_key,source_name,source_url,title,company_name,company_domain,country_code,
    score,reasons,evidence,routing_conflicts,status,last_seen_at
  ) values(
    p_run_id,'market_entry','company',v_source_key,coalesce(nullif(p_payload->>'source_name',''),'public_market_signal'),
    nullif(p_payload->>'source_url',''),v_title,nullif(p_payload->>'company_name',''),v_domain,
    upper(coalesce(nullif(p_payload->>'country_code',''),'US')),
    least(100,greatest(0,coalesce((p_payload->>'score')::integer,0))),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'reasons','[]'::jsonb))),'{}'::text[]),
    coalesce(p_payload->'evidence','{}'::jsonb),v_conflicts,v_status,now()
  )
  on conflict(lane,source_key) do update set
    run_id=coalesce(excluded.run_id,public.pppp_representation_discovery_candidates_v1.run_id),
    source_url=coalesce(excluded.source_url,public.pppp_representation_discovery_candidates_v1.source_url),
    title=excluded.title,
    company_name=coalesce(excluded.company_name,public.pppp_representation_discovery_candidates_v1.company_name),
    company_domain=coalesce(excluded.company_domain,public.pppp_representation_discovery_candidates_v1.company_domain),
    score=greatest(public.pppp_representation_discovery_candidates_v1.score,excluded.score),
    reasons=excluded.reasons,evidence=excluded.evidence,routing_conflicts=excluded.routing_conflicts,last_seen_at=now(),
    status=case when public.pppp_representation_discovery_candidates_v1.status in ('accepted','rejected') then public.pppp_representation_discovery_candidates_v1.status else excluded.status end
  returning id,status into v_id,v_status;
  return jsonb_build_object('ok',true,'candidate_id',v_id,'status',v_status,'routing_conflicts',v_conflicts,
    'target_created',false,'project_created',false,'partner_created',false,'contact_created',false,'outbound_created',false,'email_sent',false);
end;
$$;
revoke all on function public.pppp_register_representation_market_signal_v1(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.pppp_register_representation_market_signal_v1(jsonb,uuid) to service_role,postgres;

create or replace function public.pppp_register_representation_market_signals_v1(p_payloads jsonb)
returns jsonb
language plpgsql security invoker set search_path='pg_catalog','public'
as $$
declare p jsonb; v_count integer:=0; v_result jsonb;
begin
  if jsonb_typeof(p_payloads)<>'array' then raise exception using errcode='22023',message='payload_array_required'; end if;
  if jsonb_array_length(p_payloads)>25 then raise exception using errcode='22023',message='maximum_25_signals_per_batch'; end if;
  for p in select value from jsonb_array_elements(p_payloads) loop
    v_result:=public.pppp_register_representation_market_signal_v1(p,null);
    v_count:=v_count+1;
  end loop;
  return jsonb_build_object('ok',true,'processed',v_count,'active_records_created',false,
    'projects_created',false,'partners_created',false,'contacts_created',false,'outbound_created',false);
end;
$$;
revoke all on function public.pppp_register_representation_market_signals_v1(jsonb) from public,anon,authenticated;
grant execute on function public.pppp_register_representation_market_signals_v1(jsonb) to service_role,postgres;

create or replace function public.pppp_refresh_representation_opportunity_discovery_v1(p_limit integer default 25)
returns jsonb
language plpgsql security invoker set search_path='pg_catalog','public'
as $$
declare v_run uuid; v_seen integer:=0; v_new integer:=0; v_dup integer:=0; r record; v_status text;
begin
  p_limit:=least(50,greatest(1,coalesce(p_limit,25)));
  insert into public.pppp_representation_discovery_runs_v1(lane,run_date,status,started_at,finished_at,error_message)
  values('consortium_opportunity',current_date,'running',now(),null,null)
  on conflict(lane,run_date) do update set status='running',started_at=now(),finished_at=null,error_message=null
  returning id into v_run;

  for r in
    select t.*,
      upper(coalesce(nullif(t.payload->>'source',''),split_part(t.source_key,':',1))) source_name,
      greatest(coalesce(t.relevance_score,0),case when coalesce(t.estimated_value,0)>=5000000 then 85 when coalesce(t.estimated_value,0)>=1000000 then 75 else 60 end) discovery_score
    from public.kek_tender_watch t
    where upper(coalesce(nullif(t.payload->>'source',''),split_part(t.source_key,':',1))) in
      ('KRPP','MCA_KOSOVO','KCF','RCF','EBRD_ECEPP','WORLD_BANK','UNGM','UNDP_KOSOVO','EU_OFFICE_KOSOVO')
      and coalesce(nullif(t.payload->>'notice_phase',''),'opportunity')='opportunity'
      and (t.deadline is null or t.deadline>=current_date)
      and (coalesce(t.estimated_value,0)>=500000 or coalesce(t.relevance_score,0)>=70 or nullif(t.payload->>'program_reference','') is not null)
      and lower(concat_ws(' ',t.title,t.category,t.contract_type,t.fpp_description,t.payload::text)) ~
        '(construction|infrastructure|energy|electric|substation|transmission|rail|road|terminal|steel|industrial|digital|telecom|scanner|toll|water|waste|building|works)'
      and lower(concat_ws(' ',t.title,t.document_type,t.contract_type)) !~
        '(individual consultant|consultancy only|audit service|training service)'
    order by discovery_score desc,t.deadline asc nulls last,t.updated_at desc
    limit p_limit
  loop
    v_seen:=v_seen+1;
    if exists(select 1 from public.pppp_representation_opportunities_v1 o where o.archived_at is null and o.source_key=r.source_key) then
      v_status:='duplicate';v_dup:=v_dup+1;
    else v_status:='new'; end if;
    insert into public.pppp_representation_discovery_candidates_v1(
      run_id,lane,candidate_kind,source_key,source_name,source_url,title,tender_watch_id,opportunity_source_key,
      score,reasons,evidence,status,last_seen_at
    ) values(
      v_run,'consortium_opportunity','opportunity','opp:'||r.source_key,r.source_name,coalesce(r.detail_url,r.source_url),r.title,r.id,r.source_key,
      least(100,r.discovery_score),coalesce(r.match_reasons,'{}'::text[]),
      jsonb_strip_nulls(jsonb_build_object('authority',r.authority,'reference',coalesce(r.procurement_no,r.publication_no),
        'estimated_value',r.estimated_value,'currency',r.currency,'deadline',r.deadline,'contract_type',r.contract_type,
        'payload_source',r.payload->>'source','source_key',r.source_key)),v_status,now()
    )
    on conflict(lane,source_key) do update set
      run_id=excluded.run_id,source_name=excluded.source_name,source_url=excluded.source_url,title=excluded.title,
      tender_watch_id=excluded.tender_watch_id,score=excluded.score,reasons=excluded.reasons,evidence=excluded.evidence,last_seen_at=now(),
      status=case when public.pppp_representation_discovery_candidates_v1.status in ('accepted','rejected') then public.pppp_representation_discovery_candidates_v1.status else excluded.status end;
    if v_status='new' then v_new:=v_new+1; end if;
  end loop;
  update public.pppp_representation_discovery_runs_v1 set status='succeeded',discovered_count=v_seen,new_count=v_new,
    duplicate_count=v_dup,finished_at=now(),payload=jsonb_build_object('read_source','kek_tender_watch','max_candidates',p_limit,
      'creates_active_opportunities',false,'creates_projects',false,'creates_outbound',false)
  where id=v_run;
  return jsonb_build_object('ok',true,'run_id',v_run,'discovered',v_seen,'new',v_new,'duplicates',v_dup,
    'active_opportunities_created',false,'projects_created',false,'outbound_created',false);
exception when others then
  if v_run is not null then update public.pppp_representation_discovery_runs_v1 set status='failed',error_message=sqlerrm,finished_at=now() where id=v_run; end if;
  raise;
end;
$$;
revoke all on function public.pppp_refresh_representation_opportunity_discovery_v1(integer) from public,anon,authenticated;
grant execute on function public.pppp_refresh_representation_opportunity_discovery_v1(integer) to service_role,postgres;

create or replace function public.pppp_review_representation_discovery_candidate_v1(
  p_candidate_id uuid,
  p_company_name text default null,
  p_company_domain text default null,
  p_country_code text default null,
  p_status text default 'review',
  p_review_note text default null
)
returns jsonb
language plpgsql security invoker set search_path='pg_catalog','public'
as $$
declare
  c public.pppp_representation_discovery_candidates_v1%rowtype;
  v_domain text; v_country text; v_conflicts text[];
begin
  if (select auth.uid()) is null then raise exception using errcode='42501',message='authentication_required'; end if;
  if p_status not in ('new','review','rejected','duplicate') then raise exception using errcode='22023',message='invalid_review_status'; end if;
  select * into c from public.pppp_representation_discovery_candidates_v1 where id=p_candidate_id for update;
  if not found then raise exception using errcode='P0002',message='representation_discovery_candidate_not_found'; end if;
  if c.status='accepted' then raise exception using errcode='22023',message='accepted_candidate_is_immutable'; end if;
  v_domain:=public.pppp_normalize_company_domain_v1(coalesce(p_company_domain,c.company_domain));
  v_country:=upper(coalesce(nullif(btrim(p_country_code),''),c.country_code));
  if v_country is not null and v_country !~ '^[A-Z]{2}$' then raise exception using errcode='22023',message='country_code_iso2_required'; end if;
  v_conflicts:=case when c.candidate_kind='company' then public.pppp_representation_discovery_conflicts_v1(v_domain) else '{}'::text[] end;
  update public.pppp_representation_discovery_candidates_v1 set
    company_name=case when candidate_kind='company' then coalesce(nullif(btrim(p_company_name),''),company_name) else company_name end,
    company_domain=case when candidate_kind='company' then v_domain else company_domain end,
    country_code=case when candidate_kind='company' then v_country else country_code end,
    routing_conflicts=v_conflicts,status=p_status,review_note=nullif(btrim(p_review_note),''),
    reviewed_at=now(),reviewed_by=(select auth.uid())
  where id=c.id;
  return jsonb_build_object('ok',true,'candidate_id',c.id,'status',p_status,'routing_conflicts',v_conflicts,
    'active_record_created',false,'project_created',false,'outbound_created',false);
end;
$$;
revoke all on function public.pppp_review_representation_discovery_candidate_v1(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.pppp_review_representation_discovery_candidate_v1(uuid,text,text,text,text,text) to authenticated,service_role;

create or replace function public.pppp_accept_representation_discovery_candidate_v1(p_candidate_id uuid)
returns jsonb
language plpgsql security invoker set search_path='pg_catalog','public'
as $$
declare c public.pppp_representation_discovery_candidates_v1%rowtype; v_target uuid; v_opportunity uuid; v_conflicts text[];
begin
  if (select auth.uid()) is null then raise exception using errcode='42501',message='authentication_required'; end if;
  select * into c from public.pppp_representation_discovery_candidates_v1 where id=p_candidate_id for update;
  if not found then raise exception using errcode='P0002',message='representation_discovery_candidate_not_found'; end if;
  if c.status='accepted' then return jsonb_build_object('ok',true,'idempotent',true,'target_id',c.target_id,'opportunity_id',c.opportunity_id); end if;
  if c.status in ('rejected','duplicate') then raise exception using errcode='22023',message='candidate_not_accept_ready:'||c.status; end if;

  if c.candidate_kind='company' then
    if c.company_domain is null or c.company_name is null then raise exception using errcode='22023',message='verified_company_name_and_domain_required'; end if;
    v_conflicts:=public.pppp_representation_discovery_conflicts_v1(c.company_domain);
    if cardinality(v_conflicts)>0 then
      update public.pppp_representation_discovery_candidates_v1 set status='review',routing_conflicts=v_conflicts,reviewed_at=now(),reviewed_by=(select auth.uid()) where id=c.id;
      raise exception using errcode='23505',message='cross_module_identity_review_required:'||array_to_string(v_conflicts,',');
    end if;
    insert into public.pppp_representation_targets_v1(
      company_name,company_domain,company_website,country,source_key,source_name,source_url,target_type,stage,priority_score,
      why_kosovo,market_evidence,strategic_fit_notes,target_model,target_territory,created_source,identity_review_status
    ) values(
      c.company_name,c.company_domain,'https://'||c.company_domain,case when c.country_code='US' then 'United States' else c.country_code end,
      'rep:'||lower(coalesce(c.country_code,'xx'))||':'||c.company_domain,c.source_name,c.source_url,'representation','found',c.score,
      array_to_string(c.reasons,' · '),c.title,'Accepted from isolated market-entry discovery inbox. Human verification remains required.',
      'market_development_partner','Kosovo / Western Balkans','import','clear'
    ) returning id into v_target;
    update public.pppp_representation_discovery_candidates_v1 set status='accepted',target_id=v_target,reviewed_at=now(),reviewed_by=(select auth.uid()) where id=c.id;
  else
    if c.tender_watch_id is null then raise exception using errcode='22023',message='tender_watch_reference_required'; end if;
    insert into public.pppp_representation_opportunities_v1(
      source_key,project_name,funding_institution,tender_reference,official_source,total_project_value,currency,status,
      procurement_stage,tender_deadline,scope,verification_status,fact_evidence,notes
    )
    select t.source_key,t.title,coalesce(t.authority,c.source_name),coalesce(t.procurement_no,t.publication_no),coalesce(t.detail_url,t.source_url),
      t.estimated_value,t.currency,'pipeline',coalesce(t.payload->>'procurement_stage',t.document_type),t.deadline,
      coalesce(t.fpp_description,t.category,t.contract_type),'review',
      jsonb_build_object('origin','representation_discovery','source_status','confirmed','source',coalesce(t.detail_url,t.source_url),
        'tender_watch_id',t.id,'operator_acceptance_required_for_partner_research',true),
      'Accepted from isolated JV/consortium discovery inbox. No Project, Partner, Contact or outreach was created.'
    from public.kek_tender_watch t where t.id=c.tender_watch_id
    on conflict(source_key) do update set updated_at=now()
    returning id into v_opportunity;
    update public.pppp_representation_discovery_candidates_v1 set status='accepted',opportunity_id=v_opportunity,reviewed_at=now(),reviewed_by=(select auth.uid()) where id=c.id;
  end if;
  return jsonb_build_object('ok',true,'candidate_id',c.id,'target_id',v_target,'opportunity_id',v_opportunity,
    'project_created',false,'partner_created',false,'contact_created',false,'outbound_created',false,'email_sent',false);
end;
$$;
revoke all on function public.pppp_accept_representation_discovery_candidate_v1(uuid) from public,anon;
grant execute on function public.pppp_accept_representation_discovery_candidate_v1(uuid) to authenticated,service_role;

create or replace view public.pppp_representation_discovery_summary_v1
with (security_invoker=true) as
select
  count(*) filter(where status in ('new','review')) total_review,
  count(*) filter(where lane='market_entry' and status in ('new','review')) market_entry_review,
  count(*) filter(where lane='consortium_opportunity' and status in ('new','review')) consortium_review,
  count(*) filter(where status='duplicate') duplicates,
  max(last_seen_at) last_seen_at
from public.pppp_representation_discovery_candidates_v1;
grant select on public.pppp_representation_discovery_summary_v1 to authenticated,service_role;

do $$
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname='pppp-representation-opportunity-discovery-daily';
    perform cron.schedule('pppp-representation-opportunity-discovery-daily','55 5 * * *',
      'select public.pppp_refresh_representation_opportunity_discovery_v1(25);');
  end if;
end$$;

comment on table public.pppp_representation_discovery_candidates_v1 is
  'Isolated review inbox for market-entry companies and serious consortium/JV opportunities. Discovery never mutates other commercial modules.';
comment on function public.pppp_accept_representation_discovery_candidate_v1(uuid) is
  'Human acceptance creates only the corresponding Representation target or Representation opportunity; never a Project, Partner, Contact, Supplier, draft or email.';
