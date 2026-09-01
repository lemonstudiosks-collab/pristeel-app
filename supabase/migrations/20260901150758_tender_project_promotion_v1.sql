-- Guarded Tender -> Project promotion.
-- Only direct tenders already placed in `review` may create a canonical project.
-- No outbound communication, Won/Lost decision, supplier commitment or pricing change is automated here.

create table if not exists public.pppp_tender_project_promotions (
  tender_watch_id uuid primary key references public.kek_tender_watch(id) on delete cascade,
  operating_lane text not null,
  promotion_state text not null default 'candidate'
    check (promotion_state in ('candidate','linked_existing','promoted','skipped','error')),
  eligibility_reason text,
  project_id uuid references public.projects(id) on delete set null,
  last_evaluated_at timestamptz not null default now(),
  promoted_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pppp_tender_project_promotions_state_idx
  on public.pppp_tender_project_promotions(promotion_state,last_evaluated_at desc);

alter table public.pppp_tender_project_promotions enable row level security;
revoke all on table public.pppp_tender_project_promotions from public,anon,authenticated;
grant select,insert,update,delete on table public.pppp_tender_project_promotions to service_role;

create or replace function public.pppp_tender_project_promotion_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 100
) returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  v_project uuid;
  v_limit integer:=least(500,greatest(1,coalesce(p_limit,100)));
  v_candidates integer:=0;
  v_promoted integer:=0;
  v_linked integer:=0;
  v_skipped integer:=0;
  v_errors integer:=0;
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
      else 'candidate'
    end,
    case
      when v.status='ignored' then 'Tender is ignored by current business rules.'
      when v.deadline is not null and v.deadline<current_date then 'Tender deadline has passed.'
      when v.status='review' then 'Direct tender is in review and is eligible for canonical project promotion.'
      else 'Direct tender remains a candidate until it reaches review.'
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
      'status',v.status
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

  select count(*) into v_candidates
  from public.pppp_tender_project_promotions where promotion_state='candidate';
  select count(*) into v_skipped
  from public.pppp_tender_project_promotions where promotion_state='skipped';

  if not p_apply then
    return jsonb_build_object(
      'mode','preview','candidates',v_candidates,'skipped',v_skipped,
      'promoted',0,'linked_existing',0,'errors',0,'generated_at',now()
    );
  end if;

  for r in
    select v.*
    from public.pppp_tender_operating_lanes_v1 v
    where v.project_id is null
      and v.operating_lane='direct_tender'
      and v.status<>'ignored'
      and (v.deadline is null or v.deadline>=current_date)
    order by
      case when v.status='review' then 0 else 1 end,
      v.relevance_score desc,
      v.published_date desc nulls last
    limit v_limit
  loop
    v_project:=null;

    select p.id into v_project
    from public.projects p
    where
      coalesce(nullif(btrim(p.business_ref),''),'')=coalesce(r.source_key,'')
      or lower(coalesce(nullif(btrim(p.ref),''),''))=lower(coalesce(nullif(btrim(r.procurement_no),''),''))
      or lower(coalesce(nullif(btrim(p.ref),''),''))=lower(coalesce(nullif(btrim(r.publication_no),''),''))
      or coalesce(r.source_key,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
      or coalesce(r.procurement_no,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
      or coalesce(r.publication_no,'')=any(coalesce(p.identity_aliases,'{}'::text[]))
    order by p.created_at desc nulls last
    limit 1;

    if v_project is not null then
      update public.kek_tender_watch
      set project_id=v_project,updated_at=now()
      where id=r.id and project_id is null;

      update public.pppp_tender_project_promotions
      set promotion_state='linked_existing',
          project_id=v_project,
          promoted_at=coalesce(promoted_at,now()),
          eligibility_reason='Exact tender identity matched an existing canonical project.',
          last_evaluated_at=now(),
          updated_at=now()
      where tender_watch_id=r.id;
      v_linked:=v_linked+1;
      continue;
    end if;

    -- Explicit business gate: discovery alone never creates a Project.
    if r.status<>'review' then continue; end if;

    begin
      insert into public.projects(
        name,client,ref,deadline,notes,status,pipeline_stage,business_ref,
        identity_aliases,updated_at,last_activity_at,origin_type
      ) values (
        r.title,
        r.authority,
        r.procurement_no,
        case when r.deadline is null then null else r.deadline::text end,
        'Auto-promoted from PPPP tender review. Source: '||r.source_key||
          E'\nPublication: '||coalesce(r.publication_no,'—')||
          E'\nRelevance score: '||coalesce(r.relevance_score,0)::text||
          E'\nNo outbound communication was sent by this promotion.',
        'pritje',
        'technical_review',
        r.source_key,
        array_remove(array[r.source_key,r.procurement_no,r.publication_no]::text[],null),
        now(),now(),'tender'
      ) returning id into v_project;

      update public.kek_tender_watch
      set project_id=v_project,updated_at=now()
      where id=r.id;

      v_due:=greatest(current_date,coalesce(r.deadline-7,current_date));
      insert into public.tasks(
        project_id,title,detail,due_date,priority,status,source,category,source_ref
      ) values (
        v_project,
        'Tender review · '||left(r.title,160),
        'Canonical project created from a direct tender already in review. Confirm participation strategy, dossier completeness, partner/subcontracting angle and next action before deadline '||coalesce(r.deadline::text,'—')||'.',
        v_due,'larte','hapur','tender_project_promotion','intern','TENDER:'||r.id::text
      )
      on conflict(source,source_ref) do update set
        project_id=excluded.project_id,
        title=excluded.title,
        detail=excluded.detail,
        due_date=excluded.due_date,
        priority='larte',
        status='hapur',
        done_at=null;

      update public.pppp_tender_project_promotions
      set promotion_state='promoted',
          project_id=v_project,
          promoted_at=now(),
          eligibility_reason='Direct tender was already in review; canonical project created automatically.',
          last_evaluated_at=now(),
          updated_at=now()
      where tender_watch_id=r.id;
      v_promoted:=v_promoted+1;
    exception when others then
      v_reason:=left(sqlerrm,1000);
      update public.pppp_tender_project_promotions
      set promotion_state='error',eligibility_reason=v_reason,last_evaluated_at=now(),updated_at=now()
      where tender_watch_id=r.id;

      insert into public.tasks(title,detail,due_date,priority,status,source,category,source_ref)
      values(
        'Tender promotion failure · '||left(r.title,140),
        'PPPP could not promote tender '||r.source_key||' to a canonical project. '||v_reason,
        current_date,'larte','hapur','automation_failure','intern','AUTOMATION:tender-promotion:'||r.id::text
      )
      on conflict(source,source_ref) do update set
        title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
      v_errors:=v_errors+1;
    end;
  end loop;

  select count(*) into v_candidates
  from public.pppp_tender_project_promotions where promotion_state='candidate';
  select count(*) into v_skipped
  from public.pppp_tender_project_promotions where promotion_state='skipped';

  return jsonb_build_object(
    'mode','apply','candidates',v_candidates,'skipped',v_skipped,
    'promoted',v_promoted,'linked_existing',v_linked,'errors',v_errors,'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer) from public,anon,authenticated;
grant execute on function public.pppp_tender_project_promotion_reconcile_v1(boolean,integer) to service_role;

-- Extend automation health with managed HTTP and tender-promotion visibility.
create or replace function public.pppp_automation_control_health_v1()
returns jsonb
language plpgsql security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if coalesce(auth.role(),'')<>'service_role' and not public.is_admin() then
    raise exception 'forbidden' using errcode='42501';
  end if;
  return jsonb_build_object(
    'generated_at',now(),
    'managed_http',jsonb_build_object(
      'queued',(select count(*) from public.pppp_automation_http_runs where status='queued'),
      'retry_wait',(select count(*) from public.pppp_automation_http_runs where status='retry_wait'),
      'failed_24h',(select count(*) from public.pppp_automation_http_runs where status='failed' and updated_at>=now()-interval '24 hours'),
      'succeeded_24h',(select count(*) from public.pppp_automation_http_runs where status='succeeded' and updated_at>=now()-interval '24 hours'),
      'latest_failed_at',(select max(updated_at) from public.pppp_automation_http_runs where status='failed')
    ),
    'tender_promotion',jsonb_build_object(
      'candidate',(select count(*) from public.pppp_tender_project_promotions where promotion_state='candidate'),
      'promoted',(select count(*) from public.pppp_tender_project_promotions where promotion_state='promoted'),
      'linked_existing',(select count(*) from public.pppp_tender_project_promotions where promotion_state='linked_existing'),
      'skipped',(select count(*) from public.pppp_tender_project_promotions where promotion_state='skipped'),
      'errors',(select count(*) from public.pppp_tender_project_promotions where promotion_state='error')
    ),
    'open_failure_tasks',(
      select count(*) from public.tasks
      where source='automation_failure' and lower(coalesce(status,'')) not in ('kryer','mbyllur','done')
    )
  );
end;
$function$;

revoke all on function public.pppp_automation_control_health_v1() from public,anon;
grant execute on function public.pppp_automation_control_health_v1() to authenticated,service_role;

do $do$
declare v_jobid bigint;
begin
  for v_jobid in
    select jobid from cron.job where jobname='tender-project-promotion-hourly'
  loop
    perform cron.unschedule(v_jobid);
  end loop;
  perform cron.schedule(
    'tender-project-promotion-hourly','36 * * * *',
    $cmd$select public.pppp_tender_project_promotion_reconcile_v1(true,100);$cmd$
  );
end;
$do$;
