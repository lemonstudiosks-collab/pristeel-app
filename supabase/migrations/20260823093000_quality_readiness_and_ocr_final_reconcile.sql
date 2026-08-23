-- PPPP Phase C: read-only quality/documentation readiness + final OCR reconciliation.
-- The readiness function never changes a project stage and never releases production.
-- OCR cleanup preserves one canonical record for every unique project photo SHA.

create or replace function public.pppp_project_readiness_v1(p_project_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path='public','pg_temp'
as $$
declare
  v_project jsonb;
  v_req_confirmed integer;
  v_req_review integer;
  v_req_categories jsonb;
  v_attachment_review integer;
  v_image_review integer;
  v_selected_producer integer;
  v_pricing_basis integer;
  v_execution_open integer;
  v_quality_open integer;
  v_gate text;
begin
  select jsonb_build_object(
    'id',p.id,'name',p.name,'status',p.status,'pipeline_stage',p.pipeline_stage,
    'execution_bootstrapped_at',p.execution_bootstrapped_at,
    'execution_bootstrap_source',p.execution_bootstrap_source
  ) into v_project
  from public.projects p where p.id=p_project_id;
  if v_project is null then raise exception 'Project not found'; end if;

  select count(*) filter(where r.status='confirmed'),
         count(*) filter(where r.status='review')
  into v_req_confirmed,v_req_review
  from public.project_requirements r
  where r.project_id::text=p_project_id::text;

  select coalesce(jsonb_object_agg(x.category,x.cnt),'{}'::jsonb) into v_req_categories
  from (
    select coalesce(nullif(r.category,''),'other') category,count(*) cnt
    from public.project_requirements r
    where r.project_id::text=p_project_id::text
    group by coalesce(nullif(r.category,''),'other')
  ) x;

  select count(*) filter(where a.bom_status in ('review','conflict_review')),
         count(*) filter(where a.analysis_status='image_review')
  into v_attachment_review,v_image_review
  from public.project_attachment_links a
  where a.project_id=p_project_id::text;

  select count(*) filter(where d.decision_type='selected_producer' and d.status='active'),
         count(*) filter(where d.decision_type='pricing_basis' and d.status='active')
  into v_selected_producer,v_pricing_basis
  from public.project_supplier_decisions d
  where d.project_id=p_project_id;

  select count(*) filter(where lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')),
         count(*) filter(
           where lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
             and lower(coalesce(t.title,'')||' '||coalesce(t.detail,'')) ~
                 '(quality|dossier|audit|cert|certificate|weld|welding|ndt|vt|ut|1090|documentation|dokument|3\.1|3\.2|coating|galvan)'
         )
  into v_execution_open,v_quality_open
  from public.tasks t
  where t.project_id=p_project_id and t.source='execution_won';

  v_gate := case
    when coalesce(v_req_review,0)>0
      or coalesce(v_attachment_review,0)>0
      or coalesce(v_quality_open,0)>0
      or coalesce(v_selected_producer,0)=0
      then 'blocked_review'
    else 'ready_for_human_release'
  end;

  return jsonb_build_object(
    'generated_at',now(),
    'project',v_project,
    'gate_state',v_gate,
    'human_release_required',true,
    'requirements',jsonb_build_object(
      'confirmed',coalesce(v_req_confirmed,0),
      'review',coalesce(v_req_review,0),
      'categories',coalesce(v_req_categories,'{}'::jsonb)
    ),
    'documents',jsonb_build_object(
      'review',coalesce(v_attachment_review,0),
      'image_review',coalesce(v_image_review,0)
    ),
    'supplier_decisions',jsonb_build_object(
      'selected_producer',coalesce(v_selected_producer,0),
      'pricing_basis',coalesce(v_pricing_basis,0)
    ),
    'execution',jsonb_build_object(
      'open_tasks',coalesce(v_execution_open,0),
      'quality_open_tasks',coalesce(v_quality_open,0)
    )
  );
end;
$$;
revoke all on function public.pppp_project_readiness_v1(uuid) from public,anon;
grant execute on function public.pppp_project_readiness_v1(uuid) to authenticated,service_role;

-- Tiny Word-generated inline artifact. It is metadata, not a technical photograph/document.
update public.project_attachment_links
set analysis_status='metadata_noise',
    analysis_method='local-ocr-noise-reconcile-v2',
    analysis_error='Tiny Word-generated inline image with no OCR text; no technical review required.',
    bom_status='none',
    updated_at=now()
where analysis_status='local_ocr_failed'
  and lower(coalesce(attachment_name,'')) like '~wrd%.jpg'
  and coalesce(attachment_size_bytes,0)<5000;

update public.tasks t
set status='kryer',done_at=coalesce(done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'Auto-reconciled: tiny Word-generated inline image is metadata noise.')
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and t.source_ref in (
    select 'ATTACHMENT:'||a.id::text
    from public.project_attachment_links a
    where a.analysis_method='local-ocr-noise-reconcile-v2'
  );

-- Exact duplicate photo binaries: keep one canonical item per project + SHA, preserve the source
-- history on duplicates, and never infer visual content from OCR-empty photos.
with ranked as (
  select a.id,a.project_id,a.content_sha256,
         first_value(a.id) over(
           partition by a.project_id,a.content_sha256
           order by case when lower(coalesce(a.attachment_mime_type,'')) like 'image/%' then 0 else 1 end,a.id
         ) canonical_id,
         row_number() over(
           partition by a.project_id,a.content_sha256
           order by case when lower(coalesce(a.attachment_mime_type,'')) like 'image/%' then 0 else 1 end,a.id
         ) rn
  from public.project_attachment_links a
  where a.analysis_status='local_ocr_failed'
    and lower(coalesce(a.attachment_name,'')) ~ '\.(jpg|jpeg|png|webp)$'
    and a.content_sha256 is not null and btrim(a.content_sha256)<>''
), dup as (
  select id,canonical_id from ranked where rn>1
)
update public.project_attachment_links a
set analysis_status='duplicate_content',
    analysis_method='local-ocr-photo-sha-dedupe-v1',
    analysis_error=null,
    bom_status='already_present',
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb)||jsonb_build_object('duplicate_of_link_id',d.canonical_id,'reconciled_from','local_ocr_failed'),
    updated_at=now()
from dup d where a.id=d.id;

update public.tasks t
set status='kryer',done_at=coalesce(done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'Auto-reconciled: exact photo binary already has one canonical visual-review item.')
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and t.source_ref in (
    select 'ATTACHMENT:'||a.id::text
    from public.project_attachment_links a
    where a.analysis_method='local-ocr-photo-sha-dedupe-v1'
  );

-- Remaining OCR-empty real images are not failures: OCR is simply the wrong extractor.
-- They remain review-gated for human visual inspection.
update public.project_attachment_links
set analysis_status='image_review',
    analysis_method='local-ocr-photo-review-v1',
    analysis_error='OCR returned no text; visual/photo review is required. No content was inferred.',
    bom_status='review',
    updated_at=now()
where analysis_status='local_ocr_failed'
  and lower(coalesce(attachment_name,'')) ~ '\.(jpg|jpeg|png|webp)$';
