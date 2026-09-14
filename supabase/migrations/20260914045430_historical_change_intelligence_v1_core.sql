-- Historical Change Intelligence v1
-- Final-state reconstruction of the production migration chain. This layer stores
-- bounded intelligence snapshots only; it does not mutate PPPP business core.

create table if not exists public.pppp_intelligence_snapshots_v1 (
  id bigint generated always as identity primary key,
  snapshot_hour timestamptz not null unique,
  captured_at timestamptz not null default now(),
  capture_source text not null default 'cron',
  state_hash text not null,
  state jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists pppp_intelligence_snapshots_v1_captured_at_idx
  on public.pppp_intelligence_snapshots_v1 (captured_at desc);

revoke all on table public.pppp_intelligence_snapshots_v1 from public;
revoke all on table public.pppp_intelligence_snapshots_v1 from anon;
revoke all on table public.pppp_intelligence_snapshots_v1 from authenticated;
revoke all on table public.pppp_intelligence_snapshots_v1 from service_role;
revoke all on table public.pppp_intelligence_snapshots_v1 from supabase_read_only_user;

create or replace function public.pppp_intelligence_compact_from_control_tower_v1(
  p_tower jsonb,
  p_limit integer default 30
) returns jsonb
language plpgsql
immutable
set search_path = pg_catalog, public
as $$
declare
  v_limit integer := greatest(5, least(coalesce(p_limit,30),30));
  v_focus jsonb := '[]'::jsonb;
  v_decisions jsonb := '[]'::jsonb;
  v_finance jsonb := '[]'::jsonb;
  v_opportunities jsonb := '[]'::jsonb;
  v_waiting jsonb := '[]'::jsonb;
begin
  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into v_focus
  from (
    select x.ord,jsonb_strip_nulls(jsonb_build_object(
      'proposal_id',x.value->>'proposal_id','action_kind',x.value->>'action_kind','action_label',x.value->>'action_label',
      'priority_score',x.value->'priority_score','approval_gates',coalesce(x.value->'approval_gates','[]'::jsonb),
      'project_id',coalesce(x.value#>>'{project,project_id}',x.value#>>'{project_context,recommended_project_id}'),
      'project_name',coalesce(x.value#>>'{project,project_name}',x.value#>>'{project_context,recommended_project_name}'),
      'subject',x.value->>'subject','counterparty_email',x.value#>>'{counterparty,from_email}',
      'recommended_decision',x.value#>>'{recommended_decision,decision}','recommended_label',x.value#>>'{recommended_decision,label}',
      'risk_level',x.value#>>'{risk,level}','risk_score',x.value#>'{risk,score}'
    )) item
    from jsonb_array_elements(coalesce(p_tower->'focus_now','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord<=v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into v_decisions
  from (
    select x.ord,jsonb_strip_nulls(jsonb_build_object(
      'proposal_id',x.value->>'proposal_id','action_kind',x.value->>'action_kind','action_label',x.value->>'action_label',
      'priority_score',x.value->'priority_score','approval_gates',coalesce(x.value->'approval_gates','[]'::jsonb),
      'project_id',coalesce(x.value#>>'{project,project_id}',x.value#>>'{project_context,recommended_project_id}'),
      'project_name',coalesce(x.value#>>'{project,project_name}',x.value#>>'{project_context,recommended_project_name}'),
      'subject',x.value->>'subject','counterparty_email',x.value#>>'{counterparty,from_email}'
    )) item
    from jsonb_array_elements(coalesce(p_tower->'human_decisions_required','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord<=v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into v_finance
  from (
    select x.ord,jsonb_strip_nulls(jsonb_build_object(
      'attention_id',x.value->>'attention_id','kind',x.value->>'kind','priority_score',x.value->'priority_score',
      'project_id',x.value->>'project_id','project_name',x.value->>'project_name','party',x.value->>'party','bank',x.value->>'bank',
      'reference',x.value->>'reference','amount',x.value->'amount','amount_guaranteed',x.value->'amount_guaranteed','currency',x.value->>'currency',
      'due_date',x.value->>'due_date','days_overdue',x.value->'days_overdue','expiry_date',x.value->>'expiry_date','days_to_expiry',x.value->'days_to_expiry',
      'approval_gates',coalesce(x.value->'approval_gates','[]'::jsonb),'recommended_action',x.value->>'recommended_action'
    )) item
    from jsonb_array_elements(coalesce(p_tower->'finance_attention','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord<=v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into v_opportunities
  from (
    select x.ord,jsonb_strip_nulls(jsonb_build_object(
      'proposal_id',x.value->>'proposal_id','subject',x.value->>'subject','priority_score',x.value->'priority_score',
      'counterparty_email',x.value#>>'{counterparty,from_email}','approval_gates',coalesce(x.value->'approval_gates','[]'::jsonb),
      'recommended_project_id',x.value#>>'{project_context,recommended_project_id}','recommended_project_name',x.value#>>'{project_context,recommended_project_name}'
    )) item
    from jsonb_array_elements(coalesce(p_tower->'new_opportunities','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord<=v_limit
  ) q;

  select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into v_waiting
  from (
    select x.ord,jsonb_strip_nulls(jsonb_build_object(
      'project_id',x.value->>'project_id','project_name',x.value->>'project_name','client',x.value->>'client',
      'pipeline_stage',x.value->>'pipeline_stage','risk_level',x.value->>'risk_level',
      'recommendation_decision',x.value#>>'{recommendation,decision}','attention_required',x.value->'attention_required'
    )) item
    from jsonb_array_elements(coalesce(p_tower->'waiting_external_watchlist','[]'::jsonb)) with ordinality x(value,ord)
    where x.ord<=v_limit
  ) q;

  return jsonb_build_object(
    'state_version',1,'company_state',coalesce(p_tower->'company_state','{}'::jsonb),'focus_now',v_focus,
    'human_decisions_required',v_decisions,'finance_attention',v_finance,'new_opportunities',v_opportunities,
    'waiting_external_watchlist',v_waiting,'data_quality_watch',coalesce(p_tower->'data_quality_watch','{}'::jsonb),
    'source_layers',coalesce(p_tower->'source_layers','{}'::jsonb)
  );
end;
$$;

revoke all on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) from public;
revoke all on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) from anon;
revoke all on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) from authenticated;
revoke all on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) from service_role;
revoke all on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) from supabase_read_only_user;
grant execute on function public.pppp_intelligence_compact_from_control_tower_v1(jsonb,integer) to postgres;

create or replace function public.pppp_intelligence_compact_state_v1(p_days integer default 30,p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  select public.pppp_intelligence_compact_from_control_tower_v1(
    public.pppp_chatgpt_control_tower_v1(greatest(1,least(coalesce(p_days,30),90)),greatest(5,least(coalesce(p_limit,30),30))),
    greatest(5,least(coalesce(p_limit,30),30))
  );
$$;

revoke all on function public.pppp_intelligence_compact_state_v1(integer,integer) from public;
revoke all on function public.pppp_intelligence_compact_state_v1(integer,integer) from anon;
revoke all on function public.pppp_intelligence_compact_state_v1(integer,integer) from authenticated;
revoke all on function public.pppp_intelligence_compact_state_v1(integer,integer) from service_role;
revoke all on function public.pppp_intelligence_compact_state_v1(integer,integer) from supabase_read_only_user;
grant execute on function public.pppp_intelligence_compact_state_v1(integer,integer) to postgres;

create or replace function public.pppp_intelligence_snapshot_capture_v1(p_source text default 'cron')
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare
  v_state jsonb;
  v_hash text;
  v_slot timestamptz:=date_trunc('hour',clock_timestamp());
  v_id bigint;
  v_created boolean:=false;
begin
  v_state:=public.pppp_intelligence_compact_state_v1(30,30);
  v_hash:=md5(v_state::text);
  insert into public.pppp_intelligence_snapshots_v1(snapshot_hour,captured_at,capture_source,state_hash,state)
  values(v_slot,clock_timestamp(),coalesce(nullif(trim(p_source),''),'unknown'),v_hash,v_state)
  on conflict(snapshot_hour) do nothing returning id into v_id;
  if v_id is not null then v_created:=true;
  else select id into v_id from public.pppp_intelligence_snapshots_v1 where snapshot_hour=v_slot;
  end if;
  return jsonb_build_object('snapshot_id',v_id,'snapshot_hour',v_slot,'created',v_created,'state_hash',v_hash,
    'source',coalesce(nullif(trim(p_source),''),'unknown'),'business_core_mutations',0);
end;
$$;

revoke all on function public.pppp_intelligence_snapshot_capture_v1(text) from public;
revoke all on function public.pppp_intelligence_snapshot_capture_v1(text) from anon;
revoke all on function public.pppp_intelligence_snapshot_capture_v1(text) from authenticated;
revoke all on function public.pppp_intelligence_snapshot_capture_v1(text) from service_role;
revoke all on function public.pppp_intelligence_snapshot_capture_v1(text) from supabase_read_only_user;
grant execute on function public.pppp_intelligence_snapshot_capture_v1(text) to postgres;

create or replace function public.pppp_intelligence_change_from_state_v1(p_current jsonb,p_hours integer default 24,p_limit integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $$
declare
  v_hours integer:=greatest(0,least(coalesce(p_hours,24),168));
  v_limit integer:=greatest(5,least(coalesce(p_limit,20),30));
  v_current jsonb:=coalesce(p_current,'{}'::jsonb);
  v_current_hash text:=md5(coalesce(p_current,'{}'::jsonb)::text);
  v_baseline public.pppp_intelligence_snapshots_v1%rowtype;
  v_first_at timestamptz; v_latest_at timestamptz;
  v_cur_focus text[]:=array[]::text[]; v_base_focus text[]:=array[]::text[];
  v_cur_decisions text[]:=array[]::text[]; v_base_decisions text[]:=array[]::text[];
  v_cur_finance text[]:=array[]::text[]; v_base_finance text[]:=array[]::text[];
  v_cur_opps text[]:=array[]::text[]; v_base_opps text[]:=array[]::text[];
  v_cur_wait text[]:=array[]::text[]; v_base_wait text[]:=array[]::text[];
  v_new_focus text[]:=array[]::text[]; v_left_focus text[]:=array[]::text[];
  v_new_decisions text[]:=array[]::text[]; v_left_decisions text[]:=array[]::text[];
  v_new_finance text[]:=array[]::text[]; v_left_finance text[]:=array[]::text[];
  v_new_opps text[]:=array[]::text[]; v_left_opps text[]:=array[]::text[];
  v_enter_wait text[]:=array[]::text[]; v_left_wait text[]:=array[]::text[];
  j_new_focus jsonb:='[]'::jsonb; j_left_focus jsonb:='[]'::jsonb;
  j_new_decisions jsonb:='[]'::jsonb; j_left_decisions jsonb:='[]'::jsonb;
  j_new_finance jsonb:='[]'::jsonb; j_left_finance jsonb:='[]'::jsonb;
  j_new_opps jsonb:='[]'::jsonb; j_left_opps jsonb:='[]'::jsonb;
  j_enter_wait jsonb:='[]'::jsonb; j_left_wait jsonb:='[]'::jsonb;
  v_company_delta jsonb:='{}'::jsonb; v_headline text;
begin
  select min(captured_at),max(captured_at) into v_first_at,v_latest_at from public.pppp_intelligence_snapshots_v1;
  if v_hours=0 then
    select * into v_baseline from public.pppp_intelligence_snapshots_v1 order by captured_at desc limit 1;
  else
    select * into v_baseline from public.pppp_intelligence_snapshots_v1 where captured_at<=now()-make_interval(hours=>v_hours) order by captured_at desc limit 1;
  end if;
  if v_baseline.id is null then
    return jsonb_build_object('change_intelligence_version',1,'historical_delta_available',false,'requested_hours',v_hours,
      'first_snapshot_at',v_first_at,'latest_snapshot_at',v_latest_at,'current_state',v_current->'company_state',
      'reason',case when v_first_at is null then 'No intelligence snapshots exist yet.' else 'No snapshot old enough exists for the requested comparison window.' end,
      'policy',jsonb_build_object('read_only',true,'no_business_core_mutation',true,'no_inferred_pre_snapshot_history',true,'executions_performed',0));
  end if;

  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_cur_focus from jsonb_array_elements(coalesce(v_current->'focus_now','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_base_focus from jsonb_array_elements(coalesce(v_baseline.state->'focus_now','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_cur_decisions from jsonb_array_elements(coalesce(v_current->'human_decisions_required','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_base_decisions from jsonb_array_elements(coalesce(v_baseline.state->'human_decisions_required','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'attention_id') filter(where coalesce(e->>'attention_id','')<>''),array[]::text[]) into v_cur_finance from jsonb_array_elements(coalesce(v_current->'finance_attention','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'attention_id') filter(where coalesce(e->>'attention_id','')<>''),array[]::text[]) into v_base_finance from jsonb_array_elements(coalesce(v_baseline.state->'finance_attention','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_cur_opps from jsonb_array_elements(coalesce(v_current->'new_opportunities','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'proposal_id') filter(where coalesce(e->>'proposal_id','')<>''),array[]::text[]) into v_base_opps from jsonb_array_elements(coalesce(v_baseline.state->'new_opportunities','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'project_id') filter(where coalesce(e->>'project_id','')<>''),array[]::text[]) into v_cur_wait from jsonb_array_elements(coalesce(v_current->'waiting_external_watchlist','[]'::jsonb)) e;
  select coalesce(array_agg(e->>'project_id') filter(where coalesce(e->>'project_id','')<>''),array[]::text[]) into v_base_wait from jsonb_array_elements(coalesce(v_baseline.state->'waiting_external_watchlist','[]'::jsonb)) e;

  select coalesce(array(select unnest(v_cur_focus) except select unnest(v_base_focus)),array[]::text[]) into v_new_focus;
  select coalesce(array(select unnest(v_base_focus) except select unnest(v_cur_focus)),array[]::text[]) into v_left_focus;
  select coalesce(array(select unnest(v_cur_decisions) except select unnest(v_base_decisions)),array[]::text[]) into v_new_decisions;
  select coalesce(array(select unnest(v_base_decisions) except select unnest(v_cur_decisions)),array[]::text[]) into v_left_decisions;
  select coalesce(array(select unnest(v_cur_finance) except select unnest(v_base_finance)),array[]::text[]) into v_new_finance;
  select coalesce(array(select unnest(v_base_finance) except select unnest(v_cur_finance)),array[]::text[]) into v_left_finance;
  select coalesce(array(select unnest(v_cur_opps) except select unnest(v_base_opps)),array[]::text[]) into v_new_opps;
  select coalesce(array(select unnest(v_base_opps) except select unnest(v_cur_opps)),array[]::text[]) into v_left_opps;
  select coalesce(array(select unnest(v_cur_wait) except select unnest(v_base_wait)),array[]::text[]) into v_enter_wait;
  select coalesce(array(select unnest(v_base_wait) except select unnest(v_cur_wait)),array[]::text[]) into v_left_wait;

  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_new_focus from (select x.value,x.ord from jsonb_array_elements(coalesce(v_current->'focus_now','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_new_focus) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_left_focus from (select x.value,x.ord from jsonb_array_elements(coalesce(v_baseline.state->'focus_now','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_left_focus) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_new_decisions from (select x.value,x.ord from jsonb_array_elements(coalesce(v_current->'human_decisions_required','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_new_decisions) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_left_decisions from (select x.value,x.ord from jsonb_array_elements(coalesce(v_baseline.state->'human_decisions_required','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_left_decisions) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_new_finance from (select x.value,x.ord from jsonb_array_elements(coalesce(v_current->'finance_attention','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'attention_id'=any(v_new_finance) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_left_finance from (select x.value,x.ord from jsonb_array_elements(coalesce(v_baseline.state->'finance_attention','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'attention_id'=any(v_left_finance) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_new_opps from (select x.value,x.ord from jsonb_array_elements(coalesce(v_current->'new_opportunities','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_new_opps) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_left_opps from (select x.value,x.ord from jsonb_array_elements(coalesce(v_baseline.state->'new_opportunities','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'proposal_id'=any(v_left_opps) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_enter_wait from (select x.value,x.ord from jsonb_array_elements(coalesce(v_current->'waiting_external_watchlist','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'project_id'=any(v_enter_wait) order by x.ord limit v_limit) q;
  select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into j_left_wait from (select x.value,x.ord from jsonb_array_elements(coalesce(v_baseline.state->'waiting_external_watchlist','[]'::jsonb)) with ordinality x(value,ord) where x.value->>'project_id'=any(v_left_wait) order by x.ord limit v_limit) q;

  v_company_delta:=jsonb_build_object(
    'projects_requiring_attention',coalesce((v_current#>>'{company_state,projects_requiring_attention}')::int,0)-coalesce((v_baseline.state#>>'{company_state,projects_requiring_attention}')::int,0),
    'human_gated_proposals',coalesce((v_current#>>'{company_state,human_gated_proposals}')::int,0)-coalesce((v_baseline.state#>>'{company_state,human_gated_proposals}')::int,0),
    'projects_waiting_external',coalesce((v_current#>>'{company_state,projects_waiting_external}')::int,0)-coalesce((v_baseline.state#>>'{company_state,projects_waiting_external}')::int,0),
    'new_opportunity_candidates',coalesce((v_current#>>'{company_state,new_opportunity_candidates}')::int,0)-coalesce((v_baseline.state#>>'{company_state,new_opportunity_candidates}')::int,0),
    'finance_attention_items',coalesce((v_current#>>'{company_state,finance_attention_items}')::int,0)-coalesce((v_baseline.state#>>'{company_state,finance_attention_items}')::int,0),
    'overdue_receivable_invoices',coalesce((v_current#>>'{company_state,overdue_receivable_invoices}')::int,0)-coalesce((v_baseline.state#>>'{company_state,overdue_receivable_invoices}')::int,0),
    'open_bank_guarantees',coalesce((v_current#>>'{company_state,open_bank_guarantees}')::int,0)-coalesce((v_baseline.state#>>'{company_state,open_bank_guarantees}')::int,0),
    'supplier_invoices_missing_due_date',coalesce((v_current#>>'{company_state,supplier_invoices_missing_due_date}')::int,0)-coalesce((v_baseline.state#>>'{company_state,supplier_invoices_missing_due_date}')::int,0)
  );
  v_headline:=format('%s focus të reja; %s nuk janë më në focus; %s finance attention të reja; %s opportunity të reja; %s projekte hynë dhe %s dolën nga waiting external.',cardinality(v_new_focus),cardinality(v_left_focus),cardinality(v_new_finance),cardinality(v_new_opps),cardinality(v_enter_wait),cardinality(v_left_wait));

  return jsonb_build_object(
    'change_intelligence_version',1,'historical_delta_available',true,'requested_hours',v_hours,'baseline_snapshot_id',v_baseline.id,
    'baseline_at',v_baseline.captured_at,'current_at',now(),'actual_baseline_age_hours',round((extract(epoch from (now()-v_baseline.captured_at))/3600.0)::numeric,2),
    'state_changed',v_current_hash<>v_baseline.state_hash,'headline',v_headline,'company_state_before',v_baseline.state->'company_state',
    'company_state_now',v_current->'company_state','company_state_delta',v_company_delta,'new_focus_items',j_new_focus,'focus_items_no_longer_present',j_left_focus,
    'new_human_decisions',j_new_decisions,'human_decisions_no_longer_present',j_left_decisions,'new_finance_attention',j_new_finance,
    'finance_attention_no_longer_present',j_left_finance,'new_opportunities',j_new_opps,'opportunities_no_longer_present',j_left_opps,
    'entered_waiting_external',j_enter_wait,'left_waiting_external',j_left_wait,
    'interpretation',jsonb_build_object('no_longer_present_does_not_mean_resolved',true,'snapshot_history_starts_at',v_first_at,'history_before_first_snapshot_is_not_inferred',true,'current_state_is_live_not_last_snapshot',true),
    'policy',jsonb_build_object('read_only',true,'no_business_core_mutation',true,'no_email_send',true,'no_task_or_project_creation',true,'no_supplier_selection_or_commitment',true,'no_finance_core_mutation',true,'protected_human_gates_preserved',true,'executions_performed',0)
  );
end;
$$;

revoke all on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) from public;
revoke all on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) from anon;
revoke all on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) from authenticated;
revoke all on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) from service_role;
revoke all on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) from supabase_read_only_user;
grant execute on function public.pppp_intelligence_change_from_state_v1(jsonb,integer,integer) to postgres;

create or replace function public.pppp_chatgpt_change_intelligence_v1(p_hours integer default 24,p_limit integer default 20)
returns jsonb
language sql
stable
security definer
set search_path=pg_catalog,public
as $$
  select public.pppp_intelligence_change_from_state_v1(
    public.pppp_intelligence_compact_state_v1(30,30),
    greatest(0,least(coalesce(p_hours,24),168)),
    greatest(5,least(coalesce(p_limit,20),30))
  );
$$;

revoke all on function public.pppp_chatgpt_change_intelligence_v1(integer,integer) from public;
revoke all on function public.pppp_chatgpt_change_intelligence_v1(integer,integer) from anon;
revoke all on function public.pppp_chatgpt_change_intelligence_v1(integer,integer) from authenticated;
grant execute on function public.pppp_chatgpt_change_intelligence_v1(integer,integer) to service_role;
grant execute on function public.pppp_chatgpt_change_intelligence_v1(integer,integer) to supabase_read_only_user;

create or replace function public.pppp_chatgpt_control_tower_v2(p_hours integer default 24,p_days integer default 30,p_limit integer default 10)
returns jsonb
language plpgsql
stable
security definer
set search_path=pg_catalog,public
as $$
declare
  v_days integer:=greatest(1,least(coalesce(p_days,30),90));
  v_limit integer:=greatest(5,least(coalesce(p_limit,10),30));
  v_current jsonb;
  v_compact jsonb;
  v_changes jsonb;
begin
  v_current:=public.pppp_chatgpt_control_tower_v1(v_days,v_limit);
  v_compact:=public.pppp_intelligence_compact_from_control_tower_v1(v_current,v_limit);
  v_changes:=public.pppp_intelligence_change_from_state_v1(v_compact,p_hours,v_limit);
  return v_current || jsonb_build_object(
    'control_tower_version',2,'mode','read_only_operating_picture_with_historical_delta',
    'historical_delta_available',coalesce((v_changes->>'historical_delta_available')::boolean,false),'change_intelligence',v_changes,
    'intelligence_limits',jsonb_build_array(
      'Historical change detection starts only from stored intelligence snapshots; no pre-snapshot history is inferred.',
      'A no-longer-present item is not automatically treated as resolved.',
      'No cash balance is inferred without a canonical bank balance source.',
      'Supplier Intelligence remains request/project scoped and does not select or commit suppliers.',
      'Unresolved inbox items are not forced into projects.','Protected actions remain human-gated.'
    )
  );
end;
$$;

revoke all on function public.pppp_chatgpt_control_tower_v2(integer,integer,integer) from public;
revoke all on function public.pppp_chatgpt_control_tower_v2(integer,integer,integer) from anon;
revoke all on function public.pppp_chatgpt_control_tower_v2(integer,integer,integer) from authenticated;
grant execute on function public.pppp_chatgpt_control_tower_v2(integer,integer,integer) to service_role;
grant execute on function public.pppp_chatgpt_control_tower_v2(integer,integer,integer) to supabase_read_only_user;

do $$
begin
  if not exists(select 1 from cron.job where jobname='pppp-intelligence-snapshot-hourly-v1') then
    perform cron.schedule('pppp-intelligence-snapshot-hourly-v1','5 * * * *','select public.pppp_intelligence_snapshot_capture_v1(''cron'');');
  end if;
end;
$$;