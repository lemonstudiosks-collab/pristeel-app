-- Keep the PPPP ChatGPT command bridge cron operational even when the generic
-- automation HTTP ledger has stale/reused pg_net request IDs. This function is
-- intentionally narrow and continues to use the existing vault-held cron secret.

create or replace function public.chatgpt_command_bridge_internal_request(p_limit integer default 50)
returns bigint
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_limit integer := least(200, greatest(1, coalesce(p_limit, 50)));
  v_secret text;
  v_request_id bigint;
begin
  select decrypted_secret
    into v_secret
  from vault.decrypted_secrets
  where name = 'gmail_tracker_cron_secret'
  limit 1;

  if nullif(v_secret, '') is null then
    raise exception using errcode = '22023', message = 'chatgpt_command_bridge_cron_secret_missing';
  end if;

  select net.http_post(
    url := 'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/chatgpt-command-bridge?limit=' || v_limit::text,
    body := '{}'::jsonb,
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-pppp-cron-secret', v_secret
    ),
    timeout_milliseconds := 120000
  ) into v_request_id;

  return v_request_id;
end;
$$;
