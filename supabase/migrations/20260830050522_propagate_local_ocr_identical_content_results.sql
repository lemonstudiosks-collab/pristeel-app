create or replace function public.local_ocr_propagate_identical_content_trigger()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  src record;
  dup record;
begin
  if new.status not in ('completed','no_text') or old.status is not distinct from new.status then return new; end if;
  select id,project_id,content_sha256,analysis_status,analysis_method,extracted_text,extracted_data,analysis_confidence,analysis_error,analyzed_at,bom_status
    into src from public.project_attachment_links where id=new.attachment_link_id;
  if not found or nullif(btrim(coalesce(src.content_sha256,'')),'') is null then return new; end if;

  for dup in select id from public.project_attachment_links
    where id<>src.id and project_id is not distinct from src.project_id and content_sha256=src.content_sha256 and analysis_status='local_ocr_queued' order by id
  loop
    if new.status='completed' and src.analysis_status='analyzed' then
      update public.project_attachment_links
      set analysis_status='analyzed',analysis_method='duplicate-local-ocr-reference-v1',extracted_text=src.extracted_text,
          extracted_data=coalesce(src.extracted_data,'{}'::jsonb)||jsonb_build_object('duplicate_of_attachment_link_id',src.id,'source_local_ocr_job_id',new.id),
          analysis_confidence=src.analysis_confidence,analysis_error=null,analyzed_at=coalesce(src.analyzed_at,new.completed_at,now()),
          bom_status='already_present',bom_candidates='[]'::jsonb,bom_applied_count=0,updated_at=now()
      where id=dup.id;
    elsif new.status='no_text' then
      if src.analysis_status='metadata_noise' then
        update public.project_attachment_links
        set analysis_status='metadata_noise',analysis_method='duplicate-metadata-noise-v1',analysis_error=null,
            extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('duplicate_of_attachment_link_id',src.id,'source_local_ocr_job_id',new.id),
            analyzed_at=coalesce(src.analyzed_at,new.completed_at,now()),bom_status='none',bom_candidates='[]'::jsonb,bom_applied_count=0,updated_at=now()
        where id=dup.id;
      else
        update public.project_attachment_links
        set analysis_status='duplicate_content',analysis_method='sha256-dedupe-after-ocr-empty-v2',analysis_error=null,
            extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('duplicate_of_attachment_link_id',src.id,'source_local_ocr_job_id',new.id),
            analyzed_at=coalesce(src.analyzed_at,new.completed_at,now()),bom_status='already_present',bom_candidates='[]'::jsonb,bom_applied_count=0,updated_at=now()
        where id=dup.id;
      end if;
    end if;

    update public.local_ocr_jobs
    set status='cancelled',completed_at=coalesce(completed_at,now()),updated_at=now(),error='Cancelled: identical content resolved by local OCR job #'||new.id::text
    where attachment_link_id=dup.id and status='queued';

    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now())
    where source in ('document_bom_review','document_image_review') and source_ref='ATTACHMENT:'||dup.id::text
      and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
  end loop;
  return new;
end;
$function$;

revoke all on function public.local_ocr_propagate_identical_content_trigger() from public,anon,authenticated;
grant execute on function public.local_ocr_propagate_identical_content_trigger() to service_role,postgres;

drop trigger if exists zzz_local_ocr_propagate_identical_content_after_update on public.local_ocr_jobs;
create trigger zzz_local_ocr_propagate_identical_content_after_update
after update of status on public.local_ocr_jobs
for each row when (new.status in ('completed','no_text'))
execute function public.local_ocr_propagate_identical_content_trigger();
