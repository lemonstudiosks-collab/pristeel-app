begin;

-- Avoid creating a second company-only Contact Master row when the same domain already exists.
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
  v_domain text;
begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id;
  if not found then raise exception 'Prospect not found'; end if;

  v_email:=nullif(lower(btrim(coalesce(p.contact_email,''))), '');
  v_domain:=public.pppp_gc_normalize_domain_v1(coalesce(p.company_domain,p.website_url,public.pppp_gc_domain_from_email_v1(v_email)));

  if v_email is not null then
    select * into c from public.contacts
     where lower(btrim(coalesce(email,'')))=v_email
     order by created_at limit 1;
    if found and lower(coalesce(c.kind,''))='supplier' then
      update public.pppp_gc_prospects_v1
         set status='human_review',duplicate_reason='Contact exists as supplier in Contact Master',updated_at=now()
       where id=p.id;
      return c.id;
    end if;
  else
    if v_domain is not null then
      select * into c from public.contacts
       where lower(coalesce(kind,''))='client'
         and public.pppp_gc_domain_from_email_v1(email)=v_domain
       order by last_contact desc nulls last,created_at
       limit 1;
    end if;
    if not found then
      select * into c from public.contacts
       where lower(coalesce(kind,''))='client'
         and public.pppp_gc_normalize_company_v1(company)=public.pppp_gc_normalize_company_v1(p.company_name)
       order by last_contact desc nulls last,created_at
       limit 1;
    end if;
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
      jsonb_build_object(
        'company_domain',p.company_domain,'company_type',p.company_type,'relevance_score',p.relevance_score,
        'language',p.language,'current_projects',p.current_projects,'recent_projects',p.recent_projects,'evidence',p.evidence
      )
    );
  end if;

  update public.pppp_gc_prospects_v1 set contact_id=c.id,updated_at=now() where id=p.id;
  return c.id;
end;
$$;

create or replace view public.pppp_gc_daily_summary_v1
with (security_invoker=true)
as
select
  r.run_date,r.lane,r.status,r.requested_count,r.discovered_count,r.accepted_count,r.duplicate_count,r.contact_ready_count,
  r.response_id,r.error_message,r.started_at,r.finished_at,
  count(p.id) as prospect_rows,
  count(p.id) filter(where p.status='already_contacted') as already_contacted_rows,
  count(p.id) filter(where p.status='contact_ready') as contact_ready_rows,
  count(p.id) filter(where p.status='research_ready') as research_ready_rows
from public.pppp_gc_discovery_runs_v1 r
left join public.pppp_gc_prospects_v1 p on p.discovery_run_id=r.id
group by r.id;

grant select on public.pppp_gc_daily_summary_v1 to authenticated,service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_gc_daily_summary_v1 to supabase_read_only_user;
  end if;
end $$;

create or replace function public.pppp_gc_discovery_internal_request(p_limit integer default 12,p_force boolean default false)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_limit integer:=least(20,greatest(1,coalesce(p_limit,12)));
  v_force text:=case when coalesce(p_force,false) then 'true' else 'false' end;
begin
  return public.pppp_enqueue_automation_http_v1(
    'pppp-gc-discovery',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-gc-discovery?limit='||v_limit::text||'&lane=EU_UK&force='||v_force,
    'gmail_tracker_cron_secret',180000,2
  );
end;
$$;

revoke all on function public.pppp_gc_discovery_internal_request(integer,boolean) from public,anon,authenticated;
grant execute on function public.pppp_gc_discovery_internal_request(integer,boolean) to service_role;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='pppp-gc-discovery-daily' loop
      perform cron.unschedule(j);
    end loop;
    -- 04:15 UTC = early business morning in Central Europe year-round.
    perform cron.schedule('pppp-gc-discovery-daily','15 4 * * *','select public.pppp_gc_discovery_internal_request(12,false);');
  end if;
end $$;

commit;
