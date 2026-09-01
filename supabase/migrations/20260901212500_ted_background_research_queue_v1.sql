-- Keep unresolved TED company-role research out of the human work queue.
-- Research remains durable and retryable, but only classified/routeable records surface as actions.

create or replace function private.pppp_opportunity_action_background_guard()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if new.action_type = 'company_role_research' then
    new.status := 'background';
    new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object(
      'background_only', true,
      'work_queue_visible', false,
      'background_queue_version', 'ted-role-research-v1'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists pppp_opportunity_action_background_guard_trg on public.pppp_opportunity_actions;
create trigger pppp_opportunity_action_background_guard_trg
before insert or update of action_type, status, payload
on public.pppp_opportunity_actions
for each row
execute function private.pppp_opportunity_action_background_guard();

update public.pppp_opportunity_actions
set status = 'background',
    payload = coalesce(payload, '{}'::jsonb) || jsonb_build_object(
      'background_only', true,
      'work_queue_visible', false,
      'background_queue_version', 'ted-role-research-v1'
    ),
    updated_at = now()
where action_type = 'company_role_research'
  and status is distinct from 'background';

create or replace view public.pppp_opportunity_action_queue_v2
with (security_invoker = true)
as
select
  a.id,
  a.tender_watch_id,
  a.project_id,
  a.action_key,
  a.action_type,
  a.route,
  a.status,
  a.priority,
  a.due_date,
  a.target_company,
  a.target_email,
  a.subject_hint,
  a.draft_brief,
  a.payload,
  a.created_at,
  a.updated_at,
  t.title as tender_title,
  t.authority,
  t.procurement_no,
  t.publication_no,
  t.deadline,
  t.relevance_score,
  upper(coalesce(t.payload ->> 'source', 'KRPP')) as source,
  coalesce(t.payload ->> 'opportunity_route', a.route) as opportunity_route,
  coalesce(t.payload ->> 'opportunity_gate', 'unassessed') as opportunity_gate,
  t.payload -> 'dossier_analysis' as dossier_analysis
from public.pppp_opportunity_actions a
join public.kek_tender_watch t on t.id = a.tender_watch_id
where a.status <> 'background';

create or replace view public.pppp_opportunity_background_research_v1
with (security_invoker = true)
as
select
  a.id,
  a.tender_watch_id,
  a.action_key,
  a.action_type,
  a.route,
  a.status,
  a.priority,
  a.due_date,
  a.target_company,
  a.target_email,
  a.subject_hint,
  a.draft_brief,
  a.payload,
  a.created_at,
  a.updated_at,
  t.title as tender_title,
  t.publication_no,
  t.relevance_score,
  upper(coalesce(t.payload ->> 'source', 'TED')) as source
from public.pppp_opportunity_actions a
join public.kek_tender_watch t on t.id = a.tender_watch_id
where a.status = 'background'
  and a.action_type = 'company_role_research';

grant select on public.pppp_opportunity_action_queue_v2 to authenticated, service_role;
grant select on public.pppp_opportunity_background_research_v1 to authenticated, service_role;
