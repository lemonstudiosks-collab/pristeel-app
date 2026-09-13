create or replace function public.pppp_chatgpt_control_tower_v1(
  p_days integer default 30,
  p_limit integer default 10
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_days integer := greatest(1, least(coalesce(p_days,30), 90));
  v_limit integer := greatest(5, least(coalesce(p_limit,10), 30));
  v_daily jsonb := '{}'::jsonb;
  v_finance jsonb := '{}'::jsonb;
  v_focus jsonb := '[]'::jsonb;
  v_human_decisions jsonb := '[]'::jsonb;
  v_finance_attention jsonb := '[]'::jsonb;
  v_new_opportunities jsonb := '[]'::jsonb;
  v_waiting_external jsonb := '[]'::jsonb;
  v_headline text;
begin
  v_daily := public.pppp_chatgpt_daily_intelligence_v1(v_days, greatest(v_limit,20));
  v_finance := public.pppp_chatgpt_finance_intelligence_v1(v_days, greatest(v_limit,20));

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb)
    into v_focus
  from (
    select x.value as item, x.ord
    from jsonb_array_elements(coalesce(v_daily->'top_focus','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord <= v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb)
    into v_human_decisions
  from (
    select x.value as item, x.ord
    from jsonb_array_elements(coalesce(v_daily->'human_decisions_required','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord <= v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb)
    into v_finance_attention
  from (
    select x.value as item, x.ord
    from jsonb_array_elements(coalesce(v_finance->'attention','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord <= v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb)
    into v_new_opportunities
  from (
    select x.value as item, x.ord
    from jsonb_array_elements(coalesce(v_daily->'new_opportunities','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord <= v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb)
    into v_waiting_external
  from (
    select x.value as item, x.ord
    from jsonb_array_elements(coalesce(v_daily->'waiting_external_watchlist','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord <= v_limit
  ) q;

  v_headline := format(
    '%s projekte kërkojnë vëmendje; %s vendime/propozime prekin human gates; %s çështje financiare kërkojnë review; %s opportunity të reja kërkojnë review.',
    coalesce((v_daily#>>'{summary,projects_requiring_attention}')::integer,0),
    coalesce((v_daily#>>'{summary,human_gated_proposals}')::integer,0),
    coalesce((v_finance#>>'{summary,attention_items}')::integer,0),
    coalesce((v_daily#>>'{summary,new_opportunity_candidates}')::integer,0)
  );

  return jsonb_build_object(
    'control_tower_version', 1,
    'mode', 'read_only_operating_picture',
    'read_only', true,
    'generated_at', coalesce(v_daily->'generated_at',v_finance->'generated_at'),
    'as_of_date', coalesce(v_finance->'as_of_date',v_daily->'brief_date'),
    'window_days', v_days,
    'limit', v_limit,
    'policy', jsonb_build_object(
      'read_only', true,
      'executions_performed', 0,
      'no_email_send', true,
      'no_task_creation', true,
      'no_project_creation', true,
      'no_supplier_selection_or_commitment', true,
      'no_finance_core_mutation', true,
      'no_price_or_margin_decision', true,
      'no_project_disposition', true,
      'protected_human_gates_preserved', true
    ),
    'headline', v_headline,
    'company_state', jsonb_build_object(
      'projects_requiring_attention', coalesce((v_daily#>>'{summary,projects_requiring_attention}')::integer,0),
      'human_gated_proposals', coalesce((v_daily#>>'{summary,human_gated_proposals}')::integer,0),
      'projects_waiting_external', coalesce((v_daily#>>'{summary,projects_waiting_external}')::integer,0),
      'new_opportunity_candidates', coalesce((v_daily#>>'{summary,new_opportunity_candidates}')::integer,0),
      'finance_attention_items', coalesce((v_finance#>>'{summary,attention_items}')::integer,0),
      'overdue_receivable_invoices', coalesce((v_finance#>>'{summary,overdue_receivable_invoices}')::integer,0),
      'open_bank_guarantees', coalesce((v_finance#>>'{summary,open_bank_guarantees}')::integer,0),
      'supplier_invoices_missing_due_date', coalesce((v_finance#>>'{summary,supplier_invoices_missing_due_date}')::integer,0)
    ),
    'focus_now', v_focus,
    'human_decisions_required', v_human_decisions,
    'finance_attention', v_finance_attention,
    'new_opportunities', v_new_opportunities,
    'waiting_external_watchlist', v_waiting_external,
    'data_quality_watch', jsonb_build_object(
      'supplier_invoices_missing_due_date', coalesce(v_finance->'supplier_invoices_missing_due_date','[]'::jsonb),
      'cash_balance_available', coalesce((v_finance->>'cash_balance_available')::boolean,false),
      'cash_balance_note', v_finance->'cash_balance_note'
    ),
    'source_layers', jsonb_build_object(
      'daily_intelligence_version', v_daily->'daily_intelligence_version',
      'situation_intelligence_version', 1,
      'action_orchestrator_version', 1,
      'finance_intelligence_version', v_finance->'finance_intelligence_version',
      'supplier_intelligence', 'on_demand_only'
    ),
    'intelligence_limits', jsonb_build_array(
      'Control Tower v1 is current-state synthesis, not historical change detection.',
      'No cash balance is inferred without a canonical bank balance source.',
      'Supplier Intelligence is request/project scoped and is not run generically across the portfolio.',
      'Unresolved inbox items are not forced into projects.',
      'Protected actions remain human-gated.'
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_control_tower_v1(integer,integer) from public;
revoke all on function public.pppp_chatgpt_control_tower_v1(integer,integer) from anon;
revoke all on function public.pppp_chatgpt_control_tower_v1(integer,integer) from authenticated;
grant execute on function public.pppp_chatgpt_control_tower_v1(integer,integer) to postgres;
grant execute on function public.pppp_chatgpt_control_tower_v1(integer,integer) to service_role;
grant execute on function public.pppp_chatgpt_control_tower_v1(integer,integer) to supabase_read_only_user;
