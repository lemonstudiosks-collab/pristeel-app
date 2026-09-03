begin;

create or replace function public.pppp_client_offer_preparation_v1(p_project_id uuid)
returns jsonb
language plpgsql
stable
set search_path = pg_catalog, public
as $$
declare
  c record;
  v_n integer := 0;
  v_median numeric;
  v_won_n integer := 0;
  v_won_median numeric;
  v_margin numeric;
  v_confidence text;
  v_total_cost numeric;
  v_suggested_total numeric;
  v_suggested_unit numeric;
  v_history jsonb := '[]'::jsonb;
begin
  select * into c
  from public.pppp_selected_supplier_cost_basis_v1
  where project_id=p_project_id
  order by decided_at desc
  limit 1;

  if c.project_id is null then
    return jsonb_build_object(
      'project_id',p_project_id,
      'ready',false,
      'reason','No human-confirmed supplier cost basis exists.',
      'human_final_price_required',true
    );
  end if;

  with valid as (
    select *
    from public.price_history
    where margin_pct is not null
      and margin_pct between 0 and 40
      and cost_kg is not null and cost_kg>0
      and our_price_kg is not null and our_price_kg>=cost_kg
  )
  select
    count(*)::int,
    percentile_cont(0.5) within group(order by margin_pct)::numeric,
    count(*) filter(where lower(coalesce(outcome,'')) in ('fituar','won'))::int,
    percentile_cont(0.5) within group(order by margin_pct) filter(where lower(coalesce(outcome,'')) in ('fituar','won'))::numeric,
    coalesce(jsonb_agg(jsonb_build_object(
      'project',project_name,'client',client,'country',country,'work_type',work_type,
      'our_price_kg',our_price_kg,'cost_kg',cost_kg,'margin_pct',margin_pct,'outcome',outcome,'quoted_at',quoted_at
    ) order by quoted_at desc nulls last),'[]'::jsonb)
  into v_n,v_median,v_won_n,v_won_median,v_history
  from valid;

  v_margin := case when v_n>=3 then greatest(0,least(25,round(v_median,2))) else null end;
  v_confidence := case when v_n>=15 then 'high' when v_n>=7 then 'medium' when v_n>=3 then 'low' else 'insufficient' end;

  v_total_cost := coalesce(
    c.explicit_total_eur,
    case when upper(coalesce(c.currency,''))='EUR' then c.total_amount end,
    case when c.unit_cost_eur is not null and c.qty_kg is not null then c.unit_cost_eur*c.qty_kg end
  );

  if v_margin is not null and v_margin<100 then
    if v_total_cost is not null then
      v_suggested_total := round((v_total_cost/(1-v_margin/100))::numeric,2);
    end if;
    if c.unit_cost_eur is not null then
      v_suggested_unit := round((c.unit_cost_eur/(1-v_margin/100))::numeric,4);
    end if;
  end if;

  return jsonb_build_object(
    'bridge','client-offer-preparation-v1',
    'project_id',c.project_id,
    'project_name',c.project_name,
    'client',c.client,
    'ready',c.eligible_for_client_offer_handoff,
    'selected_supplier',c.selected_supplier,
    'supplier_offer_id',c.supplier_offer_id,
    'supplier_cost_basis',jsonb_build_object(
      'currency',c.currency,
      'pricing_basis',c.pricing_basis,
      'unit_cost_eur',c.unit_cost_eur,
      'total_cost_eur',v_total_cost,
      'qty_kg',c.qty_kg,
      'transport_eur',c.transport_eur,
      'delivery_weeks',c.delivery_weeks,
      'incoterms',c.incoterms,
      'payment_terms',c.payment_terms,
      'validity_days',c.validity_days,
      'cert',c.cert,
      'inclusions',c.inclusions,
      'exclusions',c.exclusions,
      'readiness',c.cost_basis_readiness,
      'warnings',c.warning_text
    ),
    'historical_pricing_reference',jsonb_build_object(
      'valid_sample_count',v_n,
      'median_margin_pct',v_median,
      'won_sample_count',v_won_n,
      'won_median_margin_pct',v_won_median,
      'confidence',v_confidence,
      'samples',v_history
    ),
    'pricing_reference',jsonb_build_object(
      'reference_margin_pct',v_margin,
      'reference_unit_price_eur',v_suggested_unit,
      'reference_total_eur',v_suggested_total,
      'method','historical gross-margin median; selling price = cost / (1 - margin)',
      'reference_only',true
    ),
    'human_final_price_required',true,
    'human_client_terms_required',true,
    'human_send_required',true,
    'generated_at',now()
  );
end;
$$;

revoke all on function public.pppp_client_offer_preparation_v1(uuid) from public, anon;
grant execute on function public.pppp_client_offer_preparation_v1(uuid) to authenticated, service_role;
do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_client_offer_preparation_v1(uuid) to supabase_read_only_user;
  end if;
end $$;

create or replace function public.pppp_client_offer_preparation_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_analysis jsonb;
  v_analysis_id bigint;
  v_seen integer:=0;
  v_written integer:=0;
  v_tasks integer:=0;
  v_ref jsonb;
  v_ref_line text;
begin
  for r in
    select c.*
    from public.pppp_selected_supplier_cost_basis_v1 c
    where c.eligible_for_client_offer_handoff
    order by c.decided_at desc
    limit least(500,greatest(1,coalesce(p_limit,100)))
  loop
    v_seen:=v_seen+1;
    v_analysis:=public.pppp_client_offer_preparation_v1(r.project_id);
    v_ref:=v_analysis->'pricing_reference';
    v_ref_line := case
      when nullif(v_ref->>'reference_margin_pct','') is not null then
        'PPPP pricing reference (JO çmim i aprovuar): historical margin '||(v_ref->>'reference_margin_pct')||'%'
        ||coalesce(' · reference total EUR '||(v_ref->>'reference_total_eur'),'')
        ||coalesce(' · reference unit EUR '||(v_ref->>'reference_unit_price_eur'),'')
        ||' · confidence '||coalesce(v_analysis#>>'{historical_pricing_reference,confidence}','insufficient')||'.'
      else
        'PPPP pricing reference: historiku i pastër është ende i pamjaftueshëm për rekomandim numerik.'
    end;

    if p_apply then
      select pa.id into v_analysis_id
      from public.project_analyses pa
      where pa.project_id=r.project_id::text and pa.model='client-offer-preparation-v1'
      order by pa.created_at desc limit 1;

      if v_analysis_id is null then
        insert into public.project_analyses(project_id,status,engine,model,analysis,source_manifest,source_counts,created_at)
        values(r.project_id::text,'complete','commercial_rules','client-offer-preparation-v1',v_analysis,
          jsonb_build_object('decision_id',r.decision_id,'supplier_offer_id',r.supplier_offer_id),
          jsonb_build_object('historical_pricing_samples',coalesce((v_analysis#>>'{historical_pricing_reference,valid_sample_count}')::integer,0)),now());
      else
        update public.project_analyses
        set analysis=v_analysis,source_manifest=jsonb_build_object('decision_id',r.decision_id,'supplier_offer_id',r.supplier_offer_id),
            source_counts=jsonb_build_object('historical_pricing_samples',coalesce((v_analysis#>>'{historical_pricing_reference,valid_sample_count}')::integer,0)),created_at=now()
        where id=v_analysis_id;
      end if;
      v_written:=v_written+1;

      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
      values(
        r.project_id,
        'Përgatit ofertën për klientin · '||left(r.project_name,145),
        'Supplier i zgjedhur nga njeriu: '||coalesce(r.selected_supplier,'—')||E'\n'
        ||'Baza e kostos: '||coalesce('EUR '||round(coalesce(r.explicit_total_eur,r.total_eur),2)::text,'shiko analizën e kostos')||E'\n'
        ||v_ref_line||E'\n\nHuman gate: ti vendos çmimin final, marginën/markup-un, kushtet e klientit dhe inclusions/exclusions. PPPP nuk aprovon dhe nuk dërgon ofertën automatikisht.',
        current_date,'larte','hapur','client_offer_cost_basis_auto','ofertim','COMMERCIAL:'||r.project_id::text||':client-offer-cost-basis'
      )
      on conflict(source,source_ref) do update
        set title=excluded.title,detail=excluded.detail,due_date=current_date,priority='larte',status='hapur',done_at=null;
      v_tasks:=v_tasks+1;
    end if;
  end loop;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'eligible_projects_seen',v_seen,
    'analyses_written',v_written,
    'offer_preparation_tasks_refreshed',v_tasks,
    'human_final_price_required',true,
    'generated_at',now()
  );
end;
$$;

revoke all on function public.pppp_client_offer_preparation_reconcile_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_client_offer_preparation_reconcile_v1(boolean,integer) to service_role;

-- Extend operator actions with the client-offer pricing gate and final draft review.
create or replace view public.pppp_home_current_actions_v1
with (security_invoker = true)
as
with eligible as (
  select t.id,t.project_id,p.name as project_name,p.client,t.title,t.detail,t.due_date,t.priority,t.status,
    t.source,t.source_ref,t.category,t.created_at,p.operational_state,p.operational_state_at,p.pipeline_stage,p.last_activity_at,p.last_email_at
  from public.tasks t join public.projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) <> all(array['kryer','done','mbyllur','closed','arkivuar','archived'])
    and lower(coalesce(p.status,'')) <> all(array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar'])
    and not exists(select 1 from public.pppp_project_context_current_v f where f.project_id=t.project_id and f.category='operator_update' and f.evidence_status='confirmed' and f.fact_status='observed' and f.updated_at>=t.created_at and lower(coalesce(f.value::text,'')) ~ '(nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow)')
), direct_candidates as (
  select e.*,row_number() over(partition by e.project_id order by
    case e.source when 'manual' then 0 when 'email_request_auto' then 1 when 'commercial_intake_review' then 2 when 'procurement_comparison_auto' then 3 when 'client_offer_cost_basis_auto' then 4 when 'client_offer_final_review_auto' then 5 else 9 end,
    e.due_date nulls first,e.created_at desc,e.id) as direct_rn
  from eligible e
  where e.source in ('manual','email_request_auto','commercial_intake_review','procurement_comparison_auto','client_offer_cost_basis_auto','client_offer_final_review_auto')
    and (e.source in ('commercial_intake_review','procurement_comparison_auto','client_offer_cost_basis_auto','client_offer_final_review_auto') or e.due_date is null or e.due_date<=current_date+7 or lower(coalesce(e.priority,'')) ~ '(urgjent|critical|e larte|larte|high)')
), direct_actions as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at from direct_candidates where direct_rn=1
), overdue_wait_candidates as (
  select e.*,row_number() over(partition by e.project_id order by e.due_date asc nulls last,e.created_at desc,e.id) as wait_rn
  from eligible e where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup') and e.due_date is not null and e.due_date<current_date and not exists(select 1 from direct_actions d where d.project_id=e.project_id)
), overdue_waits as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at from overdue_wait_candidates where wait_rn=1
)
select * from direct_actions union all select * from overdue_waits;

do $$
declare v_jobid bigint; v_command text:='select public.pppp_client_offer_preparation_reconcile_v1(true,150);';
begin
  select jobid into v_jobid from cron.job where jobname='client-offer-preparation-15m' limit 1;
  if v_jobid is null then
    perform cron.schedule('client-offer-preparation-15m','6,21,36,51 * * * *',v_command);
  else
    perform cron.alter_job(job_id=>v_jobid,schedule=>'6,21,36,51 * * * *',command=>v_command,active=>true);
  end if;
end $$;

commit;
