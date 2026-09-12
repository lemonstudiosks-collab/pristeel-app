-- PPPP supplier state/role alignment v1
-- Scope: backend task guards only. No UI, pricing, supplier selection, email send,
-- contract/PO or project disposition approval gate is changed.
--
-- 1) Prevent supplier_wait_auto tasks from remaining/reopening after the project
--    has moved to wait_for_client, execution or a terminal lifecycle state.
-- 2) Classify incoming supplier-email tasks from canonical project/supplier
--    contact data before falling back to historical offer-name heuristics.

create or replace function public.pppp_supplier_wait_state_guard_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
declare
  v_state text;
  v_status text;
begin
  if new.project_id is null or lower(coalesce(new.source,'')) <> 'supplier_wait_auto' then
    return new;
  end if;

  select lower(coalesce(p.operational_state,'')), lower(coalesce(p.status,''))
    into v_state,v_status
  from public.projects p
  where p.id=new.project_id;

  if v_state in ('wait_for_client','execution','closed')
     or v_status in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar','fituar','won') then
    if tg_op='INSERT' then
      return null;
    end if;
    new.status:='mbyllur';
    new.done_at:=coalesce(new.done_at,now());
    if position('PPPP: supplier-wait-state-closed —' in coalesce(new.detail,''))=0 then
      new.detail:=concat_ws(E'\n',nullif(new.detail,''),
        'PPPP: supplier-wait-state-closed — pritja e furnitorit nuk është më veprimi aktual në gjendjen kanonike të projektit.');
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.pppp_supplier_wait_state_guard_v1() from public,anon,authenticated;
grant execute on function public.pppp_supplier_wait_state_guard_v1() to service_role;

drop trigger if exists aa_pppp_supplier_wait_state_guard_v1 on public.tasks;
create trigger aa_pppp_supplier_wait_state_guard_v1
before insert or update of project_id,source,status,detail,contact_email
on public.tasks
for each row execute function public.pppp_supplier_wait_state_guard_v1();

create or replace function public.pppp_supplier_task_role_guard()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
declare
  v_sender_name text;
  v_sender_email text;
  v_supplier text;
begin
  if new.source <> 'email_request_auto' or new.project_id is null or coalesce(new.source_ref,'')='' then
    return new;
  end if;

  select pe.from_name,pe.from_email into v_sender_name,v_sender_email
  from public.project_emails pe
  where pe.gmail_message_id=new.source_ref and pe.direction='incoming'
  limit 1;
  if v_sender_name is null and v_sender_email is null then return new; end if;

  -- Project-specific client evidence vetoes global supplier inference for the
  -- same email address. This keeps ambiguous/multi-role contacts human-safe.
  if exists(
    select 1 from public.project_contacts pc
    where pc.project_id=new.project_id::text
      and lower(coalesce(pc.email,''))=lower(coalesce(v_sender_email,''))
      and lower(coalesce(pc.role,''))='client'
  ) then
    return new;
  end if;

  -- An explicit supplier role on this project is the strongest positive signal.
  select coalesce(nullif(btrim(pc.company),''),nullif(btrim(pc.name),''),nullif(btrim(pc.email),''))
    into v_supplier
  from public.project_contacts pc
  where pc.project_id=new.project_id::text
    and lower(coalesce(pc.email,''))=lower(coalesce(v_sender_email,''))
    and lower(coalesce(pc.role,''))='supplier'
  order by coalesce(pc.is_primary,false) desc,pc.last_seen desc nulls last,pc.id desc
  limit 1;

  -- If the project has no explicit supplier role, use the canonical active
  -- supplier master by exact email address.
  if v_supplier is null then
    select p.name into v_supplier
    from public.partner_contacts pc
    join public.partners p on p.id=pc.partner_id
    where lower(coalesce(pc.email,''))=lower(coalesce(v_sender_email,''))
      and p.stage='active'
      and coalesce(p.relation,'{}'::text[]) @> array['supplier']::text[]
    order by coalesce(pc.is_primary,false) desc,p.importance desc nulls last,p.name
    limit 1;
  end if;

  -- Preserve the established offer-based fallback for historical contacts that
  -- have not yet been normalized into either canonical contact table.
  if v_supplier is null then
    select o.supplier into v_supplier
    from public.offers o
    where o.project_id=new.project_id
      and (
        lower(coalesce(v_sender_name,''))=lower(coalesce(o.contact_person,''))
        or lower(coalesce(v_sender_name,'')) like '%'||lower(coalesce(o.supplier,''))||'%'
        or lower(coalesce(o.supplier,'')) like '%'||lower(coalesce(v_sender_name,''))||'%'
        or regexp_replace(lower(split_part(coalesce(v_sender_email,''),'@',1)),'[^a-z0-9]','','g') like '%'||regexp_replace(lower(coalesce(o.supplier,'')),'[^a-z0-9]','','g')||'%'
      )
    order by o.created_at desc
    limit 1;
  end if;

  if v_supplier is not null then
    new.source := 'supplier_update_auto';
    new.category := 'furnitor';
    new.title := 'Rishiko update-in e furnitorit — '||v_supplier;
    if position('Email furnitori i lidhur me projektin; nuk është kërkesë klienti.' in coalesce(new.detail,''))=0 then
      new.detail := concat_ws(E'\n','Email furnitori i lidhur me projektin; nuk është kërkesë klienti.',new.detail);
    end if;
    if lower(coalesce(new.priority,'')) in ('mesatare','normal') then new.priority:='e larte'; end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_supplier_task_role_guard() from public,anon,authenticated;
grant execute on function public.pppp_supplier_task_role_guard() to service_role;

-- One-time cleanup of only states/roles that are already proven by canonical
-- project state or exact supplier-contact evidence.
update public.tasks t
set status='mbyllur',
    done_at=coalesce(t.done_at,now()),
    detail=case
      when position('PPPP: supplier-wait-state-closed —' in coalesce(t.detail,''))>0 then t.detail
      else concat_ws(E'\n',nullif(t.detail,''),
        'PPPP: supplier-wait-state-closed — pritja e furnitorit nuk është më veprimi aktual në gjendjen kanonike të projektit.')
    end
from public.projects p
where p.id=t.project_id
  and t.source='supplier_wait_auto'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar','archived')
  and (
    lower(coalesce(p.operational_state,'')) in ('wait_for_client','execution','closed')
    or lower(coalesce(p.status,'')) in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar','fituar','won')
  );

-- Re-run the role guard only for currently open email_request_auto rows whose
-- sender is already proven as a supplier by exact canonical contact evidence.
-- Avoid changing a row when its target (source,source_ref) identity already exists.
update public.tasks t
set source=t.source
where t.source='email_request_auto'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and t.project_id is not null
  and coalesce(t.source_ref,'')<>''
  and not exists(
    select 1 from public.tasks x
    where x.id<>t.id and x.source='supplier_update_auto' and x.source_ref=t.source_ref
  )
  and exists(
    select 1
    from public.project_emails e
    where e.gmail_message_id=t.source_ref
      and e.direction='incoming'
      and not exists(
        select 1 from public.project_contacts pc
        where pc.project_id=t.project_id::text
          and lower(coalesce(pc.email,''))=lower(coalesce(e.from_email,''))
          and lower(coalesce(pc.role,''))='client'
      )
      and (
        exists(
          select 1 from public.project_contacts pc
          where pc.project_id=t.project_id::text
            and lower(coalesce(pc.email,''))=lower(coalesce(e.from_email,''))
            and lower(coalesce(pc.role,''))='supplier'
        )
        or exists(
          select 1
          from public.partner_contacts pc
          join public.partners p on p.id=pc.partner_id
          where lower(coalesce(pc.email,''))=lower(coalesce(e.from_email,''))
            and p.stage='active'
            and coalesce(p.relation,'{}'::text[]) @> array['supplier']::text[]
        )
      )
  );

comment on function public.pppp_supplier_wait_state_guard_v1() is
  'Prevents supplier_wait_auto tasks from remaining/reopening after canonical project state has moved beyond supplier waiting.';
comment on function public.pppp_supplier_task_role_guard() is
  'Classifies email_request_auto supplier messages from project-specific/canonical supplier contacts, with offer matching retained only as fallback.';
