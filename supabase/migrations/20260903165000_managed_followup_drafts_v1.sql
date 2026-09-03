begin;

create table if not exists public.pppp_followup_drafts_v1 (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_source text not null,
  party_type text not null check (party_type in ('supplier','client')),
  contact_email text not null,
  due_date date not null,
  last_outgoing_email_id bigint references public.project_emails(id) on delete set null,
  last_outgoing_gmail_message_id text,
  last_outgoing_gmail_thread_id text,
  last_outgoing_rfc822_message_id text,
  last_outgoing_subject text,
  last_outgoing_snippet text,
  lang text not null default 'en' check (lang in ('sq','de','sr','en')),
  status text not null default 'candidate' check (status in ('candidate','draft_ready','superseded')),
  gmail_draft_id text,
  gmail_message_id text,
  gmail_thread_id text,
  human_send_required boolean not null default true,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(task_id)
);

create index if not exists pppp_followup_drafts_status_due_idx
  on public.pppp_followup_drafts_v1(status,due_date,updated_at);
create index if not exists pppp_followup_drafts_project_idx
  on public.pppp_followup_drafts_v1(project_id,updated_at desc);

alter table public.pppp_followup_drafts_v1 enable row level security;
drop policy if exists pppp_followup_drafts_read on public.pppp_followup_drafts_v1;
create policy pppp_followup_drafts_read on public.pppp_followup_drafts_v1
  for select to authenticated using (true);
revoke insert,update,delete on public.pppp_followup_drafts_v1 from authenticated,anon;
grant select on public.pppp_followup_drafts_v1 to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_followup_drafts_v1 to supabase_read_only_user;
  end if;
end $$;

create or replace function public.pppp_followup_language_v1(p_subject text,p_snippet text)
returns text
language sql
immutable
set search_path=pg_catalog
as $$
  select case
    when lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~ '(për|persh|përsh|faleminder|ju lutem|kërkes|kerkese|ofertën|oferten|çmim|cmim)' then 'sq'
    when lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~ '(angebot|anfrage|bitte|danke|liefer|projekt|schweiß|schweiss|freundlichen grüßen|freundlichen gruessen)' then 'de'
    when lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~ '(ponud|poštovan|postovan|molim|hvala|rok|dostav|projekat|projektu)' then 'sr'
    else 'en'
  end;
$$;

-- Create a client follow-up task only when the wait state is backed by an exact outgoing
-- client email and at least seven days have passed without a later client-side incoming email.
create or replace function public.pppp_refresh_client_wait_followups_v1()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  r record;
  v_created integer:=0;
begin
  for r in
    select p.id as project_id,p.name as project_name,p.operational_state_at,
           e.id as email_id,e.gmail_message_id,e.gmail_thread_id,e.rfc822_message_id,e.subject,e.snippet,
           coalesce((
             select x.email
             from unnest(coalesce(e.to_emails,'{}'::text[])) x(email)
             where public.pppp_project_email_party_role_v1(p.id,x.email)='client'
             limit 1
           ),'') as contact_email
    from public.projects p
    join lateral (
      select pe.*
      from public.project_emails pe
      where pe.project_id=p.id
        and lower(coalesce(pe.direction,''))='outgoing'
        and public.pppp_project_email_has_client_recipient_v1(p.id,pe.to_emails)
        and abs(extract(epoch from (coalesce(pe.sent_at,pe.created_at)-p.operational_state_at)))<=2
      order by coalesce(pe.sent_at,pe.created_at) desc,pe.id desc
      limit 1
    ) e on true
    where p.operational_state='wait_for_client'
      and p.operational_state_source in ('client_reply_sent_auto_v1','client_offer_sent_auto')
      and p.operational_state_at <= now()-interval '7 days'
      and not exists(
        select 1 from public.project_emails ni
        where ni.project_id=p.id
          and lower(coalesce(ni.direction,''))='incoming'
          and coalesce(ni.sent_at,ni.created_at)>p.operational_state_at
          and public.pppp_project_email_party_role_v1(p.id,ni.from_email) not in ('supplier','internal')
      )
  loop
    if coalesce(r.contact_email,'')='' then continue; end if;
    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref)
    values(
      r.project_id,
      'Follow-up klienti — '||r.project_name,
      'PPPP: kanë kaluar të paktën 7 ditë nga emaili i fundit i lidhur me klientin dhe nuk ka ardhur përgjigje e re. Përgatit follow-up, por mos e dërgo pa shqyrtim njerëzor.',
      current_date,'normal','hapur','client_wait_followup_auto',r.contact_email,'klient',
      'project:'||r.project_id::text||':client-followup:'||coalesce(r.gmail_message_id,r.email_id::text)
    )
    on conflict(source,source_ref) do update
      set contact_email=excluded.contact_email,
          due_date=least(public.tasks.due_date,excluded.due_date),
          detail=excluded.detail
    where lower(coalesce(public.tasks.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar');
    if found then v_created:=v_created+1; end if;
  end loop;
  return jsonb_build_object('ok',true,'eligible_or_refreshed',v_created);
end;
$$;

-- Build candidates only from canonical supplier waits or the conservative client-wait task above.
-- A candidate is valid only if a real outgoing Gmail message exists and the target has not replied later.
create or replace function public.pppp_refresh_followup_draft_candidates_v1()
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_upserted integer:=0;
  v_superseded integer:=0;
begin
  perform public.pppp_refresh_client_wait_followups_v1();

  update public.pppp_followup_drafts_v1 d
     set status='superseded',updated_at=now(),last_error=null
   where d.status in ('candidate','draft_ready')
     and (
       not exists(select 1 from public.tasks t where t.id=d.task_id and t.status='hapur')
       or exists(
         select 1 from public.project_emails ri
         where ri.project_id=d.project_id
           and lower(coalesce(ri.direction,''))='incoming'
           and lower(coalesce(ri.from_email,''))=lower(d.contact_email)
           and coalesce(ri.sent_at,ri.created_at) > coalesce((select coalesce(pe.sent_at,pe.created_at) from public.project_emails pe where pe.id=d.last_outgoing_email_id),'-infinity'::timestamptz)
       )
     );
  get diagnostics v_superseded=row_count;

  insert into public.pppp_followup_drafts_v1(
    task_id,project_id,task_source,party_type,contact_email,due_date,
    last_outgoing_email_id,last_outgoing_gmail_message_id,last_outgoing_gmail_thread_id,
    last_outgoing_rfc822_message_id,last_outgoing_subject,last_outgoing_snippet,lang,status,updated_at
  )
  select t.id,t.project_id,t.source,
         case when t.source='client_wait_followup_auto' then 'client' else 'supplier' end,
         lower(btrim(t.contact_email)),t.due_date,
         oe.id,oe.gmail_message_id,oe.gmail_thread_id,oe.rfc822_message_id,oe.subject,oe.snippet,
         public.pppp_followup_language_v1(oe.subject,oe.snippet),'candidate',now()
  from public.tasks t
  join lateral (
    select pe.*
    from public.project_emails pe
    where pe.project_id=t.project_id
      and lower(coalesce(pe.direction,''))='outgoing'
      and exists(select 1 from unnest(coalesce(pe.to_emails,'{}'::text[])) x where lower(x)=lower(btrim(t.contact_email)))
    order by coalesce(pe.sent_at,pe.created_at) desc,pe.id desc
    limit 1
  ) oe on true
  where t.status='hapur'
    and t.source in ('supplier_wait_auto','client_wait_followup_auto')
    and t.project_id is not null
    and coalesce(btrim(t.contact_email),'')<>''
    and t.due_date is not null and t.due_date<=current_date
    and coalesce(oe.gmail_message_id,'')<>''
    and coalesce(oe.gmail_thread_id,'')<>''
    and not exists(
      select 1 from public.project_emails ri
      where ri.project_id=t.project_id
        and lower(coalesce(ri.direction,''))='incoming'
        and lower(coalesce(ri.from_email,''))=lower(btrim(t.contact_email))
        and coalesce(ri.sent_at,ri.created_at)>coalesce(oe.sent_at,oe.created_at)
    )
  on conflict(task_id) do update
    set project_id=excluded.project_id,task_source=excluded.task_source,party_type=excluded.party_type,
        contact_email=excluded.contact_email,due_date=excluded.due_date,
        last_outgoing_email_id=excluded.last_outgoing_email_id,
        last_outgoing_gmail_message_id=excluded.last_outgoing_gmail_message_id,
        last_outgoing_gmail_thread_id=excluded.last_outgoing_gmail_thread_id,
        last_outgoing_rfc822_message_id=excluded.last_outgoing_rfc822_message_id,
        last_outgoing_subject=excluded.last_outgoing_subject,last_outgoing_snippet=excluded.last_outgoing_snippet,
        lang=excluded.lang,
        status=case when public.pppp_followup_drafts_v1.gmail_draft_id is null then 'candidate' else public.pppp_followup_drafts_v1.status end,
        updated_at=now(),last_error=null;
  get diagnostics v_upserted=row_count;

  return jsonb_build_object('ok',true,'upserted',v_upserted,'superseded',v_superseded);
end;
$$;

create or replace view public.pppp_followup_draft_queue_v1
with (security_invoker=true)
as
select d.*,p.name as project_name,p.client,t.title as task_title,t.detail as task_detail
from public.pppp_followup_drafts_v1 d
join public.tasks t on t.id=d.task_id
left join public.projects p on p.id=d.project_id
where d.status='candidate' and t.status='hapur' and d.due_date<=current_date;

grant select on public.pppp_followup_draft_queue_v1 to authenticated,service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_followup_draft_queue_v1 to supabase_read_only_user;
  end if;
end $$;

revoke all on function public.pppp_refresh_client_wait_followups_v1() from public,anon,authenticated;
revoke all on function public.pppp_refresh_followup_draft_candidates_v1() from public,anon,authenticated;
grant execute on function public.pppp_refresh_client_wait_followups_v1() to service_role;
grant execute on function public.pppp_refresh_followup_draft_candidates_v1() to service_role;

create or replace function public.pppp_followup_draft_generator_internal_request(p_limit integer default 20)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_limit integer:=least(50,greatest(1,coalesce(p_limit,20))); begin
  perform public.pppp_refresh_followup_draft_candidates_v1();
  return public.pppp_enqueue_automation_http_v1(
    'pppp-followup-draft-generator',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-followup-draft-generator?limit='||v_limit::text,
    'gmail_tracker_cron_secret',120000,3
  );
end;$$;
revoke all on function public.pppp_followup_draft_generator_internal_request(integer) from public,anon,authenticated;
grant execute on function public.pppp_followup_draft_generator_internal_request(integer) to service_role;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='pppp-followup-drafts-hourly' loop perform cron.unschedule(j); end loop;
    perform cron.schedule('pppp-followup-drafts-hourly','22 * * * *','select public.pppp_followup_draft_generator_internal_request(20);');
  end if;
end $$;

commit;
