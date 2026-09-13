do $migration$
declare
  v_ddl text;
  v_old text;
begin
  select pg_get_functiondef('public.pppp_chatgpt_bridge_manifest_v1()'::regprocedure) into v_ddl;
  v_old := v_ddl;

  v_ddl := replace(v_ddl,
    '''chatgpt-command-v17''',
    '''chatgpt-command-v18''');

  v_ddl := replace(v_ddl,
    'Finance Intelligence v1 adds read-only finance synthesis over canonical invoices, expenses, bank guarantees and outgoing invoice milestones without changing Finance core calculations or executing financial actions. Supplier Intelligence v1 adds read-only supplier suitability, evidence/conflict classification, bounded RFQ-ready candidate ranking and external discovery recommendations without selecting or committing suppliers or sending email.',
    'Finance Intelligence v1 adds read-only finance synthesis over canonical invoices, expenses, bank guarantees and outgoing invoice milestones without changing Finance core calculations or executing financial actions. Supplier Intelligence v1 adds read-only supplier suitability, evidence/conflict classification, bounded RFQ-ready candidate ranking and external discovery recommendations without selecting or committing suppliers or sending email. Control Tower v1 adds a unified read-only PriSteel operating picture over Daily Intelligence and Finance Intelligence, surfacing current focus, human decisions, finance attention, new opportunities and waiting-external watchlists without executing actions.');

  v_ddl := replace(v_ddl,
    '''public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)'',',
    '''public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)'',
      ''public.pppp_chatgpt_control_tower_v1(integer,integer)'',');

  v_ddl := replace(v_ddl,
    '''gjej furnitorë / kush mund ta furnizojë këtë material'',''Use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer). strict_fit requires positive evidence for requested grade/standard/certificate constraints and no dimensional conflict. review_fit is a review candidate, not RFQ-ready proof. Candidate ranking is never supplier selection or commitment. External discovery is recommendation-only in v1.'',',
    '''control tower / çfarë po ndodh në PriSteel'',''Use public.pppp_chatgpt_control_tower_v1(integer,integer) first for one unified current-state operating picture. It combines Daily Intelligence and Finance Intelligence, preserves all human approval gates, performs zero executions, does not infer cash balance, and keeps Supplier Intelligence on-demand only.'',
      ''gjej furnitorë / kush mund ta furnizojë këtë material'',''Use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer). strict_fit requires positive evidence for requested grade/standard/certificate constraints and no dimensional conflict. review_fit is a review candidate, not RFQ-ready proof. Candidate ranking is never supplier selection or commitment. External discovery is recommendation-only in v1.'',');

  v_ddl := replace(v_ddl,
    'For supplier sourcing, coverage, RFQ-candidate or supplier-fit questions use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer).',
    'For a unified current-state PriSteel operating picture use public.pppp_chatgpt_control_tower_v1(integer,integer) first. It synthesizes Daily Intelligence plus Finance Intelligence; it is not historical change detection, performs zero executions, never infers cash without a canonical bank-balance source, and keeps Supplier Intelligence request/project scoped and on-demand. For supplier sourcing, coverage, RFQ-candidate or supplier-fit questions use public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer).');

  if v_ddl = v_old
     or position('chatgpt-command-v18' in v_ddl) = 0
     or position('pppp_chatgpt_control_tower_v1(integer,integer)' in v_ddl) = 0
     or position('control tower / çfarë po ndodh në PriSteel' in v_ddl) = 0
     or position('unified current-state PriSteel operating picture' in v_ddl) = 0 then
    raise exception 'Control Tower bridge v18 patch did not match expected v17 manifest';
  end if;

  execute v_ddl;
end
$migration$;

revoke all on function public.pppp_chatgpt_bridge_manifest_v1() from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_bridge_manifest_v1() to postgres, service_role, supabase_read_only_user;
