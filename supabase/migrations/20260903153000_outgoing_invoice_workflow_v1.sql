begin;

-- Outgoing invoice workflow v1
-- Goals:
--  * derive invoice milestones from the human-approved/won client quotation;
--  * never create an outgoing invoice before a human approval;
--  * keep future/event-based milestones quiet until their trigger is objectively near/due;
--  * allocate PST-INV numbers atomically and link every new invoice back to its quotation milestone.

create unique index if not exists invoices_out_invoice_nr_normalized_key
  on public.invoices_out (lower(btrim(invoice_nr)))
  where nullif(btrim(invoice_nr),'') is not null;

create unique index if not exists invoices_out_offer_milestone_key
  on public.invoices_out (source_offer_id, source_milestone_index)
  where source_offer_id is not null and source_milestone_index is not null;

create or replace function public.pppp_project_delivery_date_v1(p_project_id uuid)
returns date
language sql
stable
set search_path = pg_catalog, public
as $$
  with highlights as (
    select h.value as item
    from public.pppp_project_context_current_v c
    cross join lateral jsonb_array_elements(coalesce(c.value->'highlights','[]'::jsonb)) h
    where c.project_id=p_project_id
      and c.category='execution_schedule'
      and lower(coalesce(h.value->>'label','')) ~ '(transport|delivery|liefer|isporuk|dostav)'
  ), parsed as (
    select case
      when coalesce(item->>'start','') ~ '^\d{2}/\d{2}/\d{2}$' then to_date(item->>'start','DD/MM/YY')
      when coalesce(item->>'start','') ~ '^\d{2}/\d{2}/\d{4}$' then to_date(item->>'start','DD/MM/YYYY')
      when coalesce(item->>'start','') ~ '^\d{4}-\d{2}-\d{2}' then substring(item->>'start' from 1 for 10)::date
      else null::date
    end as delivery_date
    from highlights
  )
  select min(delivery_date) from parsed where delivery_date is not null;
$$;

create or replace view public.pppp_outgoing_invoice_milestones_v1
with (security_invoker = true)
as
with won_offers as (
  select
    d.id as offer_id,
    d.doc_nr as offer_doc_nr,
    d.project_id,
    d.project as offer_project,
    d.client,
    coalesce(d.total_amount,d.total_eur) as offer_total,
    upper(coalesce(nullif(d.currency,''),'EUR')) as currency,
    d.exchange_rate_to_eur,
    d.payment_plan,
    d.offer_state,
    d.created_at as offer_created_at,
    p.name as project_name,
    p.status as project_status,
    p.pipeline_stage,
    p.operational_state,
    public.pppp_project_delivery_date_v1(d.project_id) as delivery_date
  from public.documents_registry d
  join public.projects p on p.id=d.project_id
  where d.series='QUO'
    and lower(coalesce(d.followup_status,''))='won'
    and jsonb_typeof(d.payment_plan)='array'
    and jsonb_array_length(d.payment_plan)>0
    and coalesce(d.total_amount,d.total_eur)>0
), expanded as (
  select
    o.*,
    (m.ordinality-1)::integer as milestone_index,
    lower(btrim(coalesce(m.item->>'ev','milestone'))) as milestone_event,
    coalesce(nullif(btrim(m.item->>'label'),''),nullif(btrim(m.item->>'ev'),''),'Milestone '||m.ordinality::text) as milestone_label,
    case
      when coalesce(m.item->>'pct','') ~ '^\s*[0-9]+([\.,][0-9]+)?\s*$'
        then replace(btrim(m.item->>'pct'),',','.')::numeric
      else null::numeric
    end as milestone_pct,
    case
      when coalesce(m.item->>'days','') ~ '^\s*[0-9]+\s*$' then btrim(m.item->>'days')::integer
      else 0
    end as payment_days
  from won_offers o
  cross join lateral jsonb_array_elements(o.payment_plan) with ordinality as m(item,ordinality)
), priced as (
  select
    e.*,
    case when e.milestone_pct is not null then round(e.offer_total*e.milestone_pct/100.0,2) end as milestone_amount
  from expanded e
), ranked as (
  select
    p.*,
    row_number() over (
      partition by p.offer_id,p.milestone_amount
      order by p.milestone_index
    ) as same_amount_rank
  from priced p
), invoice_mapped as (
  select
    r.*,
    coalesce(di.id,li.id) as invoice_id,
    coalesce(di.invoice_nr,li.invoice_nr) as invoice_nr,
    coalesce(di.paid,li.paid) as invoice_paid,
    coalesce(di.paid_date,li.paid_date) as invoice_paid_date,
    coalesce(di.date,li.date) as invoice_date
  from ranked r
  left join lateral (
    select i.id,i.invoice_nr,i.paid,i.paid_date,i.date
    from public.invoices_out i
    where i.source_offer_id=r.offer_id
      and i.source_milestone_index=r.milestone_index
    order by i.created_at desc
    limit 1
  ) di on true
  left join lateral (
    select i.id,i.invoice_nr,i.paid,i.paid_date,i.date
    from public.invoices_out i
    where di.id is null
      and i.project_id=r.project_id
      and i.source_offer_id is null
      and r.milestone_amount is not null
      and abs(coalesce(i.total_price,i.gross_amount,i.net_amount,0)-r.milestone_amount)<=0.01
    order by i.created_at,i.id
    offset greatest(r.same_amount_rank-1,0)
    limit 1
  ) li on true
), evaluated as (
  select
    m.*,
    exists(
      select 1
      from invoice_mapped prior
      where prior.offer_id=m.offer_id
        and prior.milestone_index<m.milestone_index
        and prior.invoice_id is null
    ) as prior_invoice_missing
  from invoice_mapped m
)
select
  e.offer_id,
  e.offer_doc_nr,
  e.project_id,
  e.project_name,
  e.client,
  e.project_status,
  e.pipeline_stage,
  e.operational_state,
  e.offer_total,
  e.currency,
  e.exchange_rate_to_eur,
  e.milestone_index,
  e.milestone_event,
  e.milestone_label,
  e.milestone_pct,
  e.milestone_amount,
  e.payment_days,
  e.delivery_date,
  e.invoice_id,
  e.invoice_nr,
  e.invoice_paid,
  e.invoice_paid_date,
  e.invoice_date,
  'outgoing:'||e.offer_id::text||':milestone:'||e.milestone_index::text as candidate_key,
  case
    when e.invoice_id is not null then 'invoiced'
    when e.milestone_pct is null or coalesce(e.milestone_amount,0)<=0 then 'invalid'
    when e.prior_invoice_missing then 'waiting_previous_invoice'
    when e.milestone_index=0
      and (lower(coalesce(e.project_status,'')) in ('fituar','won') or e.operational_state='execution') then 'review'
    when e.milestone_event ~ '(before.*del|before_del|pred.*ispor|vor.*liefer)'
      and e.delivery_date is not null
      and e.delivery_date<=current_date+14 then 'review'
    when e.milestone_event ~ '(after.*del|after_del|nakon.*ispor|nach.*liefer)'
      and e.delivery_date is not null
      and e.delivery_date<=current_date then 'review'
    else 'pending_event'
  end as readiness,
  case
    when e.invoice_id is not null then 'Milestone already invoiced.'
    when e.prior_invoice_missing then 'A prior quotation milestone must be invoiced first.'
    when e.milestone_index=0 then 'Initial/order milestone of a won quotation.'
    when e.milestone_event ~ '(before.*del|before_del|pred.*ispor|vor.*liefer)'
      and e.delivery_date is not null then 'Delivery is within 14 days.'
    when e.milestone_event ~ '(after.*del|after_del|nakon.*ispor|nach.*liefer)'
      and e.delivery_date is not null then 'Delivery date has been reached.'
    when e.delivery_date is null then 'Waiting for a confirmed delivery/transport date or explicit operator trigger.'
    else 'Waiting for the milestone event.'
  end as readiness_reason,
  ic.id as candidate_id,
  ic.status as candidate_status,
  ic.canonical_invoice_out_id
from evaluated e
left join public.invoice_candidates ic
  on ic.candidate_key='outgoing:'||e.offer_id::text||':milestone:'||e.milestone_index::text
 and ic.direction='outgoing';

create or replace function public.pppp_refresh_outgoing_invoice_candidates_v1()
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  r record;
  v_candidate_id uuid;
  v_created integer:=0;
  v_review integer:=0;
  v_pending integer:=0;
begin
  for r in
    select * from public.pppp_outgoing_invoice_milestones_v1
    where readiness in ('review','pending_event','waiting_previous_invoice')
  loop
    insert into public.invoice_candidates(
      candidate_key,project_id,party_name,direction,subject,extracted,confidence,status,updated_at
    ) values (
      r.candidate_key,r.project_id,r.client,'outgoing',
      'Outgoing invoice milestone · '||r.offer_doc_nr||' · '||r.milestone_label,
      jsonb_build_object(
        'workflow','pppp-outgoing-invoice-workflow-v1',
        'offer_id',r.offer_id,
        'offer_doc_nr',r.offer_doc_nr,
        'project_name',r.project_name,
        'client',r.client,
        'milestone_index',r.milestone_index,
        'milestone_event',r.milestone_event,
        'milestone_label',r.milestone_label,
        'milestone_pct',r.milestone_pct,
        'amount',r.milestone_amount,
        'currency',r.currency,
        'exchange_rate_to_eur',r.exchange_rate_to_eur,
        'payment_days',r.payment_days,
        'delivery_date',r.delivery_date,
        'readiness',r.readiness,
        'readiness_reason',r.readiness_reason,
        'human_approval_required',true,
        'human_send_required',true
      ),
      case when r.readiness='review' then 100 else 90 end,
      case when r.readiness='review' then 'review' else 'pending_event' end,
      now()
    )
    on conflict(candidate_key) do update set
      project_id=excluded.project_id,
      party_name=excluded.party_name,
      direction='outgoing',
      subject=excluded.subject,
      extracted=excluded.extracted,
      confidence=excluded.confidence,
      status=case
        when public.invoice_candidates.status in ('approved','rejected') then public.invoice_candidates.status
        when public.invoice_candidates.status='review' then 'review'
        else excluded.status
      end,
      updated_at=now()
    returning id into v_candidate_id;

    if r.candidate_id is null then v_created:=v_created+1; end if;

    if r.readiness='review' then
      v_review:=v_review+1;
      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
      values(
        r.project_id,
        'Aprovo faturën e radhës · '||r.offer_doc_nr||' · '||r.milestone_pct::text||'%',
        'PPPP ka përgatitur kandidatin e faturës për '||r.client||'. Milestone: '||r.milestone_label||'. Shuma: '||r.milestone_amount::text||' '||r.currency||'.\n\nHuman gate: kontrollo milestone-in, shumën dhe kushtet. Numri PST-INV gjenerohet vetëm pasi ta aprovosësh faturën.',
        current_date,'larte','hapur','outgoing_invoice_review','finance',r.candidate_key
      )
      on conflict(source,source_ref) do update set
        title=excluded.title,
        detail=excluded.detail,
        due_date=excluded.due_date,
        priority=excluded.priority,
        status=case when public.tasks.status in ('kryer','done','mbyllur','closed') then public.tasks.status else 'hapur' end,
        category='finance';
    else
      v_pending:=v_pending+1;
      update public.tasks
      set status='mbyllur',done_at=coalesce(done_at,now())
      where source='outgoing_invoice_review'
        and source_ref=r.candidate_key
        and lower(coalesce(status,'')) not in ('kryer','done','mbyllur','closed');
    end if;
  end loop;

  -- Close stale review tasks once their milestone has been invoiced/approved.
  update public.tasks t
  set status='mbyllur',done_at=coalesce(t.done_at,now())
  where t.source='outgoing_invoice_review'
    and lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed')
    and exists(
      select 1 from public.invoice_candidates c
      where c.candidate_key=t.source_ref
        and c.direction='outgoing'
        and c.status in ('approved','rejected')
    );

  return jsonb_build_object('ok',true,'created_or_discovered',v_created,'review_ready',v_review,'pending_event',v_pending);
end;
$$;

create or replace function public.pppp_approve_outgoing_invoice_candidate_v1(p_candidate_id uuid)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  c public.invoice_candidates%rowtype;
  p public.projects%rowtype;
  o public.documents_registry%rowtype;
  v_invoice_id uuid;
  v_registry_id uuid;
  v_existing uuid;
  v_offer_id uuid;
  v_index integer;
  v_amount numeric;
  v_pct numeric;
  v_currency text;
  v_fx numeric;
  v_days integer;
  v_event text;
  v_label text;
  v_year integer:=extract(year from current_date)::integer;
  v_seq integer;
  v_nr text;
  v_due date;
  v_actor uuid:=auth.uid();
begin
  if not public.can_write() then
    raise exception 'Write permission required' using errcode='42501';
  end if;

  select * into c from public.invoice_candidates where id=p_candidate_id for update;
  if not found then raise exception 'Invoice candidate not found'; end if;
  if c.direction<>'outgoing' then raise exception 'Candidate is not outgoing'; end if;

  if c.status='approved' and c.canonical_invoice_out_id is not null then
    return jsonb_build_object('ok',true,'status','already_approved','invoice_id',c.canonical_invoice_out_id);
  end if;
  if c.status<>'review' then raise exception 'Candidate is not in review state'; end if;
  if coalesce(c.extracted->>'readiness','')<>'review' then raise exception 'Milestone is not ready for invoice review'; end if;

  v_offer_id=nullif(c.extracted->>'offer_id','')::uuid;
  v_index=nullif(c.extracted->>'milestone_index','')::integer;
  v_amount=nullif(c.extracted->>'amount','')::numeric;
  v_pct=nullif(c.extracted->>'milestone_pct','')::numeric;
  v_currency=upper(btrim(coalesce(c.extracted->>'currency','EUR')));
  v_fx=nullif(c.extracted->>'exchange_rate_to_eur','')::numeric;
  v_days=coalesce(nullif(c.extracted->>'payment_days','')::integer,0);
  v_event=lower(coalesce(c.extracted->>'milestone_event','milestone'));
  v_label=coalesce(nullif(c.extracted->>'milestone_label',''),'Milestone '||(v_index+1)::text);

  if v_offer_id is null or v_index is null then raise exception 'Source offer/milestone is missing'; end if;
  if coalesce(v_amount,0)<=0 then raise exception 'Invoice amount must be reviewed'; end if;

  select * into o from public.documents_registry where id=v_offer_id and series='QUO';
  if not found then raise exception 'Source quotation not found'; end if;
  if lower(coalesce(o.followup_status,''))<>'won' then raise exception 'Source quotation is not marked won'; end if;

  select * into p from public.projects where id=c.project_id;
  if not found then raise exception 'Project not found'; end if;

  select i.id into v_existing
  from public.invoices_out i
  where i.source_offer_id=v_offer_id and i.source_milestone_index=v_index
  limit 1;
  if v_existing is not null then
    update public.invoice_candidates
    set status='approved',canonical_invoice_out_id=v_existing,reviewed_at=now(),updated_at=now()
    where id=c.id;
    return jsonb_build_object('ok',true,'status','already_invoiced','invoice_id',v_existing);
  end if;

  perform pg_advisory_xact_lock(hashtext('pppp:invoice-number:'||v_year::text));

  select greatest(
    coalesce((select max(d.seq) from public.documents_registry d where d.series='INV' and d.year=v_year),0),
    coalesce((select max((regexp_match(i.invoice_nr,'^PST-INV-'||v_year::text||'-([0-9]+)$'))[1]::integer)
              from public.invoices_out i
              where i.invoice_nr ~ ('^PST-INV-'||v_year::text||'-[0-9]+$')),0)
  )+1 into v_seq;

  v_nr='PST-INV-'||v_year::text||'-'||lpad(v_seq::text,3,'0');
  v_due=current_date+greatest(v_days,0);

  insert into public.invoices_out(
    invoice_nr,lang,date,project,ref,client,contact,address,items,total_price,currency,
    payment_terms,notes,vat_applicable,vat_rate,net_amount,vat_amount,gross_amount,paid,
    invoice_type,contract_value,advance_pct,due_date,project_id,source_offer_id,
    source_offer_doc_nr,source_milestone_index,exchange_rate_to_eur
  ) values (
    v_nr,
    coalesce(nullif(o.offer_state->>'lang',''),'en'),
    current_date,
    p.name,
    o.doc_nr,
    coalesce(o.client,p.client),
    nullif(o.offer_state->>'con',''),
    nullif(o.offer_state->>'addr',''),
    jsonb_build_array(jsonb_build_object(
      'kg',0,'pcs',0,'desc',v_label||' · '||o.doc_nr,'priceKg',0
    )),
    v_amount,v_currency,
    case when v_days>0 then v_days::text||' days' else 'Due according to approved milestone' end,
    'Created from approved PPPP invoice candidate '||c.id::text||'. Human send required.',
    false,0,v_amount,0,v_amount,false,
    case when v_index=0 and v_event ~ '(order|advance|agreement)' then 'advance' else 'standard' end,
    coalesce(o.total_amount,o.total_eur),
    case when v_index=0 then v_pct else null end,
    v_due,c.project_id,v_offer_id,o.doc_nr,v_index,v_fx
  ) returning id into v_invoice_id;

  insert into public.documents_registry(
    series,year,seq,doc_nr,project,client,total_eur,payment_plan,project_id,offer_state,
    followup_status,currency,total_amount,exchange_rate_to_eur
  ) values (
    'INV',v_year,v_seq,v_nr,p.name,coalesce(o.client,p.client),
    case when v_currency='EUR' then v_amount when v_fx is not null then round(v_amount*v_fx,2) else null end,
    null,c.project_id,
    jsonb_build_object(
      'source','pppp-outgoing-invoice-workflow-v1',
      'candidate_id',c.id,
      'source_offer_id',v_offer_id,
      'source_offer_doc_nr',o.doc_nr,
      'source_milestone_index',v_index,
      'milestone_label',v_label,
      'milestone_pct',v_pct,
      'human_invoice_approved',true,
      'approved_by',v_actor,
      'approved_at',now(),
      'human_send_required',true,
      'invoice_status','draft_ready'
    ),
    'open',v_currency,v_amount,v_fx
  ) returning id into v_registry_id;

  update public.invoice_candidates
  set status='approved',canonical_invoice_out_id=v_invoice_id,reviewed_at=now(),updated_at=now()
  where id=c.id;

  update public.tasks
  set status='mbyllur',done_at=coalesce(done_at,now())
  where source='outgoing_invoice_review'
    and source_ref=c.candidate_key
    and lower(coalesce(status,'')) not in ('kryer','done','mbyllur','closed');

  insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
  values(
    c.project_id,
    'Shqyrto dhe dërgo faturën · '||v_nr,
    'Fatura '||v_nr||' është krijuar nga milestone-i i aprovuar: '||v_label||'. Shuma: '||v_amount::text||' '||v_currency||'.\n\nHuman gate: kontrollo dokumentin final/PDF-në, të dhënat e klientit dhe kushtet para dërgimit. PPPP nuk e dërgon automatikisht.',
    current_date,'larte','hapur','outgoing_invoice_final_review_auto','finance','invoice:'||v_invoice_id::text
  )
  on conflict(source,source_ref) do update set
    title=excluded.title,detail=excluded.detail,due_date=excluded.due_date,priority=excluded.priority,status='hapur',done_at=null;

  return jsonb_build_object(
    'ok',true,'status','approved','invoice_id',v_invoice_id,'registry_id',v_registry_id,
    'invoice_nr',v_nr,'amount',v_amount,'currency',v_currency,'human_send_required',true
  );
end;
$$;

create or replace function public.pppp_chatgpt_outgoing_invoice_plan_v1(p_project_id uuid default null,p_limit integer default 100)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.project_name,x.milestone_index),'[]'::jsonb)
  from (
    select *
    from public.pppp_outgoing_invoice_milestones_v1
    where p_project_id is null or project_id=p_project_id
    order by project_name,milestone_index
    limit greatest(1,least(coalesce(p_limit,100),200))
  ) x;
$$;

-- Keep invoice approval/final review in the operator-safe action lane.
create or replace view public.pppp_home_current_actions_v1
with (security_invoker = true)
as
with eligible as (
  select
    t.id,t.project_id,p.name as project_name,p.client,t.title,t.detail,t.due_date,t.priority,t.status,
    t.source,t.source_ref,t.category,t.created_at,p.operational_state,p.operational_state_at,
    p.pipeline_stage,p.last_activity_at,p.last_email_at
  from public.tasks t
  join public.projects p on p.id=t.project_id
  where lower(coalesce(t.status,'')) <> all(array['kryer','done','mbyllur','closed','arkivuar','archived'])
    and lower(coalesce(p.status,'')) <> all(array['humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar'])
    and not exists (
      select 1 from public.pppp_project_context_current_v f
      where f.project_id=t.project_id and f.category='operator_update'
        and f.evidence_status='confirmed' and f.fact_status='observed' and f.updated_at>=t.created_at
        and lower(coalesce(f.value::text,'')) ~ '(nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow)'
    )
), direct_candidates as (
  select e.*,
    row_number() over(partition by e.project_id order by
      case e.source
        when 'manual' then 0
        when 'email_request_auto' then 1
        when 'outgoing_invoice_final_review_auto' then 2
        when 'outgoing_invoice_review' then 3
        when 'commercial_intake_review' then 4
        when 'procurement_comparison_auto' then 5
        when 'client_offer_cost_basis_auto' then 6
        when 'client_offer_final_review_auto' then 7
        else 9 end,
      e.due_date nulls first,e.created_at desc,e.id
    ) as direct_rn
  from eligible e
  where e.source in (
    'manual','email_request_auto','outgoing_invoice_final_review_auto','outgoing_invoice_review',
    'commercial_intake_review','procurement_comparison_auto','client_offer_cost_basis_auto','client_offer_final_review_auto'
  )
    and (
      e.source in ('outgoing_invoice_final_review_auto','outgoing_invoice_review','commercial_intake_review','procurement_comparison_auto','client_offer_cost_basis_auto','client_offer_final_review_auto')
      or e.due_date is null or e.due_date<=current_date+7
      or lower(coalesce(e.priority,'')) ~ '(urgjent|critical|e larte|larte|high)'
    )
), direct_actions as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from direct_candidates where direct_rn=1
), overdue_wait_candidates as (
  select e.*,
    row_number() over(partition by e.project_id order by e.due_date,e.created_at desc,e.id) as wait_rn
  from eligible e
  where e.source in ('supplier_wait_auto','invoice_receivable','email_followup','auto_followup')
    and e.due_date is not null and e.due_date<current_date
    and not exists(select 1 from direct_actions d where d.project_id=e.project_id)
), overdue_waits as (
  select id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,
         created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at
  from overdue_wait_candidates where wait_rn=1
)
select * from direct_actions
union all
select * from overdue_waits;

revoke all on function public.pppp_refresh_outgoing_invoice_candidates_v1() from public,anon,authenticated;
grant execute on function public.pppp_refresh_outgoing_invoice_candidates_v1() to service_role;

revoke all on function public.pppp_approve_outgoing_invoice_candidate_v1(uuid) from public,anon;
grant execute on function public.pppp_approve_outgoing_invoice_candidate_v1(uuid) to authenticated,service_role;

revoke all on function public.pppp_chatgpt_outgoing_invoice_plan_v1(uuid,integer) from public,anon;
grant execute on function public.pppp_chatgpt_outgoing_invoice_plan_v1(uuid,integer) to authenticated,service_role;
grant select on public.pppp_outgoing_invoice_milestones_v1 to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_chatgpt_outgoing_invoice_plan_v1(uuid,integer) to supabase_read_only_user;
    grant select on public.pppp_outgoing_invoice_milestones_v1 to supabase_read_only_user;
  end if;
end $$;

do $$
declare j bigint;
begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='outgoing-invoice-candidates-30m' loop
      perform cron.unschedule(j);
    end loop;
    perform cron.schedule(
      'outgoing-invoice-candidates-30m',
      '7,37 * * * *',
      'select public.pppp_refresh_outgoing_invoice_candidates_v1();'
    );
  end if;
end $$;

commit;
