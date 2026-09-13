-- Situation Intelligence v1
-- Repository reconciliation note: production evolved through four consecutive
-- migrations in the same change set. This file materializes the final read-only
-- function definitions so a clean rebuild reaches the same canonical state.

create or replace function public.pppp_chatgpt_project_situation_intelligence_v1(
  p_project_id uuid,
  p_days integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_snapshot jsonb;
  v_project jsonb;
  v_baseline_fact jsonb := '{}'::jsonb;
  v_memory jsonb := '{}'::jsonb;
  v_analysis jsonb := '{}'::jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_tasks jsonb := '[]'::jsonb;
  v_open_issues jsonb := '[]'::jsonb;
  v_risks jsonb := '[]'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_recommendation jsonb := '{}'::jsonb;
  v_project_state text;
  v_pipeline text;
  v_status text;
  v_decision text;
  v_deadline date;
  v_deadline_days integer;
  v_last_activity timestamptz;
  v_last_email timestamptz;
  v_activity_age_days integer;
  v_email_age_days integer;
  v_workflow_task_count integer := 0;
  v_workflow_overdue_count integer := 0;
  v_action_count integer := 0;
  v_overdue_action_count integer := 0;
  v_due_7d_action_count integer := 0;
  v_high_action_count integer := 0;
  v_overdue_high_action_count integer := 0;
  v_analysis_action_count integer := 0;
  v_critical_risk_count integer := 0;
  v_high_risk_count integer := 0;
  v_risk_score integer := 0;
  v_risk_level text := 'low';
  v_situation_state text := 'monitor';
  v_attention_required boolean := false;
  v_suppressed_by_state boolean := false;
  v_summary text;
  v_days integer := greatest(1, least(coalesce(p_days,60),180));
  v_gates jsonb := '[]'::jsonb;
begin
  if p_project_id is null then
    raise exception 'project_id_required' using errcode='22023';
  end if;

  v_snapshot := public.pppp_chatgpt_project_snapshot_v1(p_project_id, 8, 30, 40, 8);
  v_project := coalesce(v_snapshot->'project','{}'::jsonb);
  v_actions := coalesce(v_snapshot->'operator_actions','[]'::jsonb);
  v_tasks := coalesce(v_snapshot->'workflow_tasks','[]'::jsonb);

  select elem into v_baseline_fact
  from jsonb_array_elements(coalesce(v_snapshot->'context_facts','[]'::jsonb)) as x(elem)
  where elem->>'fact_key'='project.memory.baseline.v1'
  order by nullif(elem->>'updated_at','')::timestamptz desc nulls last
  limit 1;

  v_baseline_fact := coalesce(v_baseline_fact,'{}'::jsonb);
  v_memory := coalesce(v_baseline_fact->'value','{}'::jsonb);
  v_analysis := coalesce(v_memory->'latest_analysis','{}'::jsonb);
  v_risks := coalesce(v_analysis->'risks','[]'::jsonb);
  v_missing := coalesce(v_analysis->'missing_information','[]'::jsonb);
  v_recommendation := coalesce(v_analysis->'recommendation','{}'::jsonb);
  v_decision := coalesce(v_recommendation->>'decision','');

  v_project_state := lower(coalesce(v_project->>'operational_state',''));
  v_pipeline := lower(coalesce(v_project->>'pipeline_stage',''));
  v_status := lower(coalesce(v_project->>'status',''));
  v_deadline := nullif(v_project->>'deadline','')::date;
  v_last_activity := nullif(v_project->>'last_activity_at','')::timestamptz;
  v_last_email := nullif(v_project->>'last_email_at','')::timestamptz;
  v_deadline_days := case when v_deadline is null then null else v_deadline-current_date end;
  v_activity_age_days := case when v_last_activity is null then null else greatest(0,floor(extract(epoch from (now()-v_last_activity))/86400)::integer) end;
  v_email_age_days := case when v_last_email is null then null else greatest(0,floor(extract(epoch from (now()-v_last_email))/86400)::integer) end;

  select count(*)::integer,
         count(*) filter (where nullif(elem->>'due_date','')::date < current_date)::integer
  into v_workflow_task_count,v_workflow_overdue_count
  from jsonb_array_elements(v_tasks) as x(elem);

  select
    count(*)::integer,
    count(*) filter (where nullif(elem->>'due_date','')::date < current_date)::integer,
    count(*) filter (where nullif(elem->>'due_date','')::date between current_date and current_date+7)::integer,
    count(*) filter (where lower(coalesce(elem->>'priority','')) in ('urgent','urgjent','critical','high','larte','lartë','e larte','e lartë'))::integer,
    count(*) filter (
      where nullif(elem->>'due_date','')::date < current_date
        and lower(coalesce(elem->>'priority','')) in ('urgent','urgjent','critical','high','larte','lartë','e larte','e lartë')
    )::integer
  into v_action_count,v_overdue_action_count,v_due_7d_action_count,v_high_action_count,v_overdue_high_action_count
  from jsonb_array_elements(v_actions) as x(elem);

  v_analysis_action_count := jsonb_array_length(coalesce(v_analysis->'next_actions','[]'::jsonb));

  select
    count(*) filter (where lower(coalesce(elem->>'severity',''))='critical')::integer,
    count(*) filter (where lower(coalesce(elem->>'severity',''))='high')::integer
  into v_critical_risk_count,v_high_risk_count
  from jsonb_array_elements(v_risks) as x(elem);

  select coalesce(jsonb_agg(elem order by sort_due nulls last, sort_created desc nulls last),'[]'::jsonb)
    into v_open_issues
  from (
    select elem,
      nullif(elem->>'due_date','')::date as sort_due,
      nullif(elem->>'created_at','')::timestamptz as sort_created
    from jsonb_array_elements(v_actions) as x(elem)
    order by
      case lower(coalesce(elem->>'priority',''))
        when 'urgent' then 1 when 'urgjent' then 1 when 'critical' then 1
        when 'high' then 2 when 'larte' then 2 when 'lartë' then 2 when 'e larte' then 2 when 'e lartë' then 2
        else 3 end,
      nullif(elem->>'due_date','')::date nulls last,
      nullif(elem->>'created_at','')::timestamptz desc nulls last
    limit 5
  ) q;

  v_suppressed_by_state := v_project_state in ('wait_for_client','waiting_for_client','closed','mbyllur');

  if not v_suppressed_by_state then
    v_risk_score := v_risk_score
      + case when v_overdue_high_action_count>0 then 5 else 0 end
      + case when v_overdue_action_count>0 then 2 else 0 end
      + case when v_due_7d_action_count>0 then 1 else 0 end
      + case when v_high_action_count>0 then 2 else 0 end
      + case when v_analysis_action_count>0 then 3 else 0 end
      + case when v_decision like 'human_gate_%' then 2 else 0 end;
  end if;

  v_risk_score := v_risk_score
    + case when v_critical_risk_count>0 then 4 else 0 end
    + case when v_high_risk_count>0 then 2 else 0 end
    + case when v_deadline_days is not null and v_deadline_days<0 and v_project_state not in ('closed','mbyllur','wait_for_client','waiting_for_client') then 4 else 0 end
    + case when v_deadline_days is not null and v_deadline_days between 0 and 7 and v_project_state not in ('closed','mbyllur','wait_for_client','waiting_for_client') then 2 else 0 end
    + case when v_project_state='action_required' then 3 else 0 end;

  if v_project_state in ('closed','mbyllur') or v_status in ('humbur','mbyllur','closed') then
    v_risk_level := 'informational';
    v_situation_state := 'closed';
    v_attention_required := false;
  else
    v_risk_level := case
      when v_risk_score>=7 then 'critical'
      when v_risk_score>=4 then 'high'
      when v_risk_score>=2 then 'medium'
      else 'low'
    end;

    v_situation_state := case
      when v_project_state in ('wait_for_client','waiting_for_client') then 'waiting_external'
      when v_project_state='execution' and (v_risk_score>=4 or v_analysis_action_count>0 or v_action_count>0) then 'execution_attention'
      when v_project_state='execution' then 'execution_monitor'
      when v_project_state='action_required' then 'action_required'
      when v_project_state='active_work' and (v_risk_score>=3 or v_analysis_action_count>0 or v_action_count>0) then 'active_work_attention'
      when v_project_state='active_work' then 'active_work'
      when v_action_count>0 or v_decision like 'human_gate_%' then 'action_required'
      when v_pipeline='pricing' and v_analysis_action_count>0 then 'commercial_attention'
      else 'monitor'
    end;

    v_attention_required := case
      when v_project_state in ('wait_for_client','waiting_for_client') then false
      when v_situation_state in ('execution_attention','action_required','active_work_attention','commercial_attention') then true
      else false
    end;
  end if;

  if v_decision='review_and_send_offer' then
    v_gates := jsonb_build_array('external_email_send','final_selling_price_or_margin');
  elsif v_decision='prepare_client_offer' then
    v_gates := jsonb_build_array('final_selling_price_or_margin');
  elsif v_decision like 'human_gate_%' then
    v_gates := jsonb_build_array('project_won_or_lost_decision');
  end if;

  v_summary := coalesce(
    nullif(v_analysis->>'executive_summary',''),
    nullif(v_memory->>'summary',''),
    case
      when v_project_state='execution' then 'Projekti është në ekzekutim.'
      when v_project_state in ('wait_for_client','waiting_for_client') then 'Projekti është në pritje të palës tjetër.'
      when v_project_state='active_work' then 'Projekti është në punë aktive.'
      else 'Situata kërkon monitorim sipas gjendjes kanonike të projektit.'
    end
  );

  return jsonb_build_object(
    'situation_intelligence_version',1,
    'read_only',true,
    'generated_at',now(),
    'window_days',v_days,
    'situation_id','project:'||p_project_id::text,
    'situation_kind','project',
    'project',v_project,
    'situation_state',v_situation_state,
    'attention_required',v_attention_required,
    'risk',jsonb_build_object(
      'level',v_risk_level,
      'score',v_risk_score,
      'critical_risks',v_critical_risk_count,
      'high_risks',v_high_risk_count,
      'analysis_risks',v_risks
    ),
    'signals',jsonb_build_object(
      'workflow_open_tasks',v_workflow_task_count,
      'workflow_overdue_tasks',v_workflow_overdue_count,
      'current_operator_actions',v_action_count,
      'overdue_operator_actions',v_overdue_action_count,
      'operator_actions_due_within_7_days',v_due_7d_action_count,
      'high_priority_operator_actions',v_high_action_count,
      'overdue_high_priority_operator_actions',v_overdue_high_action_count,
      'analysis_next_actions',v_analysis_action_count,
      'deadline_days',v_deadline_days,
      'last_activity_age_days',v_activity_age_days,
      'last_email_age_days',v_email_age_days,
      'workflow_task_urgency_not_used_for_scoring',true,
      'operator_action_urgency_suppressed_by_canonical_state',v_suppressed_by_state
    ),
    'summary',v_summary,
    'recommendation',case
      when v_recommendation<>'{}'::jsonb then v_recommendation
      when v_project_state in ('wait_for_client','waiting_for_client') then jsonb_build_object('decision','wait_for_client','label','Në pritje të palës tjetër','reason','Gjendja operative kanonike është wait_for_client.')
      when v_project_state='execution' then jsonb_build_object('decision','execution_monitor','label','Ndiq ekzekutimin','reason','Prioritetet vijnë nga prodhimi, dokumentacioni, dorëzimi dhe operator actions aktuale.')
      when v_action_count>0 then jsonb_build_object('decision','review_current_actions','label','Rishiko veprimet aktuale','reason','PPPP ka operator actions aktive për këtë projekt.')
      else jsonb_build_object('decision','review_current_state','label','Rishiko situatën aktuale','reason','Nuk ka rekomandim më specifik të konfirmuar në Project Memory.')
    end,
    'missing_information',v_missing,
    'open_issues',v_open_issues,
    'evidence',jsonb_build_object(
      'project_snapshot_generated_at',v_snapshot->'generated_at',
      'project_memory_fact_id',v_baseline_fact->>'id',
      'project_memory_updated_at',v_baseline_fact->>'updated_at',
      'project_memory_source_ref',v_baseline_fact->>'source_ref',
      'canonical_operational_state',v_project_state,
      'canonical_operational_state_at',v_project->>'operational_state_at'
    ),
    'gates_triggered',v_gates,
    'policy',jsonb_build_object(
      'recommendations_are_review_only',true,
      'no_task_creation',true,
      'no_email_send',true,
      'no_project_assignment',true,
      'no_project_disposition',true,
      'no_supplier_selection',true,
      'no_price_or_margin_decision',true,
      'missing_reply_alone_never_creates_action',true,
      'canonical_operational_state_has_precedence',true,
      'workflow_tasks_do_not_drive_urgency_scoring',true,
      'protected_human_gates_preserved',true
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_project_situation_intelligence_v1(uuid,integer) to service_role, supabase_read_only_user;

create or replace function public.pppp_chatgpt_situation_intelligence_v1(
  p_days integer default 30,
  p_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_days integer := greatest(1,least(coalesce(p_days,30),90));
  v_limit integer := greatest(1,least(coalesce(p_limit,20),40));
  v_priority_actions jsonb := '[]'::jsonb;
  v_inbox jsonb := '{}'::jsonb;
  v_project_situations jsonb := '[]'::jsonb;
  v_inbox_situations jsonb := '[]'::jsonb;
  v_project_count integer := 0;
  v_attention_project_count integer := 0;
  v_inbox_count integer := 0;
  v_new_opportunity_count integer := 0;
  v_offer_review_count integer := 0;
  v_legal_count integer := 0;
  v_finance_count integer := 0;
begin
  v_priority_actions := public.pppp_chatgpt_priority_actions_v1(100);
  v_inbox := public.pppp_chatgpt_business_inbox_project_resolution_v1(v_days,50);

  with action_projects as (
    select nullif(elem->>'project_id','')::uuid as project_id,
      110
        + case lower(coalesce(elem->>'priority',''))
            when 'urgent' then 20 when 'urgjent' then 20 when 'critical' then 20
            when 'high' then 15 when 'larte' then 15 when 'lartë' then 15 when 'e larte' then 15 when 'e lartë' then 15
            else 5 end
        + case when nullif(elem->>'due_date','')::date < current_date then 15 else 0 end as rank_score
    from jsonb_array_elements(coalesce(v_priority_actions,'[]'::jsonb)) as x(elem)
    where nullif(elem->>'project_id','') is not null
  ), project_pool as (
    select p.id as project_id,
      case lower(coalesce(p.operational_state,''))
        when 'execution' then 95
        when 'action_required' then 90
        when 'active_work' then 80
        when 'wait_for_client' then 45
        else 55 end
      + case when nullif(p.deadline,'')::date between current_date and current_date+14 then 10 else 0 end
      + case when p.last_activity_at is not null and p.last_activity_at >= now()-interval '14 days' then 5 else 0 end as rank_score
    from public.projects p
    where lower(coalesce(p.status,'')) not in ('humbur','mbyllur','closed','no_bid','no bid')
      and lower(coalesce(p.operational_state,'')) not in ('closed','mbyllur')
      and (
        p.last_activity_at >= now()-interval '120 days'
        or p.updated_at >= now()-interval '120 days'
        or nullif(p.deadline,'')::date >= current_date-30
      )
  ), candidates as (
    select project_id,max(rank_score) as rank_score
    from (
      select * from action_projects
      union all
      select * from project_pool
    ) u
    where project_id is not null
    group by project_id
    order by max(rank_score) desc, project_id
    limit v_limit
  ), situations as (
    select c.rank_score, public.pppp_chatgpt_project_situation_intelligence_v1(c.project_id,v_days) as item
    from candidates c
  )
  select coalesce(jsonb_agg(item || jsonb_build_object('portfolio_rank_score',rank_score) order by rank_score desc),'[]'::jsonb)
    into v_project_situations
  from situations;

  with items as (
    select elem
    from jsonb_array_elements(coalesce(v_inbox->'items','[]'::jsonb)) as x(elem)
    where elem->>'next_action_state' in ('action_candidate','process_document','semantic_review','waiting')
    order by coalesce((elem->>'priority_score')::integer,0) desc,
             nullif(elem->>'sent_at','')::timestamptz desc nulls last
    limit v_limit
  ), shaped as (
    select jsonb_build_object(
      'situation_intelligence_version',1,
      'read_only',true,
      'situation_id','inbox:'||coalesce(elem->>'gmail_message_id',elem->>'email_row_id','unknown'),
      'situation_kind',case
        when elem->>'recommended_action'='review_legal_or_collection_matter' then 'legal_collection'
        when elem->>'recommended_action'='review_project_outcome' then 'project_outcome_review'
        when elem->>'recommended_action'='review_received_offer' then 'supplier_offer_review'
        when elem->>'recommended_action'='process_finance_document' then 'finance_document'
        when elem->>'recommended_action'='review_received_document' then 'document_review'
        when elem->>'recommended_action'='review_and_reply'
          and coalesce((elem->'signals'->>'direct_request')::boolean,false)
          and coalesce(elem->'project_resolution'->>'resolution_status','unresolved')='unresolved'
          then 'new_opportunity_candidate'
        when elem->>'recommended_action'='review_and_reply' then 'reply_review'
        else 'business_review'
      end,
      'priority_score',coalesce((elem->>'priority_score')::integer,0),
      'subject',elem->>'subject',
      'counterparty',jsonb_build_object(
        'from_name',elem->>'from_name',
        'from_email',elem->>'from_email',
        'identity_status',elem->>'identity_status',
        'identity',coalesce(elem->'identity','{}'::jsonb)
      ),
      'project_context',jsonb_build_object(
        'resolution_status',coalesce(elem->'project_resolution'->>'resolution_status','unresolved'),
        'confidence',coalesce((elem->'project_resolution'->>'confidence')::integer,0),
        'recommended_project_id',elem->'project_resolution'->>'recommended_project_id',
        'recommended_project_name',elem->'project_resolution'->>'recommended_project_name',
        'assignment_allowed',false,
        'review_required',coalesce((elem->'project_resolution'->>'review_required')::boolean,true)
      ),
      'recommended_action',elem->>'recommended_action',
      'protected_gate',elem->>'protected_gate',
      'signals',coalesce(elem->'signals','{}'::jsonb),
      'why_now',left(coalesce(elem->>'current_snippet',''),500),
      'evidence',jsonb_build_object(
        'gmail_message_id',elem->>'gmail_message_id',
        'gmail_thread_id',elem->>'gmail_thread_id',
        'sent_at',elem->>'sent_at',
        'email_row_id',elem->>'email_row_id'
      ),
      'review_required',true,
      'policy',jsonb_build_object(
        'recommendation_only',true,
        'no_email_send',true,
        'no_project_assignment',true,
        'no_project_creation',true,
        'no_supplier_selection',true,
        'no_project_disposition',true,
        'protected_human_gates_preserved',true
      )
    ) as item
    from items
  )
  select coalesce(jsonb_agg(item order by (item->>'priority_score')::integer desc),'[]'::jsonb)
    into v_inbox_situations
  from shaped;

  v_project_count := jsonb_array_length(v_project_situations);
  select count(*)::integer into v_attention_project_count
  from jsonb_array_elements(v_project_situations) x(elem)
  where coalesce((elem->>'attention_required')::boolean,false);

  v_inbox_count := jsonb_array_length(v_inbox_situations);
  select
    count(*) filter (where elem->>'situation_kind'='new_opportunity_candidate')::integer,
    count(*) filter (where elem->>'situation_kind'='supplier_offer_review')::integer,
    count(*) filter (where elem->>'situation_kind'='legal_collection')::integer,
    count(*) filter (where elem->>'situation_kind'='finance_document')::integer
  into v_new_opportunity_count,v_offer_review_count,v_legal_count,v_finance_count
  from jsonb_array_elements(v_inbox_situations) x(elem);

  return jsonb_build_object(
    'situation_intelligence_version',1,
    'read_only',true,
    'generated_at',now(),
    'days',v_days,
    'limit',v_limit,
    'portfolio_summary',jsonb_build_object(
      'project_situations',v_project_count,
      'projects_requiring_attention',v_attention_project_count,
      'inbox_situations',v_inbox_count,
      'new_opportunity_candidates',v_new_opportunity_count,
      'supplier_offer_reviews',v_offer_review_count,
      'legal_collection_reviews',v_legal_count,
      'finance_documents',v_finance_count
    ),
    'project_situations',v_project_situations,
    'inbox_situations',v_inbox_situations,
    'policy',jsonb_build_object(
      'read_only_synthesis',true,
      'project_memory_is_primary_when_available',true,
      'project_resolution_v2_controls_project_identity',true,
      'unresolved_items_are_never_forced_into_projects',true,
      'missing_reply_alone_never_creates_action',true,
      'no_task_creation',true,
      'no_email_send',true,
      'no_project_assignment',true,
      'no_project_creation',true,
      'no_project_disposition',true,
      'no_supplier_selection',true,
      'no_price_or_margin_decision',true,
      'protected_human_gates_preserved',true
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_situation_intelligence_v1(integer,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_situation_intelligence_v1(integer,integer) to service_role, supabase_read_only_user;
