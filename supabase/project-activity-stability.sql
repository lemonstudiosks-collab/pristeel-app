-- PPPP project activity compatibility + canonical activity tracking
-- Applied to production on 2026-08-17 during platform stabilization.

alter table public.projects
  add column if not exists updated_at timestamptz,
  add column if not exists last_activity_at timestamptz,
  add column if not exists last_email_at timestamptz;

with email_activity as (
  select project_id, max(coalesce(sent_at, created_at)) as ts
  from public.project_emails where project_id is not null group by project_id
), task_activity as (
  select project_id, max(created_at) as ts
  from public.tasks where project_id is not null group by project_id
), analysis_activity as (
  select project_id::uuid as project_id, max(created_at) as ts
  from public.project_analyses
  where project_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  group by project_id::uuid
), document_activity as (
  select project_id, max(created_at) as ts
  from public.documents_registry where project_id is not null group by project_id
)
update public.projects p
set last_email_at = e.ts,
    last_activity_at = greatest(p.created_at,coalesce(e.ts,'-infinity'::timestamptz),coalesce(t.ts,'-infinity'::timestamptz),coalesce(a.ts,'-infinity'::timestamptz),coalesce(d.ts,'-infinity'::timestamptz)),
    updated_at = greatest(p.created_at,coalesce(e.ts,'-infinity'::timestamptz),coalesce(t.ts,'-infinity'::timestamptz),coalesce(a.ts,'-infinity'::timestamptz),coalesce(d.ts,'-infinity'::timestamptz))
from (select id from public.projects) ids
left join email_activity e on e.project_id=ids.id
left join task_activity t on t.project_id=ids.id
left join analysis_activity a on a.project_id=ids.id
left join document_activity d on d.project_id=ids.id
where p.id=ids.id;

create or replace function public.pppp_projects_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.last_activity_at is null then new.last_activity_at := coalesce(old.last_activity_at,new.created_at,now()); end if;
  return new;
end; $$;

drop trigger if exists pppp_projects_set_updated_at on public.projects;
create trigger pppp_projects_set_updated_at before update on public.projects
for each row execute function public.pppp_projects_set_updated_at();

create or replace function public.pppp_touch_project_from_email()
returns trigger language plpgsql as $$
declare v_ts timestamptz;
begin
  if new.project_id is null then return new; end if;
  v_ts := coalesce(new.sent_at,new.created_at,now());
  update public.projects set
    last_email_at=greatest(coalesce(last_email_at,'-infinity'::timestamptz),v_ts),
    last_activity_at=greatest(coalesce(last_activity_at,created_at,'-infinity'::timestamptz),v_ts)
  where id=new.project_id;
  return new;
end; $$;

drop trigger if exists pppp_project_email_activity on public.project_emails;
create trigger pppp_project_email_activity after insert or update of project_id,sent_at on public.project_emails
for each row execute function public.pppp_touch_project_from_email();

create or replace function public.pppp_touch_project_from_task()
returns trigger language plpgsql as $$
begin
  if new.project_id is null then return new; end if;
  update public.projects set last_activity_at=greatest(coalesce(last_activity_at,created_at,'-infinity'::timestamptz),coalesce(new.created_at,now())) where id=new.project_id;
  return new;
end; $$;

drop trigger if exists pppp_project_task_activity on public.tasks;
create trigger pppp_project_task_activity after insert or update of project_id on public.tasks
for each row execute function public.pppp_touch_project_from_task();

create or replace function public.pppp_touch_project_from_analysis()
returns trigger language plpgsql as $$
declare v_project uuid;
begin
  if new.project_id is null or new.project_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return new; end if;
  v_project := new.project_id::uuid;
  update public.projects set last_activity_at=greatest(coalesce(last_activity_at,created_at,'-infinity'::timestamptz),coalesce(new.created_at,now())) where id=v_project;
  return new;
end; $$;

drop trigger if exists pppp_project_analysis_activity on public.project_analyses;
create trigger pppp_project_analysis_activity after insert or update of project_id on public.project_analyses
for each row execute function public.pppp_touch_project_from_analysis();

create or replace function public.pppp_touch_project_from_document()
returns trigger language plpgsql as $$
begin
  if new.project_id is null then return new; end if;
  update public.projects set last_activity_at=greatest(coalesce(last_activity_at,created_at,'-infinity'::timestamptz),coalesce(new.created_at,now())) where id=new.project_id;
  return new;
end; $$;

drop trigger if exists pppp_project_document_activity on public.documents_registry;
create trigger pppp_project_document_activity after insert or update of project_id on public.documents_registry
for each row execute function public.pppp_touch_project_from_document();

create index if not exists projects_last_activity_at_idx on public.projects(last_activity_at desc);
create index if not exists projects_last_email_at_idx on public.projects(last_email_at desc);
