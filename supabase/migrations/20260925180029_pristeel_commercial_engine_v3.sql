
begin;

alter table public.pppp_dach_steel_targets_v1
  add column if not exists pristeel_offer_model text,
  add column if not exists secondary_pristeel_offer_model text;
alter table public.pppp_opportunity_actions
  add column if not exists pristeel_offer_model text,
  add column if not exists secondary_pristeel_offer_model text;
alter table public.pppp_outbound_queue_v1
  add column if not exists pristeel_offer_model text;
alter table public.pppp_opportunity_outreach_registry_v1
  add column if not exists pristeel_offer_model text;

alter table public.pppp_gc_prospects_v1
  add column if not exists contact_tier text,
  add column if not exists contact_quality_score integer,
  add column if not exists company_fit_score integer,
  add column if not exists commercial_timing_score integer,
  add column if not exists message_evidence_score integer,
  add column if not exists outreach_readiness_score integer,
  add column if not exists outreach_motion text,
  add column if not exists pristeel_offer_model text,
  add column if not exists secondary_pristeel_offer_model text,
  add column if not exists timing_classification text,
  add column if not exists workflow_state text,
  add column if not exists personalization_facts jsonb not null default '[]'::jsonb,
  add column if not exists readiness_reasons jsonb not null default '[]'::jsonb,
  add column if not exists outreach_engine_version text not null default 'legacy',
  add column if not exists reply_classification text,
  add column if not exists reply_evidence jsonb not null default '{}'::jsonb;

alter table public.rfq_log
  add column if not exists rfq_mode text,
  add column if not exists supplier_relationship_state text,
  add column if not exists supplier_gate_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists human_send_required boolean not null default true;

create index if not exists rfq_log_project_supplier_sent_idx
  on public.rfq_log (project_id, lower(supplier_name), sent_at desc)
  where project_id is not null and sent_at is not null;
create index if not exists pppp_gc_prospects_v2_readiness_idx
  on public.pppp_gc_prospects_v1 (outreach_engine_version, workflow_state, outreach_readiness_score desc);

create or replace function public.pppp_pristeel_offer_model_v1(
  p_channel text,
  p_company_type text default null,
  p_outreach_motion text default null,
  p_timing_classification text default null,
  p_route text default null
)
returns text
language sql
immutable
set search_path=''
as $function$
  select case
    when lower(coalesce(p_outreach_motion,''))='future_supplier_qualification'
      or lower(coalesce(p_timing_classification,''))='future_supplier_qualification'
      then 'future_supplier_qualification'
    when lower(coalesce(p_channel,'')) in ('material_trade','dach_steel_buyer','material_buyer')
      then 'material_supply'
    when upper(coalesce(p_route,''))='TED_PRODUCER'
      or lower(coalesce(p_company_type,'')) ~ '(steel.?fabricator|stahlbauer|producer|manufacturer|fabricator)'
      then 'external_production_capacity'
    when lower(coalesce(p_channel,'')) in ('gc','gc_gu','ted_awarded','awarded_project_gc')
      or upper(coalesce(p_route,'')) in ('TED_GC','TED_CONSORTIUM','TED_GENERAL')
      then 'fabricated_steel_package'
    else 'fabricated_steel_package'
  end;
$function$;
revoke all on function public.pppp_pristeel_offer_model_v1(text,text,text,text,text) from public;
grant execute on function public.pppp_pristeel_offer_model_v1(text,text,text,text,text) to authenticated, service_role;

create or replace view public.pppp_pristeel_offer_models_v1
with (security_invoker=true)
as
select *
from (values
  ('material_supply'::text,'Steel Material Supply'::text,
   'Supply of project- or consumption-specific steel material with required certification, optional processing and coordinated DAP logistics.'::text,
   'Steel buyers, fabricators, OEMs and industrial manufacturers with recurring or project-specific material demand.'::text,
   'Is this material category handled by you, and would one benchmark position be useful?'::text),
  ('fabricated_steel_package'::text,'Fabricated Steel Package'::text,
   'A clearly defined steel package coordinated by PRISTEEL: material procurement, build-to-print fabrication, surface treatment, QA/fabrication documentation, packing and DAP delivery as required.'::text,
   'General contractors, industrial contractors and project owners with a defined steel scope.'::text,
   'Is this steel package already fully awarded, or is a clearly defined external package still open?'::text),
  ('external_production_capacity'::text,'External Production Capacity'::text,
   'Additional managed fabrication capacity for steel fabricators and manufacturers during peak load, constrained lead times or outsourced packages.'::text,
   'Steel fabricators and manufacturers that may outsource selected packages or overflow capacity.'::text,
   'Do you currently outsource selected fabrication packages when internal capacity is constrained?'::text),
  ('future_supplier_qualification'::text,'Future Supplier Qualification'::text,
   'Qualification of PRISTEEL as a future material, fabricated-package or managed-capacity source when the current package is already covered.'::text,
   'Companies with relevant recurring demand where current procurement is already closed or too late.'::text,
   'Who handles supplier qualification for future steel packages?'::text)
) v(model_key,model_name,value_proposition,ideal_customer,default_low_friction_cta);
revoke all on public.pppp_pristeel_offer_models_v1 from public, anon;
grant select on public.pppp_pristeel_offer_models_v1 to authenticated, service_role;

update public.pppp_dach_steel_targets_v1
set pristeel_offer_model =
      public.pppp_pristeel_offer_model_v1('material_trade',buyer_type,outreach_motion,timing_classification,null),
    secondary_pristeel_offer_model = case
      when lower(coalesce(buyer_type,'')) ~ '(fabricat|stahlbau|manufacturer|producer)'
        then 'external_production_capacity'
      else secondary_pristeel_offer_model end
where pristeel_offer_model is null
   or (secondary_pristeel_offer_model is null and lower(coalesce(buyer_type,'')) ~ '(fabricat|stahlbau|manufacturer|producer)');

update public.pppp_opportunity_actions
set pristeel_offer_model =
      public.pppp_pristeel_offer_model_v1('ted_awarded',action_type,outreach_motion,timing_classification,route),
    secondary_pristeel_offer_model = case
      when upper(coalesce(route,''))='TED_PRODUCER' then 'material_supply'
      else secondary_pristeel_offer_model end
where pristeel_offer_model is null
   or (secondary_pristeel_offer_model is null and upper(coalesce(route,''))='TED_PRODUCER');

with base as (
  select g.id,
         public.pppp_outreach_contact_tier_v2(g.contact_email,g.contact_name,g.contact_role) tier,
         public.pppp_outreach_contact_score_v2(g.contact_email,g.contact_name,g.contact_role) contact_score,
         greatest(0,least(100,coalesce(g.relevance_score,0))) company_fit,
         case
           when jsonb_typeof(coalesce(g.current_projects,'[]'::jsonb))='array'
             and jsonb_array_length(coalesce(g.current_projects,'[]'::jsonb))>0 then 85
           when jsonb_typeof(coalesce(g.recent_projects,'[]'::jsonb))='array'
             and jsonb_array_length(coalesce(g.recent_projects,'[]'::jsonb))>0 then 62
           else 35 end timing_score,
         least(100,
           case when jsonb_typeof(coalesce(g.current_projects,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.current_projects,'[]'::jsonb))>0 then 40 else 0 end +
           case when jsonb_typeof(coalesce(g.evidence,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.evidence,'[]'::jsonb))>=2 then 40
                when jsonb_typeof(coalesce(g.evidence,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.evidence,'[]'::jsonb))=1 then 25 else 0 end +
           case when g.contact_source_url is not null then 20 else 0 end
         ) evidence_score,
         to_jsonb(array_remove(array[
           case when jsonb_typeof(coalesce(g.current_projects,'[]'::jsonb))='array'
                     and jsonb_array_length(coalesce(g.current_projects,'[]'::jsonb))>0
             then 'Current project: '||coalesce(g.current_projects->0->>'name','verified current project') end,
           case when jsonb_typeof(coalesce(g.evidence,'[]'::jsonb))='array'
                     and jsonb_array_length(coalesce(g.evidence,'[]'::jsonb))>0
             then coalesce(g.evidence->0->>'reason',
                    case when g.contact_source_url is not null then 'Contact verified from company/public source' end) end
         ]::text[],null)) facts
  from public.pppp_gc_prospects_v1 g
  where g.first_sent_at is null
    and coalesce(g.status,'') not in ('do_not_contact','bounced','no_response_2','already_contacted')
), scored as (
  select b.*,
         public.pppp_outreach_readiness_v2(
           b.company_fit,b.timing_score,b.contact_score,b.evidence_score,
           jsonb_array_length(coalesce(b.facts,'[]'::jsonb)),false,null
         ) readiness
  from base b
)
update public.pppp_gc_prospects_v1 g
set contact_tier=s.tier,
    contact_quality_score=s.contact_score,
    company_fit_score=s.company_fit,
    commercial_timing_score=s.timing_score,
    message_evidence_score=s.evidence_score,
    outreach_readiness_score=coalesce((s.readiness->>'score')::integer,0),
    outreach_motion='awarded_project_gc',
    pristeel_offer_model='fabricated_steel_package',
    secondary_pristeel_offer_model=null,
    timing_classification=case when s.timing_score>=80 then 'likely_procurement_open' else 'unknown' end,
    workflow_state=s.readiness->>'state',
    personalization_facts=coalesce(s.facts,'[]'::jsonb),
    readiness_reasons=coalesce(s.readiness->'reasons','[]'::jsonb),
    outreach_engine_version='v2',
    updated_at=now()
from scored s where g.id=s.id;

create or replace view public.pppp_supplier_relationship_health_v1
with (security_invoker=true)
as
with partner_map as (
  select p.id partner_id,p.name canonical_supplier,p.importance,p.stage,
         lower(regexp_replace(p.name,'[^a-z0-9]+','','g')) key
  from public.partners p
  union all
  select p.id,p.name,p.importance,p.stage,
         lower(regexp_replace(a,'[^a-z0-9]+','','g'))
  from public.partners p
  cross join lateral unnest(coalesce(p.aliases,array[]::text[])) a
), rfq_raw as (
  select r.*,lower(regexp_replace(coalesce(r.supplier_name,''),'[^a-z0-9]+','','g')) raw_key
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
  select o.*,lower(regexp_replace(coalesce(o.supplier,''),'[^a-z0-9]+','','g')) raw_key
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
  select d.*,lower(regexp_replace(coalesce(d.supplier_name,''),'[^a-z0-9]+','','g')) raw_key
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
revoke all on public.pppp_supplier_relationship_health_v1 from public, anon;
grant select on public.pppp_supplier_relationship_health_v1 to authenticated, service_role;

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
  v_name_key text:=lower(regexp_replace(trim(coalesce(p_supplier_name,'')),'[^a-z0-9]+','','g'));
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
  where lower(regexp_replace(x.supplier_name,'[^a-z0-9]+','','g'))=v_name_key
     or (length(v_name_key)>=5 and lower(regexp_replace(x.supplier_name,'[^a-z0-9]+','','g')) like v_name_key||'%')
     or (length(lower(regexp_replace(x.supplier_name,'[^a-z0-9]+','','g')))>=5
         and v_name_key like lower(regexp_replace(x.supplier_name,'[^a-z0-9]+','','g'))||'%')
  order by case when lower(regexp_replace(x.supplier_name,'[^a-z0-9]+','','g'))=v_name_key then 0 else 1 end
  limit 1;

  select r.id,r.sent_at,r.replied_at,r.offer_id,r.rfq_mode into v_recent
  from public.rfq_log r
  where r.project_id=p_project_id and r.sent_at is not null
    and (lower(regexp_replace(coalesce(r.supplier_name,''),'[^a-z0-9]+','','g'))=v_name_key
         or (p_supplier_email is not null and lower(coalesce(r.supplier_email,''))=lower(p_supplier_email)))
  order by r.sent_at desc limit 1;

  if v_recent.id is not null and v_recent.sent_at>=now()-interval '7 days'
     and v_recent.replied_at is null and v_recent.offer_id is null then
    return jsonb_build_object('allowed',false,'reason','recent_supplier_rfq_same_project',
      'last_sent_at',v_recent.sent_at,'relationship_state',coalesce(h.relationship_state,'unknown'),'human_send_required',true);
  end if;

  if v_mode='budgetary' then
    if lower(coalesce(p.pipeline_stage,'')) not in ('rfq_in','technical_review','pricing') then
      v_reason:='budgetary_not_justified_at_project_stage';
    elsif coalesce(h.relationship_state,'')='fatigue_risk' then
      v_reason:='supplier_fatigue_blocks_budgetary_request';
    else v_allowed:=true; v_reason:='qualified_budgetary_check'; end if;
  elsif v_mode='firm' then
    if lower(coalesce(p.pipeline_stage,'')) not in ('rfq_in','technical_review','pricing') then
      v_reason:='firm_rfq_requires_active_pre_offer_stage';
    else
      v_allowed:=true; v_reason:='qualified_firm_supplier_rfq';
      if coalesce(h.relationship_state,'')='fatigue_risk' then
        v_warning:='supplier_fatigue_risk_use_only_if_scope_is_real_and_complete';
      elsif coalesce(h.relationship_state,'')='watch' then
        v_warning:='supplier_relationship_watch';
      end if;
    end if;
  else
    if lower(coalesce(p.pipeline_stage,'')) not in ('pricing','client_offer','commercial') then
      v_reason:='requote_requires_pricing_or_client_offer_stage';
    else
      v_allowed:=true; v_reason:='qualified_requote';
      if coalesce(h.relationship_state,'') in ('fatigue_risk','watch') then
        v_warning:='supplier_relationship_requires_careful_feedback';
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'allowed',v_allowed,'reason',v_reason,'warning',v_warning,'rfq_mode',v_mode,
    'project_id',p.id,'project_name',p.name,'project_stage',p.pipeline_stage,'operational_state',p.operational_state,
    'supplier_name',v_name,'relationship_state',coalesce(h.relationship_state,'new_or_unmeasured'),
    'sent_rfqs',coalesce(h.sent_rfqs,0),'sent_rfqs_90d',coalesce(h.sent_rfqs_90d,0),
    'answered_rfqs',coalesce(h.answered_rfqs,0),'realized_orders',coalesce(h.realized_orders,0),
    'relationship_guidance',coalesce(h.relationship_guidance,'No measured sent-RFQ history.'),
    'human_send_required',true,'external_email_sent',false
  );
end;
$function$;
revoke all on function public.pppp_supplier_rfq_gate_v1(uuid,text,text,text) from public, anon;
grant execute on function public.pppp_supplier_rfq_gate_v1(uuid,text,text,text) to authenticated, service_role;

create or replace view public.pppp_sales_engine_v3_workbench_v1
with (security_invoker=true)
as
select 'material_trade'::text channel,'dach_target'::text source_type,t.id source_id,t.source_key,t.company_name,
       coalesce(t.why_now,t.buyer_type) why_company,coalesce(t.procurement_timing,t.why_now) commercial_signal,t.project_title,
       t.canonical_contact_email contact_email,t.canonical_contact_name contact_name,t.canonical_contact_role contact_role,
       t.contact_tier,t.contact_quality_score,t.company_fit_score,t.commercial_timing_score,t.message_evidence_score,
       t.outreach_readiness_score,t.outreach_motion,
       coalesce(t.pristeel_offer_model,public.pppp_pristeel_offer_model_v1('material_trade',t.buyer_type,t.outreach_motion,t.timing_classification,null)) pristeel_offer_model,
       t.secondary_pristeel_offer_model,t.timing_classification,t.workflow_state,t.personalization_facts,t.readiness_reasons,
       t.outreach_engine_version,t.reply_classification,t.reply_evidence,
       q.sent_at last_contact_at,q.replied_at,q.bounced_at,q.gmail_thread_id,t.project_id,
       coalesce(t.next_action,case when t.workflow_state='strong_company_contact_gap' then 'Find or improve procurement contact'
         when t.workflow_state='ready_for_outreach' then 'Review evidence-led draft'
         when t.workflow_state='thread_review' then 'Open Gmail thread' else 'Research evidence and timing' end) next_action,true human_send_required
from public.pppp_dach_steel_targets_v1 t
left join lateral (
  select oq.sent_at,oq.replied_at,oq.bounced_at,oq.gmail_thread_id
  from public.pppp_outbound_queue_v1 oq where oq.source_record_id=t.id
  order by coalesce(oq.sent_at,oq.updated_at,oq.created_at) desc limit 1
) q on true
union all
select 'ted_awarded','opportunity_action',a.id,a.action_key,a.target_company,
       coalesce(a.payload->>'why_company',a.draft_brief),coalesce(a.payload->>'commercial_signal',a.subject_hint),a.payload->>'project_title',
       a.target_email,a.target_name,a.target_role,a.contact_tier,a.contact_quality_score,a.company_fit_score,a.commercial_timing_score,
       a.message_evidence_score,a.outreach_readiness_score,a.outreach_motion,
       coalesce(a.pristeel_offer_model,public.pppp_pristeel_offer_model_v1('ted_awarded',a.action_type,a.outreach_motion,a.timing_classification,a.route)),
       a.secondary_pristeel_offer_model,a.timing_classification,a.workflow_state,a.personalization_facts,a.readiness_reasons,
       a.outreach_engine_version,a.reply_classification,a.reply_evidence,r.sent_at,
       case when r.status='replied' then r.updated_at else null::timestamptz end,null::timestamptz,r.gmail_thread_id,a.project_id,
       case when a.workflow_state='strong_company_contact_gap' then 'Find or improve procurement contact'
         when a.workflow_state='ready_for_outreach' then 'Review evidence-led draft'
         when r.gmail_thread_id is not null then 'Open Gmail thread'
         when a.timing_classification='future_supplier_qualification' then 'Qualify for future supplier list'
         else 'Research evidence and timing' end,true
from public.pppp_opportunity_actions a
left join lateral (
  select x.sent_at,x.updated_at,x.status,x.gmail_thread_id
  from public.pppp_opportunity_outreach_registry_v1 x where x.action_id=a.id
  order by coalesce(x.sent_at,x.updated_at,x.created_at) desc limit 1
) r on true
where a.action_type=any(array['gc_contact_research','gc_project_outreach_draft','producer_contact_research',
 'producer_capacity_outreach_draft','consortium_member_review','consortium_project_outreach_draft',
 'general_project_outreach_draft','manual_tender_outreach_draft'])
union all
select 'gc_direct','gc_prospect',g.id,g.company_key,g.company_name,coalesce(g.company_type,'GC/GU'),
       case when jsonb_typeof(coalesce(g.current_projects,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.current_projects,'[]'::jsonb))>0
            then coalesce(g.current_projects->0->>'status','active project signal') else 'Verified GC/GU target' end,
       case when jsonb_typeof(coalesce(g.current_projects,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.current_projects,'[]'::jsonb))>0 then g.current_projects->0->>'name'
            when jsonb_typeof(coalesce(g.recent_projects,'[]'::jsonb))='array'
                  and jsonb_array_length(coalesce(g.recent_projects,'[]'::jsonb))>0 then g.recent_projects->0->>'name' else null end,
       g.contact_email,g.contact_name,g.contact_role,g.contact_tier,g.contact_quality_score,g.company_fit_score,
       g.commercial_timing_score,g.message_evidence_score,g.outreach_readiness_score,g.outreach_motion,
       coalesce(g.pristeel_offer_model,'fabricated_steel_package'),g.secondary_pristeel_offer_model,g.timing_classification,
       g.workflow_state,g.personalization_facts,g.readiness_reasons,g.outreach_engine_version,g.reply_classification,g.reply_evidence,
       g.first_sent_at,g.replied_at,g.bounced_at,g.first_gmail_thread_id,null::uuid,
       case when g.replied_at is not null then 'Open Gmail thread and classify reply'
         when g.workflow_state='strong_company_contact_gap' then 'Find or improve procurement contact'
         when g.workflow_state='ready_for_outreach' and g.first_draft_id is not null then 'Refresh/review V2 draft before sending'
         when g.workflow_state='ready_for_outreach' then 'Review evidence-led draft'
         when g.first_sent_at is not null then 'Wait for reply / contextual follow-up only when due'
         else 'Research evidence and timing' end,true
from public.pppp_gc_prospects_v1 g;
revoke all on public.pppp_sales_engine_v3_workbench_v1 from public, anon;
grant select on public.pppp_sales_engine_v3_workbench_v1 to authenticated, service_role;

create or replace view public.pppp_sales_engine_v3_funnel_v1
with (security_invoker=true)
as
select channel,outreach_engine_version,count(*) discovered,
       count(*) filter(where company_fit_score>=65) qualified,
       count(*) filter(where contact_email is not null) contact_found,
       count(*) filter(where contact_tier in ('A','B')) named_decision_maker,
       count(*) filter(where workflow_state='strong_company_contact_gap') contact_gap,
       count(*) filter(where workflow_state='ready_for_outreach') ready_for_outreach,
       count(*) filter(where workflow_state='draft_created' or (source_type='gc_prospect' and last_contact_at is null and gmail_thread_id is not null)) drafted,
       count(*) filter(where last_contact_at is not null) sent,
       count(*) filter(where last_contact_at is not null and bounced_at is null) delivered,
       count(*) filter(where replied_at is not null or reply_classification is not null) replied,
       count(*) filter(where reply_classification in ('future_interest','meeting_requested')) positive_replies,
       count(*) filter(where reply_classification='referral') referrals,
       count(*) filter(where reply_classification='rfq_received') rfqs,
       count(*) filter(where project_id is not null) projects_created
from public.pppp_sales_engine_v3_workbench_v1 group by channel,outreach_engine_version;
revoke all on public.pppp_sales_engine_v3_funnel_v1 from public, anon;
grant select on public.pppp_sales_engine_v3_funnel_v1 to authenticated, service_role;

create or replace view public.pppp_sales_engine_v3_pilot_queue_v1
with (security_invoker=true)
as
select * from public.pppp_sales_engine_v3_workbench_v1
where outreach_engine_version='v2' and workflow_state='ready_for_outreach'
  and contact_quality_score>=50 and message_evidence_score>=60
  and jsonb_array_length(coalesce(personalization_facts,'[]'::jsonb))>=2
  and last_contact_at is null
order by outreach_readiness_score desc,company_fit_score desc,contact_quality_score desc
limit 25;
revoke all on public.pppp_sales_engine_v3_pilot_queue_v1 from public, anon;
grant select on public.pppp_sales_engine_v3_pilot_queue_v1 to authenticated, service_role;

commit;
