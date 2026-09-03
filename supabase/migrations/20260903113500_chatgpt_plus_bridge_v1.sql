-- PPPP ChatGPT Plus bridge v1
-- Purpose: maximize the existing ChatGPT Plus + Supabase/Gmail/Drive/GitHub connection
-- without requiring a private MCP app or a more expensive ChatGPT plan.
--
-- This is an internal backend contract only. It does not send email, approve pricing,
-- select suppliers, mark projects won/lost, create POs/contracts, or make external commitments.
-- Read helpers are service-role/internal only. The only write helper records an
-- idempotent, unverified SUGGESTION in canonical project context.

create or replace function public.pppp_chatgpt_search_projects_v1(
  p_query text default null,
  p_limit integer default 20
)
returns table(
  id uuid,
  name text,
  client text,
  ref text,
  business_ref text,
  status text,
  pipeline_stage text,
  operational_state text,
  last_activity_at timestamptz,
  last_email_at timestamptz,
  drive_folder_url text
)
language sql
stable
security invoker
set search_path to 'pg_catalog','public'
as $function$
  select
    p.id,
    p.name,
    p.client,
    p.ref,
    p.business_ref,
    p.status,
    p.pipeline_stage,
    p.operational_state,
    p.last_activity_at,
    p.last_email_at,
    p.drive_folder_url
  from public.projects p
  where nullif(btrim(coalesce(p_query,'')),'') is null
     or concat_ws(' ',p.name,p.client,p.ref,p.business_ref,p.location) ilike '%' || btrim(p_query) || '%'
  order by
    case when lower(coalesce(p.status,'')) in ('humbur','lost','arkivuar','archived','mbyllur','closed','cancelled','canceled') then 1 else 0 end,
    p.last_activity_at desc nulls last,
    p.updated_at desc nulls last,
    p.created_at desc
  limit greatest(1,least(coalesce(p_limit,20),50));
$function$;

create or replace function public.pppp_chatgpt_priority_actions_v1(
  p_limit integer default 50
)
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog','public'
as $function$
  select coalesce(
    jsonb_agg(to_jsonb(x) order by x.due_date nulls last, x.created_at desc),
    '[]'::jsonb
  )
  from (
    select
      a.id,
      a.project_id,
      a.project_name,
      a.client,
      a.title,
      a.detail,
      a.due_date,
      a.priority,
      a.status,
      a.source,
      a.source_ref,
      a.category,
      a.created_at,
      a.operational_state,
      a.pipeline_stage,
      a.last_activity_at,
      a.last_email_at
    from public.pppp_home_current_actions_v1 a
    order by a.due_date nulls last, a.created_at desc
    limit greatest(1,least(coalesce(p_limit,50),100))
  ) x;
$function$;

create or replace function public.pppp_chatgpt_project_snapshot_v1(
  p_project_id uuid,
  p_email_limit integer default 20,
  p_fact_limit integer default 30,
  p_task_limit integer default 25,
  p_document_limit integer default 20
)
returns jsonb
language plpgsql
stable
security invoker
set search_path to 'pg_catalog','public'
as $function$
declare
  v_project jsonb;
  v_email_limit integer := greatest(1,least(coalesce(p_email_limit,20),50));
  v_fact_limit integer := greatest(1,least(coalesce(p_fact_limit,30),80));
  v_task_limit integer := greatest(1,least(coalesce(p_task_limit,25),80));
  v_document_limit integer := greatest(1,least(coalesce(p_document_limit,20),50));
begin
  if p_project_id is null then
    raise exception 'project_id_required' using errcode='22023';
  end if;

  select to_jsonb(pj)
    into v_project
  from (
    select
      p.id,
      p.name,
      p.client,
      p.ref,
      p.business_ref,
      p.location,
      p.deadline,
      p.status,
      p.pipeline_stage,
      p.deal_type,
      p.business_type,
      p.origin_type,
      p.work_model,
      p.operational_state,
      p.operational_state_at,
      p.operational_state_source,
      p.last_activity_at,
      p.last_email_at,
      p.updated_at,
      p.drive_folder_id,
      p.drive_folder_url
    from public.projects p
    where p.id=p_project_id
    limit 1
  ) pj;

  if v_project is null then
    raise exception 'project_not_found_or_not_visible' using errcode='P0002';
  end if;

  return jsonb_build_object(
    'generated_at',now(),
    'bridge','chatgpt-plus-v1',
    'read_only_snapshot',true,
    'project',v_project,
    'operator_actions',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.due_date nulls last,x.created_at desc)
      from (
        select
          a.id,a.title,a.detail,a.due_date,a.priority,a.status,a.source,a.source_ref,a.category,a.created_at
        from public.pppp_home_current_actions_v1 a
        where a.project_id=p_project_id
        order by a.due_date nulls last,a.created_at desc
        limit v_task_limit
      ) x
    ),'[]'::jsonb),
    'workflow_tasks',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.due_date nulls last,x.created_at desc)
      from (
        select
          t.id,t.title,t.detail,t.due_date,t.priority,t.status,t.source,t.source_ref,t.category,t.created_at
        from public.tasks t
        where t.project_id=p_project_id
          and lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed','arkivuar','archived')
          and coalesce(t.source,'')<>'automation_failure'
        order by t.due_date nulls last,t.created_at desc
        limit v_task_limit
      ) x
    ),'[]'::jsonb),
    'context_facts',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
      from (
        select
          f.id,f.category,f.subject,f.fact_key,f.value,f.source_type,f.source_ref,
          f.evidence_status,f.confidence,f.fact_status,f.updated_at,f.created_by
        from public.pppp_project_context_current_v f
        where f.project_id=p_project_id
          and f.fact_status in ('observed','suggested')
        order by f.updated_at desc
        limit v_fact_limit
      ) x
    ),'[]'::jsonb),
    'recent_emails',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.sent_at desc nulls last,x.id desc)
      from (
        select
          e.id,e.gmail_message_id,e.gmail_thread_id,e.from_email,e.from_name,e.to_emails,e.cc_emails,
          e.subject,left(coalesce(e.snippet,''),1200) as snippet,e.sent_at,e.direction,
          e.has_attachments,e.gmail_url,e.match_method,e.match_confidence,e.needs_review,e.review_reason
        from public.project_emails e
        where e.project_id=p_project_id
        order by e.sent_at desc nulls last,e.id desc
        limit v_email_limit
      ) x
    ),'[]'::jsonb),
    'documents',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select
          d.id,d.series,d.year,d.seq,d.doc_nr,d.client,d.total_eur,d.currency,d.total_amount,
          d.offer_state,d.followup_status,d.last_followup_at,d.followup_count,d.created_at
        from public.documents_registry d
        where d.project_id=p_project_id
        order by d.created_at desc
        limit v_document_limit
      ) x
    ),'[]'::jsonb),
    'supplier_decisions',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.decided_at desc nulls last,x.created_at desc)
      from (
        select
          s.id,s.supplier_offer_id,s.supplier_name,s.decision_type,s.status,s.source,
          s.evidence,s.notes,s.decided_at,s.created_at,s.updated_at
        from public.project_supplier_decisions s
        where s.project_id=p_project_id
        order by s.decided_at desc nulls last,s.created_at desc
        limit 20
      ) x
    ),'[]'::jsonb)
  );
end;
$function$;

create or replace function public.pppp_chatgpt_record_context_suggestion_v1(
  p_project_id uuid,
  p_fact_key text,
  p_value jsonb,
  p_category text default 'chatgpt_note',
  p_subject text default null,
  p_confidence numeric default 0.60,
  p_source_ref text default 'chatgpt-plus-bridge',
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $function$
declare
  v_idempotency_key text;
begin
  if p_project_id is null then
    raise exception 'project_id_required' using errcode='22023';
  end if;
  if nullif(btrim(coalesce(p_fact_key,'')),'') is null then
    raise exception 'fact_key_required' using errcode='22023';
  end if;
  if p_confidence is not null and (p_confidence<0 or p_confidence>1) then
    raise exception 'confidence_out_of_range' using errcode='22023';
  end if;

  v_idempotency_key := coalesce(
    nullif(btrim(coalesce(p_idempotency_key,'')),''),
    'chatgpt-plus:' || p_project_id::text || ':' || md5(btrim(p_fact_key) || '|' || coalesce(p_value,'{}'::jsonb)::text)
  );

  return public.pppp_ingest_context_fact_v1(
    p_project_id,
    btrim(p_fact_key),
    coalesce(p_value,'{}'::jsonb),
    coalesce(nullif(btrim(coalesce(p_category,'')),''),'chatgpt_note'),
    nullif(btrim(coalesce(p_subject,'')),''),
    'chatgpt',
    coalesce(nullif(btrim(coalesce(p_source_ref,'')),''),'chatgpt-plus-bridge'),
    'unverified',
    p_confidence,
    'suggested',
    v_idempotency_key,
    'chatgpt_pppp_bridge'
  );
end;
$function$;

-- Keep the Plus bridge internal. ChatGPT reaches it through the already-connected
-- Supabase management/plugin path; it is not a new public Data API surface.
revoke all on function public.pppp_chatgpt_search_projects_v1(text,integer) from public,anon,authenticated;
revoke all on function public.pppp_chatgpt_priority_actions_v1(integer) from public,anon,authenticated;
revoke all on function public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.pppp_chatgpt_record_context_suggestion_v1(uuid,text,jsonb,text,text,numeric,text,text) from public,anon,authenticated;

grant execute on function public.pppp_chatgpt_search_projects_v1(text,integer) to service_role;
grant execute on function public.pppp_chatgpt_priority_actions_v1(integer) to service_role;
grant execute on function public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer) to service_role;
grant execute on function public.pppp_chatgpt_record_context_suggestion_v1(uuid,text,jsonb,text,text,numeric,text,text) to service_role;

comment on function public.pppp_chatgpt_search_projects_v1(text,integer) is
  'Internal ChatGPT Plus bridge: compact project search contract over live PPPP data.';
comment on function public.pppp_chatgpt_priority_actions_v1(integer) is
  'Internal ChatGPT Plus bridge: operator-safe priority actions using the canonical Home projection.';
comment on function public.pppp_chatgpt_project_snapshot_v1(uuid,integer,integer,integer,integer) is
  'Internal ChatGPT Plus bridge: read-only project snapshot with actions, workflow tasks, context, Gmail evidence, documents and supplier decisions.';
comment on function public.pppp_chatgpt_record_context_suggestion_v1(uuid,text,jsonb,text,text,numeric,text,text) is
  'Internal ChatGPT Plus bridge write boundary: records only unverified suggested context; never external commitments or approvals.';
