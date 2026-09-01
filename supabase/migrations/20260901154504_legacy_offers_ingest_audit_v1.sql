-- PPPP legacy offers_ingest audit v1
-- Observe new writes to the legacy offers_inbox catch-all so the remaining producer
-- can be identified safely. No business write is blocked and no authorization/IP
-- data is persisted.

create table if not exists private.pppp_legacy_offers_ingest_audit (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  gmail_msg_id text,
  operation text not null default 'INSERT',
  db_user text,
  jwt_role text,
  user_agent text,
  x_client_info text,
  application_name text
);

create index if not exists pppp_legacy_offers_ingest_audit_created_idx
  on private.pppp_legacy_offers_ingest_audit(created_at desc);

revoke all on table private.pppp_legacy_offers_ingest_audit from public, anon, authenticated;
grant select on table private.pppp_legacy_offers_ingest_audit to service_role;

create or replace function private.pppp_audit_legacy_offers_insert_v1()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog', 'private', 'public'
as $function$
declare
  v_headers jsonb := '{}'::jsonb;
  v_claims jsonb := '{}'::jsonb;
  v_raw text;
begin
  begin
    v_raw := current_setting('request.headers', true);
    if nullif(v_raw,'') is not null then
      v_headers := v_raw::jsonb;
    end if;
  exception when others then
    v_headers := '{}'::jsonb;
  end;

  begin
    v_raw := current_setting('request.jwt.claims', true);
    if nullif(v_raw,'') is not null then
      v_claims := v_raw::jsonb;
    end if;
  exception when others then
    v_claims := '{}'::jsonb;
  end;

  insert into private.pppp_legacy_offers_ingest_audit(
    gmail_msg_id,
    operation,
    db_user,
    jwt_role,
    user_agent,
    x_client_info,
    application_name
  ) values (
    new.gmail_msg_id,
    tg_op,
    current_user,
    nullif(v_claims->>'role',''),
    nullif(v_headers->>'user-agent',''),
    nullif(v_headers->>'x-client-info',''),
    nullif(current_setting('application_name', true),'')
  );

  return new;
end;
$function$;

drop trigger if exists trg_pppp_audit_legacy_offers_insert_v1 on public.offers_inbox;
create trigger trg_pppp_audit_legacy_offers_insert_v1
after insert on public.offers_inbox
for each row execute function private.pppp_audit_legacy_offers_insert_v1();
