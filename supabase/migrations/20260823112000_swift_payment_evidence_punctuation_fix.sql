-- PPPP: deterministic SWIFT/payment-evidence routing fix for OCR punctuation variants.
-- Preserves the source attachment and extracted text; removes only the false technical BOM review signal.

with swift_docs as (
  select a.id
  from public.project_attachment_links a
  where a.bom_status in ('review','conflict_review')
    and lower(coalesce(a.attachment_name,'')) like 'swift confirmation%'
    and lower(coalesce(a.extracted_text,'')) like '%swift%'
    and (
      lower(coalesce(a.extracted_text,'')) like '%message input reference%'
      or lower(coalesce(a.extracted_text,'')) like '%network ack%'
      or lower(coalesce(a.extracted_text,'')) like '%network delivery. status%'
    )
)
update public.project_attachment_links a
set bom_status='none',
    bom_applied_count=0,
    analysis_error=null,
    extracted_data=coalesce(a.extracted_data,'{}'::jsonb)||jsonb_build_object(
      'document_class','payment_evidence',
      'technical_bom_relevance','none',
      'classification_method','swift_payment_evidence_ocr_punctuation_v1'
    ),
    updated_at=now()
from swift_docs d
where a.id=d.id;

update public.tasks t
set status='mbyllur',
    done_at=coalesce(done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'Auto-closed by PPPP: SWIFT/payment confirmation is financial evidence, not a technical BOM blocker.')
where t.source='document_bom_review'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists(
    select 1 from public.project_attachment_links a
    where t.source_ref='ATTACHMENT:'||a.id::text
      and a.extracted_data->>'document_class'='payment_evidence'
      and a.extracted_data->>'technical_bom_relevance'='none'
  );

select public.pppp_sync_execution_release_readiness_v1();
