-- Inbox hygiene: self/test sender, automatic replies and obvious supplier marketing
-- must not create operator-review noise. No email is deleted or assigned.

create or replace function public.pppp_email_sender_class_v1(
  p_email text,
  p_name text default null,
  p_subject text default null
)
returns text
language sql
immutable
set search_path to 'pg_catalog','public'
as $fn$
with x as (
  select
    lower(btrim(coalesce(p_email,''))) as email,
    lower(split_part(btrim(coalesce(p_email,'')),'@',1)) as localpart,
    lower(split_part(btrim(coalesce(p_email,'')),'@',2)) as domain,
    lower(coalesce(p_name,'')) as sender_name,
    lower(coalesce(p_subject,'')) as subject
)
select case
  when email='' then 'unknown'
  when domain='prissteel.com' or email='arianitti@me.com' then 'internal'
  when email in ('eprokurimi@rks-gov.net','e-prokurimi@keptrust.org','bieter@dtvp.de')
    or domain='dtvp.de'
    then 'procurement_system'
  when localpart ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc|dmarcreport|mailrobot)([+._-]|$)'
    or email ~ '(ted-no-reply|noreply-dmarc|apps-scripts-notifications)'
    or email in ('welcome@supabase.com','hello@purchaser.wlw.com')
    or domain in (
      'mail.xing.com','e-mail.xing.com','em.linkedin.com','m.learn.coursera.org',
      'e.mailchimp.com','engage.canva.com','mail.apollo.io','hi.pitch.com',
      'mail.goldfish.sh','connect.blinq.me','updates.resend.com',
      'emailnotifications.microsoft.com','communication.microsoft.com',
      'invitations.mailinblack.com'
    )
    or sender_name like '%dmarc aggregate report%'
    or subject like '%report domain:%submitter:%report-id:%'
    then 'automated_service'
  else 'external'
end
from x;
$fn$;

do $patch_business$
declare
  v_def text;
  v_new text;
  v_sig regprocedure := 'public.pppp_chatgpt_business_inbox_v2(integer,integer)'::regprocedure;
begin
  v_def := pg_get_functiondef(v_sig);
  v_new := v_def;

  if strpos(v_new,'case when s.later_outgoing_evidence then ''handled'' when s.project_context_strong')=0 then
    raise exception 'business_inbox_state_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'case when s.later_outgoing_evidence then ''handled'' when s.project_context_strong',
    'case when s.later_outgoing_evidence then ''handled'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''informational'' when s.project_context_strong'
  );

  if strpos(v_new,'case when s.later_outgoing_evidence then ''already_replied'' when s.project_context_strong')=0 then
    raise exception 'business_inbox_action_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'case when s.later_outgoing_evidence then ''already_replied'' when s.project_context_strong',
    'case when s.later_outgoing_evidence then ''already_replied'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''automatic_reply_no_action'' when s.project_context_strong'
  );

  if strpos(v_new,'case when s.later_outgoing_evidence then 0 when s.project_context_strong')=0 then
    raise exception 'business_inbox_priority_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'case when s.later_outgoing_evidence then 0 when s.project_context_strong',
    'case when s.later_outgoing_evidence then 0 when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then 0 when s.project_context_strong'
  );

  execute v_new;
end
$patch_business$;

do $patch_unresolved$
declare
  v_def text;
  v_new text;
  v_sig regprocedure := 'public.pppp_chatgpt_unresolved_business_inbox_v1(integer,integer)'::regprocedure;
begin
  v_def := pg_get_functiondef(v_sig);
  v_new := v_def;

  if strpos(v_new,'    and public.pppp_email_sender_class_v1(e.from_email,e.from_name,e.subject)=''external''')=0 then
    raise exception 'unresolved_inbox_sender_anchor_missing';
  end if;

  v_new := replace(
    v_new,
    '    and public.pppp_email_sender_class_v1(e.from_email,e.from_name,e.subject)=''external''',
    '    and public.pppp_email_sender_class_v1(e.from_email,e.from_name,e.subject)=''external'''||E'\n'||
    '    and not public.pppp_email_is_automatic_reply_v1(e.subject,e.snippet,e.from_email)'||E'\n'||
    '    and not (lower(coalesce(e.subject,'''')||'' ''||coalesce(e.snippet,'''')) ~ ''(updated .{0,80}catalog|product catalogue|product portfolio|stock (list|availability)|can.t source it.{0,80}let .{0,40}check|looking for .{0,100}let .{0,40}check)'')'
  );

  execute v_new;
end
$patch_unresolved$;

select public.pppp_intelligence_snapshot_capture_v1('inbox_hygiene_v1');
