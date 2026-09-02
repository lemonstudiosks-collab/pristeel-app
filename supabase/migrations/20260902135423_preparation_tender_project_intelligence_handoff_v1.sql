-- Preparation completeness v1: materialize linked tender dossier intelligence
-- into the canonical project while preserving the tender snapshot as provenance.

create unique index if not exists project_analyses_tender_snapshot_uidx
on public.project_analyses(project_id,engine,(source_manifest->>'source_ref'))
where engine='opportunity-tender-dossier-v1';

create or replace function public.pppp_tender_project_intelligence_handoff_v1(
  p_apply boolean default false,
  p_limit integer default 250
)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  q record;
  v_limit integer:=least(1000,greatest(1,coalesce(p_limit,250)));
  v_analysis jsonb;
  v_dossier jsonb;
  v_source_ref text;
  v_snapshot_ref text;
  v_analyzed_at text;
  v_complete boolean;
  v_confidence text;
  v_req_status text;
  v_candidates integer:=0;
  v_new_snapshots integer:=0;
  v_analyses integer:=0;
  v_requirements integer:=0;
  v_deleted_old integer:=0;
  v_rows integer:=0;
begin
  select count(*) into v_candidates
  from public.kek_tender_watch t
  where t.project_id is not null
    and t.payload ? 'dossier_analysis'
    and jsonb_typeof(t.payload->'dossier_analysis')='object';

  for r in
    select t.*
    from public.kek_tender_watch t
    where t.project_id is not null
      and t.payload ? 'dossier_analysis'
      and jsonb_typeof(t.payload->'dossier_analysis')='object'
    order by t.updated_at desc nulls last
    limit v_limit
  loop
    v_dossier:=r.payload->'dossier_analysis';
    v_analysis:=coalesce(v_dossier->'analysis','{}'::jsonb);
    v_analyzed_at:=coalesce(nullif(v_dossier->>'analyzed_at',''),r.updated_at::text);
    v_source_ref:='TENDER:'||r.id::text;
    v_snapshot_ref:=v_source_ref||':'||v_analyzed_at;
    v_complete:=coalesce((v_dossier->>'dossier_complete')::boolean,false);
    v_confidence:=lower(coalesce(v_analysis->>'confidence','low'));
    v_req_status:=case when v_complete and v_confidence in ('high','medium') then 'confirmed' else 'review' end;

    if exists(
      select 1 from public.project_analyses a
      where a.project_id=r.project_id::text
        and a.engine='opportunity-tender-dossier-v1'
        and a.source_manifest->>'source_ref'=v_snapshot_ref
    ) then
      continue;
    end if;

    v_new_snapshots:=v_new_snapshots+1;
    if not p_apply then continue; end if;

    insert into public.project_analyses(
      project_id,status,engine,model,analysis,source_counts,source_manifest,created_at
    ) values (
      r.project_id::text,'complete','opportunity-tender-dossier-v1',
      nullif(v_dossier->'provider'->>'model',''),
      jsonb_build_object(
        'tender_watch_id',r.id,'tender_title',r.title,'authority',r.authority,'deadline',r.deadline,
        'opportunity_route',r.payload->>'opportunity_route','opportunity_gate',r.payload->>'opportunity_gate',
        'dossier_complete',v_complete,'dossier_analysis',v_dossier
      ),
      jsonb_build_object(
        'documents',case when jsonb_typeof(v_dossier->'documents')='array' then jsonb_array_length(v_dossier->'documents') else 0 end,
        'files_analyzed',case when jsonb_typeof(v_dossier->'files_analyzed')='array' then jsonb_array_length(v_dossier->'files_analyzed') else 0 end,
        'protected_documents',case when jsonb_typeof(v_dossier->'protected_documents')='array' then jsonb_array_length(v_dossier->'protected_documents') else 0 end,
        'technical_requirements',case when jsonb_typeof(v_analysis->'technical_requirements')='array' then jsonb_array_length(v_analysis->'technical_requirements') else 0 end,
        'commercial_requirements',case when jsonb_typeof(v_analysis->'commercial_requirements')='array' then jsonb_array_length(v_analysis->'commercial_requirements') else 0 end
      ),
      jsonb_build_object(
        'source_type','tender_dossier','source_ref',v_snapshot_ref,'tender_watch_id',r.id,
        'source',v_dossier->>'source','source_url',v_dossier->>'source_url','analyzed_at',v_analyzed_at,
        'dossier_version',v_dossier->>'version','dossier_complete',v_complete,
        'opportunity_route',r.payload->>'opportunity_route','opportunity_gate',r.payload->>'opportunity_gate'
      ),
      now()
    ) on conflict do nothing;
    get diagnostics v_rows=row_count;
    v_analyses:=v_analyses+v_rows;

    delete from public.project_requirements pr
    where pr.project_id=r.project_id
      and pr.source_type='tender_dossier'
      and pr.source_ref=v_source_ref;
    get diagnostics v_rows=row_count;
    v_deleted_old:=v_deleted_old+v_rows;

    for q in
      select x.category,x.value_text
      from (
        select 'technical'::text category,value::text value_text
        from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'technical_requirements')='array' then v_analysis->'technical_requirements' else '[]'::jsonb end) value
        union all
        select 'commercial',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'commercial_requirements')='array' then v_analysis->'commercial_requirements' else '[]'::jsonb end) value
        union all
        select 'submission',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'submission_requirements')='array' then v_analysis->'submission_requirements' else '[]'::jsonb end) value
        union all
        select 'deadline',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'deadlines')='array' then v_analysis->'deadlines' else '[]'::jsonb end) value
        union all
        select 'risk',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'risks')='array' then v_analysis->'risks' else '[]'::jsonb end) value
        union all
        select 'missing',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'missing_information')='array' then v_analysis->'missing_information' else '[]'::jsonb end) value
        union all
        select 'quantity_spec',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'known_quantities_specs')='array' then v_analysis->'known_quantities_specs' else '[]'::jsonb end) value
        union all
        select 'steel_scope',value::text from jsonb_array_elements_text(case when jsonb_typeof(v_analysis->'steel_scope')='array' then v_analysis->'steel_scope' else '[]'::jsonb end) value
        union all
        select 'reference','Protected dossier document: '||value::text
        from jsonb_array_elements_text(case when jsonb_typeof(v_dossier->'protected_documents')='array' then v_dossier->'protected_documents' else '[]'::jsonb end) value
      ) x
      where char_length(btrim(x.value_text)) between 3 and 1200
    loop
      insert into public.project_requirements(
        project_id,category,requirement_key,value_text,value_json,
        source_type,source_ref,source_name,trust_tier,status,first_seen,last_seen,metadata
      ) values (
        r.project_id,q.category,
        'tender:'||q.category||':'||md5(lower(btrim(q.value_text))),
        btrim(q.value_text),jsonb_build_object('text',btrim(q.value_text)),
        'tender_dossier',v_source_ref,r.title,'text',v_req_status,now(),now(),
        jsonb_build_object(
          'tender_watch_id',r.id,'analyzed_at',v_analyzed_at,'dossier_complete',v_complete,
          'confidence',v_confidence,'recommendation',v_analysis->>'recommendation',
          'opportunity_route',r.payload->>'opportunity_route','opportunity_gate',r.payload->>'opportunity_gate',
          'snapshot_ref',v_snapshot_ref
        )
      )
      on conflict(project_id,requirement_key,source_type,source_ref) do update
        set value_text=excluded.value_text,value_json=excluded.value_json,source_name=excluded.source_name,
            trust_tier=excluded.trust_tier,status=excluded.status,last_seen=now(),metadata=excluded.metadata;
      v_requirements:=v_requirements+1;
    end loop;
  end loop;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'candidates',v_candidates,'new_snapshots',v_new_snapshots,
    'analyses_materialized',v_analyses,'requirements_materialized',v_requirements,
    'old_requirements_replaced',v_deleted_old,'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_tender_project_intelligence_handoff_v1(boolean,integer) from public,anon,authenticated;
grant execute on function public.pppp_tender_project_intelligence_handoff_v1(boolean,integer) to service_role;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='tender-project-intelligence-handoff-hourly' limit 1;
  if v_job_id is null then
    perform cron.schedule('tender-project-intelligence-handoff-hourly','41 * * * *',
      'select public.pppp_tender_project_intelligence_handoff_v1(true,250);');
  else
    perform cron.alter_job(v_job_id,schedule:='41 * * * *',
      command:='select public.pppp_tender_project_intelligence_handoff_v1(true,250);',active:=true);
  end if;
end;
$block$;
