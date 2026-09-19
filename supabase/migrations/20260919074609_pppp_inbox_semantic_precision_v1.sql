-- Improve business-inbox semantic precision without deleting or assigning any email.

create or replace function public.pppp_email_is_automatic_reply_v1(
  p_subject text,
  p_snippet text,
  p_from_email text default null
)
returns boolean
language sql
immutable
set search_path to 'pg_catalog','public'
as $fn$
select
  lower(coalesce(p_subject,'')) ~
    '(automatische[[:space:]]+antwort|automatisch[[:space:]]+antwoord|automatic[[:space:]]+reply|auto[[:space:]-]*reply|autoreply|autosvar|réponse[[:space:]]+automatique|reponse[[:space:]]+automatique|out[[:space:]]+of[[:space:]]+office|abwesenheitsnotiz|vacation[[:space:]]+reply|holiday[[:space:]]+br(ea|a)k)'
  or lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~
    '(ich[[:space:]]+bin[[:space:]]+(bis|vom)|nicht[[:space:]]+im[[:space:]]+haus|außer[[:space:]]+haus|ausser[[:space:]]+haus|i[[:space:]]+am[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|will[[:space:]]+be[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|your[[:space:]]+message[[:space:]]+will[[:space:]]+not[[:space:]]+be[[:space:]]+forwarded|vi[[:space:]]+har[[:space:]]+mottagit[[:space:]]+(ditt|dit)[[:space:]]+mejl)'
  or lower(coalesce(p_from_email,'')) ~ '(mailer-daemon|postmaster)';
$fn$;

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
    or domain='dtvp.de' or domain like '%.dtvp.de'
    then 'procurement_system'
  when localpart ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc|dmarcreport|mailrobot)([+._-]|$)'
    or email ~ '(ted-no-reply|noreply-dmarc|apps-scripts-notifications)'
    or email in (
      'welcome@supabase.com','hello@purchaser.wlw.com',
      'kompass@icapcrif.com','jira@newtron-services.atlassian.net',
      'info@make.com','raksha@distillmail.com'
    )
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

  if strpos(v_new,
    '(i.current_text ~ ''(absage|nicht in die engere auswahl|not (selected|shortlisted)|unsuccessful|leider.{0,80}nicht berücks|we regret|nicht berücksichtigt)'') rejection_signal'
  )=0 then
    raise exception 'rejection_signal_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '(i.current_text ~ ''(absage|nicht in die engere auswahl|not (selected|shortlisted)|unsuccessful|leider.{0,80}nicht berücks|we regret|nicht berücksichtigt)'') rejection_signal',
    '(i.current_text ~ ''(absage|nicht in die engere auswahl|not (selected|shortlisted)|unsuccessful|leider.{0,80}nicht berücks|we regret|nicht berücksichtigt|für einen anderen lieferanten entschieden|fuer einen anderen lieferanten entschieden|anderen lieferanten entschieden|decided.{0,60}another supplier)'') rejection_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(dear valued partner|updated .{0,80}catalog|product catalogue|product portfolio|stock (list|availability)|telegram channel|newsletter|introduce our company|what we can offer is the following|main activity is production|looking for .{0,80} let .{0,40} check)'') marketing_signal'
  )=0 then
    raise exception 'marketing_signal_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '(i.current_text ~ ''(dear valued partner|updated .{0,80}catalog|product catalogue|product portfolio|stock (list|availability)|telegram channel|newsletter|introduce our company|what we can offer is the following|main activity is production|looking for .{0,80} let .{0,40} check)'') marketing_signal',
    '(i.current_text ~ ''(dear valued partner|updated .{0,80}catalog|product catalogue|product portfolio|stock (list|availability)|telegram channel|newsletter|introduce our company|(introduce|introduction).{0,100}(company|supplier|manufacturer|steel)|leading (manufacturer|supplier)|what we can offer is the following|main activity is production|looking for .{0,80} let .{0,40} check)'') marketing_signal'
  );

  if strpos(v_new,
    '(lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)'' or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal'
  )=0 then
    raise exception 'offer_signal_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '(lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)'' or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal',
    '((lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)'' and lower(coalesce(i.subject,'''')) !~ ''(request for quotation|rfq|k[ëe]rkes[ëe].{0,20}(p[ëe]r )?ofert|anfrage.{0,30}(angebot|preis))'') or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal'
  )=0 then
    raise exception 'request_signal_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal',
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|jemi n[ëe] pritje|k[ëe]rkojm[ëe].{0,100}(ofert|sh[ëe]rbim|konfirm|inform)|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal'
  );

  execute v_new;
end
$patch_business$;

select public.pppp_intelligence_snapshot_capture_v1('inbox_semantic_precision_v1');
