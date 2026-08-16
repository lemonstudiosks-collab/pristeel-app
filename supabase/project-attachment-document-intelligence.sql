-- Project attachment -> document intelligence -> evidence-backed BOM foundation.
-- Applied to production on 2026-08-16.

alter table public.project_attachment_links
  add column if not exists attachment_mime_type text,
  add column if not exists attachment_size_bytes bigint,
  add column if not exists content_sha256 text,
  add column if not exists storage_backend text,
  add column if not exists storage_bucket text,
  add column if not exists storage_path text,
  add column if not exists archived_at timestamptz,
  add column if not exists archive_method text,
  add column if not exists analysis_status text not null default 'pending',
  add column if not exists analysis_method text,
  add column if not exists extracted_text text,
  add column if not exists extracted_data jsonb not null default '{}'::jsonb,
  add column if not exists analysis_confidence numeric,
  add column if not exists analysis_error text,
  add column if not exists analyzed_at timestamptz,
  add column if not exists bom_status text not null default 'none',
  add column if not exists bom_candidates jsonb not null default '[]'::jsonb,
  add column if not exists bom_applied_count integer not null default 0;

create index if not exists project_attachment_links_analysis_queue_idx
  on public.project_attachment_links (analysis_status, created_at)
  where analysis_status in ('pending','archived','retry');

create index if not exists project_attachment_links_project_analysis_idx
  on public.project_attachment_links (project_id, analyzed_at desc);

alter table public.bom_items
  add column if not exists source_attachment_link_id bigint,
  add column if not exists source_file_name text,
  add column if not exists source_locator text,
  add column if not exists source_item_key text,
  add column if not exists extraction_method text,
  add column if not exists extraction_confidence numeric,
  add column if not exists auto_generated boolean not null default false,
  add column if not exists needs_review boolean not null default false;

create unique index if not exists bom_items_auto_source_unique
  on public.bom_items (source_attachment_link_id, source_item_key)
  where source_attachment_link_id is not null and source_item_key is not null;

create or replace function public.project_document_intake_internal_request(p_action text default 'run', p_limit integer default 5)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_action text := case when p_action in ('run','preview','ping') then p_action else 'run' end;
  v_limit integer := least(10, greatest(1, coalesce(p_limit,5)));
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;
  if v_secret is null or v_secret='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action='||v_action||'&limit='||v_limit,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.project_document_intake_internal_request(text,integer) from public, anon, authenticated;
grant execute on function public.project_document_intake_internal_request(text,integer) to service_role, postgres;

create or replace function public.project_document_intake_internal_process(p_link_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  if p_link_id is null or p_link_id <= 0 then raise exception 'Invalid attachment link id'; end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;
  if v_secret is null or v_secret='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action=process_id&id='||p_link_id,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.project_document_intake_internal_process(bigint) from public, anon, authenticated;
grant execute on function public.project_document_intake_internal_process(bigint) to service_role, postgres;
