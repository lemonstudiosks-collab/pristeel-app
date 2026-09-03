begin;

-- Canonical email-party classifier. Supplier evidence is intentionally stronger than
-- generic client evidence so procurement replies can never release a client wait state.
create or replace function public.pppp_project_email_party_role_v1(p_project_id uuid,p_email text)
returns text
language sql
stable
set search_path = pg_catalog, public
as $$
  with e as (select lower(btrim(coalesce(p_email,''))) as email)
  select case
    when e.email='' then 'unknown'
    when e.email ~ '@(prissteel|pristeel)\.com$' then 'internal'
    when exists(
      select 1 from public.rfq_log r
      where r.project_id=p_project_id and lower(btrim(coalesce(r.supplier_email,'')))=e.email
    ) then 'supplier'
    when exists(
      select 1 from public.project_contacts pc
      where pc.project_id=p_project_id::text
        and lower(btrim(coalesce(pc.email,'')))=e.email
        and lower(btrim(coalesce(pc.role,''))) in ('supplier','furnitor')
    ) then 'supplier'
    when exists(
      select 1 from public.contacts c
      where lower(btrim(coalesce(c.email,'')))=e.email
        and lower(btrim(coalesce(c.kind,''))) in ('supplier','furnitor')
    ) then 'supplier'
    when exists(
      select 1 from public.project_contacts pc
      where pc.project_id=p_project_id::text
        and lower(btrim(coalesce(pc.email,'')))=e.email
        and lower(btrim(coalesce(pc.role,'')))='client'
    ) then 'client'
    when exists(
      select 1 from public.contacts c
      where lower(btrim(coalesce(c.email,'')))=e.email
        and lower(btrim(coalesce(c.kind,''))) in ('client','customer','buyer','gc')
    ) then 'client'
    else 'unknown'
  end
  from e;
$$;

create or replace function public.pppp_project_email_has_client_recipient_v1(p_project_id uuid,p_emails text[])
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select exists(
    select 1
    from unnest(coalesce(p_emails,'{}'::text[])) x(email)
    where public.pppp_project_email_party_role_v1(p_project_id,x.email)='client'
  );
$$;

-- Patch the canonical current-state trigger to use Contact Master + project-contact + RFQ truth.
create or replace function public.pppp_project_email_current_state_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_at timestamptz:=coalesce(new.sent_at,new.created_at,now());
  v_text text:=lower(coalesce(new.subject,'')||' '||coalesce(new.snippet,''));
  v_sender_role text:='unknown';
  v_supplier boolean:=false;
  v_client_recipient boolean:=false;
  v_doc_nr text;
  v_match text[];
begin
  if new.project_id is null then return new; end if;

  v_sender_role:=public.pppp_project_email_party_role_v1(new.project_id,new.from_email);
  v_supplier:=v_sender_role='supplier';
  v_client_recipient:=public.pppp_project_email_has_client_recipient_v1(new.project_id,new.to_emails);

  if lower(coalesce(new.direction,''))='incoming' and not v_supplier and v_sender_role<>'internal' then
    update public.projects
       set operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'action_required' end,
           operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else v_at end,
           operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_email_event_auto_v1' end,
           updated_at=now()
     where id=new.project_id
       and v_at>coalesce(operational_state_at,'1970-01-01'::timestamptz);
  elsif lower(coalesce(new.direction,''))='outgoing' and v_client_recipient then
    update public.projects
       set operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'wait_for_client' end,
           operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else v_at end,
           operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_reply_sent_auto_v1' end,
           updated_at=now()
     where id=new.project_id
       and v_at>=coalesce(operational_state_at,'1970-01-01'::timestamptz);
  end if;

  update public.tasks t
     set status='mbyllur',done_at=coalesce(t.done_at,now()),
         detail=case when position('PPPP: superseded by newer linked project email.' in coalesce(t.detail,''))>0
           then t.detail else concat_ws(E'\n',nullif(t.detail,''),'PPPP: superseded by newer linked project email.') end
   where t.project_id=new.project_id and t.source='email_audit'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
     and v_at>coalesce(t.created_at,'1970-01-01'::timestamptz);

  if lower(coalesce(new.direction,''))='outgoing' then
    v_match:=regexp_match(v_text,'(pst-(?:off|quo)-[0-9]{4}-[0-9]{2}-[0-9]{3})');
    if v_match is not null then
      v_doc_nr:=upper(v_match[1]);
      update public.tasks t
         set status='mbyllur',done_at=coalesce(t.done_at,now()),
             detail=case when position('PPPP: superseded by sent client offer '||v_doc_nr in coalesce(t.detail,''))>0
               then t.detail else concat_ws(E'\n',nullif(t.detail,''),'PPPP: superseded by sent client offer '||v_doc_nr||' evidenced by linked outgoing Gmail.') end
       where t.project_id=new.project_id
         and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
         and t.created_at<=v_at
         and t.source in ('manual','project_decision_auto','email_request_auto','supplier_update_auto','dynamic_plan_auto','semantic_brain_auto')
         and lower(coalesce(t.title,'')||' '||coalesce(t.detail,'')) ~ '(ofert|offer|ponud|rfq|bom|finaliz|d[eë]rgo|komercial)';

      update public.documents_registry d
         set offer_state=coalesce(d.offer_state,'{}'::jsonb)||jsonb_build_object('pst_sent_at',v_at,'pst_document_status','sent')
       where d.project_id=new.project_id and d.series='QUO' and lower(coalesce(d.doc_nr,''))=lower(v_doc_nr);
    end if;
  end if;

  if lower(coalesce(new.direction,''))='incoming'
     and v_text ~ '(freigab.{0,140}(schwei|schweiß)|((schwei|schweiß).{0,140}freigab)|you can.{0,60}weld|can.{0,60}weld|mund.{0,80}(schwei|schweiß)|drit.{0,30}gjelber.{0,100}sald|saldim.{0,80}aprov)' then
    if not exists(
      select 1 from public.pppp_project_context_facts f
      where f.project_id=new.project_id and f.source_type='email' and f.source_ref=new.gmail_message_id
        and f.fact_key='email_event.execution_release'
    ) then
      insert into public.pppp_project_context_facts(
        project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,idempotency_key,created_by
      ) values(
        new.project_id,'execution','Execution release confirmed','email_event.execution_release',
        jsonb_build_object('summary','Klienti konfirmoi release-in për prodhim/saldim.','text',coalesce(new.snippet,new.subject)),
        'email',new.gmail_message_id,'confirmed',1,'observed','email-event:execution-release:'||new.gmail_message_id,'pppp_project_email_current_state_v1'
      );
    end if;
    update public.projects set operational_state='execution',operational_state_at=v_at,operational_state_source='email_execution_release_auto_v1',updated_at=now()
    where id=new.project_id;
    update public.tasks
       set status='mbyllur',done_at=coalesce(done_at,now()),
           detail=concat_ws(E'\n',nullif(detail,''),'PPPP: release blocker superseded by confirmed client release email.')
     where project_id=new.project_id and source='execution_release_readiness'
       and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
  end if;
  return new;
end;
$$;

-- Patch the event engine. RFQ matching still controls RFQ status updates; party classification
-- controls whether an incoming message is allowed to release wait_for_client.
create or replace function public.pppp_project_email_event_engine_v1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
  v_supplier text;
  v_rfq_id uuid;
  v_deadline text[];
  v_deadline_date date;
  v_doc_nr text;
  v_doc_id uuid;
  v_offer_sent boolean := false;
  v_event boolean := false;
  v_is_supplier_sender boolean := false;
  v_sender_role text:='unknown';
begin
  if new.project_id is null then return new; end if;
  v_text := lower(coalesce(new.subject,'') || ' ' || coalesce(new.snippet,''));

  if lower(coalesce(new.direction,''))='incoming' and coalesce(new.from_email,'')<>'' then
    v_sender_role:=public.pppp_project_email_party_role_v1(new.project_id,new.from_email);

    select r.id,r.supplier_name into v_rfq_id,v_supplier
    from public.rfq_log r
    where r.project_id=new.project_id
      and lower(coalesce(r.supplier_email,''))=lower(new.from_email)
      and coalesce(r.sent_at,'-infinity'::timestamptz) <= coalesce(new.sent_at,new.created_at,now())
    order by r.sent_at desc nulls last,r.created_at desc limit 1;

    v_is_supplier_sender := v_sender_role='supplier';

    if v_rfq_id is not null
       and (v_text ~ '(ofert|ponud|quote|angebot|preis)' or coalesce(new.has_attachments,false)) then
      update public.rfq_log set status='replied',replied_at=coalesce(replied_at,new.sent_at,new.created_at,now()) where id=v_rfq_id;
      update public.projects
         set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing' else pipeline_stage end,
             updated_at=now()
       where id=new.project_id;
      v_event := true;
    end if;

    if not v_is_supplier_sender and v_sender_role<>'internal' then
      update public.projects
         set operational_state='action_required',
             operational_state_at=coalesce(new.sent_at,new.created_at,now()),
             operational_state_source='client_reply_auto',
             updated_at=now()
       where id=new.project_id
         and coalesce(operational_state,'')='wait_for_client'
         and coalesce(new.sent_at,new.created_at,now()) > coalesce(operational_state_at,'1970-01-01'::timestamptz);
      if found then v_event := true; end if;
    end if;
  end if;

  if lower(coalesce(new.direction,''))='outgoing' and v_text ~ 'pst-off-[0-9]{4}-[0-9]{2}-[0-9]{3}' then
    select d.id,d.doc_nr into v_doc_id,v_doc_nr
    from public.documents_registry d
    where d.project_id=new.project_id and d.series='QUO'
      and lower(coalesce(new.subject,'') || ' ' || coalesce(new.snippet,'')) like '%' || lower(d.doc_nr) || '%'
    order by d.created_at desc limit 1;

    v_offer_sent := v_doc_nr is not null;
    if v_offer_sent then
      update public.projects
         set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing','commercial') then 'client_offer' else pipeline_stage end,
             operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'wait_for_client' end,
             operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else coalesce(new.sent_at,new.created_at,now()) end,
             operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_offer_sent_auto' end,
             updated_at=now()
       where id=new.project_id;

      update public.documents_registry
         set offer_state=coalesce(offer_state,'{}'::jsonb) || jsonb_build_object(
               'pst_sent_at',coalesce(new.sent_at,new.created_at,now()),'pst_document_status','sent'
             )
       where id=v_doc_id;

      v_deadline := regexp_match(coalesce(new.snippet,''),'(?i)(?:najkasnije[[:space:]]+do|zavr[sš]ene[^0-9]{0,40})([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})');
      if v_deadline is not null then
        begin
          v_deadline_date := make_date(v_deadline[3]::int,v_deadline[2]::int,v_deadline[1]::int);
          update public.projects set deadline=v_deadline_date::text,updated_at=now() where id=new.project_id;
        exception when others then null;
        end;
      end if;

      update public.tasks
         set status='mbyllur',done_at=coalesce(done_at,now()),
             detail=concat_ws(E'\n',nullif(detail,''),'PPPP: veprimi u tejkalua nga oferta '||v_doc_nr||' e dërguar klientit.')
       where project_id=new.project_id
         and lower(coalesce(status,'')) not in ('kryer','done','mbyllur')
         and source in ('email_request_auto','supplier_update_auto','project_decision_auto','dynamic_plan_auto')
         and lower(coalesce(title,'') || ' ' || coalesce(detail,'')) ~ '(plan[[:space:]]*dinamik|dinamik|ponud|ofert|monta|plastifik|cij|cmim|price|rok[[:space:]]*realiz|rekapitul)'
         and coalesce(created_at,'-infinity'::timestamptz) <= coalesce(new.sent_at,new.created_at,now());
      v_event := true;
    end if;
  end if;

  if v_event then
    begin perform public.pppp_refresh_project_decision(new.project_id);
    exception when others then raise warning 'PPPP project decision refresh failed for %: %',new.project_id,sqlerrm;
    end;
  end if;
  return new;
end;
$$;

-- Deterministic repair for historical false client states: only repair when the exact
-- email timestamp that produced the current auto-state belongs to a now-known supplier.
create or replace function public.pppp_reconcile_email_party_states_v1()
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  x record;
  prior_mail record;
  v_changed integer:=0;
  v_new_state text;
  v_new_source text;
begin
  for x in
    select p.id,p.operational_state,p.operational_state_at,p.operational_state_source,
           pe.sent_at,pe.created_at,pe.gmail_message_id,pe.from_email
    from public.projects p
    join lateral (
      select e.* from public.project_emails e
      where e.project_id=p.id
      order by coalesce(e.sent_at,e.created_at) desc,e.id desc limit 1
    ) pe on true
    where coalesce(p.operational_state,'')<>'execution'
      and p.operational_state_source in ('client_email_event_auto_v1','client_reply_auto')
      and lower(coalesce(pe.direction,''))='incoming'
      and public.pppp_project_email_party_role_v1(p.id,pe.from_email)='supplier'
      and abs(extract(epoch from (coalesce(pe.sent_at,pe.created_at)-p.operational_state_at)))<=2
  loop
    prior_mail:=null;
    select q.* into prior_mail
    from (
      select e.id,e.direction,e.sent_at,e.created_at,e.from_email,e.to_emails,
             public.pppp_project_email_party_role_v1(x.id,e.from_email) as sender_role,
             public.pppp_project_email_has_client_recipient_v1(x.id,e.to_emails) as has_client_recipient
      from public.project_emails e
      where e.project_id=x.id
        and coalesce(e.sent_at,e.created_at)<coalesce(x.sent_at,x.created_at)
      order by coalesce(e.sent_at,e.created_at) desc,e.id desc
    ) q
    where (lower(coalesce(q.direction,''))='incoming' and q.sender_role not in ('supplier','internal'))
       or (lower(coalesce(q.direction,''))='outgoing' and q.has_client_recipient)
    limit 1;

    if found then
      if lower(coalesce(prior_mail.direction,''))='incoming' then
        v_new_state:='action_required'; v_new_source:='email_party_reconcile_client_in_v1';
      else
        v_new_state:='wait_for_client'; v_new_source:='email_party_reconcile_client_out_v1';
      end if;
      update public.projects
         set operational_state=v_new_state,
             operational_state_at=coalesce(prior_mail.sent_at,prior_mail.created_at),
             operational_state_source=v_new_source,
             updated_at=now()
       where id=x.id;
    else
      update public.projects
         set operational_state='active_work',
             operational_state_at=now(),
             operational_state_source='email_party_reconcile_supplier_only_v1',
             updated_at=now()
       where id=x.id;
    end if;
    v_changed:=v_changed+1;
  end loop;

  return jsonb_build_object('ok',true,'reconciled',v_changed);
end;
$$;

create or replace view public.pppp_email_party_state_audit_v1
with (security_invoker = true)
as
select
  pe.project_id,p.name as project_name,p.client,pe.gmail_message_id,pe.sent_at,pe.direction,pe.from_email,pe.subject,
  public.pppp_project_email_party_role_v1(pe.project_id,pe.from_email) as sender_role,
  public.pppp_project_email_has_client_recipient_v1(pe.project_id,pe.to_emails) as has_client_recipient,
  p.operational_state,p.operational_state_at,p.operational_state_source
from public.project_emails pe
join public.projects p on p.id=pe.project_id;

revoke all on function public.pppp_reconcile_email_party_states_v1() from public,anon,authenticated;
grant execute on function public.pppp_reconcile_email_party_states_v1() to service_role;
grant execute on function public.pppp_project_email_party_role_v1(uuid,text) to authenticated,service_role;
grant execute on function public.pppp_project_email_has_client_recipient_v1(uuid,text[]) to authenticated,service_role;
grant select on public.pppp_email_party_state_audit_v1 to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_project_email_party_role_v1(uuid,text) to supabase_read_only_user;
    grant execute on function public.pppp_project_email_has_client_recipient_v1(uuid,text[]) to supabase_read_only_user;
    grant select on public.pppp_email_party_state_audit_v1 to supabase_read_only_user;
  end if;
end $$;

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='email-party-state-reconcile-30m' loop perform cron.unschedule(j); end loop;
    perform cron.schedule('email-party-state-reconcile-30m','13,43 * * * *','select public.pppp_reconcile_email_party_states_v1();');
  end if;
end $$;

commit;
