-- Central invariant: shared e-Prokurimi system notifications must not be linked to projects by generic email identity/history methods.
-- Procurement-specific/manual linking remains allowed.

create or replace function public.pppp_guard_generic_system_mail_project_link_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if lower(trim(coalesce(new.from_email,''))) = 'eprokurimi@rks-gov.net'
     and new.project_id is not null
     and (
       coalesce(new.match_method,'') = 'server-identity-auto-link-v3'
       or coalesce(new.match_method,'') like 'identity-autolink-v1:%'
       or coalesce(new.match_method,'') like 'project-contact-unique%'
       or coalesce(new.match_method,'') in ('contact_history_auto','gmail_thread_auto')
     ) then
    new.project_id := null;
    new.suggested_project_id := null;
    new.match_method := 'system-mail-detached:eprokurimi';
    new.match_confidence := 0;
    new.needs_review := true;
    new.review_reason := 'Shared e-Prokurimi notification blocked from generic project autolink; requires procurement-specific or explicit manual resolution.';
    new.updated_at := now();
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_pppp_guard_generic_system_mail_project_link_v1 on public.project_emails;
create trigger trg_pppp_guard_generic_system_mail_project_link_v1
before update of project_id,suggested_project_id,match_method on public.project_emails
for each row execute function public.pppp_guard_generic_system_mail_project_link_v1();

create or replace function public.pppp_guard_generic_system_mail_link_insert_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_from_email text;
begin
  select lower(trim(coalesce(e.from_email,''))) into v_from_email
  from public.project_emails e
  where e.gmail_message_id = new.gmail_message_id
  order by e.sent_at desc nulls last
  limit 1;

  if v_from_email = 'eprokurimi@rks-gov.net'
     and (
       coalesce(new.link_method,'') = 'server-identity-auto-link-v3'
       or coalesce(new.link_method,'') = 'identity-autolink-v1'
       or coalesce(new.link_method,'') like 'project-contact-unique%'
       or coalesce(new.link_method,'') in ('contact_history_auto','gmail_thread_auto')
     ) then
    return null;
  end if;
  return new;
end;
$function$;

drop trigger if exists trg_pppp_guard_generic_system_mail_link_insert_v1 on public.project_email_links;
create trigger trg_pppp_guard_generic_system_mail_link_insert_v1
before insert on public.project_email_links
for each row execute function public.pppp_guard_generic_system_mail_link_insert_v1();

-- Re-clean only the three proven KEK-26-6443-5-2-1 notifications from the KEK-26-6946-5-1-1 reservoir project.
do $cleanup$
declare
  v_project uuid;
  v_last_real_email timestamptz;
  v_wrong text[] := array['1a080d5fbb8d333f','1a080d584ef2fdc0','1a080d543aa66a33'];
begin
  select id into v_project
  from public.projects
  where ref='KEK-26-6946-5-1-1' or business_ref='KEK-26-6946-5-1-1'
  order by created_at desc
  limit 1;

  if v_project is null then raise exception 'KEK-26-6946-5-1-1 project not found'; end if;

  delete from public.project_email_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong);
  delete from public.project_attachment_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong);
  delete from public.pppp_project_context_facts
   where project_id=v_project and source_ref=any(v_wrong);
  delete from public.tasks
   where project_id=v_project and source='semantic_brain_auto'
     and source_ref=any(array['email:event:'||v_wrong[1],'email:event:'||v_wrong[2],'email:event:'||v_wrong[3]]);

  update public.project_emails
     set project_id=null,
         suggested_project_id=null,
         match_method='project-contact-unique-detached:kek-6443-cleanup-v3',
         match_confidence=0,
         needs_review=true,
         review_reason='Belongs to KEK-26-6443-5-2-1 (Kosova A reactors), not KEK-26-6946-5-1-1. No canonical PPPP project exists yet.',
         updated_at=now()
   where gmail_message_id=any(v_wrong);

  select max(sent_at) into v_last_real_email
  from public.project_emails
  where project_id=v_project and sent_at <= now() + interval '5 minutes';

  update public.projects
     set operational_state='wait_for_supplier',
         operational_state_at=coalesce(v_last_real_email,now()),
         operational_state_source='kek_supplier_wait_reconcile_v3',
         last_email_at=v_last_real_email,
         last_activity_at=coalesce(v_last_real_email,created_at),
         updated_at=now()
   where id=v_project;
end;
$cleanup$;
