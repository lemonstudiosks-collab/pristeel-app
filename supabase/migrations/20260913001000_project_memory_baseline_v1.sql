-- PPPP Project Memory Baseline v1
-- Deterministic, memory-only project context. No tasks, status changes, emails,
-- supplier commitments, pricing decisions, contracts/POs, or won/lost decisions.

create or replace function public.pppp_project_memory_fingerprint_v1(p_project_id uuid)
returns text
language sql
stable
set search_path to 'pg_catalog','public'
as $$
with p as (
  select id,status,pipeline_stage,operational_state,operational_state_at,last_activity_at,last_email_at,deadline
  from public.projects where id=p_project_id
), e as (
  select count(*)::text c,coalesce(max(updated_at)::text,'' ) m from public.project_emails where project_id=p_project_id
), c as (
  select count(*)::text c,coalesce(max(updated_at)::text,'' ) m from public.project_contacts where project_id=p_project_id::text
), o as (
  select count(*)::text c,coalesce(max(created_at)::text,'' ) m from public.offers where project_id=p_project_id
), q as (
  select count(*)::text c,coalesce(max(created_at)::text,'' ) m from public.documents_registry where project_id=p_project_id
), d as (
  select count(*)::text c,coalesce(max(created_at)::text,'' ) m from public.project_attachment_links where project_id=p_project_id::text
), a as (
  select count(*)::text c,coalesce(max(created_at)::text,'' ) m from public.project_analyses where project_id=p_project_id::text
), f as (
  select count(*)::text c,coalesce(max(updated_at)::text,'' ) m
  from public.pppp_project_context_facts
  where project_id=p_project_id and fact_key<>'project.memory.baseline.v1'
)
select md5(concat_ws('|',
  p.id::text,coalesce(p.status,''),coalesce(p.pipeline_stage,''),coalesce(p.operational_state,''),
  coalesce(p.operational_state_at::text,''),coalesce(p.last_activity_at::text,''),coalesce(p.last_email_at::text,''),coalesce(p.deadline,''),
  e.c,e.m,c.c,c.m,o.c,o.m,q.c,q.m,d.c,d.m,a.c,a.m,f.c,f.m
))
from p cross join e cross join c cross join o cross join q cross join d cross join a cross join f;
$$;

create or replace function public.pppp_project_memory_payload_v1(p_project_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog','public'
as $$
with p as (
  select id,name,client,ref,business_ref,location,deadline,status,pipeline_stage,operational_state,
         operational_state_at,operational_state_source,origin_type,work_model,deal_type,business_type,
         last_activity_at,last_email_at,created_at,updated_at
  from public.projects where id=p_project_id
), email_stats as (
  select count(*)::int as total,
         count(*) filter(where direction='incoming')::int as incoming,
         count(*) filter(where direction='outgoing')::int as outgoing,
         count(distinct gmail_thread_id)::int as threads,
         count(*) filter(where coalesce(has_attachments,false))::int as with_attachments,
         min(sent_at) as first_email_at,max(sent_at) as last_email_at
  from public.project_emails where project_id=p_project_id
), contact_stats as (
  select count(*)::int as total from public.project_contacts
  where project_id=p_project_id::text and coalesce(status,'active')<>'archived'
), supplier_stats as (
  select count(*)::int as total from public.offers
  where project_id=p_project_id and coalesce(supplier,'') !~* '(oferta jone|our offer|pristeel)'
), quote_stats as (
  select count(*)::int as total from public.documents_registry
  where project_id=p_project_id and upper(coalesce(series,''))='QUO'
), attachment_stats as (
  select count(*)::int as total,
         count(*) filter(where lower(coalesce(analysis_status,'')) in ('complete','analyzed'))::int as analyzed,
         count(*) filter(where lower(coalesce(analysis_status,'pending')) in ('pending','queued','processing'))::int as pending
  from public.project_attachment_links where project_id=p_project_id::text
), latest_analysis as (
  select a.created_at,a.engine,a.model,a.analysis
  from public.project_analyses a
  where a.project_id=p_project_id::text and a.status='complete'
  order by a.created_at desc limit 1
), base as (
  select p.*,es.total email_total,es.incoming email_incoming,es.outgoing email_outgoing,
         es.threads email_threads,es.with_attachments email_with_attachments,es.first_email_at,es.last_email_at email_last_at,
         cs.total contact_total,ss.total supplier_offer_total,qs.total client_offer_total,
         ats.total attachment_total,ats.analyzed attachment_analyzed,ats.pending attachment_pending,
         la.created_at analysis_at,la.engine analysis_engine,la.model analysis_model,la.analysis
  from p cross join email_stats es cross join contact_stats cs cross join supplier_stats ss cross join quote_stats qs cross join attachment_stats ats
  left join latest_analysis la on true
)
select jsonb_strip_nulls(jsonb_build_object(
  'version',1,
  'memory_only',true,
  'action_required',false,
  'home_visible',false,
  'generated_at',now(),
  'source_fingerprint',public.pppp_project_memory_fingerprint_v1(p_project_id),
  'summary',concat(
    'Memoria bazë e projektit: ',b.email_total,' email-e (',b.email_incoming,' hyrëse / ',b.email_outgoing,' dalëse), ',
    b.contact_total,' kontakte, ',b.supplier_offer_total,' oferta furnitorësh, ',b.client_offer_total,' oferta klienti. ',
    'Gjendja kanonike: ',coalesce(b.operational_state,'pa gjendje'),' / ',coalesce(b.pipeline_stage,'pa fazë'),'.',
    case when nullif(coalesce(b.analysis->>'executive_summary',''),'') is not null then ' Analiza e fundit: '||left(b.analysis->>'executive_summary',900) else '' end
  ),
  'project',jsonb_strip_nulls(jsonb_build_object(
    'id',b.id,'name',b.name,'client',b.client,'reference',b.ref,'business_ref',b.business_ref,'location',b.location,'deadline',b.deadline,
    'status',b.status,'pipeline_stage',b.pipeline_stage,'operational_state',b.operational_state,'operational_state_at',b.operational_state_at,
    'operational_state_source',b.operational_state_source,'origin_type',b.origin_type,'work_model',b.work_model,'deal_type',b.deal_type,
    'business_type',b.business_type,'last_activity_at',b.last_activity_at,'last_email_at',b.last_email_at
  )),
  'communication',jsonb_build_object(
    'total_emails',b.email_total,'incoming',b.email_incoming,'outgoing',b.email_outgoing,'threads',b.email_threads,
    'emails_with_attachments',b.email_with_attachments,'first_email_at',b.first_email_at,'last_email_at',b.email_last_at
  ),
  'contacts',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.is_primary desc nulls last,x.email_count desc nulls last,x.last_seen desc nulls last)
    from (
      select id,name,email,company,role,source,is_primary,email_count,direct_count,cc_count,first_seen,last_seen
      from public.project_contacts
      where project_id=p_project_id::text and coalesce(status,'active')<>'archived'
      order by is_primary desc nulls last,email_count desc nulls last,last_seen desc nulls last limit 20
    ) x
  ),'[]'::jsonb),
  'recent_emails',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sent_at desc)
    from (
      select gmail_message_id,gmail_thread_id,direction,from_email,from_name,to_emails,cc_emails,subject,
             left(coalesce(snippet,''),1600) as snippet,sent_at,has_attachments,match_method,match_confidence
      from public.project_emails where project_id=p_project_id
      order by sent_at desc limit 20
    ) x
  ),'[]'::jsonb),
  'history_index',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.sent_at asc)
    from (
      select gmail_message_id,gmail_thread_id,direction,from_email,subject,sent_at,has_attachments
      from public.project_emails where project_id=p_project_id
      order by sent_at desc limit 120
    ) x
  ),'[]'::jsonb),
  'supplier_offers',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select id,supplier,offer_ref,currency,total_amount,total_eur,price_kg,qty_kg,delivery_weeks,incoterms,payment_terms,validity_days,cert,
             left(coalesce(notes,''),1000) as notes,created_at
      from public.offers
      where project_id=p_project_id and coalesce(supplier,'') !~* '(oferta jone|our offer|pristeel)'
      order by created_at desc limit 12
    ) x
  ),'[]'::jsonb),
  'client_offers',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.created_at desc)
    from (
      select id,doc_nr,client,currency,total_amount,total_eur,followup_status,last_followup_at,followup_count,created_at
      from public.documents_registry
      where project_id=p_project_id and upper(coalesce(series,''))='QUO'
      order by created_at desc limit 12
    ) x
  ),'[]'::jsonb),
  'documents',jsonb_build_object(
    'linked_attachments',b.attachment_total,'analyzed_attachments',b.attachment_analyzed,'pending_attachments',b.attachment_pending,
    'recent',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select id,attachment_name,analysis_status,analysis_method,analysis_confidence,bom_status,bom_applied_count,
               left(coalesce(extracted_text,''),1000) as extracted_text,created_at,analyzed_at
        from public.project_attachment_links
        where project_id=p_project_id::text
        order by created_at desc limit 20
      ) x
    ),'[]'::jsonb)
  ),
  'current_facts',coalesce((
    select jsonb_agg(to_jsonb(x) order by x.updated_at desc)
    from (
      select category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,updated_at
      from public.pppp_project_context_current_v
      where project_id=p_project_id and fact_status='observed' and fact_key<>'project.memory.baseline.v1'
      order by updated_at desc limit 15
    ) x
  ),'[]'::jsonb),
  'latest_analysis',case when b.analysis is null then null else jsonb_strip_nulls(jsonb_build_object(
    'created_at',b.analysis_at,'engine',b.analysis_engine,'model',b.analysis_model,
    'executive_summary',left(coalesce(b.analysis->>'executive_summary',''),2500),
    'current_stage',b.analysis->'current_stage','health',b.analysis->'health','recommendation',b.analysis->'recommendation',
    'next_actions',coalesce(b.analysis->'next_actions','[]'::jsonb),'risks',coalesce(b.analysis->'risks','[]'::jsonb),
    'missing_information',coalesce(b.analysis->'missing_information','[]'::jsonb)
  )) end
))
from base b;
$$;

create or replace function public.pppp_project_memory_baseline_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 25
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public'
as $$
declare
  r record;
  v_fp text;
  v_old_id uuid;
  v_old_fp text;
  v_payload jsonb;
  v_created int:=0;
  v_unchanged int:=0;
  v_checked int:=0;
  v_items jsonb:='[]'::jsonb;
begin
  for r in
    select p.id,p.name,p.last_activity_at
    from public.projects p
    where lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
    order by p.last_activity_at desc nulls last,p.updated_at desc,p.id
    limit greatest(1,least(coalesce(p_limit,25),100))
  loop
    v_checked:=v_checked+1;
    v_fp:=public.pppp_project_memory_fingerprint_v1(r.id);
    v_old_id:=null;v_old_fp:=null;
    select f.id,f.value->>'source_fingerprint' into v_old_id,v_old_fp
    from public.pppp_project_context_facts f
    where f.project_id=r.id and f.fact_key='project.memory.baseline.v1' and f.fact_status<>'dismissed'
    order by f.created_at desc,f.id desc limit 1;

    if v_fp is not null and v_fp=v_old_fp then
      v_unchanged:=v_unchanged+1;
      v_items:=v_items||jsonb_build_array(jsonb_build_object('project_id',r.id,'name',r.name,'action','unchanged','fingerprint',v_fp));
      continue;
    end if;

    if p_apply then
      v_payload:=public.pppp_project_memory_payload_v1(r.id);
      insert into public.pppp_project_context_facts(
        project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,
        supersedes_id,idempotency_key,created_by
      ) values(
        r.id,'project_memory','Memoria bazë — '||r.name,'project.memory.baseline.v1',v_payload,
        'system',r.id::text,'observed',1,'observed',v_old_id,
        'project-memory-baseline-v1:'||r.id::text||':'||v_fp,'pppp-project-memory-baseline-v1'
      )
      on conflict do nothing;
      if found then v_created:=v_created+1; end if;
    end if;

    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'project_id',r.id,'name',r.name,'action',case when p_apply then 'baseline_refreshed' else 'would_refresh' end,'fingerprint',v_fp
    ));
  end loop;

  return jsonb_build_object(
    'apply',p_apply,'checked',v_checked,'created_or_refreshed',v_created,'unchanged',v_unchanged,
    'memory_only',true,'human_gates_preserved',true,'items',v_items,'generated_at',now()
  );
end;
$$;

comment on function public.pppp_project_memory_payload_v1(uuid) is
  'Deterministic memory-only project context bundle. It creates no actions or operational changes.';
comment on function public.pppp_project_memory_baseline_reconcile_v1(boolean,integer) is
  'Refreshes project.memory.baseline.v1 facts only when canonical project evidence changes. No tasks/status/email/commercial actions.';

revoke all on function public.pppp_project_memory_fingerprint_v1(uuid) from public,anon,authenticated;
revoke all on function public.pppp_project_memory_payload_v1(uuid) from public,anon,authenticated;
revoke all on function public.pppp_project_memory_baseline_reconcile_v1(boolean,integer) from public,anon,authenticated;

-- Initial safe backfill for all active projects.
select public.pppp_project_memory_baseline_reconcile_v1(true,100);

-- Low-cost deterministic refresh. Recent-event intelligence remains separate and
-- continues to own action/state interpretation; this job only refreshes memory.
do $$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='project-memory-baseline-hourly' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule(
    'project-memory-baseline-hourly',
    '12 * * * *',
    'select public.pppp_project_memory_baseline_reconcile_v1(true,100);'
  );
end $$;
