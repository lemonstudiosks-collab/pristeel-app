-- PPPP Procurement supplier comparison human gate v1
-- Production parity migration. Price leadership is advisory only; supplier selection remains human-approved.

create or replace view public.pppp_supplier_offer_comparison_v1
with (security_invoker=true)
as
with base as (
  select
    o.id as offer_id,o.project_id,o.supplier,o.created_at,
    upper(coalesce(nullif(btrim(o.currency),''),'EUR')) as currency,
    lower(coalesce(nullif(btrim(o.pricing_unit),''),
      case when coalesce(o.price_kg,0)>0 then 'kg' when coalesce(o.unit_price,0)>0 then 'unit' else 'total' end)) as pricing_basis,
    o.price_kg,o.unit_price,o.total_amount,o.total_eur,o.qty_kg,o.delivery_weeks,o.incoterms,
    o.payment_terms,o.validity_days,o.cert,o.offer_ref,o.transport_eur,o.zinc_kg,o.exchange_rate_to_eur,
    case
      when upper(coalesce(nullif(btrim(o.currency),''),'EUR'))='EUR' then 1::numeric
      else o.exchange_rate_to_eur
    end as rate_to_eur
  from public.offers o
), calc as (
  select b.*,
    case
      when coalesce(b.price_kg,0)>0 and b.rate_to_eur is not null then b.price_kg*b.rate_to_eur
      when coalesce(b.unit_price,0)>0 and b.rate_to_eur is not null then b.unit_price*b.rate_to_eur
      when coalesce(b.total_eur,0)>0 then b.total_eur
      when coalesce(b.total_amount,0)>0 and b.rate_to_eur is not null then b.total_amount*b.rate_to_eur
      else null
    end as comparison_value_eur,
    (
      case when coalesce(b.price_kg,b.unit_price,b.total_eur,b.total_amount) is not null then 30 else 0 end +
      case when b.rate_to_eur is not null or coalesce(b.total_eur,0)>0 then 15 else 0 end +
      case when nullif(btrim(coalesce(b.incoterms,'')),'') is not null then 10 else 0 end +
      case when b.delivery_weeks is not null then 15 else 0 end +
      case when nullif(btrim(coalesce(b.payment_terms,'')),'') is not null then 10 else 0 end +
      case when nullif(btrim(coalesce(b.cert,'')),'') is not null then 10 else 0 end +
      case when b.validity_days is not null then 5 else 0 end +
      case when nullif(btrim(coalesce(b.offer_ref,'')),'') is not null then 5 else 0 end
    )::integer as completeness_score
  from base b
)
select
  c.*,
  (c.comparison_value_eur is not null and c.comparison_value_eur>0 and c.pricing_basis<>'unknown') as comparable,
  case when c.comparison_value_eur is not null and c.comparison_value_eur>0 then
    dense_rank() over(partition by c.project_id,c.pricing_basis order by c.comparison_value_eur asc,c.created_at desc)
  else null end as price_rank_within_basis,
  count(*) filter(where c.comparison_value_eur is not null and c.comparison_value_eur>0)
    over(partition by c.project_id,c.pricing_basis) as comparable_count_in_basis
from calc c;

grant select on public.pppp_supplier_offer_comparison_v1 to authenticated,service_role;

create or replace function public.pppp_supplier_offer_comparison_json_v1(p_project_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path to 'pg_catalog','public'
as $function$
with p as (
  select id,name,client,ref,business_ref,status,pipeline_stage,operational_state
  from public.projects where id=p_project_id
), offers as (
  select * from public.pppp_supplier_offer_comparison_v1 where project_id=p_project_id
), groups as (
  select pricing_basis,
         count(*) filter(where comparable)::int comparable_offers,
         min(comparison_value_eur) filter(where comparable) price_leader_value_eur,
         (array_agg(supplier order by comparison_value_eur asc,created_at desc) filter(where comparable))[1] price_leader_supplier
  from offers group by pricing_basis
), decisions as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'decision_type',decision_type,'status',status,'supplier_name',supplier_name,
    'supplier_offer_id',supplier_offer_id,'source',source,'decided_at',decided_at,'evidence',evidence
  ) order by decided_at desc),'[]'::jsonb) j
  from public.project_supplier_decisions
  where project_id=p_project_id and status='active'
)
select jsonb_build_object(
  'project',(select to_jsonb(p) from p),
  'comparison_ready',exists(select 1 from groups where comparable_offers>=2),
  'human_gate_required',true,
  'basis_groups',coalesce((select jsonb_agg(jsonb_build_object(
    'pricing_basis',pricing_basis,'comparable_offers',comparable_offers,
    'price_leader_supplier',price_leader_supplier,'price_leader_value_eur',price_leader_value_eur,
    'note','Price leader is a comparison signal only, not an automatic supplier selection.'
  ) order by comparable_offers desc,pricing_basis) from groups),'[]'::jsonb),
  'offers',coalesce((select jsonb_agg(jsonb_build_object(
    'offer_id',offer_id,'supplier',supplier,'currency',currency,'pricing_basis',pricing_basis,
    'comparison_value_eur',comparison_value_eur,'price_rank',price_rank_within_basis,
    'comparable_count',comparable_count_in_basis,'completeness_score',completeness_score,
    'delivery_weeks',delivery_weeks,'incoterms',incoterms,'payment_terms',payment_terms,
    'validity_days',validity_days,'cert',cert,'offer_ref',offer_ref,
    'qty_kg',qty_kg,'transport_eur',transport_eur,'zinc_kg',zinc_kg
  ) order by pricing_basis,price_rank_within_basis nulls last,created_at desc) from offers),'[]'::jsonb),
  'active_decisions',(select j from decisions)
);
$function$;

revoke all on function public.pppp_supplier_offer_comparison_json_v1(uuid) from public,anon;
grant execute on function public.pppp_supplier_offer_comparison_json_v1(uuid) to authenticated,service_role;

create or replace function public.pppp_procurement_comparison_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  v_limit integer:=least(500,greatest(1,coalesce(p_limit,100)));
  v_snapshot jsonb;
  v_analysis_id bigint;
  v_candidates integer:=0;
  v_tasks integer:=0;
  v_closed integer:=0;
  v_analyses integer:=0;
begin
  for r in
    with group_ready as (
      select c.project_id,c.pricing_basis,
             count(*) filter(where c.comparable)::int comparable_offers,
             min(c.comparison_value_eur) filter(where c.comparable) leader_value,
             (array_agg(c.supplier order by c.comparison_value_eur asc,c.created_at desc) filter(where c.comparable))[1] leader_supplier
      from public.pppp_supplier_offer_comparison_v1 c
      group by c.project_id,c.pricing_basis
      having count(*) filter(where c.comparable)>=2
    ), ranked as (
      select g.*,p.name,p.status,p.pipeline_stage,p.operational_state,
             row_number() over(partition by g.project_id order by g.comparable_offers desc,g.pricing_basis) rn
      from group_ready g
      join public.projects p on p.id=g.project_id
      where lower(coalesce(p.status,'')) not in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled')
        and p.pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing')
        and coalesce(p.operational_state,'') not in ('wait_for_client','execution')
        and not exists(select 1 from public.project_supplier_decisions d where d.project_id=p.id and d.status='active')
    )
    select * from ranked where rn=1
    order by comparable_offers desc,name
    limit v_limit
  loop
    v_candidates:=v_candidates+1;
    if not p_apply then continue; end if;

    v_snapshot:=public.pppp_supplier_offer_comparison_json_v1(r.project_id);
    select id into v_analysis_id
    from public.project_analyses
    where project_id=r.project_id::text and model='supplier-comparison-v1'
    order by created_at desc limit 1;

    if v_analysis_id is null then
      insert into public.project_analyses(project_id,status,engine,model,analysis,source_manifest,source_counts,created_at)
      values(
        r.project_id::text,'complete','procurement_rules','supplier-comparison-v1',v_snapshot,
        jsonb_build_object('source','canonical_offers','project_id',r.project_id),
        jsonb_build_object('offers',(select count(*) from public.offers o where o.project_id=r.project_id)),now()
      );
    else
      update public.project_analyses
         set status='complete',engine='procurement_rules',analysis=v_snapshot,
             source_manifest=jsonb_build_object('source','canonical_offers','project_id',r.project_id),
             source_counts=jsonb_build_object('offers',(select count(*) from public.offers o where o.project_id=r.project_id)),
             created_at=now()
       where id=v_analysis_id;
    end if;
    v_analyses:=v_analyses+1;

    insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
    values(
      r.project_id,
      'Zgjedh furnitorin · '||left(r.name,160),
      r.comparable_offers::text||' oferta janë të krahasueshme në bazën '||upper(r.pricing_basis)||'. Price leader: '||
      coalesce(r.leader_supplier,'—')||' · '||coalesce(round(r.leader_value,4)::text,'—')||' EUR/'||upper(r.pricing_basis)||
      E'.\nKy është vetëm sinjal krahasimi, jo zgjedhje automatike. Verifiko scope-in, sasinë/bazën e çmimit, delivery, Incoterms, payment terms, certifikatat dhe validitetin; pastaj regjistro supplier/pricing-basis decision me evidencë njerëzore.',
      current_date,'larte','hapur','procurement_comparison_auto','furnitor','PROCUREMENT:'||r.project_id::text||':supplier-comparison'
    )
    on conflict(source,source_ref) do update
      set project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,due_date=current_date,
          priority='larte',status='hapur',done_at=null;
    v_tasks:=v_tasks+1;

    update public.projects
       set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review') then 'supplier_selection' else pipeline_stage end,
           updated_at=now()
     where id=r.project_id;
  end loop;

  if p_apply then
    with closed as (
      update public.tasks t
         set status='mbyllur',done_at=coalesce(done_at,now())
       where t.source='procurement_comparison_auto'
         and t.status='hapur'
         and (
           exists(select 1 from public.project_supplier_decisions d where d.project_id=t.project_id and d.status='active')
           or exists(select 1 from public.projects p where p.id=t.project_id and (p.pipeline_stage not in ('rfq_in','technical_review','supplier_selection','pricing') or coalesce(p.operational_state,'') in ('wait_for_client','execution') or lower(coalesce(p.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled')))
         )
      returning id
    ) select count(*) into v_closed from closed;
  end if;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'comparison_ready_projects',v_candidates,'tasks_opened_or_refreshed',v_tasks,
    'tasks_closed',v_closed,'analyses_refreshed',v_analyses,'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_procurement_comparison_reconcile_v1(boolean,integer) from public,anon,authenticated;
grant execute on function public.pppp_procurement_comparison_reconcile_v1(boolean,integer) to service_role;

do $block$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='procurement-comparison-15m' limit 1;
  if v_job_id is null then
    perform cron.schedule('procurement-comparison-15m','9,24,39,54 * * * *',
      'select public.pppp_procurement_comparison_reconcile_v1(true,100);');
  else
    perform cron.alter_job(v_job_id,schedule:='9,24,39,54 * * * *',
      command:='select public.pppp_procurement_comparison_reconcile_v1(true,100);',active:=true);
  end if;
end;
$block$;
