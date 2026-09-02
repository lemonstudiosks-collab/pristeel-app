create or replace function public.pppp_rfq_draft_quality_guard_v1()
returns trigger
language plpgsql
set search_path to pg_catalog, public
as $$
declare
  p record;
  v_bom_rows integer := 0;
  v_review_rows integer := 0;
  v_total_kg numeric := 0;
  v_profiles text := '';
  v_dims text := '';
  v_grades text := '';
  v_standards text := '';
  v_certs text := '';
  v_surfaces text := '';
  v_material_only boolean := false;
  v_doc text := '';
  v_lang text := 'en';
  v_greeting text := '';
  v_name text := '';
  v_tech text := '';
  v_review_note text := '';
  v_request text := '';
  v_signature text := E'Arianit Vllahiu\nPRISTEEL Sh.p.k.\nsales@prissteel.com\n+383 44 244 699';
begin
  if new.project_id is null
     or new.sent_at is not null
     or lower(coalesce(new.status,'')) not in ('draft','draft_review')
     or coalesce(new.notes,'') not like 'PPPP_LOCAL_SEMANTIC_V4|%'
  then
    return new;
  end if;

  select id,name,client,business_type,deal_type,notes,drive_folder_url,drive_folder_id
    into p
  from public.projects
  where id=new.project_id;

  if not found then return new; end if;

  select count(*),
         count(*) filter (where coalesce(needs_review,false)),
         coalesce(sum(kg),0)
    into v_bom_rows,v_review_rows,v_total_kg
  from public.bom_items
  where project_id=new.project_id;

  select coalesce(string_agg(x, ', ' order by x),'') into v_profiles
  from (select distinct trim(profile) x from public.bom_items where project_id=new.project_id and nullif(trim(profile),'') is not null order by 1 limit 16) s;
  select coalesce(string_agg(x, '; ' order by x),'') into v_dims
  from (select distinct trim(coalesce(dim,dimensionet)) x from public.bom_items where project_id=new.project_id and nullif(trim(coalesce(dim,dimensionet)),'') is not null order by 1 limit 16) s;
  select coalesce(string_agg(x, ', ' order by x),'') into v_grades
  from (select distinct trim(coalesce(grade,materiali)) x from public.bom_items where project_id=new.project_id and nullif(trim(coalesce(grade,materiali)),'') is not null order by 1 limit 12) s;
  select coalesce(string_agg(x, ', ' order by x),'') into v_standards
  from (select distinct trim(std) x from public.bom_items where project_id=new.project_id and nullif(trim(std),'') is not null order by 1 limit 12) s;
  select coalesce(string_agg(x, ', ' order by x),'') into v_certs
  from (select distinct trim(cert) x from public.bom_items where project_id=new.project_id and nullif(trim(cert),'') is not null order by 1 limit 12) s;
  select coalesce(string_agg(x, '; ' order by x),'') into v_surfaces
  from (select distinct trim(surface) x from public.bom_items where project_id=new.project_id and nullif(trim(surface),'') is not null order by 1 limit 12) s;

  v_material_only := (
      lower(coalesce(p.business_type,''))='trading'
      or lower(coalesce(p.name,'')||' '||coalesce(p.notes,'')) ~ '(heavy[ -]?plate|marine[- ]?grade|raw material|material supply|furnizim|supply of|steel plate)'
    ) and coalesce(v_profiles,'')='';

  v_doc := coalesce(nullif(trim(p.drive_folder_url),''),
            case when nullif(trim(p.drive_folder_id),'') is not null then 'https://drive.google.com/drive/folders/'||trim(p.drive_folder_id) else '' end);
  v_lang := lower(coalesce(nullif(trim(new.lang),''),'en'));
  v_greeting := split_part(coalesce(new.body,''), E'\n', 1);
  if trim(v_greeting)='' then
    v_greeting := case when v_lang='de' then 'Guten Tag,' when v_lang='sr' then 'Poštovani,' when v_lang='sq' then 'Përshëndetje,' else 'Hello,' end;
  elsif v_lang='sq' and lower(v_greeting) like 'hello %' then
    v_greeting := 'Përshëndetje '||regexp_replace(v_greeting,'^[Hh]ello\s+','');
  end if;

  v_name := coalesce(nullif(trim(p.name),''),nullif(trim(new.project_name),''),'Project');

  v_tech := '- Total BOM weight: '||trim(to_char(v_total_kg,'FM999G999G999G990D00'))||' kg';
  if v_grades<>'' then v_tech := v_tech||E'\n- Grade(s): '||v_grades; end if;
  if v_material_only and v_dims<>'' then v_tech := v_tech||E'\n- Plate / material dimensions: '||v_dims; end if;
  if not v_material_only and v_profiles<>'' then v_tech := v_tech||E'\n- Main profiles / items: '||v_profiles; end if;
  if v_standards<>'' then v_tech := v_tech||E'\n- Standard(s): '||v_standards; end if;
  if v_certs<>'' then v_tech := v_tech||E'\n- Certificate(s): '||v_certs; end if;
  if v_surfaces<>'' then v_tech := v_tech||E'\n- Surface treatment: '||v_surfaces; end if;

  if v_review_rows>0 then
    v_review_note := case when v_lang='sq' then E'\n\nShënim: BOM-i është paraprak dhe '||v_review_rows||' rreshta kërkojnë ende verifikim teknik. Ju lutem bazojeni ofertën në dokumentacion dhe shënoni qartë çdo supozim ose devijim.'
      when v_lang='sr' then E'\n\nNapomena: BOM je preliminaran i '||v_review_rows||' stavki još zahteva tehničku proveru. Molimo bazirajte ponudu na projektnoj dokumentaciji i jasno navedite sve pretpostavke ili odstupanja.'
      when v_lang='de' then E'\n\nHinweis: Die BOM ist vorläufig; '||v_review_rows||' Positionen benötigen noch technische Prüfung. Bitte stützen Sie Ihr Angebot auf die Projektdokumentation und kennzeichnen Sie Annahmen oder Abweichungen eindeutig.'
      else E'\n\nNote: the BOM is preliminary and '||v_review_rows||' rows still require technical verification. Please base your quotation on the project documentation and clearly identify all assumptions or deviations.' end;
    new.status := 'draft_review';
  end if;

  if v_doc='' then new.status := 'draft_review'; end if;

  if v_lang='sq' then
    v_request := case when v_material_only
      then 'Ju lutem dërgoni ofertën për furnizimin e materialit sipas specifikimit më poshtë. Përfshini çmimin për njësi dhe total, disponueshmërinë, fabrikën/origjinën, afatin e furnizimit, Incoterm-in, transportin dhe kushtet e pagesës. Konfirmoni certifikatat e kërkuara; nëse trajtimi sipërfaqësor nuk përfshihet, shënojeni qartë.'
      else 'Ju lutem dërgoni ofertën për material + fabrikim sipas dokumentacionit. Përfshini trajtimin sipërfaqësor të kërkuar, transportin, afatin e dorëzimit, Incoterm-in dhe kushtet e pagesës. Shënoni qartë çdo paqartësi, përjashtim ose devijim teknik.' end;
    new.body := v_greeting||E'\n\n'||v_request||E'\n\nProjekti:\n'||v_name||E'\n\nBaza teknike:\n'||v_tech||case when v_doc<>'' then E'\n\nDokumentacioni:\n'||v_doc else '' end||v_review_note||E'\n\nPërshëndetje,\n'||v_signature;
  elsif v_lang='sr' then
    v_request := case when v_material_only
      then 'Molimo dostavite ponudu za isporuku materijala prema specifikaciji ispod. Uključite jediničnu i ukupnu cenu, raspoloživost, proizvođača/poreklo, rok isporuke, Incoterm, transport i uslove plaćanja. Potvrdite tražene sertifikate; ako površinska zaštita nije uključena, navedite to jasno.'
      else 'Molimo dostavite ponudu za materijal + izradu prema projektnoj dokumentaciji. Uključite traženu površinsku zaštitu, transport, rok isporuke, Incoterm i uslove plaćanja. Sve nejasnoće, isključenja ili tehnička odstupanja jasno navedite.' end;
    new.body := v_greeting||E'\n\n'||v_request||E'\n\nProjekat:\n'||v_name||E'\n\nTehnička osnova:\n'||v_tech||case when v_doc<>'' then E'\n\nProjektna dokumentacija:\n'||v_doc else '' end||v_review_note||E'\n\nSrdačan pozdrav,\n'||v_signature;
  elsif v_lang='de' then
    v_request := case when v_material_only
      then 'Bitte senden Sie uns Ihr Angebot für die Materiallieferung gemäß der untenstehenden Spezifikation. Bitte geben Sie Stück-/Einheitspreis und Gesamtpreis, Verfügbarkeit, Werk/Ursprung, Lieferzeit, Incoterm, Transport und Zahlungsbedingungen an. Bestätigen Sie die geforderten Zeugnisse; falls die Oberflächenbehandlung nicht enthalten ist, kennzeichnen Sie dies eindeutig.'
      else 'Bitte senden Sie uns Ihr Angebot für Material + Fertigung gemäß Projektdokumentation. Bitte berücksichtigen Sie die erforderliche Oberflächenbehandlung, Transport, Lieferzeit, Incoterm und Zahlungsbedingungen und kennzeichnen Sie Unklarheiten, Ausschlüsse oder technische Abweichungen eindeutig.' end;
    new.body := v_greeting||E'\n\n'||v_request||E'\n\nProjekt:\n'||v_name||E'\n\nTechnische Grundlage:\n'||v_tech||case when v_doc<>'' then E'\n\nProjektdokumentation:\n'||v_doc else '' end||v_review_note||E'\n\nMit freundlichen Grüßen\n'||v_signature;
  else
    v_request := case when v_material_only
      then 'Please provide your quotation for material supply according to the specification below. Include unit and total price, availability, mill/origin, lead time, Incoterm, transport and payment terms. Confirm the required certificates; if surface treatment is not included, state this clearly.'
      else 'Please provide your quotation for material + fabrication according to the project documentation. Include the required surface treatment, transport, delivery time, Incoterm and payment terms. Clearly identify any ambiguity, exclusion or technical deviation.' end;
    new.body := v_greeting||E'\n\n'||v_request||E'\n\nProject:\n'||v_name||E'\n\nTechnical basis:\n'||v_tech||case when v_doc<>'' then E'\n\nProject documentation:\n'||v_doc else '' end||v_review_note||E'\n\nKind regards,\n'||v_signature;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_pppp_rfq_draft_quality_guard_v1 on public.rfq_log;
create trigger trg_pppp_rfq_draft_quality_guard_v1
before insert or update of project_id,project_name,lang,subject,body,status,notes,sent_at
on public.rfq_log
for each row
execute function public.pppp_rfq_draft_quality_guard_v1();

create or replace function public.pppp_reconcile_supplier_waits_v1(p_apply boolean default false, p_limit integer default 100)
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
  v_checked integer := 0;
  v_items jsonb := '[]'::jsonb;
begin
  for r in
    with supplier_outgoing as (
      select distinct on (e.project_id, lower(c.email))
             e.project_id,e.gmail_message_id,e.sent_at,c.email,c.company,p.name as project_name,p.status,p.pipeline_stage,p.operational_state
      from public.project_emails e
      cross join lateral unnest(coalesce(e.to_emails,'{}'::text[])) recipient(email)
      join public.contacts c on lower(c.email)=lower(recipient.email) and lower(coalesce(c.kind,''))='supplier'
      join public.projects p on p.id=e.project_id
      where e.project_id is not null
        and e.direction='outgoing'
        and e.sent_at >= now()-interval '14 days'
        and lower(coalesce(p.status,'')) not in ('humbur','arkivuar','mbyllur','realizuar','lost','closed','cancelled','canceled')
      order by e.project_id,lower(c.email),e.sent_at desc
    )
    select * from supplier_outgoing
    order by sent_at desc
    limit greatest(1,least(coalesce(p_limit,100),300))
  loop
    v_checked := v_checked + 1;
    v_source_ref := 'project:'||r.project_id::text||':supplier:'||lower(r.email);
    select max(e.sent_at) into v_replied_at
    from public.project_emails e
    where e.project_id=r.project_id
      and e.direction='incoming'
      and lower(coalesce(e.from_email,''))=lower(r.email)
      and e.sent_at>r.sent_at;

    if v_replied_at is not null then
      if p_apply then
        update public.tasks
           set status='kryer',done_at=coalesce(done_at,now())
         where source='supplier_wait_auto'
           and source_ref=v_source_ref
           and status not in ('kryer','mbyllur','done','closed');
        if found then v_closed := v_closed + 1; end if;
      end if;
      v_items := v_items || jsonb_build_array(jsonb_build_object('project_id',r.project_id,'supplier',r.company,'action','supplier_replied','reply_at',v_replied_at));
      continue;
    end if;

    if p_apply then
      insert into public.tasks(project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref)
      values(
        r.project_id,
        'Presim kalkulimin nga '||coalesce(nullif(r.company,''),r.email)||' — '||r.project_name,
        'PPPP: dokumentet/RFQ i janë dërguar furnitorit më '||to_char(r.sent_at at time zone 'Europe/Belgrade','YYYY-MM-DD HH24:MI')||'. Ende nuk ka përgjigje të lidhur me projektin. Follow-up vetëm kur të vijë afati.',
        (r.sent_at at time zone 'Europe/Belgrade')::date + 2,
        'larte','hapur','supplier_wait_auto',r.email,'furnitor',v_source_ref
      )
      on conflict (source,source_ref) do update
        set project_id=excluded.project_id,title=excluded.title,detail=excluded.detail,
            due_date=excluded.due_date,priority=excluded.priority,contact_email=excluded.contact_email,
            category=excluded.category,
            status=case when public.tasks.status in ('kryer','mbyllur','done','closed') then 'hapur' else public.tasks.status end,
            done_at=case when public.tasks.status in ('kryer','mbyllur','done','closed') then null else public.tasks.done_at end;

      update public.projects
         set pipeline_stage=case when pipeline_stage in ('rfq_in','technical_review','supplier_selection') then 'pricing' else pipeline_stage end,
             operational_state=case when operational_state in ('wait_for_client','execution') then operational_state else 'active_work' end,
             operational_state_at=case
               when operational_state in ('wait_for_client','execution') then operational_state_at
               when operational_state is distinct from 'active_work' or operational_state_source is distinct from 'supplier-wait-auto-v1' then now()
               else operational_state_at
             end,
             operational_state_source=case when operational_state in ('wait_for_client','execution') then operational_state_source else 'supplier-wait-auto-v1' end
       where id=r.project_id;

      update public.tasks
         set status='kryer',done_at=coalesce(done_at,now())
       where project_id=r.project_id
         and source='project_discovery_auto'
         and status='hapur';
      v_opened := v_opened + 1;
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object('project_id',r.project_id,'supplier',r.company,'supplier_email',r.email,'action','waiting_supplier','sent_at',r.sent_at));
  end loop;

  return jsonb_build_object('apply',p_apply,'checked',v_checked,'waiting_opened_or_refreshed',v_opened,'closed_on_reply',v_closed,'items',v_items);
end;
$$;

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='semantic-local-orchestrator-5m' limit 1;
  if v_jobid is not null then
    perform cron.alter_job(v_jobid, schedule := '7,22,37,52 * * * *');
  end if;
end $$;

with ranked as (
  select id,row_number() over(partition by project_id order by created_at desc,id desc) as rn
  from public.semantic_ai_jobs
  where state='completed'
    and applied_at is null
    and coalesce(payload->'trigger'->>'kind','')='project_state'
)
update public.semantic_ai_jobs j
   set state='superseded',application_error='Superseded duplicate project_state result after supplier-wait fingerprint guard.'
from ranked r
where j.id=r.id and r.rn>1;

update public.rfq_log
   set body=body
 where sent_at is null
   and lower(coalesce(status,'')) in ('draft','draft_review')
   and coalesce(notes,'') like 'PPPP_LOCAL_SEMANTIC_V4|%';