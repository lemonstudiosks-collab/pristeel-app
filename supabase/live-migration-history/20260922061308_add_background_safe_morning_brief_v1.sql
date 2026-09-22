create or replace function public.pppp_chatgpt_morning_brief_safe_v1(
  p_hours integer default 24,
  p_days integer default 30,
  p_limit integer default 10
) returns jsonb
language plpgsql
stable
security definer
set search_path to 'pg_catalog','public'
as $$
declare
  v_ct jsonb;
  v_di jsonb;
begin
  v_ct := public.pppp_chatgpt_control_tower_v2(p_hours,p_days,p_limit);
  v_di := public.pppp_chatgpt_daily_intelligence_v1(p_days,p_limit);
  return jsonb_build_object(
    'version',1,
    'read_only',true,
    'generated_at',now(),
    'brief_date',current_date,
    'headline',v_di->'headline',
    'summary',v_di->'summary',
    'projects_requiring_attention',v_di->'projects_requiring_attention',
    'waiting_external_watchlist',v_di->'waiting_external_watchlist',
    'new_opportunities',v_di->'new_opportunities',
    'human_decisions_required',v_di->'human_decisions_required',
    'prepare_now',v_di->'prepare_now',
    'portfolio_summary',v_di->'portfolio_summary',
    'historical_delta_available',v_ct->'historical_delta_available',
    'change_intelligence',v_ct->'change_intelligence'
  );
end;
$$;
revoke all on function public.pppp_chatgpt_morning_brief_safe_v1(integer,integer,integer) from public;
grant execute on function public.pppp_chatgpt_morning_brief_safe_v1(integer,integer,integer) to authenticated, service_role;
