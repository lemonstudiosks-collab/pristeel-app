-- Final Business Inbox operational-context and semantic-precision repair.
-- No email is sent, deleted, assigned to a project, or used to change protected business state.

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
    '(automatische[[:space:]]+antwort|automatisch[[:space:]]+antwoord|automatic[[:space:]]+reply|auto[[:space:]-]*reply|autoreply|autosvar|réponse[[:space:]]+automatique|reponse[[:space:]]+automatique|out[[:space:]]+of[[:space:]]+office|abwesenheitsnotiz|vacation[[:space:]]+reply|holiday[[:space:]]+br(ea|a)k|automatically[[:space:]]+rejected)'
  or lower(coalesce(p_subject,'')||' '||coalesce(p_snippet,'')) ~
    '(ich[[:space:]]+bin[[:space:]]+(bis|vom|ab)|nicht[[:space:]]+im[[:space:]]+haus|außer[[:space:]]+haus|ausser[[:space:]]+haus|i[[:space:]]+am[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|will[[:space:]]+be[[:space:]]+out[[:space:]]+of[[:space:]]+the[[:space:]]+office|your[[:space:]]+message[[:space:]]+will[[:space:]]+not[[:space:]]+be[[:space:]]+forwarded|vi[[:space:]]+har[[:space:]]+mottagit[[:space:]]+(ditt|dit)[[:space:]]+mejl|quota[[:space:]]+exceeded|mailbox.{0,40}(full|quota))'
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
  when domain='prissteel.com'
    or email in ('arianitti@me.com','prissteel@gmail.com')
    then 'internal'
  when email in ('eprokurimi@rks-gov.net','e-prokurimi@keptrust.org','bieter@dtvp.de')
    or domain='dtvp.de' or domain like '%.dtvp.de'
    then 'procurement_system'
  when localpart ~ '(^|[+._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|notifications?|dmarc|dmarcreport|mailrobot)([+._-]|$)'
    or email ~ '(ted-no-reply|noreply-dmarc|apps-scripts-notifications)'
    or email in (
      'welcome@supabase.com','hello@purchaser.wlw.com',
      'kompass@icapcrif.com','jira@newtron-services.atlassian.net',
      'info@make.com','raksha@distillmail.com',
      'support@apollo.io','support@newtron.net',
      'formularversand@calenbergingenieure.de'
    )
    or domain in (
      'mail.xing.com','e-mail.xing.com','em.linkedin.com','m.learn.coursera.org',
      'e.mailchimp.com','engage.canva.com','mail.apollo.io','hi.pitch.com',
      'mail.goldfish.sh','connect.blinq.me','updates.resend.com','notifications.resend.com',
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
    '(i.current_text ~ ''(invoice|rechnung|fatur[ëe]|payment|zahlung)'') finance_signal'
  )=0 then raise exception 'finance_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '(i.current_text ~ ''(invoice|rechnung|fatur[ëe]|payment|zahlung)'') finance_signal',
    '(i.current_text ~ ''(invoice|rechnung|fatur[ëe]|payment|zahlung|receipt|swift|garancion|garanci[ëe]|bank guarantee)'') finance_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection)'') legal_signal'
  )=0 then raise exception 'legal_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection)'') legal_signal',
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection|cease and desist)'') legal_signal'
  );

  if strpos(v_new,
    '((lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)'' and lower(coalesce(i.subject,'''')) !~ ''(request for quotation|rfq|k[ëe]rkes[ëe].{0,20}(p[ëe]r )?ofert|anfrage.{0,30}(angebot|preis))'') or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal'
  )=0 then raise exception 'offer_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '((lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|quotation|angebot|ofert[ëe]?)([^a-z]|$)'' and lower(coalesce(i.subject,'''')) !~ ''(request for quotation|rfq|k[ëe]rkes[ëe].{0,20}(p[ëe]r )?ofert|anfrage.{0,30}(angebot|preis))'') or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal',
    '((lower(coalesce(i.subject,'''')) ~ ''quotation'' or (lower(coalesce(i.subject,'''')) ~ ''(^|[^a-z])(offer|angebot|ofert[ëe]?)([^a-z]|$)'' and lower(coalesce(i.subject,'''')) !~ ''(request for quotation|rfq|k[ëe]rkes[ëe].{0,20}(p[ëe]r )?ofert|anfrage.{0,30}(angebot|preis))'')) or i.current_text ~ ''(attached.{0,100}(quotation|offer|angebot|ofert)|enclosed.{0,100}(quotation|offer|angebot)|ofert[aeë].{0,120}(tvsh|eur|euro)|price.{0,50}(eur|euro))'') offer_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|jemi n[ëe] pritje|k[ëe]rkojm[ëe].{0,100}(ofert|sh[ëe]rbim|konfirm|inform)|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal'
  )=0 then raise exception 'request_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|jemi n[ëe] pritje|k[ëe]rkojm[ëe].{0,100}(ofert|sh[ëe]rbim|konfirm|inform)|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal',
    '(i.current_text ~ ''(please (send|provide|confirm|inform|advise|share|indicate|review|let me know)|could you|would you|can you|please let me know|do you have|do you|ju lutem|a mund|mbetem n[ëe] pritje|jemi n[ëe] pritje|k[ëe]rkojm[ëe].{0,100}(ofert|sh[ëe]rbim|konfirm|inform)|k[ëe]rkoje.{0,100}ofert|vrati.{0,120}ponud|sagledaj|pogledaj.{0,80}(ponud|ofert)|bitte (senden|teilen|bestätigen|informieren)|können sie|wir benötigen|benötigen wir)'') request_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(thank you.{0,160}stay in touch|happy to stay in touch|reconnect once|look forward.{0,120}future|confirmed[, ]|see you[, ]|as requested.{0,80}attached|sipas k[ëe]rkes[ëe]s.{0,80}bashkangjitur)'') acknowledgement_signal'
  )=0 then raise exception 'ack_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '(i.current_text ~ ''(thank you.{0,160}stay in touch|happy to stay in touch|reconnect once|look forward.{0,120}future|confirmed[, ]|see you[, ]|as requested.{0,80}attached|sipas k[ëe]rkes[ëe]s.{0,80}bashkangjitur)'') acknowledgement_signal',
    '(i.current_text ~ ''(thank you.{0,160}stay in touch|happy to stay in touch|reconnect once|look forward.{0,120}future|confirmed[, ]|see you[, ]|well received[, ]*.{0,40}(thanks|thank you)|received[, ]*.{0,40}thanks|as requested.{0,80}attached|sipas k[ëe]rkes[ëe]s.{0,80}bashkangjitur)'') acknowledgement_signal'
  );

  if strpos(v_new,
    '(i.current_text ~ ''(need(s|ed)? more time|require(s|d)? more time|aufschub|will (send|provide|reply|respond)|werde.{0,60}(senden|schicken)|by [a-z]+day|bis zum|bis [0-9]{1,2}[./-][0-9]{1,2}[./-]20[0-9]{2})'') counterparty_commitment_signal'
  )=0 then raise exception 'commitment_signal_anchor_missing'; end if;
  v_new := replace(v_new,
    '(i.current_text ~ ''(need(s|ed)? more time|require(s|d)? more time|aufschub|will (send|provide|reply|respond)|werde.{0,60}(senden|schicken)|by [a-z]+day|bis zum|bis [0-9]{1,2}[./-][0-9]{1,2}[./-]20[0-9]{2})'') counterparty_commitment_signal',
    '(i.current_text ~ ''(need(s|ed)? more time|require(s|d)? more time|aufschub|will (send|provide|reply|respond)|will.{0,80}get in touch|will.{0,80}contact you|will.{0,80}prepare.{0,80}(quotation|offer)|we will check.{0,120}(prepare|submit)|proslijedit.{0,120}javit|kontaktirat.{0,80}(vas|te)|werde.{0,60}(senden|schicken)|by [a-z]+day|bis zum|bis [0-9]{1,2}[./-][0-9]{1,2}[./-]20[0-9]{2})'') counterparty_commitment_signal'
  );

  if strpos(v_new,
    '(length(btrim(coalesce(i.current_snippet,'''')))<24 and lower(btrim(coalesce(i.subject,''''))) in ('''',''(pa subjekt)'',''the'',''re:'',''fw:'',''fwd:'')) low_information_signal'
  )=0 then raise exception 'low_info_anchor_missing'; end if;
  v_new := replace(v_new,
    '(length(btrim(coalesce(i.current_snippet,'''')))<24 and lower(btrim(coalesce(i.subject,''''))) in ('''',''(pa subjekt)'',''the'',''re:'',''fw:'',''fwd:'')) low_information_signal',
    '(length(btrim(coalesce(i.current_snippet,'''')))<24 and lower(btrim(coalesce(i.subject,''''))) in ('''',''(pa subjekt)'',''the'',''re:'',''fw:'',''fwd:'',''test'')) low_information_signal'
  );

  if strpos(v_new,
    '),project_joined as ('||E'\n'||
    '  select s.*,p.name evidence_project_name,p.status evidence_project_status,p.pipeline_stage evidence_pipeline_stage,p.operational_state evidence_operational_state'||E'\n'||
    '  from signals s left join public.projects p on p.id=s.evidence_project_id'||E'\n'||
    '),classified as ('
  )=0 then raise exception 'project_joined_anchor_missing'; end if;

  v_new := replace(v_new,
    '),project_joined as ('||E'\n'||
    '  select s.*,p.name evidence_project_name,p.status evidence_project_status,p.pipeline_stage evidence_pipeline_stage,p.operational_state evidence_operational_state'||E'\n'||
    '  from signals s left join public.projects p on p.id=s.evidence_project_id'||E'\n'||
    '),classified as (',
    '),project_joined as ('||E'\n'||
    '  select s.*,p.name evidence_project_name,p.status evidence_project_status,p.pipeline_stage evidence_pipeline_stage,p.operational_state evidence_operational_state,'||E'\n'||
    '    ou.operator_value,ou.operator_at,'||E'\n'||
    '    (coalesce(s.project_evidence_confidence,0)>=85 and ou.operator_at is not null and ou.operator_at>s.sent_at'||E'\n'||
    '      and lower(coalesce(ou.operator_value->>''action_required'','''')) in (''false'',''0'',''no'')) operator_superseded_no_action'||E'\n'||
    '  from signals s'||E'\n'||
    '  left join public.projects p on p.id=s.evidence_project_id'||E'\n'||
    '  left join lateral ('||E'\n'||
    '    select f.value operator_value,'||E'\n'||
    '      case when coalesce(f.value->>''source_sent_at'','''') ~ ''^[0-9]{4}-[0-9]{2}-[0-9]{2}T'''||E'\n'||
    '        then (f.value->>''source_sent_at'')::timestamptz else f.updated_at end operator_at'||E'\n'||
    '    from public.pppp_project_context_current_v f'||E'\n'||
    '    where f.project_id=s.evidence_project_id and f.category=''operator_update'''||E'\n'||
    '      and f.fact_status=''observed'' and f.evidence_status=''confirmed'''||E'\n'||
    '    order by f.updated_at desc limit 1'||E'\n'||
    '  ) ou on true'||E'\n'||
    '),classified as ('
  );

  if strpos(v_new,
    'case when s.later_outgoing_evidence then ''handled'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''informational'' when s.project_context_strong'
  )=0 then raise exception 'state_case_anchor_missing'; end if;
  v_new := replace(v_new,
    'case when s.later_outgoing_evidence then ''handled'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''informational'' when s.project_context_strong',
    'case when s.later_outgoing_evidence then ''handled'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''informational'' when s.operator_superseded_no_action then case when coalesce(s.operator_value->>''waiting_on'','''')<>'''' or lower(coalesce(s.operator_value->>''workflow_state'','''')) like ''wait%'' then ''waiting'' else ''informational'' end when s.project_context_strong'
  );

  if strpos(v_new,
    'when s.finance_signal and s.document_signal then ''process_document'' when s.offer_signal then ''action_candidate'''
  )=0 then raise exception 'state_finance_anchor_missing'; end if;
  v_new := replace(v_new,
    'when s.finance_signal and s.document_signal then ''process_document'' when s.offer_signal then ''action_candidate''',
    'when s.finance_signal then ''process_document'' when s.offer_signal then ''action_candidate'' when s.document_signal and lower(coalesce(s.subject,'''')) ~ ''(skic|drawing|plan|document|dokument|swift|konfirm|confirmation)'' then ''process_document'''
  );

  if strpos(v_new,
    'case when s.later_outgoing_evidence then ''already_replied'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''automatic_reply_no_action'' when s.project_context_strong'
  )=0 then raise exception 'action_case_anchor_missing'; end if;
  v_new := replace(v_new,
    'case when s.later_outgoing_evidence then ''already_replied'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''automatic_reply_no_action'' when s.project_context_strong',
    'case when s.later_outgoing_evidence then ''already_replied'' when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then ''automatic_reply_no_action'' when s.operator_superseded_no_action then case when coalesce(s.operator_value->>''waiting_on'','''')<>'''' or lower(coalesce(s.operator_value->>''workflow_state'','''')) like ''wait%'' then ''wait_for_current_project_dependency'' else ''operator_update_supersedes_email'' end when s.project_context_strong'
  );

  if strpos(v_new,
    'when s.finance_signal and s.document_signal then ''process_finance_document'' when s.offer_signal then ''review_received_offer'''
  )=0 then raise exception 'action_finance_anchor_missing'; end if;
  v_new := replace(v_new,
    'when s.finance_signal and s.document_signal then ''process_finance_document'' when s.offer_signal then ''review_received_offer''',
    'when s.finance_signal then ''process_finance_document'' when s.offer_signal then ''review_received_offer'' when s.document_signal and lower(coalesce(s.subject,'''')) ~ ''(skic|drawing|plan|document|dokument|swift|konfirm|confirmation)'' then ''review_received_document'''
  );

  if strpos(v_new,
    'case when s.later_outgoing_evidence then 0 when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then 0 when s.project_context_strong'
  )=0 then raise exception 'priority_case_anchor_missing'; end if;
  v_new := replace(v_new,
    'case when s.later_outgoing_evidence then 0 when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then 0 when s.project_context_strong',
    'case when s.later_outgoing_evidence then 0 when public.pppp_email_is_automatic_reply_v1(s.subject,s.current_snippet,s.email) then 0 when s.operator_superseded_no_action then 15 when s.project_context_strong'
  );

  if strpos(v_new,
    'when s.finance_signal and s.document_signal then 78 when s.offer_signal then 88'
  )=0 then raise exception 'priority_finance_anchor_missing'; end if;
  v_new := replace(v_new,
    'when s.finance_signal and s.document_signal then 78 when s.offer_signal then 88',
    'when s.finance_signal then 78 when s.offer_signal then 88 when s.document_signal and lower(coalesce(s.subject,'''')) ~ ''(skic|drawing|plan|document|dokument|swift|konfirm|confirmation)'' then 58'
  );

  execute v_new;
end
$patch_business$;

select public.pppp_intelligence_snapshot_capture_v1('business_inbox_operational_context_v1');
