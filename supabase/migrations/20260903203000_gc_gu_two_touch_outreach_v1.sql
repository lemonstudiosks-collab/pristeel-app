begin;

create or replace function public.pppp_gc_followup_due_v1(p_sent_at timestamptz)
returns date
language plpgsql
immutable
set search_path=pg_catalog
as $$
declare
  d date;
  dow integer;
begin
  if p_sent_at is null then return null; end if;
  d := (p_sent_at at time zone 'Europe/Belgrade')::date + 7;
  dow := extract(isodow from d)::integer;
  if dow=6 then d:=d+2; elsif dow=7 then d:=d+1; end if;
  return d;
end;
$$;

create or replace function public.pppp_gc_mark_first_sent_v1(
  p_prospect_id uuid,
  p_message_id text,
  p_thread_id text,
  p_sent_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  p public.pppp_gc_prospects_v1%rowtype;
  v_outreach_id bigint;
  v_due date;
begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id for update;
  if not found then raise exception 'Prospect not found'; end if;
  if p.do_not_contact or p.status in ('do_not_contact','bounced') then raise exception 'Prospect is not contactable'; end if;
  if p.first_sent_at is not null then
    return jsonb_build_object('ok',true,'already_recorded',true,'first_sent_at',p.first_sent_at,'followup_due_date',p.followup_due_date);
  end if;
  if p_sent_at is null then raise exception 'sent_at required'; end if;

  v_due:=public.pppp_gc_followup_due_v1(p_sent_at);
  v_outreach_id:=p.outreach_contact_id;

  if v_outreach_id is null then
    insert into public.outreach_contacts(
      company_domain,contact_email,country,touch_1,status,bounced,replied,meeting,closed,follow_up_date,notes,
      gmail_thread_id,gmail_message_id,company_name,source,company_type,cooperation_angle,outreach_kind
    ) values(
      p.company_domain,p.contact_email,p.country,(p_sent_at at time zone 'Europe/Belgrade')::date,'Sent',false,false,false,false,v_due,
      'PPPP GC/GU Prospecting · two-touch sequence · prospect_id='||p.id::text,
      p_thread_id,p_message_id,p.company_name,'gc_gu_prospecting',p.company_type,'Structural steel fabrication capacity','gc_gu_prospecting'
    ) returning id into v_outreach_id;
  else
    update public.outreach_contacts
       set company_domain=coalesce(company_domain,p.company_domain),
           contact_email=coalesce(contact_email,p.contact_email),
           company_name=coalesce(company_name,p.company_name),
           country=coalesce(country,p.country),
           touch_1=coalesce(touch_1,(p_sent_at at time zone 'Europe/Belgrade')::date),
           status=case when coalesce(replied,false) then status else 'Sent' end,
           follow_up_date=case when coalesce(replied,false) then null else v_due end,
           gmail_message_id=coalesce(p_message_id,gmail_message_id),
           gmail_thread_id=coalesce(p_thread_id,gmail_thread_id),
           source=coalesce(source,'gc_gu_prospecting'),
           outreach_kind=coalesce(outreach_kind,'gc_gu_prospecting'),
           updated_at=now()
     where id=v_outreach_id;
  end if;

  update public.pppp_gc_prospects_v1
     set outreach_contact_id=v_outreach_id,
         first_gmail_message_id=p_message_id,
         first_gmail_thread_id=p_thread_id,
         first_sent_at=p_sent_at,
         followup_due_date=v_due,
         status='contacted_1',
         updated_at=now(),last_error=null
   where id=p.id;

  if p.contact_id is not null then
    update public.contacts
       set last_contact=greatest(coalesce(last_contact,(p_sent_at at time zone 'Europe/Belgrade')::date),(p_sent_at at time zone 'Europe/Belgrade')::date)
     where id=p.contact_id;
  end if;

  return jsonb_build_object('ok',true,'outreach_contact_id',v_outreach_id,'followup_due_date',v_due,'status','contacted_1');
end;
$$;

create or replace function public.pppp_gc_mark_second_sent_v1(
  p_prospect_id uuid,
  p_message_id text,
  p_thread_id text,
  p_sent_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  p public.pppp_gc_prospects_v1%rowtype;
begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id for update;
  if not found then raise exception 'Prospect not found'; end if;
  if p.second_sent_at is not null then return jsonb_build_object('ok',true,'already_recorded',true,'second_sent_at',p.second_sent_at); end if;
  if p.first_sent_at is null then raise exception 'First send is not recorded'; end if;
  if p_sent_at is null then raise exception 'sent_at required'; end if;

  if p.outreach_contact_id is not null then
    update public.outreach_contacts
       set touch_2=coalesce(touch_2,(p_sent_at at time zone 'Europe/Belgrade')::date),
           status=case when coalesce(replied,false) then status else 'Sent 2' end,
           follow_up_date=null,
           gmail_message_id=coalesce(p_message_id,gmail_message_id),
           gmail_thread_id=coalesce(p_thread_id,gmail_thread_id),
           updated_at=now()
     where id=p.outreach_contact_id;
  end if;

  update public.pppp_gc_prospects_v1
     set second_gmail_message_id=p_message_id,
         first_gmail_thread_id=coalesce(p_thread_id,first_gmail_thread_id),
         second_sent_at=p_sent_at,
         status='contacted_2',
         no_more_auto=true,
         updated_at=now(),last_error=null
   where id=p.id;

  if p.contact_id is not null then
    update public.contacts
       set last_contact=greatest(coalesce(last_contact,(p_sent_at at time zone 'Europe/Belgrade')::date),(p_sent_at at time zone 'Europe/Belgrade')::date)
     where id=p.contact_id;
  end if;
  return jsonb_build_object('ok',true,'status','contacted_2','no_more_auto',true);
end;
$$;

create or replace function public.pppp_gc_mark_replied_v1(p_prospect_id uuid,p_replied_at timestamptz,p_reason text default 'gmail_domain_reply')
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare p public.pppp_gc_prospects_v1%rowtype; begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id for update;
  if not found then raise exception 'Prospect not found'; end if;
  update public.pppp_gc_prospects_v1
     set replied_at=coalesce(replied_at,p_replied_at,now()),status='replied',no_more_auto=true,followup_due_date=null,
         duplicate_reason=coalesce(duplicate_reason,p_reason),updated_at=now(),last_error=null
   where id=p.id;
  if p.outreach_contact_id is not null then
    update public.outreach_contacts set replied=true,status='Replied',follow_up_date=null,updated_at=now() where id=p.outreach_contact_id;
  end if;
  return jsonb_build_object('ok',true,'status','replied','no_more_auto',true);
end;$$;

create or replace function public.pppp_gc_mark_bounced_v1(p_prospect_id uuid,p_bounced_at timestamptz,p_reason text default 'gmail_bounce')
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare p public.pppp_gc_prospects_v1%rowtype; begin
  select * into p from public.pppp_gc_prospects_v1 where id=p_prospect_id for update;
  if not found then raise exception 'Prospect not found'; end if;
  update public.pppp_gc_prospects_v1
     set bounced_at=coalesce(bounced_at,p_bounced_at,now()),status='bounced',no_more_auto=true,followup_due_date=null,
         duplicate_reason=coalesce(duplicate_reason,p_reason),updated_at=now(),last_error=null
   where id=p.id;
  if p.outreach_contact_id is not null then
    update public.outreach_contacts set bounced=true,status='Bounced',follow_up_date=null,updated_at=now() where id=p.outreach_contact_id;
  end if;
  return jsonb_build_object('ok',true,'status','bounced','no_more_auto',true);
end;$$;

create or replace function public.pppp_gc_mark_gmail_history_duplicate_v1(p_prospect_id uuid,p_reason text default 'Historical Gmail sent message exists for company domain')
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.pppp_gc_prospects_v1
     set status='already_contacted',no_more_auto=true,duplicate_reason=coalesce(nullif(p_reason,''),'Historical Gmail outreach exists'),updated_at=now()
   where id=p_prospect_id
     and first_sent_at is null
     and status not in ('replied','contacted_1','contacted_2','bounced','do_not_contact');
  return jsonb_build_object('ok',true,'status',(select status from public.pppp_gc_prospects_v1 where id=p_prospect_id));
end;$$;

create or replace function public.pppp_gc_mark_no_response_v1(p_prospect_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  update public.pppp_gc_prospects_v1
     set status='no_response_2',no_more_auto=true,updated_at=now()
   where id=p_prospect_id and status='contacted_2' and second_sent_at is not null
     and second_sent_at <= now()-interval '7 days' and replied_at is null and bounced_at is null;
  if found then
    update public.outreach_contacts o set status='No response after 2 contacts',follow_up_date=null,updated_at=now()
    from public.pppp_gc_prospects_v1 p where p.id=p_prospect_id and p.outreach_contact_id=o.id;
  end if;
  return jsonb_build_object('ok',true,'status',(select status from public.pppp_gc_prospects_v1 where id=p_prospect_id));
end;$$;

create or replace view public.pppp_gc_outreach_review_v1
with (security_invoker=true)
as
select
  p.id,p.company_name,p.company_domain,p.country,p.country_code,p.company_type,p.relevance_score,p.status,p.language,
  p.contact_name,p.contact_email,p.contact_role,p.contact_source_url,p.contact_confidence,p.current_projects,p.recent_projects,p.evidence,
  p.first_draft_id,p.first_draft_created_at,p.first_gmail_message_id,p.first_gmail_thread_id,p.first_sent_at,p.followup_due_date,
  p.second_draft_id,p.second_draft_created_at,p.second_gmail_message_id,p.second_sent_at,p.replied_at,p.bounced_at,
  p.do_not_contact,p.no_more_auto,p.human_send_required,p.duplicate_reason,p.last_error,p.first_discovered_at,p.last_seen_at,p.updated_at
from public.pppp_gc_prospects_v1 p
where p.status in ('contact_ready','draft_ready','contacted_1','followup_due','draft_2_ready','contacted_2','replied','no_response_2','already_contacted','bounced','human_review')
order by
  case p.status when 'draft_ready' then 1 when 'draft_2_ready' then 2 when 'followup_due' then 3 when 'contact_ready' then 4 else 9 end,
  p.relevance_score desc,p.updated_at desc;

grant select on public.pppp_gc_outreach_review_v1 to authenticated,service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant select on public.pppp_gc_outreach_review_v1 to supabase_read_only_user;
  end if;
end $$;

revoke all on function public.pppp_gc_mark_first_sent_v1(uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.pppp_gc_mark_second_sent_v1(uuid,text,text,timestamptz) from public,anon,authenticated;
revoke all on function public.pppp_gc_mark_replied_v1(uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.pppp_gc_mark_bounced_v1(uuid,timestamptz,text) from public,anon,authenticated;
revoke all on function public.pppp_gc_mark_gmail_history_duplicate_v1(uuid,text) from public,anon,authenticated;
revoke all on function public.pppp_gc_mark_no_response_v1(uuid) from public,anon,authenticated;
grant execute on function public.pppp_gc_mark_first_sent_v1(uuid,text,text,timestamptz) to service_role;
grant execute on function public.pppp_gc_mark_second_sent_v1(uuid,text,text,timestamptz) to service_role;
grant execute on function public.pppp_gc_mark_replied_v1(uuid,timestamptz,text) to service_role;
grant execute on function public.pppp_gc_mark_bounced_v1(uuid,timestamptz,text) to service_role;
grant execute on function public.pppp_gc_mark_gmail_history_duplicate_v1(uuid,text) to service_role;
grant execute on function public.pppp_gc_mark_no_response_v1(uuid) to service_role;

create or replace function public.pppp_gc_outreach_internal_request(p_limit integer default 25)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_limit integer:=least(50,greatest(1,coalesce(p_limit,25))); begin
  return public.pppp_enqueue_automation_http_v1(
    'pppp-gc-outreach',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-gc-outreach?limit='||v_limit::text,
    'gmail_tracker_cron_secret',120000,3
  );
end;$$;
revoke all on function public.pppp_gc_outreach_internal_request(integer) from public,anon,authenticated;
grant execute on function public.pppp_gc_outreach_internal_request(integer) to service_role;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='pppp-gc-outreach-hourly' loop perform cron.unschedule(j); end loop;
    perform cron.schedule('pppp-gc-outreach-hourly','42 * * * *','select public.pppp_gc_outreach_internal_request(25);');
  end if;
end $$;

commit;
