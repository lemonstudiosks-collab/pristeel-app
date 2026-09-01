-- Preserve externally-created Gmail draft identifiers across idempotent action refreshes.
create or replace function private.pppp_opportunity_action_preserve_external_state_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
declare
  k text;
  keys text[] := array['gmail_draft_id','gmail_message_id','gmail_thread_id','gmail_draft_created_at','gmail_draft_generator','human_send_required'];
begin
  if tg_op='UPDATE' then
    new.payload := coalesce(new.payload,'{}'::jsonb);
    foreach k in array keys loop
      if (not new.payload ? k) and old.payload ? k then
        new.payload := new.payload || jsonb_build_object(k, old.payload -> k);
      end if;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists pppp_opportunity_action_preserve_external_state_v1_trg on public.pppp_opportunity_actions;
create trigger pppp_opportunity_action_preserve_external_state_v1_trg
before update of payload on public.pppp_opportunity_actions
for each row
execute function private.pppp_opportunity_action_preserve_external_state_v1();

create or replace view public.pppp_opportunity_action_queue_v2
with (security_invoker = true)
as
select
  a.id,a.tender_watch_id,a.project_id,a.action_key,a.action_type,a.route,a.status,a.priority,a.due_date,
  a.target_company,a.target_email,a.subject_hint,a.draft_brief,a.payload,a.created_at,a.updated_at,
  t.title as tender_title,t.authority,t.procurement_no,t.publication_no,t.deadline,t.relevance_score,
  upper(coalesce(t.payload ->> 'source', 'KRPP')) as source,
  coalesce(t.payload ->> 'opportunity_route', a.route) as opportunity_route,
  coalesce(t.payload ->> 'opportunity_gate', 'unassessed') as opportunity_gate,
  t.payload -> 'dossier_analysis' as dossier_analysis
from public.pppp_opportunity_actions a
join public.kek_tender_watch t on t.id = a.tender_watch_id
where a.status not in ('background','resolved','closed','done','superseded');

grant select on public.pppp_opportunity_action_queue_v2 to authenticated, service_role;
