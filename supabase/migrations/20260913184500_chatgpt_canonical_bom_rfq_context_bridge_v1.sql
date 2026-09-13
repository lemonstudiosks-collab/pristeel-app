-- Controlled canonical materialization for ChatGPT-approved context facts.
-- This keeps the existing Commands transport and approval gate intact while allowing
-- two narrowly-scoped fact keys to populate the canonical BOM/RFQ tables.
-- It never sends email, selects a supplier, approves pricing, or creates a commitment.

create or replace function public.pppp_chatgpt_materialize_canonical_fact_v1()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_project public.projects%rowtype;
  v_items jsonb;
  v_item jsonb;
  v_drafts jsonb;
  v_draft jsonb;
  v_total numeric := 0;
  v_expected numeric := 0;
  v_code text;
  v_supplier text;
  v_email text;
  v_subject text;
  v_existing uuid;
  v_notes text;
  v_rfq_status text;
begin
  -- Only facts created by the trusted ChatGPT command bridge are eligible.
  if new.source_type <> 'chatgpt' or new.created_by <> 'chatgpt_pppp_bridge' then
    return new;
  end if;

  if new.fact_key not in ('canonical.bom.create.v1', 'canonical.rfq_planned.create.v1') then
    return new;
  end if;

  select * into v_project from public.projects where id = new.project_id;
  if not found then
    raise exception using errcode = '22023', message = 'project_not_found';
  end if;

  if lower(coalesce(v_project.status,'')) in ('humbur','lost','mbyllur','closed','arkivuar','archived','realizuar','cancelled','canceled') then
    raise exception using errcode = '23514', message = 'canonical_materialization_terminal_project';
  end if;

  if new.fact_key = 'canonical.bom.create.v1' then
    if jsonb_typeof(new.value) <> 'object' then
      raise exception using errcode = '22023', message = 'canonical_bom_value_must_be_object';
    end if;
    v_items := coalesce(new.value->'items','[]'::jsonb);
    if jsonb_typeof(v_items) <> 'array' or jsonb_array_length(v_items) < 1 or jsonb_array_length(v_items) > 500 then
      raise exception using errcode = '22023', message = 'canonical_bom_items_invalid';
    end if;
    if exists (select 1 from public.bom_items where project_id = new.project_id) then
      raise exception using errcode = '23514', message = 'canonical_bom_already_exists';
    end if;

    begin
      v_expected := replace(coalesce(nullif(new.value->>'expected_total_kg',''),'0'),',','.')::numeric;
    exception when others then
      raise exception using errcode = '22023', message = 'invalid_expected_total_kg';
    end;

    for v_item in select value from jsonb_array_elements(v_items)
    loop
      if jsonb_typeof(v_item) <> 'object' then
        raise exception using errcode = '22023', message = 'canonical_bom_item_must_be_object';
      end if;
      v_code := nullif(btrim(coalesce(v_item->>'material_code','')), '');
      if v_code is null then
        raise exception using errcode = '22023', message = 'canonical_bom_material_code_required';
      end if;
      if nullif(btrim(coalesce(v_item->>'grade','')), '') is null
         or nullif(btrim(coalesce(v_item->>'standard','')), '') is null
         or nullif(btrim(coalesce(v_item->>'dimensions','')), '') is null then
        raise exception using errcode = '22023', message = 'canonical_bom_technical_fields_required';
      end if;
      begin
        v_total := v_total + replace(coalesce(nullif(v_item->>'kg',''),'0'),',','.')::numeric;
      exception when others then
        raise exception using errcode = '22023', message = 'canonical_bom_invalid_kg';
      end;
      if replace(coalesce(nullif(v_item->>'kg',''),'0'),',','.')::numeric <= 0 then
        raise exception using errcode = '22023', message = 'canonical_bom_positive_kg_required';
      end if;
    end loop;

    if v_expected > 0 and abs(v_total - v_expected) > 0.01 then
      raise exception using errcode = '23514', message = 'canonical_bom_total_mismatch';
    end if;

    insert into public.bom_items(
      project_id, project_name, pozicioni, materiali, dimensionet,
      profile, dim, grade, std, len_mm, kg,
      auto_generated, needs_review, source_item_key, extraction_method, extraction_confidence
    )
    select
      new.project_id,
      coalesce(v_project.name,''),
      coalesce(x.value->>'position',''),
      concat_ws(' — ', nullif(x.value->>'material_code',''), nullif(x.value->>'material','')),
      coalesce(x.value->>'dimensions',''),
      coalesce(x.value->>'profile', x.value->>'material',''),
      coalesce(x.value->>'dimensions',''),
      coalesce(x.value->>'grade',''),
      coalesce(x.value->>'standard',''),
      coalesce(nullif(x.value->>'length_mm',''),'0')::integer,
      replace(coalesce(nullif(x.value->>'kg',''),'0'),',','.')::numeric,
      false,
      false,
      'chatgpt:' || coalesce(x.value->>'material_code', x.ordinality::text),
      'chatgpt_verified_tender_schedule',
      1
    from jsonb_array_elements(v_items) with ordinality as x(value, ordinality);

    return new;
  end if;

  -- Planned/scheduled RFQs are canonical workflow records only. They do not send email.
  if jsonb_typeof(new.value) <> 'object' then
    raise exception using errcode = '22023', message = 'canonical_rfq_value_must_be_object';
  end if;
  v_drafts := coalesce(new.value->'drafts','[]'::jsonb);
  if jsonb_typeof(v_drafts) <> 'array' or jsonb_array_length(v_drafts) < 1 or jsonb_array_length(v_drafts) > 100 then
    raise exception using errcode = '22023', message = 'canonical_rfq_drafts_invalid';
  end if;

  for v_draft in select value from jsonb_array_elements(v_drafts)
  loop
    if jsonb_typeof(v_draft) <> 'object' then
      raise exception using errcode = '22023', message = 'canonical_rfq_draft_must_be_object';
    end if;
    v_supplier := nullif(btrim(coalesce(v_draft->>'supplier_name','')), '');
    v_email := lower(nullif(btrim(coalesce(v_draft->>'supplier_email','')), ''));
    v_subject := nullif(btrim(coalesce(v_draft->>'subject','')), '');
    if v_supplier is null or v_email is null or v_subject is null then
      raise exception using errcode = '22023', message = 'canonical_rfq_supplier_email_subject_required';
    end if;
    if v_email !~ '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$' then
      raise exception using errcode = '22023', message = 'canonical_rfq_valid_email_required';
    end if;

    v_rfq_status := case
      when nullif(btrim(coalesce(v_draft->>'scheduled_for','')),'') is not null then 'scheduled'
      else 'planned'
    end;
    v_notes := concat_ws(E'\n',
      'PPPP state: RFQ prepared; external send is handled separately by the human-approved Gmail schedule.',
      case when nullif(btrim(coalesce(v_draft->>'scheduled_for','')),'') is not null
        then 'Scheduled: ' || btrim(v_draft->>'scheduled_for') else null end,
      nullif(btrim(coalesce(v_draft->>'notes','')),'')
    );

    select id into v_existing
    from public.rfq_log
    where project_id = new.project_id
      and lower(coalesce(supplier_email,'')) = v_email
      and lower(coalesce(subject,'')) = lower(v_subject)
    order by created_at desc
    limit 1;

    if v_existing is null then
      insert into public.rfq_log(
        project_id, project_name, supplier_name, supplier_email, lang,
        subject, body, status, sent_at, notes
      ) values (
        new.project_id,
        coalesce(v_project.name,''),
        v_supplier,
        v_email,
        coalesce(nullif(btrim(coalesce(v_draft->>'lang','')),''),'en'),
        v_subject,
        coalesce(v_draft->>'body',''),
        v_rfq_status,
        null,
        v_notes
      );
    elsif exists (select 1 from public.rfq_log where id=v_existing and lower(coalesce(status,'')) in ('planned','scheduled')) then
      update public.rfq_log
      set supplier_name=v_supplier,
          supplier_email=v_email,
          lang=coalesce(nullif(btrim(coalesce(v_draft->>'lang','')),''),lang,'en'),
          body=coalesce(v_draft->>'body',body,''),
          status=v_rfq_status,
          notes=v_notes
      where id=v_existing;
    end if;
  end loop;

  return new;
end;
$function$;

revoke all on function public.pppp_chatgpt_materialize_canonical_fact_v1() from public;

-- The trigger fires only for the two exact canonical fact keys and only for
-- facts created by the trusted command worker.
drop trigger if exists trg_pppp_chatgpt_materialize_canonical_fact_v1 on public.pppp_project_context_facts;
create trigger trg_pppp_chatgpt_materialize_canonical_fact_v1
after insert on public.pppp_project_context_facts
for each row
when (new.fact_key in ('canonical.bom.create.v1','canonical.rfq_planned.create.v1'))
execute function public.pppp_chatgpt_materialize_canonical_fact_v1();
