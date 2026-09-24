-- One external discovery session per source and Budapest business day.
-- A claimed day is intentionally not released after failure: an unsuccessful
-- attempt still contacted the source and must not turn into a retry storm.

create table if not exists public.pppp_external_source_daily_access_v1 (
  source_key text not null,
  access_day date not null,
  timezone text not null default 'Europe/Budapest',
  run_token text not null,
  trigger_name text,
  claimed_at timestamptz not null default now(),
  primary key (source_key, access_day),
  constraint pppp_external_source_daily_access_source_key_check
    check (source_key = upper(source_key) and source_key ~ '^[A-Z0-9_:-]{2,80}$'),
  constraint pppp_external_source_daily_access_run_token_check
    check (length(btrim(run_token)) between 1 and 200)
);

alter table public.pppp_external_source_daily_access_v1 enable row level security;
revoke all on table public.pppp_external_source_daily_access_v1 from public, anon, authenticated;
grant select, insert on table public.pppp_external_source_daily_access_v1 to service_role;

create or replace function public.pppp_claim_external_source_daily_access_v1(
  p_source_key text,
  p_run_token text,
  p_trigger_name text default null,
  p_timezone text default 'Europe/Budapest'
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_source text := upper(btrim(coalesce(p_source_key, '')));
  v_token text := btrim(coalesce(p_run_token, ''));
  v_timezone text := coalesce(nullif(btrim(p_timezone), ''), 'Europe/Budapest');
  v_day date;
  v_claimed_at timestamptz;
  v_existing public.pppp_external_source_daily_access_v1%rowtype;
begin
  if v_source !~ '^[A-Z0-9_:-]{2,80}$' then
    raise exception 'invalid external source key';
  end if;
  if length(v_token) not between 1 and 200 then
    raise exception 'invalid external source run token';
  end if;

  v_day := (now() at time zone v_timezone)::date;

  insert into public.pppp_external_source_daily_access_v1(
    source_key, access_day, timezone, run_token, trigger_name
  ) values (
    v_source, v_day, v_timezone, v_token, left(nullif(btrim(p_trigger_name), ''), 120)
  )
  on conflict (source_key, access_day) do nothing
  returning claimed_at into v_claimed_at;

  if v_claimed_at is not null then
    return jsonb_build_object(
      'allowed', true,
      'source_key', v_source,
      'access_day', v_day,
      'timezone', v_timezone,
      'claimed_at', v_claimed_at
    );
  end if;

  select * into v_existing
  from public.pppp_external_source_daily_access_v1
  where source_key = v_source and access_day = v_day;

  return jsonb_build_object(
    'allowed', false,
    'reason', 'daily_source_access_already_claimed',
    'source_key', v_source,
    'access_day', v_day,
    'timezone', v_timezone,
    'claimed_at', v_existing.claimed_at,
    'existing_trigger', v_existing.trigger_name
  );
end;
$$;

revoke all on function public.pppp_claim_external_source_daily_access_v1(text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.pppp_claim_external_source_daily_access_v1(text,text,text,text)
  to service_role;

comment on table public.pppp_external_source_daily_access_v1 is
  'Fail-closed daily access ledger for external procurement sources. One attempt per source per Europe/Budapest business day.';
