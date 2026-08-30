-- Service-role-only targeted Gmail attachment reconciliation for stale MIME attachment identifiers.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;

create or replace function private.gmail_attachment_reconcile_message_request(p_message_id text, p_limit integer default 20)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_message_id text := btrim(coalesce(p_message_id,''));
  v_limit integer := least(200,greatest(1,coalesce(p_limit,20)));
begin
  if v_message_id='' or v_message_id !~ '^[A-Za-z0-9_-]+$' then raise exception 'Invalid Gmail message id'; end if;
  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name='gmail_tracker_cron_secret' limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-attachment-reconciler?limit='||v_limit::text||'&message_id='||v_message_id,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.gmail_attachment_reconcile_message_request(text,integer) from public,anon,authenticated;
grant execute on function private.gmail_attachment_reconcile_message_request(text,integer) to service_role;
