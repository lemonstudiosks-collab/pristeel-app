-- PPPP automation operational closeout v1
-- Backend-only stabilization after live production verification.
--
-- Goals:
-- 1) Auto-close historical automation failure alerts after a later successful run.
-- 2) Pause the known-broken Drive 30m reconciler while Google Workspace Drive DWD scope is blocked.
-- 3) Collapse supplier follow-up tasks to one actionable task per project + supplier + RFQ subject.
--
-- No client pricing, supplier selection, email-send or other human approval gate is changed.

create or replace function public.pppp_automation_success_closes_failure_alerts_v1()
returns trigger
language plpgsql
security definer
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.status <> 'succeeded' or btrim(coalesce(new.automation_key,'')) = '' then
    return new;
  end if;

  -- Do not close alerts from a stale success if a newer failure is already known.
  if exists(
    select 1
    from public.pppp_automation_http_runs f
    where f.automation_key = new.automation_key
      and f.status = 'failed'
      and f.updated_at > new.updated_at
  ) then
    return new;
  end if;

  update public.tasks t
     set status = 'kryer',
         done_at = coalesce(t.done_at,new.updated_at,now()),
         detail = case
           when position('PPPP: automation-recovered —' in coalesce(t.detail,'')) > 0 then t.detail
           else concat_ws(E'\n',nullif(t.detail,''),
             'PPPP: automation-recovered — një ekzekutim i mëvonshëm përfundoi me sukses; alerti historik u mbyll automatikisht.')
         end
   where t.source = 'automation_failure'
     and t.title = 'Automation failure · ' || new.automation_key
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
     and t.created_at <= new.updated_at;

  return new;
end;
$function$;

revoke all on function public.pppp_automation_success_closes_failure_alerts_v1() from public,anon,authenticated;
grant execute on function public.pppp_automation_success_closes_failure_alerts_v1() to service_role;

drop trigger if exists pppp_automation_success_closes_failure_alerts_v1 on public.pppp_automation_http_runs;
create trigger pppp_automation_success_closes_failure_alerts_v1
after insert or update of status,updated_at
on public.pppp_automation_http_runs
for each row execute function public.pppp_automation_success_closes_failure_alerts_v1();

-- One-time recovery of historical alerts. Only an automation whose latest success is
-- at least as new as its latest failure is considered recovered.
with latest_state as (
  select automation_key,
         max(updated_at) filter(where status='succeeded') as latest_success,
         max(updated_at) filter(where status='failed') as latest_failure
  from public.pppp_automation_http_runs
  group by automation_key
)
update public.tasks t
   set status='kryer',
       done_at=coalesce(t.done_at,s.latest_success,now()),
       detail=case
         when position('PPPP: automation-recovered —' in coalesce(t.detail,'')) > 0 then t.detail
         else concat_ws(E'\n',nullif(t.detail,''),
           'PPPP: automation-recovered — alarm historik; ekzekutimet pasuese të këtij automation janë të suksesshme.')
       end
from latest_state s
where t.source='automation_failure'
  and t.title='Automation failure · '||s.automation_key
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and s.latest_success is not null
  and s.latest_success > t.created_at
  and (s.latest_failure is null or s.latest_success >= s.latest_failure);

-- Google Workspace currently authorizes the existing service-account client for Gmail,
-- but rejects https://www.googleapis.com/auth/drive. Keep one explicit configuration
-- alert and stop retrying the same known-invalid token request every 30 minutes.
do $do$
declare
  v_jobid bigint;
begin
  if exists(
       select 1 from public.tasks
       where source='automation_failure'
         and source_ref='AUTOMATION:config:google-drive-dwd-scope'
         and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed')
     )
     and exists(
       select 1 from public.pppp_automation_http_runs r
       where r.automation_key='project-drive-reconciler'
         and r.status='failed'
         and coalesce(r.response_excerpt,'') ilike '%Google token 401%'
         and r.updated_at >= now()-interval '7 days'
     ) then
    select jobid into v_jobid
    from cron.job
    where jobname='project-drive-reconciler-30m'
    limit 1;

    if v_jobid is not null then
      perform cron.alter_job(v_jobid,active:=false);
    end if;
  end if;
end;
$do$;

-- Once the known external configuration blocker is canonicalized, the repetitive
-- project-drive failure alert is no longer actionable. The configuration task remains open.
update public.tasks t
set status='kryer',
    done_at=coalesce(t.done_at,now()),
    detail=case
      when position('PPPP: drive-dwd-paused —' in coalesce(t.detail,'')) > 0 then t.detail
      else concat_ws(E'\n',nullif(t.detail,''),
        'PPPP: drive-dwd-paused — retry-i 30-minutësh u pauzua derisa Google Workspace Admin të autorizojë Drive scope; përdorimi tjetër i PPPP vazhdon normalisht.')
    end
where t.source='automation_failure'
  and t.title='Automation failure · project-drive-reconciler'
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists(
    select 1 from public.tasks c
    where c.source_ref='AUTOMATION:config:google-drive-dwd-scope'
      and lower(coalesce(c.status,'')) not in ('kryer','mbyllur','done','closed')
  );

-- In-flight Drive failures should not recreate repetitive failure tasks while the one
-- canonical Google Workspace configuration blocker remains open.
create or replace function public.pppp_drive_dwd_failure_collapse_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
begin
  if new.source='automation_failure'
     and new.title='Automation failure · project-drive-reconciler'
     and exists(
       select 1 from public.tasks c
       where c.source_ref='AUTOMATION:config:google-drive-dwd-scope'
         and lower(coalesce(c.status,'')) not in ('kryer','mbyllur','done','closed')
     ) then
    return null;
  end if;
  return new;
end;
$function$;

revoke all on function public.pppp_drive_dwd_failure_collapse_v1() from public,anon,authenticated;
grant execute on function public.pppp_drive_dwd_failure_collapse_v1() to service_role;

drop trigger if exists a_pppp_drive_dwd_failure_collapse_v1 on public.tasks;
create trigger a_pppp_drive_dwd_failure_collapse_v1
before insert on public.tasks
for each row execute function public.pppp_drive_dwd_failure_collapse_v1();

-- Supplier-level RFQ follow-up identity. Multiple recipients at the same supplier for the
-- same project/subject are one human action, not multiple Priority Actions.
create or replace function public.pppp_followup_rfq_identity_guard_v1()
returns trigger
language plpgsql
set search_path to 'pg_catalog','public'
as $function$
declare
  v_sent_date date;
  v_rfq_id uuid;
  v_ref text;
  v_existing_id uuid;
  v_supplier_name text;
  v_subject text;
  v_supplier_key text;
  v_subject_key text;
  v_peer_count integer:=0;
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

  select r.id,r.supplier_name,r.subject
    into v_rfq_id,v_supplier_name,v_subject
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
  v_supplier_key := lower(btrim(coalesce(nullif(v_supplier_name,''),split_part(new.contact_email,'@',2))));
  v_subject_key := lower(btrim(coalesce(v_subject,'')));

  select count(*)::integer
    into v_peer_count
  from public.rfq_log r
  where r.project_id=new.project_id
    and lower(coalesce(r.status,''))='sent'
    and r.sent_at is not null
    and r.replied_at is null
    and lower(btrim(coalesce(nullif(r.supplier_name,''),split_part(r.supplier_email,'@',2))))=v_supplier_key
    and lower(btrim(coalesce(r.subject,'')))=v_subject_key;

  if v_peer_count>1 and position('PPPP: supplier-level follow-up —' in coalesce(new.detail,''))=0 then
    new.detail:=concat_ws(E'\n',nullif(new.detail,''),
      'PPPP: supplier-level follow-up — '||v_peer_count::text||' kontakte të të njëjtit furnitor kanë marrë këtë RFQ; shfaqet vetëm një veprim njerëzor.');
  end if;

  select t.id
    into v_existing_id
  from public.tasks t
  left join public.rfq_log er on t.source_ref='RFQ:'||er.id::text
  where t.project_id = new.project_id
    and lower(coalesce(t.source,'')) in ('sla_auto','auto_followup')
    and (
      (
        lower(coalesce(t.contact_email,'')) = lower(new.contact_email)
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
      )
      or (
        lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
        and er.project_id=new.project_id
        and er.replied_at is null
        and lower(btrim(coalesce(nullif(er.supplier_name,''),split_part(er.supplier_email,'@',2))))=v_supplier_key
        and lower(btrim(coalesce(er.subject,'')))=v_subject_key
      )
    )
  order by case when lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed') then 0 else 1 end,
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
$function$;

revoke all on function public.pppp_followup_rfq_identity_guard_v1() from public,anon,authenticated;
grant execute on function public.pppp_followup_rfq_identity_guard_v1() to service_role;

-- One-time supplier-level cleanup for open follow-up duplicates already created.
with ranked as (
  select t.id,
         row_number() over(
           partition by t.project_id,
             lower(btrim(coalesce(nullif(r.supplier_name,''),split_part(r.supplier_email,'@',2)))),
             lower(btrim(coalesce(r.subject,'')))
           order by t.created_at desc,t.id desc
         ) as rn
  from public.tasks t
  join public.rfq_log r on t.source_ref='RFQ:'||r.id::text
  where lower(coalesce(t.source,'')) in ('sla_auto','auto_followup')
    and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
    and r.project_id=t.project_id
    and r.replied_at is null
), duplicates as (
  select id from ranked where rn>1
)
update public.tasks t
set status='mbyllur',
    done_at=coalesce(t.done_at,now()),
    detail=case
      when position('PPPP: supplier-followup-dedup —' in coalesce(t.detail,''))>0 then t.detail
      else concat_ws(E'\n',nullif(t.detail,''),
        'PPPP: supplier-followup-dedup — u zëvendësua nga një follow-up më i ri për të njëjtin furnitor/projekt/RFQ.')
    end
where t.id in (select id from duplicates);

comment on function public.pppp_automation_success_closes_failure_alerts_v1() is
  'Closes stale per-run automation failure tasks when the same managed automation later succeeds.';
comment on function public.pppp_followup_rfq_identity_guard_v1() is
  'Canonicalizes supplier RFQ follow-up tasks to one human action per project, supplier identity and RFQ subject.';
