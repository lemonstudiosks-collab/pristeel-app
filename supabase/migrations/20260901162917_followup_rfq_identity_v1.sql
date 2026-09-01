create or replace function public.pppp_followup_rfq_identity_guard_v1()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_sent_date date;
  v_rfq_id uuid;
  v_ref text;
  v_existing_id uuid;
begin
  if lower(coalesce(new.source,'')) not in ('sla_auto','auto_followup')
     or new.project_id is null
     or btrim(coalesce(new.contact_email,'')) = '' then
    return new;
  end if;

  begin
    v_sent_date := nullif(substring(coalesce(new.detail,'') from '(20[0-9]{2}-[0-9]{2}-[0-9]{2})'),'')::date;
  exception when others then
    v_sent_date := null;
  end;

  select r.id
    into v_rfq_id
  from public.rfq_log r
  where r.project_id = new.project_id
    and lower(coalesce(r.supplier_email,'')) = lower(new.contact_email)
    and lower(coalesce(r.status,'')) = 'sent'
    and r.sent_at is not null
    and r.replied_at is null
  order by case when v_sent_date is not null and r.sent_at::date = v_sent_date then 0 else 1 end,
           r.sent_at desc,
           r.id desc
  limit 1;

  if v_rfq_id is null then
    return new;
  end if;

  v_ref := 'RFQ:' || v_rfq_id::text;

  select t.id
    into v_existing_id
  from public.tasks t
  where t.project_id = new.project_id
    and lower(coalesce(t.contact_email,'')) = lower(new.contact_email)
    and lower(coalesce(t.source,'')) in ('sla_auto','auto_followup')
    and (
      t.source_ref = v_ref
      or (
        t.source_ref is null
        and (
          v_sent_date is null
          or nullif(substring(coalesce(t.detail,'') from '(20[0-9]{2}-[0-9]{2}-[0-9]{2})'),'')::date = v_sent_date
        )
      )
    )
  order by case when t.status = 'hapur' then 0 else 1 end,
           t.created_at desc,
           t.id desc
  limit 1;

  if v_existing_id is not null then
    update public.tasks
       set title = new.title,
           detail = new.detail,
           due_date = new.due_date,
           priority = new.priority,
           status = new.status,
           done_at = new.done_at,
           contact_email = new.contact_email,
           category = new.category,
           source_ref = v_ref
     where id = v_existing_id;
    return null;
  end if;

  new.source_ref := v_ref;
  return new;
end;
$$;

revoke execute on function public.pppp_followup_rfq_identity_guard_v1() from public, anon, authenticated;

drop trigger if exists zz_pppp_followup_rfq_identity_guard_v1 on public.tasks;
create trigger zz_pppp_followup_rfq_identity_guard_v1
before insert on public.tasks
for each row execute function public.pppp_followup_rfq_identity_guard_v1();

with task_map as (
  select t.id,
         (
           select r.id
           from public.rfq_log r
           where r.project_id = t.project_id
             and lower(coalesce(r.supplier_email,'')) = lower(coalesce(t.contact_email,''))
             and lower(coalesce(r.status,'')) = 'sent'
             and r.sent_at is not null
             and r.replied_at is null
           order by case
             when nullif(substring(coalesce(t.detail,'') from '(20[0-9]{2}-[0-9]{2}-[0-9]{2})'),'') is not null
              and r.sent_at::date = nullif(substring(coalesce(t.detail,'') from '(20[0-9]{2}-[0-9]{2}-[0-9]{2})'),'')::date
             then 0 else 1 end,
             r.sent_at desc,
             r.id desc
           limit 1
         ) as rfq_id
  from public.tasks t
  where t.status = 'hapur'
    and lower(coalesce(t.source,'')) in ('sla_auto','auto_followup')
)
update public.tasks t
   set source_ref = 'RFQ:' || m.rfq_id::text
from task_map m
where t.id = m.id
  and m.rfq_id is not null
  and t.source_ref is distinct from 'RFQ:' || m.rfq_id::text;

update public.tasks t
   set status = 'mbyllur',
       done_at = coalesce(t.done_at, now()),
       detail = case
         when position('PPPP: follow-up auto-mbyllur — RFQ/kontakti nuk është më aktiv.' in coalesce(t.detail,'')) > 0 then t.detail
         else concat_ws(E'\n', nullif(t.detail,''), 'PPPP: follow-up auto-mbyllur — RFQ/kontakti nuk është më aktiv.')
       end
where t.status = 'hapur'
  and lower(coalesce(t.source,'')) in ('sla_auto','auto_followup')
  and not exists (
    select 1
    from public.rfq_log r
    where r.project_id = t.project_id
      and lower(coalesce(r.supplier_email,'')) = lower(coalesce(t.contact_email,''))
      and lower(coalesce(r.status,'')) = 'sent'
      and r.sent_at is not null
      and r.replied_at is null
  );