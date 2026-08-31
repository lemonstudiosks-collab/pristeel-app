-- TED award sales outreach tracking.
-- Keeps TED awards as opportunities until explicitly promoted to projects.

alter table public.project_emails
  add column if not exists tender_watch_id uuid null references public.kek_tender_watch(id) on delete set null;

create index if not exists project_emails_tender_sent_idx
  on public.project_emails (tender_watch_id, sent_at desc)
  where tender_watch_id is not null;

alter table public.outreach_contacts
  add column if not exists tender_watch_id uuid null references public.kek_tender_watch(id) on delete set null,
  add column if not exists gmail_thread_id text null,
  add column if not exists gmail_message_id text null,
  add column if not exists company_name text null,
  add column if not exists source text null;

create index if not exists outreach_contacts_tender_idx
  on public.outreach_contacts (tender_watch_id)
  where tender_watch_id is not null;

create unique index if not exists outreach_contacts_tender_email_uidx
  on public.outreach_contacts (tender_watch_id, lower(contact_email))
  where tender_watch_id is not null and contact_email is not null;

create table if not exists public.tender_email_links (
  id bigserial primary key,
  tender_watch_id uuid not null references public.kek_tender_watch(id) on delete cascade,
  gmail_message_id text not null references public.project_emails(gmail_message_id) on delete cascade,
  gmail_thread_id text null,
  link_method text not null default 'ted-outreach-auto-v1',
  confidence integer not null default 100,
  created_at timestamptz not null default now(),
  unique (tender_watch_id, gmail_message_id)
);

create index if not exists tender_email_links_tender_idx
  on public.tender_email_links (tender_watch_id, created_at desc);
create index if not exists tender_email_links_thread_idx
  on public.tender_email_links (gmail_thread_id)
  where gmail_thread_id is not null;

create or replace view public.pppp_ted_sales_outreach_v1 as
select
  k.id as tender_watch_id,
  k.publication_no,
  k.procurement_no,
  k.published_date,
  k.authority,
  k.title,
  k.category,
  k.relevance_score,
  k.status as opportunity_status,
  k.project_id,
  k.payload #>> '{winner,name}' as winner_name,
  coalesce(k.payload #>> '{winner,company_type}','unknown') as winner_company_type,
  k.payload ->> 'cooperation_angle' as cooperation_angle,
  coalesce((k.payload->>'human_action_required')::boolean,false) as human_action_required,
  nullif(k.payload->>'next_check_on','')::date as next_check_on,
  oc.company_name,
  oc.contact_email,
  oc.company_domain,
  oc.touch_1,
  oc.touch_2,
  oc.touch_3,
  oc.status as outreach_status,
  oc.replied,
  oc.meeting,
  oc.bounced,
  oc.closed,
  oc.follow_up_date,
  oc.gmail_message_id as outreach_gmail_message_id,
  oc.gmail_thread_id as outreach_gmail_thread_id,
  le.gmail_message_id as latest_gmail_message_id,
  le.gmail_thread_id as latest_gmail_thread_id,
  le.direction as latest_email_direction,
  le.subject as latest_email_subject,
  le.sent_at as latest_email_at,
  le.gmail_url as latest_gmail_url,
  le.match_method as latest_email_match_method,
  le.match_confidence as latest_email_match_confidence,
  (select count(*) from public.tender_email_links telc where telc.tender_watch_id=k.id) as linked_email_count
from public.kek_tender_watch k
left join lateral (
  select o.*
  from public.outreach_contacts o
  where o.tender_watch_id=k.id
  order by coalesce(o.touch_3,o.touch_2,o.touch_1) desc nulls last, o.updated_at desc nulls last, o.id desc
  limit 1
) oc on true
left join lateral (
  select pe.*
  from public.tender_email_links tel
  join public.project_emails pe on pe.gmail_message_id=tel.gmail_message_id
  where tel.tender_watch_id=k.id
  order by pe.sent_at desc, pe.id desc
  limit 1
) le on true
where upper(coalesce(k.payload->>'source',''))='TED'
  and coalesce(k.payload->>'notice_phase','')='award';

create or replace function private.gmail_ted_sales_reconcile_internal_request(p_limit integer default 300)
returns bigint
language plpgsql
security definer
set search_path = public, private, net, vault
as $$
declare
  req_id bigint;
  cron_secret text;
begin
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;

  if cron_secret is null or length(cron_secret)=0 then
    raise exception 'gmail_tracker_cron_secret is not configured';
  end if;

  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-ted-sales-reconciler?days=3&limit=' || greatest(20,least(coalesce(p_limit,300),1000))::text,
    headers := jsonb_build_object('x-pppp-cron-secret',cron_secret),
    timeout_milliseconds := 120000
  ) into req_id;
  return req_id;
end;
$$;

revoke all on function private.gmail_ted_sales_reconcile_internal_request(integer) from public;

-- Run TED reconciliation before normal project intake so drafts/unsent messages
-- never become project evidence and TED replies remain attached to their award.
do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='gmail-project-intake-5m' limit 1;
  if v_jobid is not null then
    perform cron.alter_job(
      v_jobid,
      command := $cmd$
        select private.gmail_ted_sales_reconcile_internal_request(300);
        select public.pppp_reconcile_email_context_v1(7);
        select net.http_get(
          url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-project-intake?days=2&limit=300',
          headers := jsonb_build_object('x-pppp-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1)),
          timeout_milliseconds := 120000
        );
      $cmd$
    );
  end if;
end $$;
