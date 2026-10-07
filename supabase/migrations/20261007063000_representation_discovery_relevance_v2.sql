-- Focused discovery filtering. No record deletion or business-state updates.
create or replace function public.pppp_representation_company_signal_fit_v1(p_name text,p_title text)
returns boolean language sql immutable security invoker set search_path='pg_catalog','public'
as $$
 select coalesce(length(btrim(p_name)) between 2 and 80
 and lower(p_name) !~ '(kosovo|balkans|serbia|albania|troops|administration|minister|president|maliqi|government|report|news)'
 and lower(p_title) !~ '(troops|military withdrawal|election|president|administration|parliament|politic|geopolitic)'
 and lower(p_title) ~ '(kosov|western balkan)'
 and lower(p_title) ~ '(expand(s|ing)? into|enter(s|ing)?|seeks? (a |local |new )?(partner|distributor|representative)|seeking (a |local )?(partner|distributor)|distribution (agreement|partner)|appoints?.*(distributor|representative)|market entry|manufactur.*invest|invest.*manufactur)'
 and (lower(p_title) ~ '(manufactur|equipment|energy|steel|industrial|engineering|technology|electric|machiner|solar|battery|medical|logistic|gmbh|corporation|\minc\M|\mltd\M)' or lower(p_title) ~ '(distributor|representative|distribution agreement)')
 ,false);
$$;
revoke all on function public.pppp_representation_company_signal_fit_v1(text,text) from public,anon;
grant execute on function public.pppp_representation_company_signal_fit_v1(text,text) to authenticated,service_role,postgres;

create or replace function public.pppp_representation_tender_fit_v1(p_title text,p_type text,p_value numeric,p_currency text)
returns text language plpgsql immutable security invoker set search_path='pg_catalog','public'
as $$
declare v text:=lower(coalesce(p_title,'')); ct text:=lower(coalesce(p_type,''));
begin
 if ct in ('cs','consulting','consultancy','sherbime','shërbime','services')
 or v ~ '(consultant|consultancy|consulting|supervision|mbikeqyr|mbikëqyr|audit|financial management|specialist|training|trajnime|pastrim|cleaning|office supplies|material zyre|kontejner|container|shufra|gypa te celikut|gypa të çelikut|scaffold|skele)' then return null; end if;
 if v !~ '(construction|ndertim|ndërtim|rehabilit|moderniz|replacement|zevendes|zëvendës|installation|instalim|supply and install|design.*build|epc|turnkey)' then return null; end if;
 if v ~ '(substation|nenstacion|nënstacion|transmission|transmision|tension.*lart|high.voltage|battery.*storage|bess|power plant|termocentral|turbine|turbina|boiler|kaldaj|industrial.*plant|impiant.*industrial|wastewater.*plant|impiant.*uj|rezervuar.*(mazut|hcl)|chemical.*tank|hydropower|hidrocentral|dam.*(rehabilit|remedial)|(rehabilit|remedial).*dam|solar.*plant)'
 then return 'Paketë teknike energjetike / industriale; kërkon vlerësim të partnerit specialist ose OEM.'; end if;
 if upper(coalesce(p_currency,''))='EUR' and p_value>=1000000
 and v ~ '(bridge|ura|urë|railway|hekurudh|highway|autostrad|wastewater|ujerave.*zeza|ujërave.*zeza|water treatment|trajtim.*uj|epc|turnkey)'
 then return 'Projekt kompleks infrastrukture; kandidat për JV / konsorcium me kapacitete të specializuara.'; end if;
 return null;
end;
$$;
revoke all on function public.pppp_representation_tender_fit_v1(text,text,numeric,text) from public,anon;
grant execute on function public.pppp_representation_tender_fit_v1(text,text,numeric,text) to authenticated,service_role,postgres;

create or replace function public.pppp_representation_tender_current_v1(p_id uuid)
returns boolean language sql stable security invoker set search_path='pg_catalog','public'
as $$
 select exists(
 select 1 from public.kek_tender_watch t where t.id=p_id
 and t.deadline >= (now() at time zone 'Europe/Budapest')::date+7
 and lower(coalesce(t.status,'')) not in ('ignored','rejected','closed','expired','cancelled','canceled','awarded','archived','no_bid','duplicate')
 and coalesce(nullif(t.payload->>'notice_phase',''),'opportunity')='opportunity'
 and lower(concat_ws(' ',t.document_type,t.payload->>'notice_type')) !~ '(award|cancel|anulim|dhënie|dhenie|b08|b10)'
 and public.pppp_representation_tender_fit_v1(t.title,t.contract_type,t.estimated_value,t.currency) is not null
 and not exists(
  select 1 from public.kek_tender_watch n
  where n.id<>t.id and coalesce(n.authority,'')=coalesce(t.authority,'')
  and coalesce(nullif(n.procurement_no,''),n.source_key)=coalesce(nullif(t.procurement_no,''),t.source_key)
  and (coalesce(n.published_date,'0001-01-01'::date),n.updated_at,n.id) >
      (coalesce(t.published_date,'0001-01-01'::date),t.updated_at,t.id)
 )
 );
$$;
revoke all on function public.pppp_representation_tender_current_v1(uuid) from public,anon;
grant execute on function public.pppp_representation_tender_current_v1(uuid) to authenticated,service_role,postgres;

create or replace function public.pppp_representation_discovery_inbox_v2(p_limit integer default 50)
returns jsonb language sql stable security invoker set search_path='pg_catalog','public'
as $$
 with eligible as (
 select c.id,c.lane,c.candidate_kind,c.status,
 case when c.candidate_kind='company' then c.company_name else t.title end title,
 c.company_name,c.company_domain,c.country_code,c.source_name,
 coalesce(t.detail_url,t.source_url,c.source_url) source_url,c.score,c.routing_conflicts,c.last_seen_at,
 case when c.candidate_kind='opportunity' then
 array[public.pppp_representation_tender_fit_v1(t.title,t.contract_type,t.estimated_value,t.currency)]
 else c.reasons end reasons,
 case when c.candidate_kind='opportunity' then c.evidence ||
 jsonb_strip_nulls(jsonb_build_object('authority',t.authority,'reference',t.procurement_no,
 'deadline',t.deadline,'estimated_value',t.estimated_value,'currency',t.currency))
 else c.evidence end evidence,
 case when c.candidate_kind='company' then coalesce(nullif(c.company_domain,''),lower(c.company_name))
 else coalesce(nullif(t.procurement_no,''),t.source_key) end identity_key
 from public.pppp_representation_discovery_candidates_v1 c
 left join public.kek_tender_watch t on t.id=c.tender_watch_id
 where c.status in ('new','review') and (
 (c.lane='market_entry' and c.candidate_kind='company'
 and public.pppp_representation_company_signal_fit_v1(c.company_name,c.title))
 or (c.lane='consortium_opportunity' and c.candidate_kind='opportunity'
 and public.pppp_representation_tender_current_v1(c.tender_watch_id))
 )
 ), unique_rows as (
 select distinct on (lane,identity_key) * from eligible
 order by lane,identity_key,last_seen_at desc,id
 ), limited as (
 select to_jsonb(u)-'identity_key' row from unique_rows u
 order by score desc,last_seen_at desc,id limit least(50,greatest(1,coalesce(p_limit,50)))
 )
 select jsonb_build_object('rows',coalesce((select jsonb_agg(row) from limited),'[]'::jsonb),
 'policy','representation_jv_relevance_v2','minimum_preparation_days',7);
$$;
revoke all on function public.pppp_representation_discovery_inbox_v2(integer) from public,anon;
grant execute on function public.pppp_representation_discovery_inbox_v2(integer) to authenticated,service_role,postgres;

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
      and public.pppp_representation_tender_current_v1(t.id)
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
      least(100,r.discovery_score),array[public.pppp_representation_tender_fit_v1(r.title,r.contract_type,r.estimated_value,r.currency)],
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
    duplicate_count=v_dup,finished_at=now(),payload=jsonb_build_object('filter_policy','representation_jv_relevance_v2','minimum_preparation_days',7,'read_source','kek_tender_watch','max_candidates',p_limit,
      'creates_active_opportunities',false,'creates_projects',false,'creates_outbound',false)
  where id=v_run;
  return jsonb_build_object('ok',true,'run_id',v_run,'discovered',v_seen,'new',v_new,'duplicates',v_dup,
    'active_opportunities_created',false,'projects_created',false,'outbound_created',false);
exception when others then
  if v_run is not null then update public.pppp_representation_discovery_runs_v1 set status='failed',error_message=sqlerrm,finished_at=now() where id=v_run; end if;
  raise;
end;
$$;
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
  if nullif(p_payload->>'country_code','') is not null and (p_payload->>'country_code') !~ '^[A-Z]{2}$' then raise exception using errcode='22023',message='country_code_iso2_required'; end if;
  if not public.pppp_representation_company_signal_fit_v1(p_payload->>'company_name',v_title) then
    return jsonb_build_object('ok',true,'skipped',true,'reason','no_verified_business_signal','writes',0);
  end if;
  v_conflicts:=public.pppp_representation_discovery_conflicts_v1(v_domain);
  v_status:=case when cardinality(v_conflicts)>0 then 'review' else 'new' end;
  insert into public.pppp_representation_discovery_candidates_v1(
    run_id,lane,candidate_kind,source_key,source_name,source_url,title,company_name,company_domain,country_code,
    score,reasons,evidence,routing_conflicts,status,last_seen_at
  ) values(
    p_run_id,'market_entry','company',v_source_key,coalesce(nullif(p_payload->>'source_name',''),'public_market_signal'),
    nullif(p_payload->>'source_url',''),v_title,nullif(p_payload->>'company_name',''),v_domain,
    upper(nullif(p_payload->>'country_code','')),
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

  if c.candidate_kind='opportunity' and not public.pppp_representation_tender_current_v1(c.tender_watch_id) then
    raise exception using errcode='22023',message='tender_not_current_or_not_relevant_for_jv';
  end if;
  if c.candidate_kind='company' and not public.pppp_representation_company_signal_fit_v1(c.company_name,c.title) then
    raise exception using errcode='22023',message='company_business_signal_required';
  end if;
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
