-- Prevent shared procurement senders and future-scheduled Gmail objects from corrupting project state.

create or replace function public.pppp_supplier_history_autolink()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project uuid;
  v_count int;
begin
  if new.project_id is not null
     or lower(coalesce(new.direction,'')) <> 'incoming'
     or coalesce(new.from_email,'') = '' then
    return new;
  end if;

  -- e-Prokurimi is a shared system sender across unrelated procurement procedures.
  -- Sender history must never be used as project identity for it.
  if lower(trim(coalesce(new.from_email,''))) = 'eprokurimi@rks-gov.net' then
    return new;
  end if;

  if trim(lower(coalesce(new.subject,''))) in ('', '(pa subjekt)', '(no subject)') then
    return new;
  end if;

  with sender_projects as (
    select distinct pe.project_id
    from public.project_emails pe
    join public.projects p on p.id = pe.project_id
    where pe.project_id is not null
      and lower(coalesce(pe.from_email,'')) = lower(new.from_email)
      and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar')
  ),
  sender_tokens as (
    select distinct sp.project_id, tok
    from sender_projects sp
    join public.projects p on p.id = sp.project_id
    cross join lateral regexp_split_to_table(
      lower(coalesce(p.name,'') || ' ' || coalesce(p.business_ref,'') || ' ' || coalesce(p.ref,'')),
      '[^a-z0-9]+'
    ) tok
    where length(tok) >= 5
      and tok not in (
        'project','projekti','projekt','steel','stahl','construction','konstruktion','konstrukcija',
        'offer','offerte','ponuda','angebot','request','kerkese','italian','style','restoran','restaurant',
        'seafront','client','customer','furnitor','supplier','gmbh','shpk','doo','production','prodhim',
        'scope','works','civil','quality','drawing','drawings','fabrication','erection','assembly'
      )
  ),
  unique_tokens as (
    select st.project_id, st.tok
    from sender_tokens st
    where 1 = (
      select count(distinct p2.id)
      from public.projects p2
      cross join lateral regexp_split_to_table(
        lower(coalesce(p2.name,'') || ' ' || coalesce(p2.business_ref,'') || ' ' || coalesce(p2.ref,'')),
        '[^a-z0-9]+'
      ) tok2
      where tok2 = st.tok
        and lower(coalesce(p2.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar')
    )
  ),
  candidates as (
    select distinct ut.project_id
    from unique_tokens ut
    where lower(coalesce(new.subject,'')) like '%' || ut.tok || '%'
  ),
  picked as (
    select count(*)::int as cnt, (array_agg(project_id))[1] as project_id
    from candidates
  )
  select cnt, project_id into v_count, v_project from picked;

  if v_count = 1 and v_project is not null then
    new.project_id := v_project;
    new.suggested_project_id := v_project;
    new.match_method := 'db-sender-history-subject-token-v2';
    new.match_confidence := 94;
    new.needs_review := false;
    new.review_reason := null;
    new.updated_at := now();
  end if;

  return new;
end;
$function$;

create or replace function public.pppp_touch_project_from_email()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
declare v_ts timestamptz;
begin
  if new.project_id is null then return new; end if;
  if new.sent_at is not null and new.sent_at > now() + interval '5 minutes' then return new; end if;
  v_ts := coalesce(new.sent_at, new.created_at, now());
  update public.projects
     set last_email_at = greatest(coalesce(last_email_at, '-infinity'::timestamptz), v_ts),
         last_activity_at = greatest(coalesce(last_activity_at, created_at, '-infinity'::timestamptz), v_ts)
   where id = new.project_id;
  return new;
end;
$function$;

create or replace function public.pppp_project_email_event_engine_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_text text; v_supplier text; v_rfq_id uuid; v_deadline text[]; v_deadline_date date; v_doc_nr text; v_doc_id uuid;
  v_offer_sent boolean := false; v_event boolean := false; v_is_supplier_sender boolean := false; v_sender_role text:='unknown';
begin
  if new.project_id is null then return new; end if;
  if new.sent_at is not null and new.sent_at > now() + interval '5 minutes' then return new; end if;
  v_text := lower(coalesce(new.subject,'') || ' ' || coalesce(new.snippet,''));
  if lower(coalesce(new.direction,''))='incoming' and coalesce(new.from_email,'')<>'' then
    v_sender_role:=public.pppp_project_email_party_role_v1(new.project_id,new.from_email);
    select r.id,r.supplier_name into v_rfq_id,v_supplier from public.rfq_log r
    where r.project_id=new.project_id
      and lower(coalesce(r.supplier_email,''))=lower(new.from_email)
      and lower(coalesce(r.status,'')) not in ('superseded','cancelled','canceled','closed','rejected')
      and coalesce(r.sent_at,'-infinity'::timestamptz) <= coalesce(new.sent_at,new.created_at,now())
    order by r.sent_at desc nulls last,r.created_at desc limit 1;
    v_is_supplier_sender := v_sender_role='supplier';
    if v_rfq_id is not null and (v_text ~ '(ofert|ponud|quote|angebot|preis)' or coalesce(new.has_attachments,false)) then
      update public.rfq_log set status='replied',replied_at=coalesce(replied_at,new.sent_at,new.created_at,now()) where id=v_rfq_id;
      update public.projects set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing' else pipeline_stage end,updated_at=now() where id=new.project_id;
      v_event := true;
    end if;
    if not v_is_supplier_sender and v_sender_role<>'internal' then
      update public.projects set operational_state='action_required',operational_state_at=coalesce(new.sent_at,new.created_at,now()),operational_state_source='client_reply_auto',updated_at=now()
       where id=new.project_id and coalesce(operational_state,'')='wait_for_client' and coalesce(new.sent_at,new.created_at,now()) > coalesce(operational_state_at,'1970-01-01'::timestamptz);
      if found then v_event := true; end if;
    end if;
  end if;
  if lower(coalesce(new.direction,''))='outgoing' and v_text ~ 'pst-off-[0-9]{4}-[0-9]{2}-[0-9]{3}' then
    select d.id,d.doc_nr into v_doc_id,v_doc_nr from public.documents_registry d
    where d.project_id=new.project_id and d.series='QUO' and lower(coalesce(new.subject,'') || ' ' || coalesce(new.snippet,'')) like '%' || lower(d.doc_nr) || '%'
    order by d.created_at desc limit 1;
    v_offer_sent := v_doc_nr is not null;
    if v_offer_sent then
      update public.projects set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing','commercial') then 'client_offer' else pipeline_stage end,
        operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'wait_for_client' end,
        operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else coalesce(new.sent_at,new.created_at,now()) end,
        operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_offer_sent_auto' end,updated_at=now() where id=new.project_id;
      update public.documents_registry set offer_state=coalesce(offer_state,'{}'::jsonb) || jsonb_build_object('pst_sent_at',coalesce(new.sent_at,new.created_at,now()),'pst_document_status','sent') where id=v_doc_id;
      v_deadline := regexp_match(coalesce(new.snippet,''),'(?i)(?:najkasnije[[:space:]]+do|zavr[sš]ene[^0-9]{0,40})([0-9]{1,2})[./-]([0-9]{1,2})[./-]([0-9]{4})');
      if v_deadline is not null then begin v_deadline_date := make_date(v_deadline[3]::int,v_deadline[2]::int,v_deadline[1]::int); update public.projects set deadline=v_deadline_date::text,updated_at=now() where id=new.project_id; exception when others then null; end; end if;
      update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()),detail=concat_ws(E'\\n',nullif(detail,''),'PPPP: veprimi u tejkalua nga oferta '||v_doc_nr||' e dërguar klientit.')
       where project_id=new.project_id and lower(coalesce(status,'')) not in ('kryer','done','mbyllur') and source in ('email_request_auto','supplier_update_auto','project_decision_auto','dynamic_plan_auto')
         and lower(coalesce(title,'') || ' ' || coalesce(detail,'')) ~ '(plan[[:space:]]*dinamik|dinamik|ponud|ofert|monta|plastifik|cij|cmim|price|rok[[:space:]]*realiz|rekapitul)' and coalesce(created_at,'-infinity'::timestamptz) <= coalesce(new.sent_at,new.created_at,now());
      v_event := true;
    end if;
  end if;
  if v_event then begin perform public.pppp_refresh_project_decision(new.project_id); exception when others then raise warning 'PPPP project decision refresh failed for %: %',new.project_id,sqlerrm; end; end if;
  return new;
end;
$function$;

create or replace function public.pppp_project_email_current_state_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_at timestamptz:=coalesce(new.sent_at,new.created_at,now());
  v_text text:=lower(coalesce(new.subject,'')||' '||coalesce(new.snippet,''));
  v_sender_role text:='unknown';
  v_supplier boolean:=false;
  v_client_recipient boolean:=false;
  v_doc_nr text;
  v_match text[];
  v_project_status text;
begin
  if new.project_id is null then return new; end if;
  if new.sent_at is not null and new.sent_at > now() + interval '5 minutes' then return new; end if;

  select status into v_project_status from public.projects where id=new.project_id;

  if public.pppp_project_status_is_terminal_v1(v_project_status) then
    update public.projects
       set operational_state='closed', operational_state_at=coalesce(operational_state_at,v_at), operational_state_source='terminal_status_guard_v1', updated_at=now()
     where id=new.project_id and (coalesce(operational_state,'')<>'closed' or coalesce(operational_state_source,'') not in ('terminal_status_guard_v1','terminal_status_reconcile_v1'));
    return new;
  end if;

  v_sender_role:=public.pppp_project_email_party_role_v1(new.project_id,new.from_email);
  v_supplier:=v_sender_role='supplier';
  v_client_recipient:=public.pppp_project_email_has_client_recipient_v1(new.project_id,new.to_emails);
  if lower(coalesce(new.direction,''))='incoming' and not v_supplier and v_sender_role<>'internal' then
    update public.projects
       set operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'action_required' end,
           operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else v_at end,
           operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_email_event_auto_v1' end,
           updated_at=now()
     where id=new.project_id and v_at>coalesce(operational_state_at,'1970-01-01'::timestamptz);
  elsif lower(coalesce(new.direction,''))='outgoing' and v_client_recipient then
    update public.projects
       set operational_state=case when coalesce(operational_state,'')='execution' then operational_state else 'wait_for_client' end,
           operational_state_at=case when coalesce(operational_state,'')='execution' then operational_state_at else v_at end,
           operational_state_source=case when coalesce(operational_state,'')='execution' then operational_state_source else 'client_reply_sent_auto_v1' end,
           updated_at=now()
     where id=new.project_id and v_at>=coalesce(operational_state_at,'1970-01-01'::timestamptz);
  end if;
  update public.tasks t
     set status='mbyllur',done_at=coalesce(t.done_at,now()),
         detail=case when position('PPPP: superseded by newer linked project email.' in coalesce(t.detail,''))>0 then t.detail else concat_ws(E'\\n',nullif(t.detail,''),'PPPP: superseded by newer linked project email.') end
   where t.project_id=new.project_id and t.source='email_audit'
     and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
     and v_at>coalesce(t.created_at,'1970-01-01'::timestamptz);
  if lower(coalesce(new.direction,''))='outgoing' then
    v_match:=regexp_match(v_text,'(pst-(?:off|quo)-[0-9]{4}-[0-9]{2}-[0-9]{3})');
    if v_match is not null then
      v_doc_nr:=upper(v_match[1]);
      update public.tasks t
         set status='mbyllur',done_at=coalesce(t.done_at,now()),
             detail=case when position('PPPP: superseded by sent client offer '||v_doc_nr in coalesce(t.detail,''))>0 then t.detail else concat_ws(E'\\n',nullif(t.detail,''),'PPPP: superseded by sent client offer '||v_doc_nr||' evidenced by linked outgoing Gmail.') end
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
  if lower(coalesce(new.direction,''))='incoming' and v_sender_role='client'
     and v_text ~ '(freigab.{0,140}(schwei|schweiß)|((schwei|schweiß).{0,140}freigab)|you can.{0,60}weld|can.{0,60}weld|mund.{0,80}(schwei|schweiß)|drit.{0,30}gjelber.{0,100}sald|saldim.{0,80}aprov)' then
    if not exists(select 1 from public.pppp_project_context_facts f where f.project_id=new.project_id and f.source_type='email' and f.source_ref=new.gmail_message_id and f.fact_key='email_event.execution_release') then
      insert into public.pppp_project_context_facts(project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,idempotency_key,created_by)
      values(new.project_id,'execution','Execution release confirmed','email_event.execution_release',jsonb_build_object('summary','Klienti konfirmoi release-in për prodhim/saldim.','text',coalesce(new.snippet,new.subject)),'email',new.gmail_message_id,'confirmed',1,'observed','email-event:execution-release:'||new.gmail_message_id,'pppp_project_email_current_state_v1');
    end if;
    update public.projects set operational_state='execution',operational_state_at=v_at,operational_state_source='email_execution_release_auto_v1',updated_at=now() where id=new.project_id;
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()),detail=concat_ws(E'\\n',nullif(detail,''),'PPPP: release blocker superseded by confirmed client release email.')
     where project_id=new.project_id and source='execution_release_readiness' and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
  end if;
  return new;
end;
$function$;

-- Clean only the proven KEK reservoir contamination. No won/lost, pricing or business-type changes.
do $cleanup$
declare
  v_project uuid;
  v_last_real_email timestamptz;
  v_wrong text[] := array['1a080d5fbb8d333f','1a080d584ef2fdc0','1a080d543aa66a33'];
  v_phantom text := '1a080dfe1e9ad675';
  v_future text := '1a08f5cd1df10f2b';
begin
  select id into v_project
  from public.projects
  where ref='KEK-26-6946-5-1-1' or business_ref='KEK-26-6946-5-1-1'
  order by created_at desc
  limit 1;

  if v_project is null then raise exception 'KEK-26-6946-5-1-1 project not found'; end if;

  delete from public.project_email_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong || array[v_phantom]);
  delete from public.project_attachment_links
   where project_id::text=v_project::text and gmail_message_id=any(v_wrong || array[v_phantom]);
  delete from public.pppp_project_context_facts
   where project_id=v_project and source_ref=any(v_wrong || array[v_phantom,v_future]);
  delete from public.tasks
   where project_id=v_project and source='semantic_brain_auto'
     and source_ref=any(array['email:event:'||v_wrong[1],'email:event:'||v_wrong[2],'email:event:'||v_wrong[3],'email:event:'||v_phantom,'email:event:'||v_future]);

  update public.project_emails
     set project_id=null,
         suggested_project_id=null,
         match_method='project-contact-unique-detached:kek-6443-cleanup-v1',
         match_confidence=0,
         needs_review=true,
         review_reason='Belongs to KEK-26-6443-5-2-1 (Kosova A reactors), not KEK-26-6946-5-1-1. No canonical PPPP project exists yet.',
         updated_at=now()
   where project_id=v_project and gmail_message_id=any(v_wrong);

  delete from public.project_emails
   where project_id=v_project and gmail_message_id=v_phantom;

  select max(sent_at) into v_last_real_email
  from public.project_emails
  where project_id=v_project and sent_at <= now() + interval '5 minutes';

  update public.projects
     set operational_state='wait_for_supplier',
         operational_state_at=coalesce(v_last_real_email,now()),
         operational_state_source='kek_supplier_wait_reconcile_v1',
         last_email_at=v_last_real_email,
         last_activity_at=coalesce(v_last_real_email,created_at),
         updated_at=now()
   where id=v_project;

  update public.tasks
     set status='mbyllur',
         done_at=coalesce(done_at,now()),
         detail=concat_ws(E'\\n',nullif(detail,''),'PPPP: closed by KEK cleanup; a more specific Eurosteel supplier-wait action is active.')
   where project_id=v_project
     and source='project_decision_auto'
     and source_ref='PROJECT_STATE:'||v_project::text
     and lower(coalesce(status,'')) not in ('mbyllur','kryer','done','closed');
end;
$cleanup$;
