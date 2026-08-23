-- PPPP release-review cleanup for documents that were analyzed correctly but routed into the technical BOM lane.
-- Evidence is preserved. Only technical-review classification/tasks are corrected.

-- SWIFT/payment confirmation: financial evidence, not BOM/quality evidence.
with swift_docs as (
  select a.id
  from public.project_attachment_links a
  where a.bom_status in ('review','conflict_review')
    and lower(coalesce(a.attachment_name,'')) like 'swift confirmation%'
    and lower(coalesce(a.extracted_text,'')) like '%network delivery status%'
    and lower(coalesce(a.extracted_text,'')) like '%swift%'
)
update public.project_attachment_links a
set bom_status='none',
    bom_applied_count=0,
    analysis_error=null,
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb)||jsonb_build_object(
      'document_class','payment_evidence',
      'technical_bom_relevance','none'
    ),
    updated_at=now()
from swift_docs d
where a.id=d.id;

update public.tasks t
set status='mbyllur',
    done_at=coalesce(done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'Auto-closed by PPPP: document classified as payment/SWIFT evidence, not a technical BOM blocker.')
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists(
    select 1 from public.project_attachment_links a
    where t.source_ref='ATTACHMENT:'||a.id::text
      and a.extracted_data->>'document_class'='payment_evidence'
      and a.extracted_data->>'technical_bom_relevance'='none'
  );

-- Advance-payment bank guarantee (Bürgschaftsurkunde, OCR may lose umlaut): commercial/bank evidence, not BOM.
-- Exact same-project content SHA duplicates remain preserved as duplicate history.
with bank_docs as (
  select a.id,a.project_id,a.content_sha256,
         row_number() over(
           partition by a.project_id,a.content_sha256
           order by a.id asc
         ) as rn,
         min(a.id) over(
           partition by a.project_id,a.content_sha256
         ) as canonical_id
  from public.project_attachment_links a
  where a.bom_status in ('review','conflict_review')
    and lower(coalesce(a.extracted_text,'')) like '%burgschaftsurkunde%'
    and lower(coalesce(a.extracted_text,'')) like '%vorauszahlung%'
)
update public.project_attachment_links a
set analysis_status=case
      when d.rn>1 and coalesce(d.content_sha256,'')<>'' then 'duplicate_content'
      else a.analysis_status
    end,
    analysis_method=case
      when d.rn>1 and coalesce(d.content_sha256,'')<>'' then 'sha256-nontechnical-document-dedupe-v1'
      else a.analysis_method
    end,
    analysis_error=null,
    bom_status=case
      when d.rn>1 and coalesce(d.content_sha256,'')<>'' then 'already_present'
      else 'none'
    end,
    bom_applied_count=0,
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb)||jsonb_build_object(
      'document_class','bank_guarantee',
      'technical_bom_relevance','none',
      'duplicate_of_attachment_link_id',case when d.rn>1 and coalesce(d.content_sha256,'')<>'' then d.canonical_id else null end
    ),
    updated_at=now()
from bank_docs d
where a.id=d.id;

update public.tasks t
set status='mbyllur',
    done_at=coalesce(done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'Auto-closed by PPPP: document classified as advance-payment bank guarantee, not a technical BOM blocker.')
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists(
    select 1 from public.project_attachment_links a
    where t.source_ref='ATTACHMENT:'||a.id::text
      and a.extracted_data->>'document_class'='bank_guarantee'
      and a.extracted_data->>'technical_bom_relevance'='none'
  );

-- Recalculate the release-readiness task after removing deterministic nontechnical blockers.
select public.pppp_sync_execution_release_readiness_v1();
