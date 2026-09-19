-- Include opportunity_engine_v2 in canonical automated-task lifecycle handling.

do $patch$
declare
  v_def text;
  v_new text;
  v_sig regprocedure := 'public.pppp_task_lifecycle_reconcile_v1(uuid)'::regprocedure;
begin
  v_def := pg_get_functiondef(v_sig);
  v_new := v_def;

  if strpos(v_new,'''execution_release_readiness'',''document_bom_review'')')=0 then
    raise exception 'task_lifecycle_terminal_or_dedupe_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '''execution_release_readiness'',''document_bom_review'')',
    '''execution_release_readiness'',''document_bom_review'',''opportunity_engine_v2'')'
  );

  if strpos(v_new,'''commercial_intake_review'',''project_discovery_auto'')')=0 then
    raise exception 'task_lifecycle_execution_anchor_missing';
  end if;
  v_new := replace(
    v_new,
    '''commercial_intake_review'',''project_discovery_auto'')',
    '''commercial_intake_review'',''project_discovery_auto'',''opportunity_engine_v2'')'
  );

  execute v_new;
end
$patch$;

select public.pppp_task_lifecycle_reconcile_v1(null);
select public.pppp_project_memory_baseline_reconcile_v1(true,100);
select public.pppp_intelligence_snapshot_capture_v1('task_lifecycle_opportunity_cleanup_v1');
