-- Service-role-only per-document intake request used for controlled backlog draining.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;

create or replace function private.project_document_intake_process_id_request(p_id bigint)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
begin
  if p_id is null or p_id <= 0 then raise exception 'Invalid attachment link id'; end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action=process_id&id='||p_id::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.project_document_intake_process_id_request(bigint) from public,anon,authenticated;
grant execute on function private.project_document_intake_process_id_request(bigint) to service_role;
