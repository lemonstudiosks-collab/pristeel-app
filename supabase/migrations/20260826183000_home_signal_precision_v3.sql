-- PPPP Home signal precision v3, 2026-08-26.
-- Home is an operator surface, not a mirror of every automated/system task.
-- Only explicit human-created actions and explicit Gmail-derived requests may enter Home.

create or replace view public.pppp_home_current_actions_v1 as
select
  t.id,
  t.project_id,
  p.name as project_name,
  p.client,
  t.title,
  t.detail,
  t.due_date,
  t.priority,
  t.status,
  t.source,
  t.source_ref,
  t.category,
  t.created_at,
  p.operational_state,
  p.operational_state_at,
  p.pipeline_stage,
  p.last_activity_at,
  p.last_email_at
from public.tasks t
join public.projects p on p.id=t.project_id
where lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed','arkivuar','archived')
  and lower(coalesce(p.status,'')) not in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar')
  and coalesce(t.source,'') in ('manual','email_request_auto')
  and not exists (
    select 1
    from public.pppp_project_context_current_v f
    where f.project_id=t.project_id
      and f.category='operator_update'
      and f.evidence_status='confirmed'
      and f.fact_status='observed'
      and f.updated_at>=t.created_at
      and lower(coalesce(f.value::text,'')) ~ '(nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow)'
  )
  and (
    t.due_date is null
    or t.due_date <= current_date + 7
    or lower(coalesce(t.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
  );

-- PST-OFF-2026-08-026 currently has conflicting identity evidence:
-- documents_registry associates it with CARINVEST while Gmail contains sent Dukley
-- Seafront messages/attachment using the same number. Keep this backstage and do not
-- infer sent/unsent state from the number until the identity is reconciled.
insert into public.tasks(project_id,title,detail,due_date,priority,status,source,source_ref,category)
select p.id,
       'Data integrity: PST-OFF-2026-08-026 identity conflict',
       'Database registry associates PST-OFF-2026-08-026 with CARINVEST, while Gmail contains sent Dukley Seafront messages/attachment using the same number. Reconcile document identity before any automated sent/unsent inference. This is backstage system maintenance, not a Home action.',
       current_date + 30,
       'mesatare',
       'hapur',
       'data_integrity_audit',
       'DOC_NO_COLLISION:PST-OFF-2026-08-026',
       'intern'
from public.projects p
where p.name ilike '%Hala%CARINVEST%'
  and not exists (
    select 1
    from public.tasks x
    where x.project_id=p.id
      and x.source='data_integrity_audit'
      and x.source_ref='DOC_NO_COLLISION:PST-OFF-2026-08-026'
      and lower(coalesce(x.status,'')) not in ('kryer','done','mbyllur','closed','arkivuar','archived')
  );
