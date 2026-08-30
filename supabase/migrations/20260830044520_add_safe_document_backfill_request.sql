-- Controlled single-worker backlog drain: one Edge invocation processes at most ten rows sequentially.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;

create or replace function private.project_document_intake_backfill_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_limit integer := least(10,greatest(1,coalesce(p_limit,10)));
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/project-document-intake?action=run&limit='||v_limit::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.project_document_intake_backfill_request(integer) from public,anon,authenticated;
grant execute on function private.project_document_intake_backfill_request(integer) to service_role;
