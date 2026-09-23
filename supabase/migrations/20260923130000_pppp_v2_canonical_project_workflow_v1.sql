-- PPPP V2 canonical project workflow read model.
-- It does not replace or mutate any RFQ, offer, supplier, execution, invoice,
-- task or email engine. Every stage is derived from existing canonical evidence.

create or replace view public.pppp_project_workflow_state_v1
with (security_invoker = true)
as
with evidence as (
  select
    p.id as project_id,
    coalesce(
      p.workflow_type,
      case when lower(coalesce(p.business_type,p.work_model,p.deal_type,'')) ~ '(trading|trade|furniz)' then 'steel_trading' end,
      'steel_trading'
    ) as workflow_type,
    p.status,
    p.pipeline_stage,
    p.operational_state,
    coalesce(r.rfq_count,0)::int as rfq_count,
    coalesce(r.rfq_reply_count,0)::int as rfq_reply_count,
    coalesce(o.supplier_offer_count,0)::int as supplier_offer_count,
    coalesce(d.selected_supplier_count,0)::int as selected_supplier_count,
    coalesce(q.client_offer_count,0)::int as client_offer_count,
    coalesce(q.sent_client_offer_count,0)::int as sent_client_offer_count,
    coalesce(i.invoice_count,0)::int as invoice_count,
    coalesce(i.paid_invoice_count,0)::int as paid_invoice_count
  from public.projects p
  left join lateral (
    select count(*) as rfq_count,
           count(*) filter (where replied_at is not null or lower(coalesce(status,'')) in ('replied','received')) as rfq_reply_count
    from public.rfq_log where project_id=p.id
  ) r on true
  left join lateral (
    select count(*) as supplier_offer_count
    from public.offers where project_id=p.id
  ) o on true
  left join lateral (
    select count(*) filter (
      where lower(coalesce(status,'active'))='active'
        and lower(coalesce(decision_type,''))='selected_producer'
    ) as selected_supplier_count
    from public.project_supplier_decisions where project_id=p.id
  ) d on true
  left join lateral (
    select count(*) as client_offer_count,
           count(*) filter (
             where coalesce(offer_state->>'sent_at','')<>''
                or lower(coalesce(offer_state->>'status',offer_state->>'revision_status',followup_status,'')) ~ '(sent|submitted|issued|delivered|derguar)'
           ) as sent_client_offer_count
    from public.documents_registry
    where project_id=p.id and (upper(coalesce(series,''))='QUO' or upper(coalesce(doc_nr,'')) like 'QUO%')
  ) q on true
  left join lateral (
    select count(*) as invoice_count,
           count(*) filter (where paid is true or paid_date is not null) as paid_invoice_count
    from public.invoices_out where project_id=p.id
  ) i on true
), derived as (
  select e.*,
    case
        when lower(coalesce(e.status,'')) ~ '(humbur|lost|cancel|refuz)' then 'lost'
        when lower(coalesce(e.status,'')) ~ '(realizuar|mbyllur|closed|arkiv)' or e.pipeline_stage='closed' then 'closed'
        when e.invoice_count>0 and e.paid_invoice_count=e.invoice_count then 'payment'
        when e.invoice_count>0 then 'invoice'
        when e.pipeline_stage='delivery' then 'delivery'
        when e.pipeline_stage='transport' then 'transport'
        when e.pipeline_stage in ('production_control','factory_audit','procurement') then 'procurement'
        when e.pipeline_stage='supplier_po' then 'supplier_po'
        when e.pipeline_stage='customer_po' then 'customer_po'
        when lower(coalesce(e.status,'')) ~ '(fituar|won)' or lower(coalesce(e.operational_state,'')) ~ '(execution|ekzekutim)' then 'won'
        when e.sent_client_offer_count>0 and e.workflow_type='self_tender' then 'application'
        when e.sent_client_offer_count>0 then 'negotiation'
        when e.client_offer_count>0 and e.workflow_type='self_tender' then 'dossier'
        when e.client_offer_count>0 then 'client_offer'
        when e.selected_supplier_count>0 and e.workflow_type='self_tender' then 'dossier'
        when e.selected_supplier_count>0 then 'pricing'
        when e.supplier_offer_count>0 then 'supplier_comparison'
        when e.rfq_count>0 then 'supplier_rfq'
        when e.workflow_type='eu_award_sales' then 'contact'
        when e.workflow_type='self_tender' then 'requirements'
        else 'client_rfq'
      end as current_stage
  from evidence e
)
select
  d.*,
  case d.current_stage
    when 'opportunity' then 10 when 'tender' then 10 when 'contact' then 20
    when 'requirements' then 20 when 'client_rfq' then 30 when 'supplier_rfq' then 40
    when 'supplier_comparison' then 50 when 'pricing' then 60 when 'dossier' then 60
    when 'client_offer' then 70 when 'application' then 70 when 'negotiation' then 80
    when 'won' then 90 when 'lost' then 90 when 'customer_po' then 100
    when 'supplier_po' then 110 when 'procurement' then 120 when 'transport' then 130
    when 'delivery' then 140 when 'invoice' then 150 when 'payment' then 160
    when 'closed' then 170 else 0 end as stage_order,
  case d.current_stage
    when 'opportunity' then 'Aprovo Opportunity si Project'
    when 'tender' then 'Shqyrto tenderin dhe vendos'
    when 'contact' then 'Kontrollo kontaktet dhe përgatit emailin'
    when 'requirements' then 'Analizo kërkesat e tenderit'
    when 'client_rfq' then 'Qartëso Client RFQ'
    when 'supplier_rfq' then 'Mblidh ofertat e furnitorëve'
    when 'supplier_comparison' then 'Krahaso dhe aprovo furnitorin'
    when 'pricing' then 'Përgatit çmimin dhe ofertën'
    when 'dossier' then 'Finalizo çmimin dhe dosjen'
    when 'client_offer' then 'Kontrollo dhe dërgo ofertën'
    when 'application' then 'Kontrollo dhe dorëzo aplikimin'
    when 'negotiation' then 'Shqyrto përgjigjen / negociatën'
    when 'won' then 'Regjistro Customer PO'
    when 'customer_po' then 'Përgatit Supplier PO'
    when 'supplier_po' then 'Vazhdo me prokurimin'
    when 'procurement' then 'Vazhdo prodhimin / prokurimin'
    when 'transport' then 'Kontrollo transportin dhe dorëzimin'
    when 'delivery' then 'Konfirmo dorëzimin dhe përgatit faturën'
    when 'invoice' then 'Kontrollo pagesën'
    when 'payment' then 'Mbyll projektin'
    when 'lost' then 'Shiko arsyen dhe historikun'
    when 'closed' then 'Shiko historikun e projektit'
    else 'Kontrollo projektin' end as next_action_title,
  case d.current_stage
    when 'contact' then 'communication'
    when 'client_offer' then 'offer'
    when 'application' then 'offer'
    when 'negotiation' then 'communication'
    when 'supplier_rfq' then 'rfq'
    when 'supplier_comparison' then 'comparison'
    when 'pricing' then 'pricing'
    when 'dossier' then 'pricing'
    when 'won' then 'execution'
    when 'customer_po' then 'execution'
    when 'supplier_po' then 'execution'
    when 'procurement' then 'execution'
    when 'transport' then 'execution'
    when 'delivery' then 'execution'
    when 'invoice' then 'finance'
    when 'payment' then 'finance'
    when 'lost' then 'docscomms'
    when 'closed' then 'docscomms'
    else 'overview' end as next_action_area,
  d.current_stage in ('supplier_comparison','pricing','dossier','client_offer','application','negotiation','won','lost','customer_po','supplier_po','closed') as human_gate
from derived d;

revoke all on public.pppp_project_workflow_state_v1 from public;
grant select on public.pppp_project_workflow_state_v1 to anon, authenticated, service_role;

comment on view public.pppp_project_workflow_state_v1 is
  'Canonical PPPP V2 read model: three entry workflows converge into one supplier, commercial and post-award project flow.';
