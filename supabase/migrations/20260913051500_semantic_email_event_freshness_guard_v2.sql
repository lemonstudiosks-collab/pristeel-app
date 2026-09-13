-- PPPP semantic email task freshness guard v2
-- Keep the existing stale-email protection, but support both the legacy
-- `semantic:email:<gmail_message_id>` source_ref and the current event-
-- intelligence `email:event:<gmail_message_id>` source_ref.
--
-- This is a task-lifecycle guard only. It does not create tasks, change
-- project disposition, send email, select suppliers, set prices, or commit POs.

create or replace function public.pppp_semantic_email_task_freshness_guard()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_msg_id text;
  v_sent_at timestamptz;
  v_state_at timestamptz;
  v_note text := 'PPPP: semantic email action suppressed because the source email is not newer than the current canonical project state.';
begin
  if coalesce(new.source,'') <> 'semantic_brain_auto' then
    return new;
  end if;

  if coalesce(new.source_ref,'') like 'semantic:email:%' then
    v_msg_id := substring(new.source_ref from length('semantic:email:') + 1);
  elsif coalesce(new.source_ref,'') like 'email:event:%' then
    v_msg_id := substring(new.source_ref from length('email:event:') + 1);
  else
    return new;
  end if;

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
$function$;

comment on function public.pppp_semantic_email_task_freshness_guard() is
  'Suppresses semantic email tasks whose source email is missing or not newer than the canonical project state; supports legacy semantic:email and current email:event source_ref formats.';
