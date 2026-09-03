begin;

-- Superseded/closed RFQs are historical evidence only. They must not classify a contact
-- as an active supplier for project-state automation.
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
      where r.project_id=p_project_id
        and lower(btrim(coalesce(r.supplier_email,'')))=e.email
        and lower(coalesce(r.status,'')) not in ('superseded','cancelled','canceled','closed','rejected')
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

-- Execution release is a protected operational transition: only a positively identified
-- client sender can release production/welding. Supplier/internal/unknown senders cannot.
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
     and v_sender_role='client'
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

-- RFQ arrival reconciliation must never revive a historical superseded RFQ row.
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
      and lower(coalesce(r.status,'')) not in ('superseded','cancelled','canceled','closed','rejected')
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

create or replace function public.pppp_reconcile_contact_role_conflicts_v1(p_apply boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_checked integer:=0;
  v_changed integer:=0;
  v_items jsonb:='[]'::jsonb;
begin
  for r in
    select pc.id,pc.project_id,pc.email,pc.company,pc.role,c.kind,c.company as master_company,
           exists(
             select 1 from public.rfq_log q
             where q.project_id::text=pc.project_id
               and lower(btrim(coalesce(q.supplier_email,'')))=lower(btrim(pc.email))
               and lower(coalesce(q.status,'')) not in ('superseded','cancelled','canceled','closed','rejected')
           ) as active_supplier_evidence
    from public.project_contacts pc
    join public.contacts c on lower(btrim(c.email))=lower(btrim(pc.email))
    where coalesce(btrim(pc.email),'')<>''
      and (
        (lower(coalesce(c.kind,'')) in ('client','customer','buyer','gc') and lower(coalesce(pc.role,'')) in ('supplier','furnitor'))
        or
        (lower(coalesce(c.kind,'')) in ('supplier','furnitor') and lower(coalesce(pc.role,''))='client')
      )
  loop
    v_checked:=v_checked+1;
    if lower(coalesce(r.kind,'')) in ('client','customer','buyer','gc') and not r.active_supplier_evidence then
      if p_apply then
        update public.project_contacts
           set role='client',
               company=case when lower(coalesce(company,'')) in ('','gmail') and coalesce(r.master_company,'')<>'' then r.master_company else company end
         where id=r.id;
      end if;
      v_changed:=v_changed+1;
      v_items:=v_items||jsonb_build_array(jsonb_build_object('project_id',r.project_id,'email',r.email,'from_role',r.role,'to_role','client'));
    elsif lower(coalesce(r.kind,'')) in ('supplier','furnitor') and r.active_supplier_evidence then
      if p_apply then update public.project_contacts set role='supplier' where id=r.id; end if;
      v_changed:=v_changed+1;
      v_items:=v_items||jsonb_build_array(jsonb_build_object('project_id',r.project_id,'email',r.email,'from_role',r.role,'to_role','supplier'));
    end if;
  end loop;
  return jsonb_build_object('apply',p_apply,'checked',v_checked,'changed_or_changeable',v_changed,'items',v_items);
end;
$$;

create or replace function public.pppp_reconcile_legacy_followups_v1(p_apply boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_checked integer:=0;
  v_closed integer:=0;
  v_items jsonb:='[]'::jsonb;
begin
  for r in
    select t.id,t.project_id,t.contact_email,t.title
    from public.tasks t
    where t.source='sla_auto'
      and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar')
      and exists(
        select 1 from public.rfq_log q
        where q.project_id=t.project_id
          and lower(btrim(coalesce(q.supplier_email,'')))=lower(btrim(coalesce(t.contact_email,'')))
          and lower(coalesce(q.status,''))='replied'
      )
  loop
    v_checked:=v_checked+1;
    if p_apply then
      update public.tasks
         set status='arkivuar',done_at=coalesce(done_at,now()),
             detail=case when position('PPPP data quality: archived because the linked supplier RFQ already has reply evidence.' in coalesce(detail,''))>0
               then detail else concat_ws(E'\n',nullif(detail,''),'PPPP data quality: archived because the linked supplier RFQ already has reply evidence.') end
       where id=r.id;
    end if;
    v_closed:=v_closed+1;
    v_items:=v_items||jsonb_build_array(jsonb_build_object('task_id',r.id,'project_id',r.project_id,'contact_email',r.contact_email));
  end loop;
  return jsonb_build_object('apply',p_apply,'checked',v_checked,'closed_or_closeable',v_closed,'items',v_items);
end;
$$;

create or replace function public.pppp_data_quality_health_v1()
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'duplicate_contact_emails',(
      select count(*) from (
        select lower(btrim(email)) from public.contacts where coalesce(btrim(email),'')<>'' group by lower(btrim(email)) having count(*)>1
      ) x
    ),
    'project_contact_role_conflicts',(
      select count(*)
      from public.project_contacts pc join public.contacts c on lower(btrim(c.email))=lower(btrim(pc.email))
      where coalesce(btrim(pc.email),'')<>'' and (
        (lower(coalesce(c.kind,'')) in ('supplier','furnitor') and lower(coalesce(pc.role,''))='client') or
        (lower(coalesce(c.kind,'')) in ('client','customer','buyer','gc') and lower(coalesce(pc.role,'')) in ('supplier','furnitor'))
      )
    ),
    'dangling_project_email_links',(
      select count(*) from public.project_email_links l
      left join public.projects p on p.id::text=l.project_id
      left join public.project_emails pe on pe.gmail_message_id=l.gmail_message_id
      where p.id is null or pe.id is null
    ),
    'legacy_followups_with_reply_evidence',(
      select count(*) from public.tasks t
      where t.source='sla_auto' and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar')
        and exists(select 1 from public.rfq_log q where q.project_id=t.project_id and lower(btrim(coalesce(q.supplier_email,'')))=lower(btrim(coalesce(t.contact_email,''))) and lower(coalesce(q.status,''))='replied')
    ),
    'open_data_integrity_exceptions',(
      select count(*) from public.tasks t where t.source='data_integrity_audit' and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar')
    ),
    'open_automation_failures',(
      select count(*) from public.tasks t where t.source='automation_failure' and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed','arkivuar')
    ),
    'followup_candidates',(
      select count(*) from public.pppp_followup_drafts_v1 d where d.status='candidate'
    ),
    'followup_drafts_ready',(
      select count(*) from public.pppp_followup_drafts_v1 d where d.status='draft_ready' and d.human_send_required=true
    )
  );
$$;

revoke all on function public.pppp_reconcile_contact_role_conflicts_v1(boolean) from public,anon,authenticated;
revoke all on function public.pppp_reconcile_legacy_followups_v1(boolean) from public,anon,authenticated;
grant execute on function public.pppp_reconcile_contact_role_conflicts_v1(boolean) to service_role;
grant execute on function public.pppp_reconcile_legacy_followups_v1(boolean) to service_role;
grant execute on function public.pppp_data_quality_health_v1() to authenticated,service_role;

do $$ begin
  if exists(select 1 from pg_roles where rolname='supabase_read_only_user') then
    grant execute on function public.pppp_data_quality_health_v1() to supabase_read_only_user;
  end if;
end $$;

-- Apply only deterministic repairs now; keep commercial document identity exceptions human-gated.
select public.pppp_reconcile_contact_role_conflicts_v1(true);
select public.pppp_reconcile_legacy_followups_v1(true);

-- Queue one managed bootstrap run for the already-deployed follow-up draft worker.
-- This can create at most one Gmail draft and never sends a message.
select public.pppp_followup_draft_generator_internal_request(1);

do $$ declare j bigint; begin
  if exists(select 1 from pg_extension where extname='pg_cron') then
    for j in select jobid from cron.job where jobname='pppp-data-quality-daily' loop perform cron.unschedule(j); end loop;
    perform cron.schedule(
      'pppp-data-quality-daily','41 3 * * *',
      'select public.pppp_reconcile_contact_role_conflicts_v1(true); select public.pppp_reconcile_legacy_followups_v1(true);'
    );
  end if;
end $$;

commit;
