-- PPPP Opportunity Engine v2
-- Durable action/dossier state + qualified-only automatic project promotion.

create table if not exists public.pppp_opportunity_actions (
  id uuid primary key default gen_random_uuid(),
  tender_watch_id uuid not null references public.kek_tender_watch(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  action_key text not null unique,
  action_type text not null,
  route text not null,
  status text not null default 'draft_review',
  priority text not null default 'mesatare',
  due_date date,
  target_company text,
  target_email text,
  subject_hint text,
  draft_brief text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pppp_opportunity_actions_tender_idx
  on public.pppp_opportunity_actions(tender_watch_id, status, updated_at desc);
create index if not exists pppp_opportunity_actions_project_idx
  on public.pppp_opportunity_actions(project_id) where project_id is not null;
create index if not exists pppp_opportunity_actions_due_idx
  on public.pppp_opportunity_actions(due_date, status) where status in ('draft_review','review','open');

create table if not exists public.pppp_tender_dossier_versions (
  id bigint generated always as identity primary key,
  tender_watch_id uuid not null references public.kek_tender_watch(id) on delete cascade,
  fingerprint text not null,
  source text not null,
  dossier_complete boolean not null default false,
  document_count integer not null default 0,
  recommendation text,
  analyzed_at timestamptz not null default now(),
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(tender_watch_id, fingerprint)
);

create index if not exists pppp_tender_dossier_versions_tender_idx
  on public.pppp_tender_dossier_versions(tender_watch_id, analyzed_at desc);

create table if not exists public.pppp_tender_fetch_queue (
  tender_watch_id uuid primary key references public.kek_tender_watch(id) on delete cascade,
  source text not null,
  status text not null default 'queued',
  auth_required boolean not null default false,
  protected_documents text[] not null default '{}'::text[],
  requested_at timestamptz not null default now(),
  last_attempt_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pppp_opportunity_actions enable row level security;
alter table public.pppp_tender_dossier_versions enable row level security;
alter table public.pppp_tender_fetch_queue enable row level security;

drop policy if exists pppp_opportunity_actions_authenticated_read on public.pppp_opportunity_actions;
create policy pppp_opportunity_actions_authenticated_read
  on public.pppp_opportunity_actions for select to authenticated using (true);
drop policy if exists pppp_tender_dossier_versions_authenticated_read on public.pppp_tender_dossier_versions;
create policy pppp_tender_dossier_versions_authenticated_read
  on public.pppp_tender_dossier_versions for select to authenticated using (true);
drop policy if exists pppp_tender_fetch_queue_authenticated_read on public.pppp_tender_fetch_queue;
create policy pppp_tender_fetch_queue_authenticated_read
  on public.pppp_tender_fetch_queue for select to authenticated using (true);

grant select on public.pppp_opportunity_actions to authenticated;
grant select on public.pppp_tender_dossier_versions to authenticated;
grant select on public.pppp_tender_fetch_queue to authenticated;
grant all on public.pppp_opportunity_actions to service_role;
grant all on public.pppp_tender_dossier_versions to service_role;
grant all on public.pppp_tender_fetch_queue to service_role;
grant usage, select on sequence public.pppp_tender_dossier_versions_id_seq to service_role;

create or replace view public.pppp_opportunity_action_queue_v2 as
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
  upper(coalesce(t.payload->>'source','KRPP')) as source,
  coalesce(t.payload->>'opportunity_route',a.route) as opportunity_route,
  coalesce(t.payload->>'opportunity_gate','unassessed') as opportunity_gate,
  t.payload->'dossier_analysis' as dossier_analysis
from public.pppp_opportunity_actions a
join public.kek_tender_watch t on t.id=a.tender_watch_id;

grant select on public.pppp_opportunity_action_queue_v2 to authenticated, service_role;

create index if not exists pppp_tender_project_promotions_project_id_idx
  on public.pppp_tender_project_promotions(project_id) where project_id is not null;

create or replace function public.pppp_tender_project_promotion_reconcile_v2(
  p_apply boolean default false,
  p_limit integer default 100
) returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  v_project uuid;
  v_limit integer := least(500,greatest(1,coalesce(p_limit,100)));
  v_candidates integer := 0;
  v_promoted integer := 0;
  v_linked integer := 0;
  v_skipped integer := 0;
  v_blocked integer := 0;
  v_errors integer := 0;
  v_due date;
  v_reason text;
begin
  insert into public.pppp_tender_project_promotions(
    tender_watch_id,operating_lane,promotion_state,eligibility_reason,last_evaluated_at,metadata,updated_at
  )
  select
    v.id,
    v.operating_lane,
    case
      when v.status='ignored' or (v.deadline is not null and v.deadline<current_date) then 'skipped'
      when coalesce(v.payload->>'opportunity_gate','unassessed')='qualified' then 'candidate'
      else 'candidate'
    end,
    case
      when v.status='ignored' then 'Tender is ignored by current business rules.'
      when v.deadline is not null and v.deadline<current_date then 'Tender deadline has passed.'
      when coalesce(v.payload->>'opportunity_gate','unassessed')='qualified' then 'Dossier and Opportunity Engine gate are qualified for project promotion.'
      else 'Waiting for Opportunity Engine dossier/qualification gate.'
    end,
    now(),
    jsonb_build_object(
      'source_key',v.source_key,
      'procurement_no',v.procurement_no,
      'publication_no',v.publication_no,
      'authority',v.authority,
      'title',v.title,
      'relevance_score',v.relevance_score,
      'deadline',v.deadline,
      'status',v.status,
      'opportunity_route',v.payload->>'opportunity_route',
      'opportunity_gate',v.payload->>'opportunity_gate'
    ),
    now()
  from public.pppp_tender_operating_lanes_v1 v
  where v.operating_lane='direct_tender'
  on conflict(tender_watch_id) do update set
    operating_lane=excluded.operating_lane,
    promotion_state=case
      when public.pppp_tender_project_promotions.promotion_state in ('promoted','linked_existing')
        then public.pppp_tender_project_promotions.promotion_state
      else excluded.promotion_state
    end,
    eligibility_reason=excluded.eligibility_reason,
    last_evaluated_at=now(),
    metadata=excluded.metadata,
    updated_at=now();

  if not p_apply then
    select count(*) into v_candidates from public.pppp_tender_project_promotions where promotion_state='candidate';
    select count(*) into v_skipped from public.pppp_tender_project_promotions where promotion_state='skipped';
    return jsonb_build_object('mode','preview','candidates',v_candidates,'skipped',v_skipped,'promoted',0,'linked_existing',0,'blocked',0,'errors',0,'generated_at',now());
  end if;

  for r in
    select v.*
    from public.pppp_tender_operating_lanes_v1 v
    where v.project_id is null
      and v.operating_lane='direct_tender'
      and v.status<>'ignored'
      and (v.deadline is null or v.deadline>=current_date)
    order by
      case when coalesce(v.payload->>'opportunity_gate','')='qualified' then 0 else 1 end,
      v.relevance_score desc,
      v.published_date desc nulls last
    limit v_limit
  loop
    v_project := null;

    select p.id into v_project
    from public.projects p
    where p.id is not null and (
      coalesce(nullif(btrim(p.business_ref),''),'')=coalesce(r.source_key,'')
      or lower(coalesce(nullif(btrim(p.ref),''),''))=lower(coalesce(nullif(btrim(r.procurement_no),''),''))
      or lower(coalesce(nullif(btrim(p.ref),''),''))=lower(coalesce(nullif(btrim(r.publication_no),''),''))
      or coalesce(r.source_key,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
      or coalesce(r.procurement_no,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
      or coalesce(r.publication_no,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
    )
    order by p.created_at desc nulls last
    limit 1;

    if v_project is not null then
      update public.kek_tender_watch set project_id=v_project,updated_at=now() where id=r.id and project_id is null;
      update public.pppp_tender_project_promotions
      set promotion_state='linked_existing',project_id=v_project,promoted_at=coalesce(promoted_at,now()),
          eligibility_reason='Exact tender identity matched an existing canonical project.',last_evaluated_at=now(),updated_at=now()
      where tender_watch_id=r.id;
      update public.pppp_opportunity_actions set project_id=v_project,updated_at=now() where tender_watch_id=r.id and project_id is null;
      v_linked := v_linked + 1;
      continue;
    end if;

    if r.status<>'review' or coalesce(r.payload->>'opportunity_gate','unassessed')<>'qualified' then
      v_blocked := v_blocked + 1;
      continue;
    end if;

    begin
      insert into public.projects(
        name,client,ref,deadline,notes,status,pipeline_stage,business_ref,identity_aliases,updated_at,last_activity_at,origin_type
      ) values (
        r.title,
        r.authority,
        r.procurement_no,
        case when r.deadline is null then null else r.deadline::text end,
        'Auto-promoted by PPPP Opportunity Engine v2 after dossier qualification. Source: '||r.source_key||E'\nPublication: '||coalesce(r.publication_no,'—')||E'\nRoute: '||coalesce(r.payload->>'opportunity_route','—')||E'\nRelevance score: '||coalesce(r.relevance_score,0)::text||E'\nNo outbound communication was sent by this promotion.',
        'pritje',
        'technical_review',
        r.source_key,
        array_remove(array[r.source_key,r.procurement_no,r.publication_no]::text[],null),
        now(),now(),'tender'
      ) returning id into v_project;

      update public.kek_tender_watch set project_id=v_project,updated_at=now() where id=r.id;
      update public.pppp_opportunity_actions set project_id=v_project,updated_at=now() where tender_watch_id=r.id and project_id is null;
      v_due := greatest(current_date,coalesce(r.deadline-7,current_date));
      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
      values(
        v_project,
        'Opportunity qualified · '||left(r.title,150),
        'PPPP created this canonical project only after Opportunity Engine qualification. Confirm participation strategy, final commercial decision, supplier/partner commitments and submission plan before deadline '||coalesce(r.deadline::text,'—')||'.',
        v_due,'larte','hapur','tender_project_promotion','intern','TENDER:'||r.id::text
      )
      on conflict(source,source_ref) do update set
        project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,due_date=excluded.due_date,
        priority='larte',status='hapur',done_at=null;

      update public.pppp_tender_project_promotions
      set promotion_state='promoted',project_id=v_project,promoted_at=now(),
          eligibility_reason='Opportunity Engine dossier/qualification gate passed; canonical project created.',
          last_evaluated_at=now(),updated_at=now()
      where tender_watch_id=r.id;
      v_promoted := v_promoted + 1;
    exception when others then
      v_reason := left(sqlerrm,1000);
      update public.pppp_tender_project_promotions
      set promotion_state='error',eligibility_reason=v_reason,last_evaluated_at=now(),updated_at=now()
      where tender_watch_id=r.id;
      insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
      values(
        'Tender promotion failure · '||left(r.title,140),
        'PPPP Opportunity Engine could not promote tender '||r.source_key||' to a canonical project. '||v_reason,
        current_date,'larte','hapur','automation_failure','intern','AUTOMATION:tender-promotion:'||r.id::text
      )
      on conflict(source,source_ref) do update set
        title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
      v_errors := v_errors + 1;
    end;
  end loop;

  select count(*) into v_candidates from public.pppp_tender_project_promotions where promotion_state='candidate';
  select count(*) into v_skipped from public.pppp_tender_project_promotions where promotion_state='skipped';
  return jsonb_build_object('mode','apply','candidates',v_candidates,'skipped',v_skipped,'promoted',v_promoted,'linked_existing',v_linked,'blocked',v_blocked,'errors',v_errors,'generated_at',now());
end;
$function$;

grant execute on function public.pppp_tender_project_promotion_reconcile_v2(boolean,integer) to service_role;

-- Move the scheduler to the qualified-only v2 reconciler while preserving the same cadence.
do $do$
declare v_job bigint;
begin
  select jobid into v_job from cron.job where jobname='tender-project-promotion-hourly' limit 1;
  if v_job is not null then perform cron.unschedule(v_job); end if;
  perform cron.schedule('tender-project-promotion-hourly','36 * * * *','select public.pppp_tender_project_promotion_reconcile_v2(true,100);');
end;
$do$;
