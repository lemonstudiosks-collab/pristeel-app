begin;

create or replace function public.pppp_expense_drive_ingest_internal_request(p_limit integer default 10)
returns bigint
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare v_limit integer:=least(25,greatest(1,coalesce(p_limit,10))); begin
  return public.pppp_enqueue_automation_http_v1(
    'pppp-expense-drive-ingest',
    'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/pppp-expense-drive-ingest?limit='||v_limit::text,
    'gmail_tracker_cron_secret',120000,3
  );
end;$$;
revoke all on function public.pppp_expense_drive_ingest_internal_request(integer) from public,anon,authenticated;
grant execute on function public.pppp_expense_drive_ingest_internal_request(integer) to service_role;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='pppp-expense-drive-inbox-10m' loop perform cron.unschedule(j); end loop;
    perform cron.schedule('pppp-expense-drive-inbox-10m','3,13,23,33,43,53 * * * *','select public.pppp_expense_drive_ingest_internal_request(10);');
  end if;
end $$;

commit;
