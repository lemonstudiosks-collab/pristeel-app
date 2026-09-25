
begin;

create or replace view public.pppp_supplier_relationship_health_v1
with (security_invoker=true)
as
with partner_map as (
  select p.id partner_id,p.name canonical_supplier,p.importance,p.stage,
         regexp_replace(lower(p.name),'[^a-z0-9]+','','g') key
  from public.partners p
  union all
  select p.id,p.name,p.importance,p.stage,
         regexp_replace(lower(a),'[^a-z0-9]+','','g')
  from public.partners p
  cross join lateral unnest(coalesce(p.aliases,array[]::text[])) a
), rfq_raw as (
  select r.*,regexp_replace(lower(coalesce(r.supplier_name,'')),'[^a-z0-9]+','','g') raw_key
  from public.rfq_log r
  where r.sent_at is not null
    and coalesce(r.supplier_name,'')<>''
    and lower(coalesce(r.supplier_name,'')) not in ('gmail','hotmail')
), rfq_mapped as (
  select r.*,coalesce(pm.canonical_supplier,r.supplier_name) canonical_supplier,
         pm.partner_id,pm.importance,pm.stage partner_stage
  from rfq_raw r
  left join lateral (
    select m.* from partner_map m
    where r.raw_key=m.key
       or (length(m.key)>=5 and r.raw_key like m.key||'%')
       or (length(r.raw_key)>=5 and m.key like r.raw_key||'%')
    order by case when r.raw_key=m.key then 0 else 1 end,length(m.key) desc
    limit 1
  ) pm on true
), rfq as (
  select canonical_supplier,
         (array_agg(partner_id) filter(where partner_id is not null))[1] partner_id,
         max(importance) importance,max(partner_stage) partner_stage,
         count(*) sent_rfqs,
         count(*) filter(where replied_at is not null or offer_id is not null) answered_rfqs,
         count(distinct project_id) rfq_projects,max(sent_at) last_rfq_sent_at,
         count(*) filter(where sent_at>=now()-interval '90 days') sent_rfqs_90d
  from rfq_mapped group by canonical_supplier
), offers_raw as (
  select o.*,regexp_replace(lower(coalesce(o.supplier,'')),'[^a-z0-9]+','','g') raw_key
  from public.offers o where coalesce(o.supplier,'')<>''
), offer_mapped as (
  select o.*,pm.canonical_supplier
  from offers_raw o
  join lateral (
    select m.* from partner_map m
    where o.raw_key=m.key
       or (length(m.key)>=5 and o.raw_key like m.key||'%')
       or (length(o.raw_key)>=5 and m.key like o.raw_key||'%')
    order by case when o.raw_key=m.key then 0 else 1 end,length(m.key) desc
    limit 1
  ) pm on true
), offers_agg as (
  select canonical_supplier,count(*) supplier_offers,count(distinct project_id) offer_projects,max(created_at) last_offer_at
  from offer_mapped group by canonical_supplier
), decisions_raw as (
  select d.*,regexp_replace(lower(coalesce(d.supplier_name,'')),'[^a-z0-9]+','','g') raw_key
  from public.project_supplier_decisions d
  where d.decision_type='selected_producer' and coalesce(d.supplier_name,'')<>''
), decisions_mapped as (
  select d.*,coalesce(pm.canonical_supplier,d.supplier_name) canonical_supplier
  from decisions_raw d
  left join lateral (
    select m.* from partner_map m
    where d.raw_key=m.key
       or (length(m.key)>=5 and d.raw_key like m.key||'%')
       or (length(d.raw_key)>=5 and m.key like d.raw_key||'%')
    order by case when d.raw_key=m.key then 0 else 1 end,length(m.key) desc
    limit 1
  ) pm on true
), realized as (
  select canonical_supplier,count(*) realized_orders,count(distinct project_id) realized_projects,max(decided_at) last_realization_at
  from decisions_mapped group by canonical_supplier
), names as (
  select canonical_supplier from rfq
  union select canonical_supplier from offers_agg
  union select canonical_supplier from realized
)
select n.canonical_supplier supplier_name,
       r.partner_id,r.importance,r.partner_stage,
       coalesce(r.sent_rfqs,0) sent_rfqs,coalesce(r.sent_rfqs_90d,0) sent_rfqs_90d,
       coalesce(r.answered_rfqs,0) answered_rfqs,coalesce(o.supplier_offers,0) supplier_offers,
       coalesce(z.realized_orders,0) realized_orders,coalesce(r.rfq_projects,0) rfq_projects,
       coalesce(o.offer_projects,0) offer_projects,coalesce(z.realized_projects,0) realized_projects,
       r.last_rfq_sent_at,o.last_offer_at,z.last_realization_at,
       round(100.0*coalesce(r.answered_rfqs,0)/nullif(coalesce(r.sent_rfqs,0),0),1) response_rate_pct,
       round(100.0*coalesce(z.realized_orders,0)/nullif(coalesce(r.sent_rfqs,0),0),1) sent_to_order_rate_pct,
       case
         when coalesce(r.sent_rfqs,0)>0 and r.last_rfq_sent_at<now()-interval '120 days' then 'dormant'
         when coalesce(z.realized_orders,0)>0 and coalesce(r.importance,0)>=4 then 'strategic'
         when coalesce(r.sent_rfqs_90d,0)>=5 and coalesce(z.realized_orders,0)=0 then 'fatigue_risk'
         when coalesce(r.sent_rfqs_90d,0)>=3 and coalesce(z.realized_orders,0)=0 then 'watch'
         else 'healthy' end relationship_state,
       case
         when coalesce(r.sent_rfqs_90d,0)>=5 and coalesce(z.realized_orders,0)=0
           then 'Protect relationship: use only for a qualified firm RFQ, not exploratory pricing.'
         when coalesce(r.sent_rfqs_90d,0)>=3 and coalesce(z.realized_orders,0)=0
           then 'Review project qualification before requesting another detailed quotation.'
         when coalesce(z.realized_orders,0)>0
           then 'Established commercial history; continue sending only scope-fit RFQs.'
         else 'No current fatigue signal from sent RFQs.' end relationship_guidance
from names n
left join rfq r using(canonical_supplier)
left join offers_agg o using(canonical_supplier)
left join realized z using(canonical_supplier);

create or replace function public.pppp_supplier_rfq_gate_v1(
  p_project_id uuid,p_supplier_name text,p_supplier_email text default null,p_rfq_mode text default 'firm'
)
returns jsonb
language plpgsql
stable
set search_path='public','pg_temp'
as $function$
declare
  p public.projects%rowtype;
  v_mode text:=lower(coalesce(nullif(trim(p_rfq_mode),''),'firm'));
  h record;
  v_name text:=trim(coalesce(p_supplier_name,''));
  v_name_key text:=regexp_replace(lower(trim(coalesce(p_supplier_name,''))),'[^a-z0-9]+','','g');
  v_recent record;
  v_allowed boolean:=false;
  v_reason text:='';
  v_warning text:=null;
begin
  if p_project_id is null then
    return jsonb_build_object('allowed',false,'reason','client_signal_or_project_required',
      'message','Supplier discovery may remain read-only, but an external supplier RFQ requires a real PPPP project/client opportunity.',
      'human_send_required',true);
  end if;
  if v_name='' then return jsonb_build_object('allowed',false,'reason','supplier_required','human_send_required',true); end if;
  if v_mode not in ('budgetary','firm','requote') then
    return jsonb_build_object('allowed',false,'reason','invalid_rfq_mode','allowed_modes',jsonb_build_array('budgetary','firm','requote'),'human_send_required',true);
  end if;
  select * into p from public.projects where id=p_project_id;
  if not found then return jsonb_build_object('allowed',false,'reason','project_not_found','human_send_required',true); end if;
  if lower(coalesce(p.operational_state,''))='closed'
     or lower(coalesce(p.status,'')) in ('humbur','arkivuar','mbyllur','closed','lost','realizuar') then
    return jsonb_build_object('allowed',false,'reason','project_not_active','project_stage',p.pipeline_stage,
      'operational_state',p.operational_state,'status',p.status,'human_send_required',true);
  end if;

  select * into h from public.pppp_supplier_relationship_health_v1 x
  where regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')=v_name_key
     or (length(v_name_key)>=5 and regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g') like v_name_key||'%')
     or (length(regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g'))>=5
         and v_name_key like regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')||'%')
  order by case when regexp_replace(lower(x.supplier_name),'[^a-z0-9]+','','g')=v_name_key then 0 else 1 end
  limit 1;

  select r.id,r.sent_at,r.replied_at,r.offer_id,r.rfq_mode into v_recent
  from public.rfq_log r
  where r.project_id=p_project_id and r.sent_at is not null
    and (regexp_replace(lower(coalesce(r.supplier_name,'')),'[^a-z0-9]+','','g')=v_name_key
         or (p_supplier_email is not null and lower(coalesce(r.supplier_email,''))=lower(p_supplier_email)))
  order by r.sent_at desc limit 1;

  if v_recent.id is not null and v_recent.sent_at>=now()-interval '7 days'
     and v_recent.replied_at is null and v_recent.offer_id is null then
    return jsonb_build_object('allowed',false,'reason','recent_supplier_rfq_same_project',
      'last_sent_at',v_recent.sent_at,'relationship_state',coalesce(h.relationship_state,'unknown'),'human_send_required',true);
  end if;

  if v_mode='budgetary' then
    if lower(coalesce(p.pipeline_stage,'')) not in ('rfq_in','technical_review','pricing') then v_reason:='budgetary_not_justified_at_project_stage';
    elsif coalesce(h.relationship_state,'')='fatigue_risk' then v_reason:='supplier_fatigue_blocks_budgetary_request';
    else v_allowed:=true;v_reason:='qualified_budgetary_check';end if;
  elsif v_mode='firm' then
    if lower(coalesce(p.pipeline_stage,'')) not in ('rfq_in','technical_review','pricing') then v_reason:='firm_rfq_requires_active_pre_offer_stage';
    else
      v_allowed:=true;v_reason:='qualified_firm_supplier_rfq';
      if coalesce(h.relationship_state,'')='fatigue_risk' then v_warning:='supplier_fatigue_risk_use_only_if_scope_is_real_and_complete';
      elsif coalesce(h.relationship_state,'')='watch' then v_warning:='supplier_relationship_watch';end if;
    end if;
  else
    if lower(coalesce(p.pipeline_stage,'')) not in ('pricing','client_offer','commercial') then v_reason:='requote_requires_pricing_or_client_offer_stage';
    else
      v_allowed:=true;v_reason:='qualified_requote';
      if coalesce(h.relationship_state,'') in ('fatigue_risk','watch') then v_warning:='supplier_relationship_requires_careful_feedback';end if;
    end if;
  end if;
  return jsonb_build_object('allowed',v_allowed,'reason',v_reason,'warning',v_warning,'rfq_mode',v_mode,
    'project_id',p.id,'project_name',p.name,'project_stage',p.pipeline_stage,'operational_state',p.operational_state,
    'supplier_name',v_name,'relationship_state',coalesce(h.relationship_state,'new_or_unmeasured'),
    'sent_rfqs',coalesce(h.sent_rfqs,0),'sent_rfqs_90d',coalesce(h.sent_rfqs_90d,0),
    'answered_rfqs',coalesce(h.answered_rfqs,0),'realized_orders',coalesce(h.realized_orders,0),
    'relationship_guidance',coalesce(h.relationship_guidance,'No measured sent-RFQ history.'),
    'human_send_required',true,'external_email_sent',false);
end;
$function$;

create or replace view public.pppp_sales_engine_v3_pilot_queue_v1
with (security_invoker=true)
as
select *
from public.pppp_sales_engine_v3_workbench_v1 w
where outreach_engine_version='v2'
  and workflow_state='ready_for_outreach'
  and contact_quality_score>=50
  and message_evidence_score>=60
  and jsonb_array_length(coalesce(personalization_facts,'[]'::jsonb))>=2
  and last_contact_at is null
  and (
    source_type<>'opportunity_action'
    or exists (
      select 1
      from public.pppp_opportunity_actions a
      join public.kek_tender_watch k on k.id=a.tender_watch_id
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(k.payload#>'{winner,contact_enrichment,organizations}')='array'
             then k.payload#>'{winner,contact_enrichment,organizations}' else '[]'::jsonb end
      ) org(value)
      where a.id=w.source_id
        and regexp_replace(lower(coalesce(org.value->>'name','')),'[^a-z0-9]+','','g')
            =regexp_replace(lower(coalesce(a.target_company,'')),'[^a-z0-9]+','','g')
        and lower(split_part(a.target_email,'@',2))
            =lower(coalesce(nullif(org.value->>'domain',''),
              regexp_replace(org.value->>'official_website','^https?://(www\\.)?|/.*$','','g')))
    )
  )
order by outreach_readiness_score desc,company_fit_score desc,contact_quality_score desc
limit 25;

commit;
