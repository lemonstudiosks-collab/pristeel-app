begin;

create or replace function public.pppp_project_status_is_terminal_v1(p_status text)
returns boolean
language sql
immutable
set search_path to 'public'
as $$
  select lower(btrim(coalesce(p_status,''))) in (
    'humbur','lost','arkivuar','archived','mbyllur','closed','closedlost',
    'cancelled','canceled','refuzuar','rejected','realizuar','completed','complete'
  );
$$;

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

  select status into v_project_status
  from public.projects
  where id=new.project_id;

  -- Existing human-approved terminal status is authoritative. Email traffic may add
  -- history to a closed opportunity, but it must never silently reactivate it.
  if public.pppp_project_status_is_terminal_v1(v_project_status) then
    update public.projects
       set operational_state='closed',
           operational_state_at=coalesce(operational_state_at,v_at),
           operational_state_source='terminal_status_guard_v1',
           updated_at=now()
     where id=new.project_id
       and (coalesce(operational_state,'')<>'closed'
            or coalesce(operational_state_source,'') not in ('terminal_status_guard_v1','terminal_status_reconcile_v1'));
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
      where f.project_id=new.project_id and f.source_type='email' and f.source_ref=new.gmail_message_id and f.fact_key='email_event.execution_release'
    ) then
      insert into public.pppp_project_context_facts(project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,idempotency_key,created_by)
      values(new.project_id,'execution','Execution release confirmed','email_event.execution_release',jsonb_build_object('summary','Klienti konfirmoi release-in për prodhim/saldim.','text',coalesce(new.snippet,new.subject)),'email',new.gmail_message_id,'confirmed',1,'observed','email-event:execution-release:'||new.gmail_message_id,'pppp_project_email_current_state_v1');
    end if;
    update public.projects set operational_state='execution',operational_state_at=v_at,operational_state_source='email_execution_release_auto_v1',updated_at=now() where id=new.project_id;
    update public.tasks set status='mbyllur',done_at=coalesce(done_at,now()),detail=concat_ws(E'\n',nullif(detail,''),'PPPP: release blocker superseded by confirmed client release email.')
     where project_id=new.project_id and source='execution_release_readiness' and lower(coalesce(status,'')) not in ('kryer','mbyllur','done','closed');
  end if;
  return new;
end;
$function$;

create or replace function public.pppp_project_analysis_operational_truth_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_state text;
  v_state_at timestamptz;
  v_state_source text;
  v_stage text;
  v_status text;
  v_terminal_label text;
  v_terminal_summary text;
begin
  if coalesce(new.model,'') <> 'project-decision-snapshot-v1' then return new; end if;

  select operational_state,operational_state_at,operational_state_source,pipeline_stage,status
    into v_state,v_state_at,v_state_source,v_stage,v_status
  from public.projects
  where id::text=new.project_id;

  if public.pppp_project_status_is_terminal_v1(v_status) then
    v_state:='closed';
    v_state_source:=case when coalesce(v_state_source,'') like 'terminal_status_%' then v_state_source else 'project_status_terminal_v1' end;
    if lower(coalesce(v_status,'')) in ('humbur','lost','cancelled','canceled','refuzuar','rejected','closedlost') then
      v_terminal_label:='opportunity e humbur';
      v_terminal_summary:='Kjo opportunity është e mbyllur si e humbur. PPPP nuk duhet ta trajtojë si projekt aktiv dhe nuk duhet të krijojë follow-up automatik për këtë opportunity.';
    elsif lower(coalesce(v_status,'')) in ('realizuar','completed','complete') then
      v_terminal_label:='projekt i realizuar';
      v_terminal_summary:='Ky projekt është shënuar i realizuar. Veprimet e fazës aktive nuk duhet të vazhdojnë.';
    elsif lower(coalesce(v_status,'')) in ('arkivuar','archived') then
      v_terminal_label:='projekt i arkivuar';
      v_terminal_summary:='Ky projekt është arkivuar dhe nuk duhet të shfaqet si aktiv.';
    else
      v_terminal_label:='projekt i mbyllur';
      v_terminal_summary:='Ky projekt është mbyllur dhe nuk duhet të shfaqet si aktiv.';
    end if;
    new.analysis := coalesce(new.analysis,'{}'::jsonb) || jsonb_build_object(
      'executive_summary',v_terminal_summary,
      'current_stage',coalesce(nullif(v_stage,''),'closed'),
      'health',jsonb_build_object('label',v_terminal_label,'score',100,'reason','Statusi terminal i konfirmuar i projektit ka përparësi ndaj pipeline-it, emailave dhe analizave të vjetra.'),
      'recommendation',jsonb_build_object('decision','terminal_no_active_followup','label','Mos e trajto si projekt aktiv','reason','PPPP po respekton statusin terminal ekzistues; ndryshimi won/lost mbetet vetëm me vendim njerëzor.','source_ids',jsonb_build_array('PROJECT_STATUS')),
      'next_actions','[]'::jsonb,
      'missing_information','[]'::jsonb,
      'operational_truth',jsonb_strip_nulls(jsonb_build_object('state','closed','at',v_state_at,'source',v_state_source,'terminal_status',v_status))
    );
    return new;
  end if;

  if coalesce(v_state,'')='wait_for_client' then
    new.analysis := coalesce(new.analysis,'{}'::jsonb) || jsonb_build_object(
      'executive_summary','Projekti është në pritje të palës tjetër. Nuk kërkohet veprim i ri derisa të vijë përgjigjja ose të aktivizohet follow-up-i.',
      'current_stage',coalesce(nullif(v_stage,''),'client_offer'),
      'health',jsonb_build_object('label','në pritje të klientit','score',96,'reason','Gjendja operative kanonike është wait_for_client.'),
      'recommendation',jsonb_build_object('decision','wait_for_client','label','Në pritje të përgjigjes së klientit','reason','Gjendja operative kanonike e projektit ka përparësi ndaj draft-eve ose task-eve më të vjetra.','source_ids',jsonb_build_array('OPERATIONAL_STATE')),
      'next_actions','[]'::jsonb,
      'missing_information',jsonb_build_array(jsonb_build_object('text','Përgjigjja ose konfirmimi i klientit','ask_to','client','priority','normal','why_needed','Për të vendosur hapin e ardhshëm.')),
      'operational_truth',jsonb_strip_nulls(jsonb_build_object('state',v_state,'at',v_state_at,'source',v_state_source))
    );
    return new;
  end if;

  if coalesce(v_state,'')='execution' then
    new.analysis := coalesce(new.analysis,'{}'::jsonb) || jsonb_build_object(
      'executive_summary','Projekti është në ekzekutim. Prioritetet operative vijnë nga prodhimi, dokumentacioni, dorëzimi dhe detyrat aktive të ekzekutimit.',
      'current_stage',coalesce(nullif(v_stage,''),'production_control'),
      'health',jsonb_build_object('label','në ekzekutim','score',96,'reason','Gjendja operative kanonike është execution.'),
      'recommendation',jsonb_build_object('decision','execution_active','label','Ndiq ekzekutimin e projektit','reason','Veprimet e fazës së ofertimit janë tejkaluar; ndiq vetëm detyrat aktive të ekzekutimit.','source_ids',jsonb_build_array('OPERATIONAL_STATE')),
      'next_actions','[]'::jsonb,
      'operational_truth',jsonb_strip_nulls(jsonb_build_object('state',v_state,'at',v_state_at,'source',v_state_source))
    );
    return new;
  end if;

  if coalesce(v_state,'')='action_required' and coalesce(v_state_source,'')='client_reply_auto' then
    new.analysis := coalesce(new.analysis,'{}'::jsonb) || jsonb_build_object(
      'executive_summary','Klienti ka dërguar përgjigje të re pas gjendjes së pritjes. Projekti kërkon rishikim dhe vendim të ri.',
      'current_stage',coalesce(nullif(v_stage,''),'client_offer'),
      'health',jsonb_build_object('label','përgjigje e re nga klienti','score',98,'reason','Gjendja operative u aktivizua nga një email i ri i klientit.'),
      'recommendation',jsonb_build_object('decision','review_client_reply','label','Shqyrto përgjigjen e klientit','reason','Emaili i ri i klientit ka përparësi ndaj gjendjes së mëparshme wait_for_client.','source_ids',jsonb_build_array('OPERATIONAL_STATE')),
      'next_actions',jsonb_build_array(jsonb_build_object('text','Hap komunikimin e projektit, shqyrto përgjigjen dhe vendos hapin e ardhshëm.','owner','PRISTEEL','priority','critical','status','open','source_ids',jsonb_build_array('OPERATIONAL_STATE'))),
      'operational_truth',jsonb_strip_nulls(jsonb_build_object('state',v_state,'at',v_state_at,'source',v_state_source))
    );
    return new;
  end if;

  return new;
end;
$function$;

-- Reconcile all already-terminal rows. This respects the existing human-decided
-- project status; it does not decide won/lost or change project.status.
update public.projects p
   set operational_state='closed',
       operational_state_at=coalesce(greatest(p.operational_state_at,p.last_email_at,p.last_activity_at),now()),
       operational_state_source='terminal_status_reconcile_v1',
       updated_at=now()
 where public.pppp_project_status_is_terminal_v1(p.status)
   and (coalesce(p.operational_state,'')<>'closed'
        or coalesce(p.operational_state_source,'') not in ('terminal_status_guard_v1','terminal_status_reconcile_v1'));

-- Re-run only the latest decision snapshot per terminal project through the
-- operational-truth trigger so stale "projekt aktiv" summaries are corrected.
with latest as (
  select distinct on (pa.project_id) pa.id
  from public.project_analyses pa
  join public.projects p on p.id::text=pa.project_id
  where pa.model='project-decision-snapshot-v1'
    and public.pppp_project_status_is_terminal_v1(p.status)
  order by pa.project_id,pa.created_at desc,pa.id desc
)
update public.project_analyses pa
   set analysis=pa.analysis
  from latest l
 where pa.id=l.id;

commit;
