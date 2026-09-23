
create or replace function public.pppp_outbound_sync_internal_request()
returns bigint
language plpgsql
security definer
set search_path = public, extensions, net, vault, pg_temp
as $$
declare
  v_local timestamp;
  v_hour integer;
  v_minute integer;
  v_isodow integer;
begin
  v_local := now() at time zone 'Europe/Belgrade';
  v_hour := extract(hour from v_local)::integer;
  v_minute := extract(minute from v_local)::integer;
  v_isodow := extract(isodow from v_local)::integer;

  if v_isodow not between 1 and 5
     or v_minute <> 30
     or v_hour not in (7,11,15,18) then
    return null;
  end if;

  if exists (
    select 1
    from public.pppp_automation_http_runs r
    where r.automation_key = 'pppp-outbound-sync'
      and r.queued_at >= now() - interval '20 minutes'
  ) then
    return null;
  end if;

  return public.pppp_enqueue_automation_http_v1(
    'pppp-outbound-sync',
    'https://awqfpnzqwfjrjefoktgd.supabase.co/functions/v1/pppp-outbound-sync',
    'gmail_tracker_cron_secret',
    180000,
    1
  );
end;
$$;

revoke all on function public.pppp_outbound_sync_internal_request() from public, anon, authenticated;
grant execute on function public.pppp_outbound_sync_internal_request() to service_role;

select cron.schedule(
  'pppp-outbound-sync-server-4x',
  '30 5,6,9,10,13,14,16,17 * * 1-5',
  'select public.pppp_outbound_sync_internal_request();'
);

