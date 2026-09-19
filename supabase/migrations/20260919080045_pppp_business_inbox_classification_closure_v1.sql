-- Final PPPP Business Inbox classification closure.
-- Scope is read-only intelligence semantics only; no email/project/business action is executed.

do $patch$
declare
  v_def text;
  v_new text;
  v_sig regprocedure := 'public.pppp_chatgpt_business_inbox_v2(integer,integer)'::regprocedure;
begin
  v_def := pg_get_functiondef(v_sig);
  v_new := v_def;

  if strpos(v_new,
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection|cease and desist)'') legal_signal,'
  )=0 then raise exception 'final_inbox_legal_anchor_missing'; end if;
  v_new := replace(
    v_new,
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection|cease and desist)'') legal_signal,',
    '(i.current_text ~ ''(enforcement|përmbarim|permbarim|mahnung|legal notice|lawsuit|court|anwalt|prokurori|debt collection|cease and desist)'') legal_signal,'||E'\n'||
    '    (i.current_text ~ ''(potentially compromised credentials|suspicious activity alert|publicly exposed.{0,120}(api key|credential)|credential exposure|compromised.{0,80}(api key|credential))'') security_signal,'||E'\n'||
    '    (i.current_text ~ ''(we are interested.{0,180}(supply|participat|scope)|we do the design and manufacturing|interested for the supply|interested in (the )?supply)'') capability_response_signal,'||E'\n'||
    '    (i.current_text ~ ''(mehr.{0,100}stahlbau.{0,100}leider nicht|no (more|additional).{0,100}steel(work| construction)|nothing further.{0,100}steel(work| construction))'') scope_closed_signal,'
  );

  if strpos(v_new,'and f.fact_status=''observed'' and f.evidence_status=''confirmed''')=0 then
    raise exception 'final_inbox_operator_evidence_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'and f.fact_status=''observed'' and f.evidence_status=''confirmed''',
    'and f.fact_status=''observed'' and ('||E'\n'||
    '        f.evidence_status=''confirmed'''||E'\n'||
    '        or ('||E'\n'||
    '          f.evidence_status=''observed'''||E'\n'||
    '          and f.source_type=''chatgpt'''||E'\n'||
    '          and coalesce(f.source_ref,'''') like ''gmail:%'''||E'\n'||
    '          and lower(coalesce(f.value->>''action_required'','''')) in (''true'',''false'',''1'',''0'',''yes'',''no'')'||E'\n'||
    '        )'||E'\n'||
    '      )'
  );

  if strpos(v_new,
    'when s.legal_signal then ''action_candidate'' when s.rejection_signal then ''action_candidate'' when s.marketing_signal then ''informational'''
  )=0 then raise exception 'final_inbox_state_anchor_missing'; end if;
  v_new := replace(
    v_new,
    'when s.legal_signal then ''action_candidate'' when s.rejection_signal then ''action_candidate'' when s.marketing_signal then ''informational''',
    'when s.security_signal then ''action_candidate'' when s.legal_signal then ''action_candidate'' when s.rejection_signal then ''action_candidate'' when s.scope_closed_signal then ''informational'' when s.marketing_signal then ''informational'' when s.capability_response_signal then ''review_optional'''
  );

  if strpos(v_new,
    'when s.legal_signal then ''review_legal_or_collection_matter'' when s.rejection_signal then ''review_project_outcome'' when s.marketing_signal then ''supplier_marketing_update'''
  )=0 then raise exception 'final_inbox_action_anchor_missing'; end if;
  v_new := replace(
    v_new,
    'when s.legal_signal then ''review_legal_or_collection_matter'' when s.rejection_signal then ''review_project_outcome'' when s.marketing_signal then ''supplier_marketing_update''',
    'when s.security_signal then ''review_security_alert'' when s.legal_signal then ''review_legal_or_collection_matter'' when s.rejection_signal then ''review_project_outcome'' when s.scope_closed_signal then ''closed_scope_no_action'' when s.marketing_signal then ''supplier_marketing_update'' when s.capability_response_signal then ''review_supplier_capability_response'''
  );

  if strpos(v_new,'then 0 when s.legal_signal then 98 when s.rejection_signal then 96')=0 then
    raise exception 'final_inbox_priority_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'then 0 when s.legal_signal then 98 when s.rejection_signal then 96',
    'then 0 when s.security_signal then 97 when s.legal_signal then 98 when s.rejection_signal then 96'
  );

  if strpos(v_new,'when s.marketing_signal then 5 when s.low_information_signal then 5')=0 then
    raise exception 'final_inbox_priority_secondary_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    'when s.marketing_signal then 5 when s.low_information_signal then 5',
    'when s.scope_closed_signal then 5 when s.marketing_signal then 5 when s.capability_response_signal then 40 when s.low_information_signal then 5'
  );

  if strpos(v_new,
    '''signals'',jsonb_build_object(''rejection'',l.rejection_signal,''marketing'',l.marketing_signal,''recruitment'',l.recruitment_signal,''finance'',l.finance_signal,''legal'',l.legal_signal,''offer'',l.offer_signal'
  )=0 then raise exception 'final_inbox_signals_output_anchor_missing'; end if;
  v_new := replace(
    v_new,
    '''signals'',jsonb_build_object(''rejection'',l.rejection_signal,''marketing'',l.marketing_signal,''recruitment'',l.recruitment_signal,''finance'',l.finance_signal,''legal'',l.legal_signal,''offer'',l.offer_signal',
    '''signals'',jsonb_build_object(''rejection'',l.rejection_signal,''marketing'',l.marketing_signal,''recruitment'',l.recruitment_signal,''finance'',l.finance_signal,''legal'',l.legal_signal,''security'',l.security_signal,''capability_response'',l.capability_response_signal,''scope_closed'',l.scope_closed_signal,''offer'',l.offer_signal'
  );

  execute v_new;
end
$patch$;

select public.pppp_intelligence_snapshot_capture_v1('business_inbox_classification_closure_v1');
