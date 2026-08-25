-- PPPP business-intent routing v1
-- New Gmail-discovered projects create one transient human handoff.
-- KRPP/APP opportunities remain direct-bid decisions.
-- Open TED opportunities become automatic watch items, not human tender work.
-- TED awards wait for public-contact enrichment before surfacing for winner review/outreach.

alter table public.kek_tender_watch drop constraint if exists kek_tender_watch_status_check;
alter table public.kek_tender_watch
  add constraint kek_tender_watch_status_check
  check (status = any (array['new'::text,'review'::text,'watch'::text,'ignored'::text,'promoted'::text]));

create or replace function public.pppp_route_tender_business_intent_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_source text := upper(coalesce(new.payload->>'source','KRPP'));
  v_phase text := lower(coalesce(new.payload->>'notice_phase','opportunity'));
  v_company_type text;
  v_enriched boolean := false;
  v_has_winner boolean := false;
  v_next_check text;
begin
  new.payload := coalesce(new.payload,'{}'::jsonb);

  if v_source = 'TED' and v_phase = 'opportunity' then
    if coalesce(new.status,'new') in ('new','review') then new.status := 'watch'; end if;
    if new.deadline is not null then v_next_check := (new.deadline + 1)::text; else v_next_check := null; end if;
    new.payload := new.payload || jsonb_build_object(
      'workflow_track','ted_watch',
      'business_mode','watch_award',
      'human_action_required',false,
      'next_check_on',v_next_check,
      'wait_reason','Open TED notice: PRISTEEL does not bid directly; wait for award/result.'
    );
    return new;
  end if;

  if v_source = 'TED' and v_phase = 'award' then
    v_has_winner := coalesce(new.payload#>>'{winner,name}','') <> '';
    v_enriched := jsonb_typeof(new.payload#>'{winner,contact_enrichment}') = 'object';
    v_company_type := lower(coalesce(new.payload#>>'{winner,company_type}','unknown'));
    if v_company_type not in ('producer','gc_epc','trader_consortium','unknown') then v_company_type := 'unknown'; end if;

    if jsonb_typeof(new.payload->'winner') = 'object' then
      new.payload := jsonb_set(new.payload,'{winner,company_type}',to_jsonb(v_company_type),true);
    end if;

    if not v_has_winner then
      if coalesce(new.status,'new') in ('new','review') then new.status := 'watch'; end if;
    elsif v_enriched then
      if coalesce(new.status,'new') in ('new','watch') then new.status := 'review'; end if;
    else
      if coalesce(new.status,'new') = 'new' then new.status := 'watch'; end if;
    end if;

    new.payload := new.payload || jsonb_build_object(
      'workflow_track','ted_award_sales',
      'business_mode','winner_outreach',
      'human_action_required',(new.status='review'),
      'company_verification_required',(v_company_type='unknown'),
      'cooperation_angle',case
        when v_company_type='producer' then 'additional_fabrication_capacity'
        when v_company_type='gc_epc' then 'steel_fabrication_subcontractor'
        when v_company_type='trader_consortium' then 'verify_supply_or_fabrication_role'
        else 'verify_company_role'
      end
    );
    return new;
  end if;

  if v_phase = 'opportunity' and v_source in ('KRPP','APP','APP_AL') then
    new.payload := new.payload || jsonb_build_object(
      'workflow_track','direct_tender',
      'business_mode','direct_bid',
      'human_action_required',(coalesce(new.status,'new') in ('new','review'))
    );
    return new;
  end if;

  if v_phase = 'award' and v_source in ('KRPP','APP','APP_AL') then
    if new.project_id is null and coalesce(new.status,'new') in ('new','review') then new.status := 'watch'; end if;
    new.payload := new.payload || jsonb_build_object(
      'workflow_track','direct_tender_result',
      'human_action_required',(new.project_id is not null and new.status='review')
    );
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_pppp_route_tender_business_intent_v1 on public.kek_tender_watch;
create trigger trg_pppp_route_tender_business_intent_v1
before insert or update of payload,status,deadline,project_id
on public.kek_tender_watch
for each row execute function public.pppp_route_tender_business_intent_v1();

create or replace function public.pppp_ted_watch_task_guard_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
declare
  v_is_ted_watch boolean := false;
begin
  if coalesce(new.source,'') <> 'tender_deadline_auto' or coalesce(new.source_ref,'') = '' then return new; end if;

  select exists(
    select 1 from public.kek_tender_watch k
    where k.source_key = new.source_ref
      and upper(coalesce(k.payload->>'source',''))='TED'
      and lower(coalesce(k.payload->>'notice_phase','opportunity'))='opportunity'
  ) into v_is_ted_watch;

  if not v_is_ted_watch then return new; end if;
  if tg_op='INSERT' then return null; end if;

  new.status := 'mbyllur';
  new.done_at := coalesce(new.done_at,now());
  if position('PPPP: TED Watch' in coalesce(new.detail,''))=0 then
    new.detail := concat_ws(E'\n',nullif(new.detail,''),'PPPP: TED Watch — ky tender nuk kërkon ofertim direkt nga PRISTEEL; kontrolli i award-it bëhet automatikisht pas afatit.');
  end if;
  return new;
end;
$function$;

drop trigger if exists aa_pppp_ted_watch_task_guard_v1 on public.tasks;
create trigger aa_pppp_ted_watch_task_guard_v1
before insert or update of source,source_ref,status,detail
on public.tasks
for each row execute function public.pppp_ted_watch_task_guard_v1();

create or replace function public.pppp_new_project_handoff_v1()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ref text;
  v_has_action boolean := false;
begin
  if coalesce(new.operational_state_source,'') not like 'project-discovery%' then return new; end if;
  if lower(coalesce(new.status,'')) in ('mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost') then return new; end if;
  if coalesce(new.operational_state,'') in ('wait_for_client','execution') then return new; end if;

  v_ref := 'project:'||new.id::text||':new-project-handoff';
  if exists(select 1 from public.tasks where source='project_discovery_auto' and source_ref=v_ref) then return new; end if;

  select exists(
    select 1 from public.tasks t
    where t.project_id=new.id and t.status='hapur' and coalesce(t.source,'')<>'project_discovery_auto'
  ) into v_has_action;
  if v_has_action then return new; end if;

  insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
  values(
    new.id,
    'Analizo projektin e ri — '||new.name,
    concat_ws(E'\n',
      'PPPP e krijoi dhe e lidhi këtë projekt nga Project Discovery/Gmail.',
      'Hapi i radhës: shqyrto emailat dhe dokumentet e regjistruara, verifiko kërkesat teknike/komerciale dhe përcakto veprimin konkret të projektit.',
      'PPPP: ky është handoff i përkohshëm në Home; mbyllet automatikisht sapo të krijohet një veprim më konkret.'
    ),
    current_date,'e larte','hapur','project_discovery_auto','intern',v_ref
  ) on conflict (source,source_ref) do nothing;
  return new;
end;
$function$;

drop trigger if exists trg_pppp_new_project_handoff_insert_v1 on public.projects;
create trigger trg_pppp_new_project_handoff_insert_v1
after insert on public.projects
for each row execute function public.pppp_new_project_handoff_v1();

drop trigger if exists trg_pppp_new_project_handoff_source_v1 on public.projects;
create trigger trg_pppp_new_project_handoff_source_v1
after update of operational_state_source,origin_type on public.projects
for each row execute function public.pppp_new_project_handoff_v1();

create or replace function public.pppp_supersede_new_project_handoff_v1()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.project_id is null or coalesce(new.source,'')='project_discovery_auto' or coalesce(new.status,'')<>'hapur' then return new; end if;
  update public.tasks
     set status='mbyllur',
         done_at=coalesce(done_at,now()),
         detail=case when position('PPPP: handoff u zëvendësua' in coalesce(detail,''))=0
                     then concat_ws(E'\n',nullif(detail,''),'PPPP: handoff u zëvendësua automatikisht nga veprimi më konkret: '||coalesce(new.title,new.source,'.'))
                     else detail end
   where project_id=new.project_id
     and source='project_discovery_auto'
     and status='hapur';
  return new;
end;
$function$;

drop trigger if exists trg_pppp_supersede_new_project_handoff_v1 on public.tasks;
create trigger trg_pppp_supersede_new_project_handoff_v1
after insert or update of project_id,status,source,title
on public.tasks
for each row execute function public.pppp_supersede_new_project_handoff_v1();

update public.kek_tender_watch
set payload=payload
where upper(coalesce(payload->>'source','KRPP')) in ('TED','KRPP','APP','APP_AL');

update public.tasks
set status='mbyllur',
    done_at=coalesce(done_at,now()),
    detail=case when position('PPPP: TED Watch' in coalesce(detail,''))=0
                then concat_ws(E'\n',nullif(detail,''),'PPPP: TED Watch — ky tender nuk kërkon ofertim direkt nga PRISTEEL; kontrolli i award-it bëhet automatikisht pas afatit.')
                else detail end
where source='tender_deadline_auto' and status='hapur';

insert into public.tasks(project_id,title,detail,due_date,priority,status,source,category,source_ref)
select p.id,
       'Analizo projektin e ri — '||p.name,
       concat_ws(E'\n',
         'PPPP e krijoi dhe e lidhi këtë projekt nga Project Discovery/Gmail.',
         'Hapi i radhës: shqyrto emailat dhe dokumentet e regjistruara, verifiko kërkesat teknike/komerciale dhe përcakto veprimin konkret të projektit.',
         'PPPP: ky është handoff i përkohshëm në Home; mbyllet automatikisht sapo të krijohet një veprim më konkret.'
       ),
       current_date,'e larte','hapur','project_discovery_auto','intern',
       'project:'||p.id::text||':new-project-handoff'
from public.projects p
where coalesce(p.operational_state_source,'') like 'project-discovery%'
  and coalesce(p.operational_state,'') not in ('wait_for_client','execution')
  and lower(coalesce(p.status,'')) not in ('mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost')
  and not exists(select 1 from public.tasks t where t.project_id=p.id and t.status='hapur')
on conflict (source,source_ref) do nothing;

create or replace view public.pppp_tender_operating_lanes_v1 as
select
  k.*,
  case
    when upper(coalesce(k.payload->>'source','KRPP')) in ('KRPP','APP','APP_AL') and coalesce(k.payload->>'notice_phase','opportunity')='opportunity' then 'direct_tender'
    when upper(coalesce(k.payload->>'source',''))='TED' and coalesce(k.payload->>'notice_phase','opportunity')='opportunity' then 'ted_watch'
    when upper(coalesce(k.payload->>'source',''))='TED' and coalesce(k.payload->>'notice_phase','')='award' then 'ted_award_sales'
    else 'reference'
  end as operating_lane,
  nullif(k.payload->>'next_check_on','')::date as next_check_on,
  coalesce((k.payload->>'human_action_required')::boolean,false) as human_action_required,
  coalesce(k.payload#>>'{winner,company_type}','unknown') as winner_company_type,
  k.payload->>'cooperation_angle' as cooperation_angle
from public.kek_tender_watch k;
