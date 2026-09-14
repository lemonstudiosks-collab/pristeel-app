do $$
declare
  v_oid oid;
  v_def text;
  v_new text;
begin
  select p.oid into v_oid
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='pppp_chatgpt_bridge_manifest_v1' and pg_get_function_identity_arguments(p.oid)='';

  if v_oid is null then
    raise exception 'PPPP bridge manifest function not found';
  end if;

  v_def := pg_get_functiondef(v_oid);

  if position('''bridge_version'',''chatgpt-command-v18''' in v_def)=0 then
    raise exception 'Refusing bridge overwrite: expected chatgpt-command-v18 current manifest';
  end if;
  if position('public.pppp_chatgpt_supplier_intelligence_v1(jsonb,uuid,integer,integer,integer)' in v_def)=0
     or position('public.pppp_chatgpt_control_tower_v1(integer,integer)' in v_def)=0 then
    raise exception 'Refusing bridge overwrite: expected v18 Supplier Intelligence and Control Tower entries are missing';
  end if;

  v_new := replace(v_def,
    '''bridge_version'',''chatgpt-command-v18''',
    '''bridge_version'',''chatgpt-command-v19''');

  v_new := replace(v_new,
    'Control Tower v1 adds a unified read-only PriSteel operating picture over Daily Intelligence and Finance Intelligence, surfacing current focus, human decisions, finance attention, new opportunities and waiting-external watchlists without executing actions.',
    'Control Tower v1 adds a unified read-only PriSteel operating picture over Daily Intelligence and Finance Intelligence, surfacing current focus, human decisions, finance attention, new opportunities and waiting-external watchlists without executing actions. Historical Change Intelligence v1 stores bounded hourly intelligence snapshots and compares stable operating-surface identities without fabricating pre-snapshot history. Control Tower v2 combines the live operating picture with real historical delta when a valid baseline exists.');

  v_new := replace(v_new,
    '      ''public.pppp_chatgpt_control_tower_v1(integer,integer)'',',
    '      ''public.pppp_chatgpt_control_tower_v1(integer,integer)'','||chr(10)||
    '      ''public.pppp_chatgpt_change_intelligence_v1(integer,integer)'','||chr(10)||
    '      ''public.pppp_chatgpt_control_tower_v2(integer,integer,integer)'',');

  v_new := replace(v_new,
    '      ''briefing i sotëm / Daily PriSteel'',''Use public.pppp_chatgpt_daily_intelligence_v1(integer,integer) as the standard read-only current operating brief. It does not claim overnight/change detection unless historical snapshots exist.'',',
    '      ''briefing i sotëm / Daily PriSteel'',''Use public.pppp_chatgpt_control_tower_v2(24,30,10) for the standard read-only operating brief with historical delta when a valid 24-hour baseline exists. If historical_delta_available=false, report the live current state and state clearly that the requested historical window is not yet available; never infer pre-snapshot history.'',');

  v_new := replace(v_new,
    '      ''control tower / çfarë po ndodh në PriSteel'',''Use public.pppp_chatgpt_control_tower_v1(integer,integer) first for one unified current-state operating picture. It combines Daily Intelligence and Finance Intelligence, preserves all human approval gates, performs zero executions, does not infer cash balance, and keeps Supplier Intelligence on-demand only.'',',
    '      ''control tower / çfarë po ndodh në PriSteel'',''Use public.pppp_chatgpt_control_tower_v2(24,30,10) first for one unified live operating picture plus real historical delta when available. Preserve all human approval gates, perform zero executions, do not infer cash balance, and keep Supplier Intelligence on-demand only.'','||chr(10)||
    '      ''çfarë ndryshoi / overnight / since yesterday'',''Use public.pppp_chatgpt_change_intelligence_v1(24,20). Historical deltas start only from stored intelligence snapshots. If no snapshot old enough exists, say that historical_delta_available=false; never fabricate earlier history. A no-longer-present item is not automatically resolved.'','||chr(10)||
    '      ''control tower vetëm gjendja aktuale'',''Use public.pppp_chatgpt_control_tower_v1(integer,integer) when the user explicitly wants current state only without historical comparison.'',');

  v_new := replace(v_new,
    '      ''çfarë po ndodh në PriSteel / ku duhet të fokusohem'',''Use public.pppp_chatgpt_daily_intelligence_v1(integer,integer) for the standard current operating brief; use public.pppp_chatgpt_situation_intelligence_v1(integer,integer) for deeper cross-project context, public.pppp_chatgpt_action_orchestrator_v1(integer,integer) for proposal details, and public.pppp_chatgpt_finance_intelligence_v1(integer,integer) for finance-specific risk/timing.'',',
    '      ''çfarë po ndodh në PriSteel / ku duhet të fokusohem'',''Use public.pppp_chatgpt_control_tower_v2(24,30,10) first for current focus plus true historical delta when available; use Situation Intelligence for deeper cross-project context, Action Orchestrator for proposal details, Finance Intelligence for finance-specific risk/timing, and Supplier Intelligence only on demand.'',');

  v_new := replace(v_new,
    'For a unified current-state PriSteel operating picture use public.pppp_chatgpt_control_tower_v1(integer,integer) first. It synthesizes Daily Intelligence plus Finance Intelligence; it is not historical change detection, performs zero executions, never infers cash without a canonical bank-balance source, and keeps Supplier Intelligence request/project scoped and on-demand.',
    'For a unified PriSteel operating picture use public.pppp_chatgpt_control_tower_v2(integer,integer,integer) first. It combines the live Control Tower with Historical Change Intelligence. Historical deltas are valid only from stored intelligence snapshots: never infer history before the first snapshot, and never interpret a no-longer-present item as resolved without independent evidence. If historical_delta_available=false, report current state and the missing-baseline limitation. Use public.pppp_chatgpt_control_tower_v1(integer,integer) only when current-state-only output is explicitly desired. Both versions perform zero executions, never infer cash without a canonical bank-balance source, and keep Supplier Intelligence request/project scoped and on-demand.');

  if v_new=v_def then
    raise exception 'Bridge v19 patch produced no change';
  end if;
  if position('''bridge_version'',''chatgpt-command-v19''' in v_new)=0
     or position('public.pppp_chatgpt_change_intelligence_v1(integer,integer)' in v_new)=0
     or position('public.pppp_chatgpt_control_tower_v2(integer,integer,integer)' in v_new)=0 then
    raise exception 'Bridge v19 patch validation failed';
  end if;

  execute v_new;
end;
$$;
