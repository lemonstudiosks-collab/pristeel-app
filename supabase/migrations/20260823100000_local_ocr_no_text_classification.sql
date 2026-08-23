-- PPPP: classify expected OCR-empty image results without turning them into technical failures.
-- Unique real images remain human-reviewable. Exact binary duplicates are preserved as duplicate history.
-- Tiny Word-generated image artifacts become metadata noise. Nothing is deleted.

alter table public.local_ocr_jobs drop constraint if exists local_ocr_jobs_status_check;
alter table public.local_ocr_jobs
  add constraint local_ocr_jobs_status_check
  check (status = any (array['queued'::text,'processing'::text,'completed'::text,'failed'::text,'cancelled'::text,'no_text'::text]));

create or replace function public.local_ocr_no_text_job_trigger()
returns trigger
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  a record;
  v_duplicate bigint;
  v_is_tiny_word_artifact boolean := false;
  v_is_image boolean := false;
begin
  if new.status <> 'no_text' or old.status is not distinct from new.status then
    return new;
  end if;

  select id,project_id,attachment_name,attachment_mime_type,attachment_size_bytes,content_sha256
    into a
  from public.project_attachment_links
  where id=new.attachment_link_id;
  if not found then return new; end if;

  v_is_tiny_word_artifact := coalesce(a.attachment_size_bytes,0) <= 4096
    and coalesce(a.attachment_name,'') ~* '^~WRD.*\.(jpe?g|png|gif|bmp)$';
  v_is_image := coalesce(a.attachment_mime_type,'') ilike 'image/%'
    or coalesce(a.attachment_name,'') ~* '\.(jpe?g|png|webp|gif|bmp|tiff?)$';

  if v_is_tiny_word_artifact then
    update public.project_attachment_links
       set analysis_status='metadata_noise',
           analysis_method='local-tesseract-no-text-v2',
           analysis_error=null,
           extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','metadata_noise'),
           bom_status='none',
           bom_applied_count=0,
           updated_at=now()
     where id=a.id;

    update public.tasks
       set status='mbyllur',done_at=coalesce(done_at,now())
     where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text
       and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
    return new;
  end if;

  if coalesce(a.content_sha256,'')<>'' then
    select x.id into v_duplicate
    from public.project_attachment_links x
    where x.project_id is not distinct from a.project_id
      and x.id<a.id
      and x.content_sha256=a.content_sha256
    order by x.id asc limit 1;
  end if;

  if v_duplicate is not null then
    update public.project_attachment_links
       set analysis_status='duplicate_content',
           analysis_method='sha256-dedupe-after-ocr-empty-v1',
           analysis_error=null,
           extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','duplicate_content','duplicate_of_attachment_link_id',v_duplicate),
           bom_status='already_present',
           bom_applied_count=0,
           updated_at=now()
     where id=a.id;

    update public.tasks
       set status='mbyllur',done_at=coalesce(done_at,now())
     where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text
       and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
    return new;
  end if;

  if v_is_image then
    update public.project_attachment_links
       set analysis_status='image_review',
           analysis_method='local-tesseract-no-text-v2',
           analysis_error=null,
           extracted_data=coalesce(extracted_data,'{}'::jsonb)||jsonb_build_object('no_text_classification','image_review'),
           bom_status='review',
           bom_applied_count=0,
           updated_at=now()
     where id=a.id;

    update public.tasks
       set status='mbyllur',done_at=coalesce(done_at,now())
     where source='document_bom_review' and source_ref='ATTACHMENT:'||a.id::text
       and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');

    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
    values(
      a.project_id::uuid,
      '[AUTO] Rishiko fotografinë: '||coalesce(a.attachment_name,'attachment'),
      'OCR lokal nuk gjeti tekst të lexueshëm. Kjo nuk është OCR failure. Shiko fotografinë vizualisht vetëm për të konfirmuar nëse përmban informacion teknik/quality që duhet ruajtur ose vepruar.',
      current_date,'mesatare','hapur','document_image_review','ATTACHMENT:'||a.id::text,'intern'
    )
    on conflict (source,source_ref) do update
      set title=excluded.title,detail=excluded.detail,category=excluded.category,
          priority=excluded.priority,
          status=case when lower(coalesce(public.tasks.status,'')) in ('kryer','mbyllur','done','closed') then public.tasks.status else 'hapur' end;
    return new;
  end if;

  return new;
end;
$$;
revoke all on function public.local_ocr_no_text_job_trigger() from public,anon,authenticated;

drop trigger if exists local_ocr_no_text_job_after_update on public.local_ocr_jobs;
create trigger local_ocr_no_text_job_after_update
after update of status on public.local_ocr_jobs
for each row when (new.status='no_text')
execute function public.local_ocr_no_text_job_trigger();

create or replace function public.local_ocr_fail_job(p_worker_id text,p_job_id bigint,p_error text)
returns boolean
language plpgsql
security definer
set search_path='public','pg_temp'
as $$
declare
  a record;
  v_expected_no_text boolean := false;
  v_is_image boolean := false;
  v_is_tiny_word_artifact boolean := false;
begin
  select l.attachment_name,l.attachment_mime_type,l.attachment_size_bytes
    into a
  from public.local_ocr_jobs j
  join public.project_attachment_links l on l.id=j.attachment_link_id
  where j.id=p_job_id and j.worker_id=p_worker_id and j.status='processing';

  if found then
    v_is_image := coalesce(a.attachment_mime_type,'') ilike 'image/%'
      or coalesce(a.attachment_name,'') ~* '\.(jpe?g|png|webp|gif|bmp|tiff?)$';
    v_is_tiny_word_artifact := coalesce(a.attachment_size_bytes,0)<=4096
      and coalesce(a.attachment_name,'') ~* '^~WRD.*\.(jpe?g|png|gif|bmp)$';
    v_expected_no_text := lower(btrim(coalesce(p_error,''))) in ('ocr_empty','ocr text is empty')
      or lower(coalesce(p_error,'')) like '%ocr text is empty%';
    v_expected_no_text := v_expected_no_text and (v_is_image or v_is_tiny_word_artifact);
  end if;

  update public.local_ocr_jobs
     set status=case when v_expected_no_text then 'no_text' else 'failed' end,
         error=left(coalesce(p_error,'Worker reported failure'),4000),
         completed_at=case when v_expected_no_text then now() else completed_at end,
         heartbeat_at=now(),updated_at=now()
   where id=p_job_id and worker_id=p_worker_id and status='processing';
  return found;
end;
$$;
revoke all on function public.local_ocr_fail_job(text,bigint,text) from public,anon,authenticated;
grant execute on function public.local_ocr_fail_job(text,bigint,text) to service_role;

-- Reclassify only historical OCR-empty image-like jobs. This deliberately does not touch true OCR failures.
update public.local_ocr_jobs j
set status='no_text',completed_at=coalesce(completed_at,now()),updated_at=now()
from public.project_attachment_links a
where a.id=j.attachment_link_id
  and j.status='failed'
  and (
    lower(btrim(coalesce(j.error,''))) in ('ocr_empty','ocr text is empty')
    or lower(coalesce(j.error,'')) like '%ocr text is empty%'
  )
  and (
    coalesce(a.attachment_mime_type,'') ilike 'image/%'
    or coalesce(a.attachment_name,'') ~* '\.(jpe?g|png|webp|gif|bmp|tiff?)$'
    or (coalesce(a.attachment_size_bytes,0)<=4096 and coalesce(a.attachment_name,'') ~* '^~WRD')
  );
