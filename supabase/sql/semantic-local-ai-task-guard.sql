-- Prevent semantic AI from reopening an action based on an email that predates
-- the project's current canonical operational state. This is a DB-level safety
-- rule and therefore protects current and future semantic workers.

create or replace function public.pppp_semantic_email_task_freshness_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_msg_id text;
  v_sent_at timestamptz;
  v_state_at timestamptz;
  v_note text := 'PPPP: semantic email action suppressed because the source email is not newer than the current canonical project state.';
begin
  if coalesce(new.source,'') <> 'semantic_brain_auto'
     or coalesce(new.source_ref,'') not like 'semantic:email:%' then
    return new;
  end if;

  v_msg_id := substring(new.source_ref from length('semantic:email:') + 1);

  select pe.sent_at, p.operational_state_at
    into v_sent_at, v_state_at
  from public.projects p
  left join public.project_emails pe
    on pe.project_id=p.id and pe.gmail_message_id=v_msg_id
  where p.id=new.project_id;

  if v_sent_at is null or (v_state_at is not null and v_sent_at <= v_state_at) then
    new.status := 'mbyllur';
    new.done_at := coalesce(new.done_at,now());
    if position(v_note in coalesce(new.detail,''))=0 then
      new.detail := concat_ws(E'\n',nullif(new.detail,''),v_note);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists zzz_pppp_semantic_email_task_freshness_guard on public.tasks;
create trigger zzz_pppp_semantic_email_task_freshness_guard
before insert or update of project_id,source,source_ref,status,detail on public.tasks
for each row execute function public.pppp_semantic_email_task_freshness_guard();
