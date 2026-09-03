begin;

create table if not exists public.pppp_gc_discovery_runs_v1 (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default current_date,
  lane text not null default 'EU_UK',
  status text not null default 'running' check (status in ('running','succeeded','partial','failed')),
  requested_count integer not null default 0,
  discovered_count integer not null default 0,
  accepted_count integer not null default 0,
  duplicate_count integer not null default 0,
  contact_ready_count integer not null default 0,
  response_id text,
  error_message text,
  payload jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique(run_date,lane)
);

create table if not exists public.pppp_gc_prospects_v1 (
  id uuid primary key default gen_random_uuid(),
  discovery_run_id uuid references public.pppp_gc_discovery_runs_v1(id) on delete set null,
  company_key text not null,
  company_name text not null,
  company_domain text,
  website_url text,
  country text,
  country_code text,
  company_type text not null default 'GC/GU',
  relevance_score integer not null default 0 check (relevance_score between 0 and 100),
  status text not null default 'discovered' check (status in (
    'discovered','research_ready','contact_ready','draft_ready','contacted_1','followup_due','draft_2_ready',
    'contacted_2','replied','no_response_2','already_contacted','bounced','do_not_contact','human_review','rejected'
  )),
  language text not null default 'en' check (language in ('de','sr','en')),
  contact_id uuid references public.contacts(id) on delete set null,
  contact_name text,
  contact_email text,
  contact_role text,
  contact_source_url text,
  contact_confidence integer check (contact_confidence is null or contact_confidence between 0 and 100),
  current_projects jsonb not null default '[]'::jsonb,
  recent_projects jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  discovery_source text not null default 'web_search',
  source_url text,
  outreach_contact_id bigint references public.outreach_contacts(id) on delete set null,
  first_draft_id text,
  first_draft_created_at timestamptz,
  first_gmail_message_id text,
  first_gmail_thread_id text,
  first_sent_at timestamptz,
  followup_due_date date,
  second_draft_id text,
  second_draft_created_at timestamptz,
  second_gmail_message_id text,
  second_sent_at timestamptz,
  replied_at timestamptz,
  bounced_at timestamptz,
  do_not_contact boolean not null default false,
  no_more_auto boolean not null default false,
  human_send_required boolean not null default true,
  duplicate_reason text,
  last_error text,
  first_discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  researched_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(company_key)
);

create index if not exists pppp_gc_prospects_status_idx on public.pppp_gc_prospects_v1(status,updated_at);
create index if not exists pppp_gc_prospects_domain_idx on public.pppp_gc_prospects_v1(lower(company_domain)) where company_domain is not null;
create index if not exists pppp_gc_prospects_email_idx on public.pppp_gc_prospects_v1(lower(contact_email)) where contact_email is not null;

alter table public.pppp_gc_discovery_runs_v1 enable row level security;
alter table public.pppp_gc_prospects_v1 enable row level security;

drop policy if exists pppp_gc_runs_read on public.pppp_gc_discovery_runs_v1;
create policy pppp_gc_runs_read on public.pppp_gc_discovery_runs_v1 for select to authenticated using (true);
drop policy if exists pppp_gc_prospects_read on public.pppp_gc_prospects_v1;
create policy pppp_gc_prospects_read on public.pppp_gc_prospects_v1 for select to authenticated using (true);

revoke insert,update,delete on public.pppp_gc_discovery_runs_v1 from authenticated,anon;
revoke insert,update,delete on public.pppp_gc_prospects_v1 from authenticated,anon;
grant select on public.pppp_gc_discovery_runs_v1,public.pppp_gc_prospects_v1 to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_gc_discovery_runs_v1,public.pppp_gc_prospects_v1 to supabase_read_only_user;
  end if;
end $$;

create or replace function public.pppp_gc_normalize_domain_v1(p_value text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(coalesce(p_value,''))),'^[a-z]+://','','i'),
        '^www\\.','','i'
      ),
      '[/?:#].*$','','g'
    ),
    ''
  );
$$;

create or replace function public.pppp_gc_domain_from_email_v1(p_email text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select case
    when position('@' in coalesce(p_email,''))>1
    then public.pppp_gc_normalize_domain_v1(split_part(lower(btrim(p_email)),'@',2))
    else null
  end;
$$;

create or replace function public.pppp_gc_normalize_company_v1(p_name text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select nullif(
    btrim(regexp_replace(
      regexp_replace(
        regexp_replace(lower(coalesce(p_name,'')),
          '\\m(gmbh|mbh|ag|kg|gmbh[[:space:]]*&[[:space:]]*co[[:space:]]*kg|ltd|limited|plc|llp|inc|corp|corporation|bv|nv|oy|ab|as|asa|sa|srl|spa|sas|sarl|doo|d[.]o[.]o[.]|dd|d[.]d[.]|kft|sp[[:space:]]*z[[:space:]]*o[[:space:]]*o|a[.]s[.]|s[.]a[.]|s[.]r[.]l[.]|s[.]p[.]a[.])\\M',' ','gi'),
        '[^a-z0-9]+',' ','g'
      ),
      '[[:space:]]+',' ','g'
    )),
    ''
  );
$$;

create or replace function public.pppp_gc_company_key_v1(p_company text,p_domain text,p_country_code text default null)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select case
    when public.pppp_gc_normalize_domain_v1(p_domain) is not null
      then 'domain:'||public.pppp_gc_normalize_domain_v1(p_domain)
    else 'name:'||coalesce(public.pppp_gc_normalize_company_v1(p_company),'unknown')||':'||lower(coalesce(nullif(btrim(p_country_code),''),'xx'))
  end;
$$;

create or replace function public.pppp_gc_language_v1(p_country text,p_country_code text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select case
    when upper(coalesce(p_country_code,'')) in ('DE','AT','CH')
      or lower(coalesce(p_country,'')) in ('germany','deutschland','austria','österreich','osterreich','switzerland','schweiz','suisse') then 'de'
    when upper(coalesce(p_country_code,'')) in ('HR','ME','RS')
      or lower(coalesce(p_country,'')) in ('croatia','hrvatska','montenegro','crna gora','serbia','srbija') then 'sr'
    else 'en'
  end;
$$;

create or replace function public.pppp_gc_historical_outreach_v1(p_company text,p_domain text,p_email text)
returns jsonb
language plpgsql
stable
set search_path=public,pg_temp
as $$
declare
  v_domain text:=public.pppp_gc_normalize_domain_v1(coalesce(p_domain,public.pppp_gc_domain_from_email_v1(p_email)));
  v_email text:=lower(btrim(coalesce(p_email,'')));
  v_name text:=public.pppp_gc_normalize_company_v1(p_company);
  r record;
begin
  select o.id,o.status,o.touch_1,o.touch_2,o.replied,o.bounced,o.gmail_thread_id,o.company_name,o.company_domain,o.contact_email
    into r
  from public.outreach_contacts o
  where (
      (v_domain is not null and public.pppp_gc_normalize_domain_v1(o.company_domain)=v_domain)
      or (v_email<>'' and lower(btrim(coalesce(o.contact_email,'')))=v_email)
      or (v_name is not null and public.pppp_gc_normalize_company_v1(o.company_name)=v_name)
    )
    and (
      o.touch_1 is not null or o.gmail_message_id is not null
      or lower(coalesce(o.status,'')) in ('sent','replied','meeting','bounced','dormant','closed')
    )
  order by coalesce(o.touch_2,o.touch_1) desc nulls last,o.updated_at desc nulls last,o.id desc
  limit 1;

  if found then
    return jsonb_build_object(
      'contacted',true,'outreach_contact_id',r.id,'status',r.status,'touch_1',r.touch_1,'touch_2',r.touch_2,
      'replied',coalesce(r.replied,false),'bounced',coalesce(r.bounced,false),'gmail_thread_id',r.gmail_thread_id,
      'matched_company',r.company_name,'matched_domain',r.company_domain,'matched_email',r.contact_email
    );
  end if;

  if exists(
    select 1 from public.contacts c
    where c.last_contact is not null
      and (
        (v_email<>'' and lower(btrim(coalesce(c.email,'')))=v_email)
        or (v_domain is not null and public.pppp_gc_domain_from_email_v1(c.email)=v_domain)
      )
  ) then
    return jsonb_build_object('contacted',true,'status','contact_master_last_contact','outreach_contact_id',null);
  end if;

  return jsonb_build_object('contacted',false);
end;
$$;

create or replace function public.pppp_gc_register_contact_v1(p_prospect_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  p public.pppp_gc_prospects_v1%rowtype;
  c public.contacts%rowtype;
  v_email text;
begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id;
  if not found then raise exception 'Prospect not found'; end if;

  v_email:=nullif(lower(btrim(coalesce(p.contact_email,''))), '');

  if v_email is not null then
    select * into c from public.contacts where lower(btrim(coalesce(email,'')))=v_email order by created_at limit 1;
    if found and lower(coalesce(c.kind,''))='supplier' then
      update public.pppp_gc_prospects_v1
         set status='human_review',duplicate_reason='Contact exists as supplier in Contact Master',updated_at=now()
       where id=p.id;
      return c.id;
    end if;
  else
    select * into c
      from public.contacts
     where email is null
       and public.pppp_gc_normalize_company_v1(company)=public.pppp_gc_normalize_company_v1(p.company_name)
       and lower(coalesce(kind,''))='client'
     order by created_at limit 1;
  end if;

  if not found then
    insert into public.contacts(kind,company,person,email,country,role,notes)
    values(
      'client',p.company_name,nullif(p.contact_name,''),v_email,p.country,
      coalesce(nullif(p.contact_role,''),'GC/GU prospect'),
      'PPPP GC/GU Prospecting — automated public-source discovery. External email send requires human approval.'
    ) returning * into c;
  else
    update public.contacts
       set company=coalesce(nullif(company,''),p.company_name),
           country=coalesce(nullif(country,''),p.country),
           person=coalesce(nullif(person,''),nullif(p.contact_name,'')),
           role=coalesce(nullif(role,''),nullif(p.contact_role,''),'GC/GU prospect')
     where id=c.id;
  end if;

  if not exists(
    select 1 from public.contact_sources s
    where s.contact_id=c.id::text and s.source='gc_gu_prospecting' and s.external_id=p.id::text
  ) then
    insert into public.contact_sources(contact_id,email,source,external_id,external_url,first_seen,last_seen,metadata)
    values(
      c.id::text,v_email,'gc_gu_prospecting',p.id::text,coalesce(p.contact_source_url,p.source_url),now(),now(),
      jsonb_build_object('company_domain',p.company_domain,'company_type',p.company_type,'relevance_score',p.relevance_score,'language',p.language,'evidence',p.evidence)
    );
  end if;

  update public.pppp_gc_prospects_v1 set contact_id=c.id,updated_at=now() where id=p.id;
  return c.id;
end;
$$;

create or replace function public.pppp_gc_upsert_prospect_v1(
  p_company_name text,
  p_company_domain text default null,
  p_website_url text default null,
  p_country text default null,
  p_country_code text default null,
  p_company_type text default 'GC/GU',
  p_relevance_score integer default 0,
  p_contact_name text default null,
  p_contact_email text default null,
  p_contact_role text default null,
  p_contact_source_url text default null,
  p_contact_confidence integer default null,
  p_current_projects jsonb default '[]'::jsonb,
  p_recent_projects jsonb default '[]'::jsonb,
  p_evidence jsonb default '[]'::jsonb,
  p_discovery_source text default 'web_search',
  p_source_url text default null,
  p_discovery_run_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_domain text;
  v_key text;
  v_hist jsonb;
  v_status text;
  v_reason text;
  v_id uuid;
  v_contact_id uuid;
  v_email text:=nullif(lower(btrim(coalesce(p_contact_email,''))), '');
begin
  if coalesce(btrim(p_company_name),'')='' then raise exception 'company_name_required'; end if;

  v_domain:=public.pppp_gc_normalize_domain_v1(coalesce(p_company_domain,p_website_url,public.pppp_gc_domain_from_email_v1(v_email)));
  v_key:=public.pppp_gc_company_key_v1(p_company_name,v_domain,p_country_code);
  v_hist:=public.pppp_gc_historical_outreach_v1(p_company_name,v_domain,v_email);

  if coalesce((v_hist->>'contacted')::boolean,false) then
    v_status:='already_contacted';
    v_reason:='Historical outreach already exists';
  elsif v_email is not null and p_contact_confidence is not null and p_contact_confidence>=70 then
    v_status:='contact_ready';
  else
    v_status:='research_ready';
  end if;

  insert into public.pppp_gc_prospects_v1(
    discovery_run_id,company_key,company_name,company_domain,website_url,country,country_code,company_type,relevance_score,
    status,language,contact_name,contact_email,contact_role,contact_source_url,contact_confidence,current_projects,recent_projects,evidence,
    discovery_source,source_url,outreach_contact_id,no_more_auto,duplicate_reason,last_seen_at,researched_at,updated_at
  ) values(
    p_discovery_run_id,v_key,btrim(p_company_name),v_domain,p_website_url,p_country,upper(nullif(btrim(p_country_code),'')),coalesce(nullif(p_company_type,''),'GC/GU'),
    least(100,greatest(0,coalesce(p_relevance_score,0))),v_status,public.pppp_gc_language_v1(p_country,p_country_code),
    p_contact_name,v_email,p_contact_role,p_contact_source_url,p_contact_confidence,
    coalesce(p_current_projects,'[]'::jsonb),coalesce(p_recent_projects,'[]'::jsonb),coalesce(p_evidence,'[]'::jsonb),
    coalesce(nullif(p_discovery_source,''),'web_search'),p_source_url,nullif(v_hist->>'outreach_contact_id','')::bigint,
    coalesce((v_hist->>'contacted')::boolean,false),v_reason,now(),now(),now()
  )
  on conflict(company_key) do update set
    company_name=excluded.company_name,
    company_domain=coalesce(excluded.company_domain,public.pppp_gc_prospects_v1.company_domain),
    website_url=coalesce(excluded.website_url,public.pppp_gc_prospects_v1.website_url),
    country=coalesce(excluded.country,public.pppp_gc_prospects_v1.country),
    country_code=coalesce(excluded.country_code,public.pppp_gc_prospects_v1.country_code),
    company_type=coalesce(excluded.company_type,public.pppp_gc_prospects_v1.company_type),
    relevance_score=greatest(excluded.relevance_score,public.pppp_gc_prospects_v1.relevance_score),
    contact_name=coalesce(excluded.contact_name,public.pppp_gc_prospects_v1.contact_name),
    contact_email=coalesce(excluded.contact_email,public.pppp_gc_prospects_v1.contact_email),
    contact_role=coalesce(excluded.contact_role,public.pppp_gc_prospects_v1.contact_role),
    contact_source_url=coalesce(excluded.contact_source_url,public.pppp_gc_prospects_v1.contact_source_url),
    contact_confidence=greatest(coalesce(excluded.contact_confidence,0),coalesce(public.pppp_gc_prospects_v1.contact_confidence,0)),
    current_projects=case when jsonb_array_length(coalesce(excluded.current_projects,'[]'::jsonb))>0 then excluded.current_projects else public.pppp_gc_prospects_v1.current_projects end,
    recent_projects=case when jsonb_array_length(coalesce(excluded.recent_projects,'[]'::jsonb))>0 then excluded.recent_projects else public.pppp_gc_prospects_v1.recent_projects end,
    evidence=case when jsonb_array_length(coalesce(excluded.evidence,'[]'::jsonb))>0 then excluded.evidence else public.pppp_gc_prospects_v1.evidence end,
    discovery_run_id=coalesce(excluded.discovery_run_id,public.pppp_gc_prospects_v1.discovery_run_id),
    source_url=coalesce(excluded.source_url,public.pppp_gc_prospects_v1.source_url),
    last_seen_at=now(),researched_at=now(),updated_at=now(),
    status=case
      when public.pppp_gc_prospects_v1.status in ('contacted_1','followup_due','draft_2_ready','contacted_2','replied','no_response_2','bounced','do_not_contact') then public.pppp_gc_prospects_v1.status
      when excluded.status='already_contacted' then 'already_contacted'
      when public.pppp_gc_prospects_v1.status='human_review' then 'human_review'
      else excluded.status
    end,
    no_more_auto=public.pppp_gc_prospects_v1.no_more_auto or excluded.no_more_auto,
    duplicate_reason=coalesce(excluded.duplicate_reason,public.pppp_gc_prospects_v1.duplicate_reason)
  returning id into v_id;

  v_contact_id:=public.pppp_gc_register_contact_v1(v_id);

  return jsonb_build_object(
    'ok',true,'prospect_id',v_id,'contact_id',v_contact_id,'company_key',v_key,'company_domain',v_domain,
    'status',(select status from public.pppp_gc_prospects_v1 where id=v_id),
    'language',(select language from public.pppp_gc_prospects_v1 where id=v_id),
    'historical_outreach',v_hist
  );
end;
$$;

create or replace view public.pppp_gc_prospect_queue_v1
with (security_invoker=true)
as
select p.*
from public.pppp_gc_prospects_v1 p
where p.status in ('research_ready','contact_ready','draft_ready','followup_due','draft_2_ready','human_review')
order by p.relevance_score desc,p.first_discovered_at asc;

grant select on public.pppp_gc_prospect_queue_v1 to authenticated,service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_gc_prospect_queue_v1 to supabase_read_only_user;
  end if;
end $$;

revoke all on function public.pppp_gc_register_contact_v1(uuid) from public,anon,authenticated;
revoke all on function public.pppp_gc_upsert_prospect_v1(text,text,text,text,text,text,integer,text,text,text,text,integer,jsonb,jsonb,jsonb,text,text,uuid) from public,anon,authenticated;
grant execute on function public.pppp_gc_register_contact_v1(uuid) to service_role;
grant execute on function public.pppp_gc_upsert_prospect_v1(text,text,text,text,text,text,integer,text,text,text,text,integer,jsonb,jsonb,jsonb,text,text,uuid) to service_role;

grant execute on function public.pppp_gc_normalize_domain_v1(text) to authenticated,service_role;
grant execute on function public.pppp_gc_domain_from_email_v1(text) to authenticated,service_role;
grant execute on function public.pppp_gc_normalize_company_v1(text) to authenticated,service_role;
grant execute on function public.pppp_gc_company_key_v1(text,text,text) to authenticated,service_role;
grant execute on function public.pppp_gc_language_v1(text,text) to authenticated,service_role;
grant execute on function public.pppp_gc_historical_outreach_v1(text,text,text) to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_gc_normalize_domain_v1(text) to supabase_read_only_user;
    grant execute on function public.pppp_gc_domain_from_email_v1(text) to supabase_read_only_user;
    grant execute on function public.pppp_gc_normalize_company_v1(text) to supabase_read_only_user;
    grant execute on function public.pppp_gc_company_key_v1(text,text,text) to supabase_read_only_user;
    grant execute on function public.pppp_gc_language_v1(text,text) to supabase_read_only_user;
    grant execute on function public.pppp_gc_historical_outreach_v1(text,text,text) to supabase_read_only_user;
  end if;
end $$;

commit;
