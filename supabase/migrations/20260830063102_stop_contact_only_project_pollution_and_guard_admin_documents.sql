-- Contact uniqueness is context, not project identity. Do not hard-link a project from it.
create or replace function public.pppp_project_contact_unique_autolink_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_project uuid;
  v_count integer := 0;
begin
  if new.project_id is not null then
    return new;
  end if;

  if coalesce(new.match_method,'') like 'project-contact-unique-detached%' then
    return new;
  end if;

  with candidates as (
    select distinct p.id
    from public.project_contacts pc
    join public.projects p on p.id::text = pc.project_id
    where lower(coalesce(pc.status,'active'))='active'
      and lower(coalesce(p.status,'')) not in ('humbur','lost','arkivuar','archived','mbyllur','closed','closedlost','cancelled','canceled','realizuar')
      and (
        (lower(coalesce(new.direction,''))='incoming' and lower(coalesce(pc.email,''))=lower(coalesce(new.from_email,'')))
        or
        (lower(coalesce(new.direction,''))='outgoing' and exists(
          select 1 from unnest(coalesce(new.to_emails,'{}'::text[])) x
          where lower(x)=lower(coalesce(pc.email,''))
        ))
      )
  ), picked as (
    select count(*)::int cnt,(array_agg(id))[1] project_id from candidates
  )
  select cnt,project_id into v_count,v_project from picked;

  if v_count=1 and v_project is not null then
    new.suggested_project_id := coalesce(new.suggested_project_id,v_project);
    if new.suggested_project_id = v_project
       and (coalesce(new.match_method,'')='' or new.match_method like 'project-contact-unique%') then
      new.match_method := 'project-contact-unique-suggest-v2';
      new.match_confidence := greatest(coalesce(new.match_confidence,0),80);
      new.needs_review := true;
      new.review_reason := coalesce(
        nullif(new.review_reason,''),
        'Unique project contact is suggestion-only; confirm project identity from subject, content, RFQ, or explicit project evidence.'
      );
      new.updated_at := now();
    end if;
  end if;
  return new;
end;
$function$;

-- Deterministic administrative/financial signals used only to suppress false technical-BOM tasks.
create or replace function private.pppp_document_administrative_signal_v1(
  p_name text,
  p_subject text,
  p_text text default null
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $function$
  select lower(coalesce(p_name,'') || ' ' || coalesce(p_subject,'') || ' ' || left(coalesce(p_text,''),4000)) ~
    '(prilogistics|leternjoftim|identity[ -]?card|passport|statut(i|e)?\b|certifikat(a|e)?.{0,30}(biznes|business)|administrata.{0,20}tatim|tax.{0,20}(administration|certificate)|analiz(e|a).{0,20}financ|financial.{0,20}analysis|payroll|lista.{0,15}pagave|salary|bank.{0,15}statement|classification.{0,20}restricted|\bcrk\b.{0,20}(konsent|consent)|invoice|fatur(e|a)|payment.{0,20}(receipt|proof)|zahlung)';
$function$;

revoke all on function private.pppp_document_administrative_signal_v1(text,text,text) from public, anon, authenticated;
grant execute on function private.pppp_document_administrative_signal_v1(text,text,text) to service_role;

create or replace function public.pppp_document_bom_review_admin_guard_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
  v_attachment_id bigint;
  v_name text;
  v_text text;
  v_subject text;
begin
  if coalesce(new.source,'') <> 'document_bom_review'
     or coalesce(new.source_ref,'') !~ '^ATTACHMENT:[0-9]+$' then
    return new;
  end if;

  v_attachment_id := substring(new.source_ref from 'ATTACHMENT:([0-9]+)')::bigint;

  select a.attachment_name,a.extracted_text,
         (select e.subject
            from public.project_emails e
           where e.gmail_message_id=a.gmail_message_id
             and e.project_id::text=a.project_id
           order by e.sent_at desc
           limit 1)
    into v_name,v_text,v_subject
  from public.project_attachment_links a
  where a.id=v_attachment_id;

  if found and private.pppp_document_administrative_signal_v1(v_name,v_subject,v_text) then
    new.status := 'mbyllur';
    new.done_at := coalesce(new.done_at,now());
    new.priority := coalesce(new.priority,'mesatare');
    new.detail := coalesce(new.detail,'') || E'\nAuto-closed by PPPP: the source has a deterministic administrative/financial signal and is not a technical BOM-review action.';
  end if;

  return new;
end;
$function$;

revoke all on function public.pppp_document_bom_review_admin_guard_v1() from public, anon, authenticated;
grant execute on function public.pppp_document_bom_review_admin_guard_v1() to service_role;

drop trigger if exists trg_pppp_document_bom_review_admin_guard_v1 on public.tasks;
create trigger trg_pppp_document_bom_review_admin_guard_v1
before insert or update of source,source_ref,status on public.tasks
for each row execute function public.pppp_document_bom_review_admin_guard_v1();

update public.tasks t
set status='mbyllur',done_at=coalesce(t.done_at,now())
from public.project_attachment_links a
left join public.project_emails e
  on e.gmail_message_id=a.gmail_message_id and e.project_id::text=a.project_id
where t.source='document_bom_review'
  and t.source_ref='ATTACHMENT:'||a.id::text
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and private.pppp_document_administrative_signal_v1(a.attachment_name,e.subject,a.extracted_text);

update public.project_attachment_links a
set bom_status='none',updated_at=now()
from public.project_emails e
where e.gmail_message_id=a.gmail_message_id
  and e.project_id::text=a.project_id
  and a.bom_applied_count=0
  and coalesce(jsonb_array_length(a.bom_candidates),0)=0
  and private.pppp_document_administrative_signal_v1(a.attachment_name,e.subject,a.extracted_text)
  and a.bom_status='review';

-- Demote any rows previously hard-linked only by the live contact trigger.
delete from public.project_email_links l
using public.project_emails e
where e.match_method='project-contact-unique-auto-v1'
  and e.project_id is not null
  and l.gmail_message_id=e.gmail_message_id
  and l.project_id=e.project_id::text;

update public.project_emails e
set suggested_project_id=e.project_id,
    project_id=null,
    match_method='project-contact-unique-suggest-v2',
    match_confidence=80,
    needs_review=true,
    review_reason='Contact-only project match demoted to suggestion; stronger project identity evidence is required.',
    updated_at=now()
where e.match_method='project-contact-unique-auto-v1';

-- Detach only clearly contradictory historical contact-only links.
create temporary table _pppp_detach_contact_mislinks on commit drop as
select e.id,e.project_id,e.gmail_message_id
from public.project_emails e
join public.projects p on p.id=e.project_id
where e.match_method='project-contact-unique-backfill-v1'
  and lower(coalesce(e.subject,'')) ~ '(prilogistics|^id[[:space:]]+oltiani$)'
  and lower(concat_ws(' ',p.name,p.client,p.ref,p.business_ref,array_to_string(p.identity_aliases,' '))) not like '%prilogistics%';

update public.tasks t
set status='mbyllur',done_at=coalesce(t.done_at,now())
where t.source in ('document_bom_review','document_image_review')
  and lower(coalesce(t.status,'')) not in ('kryer','mbyllur','done','closed')
  and exists (
    select 1
    from public.project_attachment_links a
    join _pppp_detach_contact_mislinks d
      on d.gmail_message_id=a.gmail_message_id and d.project_id::text=a.project_id
    where t.source_ref='ATTACHMENT:'||a.id::text
  );

delete from public.project_email_links l
using _pppp_detach_contact_mislinks d
where l.gmail_message_id=d.gmail_message_id and l.project_id=d.project_id::text;

delete from public.project_attachment_links a
using _pppp_detach_contact_mislinks d
where a.gmail_message_id=d.gmail_message_id and a.project_id=d.project_id::text;

update public.project_emails e
set project_id=null,
    suggested_project_id=null,
    match_method='project-contact-unique-detached-v2',
    match_confidence=0,
    needs_review=true,
    review_reason='Detached from project: historical contact-only match contradicted by an unrelated Prilogistics/personal-identity subject.',
    updated_at=now()
from _pppp_detach_contact_mislinks d
where e.id=d.id;
