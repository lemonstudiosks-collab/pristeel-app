-- Route Gmail attachment synchronization through the authoritative server reconciler.
alter table public.project_attachment_scan_state
  drop constraint if exists project_attachment_scan_state_outcome_check;
alter table public.project_attachment_scan_state
  add constraint project_attachment_scan_state_outcome_check
  check (outcome = any (array['registered'::text,'no_downloadable'::text,'gmail_not_found'::text]));

create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
grant usage on schema private to service_role;

create or replace function private.gmail_attachment_reconcile_internal_request(p_limit integer default 40)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, vault, net
as $$
declare
  v_secret text;
  v_request_id bigint;
  v_limit integer := least(200,greatest(1,coalesce(p_limit,40)));
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name='gmail_tracker_cron_secret'
  limit 1;
  if coalesce(v_secret,'')='' then raise exception 'Internal cron secret is unavailable'; end if;
  select net.http_get(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-attachment-reconciler?limit='||v_limit::text,
    headers := jsonb_build_object('x-pppp-cron-secret',v_secret),
    timeout_milliseconds := 120000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.gmail_attachment_reconcile_internal_request(integer) from public,anon,authenticated;
grant execute on function private.gmail_attachment_reconcile_internal_request(integer) to service_role;

select cron.alter_job(job_id := 15, command := 'select private.gmail_attachment_reconcile_internal_request(40);');
