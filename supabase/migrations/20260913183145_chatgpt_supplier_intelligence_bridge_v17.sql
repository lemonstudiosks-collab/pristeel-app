do $migration$
declare
  v_ddl text;
  v_old text;
begin
  select pg_get_functiondef('public.pppp_chatgpt_bridge_manifest_v1()'::regprocedure) into v_ddl;
  v_old := v_ddl;

  v_ddl := replace(v_ddl,
    '''chatgpt-command-v16''',
    '''chatgpt-command-v17''');

  v_ddl := replace(v_ddl,
    'Finance Intelligence v1 adds read-only finance synthesis over canonical invoices, expenses, bank guarantees and outgoing invoice milestones without changing Finance core calculations or executing financial actions.',
    'Finance Intelligence v1 adds read-only finance synthesis over canonical invoices, expenses, bank guarantees and outgoing invoice milestones without changing Finance core calculations or executing financial actions. Supplier Intelligence v1 adds read-only supplier suitability, evidence/conflict classification, bounded RFQ-ready candidate ranking and external discovery recommendations without selecting or committing suppliers or sending email.');

  v_ddl := replace(v_ddl,
    '''public.pppp_chatgpt_finance_intelligence_v1(integer,integer)'',',
    '''public.pppp_chatgpt_finance_intelligence_v1(integer,integer)'',
      ''public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)'',');

  v_ddl := replace(v_ddl,
    '''kontrollo financat / finance brief'',''Use public.pppp_chatgpt_finance_intelligence_v1(integer,integer). It is read-only, reports receivables, supplier invoices, expenses, bank guarantees and outgoing invoice pipeline separately, keeps currencies separate, and never infers cash balance.'',',
    '''kontrollo financat / finance brief'',''Use public.pppp_chatgpt_finance_intelligence_v1(integer,integer). It is read-only, reports receivables, supplier invoices, expenses, bank guarantees and outgoing invoice pipeline separately, keeps currencies separate, and never infers cash balance.'',
      ''gjej furnitorë / kush mund ta furnizojë këtë material'',''Use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer). strict_fit requires positive evidence for requested grade/standard/certificate constraints and no dimensional conflict. review_fit is a review candidate, not RFQ-ready proof. Candidate ranking is never supplier selection or commitment. External discovery is recommendation-only in v1.'',');

  v_ddl := replace(v_ddl,
    'For deeper cross-project operating-picture use public.pppp_chatgpt_situation_intelligence_v1(integer,integer).',
    'For supplier sourcing, coverage, RFQ-candidate or supplier-fit questions use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer). Treat strict_fit as evidence-backed suitability only, review_fit as requiring human review, and explicit_conflict/evidence_gap as blockers or uncertainty. Candidate ranking is never supplier selection or commitment. External discovery is recommendation-only in v1: do not create discovery requests, send RFQs, send emails, select suppliers or commit suppliers automatically. For deeper cross-project operating-picture use public.pppp_chatgpt_situation_intelligence_v1(integer,integer).');

  if v_ddl = v_old
     or position('chatgpt-command-v17' in v_ddl) = 0
     or position('pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)' in v_ddl) = 0
     or position('gjej furnitorë / kush mund ta furnizojë këtë material' in v_ddl) = 0 then
    raise exception 'Supplier Intelligence bridge v17 patch did not match expected v16 manifest';
  end if;

  execute v_ddl;
end
$migration$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to postgres, service_role, supabase_read_only_user;
