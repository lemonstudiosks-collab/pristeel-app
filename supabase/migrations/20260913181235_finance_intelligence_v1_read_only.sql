create or replace function public.pppp_chatgpt_finance_intelligence_v1(
  p_days integer default 30,
  p_limit integer default 25
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_days integer := greatest(1,least(coalesce(p_days,30),180));
  v_limit integer := greatest(5,least(coalesce(p_limit,25),100));
  v_receivable_summary jsonb := '[]'::jsonb;
  v_payable_summary jsonb := '[]'::jsonb;
  v_expense_summary jsonb := '[]'::jsonb;
  v_overdue_receivables jsonb := '[]'::jsonb;
  v_payables_missing_due jsonb := '[]'::jsonb;
  v_expenses_unpaid jsonb := '[]'::jsonb;
  v_guarantees jsonb := '[]'::jsonb;
  v_invoice_pipeline jsonb := '[]'::jsonb;
  v_candidate_statuses jsonb := '[]'::jsonb;
  v_project_timing jsonb := '[]'::jsonb;
  v_attention jsonb := '[]'::jsonb;
  v_open_receivable_count integer := 0;
  v_overdue_receivable_count integer := 0;
  v_open_payable_count integer := 0;
  v_payable_missing_due_count integer := 0;
  v_unpaid_expense_count integer := 0;
  v_open_guarantee_count integer := 0;
  v_invoice_pipeline_count integer := 0;
  v_attention_count integer := 0;
begin
  with src as (
    select coalesce(nullif(trim(currency),''),'EUR') currency,
           coalesce(gross_amount,total_price,net_amount,0)::numeric amount,
           due_date
    from public.invoices_out
    where coalesce(paid,false)=false
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'currency',currency,
           'open_amount',open_amount,
           'open_count',open_count,
           'overdue_amount',overdue_amount,
           'overdue_count',overdue_count,
           'not_yet_due_amount',not_yet_due_amount,
           'missing_due_date_count',missing_due_date_count
         ) order by currency),'[]'::jsonb)
  into v_receivable_summary
  from (
    select currency,
           sum(amount) open_amount,
           count(*)::int open_count,
           sum(amount) filter(where due_date < current_date) overdue_amount,
           count(*) filter(where due_date < current_date)::int overdue_count,
           sum(amount) filter(where due_date >= current_date) not_yet_due_amount,
           count(*) filter(where due_date is null)::int missing_due_date_count
    from src group by currency
  ) x;

  with src as (
    select coalesce(nullif(trim(currency),''),'EUR') currency,
           coalesce(amount,0)::numeric amount,
           due_date
    from public.invoices_in
    where coalesce(paid,false)=false
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'currency',currency,
           'open_amount',open_amount,
           'open_count',open_count,
           'overdue_amount',overdue_amount,
           'overdue_count',overdue_count,
           'not_yet_due_amount',not_yet_due_amount,
           'missing_due_date_count',missing_due_date_count
         ) order by currency),'[]'::jsonb)
  into v_payable_summary
  from (
    select currency,
           sum(amount) open_amount,
           count(*)::int open_count,
           sum(amount) filter(where due_date < current_date) overdue_amount,
           count(*) filter(where due_date < current_date)::int overdue_count,
           sum(amount) filter(where due_date >= current_date) not_yet_due_amount,
           count(*) filter(where due_date is null)::int missing_due_date_count
    from src group by currency
  ) x;

  with src as (
    select coalesce(nullif(trim(currency),''),'EUR') currency,
           coalesce(amount,0)::numeric amount
    from public.expenses
    where coalesce(paid,false)=false
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'currency',currency,
           'unpaid_record_amount',unpaid_amount,
           'unpaid_record_count',unpaid_count
         ) order by currency),'[]'::jsonb)
  into v_expense_summary
  from (
    select currency,sum(amount) unpaid_amount,count(*)::int unpaid_count
    from src group by currency
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.days_overdue desc,x.amount desc),'[]'::jsonb)
  into v_overdue_receivables
  from (
    select o.id,o.invoice_nr,o.project_id,o.project,o.client,o.date,o.due_date,
           (current_date-o.due_date)::int days_overdue,
           coalesce(o.gross_amount,o.total_price,o.net_amount,0)::numeric amount,
           coalesce(nullif(trim(o.currency),''),'EUR') currency
    from public.invoices_out o
    where coalesce(o.paid,false)=false and o.due_date < current_date
    order by o.due_date,coalesce(o.gross_amount,o.total_price,o.net_amount,0) desc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.date nulls last,x.amount desc),'[]'::jsonb)
  into v_payables_missing_due
  from (
    select i.id,i.supplier_invoice_nr,i.project_id,i.project,i.supplier,i.date,
           coalesce(i.amount,0)::numeric amount,
           coalesce(nullif(trim(i.currency),''),'EUR') currency,
           i.payment_terms,
           'Due date is missing; this invoice is not classified as overdue until the due date is verified.'::text as interpretation
    from public.invoices_in i
    where coalesce(i.paid,false)=false and i.due_date is null
    order by i.date nulls last,i.amount desc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.date desc nulls last,x.amount desc),'[]'::jsonb)
  into v_expenses_unpaid
  from (
    select e.id,e.project_id,e.supplier,e.invoice_nr,e.date,e.due_date,
           coalesce(e.amount,0)::numeric amount,
           coalesce(nullif(trim(e.currency),''),'EUR') currency,e.category,
           'Expense records are reported separately from supplier invoices to avoid double counting liabilities.'::text as interpretation
    from public.expenses e
    where coalesce(e.paid,false)=false
    order by e.date desc nulls last,e.amount desc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.expiry_date nulls last,x.amount_guaranteed desc),'[]'::jsonb)
  into v_guarantees
  from (
    select g.id,g.project_id,g.project,g.bank_name,g.guarantee_type,
           coalesce(g.amount_guaranteed,0)::numeric amount_guaranteed,
           g.fee_rate_pct,g.fee_amount,g.issue_date,g.expiry_date,g.status,
           case when g.expiry_date is null then null else (g.expiry_date-current_date)::int end days_to_expiry,
           case
             when g.expiry_date is not null and g.expiry_date < current_date then 'expired_date_review'
             when g.expiry_date is not null and g.expiry_date <= current_date+60 then 'expiry_within_60_days'
             when g.project_id is null then 'project_link_review'
             else 'monitor'
           end attention_state
    from public.bank_guarantees g
    where lower(coalesce(g.status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled')
    order by g.expiry_date nulls last,g.amount_guaranteed desc
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.delivery_date nulls last,x.project_name,x.milestone_index),'[]'::jsonb)
  into v_invoice_pipeline
  from (
    select m.project_id,m.project_name,m.client,m.offer_id,m.offer_doc_nr,m.milestone_index,m.milestone_label,
           m.milestone_event,m.milestone_pct,m.milestone_amount,m.currency,m.payment_days,m.delivery_date,
           m.readiness,m.readiness_reason,m.candidate_id,m.candidate_status,
           case when lower(coalesce(m.milestone_event,''))='beforedel' and m.delivery_date is not null then m.delivery_date-14
                when m.delivery_date is not null then m.delivery_date else null end as earliest_event_date,
           'Pipeline amount only: it is not an accounts receivable balance until a canonical outgoing invoice exists.'::text as accounting_treatment
    from public.pppp_outgoing_invoice_milestones_v1 m
    where m.invoice_id is null
    order by m.delivery_date nulls last,m.project_name,m.milestone_index
    limit v_limit
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object('status',status,'count',cnt) order by status),'[]'::jsonb)
  into v_candidate_statuses
  from (
    select coalesce(status,'unknown') status,count(*)::int cnt
    from public.invoice_candidates
    group by coalesce(status,'unknown')
  ) x;

  with ids as (
    select project_id from public.invoices_out where project_id is not null and coalesce(paid,false)=false
    union
    select project_id from public.invoices_in where project_id is not null and coalesce(paid,false)=false
    union
    select project_id from public.bank_guarantees where project_id is not null and lower(coalesce(status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'project_id',p.id,
           'project_name',p.name,
           'client',p.client,
           'open_receivables',coalesce(r.by_currency,'[]'::jsonb),
           'open_supplier_invoices',coalesce(pi.by_currency,'[]'::jsonb),
           'open_guarantees',coalesce(bg.guarantees,'[]'::jsonb),
           'interpretation','Amounts are shown by currency and category. No cross-currency or receivable-minus-payable net is inferred.'
         ) order by p.name),'[]'::jsonb)
  into v_project_timing
  from ids
  join public.projects p on p.id=ids.project_id
  left join lateral (
    select jsonb_agg(jsonb_build_object('currency',currency,'amount',amount,'overdue_amount',overdue_amount) order by currency) by_currency
    from (
      select coalesce(nullif(trim(o.currency),''),'EUR') currency,
             sum(coalesce(o.gross_amount,o.total_price,o.net_amount,0)) amount,
             sum(coalesce(o.gross_amount,o.total_price,o.net_amount,0)) filter(where o.due_date<current_date) overdue_amount
      from public.invoices_out o where o.project_id=p.id and coalesce(o.paid,false)=false
      group by coalesce(nullif(trim(o.currency),''),'EUR')
    ) q
  ) r on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('currency',currency,'amount',amount,'missing_due_date_count',missing_due_date_count) order by currency) by_currency
    from (
      select coalesce(nullif(trim(i.currency),''),'EUR') currency,sum(coalesce(i.amount,0)) amount,
             count(*) filter(where i.due_date is null)::int missing_due_date_count
      from public.invoices_in i where i.project_id=p.id and coalesce(i.paid,false)=false
      group by coalesce(nullif(trim(i.currency),''),'EUR')
    ) q
  ) pi on true
  left join lateral (
    select jsonb_agg(jsonb_build_object('amount_guaranteed',g.amount_guaranteed,'status',g.status,'expiry_date',g.expiry_date,'guarantee_type',g.guarantee_type) order by g.expiry_date nulls last) guarantees
    from public.bank_guarantees g
    where g.project_id=p.id and lower(coalesce(g.status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled')
  ) bg on true;

  select count(*)::int into v_open_receivable_count from public.invoices_out where coalesce(paid,false)=false;
  select count(*)::int into v_overdue_receivable_count from public.invoices_out where coalesce(paid,false)=false and due_date<current_date;
  select count(*)::int into v_open_payable_count from public.invoices_in where coalesce(paid,false)=false;
  select count(*)::int into v_payable_missing_due_count from public.invoices_in where coalesce(paid,false)=false and due_date is null;
  select count(*)::int into v_unpaid_expense_count from public.expenses where coalesce(paid,false)=false;
  select count(*)::int into v_open_guarantee_count from public.bank_guarantees where lower(coalesce(status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled');
  select count(*)::int into v_invoice_pipeline_count from public.pppp_outgoing_invoice_milestones_v1 where invoice_id is null;

  with attention_items as (
    select 100 priority_score,
           jsonb_build_object(
             'attention_id','receivable:'||o.id::text,
             'kind','overdue_receivable',
             'priority_score',100,
             'project_id',o.project_id,
             'project_name',o.project,
             'party',o.client,
             'reference',o.invoice_nr,
             'amount',coalesce(o.gross_amount,o.total_price,o.net_amount,0),
             'currency',coalesce(nullif(trim(o.currency),''),'EUR'),
             'due_date',o.due_date,
             'days_overdue',(current_date-o.due_date)::int,
             'recommended_action','Review collection status and prepare a client follow-up if appropriate.',
             'draft_preparation_allowed',true,
             'approval_gates',jsonb_build_array('external_email_send'),
             'execution_allowed',false
           ) item
    from public.invoices_out o
    where coalesce(o.paid,false)=false and o.due_date<current_date

    union all

    select 92,
           jsonb_build_object(
             'attention_id','payable-due:'||i.id::text,
             'kind','payable_missing_due_date',
             'priority_score',92,
             'project_id',i.project_id,
             'project_name',i.project,
             'party',i.supplier,
             'reference',i.supplier_invoice_nr,
             'amount',coalesce(i.amount,0),
             'currency',coalesce(nullif(trim(i.currency),''),'EUR'),
             'recommended_action','Verify payment terms and due date before payment prioritization.',
             'approval_gates','[]'::jsonb,
             'execution_allowed',false
           ) item
    from public.invoices_in i
    where coalesce(i.paid,false)=false and i.due_date is null

    union all

    select 90,
           jsonb_build_object(
             'attention_id','guarantee-expiry:'||g.id::text,
             'kind','bank_guarantee_expiry_review',
             'priority_score',90,
             'project_id',g.project_id,
             'project_name',g.project,
             'bank',g.bank_name,
             'guarantee_type',g.guarantee_type,
             'amount_guaranteed',coalesce(g.amount_guaranteed,0),
             'expiry_date',g.expiry_date,
             'days_to_expiry',(g.expiry_date-current_date)::int,
             'recommended_action','Review guarantee release/extension requirements before expiry.',
             'approval_gates',jsonb_build_array('contract_or_purchase_order_commitment'),
             'execution_allowed',false
           ) item
    from public.bank_guarantees g
    where lower(coalesce(g.status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled')
      and g.expiry_date is not null and g.expiry_date<=current_date+60

    union all

    select 78,
           jsonb_build_object(
             'attention_id','guarantee-link:'||g.id::text,
             'kind','bank_guarantee_project_link_review',
             'priority_score',78,
             'project_id',g.project_id,
             'project_name',g.project,
             'bank',g.bank_name,
             'amount_guaranteed',coalesce(g.amount_guaranteed,0),
             'recommended_action','Reconcile this guarantee with the canonical project before project-level exposure analysis.',
             'approval_gates','[]'::jsonb,
             'execution_allowed',false
           ) item
    from public.bank_guarantees g
    where lower(coalesce(g.status,'')) not in ('closed','released','expired','mbyllur','cancelled','canceled') and g.project_id is null
  ), ranked as (
    select item,priority_score,row_number() over(order by priority_score desc,item->>'attention_id') rn
    from attention_items
  )
  select coalesce(jsonb_agg(item order by priority_score desc,item->>'attention_id'),'[]'::jsonb)
  into v_attention
  from ranked where rn<=v_limit;

  v_attention_count := jsonb_array_length(v_attention);

  return jsonb_build_object(
    'finance_intelligence_version',1,
    'mode','read_only_synthesis',
    'generated_at',now(),
    'as_of_date',current_date,
    'window_days',v_days,
    'cash_balance_available',false,
    'cash_balance_note','No canonical bank-account balance source was identified in the Finance core, so Finance Intelligence v1 does not estimate cash-on-hand.',
    'summary',jsonb_build_object(
      'open_receivable_invoices',v_open_receivable_count,
      'overdue_receivable_invoices',v_overdue_receivable_count,
      'open_supplier_invoices',v_open_payable_count,
      'supplier_invoices_missing_due_date',v_payable_missing_due_count,
      'unpaid_expense_records',v_unpaid_expense_count,
      'open_bank_guarantees',v_open_guarantee_count,
      'uninvoiced_outgoing_milestones',v_invoice_pipeline_count,
      'attention_items',v_attention_count,
      'executions_performed',0
    ),
    'receivables_by_currency',v_receivable_summary,
    'supplier_payables_by_currency',v_payable_summary,
    'unpaid_expense_records_by_currency',v_expense_summary,
    'overdue_receivables',v_overdue_receivables,
    'supplier_invoices_missing_due_date',v_payables_missing_due,
    'unpaid_expense_records',v_expenses_unpaid,
    'bank_guarantees',v_guarantees,
    'outgoing_invoice_pipeline',v_invoice_pipeline,
    'invoice_candidate_statuses',v_candidate_statuses,
    'project_cash_timing',v_project_timing,
    'attention',v_attention,
    'accounting_boundaries',jsonb_build_object(
      'currencies_never_summed_without_conversion',true,
      'outgoing_milestones_are_not_receivables_until_invoiced',true,
      'expense_records_are_not_merged_with_supplier_invoices',true,
      'missing_due_date_is_not_treated_as_overdue',true,
      'cash_balance_not_inferred',true,
      'no_profit_or_margin_inference',true
    ),
    'policy',jsonb_build_object(
      'read_only',true,
      'no_finance_core_mutation',true,
      'no_payment_execution',true,
      'no_invoice_approval',true,
      'no_email_send',true,
      'no_bank_guarantee_change',true,
      'no_price_or_margin_decision',true,
      'protected_human_gates_preserved',true,
      'executions_performed',0
    )
  );
end;
$function$;

revoke all on function public.pppp_chatgpt_finance_intelligence_v1(integer,integer) from public, anon, authenticated;
grant execute on function public.pppp_chatgpt_finance_intelligence_v1(integer,integer) to service_role, supabase_read_only_user;