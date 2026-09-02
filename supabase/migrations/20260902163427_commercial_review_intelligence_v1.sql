create or replace view public.pppp_supplier_offer_review_intelligence_v1
with (security_invoker=true)
as
with base as (
  select
    c.id as candidate_id,
    c.project_id,
    p.name as project_name,
    p.status as project_status,
    p.pipeline_stage,
    p.operational_state,
    c.supplier_name,
    c.supplier_email,
    c.confidence,
    c.gmail_message_id,
    c.matched_rfq_id,
    c.created_at,
    coalesce((select max(pe.sent_at) from public.project_emails pe where pe.gmail_message_id=c.gmail_message_id),c.created_at) as source_at,
    nullif(upper(trim(c.extracted->>'currency')),'') as currency,
    case when coalesce(c.extracted->>'price_kg','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'price_kg')::numeric end as price_kg,
    case when coalesce(c.extracted->>'unit_price','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'unit_price')::numeric end as unit_price,
    coalesce(
      case when coalesce(c.extracted->>'total_amount','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'total_amount')::numeric end,
      case when coalesce(c.extracted->>'total_eur','') ~ '^[0-9]+([.][0-9]+)?$' and upper(coalesce(c.extracted->>'currency','EUR'))='EUR' then (c.extracted->>'total_eur')::numeric end
    ) as total_amount,
    case when coalesce(c.extracted->>'qty_kg','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'qty_kg')::numeric end as qty_kg,
    case when coalesce(c.extracted->>'exchange_rate_to_eur','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'exchange_rate_to_eur')::numeric end as exchange_rate_to_eur,
    nullif(lower(trim(c.extracted->>'pricing_unit')),'') as extracted_pricing_unit,
    nullif(trim(c.extracted->>'incoterms'),'') as incoterms,
    nullif(trim(c.extracted->>'payment_terms'),'') as payment_terms,
    case when coalesce(c.extracted->>'validity_days','') ~ '^[0-9]+$' then (c.extracted->>'validity_days')::integer end as validity_days,
    case when coalesce(c.extracted->>'delivery_weeks','') ~ '^[0-9]+([.][0-9]+)?$' then (c.extracted->>'delivery_weeks')::numeric end as delivery_weeks,
    nullif(trim(c.extracted->>'cert'),'') as cert,
    nullif(trim(c.extracted->>'offer_ref'),'') as offer_ref,
    case when jsonb_typeof(c.extracted->'source_attachment_names')='array' then c.extracted->'source_attachment_names' else '[]'::jsonb end as attachments
  from public.supplier_offer_candidates c
  join public.projects p on p.id=c.project_id
  where c.status='review'
), ranked as (
  select b.*,
    count(*) over(partition by b.project_id,lower(coalesce(nullif(b.supplier_email,''),nullif(b.supplier_name,''),'?'))) as same_supplier_review_count,
    row_number() over(
      partition by b.project_id,lower(coalesce(nullif(b.supplier_email,''),nullif(b.supplier_name,''),'?'))
      order by b.source_at desc,b.created_at desc,b.candidate_id desc
    ) as revision_rank
  from base b
), calc as (
  select r.*,
    case when coalesce(r.price_kg,0)>0 then 'kg'
         when coalesce(r.unit_price,0)>0 then coalesce(r.extracted_pricing_unit,'unit')
         when coalesce(r.total_amount,0)>0 then 'total'
         else coalesce(r.extracted_pricing_unit,'unknown') end as pricing_basis,
    case when coalesce(r.price_kg,0)>0 and coalesce(r.total_amount,0)>0 then r.total_amount/r.price_kg end as implied_qty_kg,
    case when coalesce(r.price_kg,0)>0 and coalesce(r.total_amount,0)>0 and coalesce(r.qty_kg,0)>0
      then abs(r.qty_kg-(r.total_amount/r.price_kg))/greatest(r.qty_kg,r.total_amount/r.price_kg)
    end as qty_relative_mismatch,
    (r.currency is null) as missing_currency,
    (coalesce(r.price_kg,0)<=0 and coalesce(r.unit_price,0)<=0 and coalesce(r.total_amount,0)<=0) as missing_commercial_value,
    (upper(coalesce(r.currency,'')) not in ('','EUR') and coalesce(r.exchange_rate_to_eur,0)<=0) as non_eur_missing_fx,
    (r.same_supplier_review_count>1) as possible_revision,
    (r.revision_rank=1) as latest_revision,
    (
      jsonb_array_length(r.attachments)=0
      or not exists(
        select 1 from jsonb_array_elements_text(r.attachments) a(v)
        where lower(a.v) ~ '(quot|offer|ponud|price|commercial|proposal|quotation)'
      )
    ) as attachment_quote_evidence_missing
  from ranked r
)
select
  c.*,
  (coalesce(c.qty_relative_mismatch,0)>0.20) as quantity_total_mismatch,
  (c.delivery_weeks is null) as missing_delivery,
  (c.incoterms is null) as missing_incoterms,
  (c.payment_terms is null) as missing_payment_terms,
  (c.validity_days is null) as missing_validity,
  (c.cert is null) as missing_cert,
  case
    when c.missing_currency or c.missing_commercial_value or coalesce(c.qty_relative_mismatch,0)>0.20 then 'blocked'
    else 'review'
  end as approval_readiness,
  case
    when c.missing_currency or c.missing_commercial_value or coalesce(c.qty_relative_mismatch,0)>0.20 or c.non_eur_missing_fx then 'blocked'
    else 'review'
  end as comparison_readiness,
  (
    lower(coalesce(c.project_status,'')) not in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled')
    and coalesce(c.operational_state,'') not in ('wait_for_client','execution')
  ) as eligible_for_review_task,
  concat_ws(' | ',
    case when c.missing_currency then 'BLOCKER: currency missing' end,
    case when c.missing_commercial_value then 'BLOCKER: commercial price/total not extracted' end,
    case when coalesce(c.qty_relative_mismatch,0)>0.20 then
      'BLOCKER: extracted qty '||round(c.qty_kg,3)::text||' kg conflicts with total/price implied '||round(c.implied_qty_kg,3)::text||' kg ('||round(c.qty_relative_mismatch*100,1)::text||'% mismatch); verify quantity/unit and whether total includes fabrication/erection'
    end,
    case when c.non_eur_missing_fx then 'Comparison: non-EUR offer has no reviewed FX rate' end,
    case when c.possible_revision then
      case when c.latest_revision then 'Revision: latest of '||c.same_supplier_review_count::text||' review candidates from this supplier; verify whether it replaces earlier terms'
           else 'Revision: earlier of '||c.same_supplier_review_count::text||' review candidates from this supplier; do not assume it is still current' end
    end,
    case when c.attachment_quote_evidence_missing then 'Evidence: no quotation-like attachment detected; verify original email/source before approval' end,
    case when c.delivery_weeks is null then 'Missing: delivery' end,
    case when c.incoterms is null then 'Missing: Incoterms' end,
    case when c.payment_terms is null then 'Missing: payment terms' end,
    case when c.validity_days is null then 'Missing: validity' end,
    case when c.cert is null then 'Missing: certificate/quality term' end
  ) as warning_text
from calc c;

revoke all on public.pppp_supplier_offer_review_intelligence_v1 from public, anon, authenticated;
grant select on public.pppp_supplier_offer_review_intelligence_v1 to service_role;

create or replace function public.pppp_commercial_review_intelligence_reconcile_v1(
  p_apply boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  r record;
  v_limit integer:=least(500,greatest(1,coalesce(p_limit,100)));
  v_detail text;
  v_candidates integer;
  v_blockers integer;
  v_tasks integer:=0;
  v_closed integer:=0;
  v_projects integer:=0;
begin
  for r in
    select i.project_id,min(i.project_name) as project_name
    from public.pppp_supplier_offer_review_intelligence_v1 i
    where i.eligible_for_review_task
    group by i.project_id
    order by min(i.project_name)
    limit v_limit
  loop
    v_projects:=v_projects+1;

    select
      count(*)::int,
      count(*) filter(where i.approval_readiness='blocked')::int,
      'PPPP Commercial Review Intelligence — verifiko burimin origjinal para aprovimit.'||E'\n'||
      'Kandidatë në review: '||count(*)::text||' · blocker-a: '||count(*) filter(where i.approval_readiness='blocked')::text||E'\n\n'||
      string_agg(
        '• '||coalesce(nullif(i.supplier_name,''),nullif(i.supplier_email,''),'Furnitor i panjohur')||' · '||
        case
          when i.price_kg is not null then coalesce(i.currency,'?')||' '||round(i.price_kg,4)::text||'/kg'
          when i.unit_price is not null then coalesce(i.currency,'?')||' '||round(i.unit_price,4)::text||'/'||upper(coalesce(i.pricing_basis,'unit'))
          when i.total_amount is not null then coalesce(i.currency,'?')||' total '||round(i.total_amount,2)::text
          else 'çmimi nuk u nxor'
        end||
        coalesce(' · '||i.incoterms,'')||
        coalesce(' · delivery '||i.delivery_weeks::text||' javë','')||
        coalesce(' · valid '||i.validity_days::text||' ditë','')||
        case when coalesce(i.warning_text,'')<>'' then E'\n  '||i.warning_text else '' end,
        E'\n\n' order by i.source_at desc,i.candidate_id
      )||E'\n\nHuman gate: korrigjo/konfirmo të dhënat komerciale dhe aprovo kandidatin vetëm pasi evidenca të jetë e qartë. PPPP nuk zgjedh furnitorin dhe nuk vendos çmimin final automatikisht.'
    into v_candidates,v_blockers,v_detail
    from public.pppp_supplier_offer_review_intelligence_v1 i
    where i.project_id=r.project_id and i.eligible_for_review_task;

    if p_apply then
      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
      values(
        r.project_id,
        case when v_blockers>0 then 'Verifiko ofertën e furnitorit · BLOCKER · ' else 'Verifiko ofertën e furnitorit · ' end||left(r.project_name,150),
        v_detail,
        current_date,
        'larte',
        'hapur',
        'commercial_intake_review',
        'furnitor',
        'commercial-intake:'||r.project_id::text||':offer'
      )
      on conflict(source,source_ref) do update
        set project_id=excluded.project_id,
            title=excluded.title,
            detail=excluded.detail,
            due_date=current_date,
            priority=excluded.priority,
            status='hapur',
            done_at=null;
      v_tasks:=v_tasks+1;
    end if;
  end loop;

  if p_apply then
    with closed as (
      update public.tasks t
      set status='mbyllur',done_at=coalesce(t.done_at,now())
      where t.source='commercial_intake_review'
        and t.status='hapur'
        and not exists(
          select 1
          from public.pppp_supplier_offer_review_intelligence_v1 i
          where i.project_id=t.project_id and i.eligible_for_review_task
        )
      returning t.id
    ) select count(*)::int into v_closed from closed;
  end if;

  return jsonb_build_object(
    'mode',case when p_apply then 'apply' else 'preview' end,
    'projects_with_actionable_review',v_projects,
    'tasks_opened_or_refreshed',v_tasks,
    'tasks_closed',v_closed,
    'generated_at',now()
  );
end;
$function$;

revoke all on function public.pppp_commercial_review_intelligence_reconcile_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_commercial_review_intelligence_reconcile_v1(boolean,integer) to service_role;

do $block$
declare v_job bigint;
begin
  for v_job in select jobid from cron.job where jobname='commercial-review-intelligence-10m' loop
    perform cron.unschedule(v_job);
  end loop;
  perform cron.schedule(
    'commercial-review-intelligence-10m',
    '7,17,27,37,47,57 * * * *',
    'select public.pppp_commercial_review_intelligence_reconcile_v1(true,100);'
  );
end
$block$;

select public.pppp_commercial_review_intelligence_reconcile_v1(true,100);
