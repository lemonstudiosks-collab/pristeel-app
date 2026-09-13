-- PPPP project memory primary-analysis v2
--
-- Purpose:
-- * stop treating the chronologically newest project_analyses row as the
--   project's canonical narrative when that row is a commercial/procurement
--   dimension without an executive summary;
-- * never let an analysis older than the current operational_state_at
--   override the canonical project state in memory;
-- * refresh existing project.memory.baseline.v1 facts once with payload v2.
--
-- This migration is memory/read-model only. It creates no tasks, changes no
-- project state, sends no email, and does not cross any protected human gate.

create or replace function public.pppp_project_primary_analysis_v1(p_project_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog','public'
as $function$
select jsonb_strip_nulls(jsonb_build_object(
  'id',a.id,
  'created_at',a.created_at,
  'engine',a.engine,
  'model',a.model,
  'executive_summary',left(a.analysis->>'executive_summary',2500),
  'current_stage',a.analysis->'current_stage',
  'health',a.analysis->'health',
  'recommendation',a.analysis->'recommendation',
  'next_actions',coalesce(a.analysis->'next_actions','[]'::jsonb),
  'risks',coalesce(a.analysis->'risks','[]'::jsonb),
  'missing_information',coalesce(a.analysis->'missing_information','[]'::jsonb)
))
from public.project_analyses a
join public.projects p on p.id=p_project_id
where a.project_id=p_project_id::text
  and a.status='complete'
  and nullif(btrim(coalesce(a.analysis->>'executive_summary','')),'') is not null
  and a.created_at>=coalesce(p.operational_state_at,'epoch'::timestamptz)
order by a.created_at desc,a.id desc
limit 1;
$function$;

revoke all on function public.pppp_project_primary_analysis_v1(uuid) from public;
grant execute on function public.pppp_project_primary_analysis_v1(uuid) to service_role;

comment on function public.pppp_project_primary_analysis_v1(uuid) is
  'Returns the newest summarized project analysis that is not older than the canonical operational_state_at. Commercial/procurement dimension rows without executive_summary are intentionally excluded.';

create or replace function public.pppp_project_memory_fingerprint_v2(p_project_id uuid)
returns text
language sql
stable
set search_path to 'pg_catalog','public'
as $function$
select case
  when public.pppp_project_memory_fingerprint_v1(p_project_id) is null then null
  else md5('project-memory-v2|primary-analysis-v1|'||public.pppp_project_memory_fingerprint_v1(p_project_id))
end;
$function$;

revoke all on function public.pppp_project_memory_fingerprint_v2(uuid) from public;
grant execute on function public.pppp_project_memory_fingerprint_v2(uuid) to service_role;

create or replace function public.pppp_project_memory_payload_v2(p_project_id uuid)
returns jsonb
language sql
stable
set search_path to 'pg_catalog','public'
as $function$
with base as (
  select public.pppp_project_memory_payload_v1(p_project_id) as payload
), primary_analysis as (
  select public.pppp_project_primary_analysis_v1(p_project_id) as analysis
), shaped as (
  select
    b.payload,
    pa.analysis,
    coalesce((b.payload->'communication'->>'total_emails')::int,0) as email_total,
    coalesce((b.payload->'communication'->>'incoming')::int,0) as email_incoming,
    coalesce((b.payload->'communication'->>'outgoing')::int,0) as email_outgoing,
    jsonb_array_length(coalesce(b.payload->'contacts','[]'::jsonb)) as contact_total,
    jsonb_array_length(coalesce(b.payload->'supplier_offers','[]'::jsonb)) as supplier_offer_total,
    jsonb_array_length(coalesce(b.payload->'client_offers','[]'::jsonb)) as client_offer_total,
    coalesce(b.payload->'project'->>'operational_state','pa gjendje') as operational_state,
    coalesce(b.payload->'project'->>'pipeline_stage','pa fazë') as pipeline_stage
  from base b cross join primary_analysis pa
)
select
  (s.payload - 'version' - 'source_fingerprint' - 'summary' - 'latest_analysis')
  || jsonb_build_object(
    'version',2,
    'memory_only',true,
    'action_required',false,
    'home_visible',false,
    'source_fingerprint',public.pppp_project_memory_fingerprint_v2(p_project_id),
    'primary_analysis_policy','summarized_and_not_older_than_operational_state_v1',
    'summary',concat(
      'Memoria bazë e projektit: ',s.email_total,' email-e (',s.email_incoming,' hyrëse / ',s.email_outgoing,' dalëse), ',
      s.contact_total,' kontakte, ',s.supplier_offer_total,' oferta furnitorësh, ',s.client_offer_total,' oferta klienti. ',
      'Gjendja kanonike: ',s.operational_state,' / ',s.pipeline_stage,'.',
      case
        when nullif(coalesce(s.analysis->>'executive_summary',''),'') is not null
          then ' Analiza primare: '||left(s.analysis->>'executive_summary',900)
        else ''
      end
    ),
    'latest_analysis',s.analysis
  )
from shaped s;
$function$;

revoke all on function public.pppp_project_memory_payload_v2(uuid) from public;
grant execute on function public.pppp_project_memory_payload_v2(uuid) to service_role;

comment on function public.pppp_project_memory_payload_v2(uuid) is
  'Project memory payload v2. Preserves v1 evidence/history payload but replaces raw chronological latest_analysis with a state-safe primary analysis selector.';

create or replace function public.pppp_project_memory_baseline_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 25
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
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
    v_fp:=public.pppp_project_memory_fingerprint_v2(r.id);
    v_old_id:=null;v_old_fp:=null;

    select f.id,f.value->>'source_fingerprint' into v_old_id,v_old_fp
    from public.pppp_project_context_facts f
    where f.project_id=r.id
      and f.fact_key='project.memory.baseline.v1'
      and f.fact_status<>'dismissed'
    order by f.created_at desc,f.id desc
    limit 1;

    if v_fp is not null and v_fp=v_old_fp then
      v_unchanged:=v_unchanged+1;
      v_items:=v_items||jsonb_build_array(jsonb_build_object(
        'project_id',r.id,'name',r.name,'action','unchanged','fingerprint',v_fp,'memory_version',2
      ));
      continue;
    end if;

    if p_apply then
      v_payload:=public.pppp_project_memory_payload_v2(r.id);
      insert into public.pppp_project_context_facts(
        project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,
        supersedes_id,idempotency_key,created_by
      ) values(
        r.id,'project_memory','Memoria bazë — '||r.name,'project.memory.baseline.v1',v_payload,
        'system',r.id::text,'observed',1,'observed',v_old_id,
        'project-memory-baseline-v2:'||r.id::text||':'||v_fp,'pppp-project-memory-baseline-v2'
      )
      on conflict do nothing;
      if found then v_created:=v_created+1; end if;
    end if;

    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'project_id',r.id,
      'name',r.name,
      'action',case when p_apply then 'baseline_refreshed' else 'would_refresh' end,
      'fingerprint',v_fp,
      'memory_version',2
    ));
  end loop;

  return jsonb_build_object(
    'apply',p_apply,
    'checked',v_checked,
    'created_or_refreshed',v_created,
    'unchanged',v_unchanged,
    'memory_version',2,
    'memory_only',true,
    'human_gates_preserved',true,
    'items',v_items,
    'generated_at',now()
  );
end;
$function$;

comment on function public.pppp_project_memory_baseline_reconcile_v1(boolean,integer) is
  'Refreshes memory-only project baselines using payload/fingerprint v2. Does not create tasks, change project state, or cross protected human gates.';
