-- Prevent prepared/planned/scheduled RFQs from being treated as sent correspondence.
-- A supplier email may drive project linking, reply state, pricing stage, tasks or analyses
-- only when there is evidence that the RFQ was actually sent before that incoming email.
-- The migration also reconciles derived state created by the old unsent-RFQ fallback.

do $$
declare
  v_def text;
  v_new text;
begin
  select pg_get_functiondef('public.pppp_reconcile_email_context_v1(integer)'::regprocedure) into v_def;
  if position('max(coalesce(r.sent_at,r.created_at))' in v_def)=0
     or position('coalesce(r.sent_at,r.created_at) >= now()-interval ''30 days''' in v_def)=0 then
    raise exception 'pppp_reconcile_email_context_v1 source shape changed; review guard migration';
  end if;
  v_new := replace(v_def,'max(coalesce(r.sent_at,r.created_at))','max(r.sent_at)');
  v_new := replace(v_new,'coalesce(r.sent_at,r.created_at) >= now()-interval ''30 days''','r.sent_at >= now()-interval ''30 days''');
  execute v_new;

  select pg_get_functiondef('public.pppp_project_email_event_engine_v1()'::regprocedure) into v_def;
  if position('and coalesce(r.sent_at,''-infinity''::timestamptz) <= coalesce(new.sent_at,new.created_at,now())' in v_def)=0 then
    raise exception 'pppp_project_email_event_engine_v1 source shape changed; review guard migration';
  end if;
  v_new := replace(
    v_def,
    'and coalesce(r.sent_at,''-infinity''::timestamptz) <= coalesce(new.sent_at,new.created_at,now())',
    'and r.sent_at is not null' || E'\n      ' || 'and r.sent_at <= coalesce(new.sent_at,new.created_at,now())'
  );
  execute v_new;

  select pg_get_functiondef('public.pppp_automated_task_event_precedence()'::regprocedure) into v_def;
  if position('and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,''''))' || E'\n  ' || 'where e.project_id=new.project_id' in v_def)=0 then
    raise exception 'pppp_automated_task_event_precedence source shape changed; review guard migration';
  end if;
  v_new := replace(
    v_def,
    'and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,''''))' || E'\n  ' || 'where e.project_id=new.project_id',
    'and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,''''))' || E'\n   ' ||
    'and r.sent_at is not null' || E'\n   ' ||
    'and r.sent_at <= coalesce(e.sent_at,e.created_at,now())' || E'\n  ' ||
    'where e.project_id=new.project_id'
  );
  execute v_new;

  select pg_get_functiondef('public.pppp_project_analysis_event_precedence_v1()'::regprocedure) into v_def;
  if position('from public.project_emails e join public.rfq_log r on r.project_id=v_pid and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,''''))' in v_def)=0 then
    raise exception 'pppp_project_analysis_event_precedence_v1 source shape changed; review guard migration';
  end if;
  v_new := replace(
    v_def,
    'from public.project_emails e join public.rfq_log r on r.project_id=v_pid and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,''''))',
    'from public.project_emails e join public.rfq_log r on r.project_id=v_pid and lower(coalesce(r.supplier_email,''''))=lower(coalesce(e.from_email,'''')) and r.sent_at is not null and r.sent_at <= coalesce(e.sent_at,e.created_at,now())'
  );
  execute v_new;
end
$$;

-- Capture only RFQ-fallback links that have no prior outbound RFQ evidence and no
-- explicit project identity in the subject. These are safe to remove as fallback links.
create temporary table _pppp_invalid_unsent_rfq_links on commit drop as
select e.id as email_row_id,
       e.gmail_message_id,
       e.gmail_thread_id,
       e.project_id,
       e.from_email,
       coalesce(e.sent_at,e.created_at) as email_at
from public.project_emails e
where e.project_id is not null
  and e.direction='incoming'
  and e.match_method='server-context-rfq-v1'
  and public.pppp_email_subject_explicit_project_v1(e.subject) is null
  and not exists (
    select 1
    from public.rfq_log r
    where r.project_id=e.project_id
      and public.pppp_email_key_v1(r.supplier_email)=public.pppp_email_key_v1(e.from_email)
      and r.sent_at is not null
      and r.sent_at <= coalesce(e.sent_at,e.created_at,now())
  );

-- Remove only the derived link created by the invalid RFQ fallback.
delete from public.project_email_links l
using _pppp_invalid_unsent_rfq_links i
where l.gmail_message_id=i.gmail_message_id
  and l.project_id=i.project_id::text
  and l.link_method='server-context-rfq-v1';

update public.project_emails e
set project_id=null,
    suggested_project_id=null,
    match_method='unsent-rfq-context-withheld-v1',
    match_confidence=0,
    needs_review=true,
    review_reason='Automatic RFQ-context link removed because no outbound RFQ had been sent before this incoming message.',
    updated_at=now()
from _pppp_invalid_unsent_rfq_links i
where e.id=i.email_row_id;

-- If an unsent canonical RFQ was falsely promoted to replied, restore its real
-- prepared/scheduled state. This is deliberately limited to records created by the
-- canonical ChatGPT RFQ materializer marker.
update public.rfq_log r
set status=case when coalesce(r.notes,'') like '%Scheduled:%' then 'scheduled' else 'planned' end,
    replied_at=null
where r.sent_at is null
  and lower(coalesce(r.status,''))='replied'
  and r.offer_id is null
  and coalesce(r.notes,'') like 'PPPP state:%external send%'
  and exists (
    select 1 from _pppp_invalid_unsent_rfq_links i
    where i.project_id=r.project_id
      and public.pppp_email_key_v1(i.from_email)=public.pppp_email_key_v1(r.supplier_email)
  );

-- Dismiss only event-intelligence facts whose sole source email was one of the
-- invalid fallback links. The underlying email remains in the global inbox.
update public.pppp_project_context_facts f
set fact_status='dismissed', updated_at=now()
where f.created_by='pppp-project-event-intelligence'
  and f.fact_status<>'dismissed'
  and exists (
    select 1 from _pppp_invalid_unsent_rfq_links i
    where i.project_id=f.project_id and i.gmail_message_id=f.source_ref
  );

-- Close derived supplier-event tasks produced from the invalid email. Preserve all
-- user/ChatGPT tasks and unrelated project tasks.
update public.tasks t
set status='mbyllur',
    done_at=coalesce(t.done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'PPPP: mbyllur automatikisht sepse emaili burim ishte lidhur gabimisht nga një RFQ ende i padërguar.')
where lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed')
  and t.source='supplier_update_auto'
  and exists (
    select 1 from _pppp_invalid_unsent_rfq_links i
    where i.project_id=t.project_id and i.gmail_message_id=t.source_ref
  );

update public.tasks t
set status='mbyllur',
    done_at=coalesce(t.done_at,now()),
    detail=concat_ws(E'\n',nullif(t.detail,''),'PPPP: mbyllur automatikisht sepse nuk ka RFQ të dërguar dhe as përgjigje/ofertë valide të furnitorit.')
where lower(coalesce(t.status,'')) not in ('kryer','done','mbyllur','closed')
  and t.source='project_decision_auto'
  and exists (select 1 from _pppp_invalid_unsent_rfq_links i where i.project_id=t.project_id)
  and lower(coalesce(t.title,'') || ' ' || coalesce(t.detail,'')) ~ '(përgatit ofertën pristeel|oferta/përgjigjja e furnitorit|oferta e furnitorit)'
  and not exists (
    select 1
    from public.project_emails e
    join public.rfq_log r
      on r.project_id=t.project_id
     and public.pppp_email_key_v1(r.supplier_email)=public.pppp_email_key_v1(e.from_email)
     and r.sent_at is not null
     and r.sent_at <= coalesce(e.sent_at,e.created_at,now())
    where e.project_id=t.project_id
      and e.direction='incoming'
      and (coalesce(e.has_attachments,false) or lower(coalesce(e.subject,'')||' '||coalesce(e.snippet,'')) ~ '(ofert|ponud|quote|angebot|preis)')
  );

-- Remove only derived analyses generated from the invalid link; operational source data
-- and user facts are untouched. A clean project-decision snapshot is regenerated below.
delete from public.project_analyses a
where exists (
        select 1 from _pppp_invalid_unsent_rfq_links i
        where i.project_id::text=a.project_id
      )
  and (
    (a.model='deterministic-client-request-v1' and exists (
       select 1 from _pppp_invalid_unsent_rfq_links i
       where i.project_id::text=a.project_id and i.gmail_message_id=a.analysis->>'event_source_ref'
    ))
    or
    (a.model='project-decision-snapshot-v1'
       and a.analysis->'recommendation'->>'decision'='prepare_client_offer'
       and not exists (
         select 1
         from public.project_emails e
         join public.rfq_log r
           on r.project_id=e.project_id
          and public.pppp_email_key_v1(r.supplier_email)=public.pppp_email_key_v1(e.from_email)
          and r.sent_at is not null
          and r.sent_at <= coalesce(e.sent_at,e.created_at,now())
         where e.project_id::text=a.project_id
           and e.direction='incoming'
           and (coalesce(e.has_attachments,false) or lower(coalesce(e.subject,'')||' '||coalesce(e.snippet,'')) ~ '(ofert|ponud|quote|angebot|preis)')
       ))
    or
    (a.engine='semantic_local_brain_v4'
       and a.analysis->'guardrail'->>'pipeline_stage'='pricing'
       and a.created_at >= (select min(i.email_at) from _pppp_invalid_unsent_rfq_links i where i.project_id::text=a.project_id)
       and not exists (
         select 1
         from public.project_emails e
         join public.rfq_log r
           on r.project_id=e.project_id
          and public.pppp_email_key_v1(r.supplier_email)=public.pppp_email_key_v1(e.from_email)
          and r.sent_at is not null
          and r.sent_at <= coalesce(e.sent_at,e.created_at,now())
         where e.project_id::text=a.project_id and e.direction='incoming'
       ))
  );

-- Restore procurement stage only where pricing was reached without any actual supplier
-- offer/reply or PRISTEEL quotation. This is a conservative rollback of the false event.
update public.projects p
set pipeline_stage='rfq_in',
    last_email_at=(select max(e.sent_at) from public.project_emails e where e.project_id=p.id),
    updated_at=now()
where p.pipeline_stage='pricing'
  and exists (select 1 from _pppp_invalid_unsent_rfq_links i where i.project_id=p.id)
  and not exists (select 1 from public.offers o where o.project_id=p.id)
  and not exists (select 1 from public.documents_registry d where d.project_id=p.id and d.series='QUO')
  and not exists (
    select 1
    from public.project_emails e
    join public.rfq_log r
      on r.project_id=p.id
     and public.pppp_email_key_v1(r.supplier_email)=public.pppp_email_key_v1(e.from_email)
     and r.sent_at is not null
     and r.sent_at <= coalesce(e.sent_at,e.created_at,now())
    where e.project_id=p.id
      and e.direction='incoming'
      and (coalesce(e.has_attachments,false) or lower(coalesce(e.subject,'')||' '||coalesce(e.snippet,'')) ~ '(ofert|ponud|quote|angebot|preis)')
  );

-- Rebuild the deterministic project snapshot after the cleanup.
do $$
declare r record;
begin
  for r in select distinct project_id from _pppp_invalid_unsent_rfq_links loop
    begin
      perform public.pppp_refresh_project_decision(r.project_id);
    exception when others then
      raise warning 'PPPP decision refresh after unsent-RFQ cleanup failed for %: %',r.project_id,sqlerrm;
    end;
  end loop;
end
$$;
