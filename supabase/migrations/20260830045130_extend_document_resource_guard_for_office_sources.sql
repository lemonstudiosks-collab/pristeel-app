-- Extend the Edge resource guard to large office/mail sources that can exhaust the document-intake worker.
create or replace function public.project_document_intake_internal_request(p_action text default 'run'::text, p_limit integer default 5)
returns bigint
language plpgsql
security definer
set search_path to 'public','vault','net'
as $function$
declare
  v_secret text;
  v_request_id bigint;
  v_action text := case when p_action in ('run','preview','ping') then p_action else 'run' end;
  v_limit integer := least(3,greatest(1,coalesce(p_limit,3)));
begin
  if v_action='run' then
    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
    select pal.project_id::uuid,
           'Rishiko dokumentin e madh: '||coalesce(nullif(pal.attachment_name,''),'attachment'),
           'PPPP e ndaloi përpunimin automatik sepse skedari kalon kufirin e sigurt të memories për Edge Function. Burimi ruhet; kërkohet përpunim lokal/manual ose konvertim. Attachment link #'||pal.id::text,
           current_date,'larte','hapur','document_bom_review','ATTACHMENT:'||pal.id::text,'intern'
    from public.project_attachment_links pal
    where pal.analysis_status in ('pending','retry','archived','needs_email_parse','needs_ocr')
      and (
        coalesce(pal.attachment_size_bytes,0)>12582912
        or (lower(coalesce(pal.attachment_name,'')) ~ '\.(zip|rar|7z)$' and coalesce(pal.attachment_size_bytes,0)>5242880)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.(xlsx|xls)$' or lower(coalesce(pal.attachment_mime_type,'')) like '%spreadsheet%') and coalesce(pal.attachment_size_bytes,0)>3145728)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.eml$' or lower(coalesce(pal.attachment_mime_type,''))='message/rfc822') and coalesce(pal.attachment_size_bytes,0)>5242880)
      )
    on conflict (source,source_ref) do nothing;

    update public.project_attachment_links pal
    set analysis_status='review',analysis_method='resource-guard-v2',
        analysis_error='File exceeds the safe automatic Edge intake resource limit; local/manual large-file processing is required.',
        analyzed_at=coalesce(analyzed_at,now()),updated_at=now(),
        bom_status=case when coalesce(bom_status,'none')='none' then 'review' else bom_status end
    where pal.analysis_status in ('pending','retry','archived','needs_email_parse','needs_ocr')
      and (
        coalesce(pal.attachment_size_bytes,0)>12582912
        or (lower(coalesce(pal.attachment_name,'')) ~ '\.(zip|rar|7z)$' and coalesce(pal.attachment_size_bytes,0)>5242880)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.(xlsx|xls)$' or lower(coalesce(pal.attachment_mime_type,'')) like '%spreadsheet%') and coalesce(pal.attachment_size_bytes,0)>3145728)
        or ((lower(coalesce(pal.attachment_name,'')) ~ '\.eml$' or lower(coalesce(pal.attachment_mime_type,''))='message/rfc822') and coalesce(pal.attachment_size_bytes,0)>5242880)
      );
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action='||v_action||'&limit='||v_limit::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$function$;

revoke all on function public.project_document_intake_internal_request(text,integer) from public,anon,authenticated;
grant execute on function public.project_document_intake_internal_request(text,integer) to service_role;
