-- Keep automated/system mailboxes out of Contact Master and preserve manual project-contact curation.
-- Root cause: the Gmail project-email trigger treated every non-PRISTEEL incoming sender as a client.
-- This migration updates both the live trigger path and the rebuild helper, then removes only
-- Gmail-auto-created system identities with no CRM provenance.

create or replace function public.pppp_sync_contact_from_project_email_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
  v_contact_id uuid;
  v_company text;
  v_kind text;
  v_supplier text;
  v_project_name text;
  v_client text;
  v_first timestamptz;
  v_last timestamptz;
  v_count int;
  v_direct int;
  v_projects jsonb;
  v_latest_url text;
  v_latest_msg text;
begin
  if new.project_id is null or lower(coalesce(new.direction,'')) <> 'incoming' then return new; end if;
  v_email := lower(trim(coalesce(new.from_email,'')));
  if v_email = '' then return new; end if;

  -- Internal mailboxes and automated senders are operational traffic, not business relationships.
  if split_part(v_email,'@',2) = 'prissteel.com'
     or split_part(v_email,'@',2) like '%.prissteel.com'
     or v_email in ('arianitti@me.com','arianit.vllahiu@gmail.com')
     or split_part(v_email,'@',1) ~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
  then
    return new;
  end if;

  select p.name,p.client into v_project_name,v_client from public.projects p where p.id=new.project_id;
  select r.supplier_name into v_supplier
  from public.rfq_log r
  where r.project_id=new.project_id and lower(coalesce(r.supplier_email,''))=v_email
  order by r.sent_at desc nulls last,r.created_at desc limit 1;

  if v_supplier is not null then
    v_kind := 'supplier';
    v_company := v_supplier;
  else
    v_kind := 'client';
    v_company := coalesce(nullif(trim(v_client),''),nullif(split_part(v_email,'@',2),''),'Unknown');
  end if;

  select c.id into v_contact_id
  from public.contacts c
  where lower(coalesce(c.email,''))=v_email
  order by (c.hubspot_id is not null) desc,c.created_at asc nulls last
  limit 1;

  if v_contact_id is null then
    insert into public.contacts(kind,company,person,email,role,notes,last_contact)
    values(v_kind,v_company,nullif(trim(coalesce(new.from_name,'')),''),v_email,null,'Auto-linked from Gmail through PPPP project context',coalesce(new.sent_at,new.created_at,now())::date)
    returning id into v_contact_id;
  else
    update public.contacts c
       set person=case when nullif(trim(coalesce(c.person,'')),'') is null then nullif(trim(coalesce(new.from_name,'')),'') else c.person end,
           company=case when nullif(trim(coalesce(c.company,'')),'') is null then v_company else c.company end,
           kind=case when lower(coalesce(c.kind,'')) in ('','client') and v_kind='supplier' then 'supplier' else c.kind end,
           last_contact=greatest(coalesce(c.last_contact,'1900-01-01'::date),coalesce(new.sent_at,new.created_at,now())::date)
     where c.id=v_contact_id;
  end if;

  select min(coalesce(e.sent_at,e.created_at)),max(coalesce(e.sent_at,e.created_at)),count(*),
         count(*) filter (where lower(coalesce(e.from_email,''))=v_email),
         coalesce(jsonb_agg(distinct e.project_id::text) filter (where e.project_id is not null),'[]'::jsonb)
    into v_first,v_last,v_count,v_direct,v_projects
  from public.project_emails e
  where lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming';

  select e.gmail_url,e.gmail_message_id into v_latest_url,v_latest_msg
  from public.project_emails e
  where lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming'
  order by coalesce(e.sent_at,e.created_at) desc nulls last limit 1;

  insert into public.contact_sources(contact_id,email,source,external_id,external_url,first_seen,last_seen,metadata,created_at,updated_at)
  values(v_contact_id::text,v_email,'gmail',null,v_latest_url,coalesce(v_first,now()),coalesce(v_last,now()),
         jsonb_build_object('message_count',coalesce(v_count,1),'project_ids',coalesce(v_projects,'[]'::jsonb),'latest_gmail_message_id',v_latest_msg),now(),now())
  on conflict (contact_id,source) do update
     set email=excluded.email,external_url=excluded.external_url,
         first_seen=least(public.contact_sources.first_seen,excluded.first_seen),
         last_seen=greatest(public.contact_sources.last_seen,excluded.last_seen),
         metadata=excluded.metadata,updated_at=now();

  insert into public.project_contacts(project_id,email,name,company,role,source,source_message_ids,first_seen,last_seen,email_count,direct_count,cc_count,is_primary,status,created_at,updated_at)
  select new.project_id::text,v_email,
         nullif(trim(coalesce(new.from_name,'')),''),v_company,
         case when v_kind='supplier' then 'supplier' else 'client' end,
         'gmail',
         coalesce(jsonb_agg(e.gmail_message_id order by coalesce(e.sent_at,e.created_at)) filter (where e.gmail_message_id is not null),'[]'::jsonb),
         min(coalesce(e.sent_at,e.created_at)),max(coalesce(e.sent_at,e.created_at)),count(*),count(*),0,
         false,'active',now(),now()
  from public.project_emails e
  where e.project_id=new.project_id and lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming'
  on conflict (project_id,email) do update
     set name=coalesce(nullif(trim(public.project_contacts.name),''),nullif(excluded.name,'')),
         company=coalesce(nullif(trim(public.project_contacts.company),''),nullif(excluded.company,'')),
         role=coalesce(nullif(trim(public.project_contacts.role),''),nullif(excluded.role,'')),
         source_message_ids=excluded.source_message_ids,
         first_seen=least(coalesce(public.project_contacts.first_seen,excluded.first_seen),excluded.first_seen),
         last_seen=greatest(coalesce(public.project_contacts.last_seen,excluded.last_seen),excluded.last_seen),
         email_count=excluded.email_count,
         direct_count=excluded.direct_count,
         status=case
           when coalesce(nullif(trim(public.project_contacts.source),''),'gmail') in ('gmail','email-auto') then 'active'
           else public.project_contacts.status
         end,
         updated_at=now();

  return new;
end;
$function$;

create or replace function public.pppp_sync_contact_from_project_email_v1_row(p_email_row_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r public.project_emails%rowtype;
  v_email text;
  v_contact_id uuid;
  v_company text;
  v_kind text;
  v_supplier text;
  v_client text;
  v_first timestamptz;
  v_last timestamptz;
  v_count int;
  v_projects jsonb;
  v_latest_url text;
  v_latest_msg text;
begin
  select * into r from public.project_emails where id=p_email_row_id;
  if not found or r.project_id is null or lower(coalesce(r.direction,'')) <> 'incoming' then return; end if;
  v_email := lower(trim(coalesce(r.from_email,'')));
  if v_email='' then return; end if;
  if split_part(v_email,'@',2) = 'prissteel.com'
     or split_part(v_email,'@',2) like '%.prissteel.com'
     or v_email in ('arianitti@me.com','arianit.vllahiu@gmail.com')
     or split_part(v_email,'@',1) ~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
  then
    return;
  end if;

  select p.client into v_client from public.projects p where p.id=r.project_id;
  select q.supplier_name into v_supplier
  from public.rfq_log q
  where q.project_id=r.project_id and lower(coalesce(q.supplier_email,''))=v_email
  order by q.sent_at desc nulls last,q.created_at desc limit 1;

  if v_supplier is not null then
    v_kind:='supplier';
    v_company:=v_supplier;
  else
    v_kind:='client';
    v_company:=coalesce(nullif(trim(v_client),''),nullif(split_part(v_email,'@',2),''),'Unknown');
  end if;

  select c.id into v_contact_id
  from public.contacts c
  where lower(coalesce(c.email,''))=v_email
  order by (c.hubspot_id is not null) desc,c.created_at asc nulls last limit 1;

  if v_contact_id is null then
    insert into public.contacts(kind,company,person,email,role,notes,last_contact)
    values(v_kind,v_company,nullif(trim(coalesce(r.from_name,'')),''),v_email,null,'Auto-linked from Gmail through PPPP project context',coalesce(r.sent_at,r.created_at,now())::date)
    returning id into v_contact_id;
  else
    update public.contacts c
       set person=case when nullif(trim(coalesce(c.person,'')),'') is null then nullif(trim(coalesce(r.from_name,'')),'') else c.person end,
           company=case when nullif(trim(coalesce(c.company,'')),'') is null then v_company else c.company end,
           kind=case when lower(coalesce(c.kind,'')) in ('','client') and v_kind='supplier' then 'supplier' else c.kind end,
           last_contact=greatest(coalesce(c.last_contact,'1900-01-01'::date),coalesce(r.sent_at,r.created_at,now())::date)
     where c.id=v_contact_id;
  end if;

  select min(coalesce(e.sent_at,e.created_at)),max(coalesce(e.sent_at,e.created_at)),count(*),
         coalesce(jsonb_agg(distinct e.project_id::text) filter (where e.project_id is not null),'[]'::jsonb)
    into v_first,v_last,v_count,v_projects
  from public.project_emails e
  where lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming';

  select e.gmail_url,e.gmail_message_id into v_latest_url,v_latest_msg
  from public.project_emails e
  where lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming'
  order by coalesce(e.sent_at,e.created_at) desc nulls last limit 1;

  insert into public.contact_sources(contact_id,email,source,external_id,external_url,first_seen,last_seen,metadata,created_at,updated_at)
  values(v_contact_id::text,v_email,'gmail',null,v_latest_url,coalesce(v_first,now()),coalesce(v_last,now()),
         jsonb_build_object('message_count',coalesce(v_count,1),'project_ids',coalesce(v_projects,'[]'::jsonb),'latest_gmail_message_id',v_latest_msg),now(),now())
  on conflict (contact_id,source) do update
     set email=excluded.email,external_url=excluded.external_url,
         first_seen=least(public.contact_sources.first_seen,excluded.first_seen),
         last_seen=greatest(public.contact_sources.last_seen,excluded.last_seen),
         metadata=excluded.metadata,updated_at=now();

  insert into public.project_contacts(project_id,email,name,company,role,source,source_message_ids,first_seen,last_seen,email_count,direct_count,cc_count,is_primary,status,created_at,updated_at)
  select r.project_id::text,v_email,
         nullif(trim(coalesce(r.from_name,'')),''),v_company,
         case when v_kind='supplier' then 'supplier' else 'client' end,
         'gmail',
         coalesce(jsonb_agg(e.gmail_message_id order by coalesce(e.sent_at,e.created_at)) filter (where e.gmail_message_id is not null),'[]'::jsonb),
         min(coalesce(e.sent_at,e.created_at)),max(coalesce(e.sent_at,e.created_at)),count(*),count(*),0,
         false,'active',now(),now()
  from public.project_emails e
  where e.project_id=r.project_id and lower(coalesce(e.from_email,''))=v_email and lower(coalesce(e.direction,''))='incoming'
  on conflict (project_id,email) do update
     set name=coalesce(nullif(trim(public.project_contacts.name),''),nullif(excluded.name,'')),
         company=coalesce(nullif(trim(public.project_contacts.company),''),nullif(excluded.company,'')),
         role=coalesce(nullif(trim(public.project_contacts.role),''),nullif(excluded.role,'')),
         source_message_ids=excluded.source_message_ids,
         first_seen=least(coalesce(public.project_contacts.first_seen,excluded.first_seen),excluded.first_seen),
         last_seen=greatest(coalesce(public.project_contacts.last_seen,excluded.last_seen),excluded.last_seen),
         email_count=excluded.email_count,
         direct_count=excluded.direct_count,
         status=case
           when coalesce(nullif(trim(public.project_contacts.source),''),'gmail') in ('gmail','email-auto') then 'active'
           else public.project_contacts.status
         end,
         updated_at=now();
end;
$function$;

create or replace function public.pppp_rebuild_gmail_contact_master_v1()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  n int := 0;
begin
  for r in
    select distinct on (lower(from_email),project_id) *
    from public.project_emails
    where project_id is not null
      and lower(coalesce(direction,''))='incoming'
      and nullif(trim(coalesce(from_email,'')),'') is not null
      and split_part(lower(trim(from_email)),'@',2) <> 'prissteel.com'
      and split_part(lower(trim(from_email)),'@',2) not like '%.prissteel.com'
      and lower(trim(from_email)) not in ('arianitti@me.com','arianit.vllahiu@gmail.com')
      and split_part(lower(trim(from_email)),'@',1) !~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
    order by lower(from_email),project_id,coalesce(sent_at,created_at) desc
  loop
    perform public.pppp_sync_contact_from_project_email_v1_row(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$function$;

-- Remove only auto-generated project relationships for automated mailboxes.
delete from public.project_contacts
where coalesce(is_primary,false)=false
  and source in ('gmail','email-auto')
  and split_part(lower(trim(email)),'@',1) ~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)';

-- Remove Gmail provenance only for canonical contacts that were created by the Gmail auto-link path.
delete from public.contact_sources cs
using public.contacts c
where cs.contact_id=c.id::text
  and cs.source='gmail'
  and c.hubspot_id is null
  and c.notes='Auto-linked from Gmail through PPPP project context'
  and split_part(lower(trim(c.email)),'@',1) ~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)';

-- Delete the now-orphaned fake canonical contacts only when no other CRM/source identity remains.
delete from public.contacts c
where c.hubspot_id is null
  and c.notes='Auto-linked from Gmail through PPPP project context'
  and split_part(lower(trim(c.email)),'@',1) ~* '^(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc)([+._-]|$)'
  and not exists (
    select 1 from public.contact_sources cs where cs.contact_id=c.id::text
  );
