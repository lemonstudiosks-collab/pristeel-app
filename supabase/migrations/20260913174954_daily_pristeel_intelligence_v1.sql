create or replace function public.pppp_chatgpt_daily_intelligence_v1(
  p_days integer default 30,
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_days integer := greatest(1,least(coalesce(p_days,30),90));
  v_limit integer := greatest(5,least(coalesce(p_limit,12),30));
  v_orchestrator jsonb := '{}'::jsonb;
  v_situations jsonb := '{}'::jsonb;
  v_top_focus jsonb := '[]'::jsonb;
  v_human_decisions jsonb := '[]'::jsonb;
  v_prepare_now jsonb := '[]'::jsonb;
  v_controlled_writes jsonb := '[]'::jsonb;
  v_waiting_external jsonb := '[]'::jsonb;
  v_attention_projects jsonb := '[]'::jsonb;
  v_new_opportunities jsonb := '[]'::jsonb;
  v_focus_count integer := 0;
  v_human_count integer := 0;
  v_waiting_count integer := 0;
  v_attention_count integer := 0;
  v_new_opportunity_count integer := 0;
  v_draft_count integer := 0;
  v_controlled_write_count integer := 0;
  v_headline text;
begin
  v_orchestrator := public.pppp_chatgpt_action_orchestrator_v1(v_days,greatest(v_limit,20));
  v_situations := public.pppp_chatgpt_situation_intelligence_v1(v_days,greatest(v_limit,20));

  select coalesce(jsonb_agg(item order by priority_score desc, proposal_id),'[]'::jsonb)
    into v_top_focus
  from (
    select elem as item,
           coalesce((elem->>'priority_score')::integer,0) as priority_score,
           coalesce(elem->>'proposal_id','') as proposal_id
    from jsonb_array_elements(coalesce(v_orchestrator->'proposals','[]'::jsonb)) x(elem)
    order by coalesce((elem->>'priority_score')::integer,0) desc, coalesce(elem->>'proposal_id','')
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by priority_score desc, proposal_id),'[]'::jsonb)
    into v_human_decisions
  from (
    select elem as item,
           coalesce((elem->>'priority_score')::integer,0) as priority_score,
           coalesce(elem->>'proposal_id','') as proposal_id
    from jsonb_array_elements(coalesce(v_orchestrator->'proposals','[]'::jsonb)) x(elem)
    where jsonb_array_length(coalesce(elem->'approval_gates','[]'::jsonb))>0
    order by coalesce((elem->>'priority_score')::integer,0) desc, coalesce(elem->>'proposal_id','')
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by priority_score desc, proposal_id),'[]'::jsonb)
    into v_prepare_now
  from (
    select elem as item,
           coalesce((elem->>'priority_score')::integer,0) as priority_score,
           coalesce(elem->>'proposal_id','') as proposal_id
    from jsonb_array_elements(coalesce(v_orchestrator->'proposals','[]'::jsonb)) x(elem)
    where coalesce((elem->>'draft_preparation_allowed')::boolean,false)
    order by coalesce((elem->>'priority_score')::integer,0) desc, coalesce(elem->>'proposal_id','')
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by priority_score desc, proposal_id),'[]'::jsonb)
    into v_controlled_writes
  from (
    select elem as item,
           coalesce((elem->>'priority_score')::integer,0) as priority_score,
           coalesce(elem->>'proposal_id','') as proposal_id
    from jsonb_array_elements(coalesce(v_orchestrator->'proposals','[]'::jsonb)) x(elem)
    where coalesce((elem->>'controlled_write_proposal_allowed')::boolean,false)
    order by coalesce((elem->>'priority_score')::integer,0) desc, coalesce(elem->>'proposal_id','')
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by rank_score desc, project_name),'[]'::jsonb)
    into v_waiting_external
  from (
    select jsonb_build_object(
             'project_id',elem->'project'->>'id',
             'project_name',elem->'project'->>'name',
             'client',elem->'project'->>'client',
             'pipeline_stage',elem->'project'->>'pipeline_stage',
             'risk_level',elem->'risk'->>'level',
             'summary',elem->>'summary',
             'recommendation',coalesce(elem->'recommendation','{}'::jsonb),
             'attention_required',coalesce((elem->>'attention_required')::boolean,false)
           ) as item,
           coalesce((elem->>'portfolio_rank_score')::integer,0) as rank_score,
           coalesce(elem->'project'->>'name','') as project_name
    from jsonb_array_elements(coalesce(v_situations->'project_situations','[]'::jsonb)) x(elem)
    where elem->>'situation_state'='waiting_external'
    order by coalesce((elem->>'portfolio_rank_score')::integer,0) desc
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by rank_score desc, project_name),'[]'::jsonb)
    into v_attention_projects
  from (
    select jsonb_build_object(
             'project_id',elem->'project'->>'id',
             'project_name',elem->'project'->>'name',
             'client',elem->'project'->>'client',
             'situation_state',elem->>'situation_state',
             'risk',coalesce(elem->'risk','{}'::jsonb),
             'summary',elem->>'summary',
             'recommendation',coalesce(elem->'recommendation','{}'::jsonb),
             'gates_triggered',coalesce(elem->'gates_triggered','[]'::jsonb)
           ) as item,
           coalesce((elem->>'portfolio_rank_score')::integer,0) as rank_score,
           coalesce(elem->'project'->>'name','') as project_name
    from jsonb_array_elements(coalesce(v_situations->'project_situations','[]'::jsonb)) x(elem)
    where coalesce((elem->>'attention_required')::boolean,false)
    order by coalesce((elem->>'portfolio_rank_score')::integer,0) desc
    limit v_limit
  ) q;

  select coalesce(jsonb_agg(item order by priority_score desc, proposal_id),'[]'::jsonb)
    into v_new_opportunities
  from (
    select elem as item,
           coalesce((elem->>'priority_score')::integer,0) as priority_score,
           coalesce(elem->>'proposal_id','') as proposal_id
    from jsonb_array_elements(coalesce(v_orchestrator->'proposals','[]'::jsonb)) x(elem)
    where elem->>'action_kind'='review_new_opportunity'
    order by coalesce((elem->>'priority_score')::integer,0) desc
    limit v_limit
  ) q;

  v_focus_count := jsonb_array_length(v_top_focus);
  v_human_count := jsonb_array_length(v_human_decisions);
  v_waiting_count := jsonb_array_length(v_waiting_external);
  v_attention_count := jsonb_array_length(v_attention_projects);
  v_new_opportunity_count := jsonb_array_length(v_new_opportunities);
  v_draft_count := jsonb_array_length(v_prepare_now);
  v_controlled_write_count := jsonb_array_length(v_controlled_writes);

  v_headline := concat(
    v_attention_count,' projekte kërkojnë vëmendje; ',
    v_human_count,' propozime prekin human gates; ',
    v_waiting_count,' projekte janë në pritje të palës tjetër; ',
    v_new_opportunity_count,' opportunity të reja kërkojnë review.'
  );

  return jsonb_build_object(
    'daily_intelligence_version',1,
    'brief_type','current_operating_state',
    'historical_delta_available',false,
    'historical_delta_note','Ky version nuk ruan snapshots historike dhe nuk pretendon overnight/change detection. Ai përmbledh vetëm gjendjen aktuale kanonike.',
    'read_only',true,
    'generated_at',now(),
    'brief_date',current_date,
    'window_days',v_days,
    'headline',v_headline,
    'summary',jsonb_build_object(
      'top_focus_items',v_focus_count,
      'projects_requiring_attention',v_attention_count,
      'human_gated_proposals',v_human_count,
      'draft_preparation_candidates',v_draft_count,
      'controlled_write_candidates',v_controlled_write_count,
      'projects_waiting_external',v_waiting_count,
      'new_opportunity_candidates',v_new_opportunity_count,
      'executions_performed',0
    ),
    'top_focus',v_top_focus,
    'projects_requiring_attention',v_attention_projects,
    'human_decisions_required',v_human_decisions,
    'prepare_now',v_prepare_now,
    'controlled_write_candidates',v_controlled_writes,
    'waiting_external_watchlist',v_waiting_external,
    'new_opportunities',v_new_opportunities,
    'portfolio_summary',coalesce(v_situations->'portfolio_summary','{}'::jsonb),
    'policy',jsonb_build_object(
      'brief_is_current_state_not_historical_delta',true,
      'read_only',true,
      'no_execution',true,
      'no_email_send',true,
      'no_project_creation',true,
      'no_task_creation',true,
      'no_supplier_selection',true,
      'no_price_or_margin_decision',true,
      'no_project_disposition',true,
      'controlled_writes_require_explicit_user_approval',true,
      'protected_human_gates_preserved',true
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_daily_intelligence_v1(integer,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_daily_intelligence_v1(integer,integer) to service_role, supabase_read_only_user;