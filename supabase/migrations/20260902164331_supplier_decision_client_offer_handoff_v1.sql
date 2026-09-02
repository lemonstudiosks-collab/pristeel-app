create or replace view public.pppp_selected_supplier_cost_basis_v1
with (security_invoker=true)
as
with ranked_decisions as (
  select
    d.*,
    row_number() over(
      partition by d.project_id
      order by case d.decision_type when 'selected_producer' then 1 else 2 end,d.decided_at desc,d.id desc
    ) as rn
  from public.project_supplier_decisions d
  where d.status='active'
), base as (
  select
    d.id as decision_id,
    d.project_id,
    p.name as project_name,
    p.client,
    p.status as project_status,
    p.pipeline_stage,
    p.operational_state,
    d.decision_type,
    d.supplier_name as selected_supplier,
    d.supplier_offer_id,
    d.source as decision_source,
    d.evidence as decision_evidence,
    d.notes as decision_notes,
    d.decided_at,
    o.currency,
    lower(coalesce(nullif(trim(o.pricing_unit),''),case when coalesce(o.price_kg,0)>0 then 'kg' when coalesce(o.unit_price,0)>0 then 'unit' else 'total' end)) as pricing_basis,
    o.price_kg,
    o.unit_price,
    o.total_amount,
    o.total_eur,
    o.qty_kg,
    o.exchange_rate_to_eur,
    o.transport_eur,
    o.zinc_kg,
    o.delivery_weeks,
    o.incoterms,
    o.payment_terms,
    o.validity_days,
    o.cert,
    o.offer_ref,
    o.inclusions,
    o.exclusions,
    o.created_at as supplier_offer_created_at
  from ranked_decisions d
  join public.projects p on p.id=d.project_id
  left join public.offers o on o.id=d.supplier_offer_id
  where d.rn=1
), calc as (
  select b.*,
    case when upper(coalesce(nullif(trim(b.currency),''),'EUR'))='EUR' then 1::numeric else b.exchange_rate_to_eur end as rate_to_eur,
    case when coalesce(b.price_kg,0)>0 then b.price_kg when coalesce(b.unit_price,0)>0 then b.unit_price end as unit_cost_original,
    case
      when coalesce(b.total_eur,0)>0 then b.total_eur
      when upper(coalesce(nullif(trim(b.currency),''),'EUR'))='EUR' and coalesce(b.total_amount,0)>0 then b.total_amount
      when coalesce(b.total_amount,0)>0 and coalesce(b.exchange_rate_to_eur,0)>0 then b.total_amount*b.exchange_rate_to_eur
    end as explicit_total_eur
  from base b
)
select
  c.*,
  case when c.unit_cost_original is not null and c.rate_to_eur is not null then c.unit_cost_original*c.rate_to_eur end as unit_cost_eur,
  (c.supplier_offer_id is null) as missing_linked_offer,
  (c.supplier_offer_id is not null and nullif(trim(coalesce(c.currency,'')),'') is null) as missing_currency,
  (c.supplier_offer_id is not null and coalesce(c.price_kg,0)<=0 and coalesce(c.unit_price,0)<=0 and coalesce(c.total_amount,0)<=0 and coalesce(c.total_eur,0)<=0) as missing_commercial_value,
  (c.supplier_offer_id is not null and upper(coalesce(nullif(trim(c.currency),''),'EUR'))<>'EUR' and coalesce(c.exchange_rate_to_eur,0)<=0) as non_eur_missing_fx,
  (c.pricing_basis='kg' and coalesce(c.qty_kg,0)<=0) as missing_qty_for_kg_basis,
  case
    when c.supplier_offer_id is null
      or (c.supplier_offer_id is not null and nullif(trim(coalesce(c.currency,'')),'') is null)
      or (c.supplier_offer_id is not null and coalesce(c.price_kg,0)<=0 and coalesce(c.unit_price,0)<=0 and coalesce(c.total_amount,0)<=0 and coalesce(c.total_eur,0)<=0)
      or (c.supplier_offer_id is not null and upper(coalesce(nullif(trim(c.currency),''),'EUR'))<>'EUR' and coalesce(c.exchange_rate_to_eur,0)<=0)
    then 'blocked'
    else 'review'
  end as cost_basis_readiness,
  (
    lower(coalesce(c.project_status,'')) not in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled')
    and coalesce(c.operational_state,'') not in ('wait_for_client','execution')
    and c.pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing')
  ) as eligible_for_client_offer_handoff,
  concat_ws(' | ',
    case when c.supplier_offer_id is null then 'BLOCKER: human supplier decision is not linked to a canonical supplier offer' end,
    case when c.supplier_offer_id is not null and nullif(trim(coalesce(c.currency,'')),'') is null then 'BLOCKER: selected offer currency missing' end,
    case when c.supplier_offer_id is not null and coalesce(c.price_kg,0)<=0 and coalesce(c.unit_price,0)<=0 and coalesce(c.total_amount,0)<=0 and coalesce(c.total_eur,0)<=0 then 'BLOCKER: selected offer has no reviewed commercial value' end,
    case when c.supplier_offer_id is not null and upper(coalesce(nullif(trim(c.currency),''),'EUR'))<>'EUR' and coalesce(c.exchange_rate_to_eur,0)<=0 then 'BLOCKER: non-EUR selected offer has no reviewed FX rate' end,
    case when c.pricing_basis='kg' and coalesce(c.qty_kg,0)<=0 then 'Cost basis: quantity is missing for kg pricing; verify BOQ/project quantity before total-price preparation' end,
    case when c.delivery_weeks is null then 'Missing supplier term: delivery' end,
    case when nullif(trim(coalesce(c.incoterms,'')),'') is null then 'Missing supplier term: Incoterms' end,
    case when nullif(trim(coalesce(c.payment_terms,'')),'') is null then 'Missing supplier term: payment terms' end,
    case when c.validity_days is null then 'Missing supplier term: validity' end,
    case when nullif(trim(coalesce(c.cert,'')),'') is null then 'Missing supplier term: certificate/quality' end
  ) as warning_text
from calc c;

revoke all on public.pppp_selected_supplier_cost_basis_v1 from public,anon,authenticated;
grant select on public.pppp_selected_supplier_cost_basis_v1 to service_role;

create or replace function public.pppp_selected_supplier_handoff_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 100,
  p_project_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path to 'pg_catalog','public'
as $function$
declare
  r record;
  v_limit integer:=least(500,greatest(1,coalesce(p_limit,100)));
  v_analysis jsonb;
  v_analysis_id bigint;
  v_projects integer:=0;
  v_tasks integer:=0;
  v_closed integer:=0;
  v_analyses integer:=0;
begin
  for r in
    select *
    from public.pppp_selected_supplier_cost_basis_v1 c
    where p_project_id is null or c.project_id=p_project_id
    order by c.decided_at desc,c.project_name
    limit v_limit
  loop
    v_projects:=v_projects+1;

    v_analysis:=jsonb_build_object(
      'human_gate_required',true,
      'project_id',r.project_id,
      'project_name',r.project_name,
      'client',r.client,
      'decision',jsonb_build_object(
        'decision_id',r.decision_id,
        'decision_type',r.decision_type,
        'supplier',r.selected_supplier,
        'supplier_offer_id',r.supplier_offer_id,
        'source',r.decision_source,
        'decided_at',r.decided_at,
        'evidence',r.decision_evidence
      ),
      'supplier_cost_basis',jsonb_build_object(
        'currency',r.currency,
        'pricing_basis',r.pricing_basis,
        'price_kg',r.price_kg,
        'unit_price',r.unit_price,
        'unit_cost_eur',r.unit_cost_eur,
        'qty_kg',r.qty_kg,
        'total_amount',r.total_amount,
        'explicit_total_eur',r.explicit_total_eur,
        'exchange_rate_to_eur',r.exchange_rate_to_eur,
        'transport_eur',r.transport_eur,
        'zinc_kg',r.zinc_kg,
        'delivery_weeks',r.delivery_weeks,
        'incoterms',r.incoterms,
        'payment_terms',r.payment_terms,
        'validity_days',r.validity_days,
        'cert',r.cert,
        'offer_ref',r.offer_ref,
        'inclusions',r.inclusions,
        'exclusions',r.exclusions
      ),
      'cost_basis_readiness',r.cost_basis_readiness,
      'warnings',r.warning_text,
      'client_price_policy','Human must set markup/margin, final client price, client commercial terms and inclusions/exclusions. PPPP does not calculate or approve final client price automatically.'
    );

    if p_apply then
      select pa.id into v_analysis_id
      from public.project_analyses pa
      where pa.project_id=r.project_id::text and pa.model='selected-supplier-cost-basis-v1'
      order by pa.created_at desc limit 1;

      if v_analysis_id is null then
        insert into public.project_analyses(project_id,status,engine,model,analysis,source_manifest,source_counts,created_at)
        values(
          r.project_id::text,'complete','commercial_rules','selected-supplier-cost-basis-v1',v_analysis,
          jsonb_build_object('decision_id',r.decision_id,'supplier_offer_id',r.supplier_offer_id),
          jsonb_build_object('selected_supplier_decisions',1,'selected_offers',case when r.supplier_offer_id is null then 0 else 1 end),
          now()
        );
      else
        update public.project_analyses
        set status='complete',engine='commercial_rules',analysis=v_analysis,
            source_manifest=jsonb_build_object('decision_id',r.decision_id,'supplier_offer_id',r.supplier_offer_id),
            source_counts=jsonb_build_object('selected_supplier_decisions',1,'selected_offers',case when r.supplier_offer_id is null then 0 else 1 end),
            created_at=now()
        where id=v_analysis_id;
      end if;
      v_analyses:=v_analyses+1;

      update public.tasks
      set status='mbyllur',done_at=coalesce(done_at,now())
      where project_id=r.project_id and source='procurement_comparison_auto' and status='hapur';

      if r.eligible_for_client_offer_handoff then
        insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
        values(
          r.project_id,
          case when r.cost_basis_readiness='blocked' then 'Përgatit ofertën për klientin · BLOCKER · ' else 'Përgatit ofertën për klientin · ' end||left(r.project_name,145),
          'Supplier i zgjedhur nga njeriu: '||coalesce(r.selected_supplier,'—')||E'\n'||
          'Baza kanonike e kostos: '||
          case
            when r.price_kg is not null then coalesce(r.currency,'?')||' '||round(r.price_kg,4)::text||'/kg'||coalesce(' · EUR '||round(r.unit_cost_eur,4)::text||'/kg',case when upper(coalesce(r.currency,''))='EUR' then '' end)
            when r.unit_price is not null then coalesce(r.currency,'?')||' '||round(r.unit_price,4)::text||'/'||upper(coalesce(r.pricing_basis,'unit'))||coalesce(' · EUR '||round(r.unit_cost_eur,4)::text||'/'||upper(coalesce(r.pricing_basis,'unit')),case when upper(coalesce(r.currency,''))='EUR' then '' end)
            when r.explicit_total_eur is not null then 'EUR total '||round(r.explicit_total_eur,2)::text
            else '—'
          end||
          coalesce(E'\nSasia: '||round(r.qty_kg,3)::text||' kg','')||
          coalesce(E'\nSupplier total explicit EUR: '||round(r.explicit_total_eur,2)::text,'')||
          coalesce(E'\nDelivery: '||r.delivery_weeks::text||' javë','')||
          coalesce(E'\nIncoterms: '||r.incoterms,'')||
          coalesce(E'\nPayment: '||r.payment_terms,'')||
          coalesce(E'\nValidity: '||r.validity_days::text||' ditë','')||
          coalesce(E'\nCertificate: '||r.cert,'')||
          case when coalesce(r.warning_text,'')<>'' then E'\n\nKontrolle para ofertës:\n'||r.warning_text else '' end||
          E'\n\nHuman gate: vendos markup/margin, çmimin final për klientin, kushtet komerciale të klientit dhe inclusions/exclusions. PPPP nuk vendos final price dhe nuk dërgon ofertë automatikisht.',
          current_date,'larte','hapur','client_offer_cost_basis_auto','ofertim','COMMERCIAL:'||r.project_id::text||':client-offer-cost-basis'
        )
        on conflict(source,source_ref) do update
          set project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,due_date=current_date,
              priority='larte',status='hapur',done_at=null;
        v_tasks:=v_tasks+1;

        update public.projects
        set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing' else pipeline_stage end,
            updated_at=now()
        where id=r.project_id;
      end if;
    end if;
  end loop;

  if p_apply then
    with closed as (
      update public.tasks t
      set status='mbyllur',done_at=coalesce(done_at,now())
      where t.source='client_offer_cost_basis_auto'
        and t.status='hapur'
        and (p_project_id is null or t.project_id=p_project_id)
        and not exists(
          select 1 from public.pppp_selected_supplier_cost_basis_v1 c
          where c.project_id=t.project_id and c.eligible_for_client_offer_handoff
        )
      returning id
    ) select count(*)::int into v_closed from closed;
  end if;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'selected_supplier_projects_seen',v_projects,
    'analyses_refreshed',v_analyses,
    'client_offer_tasks_opened_or_refreshed',v_tasks,
    'client_offer_tasks_closed',v_closed,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_selected_supplier_handoff_reconcile_v1(boolean,integer,uuid) from public,anon,authenticated;
grant execute on function public.pppp_selected_supplier_handoff_reconcile_v1(boolean,integer,uuid) to service_role;

create or replace function public.pppp_record_supplier_decision_v1(
  p_project_id uuid,
  p_supplier_offer_id uuid,
  p_decision_type text default 'selected_producer',
  p_notes text default null,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_offer public.offers%rowtype;
  v_project public.projects%rowtype;
  v_decision public.project_supplier_decisions%rowtype;
  v_type text:=lower(trim(coalesce(p_decision_type,'selected_producer')));
  v_handoff jsonb;
begin
  if auth.uid() is null or not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;
  if v_type not in ('selected_producer','pricing_basis') then
    raise exception 'Unsupported supplier decision type';
  end if;

  select * into v_project from public.projects where id=p_project_id;
  if not found then raise exception 'Project not found'; end if;
  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception 'Supplier decision cannot be recorded on a terminal project';
  end if;

  select * into v_offer from public.offers where id=p_supplier_offer_id and project_id=p_project_id;
  if not found then raise exception 'Supplier offer does not belong to this project'; end if;

  insert into public.project_supplier_decisions(
    project_id,supplier_offer_id,supplier_name,decision_type,status,source,evidence,notes,decided_at,updated_at
  ) values (
    p_project_id,p_supplier_offer_id,coalesce(nullif(trim(v_offer.supplier),''),'Unknown supplier'),v_type,'active',
    'authenticated_human_decision',
    coalesce(p_evidence,'{}'::jsonb)||jsonb_build_object(
      'human_confirmed',true,
      'actor_user_id',auth.uid(),
      'recorded_at',now(),
      'supplier_offer_id',p_supplier_offer_id
    ),
    nullif(trim(coalesce(p_notes,'')),''),now(),now()
  )
  on conflict(project_id,decision_type) do update
    set supplier_offer_id=excluded.supplier_offer_id,
        supplier_name=excluded.supplier_name,
        status='active',
        source=excluded.source,
        evidence=excluded.evidence,
        notes=excluded.notes,
        decided_at=now(),
        updated_at=now()
  returning * into v_decision;

  update public.tasks
  set status='mbyllur',done_at=coalesce(done_at,now())
  where project_id=p_project_id and source='procurement_comparison_auto' and status='hapur';

  if v_project.pipeline_stage in ('rfq_in','technical_review','supplier_selection') then
    update public.projects set pipeline_stage='pricing',updated_at=now() where id=p_project_id;
  end if;

  v_handoff:=public.pppp_selected_supplier_handoff_reconcile_v1(true,100,p_project_id);

  return jsonb_build_object(
    'ok',true,
    'decision_id',v_decision.id,
    'project_id',p_project_id,
    'supplier_offer_id',p_supplier_offer_id,
    'supplier_name',v_decision.supplier_name,
    'decision_type',v_decision.decision_type,
    'handoff',v_handoff,
    'human_gate_preserved',true
  );
end;
$function$;

revoke all on function public.pppp_record_supplier_decision_v1(uuid,uuid,text,text,jsonb) from public,anon;
grant execute on function public.pppp_record_supplier_decision_v1(uuid,uuid,text,text,jsonb) to authenticated,service_role;

do $block$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='selected-supplier-handoff-15m' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'selected-supplier-handoff-15m',
    '11,26,41,56 * * * *',
    'select public.pppp_selected_supplier_handoff_reconcile_v1(true,100,null);'
  );
end
$block$;

select public.pppp_selected_supplier_handoff_reconcile_v1(true,100,null);
