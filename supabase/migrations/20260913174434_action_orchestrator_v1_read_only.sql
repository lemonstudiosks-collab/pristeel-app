create or replace function public.pppp_chatgpt_action_orchestrator_v1(
  p_days integer default 30,
  p_limit integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_days integer := greatest(1,least(coalesce(p_days,30),90));
  v_limit integer := greatest(1,least(coalesce(p_limit,30),60));
  v_situations jsonb := '{}'::jsonb;
  v_proposals jsonb := '[]'::jsonb;
  v_project_proposals jsonb := '[]'::jsonb;
  v_inbox_proposals jsonb := '[]'::jsonb;
  v_proposal_count integer := 0;
  v_human_gate_count integer := 0;
  v_draftable_count integer := 0;
  v_controlled_write_count integer := 0;
begin
  v_situations := public.pppp_chatgpt_situation_intelligence_v1(v_days,least(v_limit,40));

  with src as (
    select elem,
           coalesce((elem->>'portfolio_rank_score')::integer,0) as base_score,
           lower(coalesce(elem->'recommendation'->>'decision','')) as decision
    from jsonb_array_elements(coalesce(v_situations->'project_situations','[]'::jsonb)) x(elem)
    where coalesce((elem->>'attention_required')::boolean,false)
  ), shaped as (
    select jsonb_build_object(
      'proposal_id','project:'||(elem->'project'->>'id')||':'||case
        when decision='review_and_send_offer' then 'prepare_offer_review'
        when decision='prepare_client_offer' then 'prepare_offer_review'
        when decision like 'human_gate_%' then 'request_human_project_decision'
        when elem->>'situation_state'='execution_attention' then 'review_execution_blockers'
        when elem->>'situation_state'='active_work_attention' then 'review_active_work'
        else 'review_current_actions' end,
      'proposal_version',1,
      'source_situation_id',elem->>'situation_id',
      'source_situation_kind','project',
      'priority_score',least(100, greatest(1, base_score - 40 + case
        when decision='review_and_send_offer' then 25
        when decision='prepare_client_offer' then 20
        when decision like 'human_gate_%' then 25
        when elem->>'situation_state'='execution_attention' then 20
        else 10 end)),
      'action_kind',case
        when decision='review_and_send_offer' then 'prepare_offer_review'
        when decision='prepare_client_offer' then 'prepare_offer_review'
        when decision like 'human_gate_%' then 'request_human_project_decision'
        when elem->>'situation_state'='execution_attention' then 'review_execution_blockers'
        when elem->>'situation_state'='active_work_attention' then 'review_active_work'
        else 'review_current_actions' end,
      'action_label',case
        when decision='review_and_send_offer' then 'Përgatit paketën e ofertës për review'
        when decision='prepare_client_offer' then 'Përgatit ofertën për review'
        when decision like 'human_gate_%' then 'Kërko vendim njerëzor për statusin e projektit'
        when elem->>'situation_state'='execution_attention' then 'Rishiko bllokuesit e ekzekutimit'
        when elem->>'situation_state'='active_work_attention' then 'Rishiko punën aktive dhe veprimin vijues'
        else 'Rishiko veprimet aktuale të projektit' end,
      'project',jsonb_build_object(
        'project_id',elem->'project'->>'id',
        'project_name',elem->'project'->>'name',
        'client',elem->'project'->>'client',
        'operational_state',elem->'project'->>'operational_state',
        'pipeline_stage',elem->'project'->>'pipeline_stage'
      ),
      'rationale',coalesce(elem->>'summary',''),
      'recommended_decision',coalesce(elem->'recommendation','{}'::jsonb),
      'risk',coalesce(elem->'risk','{}'::jsonb),
      'open_issues',coalesce(elem->'open_issues','[]'::jsonb),
      'artifact_to_prepare',case
        when decision in ('review_and_send_offer','prepare_client_offer') then 'offer_review_packet'
        when decision like 'human_gate_%' then 'decision_brief'
        when elem->>'situation_state'='execution_attention' then 'execution_review_brief'
        else 'action_review_brief' end,
      'draft_preparation_allowed',true,
      'controlled_write_proposal_allowed',case when elem->>'situation_state' in ('execution_attention','active_work_attention','action_required') then true else false end,
      'controlled_write_action_type',case when elem->>'situation_state' in ('execution_attention','active_work_attention','action_required') then 'task' else null end,
      'approval_gates',coalesce(elem->'gates_triggered','[]'::jsonb),
      'execution_allowed',false,
      'execution_block_reason','Action Orchestrator v1 is proposal-only. External, binding, pricing, supplier-selection and disposition actions require explicit human approval.',
      'evidence',coalesce(elem->'evidence','{}'::jsonb),
      'policy',jsonb_build_object(
        'proposal_only',true,
        'no_automatic_task_creation',true,
        'no_automatic_email_send',true,
        'no_automatic_project_write',true,
        'no_automatic_supplier_selection',true,
        'no_automatic_price_or_margin_decision',true,
        'no_automatic_project_disposition',true,
        'protected_human_gates_preserved',true
      )
    ) as proposal
    from src
  )
  select coalesce(jsonb_agg(proposal order by (proposal->>'priority_score')::integer desc),'[]'::jsonb)
    into v_project_proposals
  from shaped;

  with src as (
    select elem,
      coalesce((elem->>'priority_score')::integer,0) as priority_score,
      elem->>'situation_kind' as kind
    from jsonb_array_elements(coalesce(v_situations->'inbox_situations','[]'::jsonb)) x(elem)
  ), shaped as (
    select jsonb_build_object(
      'proposal_id',(elem->>'situation_id')||':'||case kind
        when 'new_opportunity_candidate' then 'review_new_opportunity'
        when 'supplier_offer_review' then 'review_supplier_offer'
        when 'legal_collection' then 'review_legal_matter'
        when 'project_outcome_review' then 'request_project_outcome_decision'
        when 'finance_document' then 'review_finance_document'
        when 'document_review' then 'review_received_document'
        else 'review_business_item' end,
      'proposal_version',1,
      'source_situation_id',elem->>'situation_id',
      'source_situation_kind','inbox',
      'priority_score',priority_score,
      'action_kind',case kind
        when 'new_opportunity_candidate' then 'review_new_opportunity'
        when 'supplier_offer_review' then 'review_supplier_offer'
        when 'legal_collection' then 'review_legal_matter'
        when 'project_outcome_review' then 'request_project_outcome_decision'
        when 'finance_document' then 'review_finance_document'
        when 'document_review' then 'review_received_document'
        else 'review_business_item' end,
      'action_label',case kind
        when 'new_opportunity_candidate' then 'Rishiko si opportunity të re dhe përgatit intake/reply draft'
        when 'supplier_offer_review' then 'Rishiko ofertën e furnitorit pa bërë selection/commitment'
        when 'legal_collection' then 'Rishiko çështjen juridike/inkasimin'
        when 'project_outcome_review' then 'Rishiko rezultatin e projektit dhe kërko vendim njerëzor'
        when 'finance_document' then 'Rishiko dokumentin financiar për procesim'
        when 'document_review' then 'Rishiko dokumentin e pranuar'
        else 'Rishiko çështjen e biznesit' end,
      'subject',elem->>'subject',
      'counterparty',coalesce(elem->'counterparty','{}'::jsonb),
      'project_context',coalesce(elem->'project_context','{}'::jsonb),
      'rationale',elem->>'why_now',
      'artifact_to_prepare',case kind
        when 'new_opportunity_candidate' then 'opportunity_intake_and_reply_draft'
        when 'supplier_offer_review' then 'supplier_offer_review_brief'
        when 'legal_collection' then 'legal_review_brief'
        when 'project_outcome_review' then 'project_outcome_decision_brief'
        when 'finance_document' then 'finance_document_review'
        when 'document_review' then 'document_review_brief'
        else 'business_review_brief' end,
      'draft_preparation_allowed',case when kind in ('new_opportunity_candidate','legal_collection','project_outcome_review','supplier_offer_review') then true else false end,
      'controlled_write_proposal_allowed',case
        when kind='new_opportunity_candidate' then true
        when kind='supplier_offer_review' and elem->'project_context'->>'resolution_status'='resolved' then true
        else false end,
      'controlled_write_action_type',case
        when kind='new_opportunity_candidate' then 'create_project'
        when kind='supplier_offer_review' and elem->'project_context'->>'resolution_status'='resolved' then 'supplier_offer'
        else null end,
      'approval_gates',case
        when kind='project_outcome_review' then jsonb_build_array('project_won_or_lost_decision')
        when kind='new_opportunity_candidate' then jsonb_build_array('external_email_send')
        when kind='supplier_offer_review' then jsonb_build_array('supplier_selection_or_commitment')
        when elem->>'protected_gate' is not null then jsonb_build_array(elem->>'protected_gate')
        else '[]'::jsonb end,
      'execution_allowed',false,
      'execution_block_reason',case
        when kind='new_opportunity_candidate' then 'May prepare intake and reply draft, but project creation and any external reply require explicit approval.'
        when kind='supplier_offer_review' then 'Offer may be reviewed; supplier selection or commitment is never automatic.'
        when kind='project_outcome_review' then 'Won/lost/disposition is a protected human decision.'
        else 'Action Orchestrator v1 is proposal-only.' end,
      'evidence',coalesce(elem->'evidence','{}'::jsonb),
      'policy',jsonb_build_object(
        'proposal_only',true,
        'no_automatic_task_creation',true,
        'no_automatic_email_send',true,
        'no_automatic_project_write',true,
        'no_automatic_supplier_selection',true,
        'no_automatic_price_or_margin_decision',true,
        'no_automatic_project_disposition',true,
        'protected_human_gates_preserved',true
      )
    ) as proposal
    from src
  )
  select coalesce(jsonb_agg(proposal order by (proposal->>'priority_score')::integer desc),'[]'::jsonb)
    into v_inbox_proposals
  from shaped;

  with all_proposals as (
    select elem from jsonb_array_elements(v_project_proposals) x(elem)
    union all
    select elem from jsonb_array_elements(v_inbox_proposals) x(elem)
  ), ranked as (
    select elem,
           row_number() over (order by (elem->>'priority_score')::integer desc, elem->>'proposal_id') as rn
    from all_proposals
  )
  select coalesce(jsonb_agg(elem order by (elem->>'priority_score')::integer desc, elem->>'proposal_id'),'[]'::jsonb)
    into v_proposals
  from ranked
  where rn<=v_limit;

  v_proposal_count := jsonb_array_length(v_proposals);

  select
    count(*) filter (where jsonb_array_length(coalesce(elem->'approval_gates','[]'::jsonb))>0)::integer,
    count(*) filter (where coalesce((elem->>'draft_preparation_allowed')::boolean,false))::integer,
    count(*) filter (where coalesce((elem->>'controlled_write_proposal_allowed')::boolean,false))::integer
  into v_human_gate_count,v_draftable_count,v_controlled_write_count
  from jsonb_array_elements(v_proposals) x(elem);

  return jsonb_build_object(
    'action_orchestrator_version',1,
    'mode','proposal_only',
    'read_only',true,
    'generated_at',now(),
    'days',v_days,
    'limit',v_limit,
    'summary',jsonb_build_object(
      'proposals',v_proposal_count,
      'proposals_with_human_gates',v_human_gate_count,
      'draft_preparation_candidates',v_draftable_count,
      'controlled_write_candidates',v_controlled_write_count,
      'executions_performed',0
    ),
    'proposals',v_proposals,
    'source_portfolio_summary',coalesce(v_situations->'portfolio_summary','{}'::jsonb),
    'policy',jsonb_build_object(
      'proposal_only',true,
      'execution_allowed',false,
      'drafts_may_be_prepared_but_not_sent',true,
      'controlled_writes_require_explicit_user_approval',true,
      'external_email_send_requires_human_approval',true,
      'supplier_selection_or_commitment_requires_human_approval',true,
      'final_selling_price_or_margin_requires_human_approval',true,
      'contract_or_purchase_order_commitment_requires_human_approval',true,
      'project_won_or_lost_decision_requires_human_approval',true,
      'unresolved_project_identity_blocks_project_specific_write',true,
      'protected_human_gates_preserved',true
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_action_orchestrator_v1(integer,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_action_orchestrator_v1(integer,integer) to service_role, supabase_read_only_user;
