-- Preserve the production-verified supplier wait reconciler hardening after the
-- concurrent supplier role/state guard merge. The dedicated task trigger remains
-- the primary insertion/update guard; this reconciler check is defense in depth.
-- No external send, supplier selection, pricing, contract/PO or disposition gate changes.

create or replace function public.pppp_reconcile_supplier_waits_v1(
  p_apply boolean default false,
  p_limit integer default 100
)
returns jsonb
language plpgsql
set search_path to 'pg_catalog','public'
as $$
declare
  r record;
  v_replied_at timestamptz;
  v_source_ref text;
  v_opened integer := 0;
  v_closed integer := 0;
  v_closed_lifecycle integer := 0;
  v_checked integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  if p_apply then
    update public.tasks t
       set status='mbyllur',
           done_at=coalesce(t.done_at,now()),
           detail=case
             when position('PPPP: supplier-wait lifecycle closed' in coalesce(t.detail,''))>0 then t.detail
             else concat_ws(E'\n',nullif(t.detail,''),
               'PPPP: supplier-wait lifecycle closed — gjendja kanonike e projektit nuk është më pritje aktive e furnitorit.')
           end
      from public.projects p
     where p.id=t.project_id
       and t.source='supplier_wait_auto'
       and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar','archived')
       and lower(coalesce(p.operational_state,'')) in ('wait_for_client','execution');
    get diagnostics v_closed_lifecycle = row_count;
  end if;

  for r in
    with supplier_outgoing as (
      select distinct on (e.project_id, lower(pc.email))
             e.project_id,e.gmail_message_id,e.sent_at,pc.email,
             sp.name as company,p.name as project_name,p.status,p.pipeline_stage,
             p.operational_state,sp.importance
      from public.project_emails e
      cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) recipient(email)
      join public.partner_contacts pc
        on lower(coalesce(pc.email,''))=lower(recipient.email)
      join public.partners sp
        on sp.id=pc.partner_id
       and sp.stage='active'
       and coalesce(sp.relation,'{}'::text[]) @> array['supplier']::text[]
      join public.projects p on p.id=e.project_id
      where e.project_id is not null
        and e.direction='outgoing'
        and e.sent_at >= now()-interval '14 days'
        and e.sent_at <= now()+interval '5 minutes'
        and lower(coalesce(p.status,'')) not in
            ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
      order by e.project_id,lower(pc.email),e.sent_at desc,sp.importance desc nulls last
    )
    select * from supplier_outgoing
    order by sent_at desc
    limit greatest(1,least(coalesce(p_limit,100),300))
  loop
    v_checked := v_checked + 1;
    v_source_ref := 'project:'||r.project_id::text||':supplier:'||lower(r.email);

    if lower(coalesce(r.operational_state,'')) in ('wait_for_client','execution') then
      if p_apply then
        update public.tasks
           set status='mbyllur',
               done_at=coalesce(done_at,now()),
               detail=case
                 when position('PPPP: supplier-wait lifecycle closed' in coalesce(detail,''))>0 then detail
                 else concat_ws(E'\n',nullif(detail,''),
                   'PPPP: supplier-wait lifecycle closed — gjendja kanonike e projektit nuk është më pritje aktive e furnitorit.')
               end
         where source='supplier_wait_auto'
           and source_ref=v_source_ref
           and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed','arkivuar','archived');
        if found then v_closed_lifecycle := v_closed_lifecycle + 1; end if;
      end if;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'project_id',r.project_id,'supplier',r.company,
        'action','lifecycle_superseded','operational_state',r.operational_state
      ));
      continue;
    end if;

    select max(e.sent_at) into v_replied_at
    from public.project_emails e
    where e.project_id=r.project_id
      and e.direction='incoming'
      and lower(coalesce(e.from_email,''))=lower(r.email)
      and e.sent_at>r.sent_at
      and e.sent_at <= now()+interval '5 minutes';

    if v_replied_at is not null then
      if p_apply then
        update public.tasks
           set status='kryer',done_at=coalesce(done_at,now())
         where source='supplier_wait_auto'
           and source_ref=v_source_ref
           and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
        if found then v_closed := v_closed + 1; end if;
      end if;
      v_items := v_items || jsonb_build_array(jsonb_build_object(
        'project_id',r.project_id,'supplier',r.company,
        'action','supplier_replied','reply_at',v_replied_at
      ));
      continue;
    end if;

    if p_apply then
      insert into public.tasks(
        project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref
      )
      values(
        r.project_id,
        'Presim kalkulimin nga '||coalesce(nullif(r.company,''),r.email)||' — '||r.project_name,
        'PPPP: dokumentet/RFQ i janë dërguar furnitorit më '||
          to_char(r.sent_at at time zone 'Europe/Belgrade','YYYY-MM-DD HH24:MI')||
          '. Ende nuk ka përgjigje të lidhur me projektin. Follow-up vetëm kur të vijë afati.',
        (r.sent_at at time zone 'Europe/Belgrade')::date + 2,
        'larte','hapur','supplier_wait_auto',r.email,'furnitor',v_source_ref
      )
      on conflict (source,source_ref) do update
        set project_id=excluded.project_id,
            title=excluded.title,
            detail=excluded.detail,
            due_date=excluded.due_date,
            priority=excluded.priority,
            contact_email=excluded.contact_email,
            category=excluded.category,
            status=case
              when public.tasks.status in ('kryer','mbyllur','done','closed') then 'hapur'
              else public.tasks.status
            end,
            done_at=case
              when public.tasks.status in ('kryer','mbyllur','done','closed') then null
              else public.tasks.done_at
            end;

      update public.projects
         set pipeline_stage=case
               when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing'
               else pipeline_stage
             end,
             operational_state=case
               when operational_state in ('wait_for_client','execution') then operational_state
               else 'active_work'
             end,
             operational_state_at=case
               when operational_state in ('wait_for_client','execution') then operational_state_at
               when operational_state is distinct from 'active_work'
                 or operational_state_source is distinct from 'supplier-wait-auto-v1' then now()
               else operational_state_at
             end,
             operational_state_source=case
               when operational_state in ('wait_for_client','execution') then operational_state_source
               else 'supplier-wait-auto-v1'
             end
       where id=r.project_id;

      update public.tasks
         set status='kryer',done_at=coalesce(done_at,now())
       where project_id=r.project_id
         and source='project_discovery_auto'
         and status='hapur';
      v_opened := v_opened + 1;
    end if;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'project_id',r.project_id,'supplier',r.company,'supplier_email',r.email,
      'action','waiting_supplier','sent_at',r.sent_at
    ));
  end loop;

  return jsonb_build_object(
    'apply',p_apply,
    'checked',v_checked,
    'waiting_opened_or_refreshed',v_opened,
    'closed_on_reply',v_closed,
    'closed_on_lifecycle',v_closed_lifecycle,
    'items',v_items
  );
end;
$$;

comment on function public.pppp_reconcile_supplier_waits_v1(boolean,integer) is
  'Reconciles verified supplier waits; canonical wait_for_client/execution state supersedes stale supplier-wait actions. Dedicated task guard remains the primary prevention layer.';
