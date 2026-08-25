-- The existing task precedence guard can legitimately reopen technical/offer actions
-- during a normal update. Lifecycle reconciliation is different: once an automated
-- row is explicitly marked as superseded/terminal, that close must win last.

create or replace function public.pppp_task_lifecycle_close_enforcer_v1()
returns trigger
language plpgsql
set search_path = 'public', 'pg_temp'
as $function$
begin
  if position('PPPP: lifecycle-auto-closed —' in coalesce(new.detail,'')) > 0
     or position('PPPP: lifecycle-dedup —' in coalesce(new.detail,'')) > 0
     or position('PPPP: handoff u zëvendësua nga veprimi konkret i projektit.' in coalesce(new.detail,'')) > 0 then
    new.status := 'mbyllur';
    new.done_at := coalesce(new.done_at, now());
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_task_lifecycle_close_enforcer_v1() from public, anon, authenticated;
grant execute on function public.pppp_task_lifecycle_close_enforcer_v1() to service_role;

drop trigger if exists zzzz_pppp_task_lifecycle_close_enforcer_v1 on public.tasks;
create trigger zzzz_pppp_task_lifecycle_close_enforcer_v1
before insert or update of project_id, status, source, title, detail, done_at
on public.tasks
for each row execute function public.pppp_task_lifecycle_close_enforcer_v1();

-- Run again now that lifecycle closure has final precedence.
select public.pppp_task_lifecycle_reconcile_v1(null);
