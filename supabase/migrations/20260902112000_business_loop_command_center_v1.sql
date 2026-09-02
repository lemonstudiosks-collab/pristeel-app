-- PPPP business loop stabilization v1
-- Goals: promote high-confidence new client RFQs, track supplier waits,
-- and expose compact low-egress business state for PPPP/ChatGPT.

create or replace function public.pppp_extract_strong_rfq_ref_v1(p_subject text)
returns text
language plpgsql
immutable
security invoker
set search_path = pg_catalog, public
as $$
declare
  m text[];
  token text;
begin
  m := regexp_match(coalesce(p_subject,''), '\m(ANF)[[:space:]-]*([0-9]{3,})\M', 'i');
  if m is not null then
    return upper(m[1]) || '-' || m[2];
  end if;

  m := regexp_match(coalesce(p_subject,''), '\m(RFQ|RFP)[[:space:]#:/-]*([A-Z0-9._/-]*[0-9][A-Z0-9._/-]*)', 'i');
  if m is not null then
    token := upper(regexp_replace(coalesce(m[2],''), '^[#:/ -]+|[#:/ -]+$', '', 'g'));
    if length(token) >= 3 then
      return upper(m[1]) || '-' || token;
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.pppp_extract_strong_rfq_ref_v1(text) from public, anon;
grant execute on function public.pppp_extract_strong_rfq_ref_v1(text) to authenticated, service_role;

create or replace function public.pppp_promote_new_client_rfq_v1(
  p_apply boolean default false,
  p_limit integer default 25
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_project_id uuid;
  v_existing_project_id uuid;
  v_company text;
  v_ref text;
  v_compact_ref text;
  v_name text;
  v_linked integer := 0;
  v_created integer := 0;
  v_existing_linked integer := 0;
  v_review integer := 0;
  v_candidates integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  for r in
    with base as (
      select e.*,
             public.pppp_extract_strong_rfq_ref_v1(e.subject) as strong_ref,
             row_number() over (
               partition by e.gmail_thread_id, public.pppp_extract_strong_rfq_ref_v1(e.subject)
               order by e.sent_at asc, e.id asc
             ) as rn
      from public.project_emails e
      where e.project_id is null
        and e.direction = 'incoming'
        and e.sent_at >= now() - interval '3 days'
        and public.pppp_extract_strong_rfq_ref_v1(e.subject) is not null
    )
    select * from base
    where rn = 1
    order by sent_at asc
    limit greatest(1, least(coalesce(p_limit,25),100))
  loop
    v_candidates := v_candidates + 1;
    v_ref := r.strong_ref;
    v_compact_ref := regexp_replace(lower(v_ref), '[^a-z0-9]+', '', 'g');
    v_project_id := null;
    v_existing_project_id := null;
    v_company := null;

    -- If this thread was linked by another process between selection and handling,
    -- reuse that project and never create a duplicate.
    select e.project_id
      into v_existing_project_id
    from public.project_emails e
    where e.gmail_thread_id = r.gmail_thread_id
      and e.project_id is not null
    order by e.sent_at asc
    limit 1;

    -- Exact business reference wins even for a terminal project: a later message
    -- about the same RFQ belongs to the same project rather than a new one.
    if v_existing_project_id is null then
      select p.id
        into v_existing_project_id
      from public.projects p
      where regexp_replace(lower(coalesce(p.ref,'')), '[^a-z0-9]+', '', 'g') = v_compact_ref
         or regexp_replace(lower(coalesce(p.business_ref,'')), '[^a-z0-9]+', '', 'g') = v_compact_ref
         or exists (
              select 1 from unnest(coalesce(p.identity_aliases,'{}'::text[])) a
              where regexp_replace(lower(a), '[^a-z0-9]+', '', 'g') = v_compact_ref
            )
      order by p.created_at desc
      limit 1;
    end if;

    if v_existing_project_id is not null then
      if p_apply then
        update public.project_emails e
           set project_id = v_existing_project_id,
               suggested_project_id = v_existing_project_id,
               match_method = 'strong-rfq-ref-auto-v1',
               match_confidence = 100,
               needs_review = false,
               review_reason = null,
               updated_at = now()
         where e.gmail_thread_id = r.gmail_thread_id
           and e.project_id is null;
        get diagnostics v_linked = row_count;
        insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at,updated_at)
        select v_existing_project_id::text,e.gmail_message_id,e.gmail_thread_id,'strong-rfq-ref-auto-v1',100,now(),now()
        from public.project_emails e
        where e.gmail_thread_id = r.gmail_thread_id
          and e.gmail_message_id is not null
        on conflict (gmail_message_id,project_id) do update
          set gmail_thread_id=excluded.gmail_thread_id,link_method=excluded.link_method,confidence=excluded.confidence,updated_at=now();
      end if;
      v_existing_linked := v_existing_linked + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('ref',v_ref,'thread_id',r.gmail_thread_id,'action','linked_existing','project_id',v_existing_project_id));
      continue;
    end if;

    -- New project auto-creation is deliberately narrow: the exact sender must be
    -- a saved client contact. Unknown/new-company RFQs are surfaced for review.
    select c.company
      into v_company
    from public.contacts c
    where lower(coalesce(c.email,'')) = lower(coalesce(r.from_email,''))
      and lower(coalesce(c.kind,'')) = 'client'
      and btrim(coalesce(c.company,'')) <> ''
    order by case when lower(c.company) ~ '^[a-z0-9.-]+\.[a-z]{2,}$' then 1 else 0 end,
             length(c.company) desc
    limit 1;

    if v_company is null then
      if p_apply then
        update public.project_emails e
           set needs_review = true,
               match_method = 'new-rfq-review-v1',
               match_confidence = 70,
               review_reason = 'RFQ/reference e re u identifikua, por dërguesi nuk është kontakt klienti i verifikuar.',
               updated_at = now()
         where e.gmail_thread_id = r.gmail_thread_id
           and e.project_id is null;
      end if;
      v_review := v_review + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('ref',v_ref,'thread_id',r.gmail_thread_id,'action','review_new_company','from_email',r.from_email));
      continue;
    end if;

    if not p_apply then
      v_created := v_created + 1;
      v_items := v_items || jsonb_build_array(jsonb_build_object('ref',v_ref,'thread_id',r.gmail_thread_id,'action','would_create','client',v_company,'subject',r.subject));
      continue;
    end if;

    perform pg_advisory_xact_lock(hashtext(lower(v_company)||'|'||v_compact_ref));

    -- Recheck under the advisory lock for idempotency.
    select p.id into v_existing_project_id
    from public.projects p
    where regexp_replace(lower(coalesce(p.ref,'')), '[^a-z0-9]+', '', 'g') = v_compact_ref
       or regexp_replace(lower(coalesce(p.business_ref,'')), '[^a-z0-9]+', '', 'g') = v_compact_ref
       or exists (
            select 1 from unnest(coalesce(p.identity_aliases,'{}'::text[])) a
            where regexp_replace(lower(a), '[^a-z0-9]+', '', 'g') = v_compact_ref
          )
    order by p.created_at desc
    limit 1;

    if v_existing_project_id is not null then
      v_project_id := v_existing_project_id;
    else
      v_name := regexp_replace(coalesce(r.subject,v_company||' — '||v_ref), '^\s*((re|fw|fwd|aw|wg)\s*:\s*)+', '', 'i');
      insert into public.projects(
        name,client,ref,business_ref,status,pipeline_stage,operational_state,
        operational_state_at,operational_state_source,origin_type,work_model,
        identity_aliases,last_email_at,last_activity_at,notes
      ) values (
        left(v_name,500),v_company,v_ref,v_ref,'pritje','rfq_in','action_required',
        now(),'project-discovery-gmail-rfq-v1','gmail_rfq','client_rfq',
        array[v_ref],r.sent_at,r.sent_at,
        'PPPP: projekt i krijuar automatikisht nga RFQ e re e një klienti të verifikuar. Human approval mbetet i detyrueshëm për ofertë/dërgim.'
      ) returning id into v_project_id;
      v_created := v_created + 1;
    end if;

    update public.project_emails e
       set project_id = v_project_id,
           suggested_project_id = v_project_id,
           match_method = 'new-client-rfq-auto-v1',
           match_confidence = 100,
           needs_review = false,
           review_reason = null,
           updated_at = now()
     where e.gmail_thread_id = r.gmail_thread_id
       and e.project_id is null;
    get diagnostics v_linked = row_count;

    insert into public.project_email_links(project_id,gmail_message_id,gmail_thread_id,link_method,confidence,created_at,updated_at)
    select v_project_id::text,e.gmail_message_id,e.gmail_thread_id,'new-client-rfq-auto-v1',100,now(),now()
    from public.project_emails e
    where e.gmail_thread_id = r.gmail_thread_id
      and e.gmail_message_id is not null
    on conflict (gmail_message_id,project_id) do update
      set gmail_thread_id=excluded.gmail_thread_id,link_method=excluded.link_method,confidence=excluded.confidence,updated_at=now();

    update public.projects p
       set last_email_at = greatest(coalesce(p.last_email_at,'epoch'::timestamptz),(select max(e.sent_at) from public.project_emails e where e.project_id=v_project_id)),
           last_activity_at = greatest(coalesce(p.last_activity_at,'epoch'::timestamptz),(select max(e.sent_at) from public.project_emails e where e.project_id=v_project_id))
     where p.id=v_project_id;

    v_items := v_items || jsonb_build_array(jsonb_build_object('ref',v_ref,'thread_id',r.gmail_thread_id,'action','created','project_id',v_project_id,'client',v_company,'linked_messages',v_linked));
  end loop;

  return jsonb_build_object(
    'apply',p_apply,'candidates',v_candidates,'projects_created',v_created,
    'existing_projects_linked',v_existing_linked,'review_required',v_review,'items',v_items
  );
end;
$$;

revoke all on function public.pppp_promote_new_client_rfq_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_promote_new_client_rfq_v1(boolean,integer) to service_role;

create or replace function public.pppp_reconcile_supplier_waits_v1(p_apply boolean default false, p_limit integer default 100)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  r record;
  v_replied_at timestamptz;
  v_source_ref text;
  v_opened integer := 0;
  v_closed integer := 0;
  v_checked integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  for r in
    with supplier_outgoing as (
      select distinct on (e.project_id, lower(c.email))
             e.project_id,e.gmail_message_id,e.sent_at,c.email,c.company,p.name as project_name,p.status,p.pipeline_stage,p.operational_state
      from public.project_emails e
      cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) recipient(email)
      join public.contacts c on lower(c.email)=lower(recipient.email) and lower(coalesce(c.kind,''))='supplier'
      join public.projects p on p.id=e.project_id
      where e.project_id is not null
        and e.direction='outgoing'
        and e.sent_at >= now()-interval '14 days'
        and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
      order by e.project_id,lower(c.email),e.sent_at desc
    )
    select * from supplier_outgoing
    order by sent_at desc
    limit greatest(1,least(coalesce(p_limit,100),300))
  loop
    v_checked := v_checked + 1;
    v_source_ref := 'project:'||r.project_id::text||':supplier:'||lower(r.email);
    select max(e.sent_at) into v_replied_at
    from public.project_emails e
    where e.project_id=r.project_id
      and e.direction='incoming'
      and lower(coalesce(e.from_email,''))=lower(r.email)
      and e.sent_at>r.sent_at;

    if v_replied_at is not null then
      if p_apply then
        update public.tasks
           set status='kryer',done_at=coalesce(done_at,now())
         where source='supplier_wait_auto'
           and source_ref=v_source_ref
           and status not in ('kryer','mbyllur','done','closed');
        if found then v_closed := v_closed + 1; end if;
      end if;
      v_items := v_items || jsonb_build_array(jsonb_build_object('project_id',r.project_id,'supplier',r.company,'action','supplier_replied','reply_at',v_replied_at));
      continue;
    end if;

    if p_apply then
      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref)
      values(
        r.project_id,
        'Presim kalkulimin nga '||coalesce(nullif(r.company,''),r.email)||' — '||r.project_name,
        'PPPP: dokumentet/RFQ i janë dërguar furnitorit më '||to_char(r.sent_at at time zone 'Europe/Belgrade','YYYY-MM-DD HH24:MI')||'. Ende nuk ka përgjigje të lidhur me projektin. Follow-up vetëm kur të vijë afati.',
        (r.sent_at at time zone 'Europe/Belgrade')::date + 2,
        'larte','hapur','supplier_wait_auto',r.email,'furnitor',v_source_ref
      )
      on conflict (source,source_ref) do update
        set project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,
            due_date=excluded.due_date,priority=excluded.priority,contact_email=excluded.contact_email,
            category=excluded.category,
            status=case when public.tasks.status in ('kryer','mbyllur','done','closed') then 'hapur' else public.tasks.status end,
            done_at=case when public.tasks.status in ('kryer','mbyllur','done','closed') then null else public.tasks.done_at end;

      update public.projects
         set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing' else pipeline_stage end,
             operational_state=case when operational_state in ('wait_for_client','execution') then operational_state else 'active_work' end,
             operational_state_at=case when operational_state in ('wait_for_client','execution') then operational_state_at else now() end,
             operational_state_source=case when operational_state in ('wait_for_client','execution') then operational_state_source else 'supplier-wait-auto-v1' end
       where id=r.project_id;

      update public.tasks
         set status='kryer',done_at=coalesce(done_at,now())
       where project_id=r.project_id
         and source='project_discovery_auto'
         and status='hapur';
      v_opened := v_opened + 1;
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('project_id',r.project_id,'supplier',r.company,'supplier_email',r.email,'action','waiting_supplier','sent_at',r.sent_at));
  end loop;

  return jsonb_build_object('apply',p_apply,'checked',v_checked,'waiting_opened_or_refreshed',v_opened,'closed_on_reply',v_closed,'items',v_items);
end;
$$;

revoke all on function public.pppp_reconcile_supplier_waits_v1(boolean,integer) from public, anon, authenticated;
grant execute on function public.pppp_reconcile_supplier_waits_v1(boolean,integer) to service_role;

create or replace function public.pppp_command_center_v1(p_limit integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
with base as (
  select p.*,
         sw.title as supplier_wait_title,sw.due_date as supplier_wait_due,sw.contact_email as supplier_wait_email,
         t.title as task_title,t.due_date as task_due,t.priority as task_priority,t.category as task_category,t.source as task_source,
         em.subject as last_email_subject,em.direction as last_email_direction,em.from_email as last_email_from,em.sent_at as last_email_at_live,
         case p.pipeline_stage
           when 'rfq_in' then 20 when 'technical_review' then 32 when 'supplier_selection' then 42
           when 'pricing' then 55 when 'client_offer' then 72 when 'commercial' then 86
           when 'production_control' then 100 when 'factory_audit' then 100 when 'transport' then 100 else 15 end
         + case when coalesce(p.last_email_at,p.last_activity_at,p.updated_at,p.created_at) >= now()-interval '3 days' then 6 else 0 end
         as momentum_score,
         case
           when lower(coalesce(p.status,'')) in ('fituar','won') or p.operational_state='execution' then 'EXECUTION'
           when sw.title is not null then 'WAITING_SUPPLIER'
           when p.operational_state='wait_for_client' then 'WAITING_CLIENT'
           when p.operational_state='action_required' then 'ACTION_NOW'
           when p.pipeline_stage='client_offer' then 'QUOTE_SENT'
           when p.pipeline_stage='pricing' then 'QUOTE_IN_PREPARATION'
           when p.pipeline_stage='rfq_in' then 'NEW_RFQ'
           else 'ACTIVE' end as work_lane,
         case
           when p.operational_state='action_required' then 100
           when t.due_date is not null and t.due_date<current_date then 95
           when sw.due_date is not null and sw.due_date<=current_date then 90
           when p.pipeline_stage='pricing' then 78
           when p.pipeline_stage='rfq_in' then 72
           when p.operational_state='wait_for_client' and coalesce(p.last_email_at,p.last_activity_at,p.updated_at,p.created_at)<now()-interval '7 days' then 68
           when sw.title is not null then 55
           when p.operational_state='execution' then 50
           else 40 end as attention_score
  from public.projects p
  left join lateral (
    select x.title,x.due_date,x.contact_email
    from public.tasks x
    where x.project_id=p.id and x.source='supplier_wait_auto' and x.status not in ('kryer','mbyllur','done','closed')
    order by x.due_date asc nulls last,x.created_at desc limit 1
  ) sw on true
  left join lateral (
    select x.title,x.due_date,x.priority,x.category,x.source
    from public.tasks x
    where x.project_id=p.id and x.status not in ('kryer','mbyllur','done','closed')
    order by case when x.due_date<current_date then 0 when x.due_date=current_date then 1 else 2 end,
             x.due_date asc nulls last,x.created_at desc limit 1
  ) t on true
  left join lateral (
    select e.subject,e.direction,e.from_email,e.sent_at
    from public.project_emails e
    where e.project_id=p.id
    order by e.sent_at desc nulls last limit 1
  ) em on true
  where lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
), ranked as (
  select *,
         case
           when work_lane='WAITING_SUPPLIER' then coalesce(task_title,supplier_wait_title,'Presim furnitorin')
           when work_lane='WAITING_CLIENT' then coalesce(task_title,'Presim përgjigjen e klientit; follow-up vetëm sipas afatit.')
           when work_lane='EXECUTION' then coalesce(task_title,'Vazhdo veprimin e ardhshëm të ekzekutimit.')
           when task_title is not null then task_title
           when work_lane='QUOTE_IN_PREPARATION' then 'Përfundo kalkulimin dhe draft-ofertën.'
           when work_lane='QUOTE_SENT' then 'Monitoro përgjigjen e klientit dhe afatin e follow-up-it.'
           when work_lane='NEW_RFQ' then 'Analizo dokumentet dhe përcakto kalkulimin/partnerin.'
           else 'Shqyrto aktivitetin e fundit dhe cakto veprimin e ardhshëm.' end as next_action
  from base
  order by attention_score desc,momentum_score desc,coalesce(last_email_at,last_activity_at,updated_at,created_at) desc
  limit greatest(1,least(coalesce(p_limit,30),100))
)
select coalesce(jsonb_agg(jsonb_build_object(
  'project_id',id,'project',name,'client',client,'ref',coalesce(business_ref,ref),
  'status',status,'pipeline_stage',pipeline_stage,'work_lane',work_lane,
  'attention_score',attention_score,'momentum_score',least(momentum_score,100),
  'next_action',next_action,'due_date',coalesce(task_due,supplier_wait_due),
  'supplier_wait_email',supplier_wait_email,
  'last_email',case when last_email_subject is null then null else jsonb_build_object('subject',last_email_subject,'direction',last_email_direction,'from',last_email_from,'sent_at',last_email_at_live) end,
  'last_activity_at',coalesce(last_email_at,last_activity_at,updated_at,created_at)
) order by attention_score desc,momentum_score desc), '[]'::jsonb)
from ranked;
$$;

revoke all on function public.pppp_command_center_v1(integer) from public, anon;
grant execute on function public.pppp_command_center_v1(integer) to authenticated, service_role;

create or replace function public.pppp_project_brief_v1(p_project_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
select jsonb_build_object(
  'project',(select to_jsonb(p) from (select id,name,client,ref,business_ref,status,pipeline_stage,operational_state,origin_type,work_model,last_activity_at,last_email_at,updated_at from public.projects where id=p_project_id) p),
  'open_tasks',coalesce((select jsonb_agg(to_jsonb(t) order by t.due_date asc nulls last,t.created_at desc) from (select id,title,detail,due_date,priority,status,source,category,contact_email,created_at from public.tasks where project_id=p_project_id and status not in ('kryer','mbyllur','done','closed') order by due_date asc nulls last,created_at desc limit 12) t),'[]'::jsonb),
  'recent_emails',coalesce((select jsonb_agg(to_jsonb(e) order by e.sent_at desc) from (select gmail_message_id,gmail_thread_id,from_email,subject,snippet,sent_at,direction,has_attachments from public.project_emails where project_id=p_project_id order by sent_at desc limit 8) e),'[]'::jsonb),
  'latest_analysis',(select jsonb_build_object('analysis',a.analysis,'created_at',a.created_at,'model',a.model) from public.project_analyses a where a.project_id=p_project_id and a.status='complete' order by a.created_at desc limit 1)
);
$$;

revoke all on function public.pppp_project_brief_v1(uuid) from public, anon;
grant execute on function public.pppp_project_brief_v1(uuid) to authenticated, service_role;

-- Use existing 5-minute business intake cadence, but insert two bounded DB-local
-- incremental steps before the existing edge-function reconciliation.
update cron.job
set command = $$
select public.pppp_promote_new_client_rfq_v1(true,25);
select public.pppp_reconcile_supplier_waits_v1(true,100);
select private.gmail_ted_sales_reconcile_internal_request(150);
select public.pppp_reconcile_email_context_v1(3);
select public.pppp_enqueue_automation_http_v1(
  'gmail-project-intake',
  'https://isymxqfqzkchbsrbhucf.supabase.co/functions/v1/gmail-project-intake?days=1&limit=120',
  'gmail_tracker_cron_secret',120000,3
);
$$
where jobname='gmail-project-intake-5m';
