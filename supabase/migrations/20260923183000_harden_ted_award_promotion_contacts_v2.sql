-- Harden TED award promotion contact materialization.
-- Project creation remains human-approved and never sends email.
-- Only verified enrichment contacts or recipients with real Gmail history become Project contacts.

create or replace function public.pppp_promote_ted_award_to_sales_project_v1(
  p_tender_watch_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_tender public.kek_tender_watch%rowtype;
  v_project public.projects%rowtype;
  v_winner_name text;
  v_winner_email text;
  v_reference text;
  v_source text;
  v_phase text;
  v_contact record;
  v_created boolean := false;
begin
  if (select auth.uid()) is null
     and coalesce((select auth.jwt()->>'role'), '') <> 'service_role' then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if p_tender_watch_id is null then
    raise exception using errcode = '22023', message = 'tender_watch_id_required';
  end if;

  select * into v_tender
  from public.kek_tender_watch
  where id = p_tender_watch_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'tender_not_found';
  end if;

  v_source := upper(coalesce(v_tender.payload->>'source', ''));
  v_phase := lower(coalesce(v_tender.payload->>'notice_phase', ''));
  v_winner_name := nullif(btrim(v_tender.payload #>> '{winner,name}'), '');
  v_winner_email := lower(nullif(btrim(v_tender.payload #>> '{winner,email}'), ''));
  v_reference := coalesce(
    nullif(btrim(v_tender.publication_no), ''),
    nullif(btrim(v_tender.procurement_no), ''),
    nullif(btrim(v_tender.source_key), ''),
    v_tender.id::text
  );

  if v_source <> 'TED' or v_phase <> 'award' then
    raise exception using errcode = '22023', message = 'ted_award_required';
  end if;
  if v_winner_name is null then
    raise exception using errcode = '22023', message = 'verified_winner_required';
  end if;
  if v_tender.project_id is null
     and lower(coalesce(v_tender.status, 'new')) not in ('new', 'review', 'watch') then
    raise exception using errcode = '22023', message = 'opportunity_not_approvable';
  end if;

  if v_tender.project_id is not null then
    select * into v_project from public.projects where id = v_tender.project_id;
  end if;

  if v_project.id is null then
    select p.* into v_project
    from public.projects p
    where nullif(btrim(v_tender.source_key), '') is not null
      and (
        p.business_ref = v_tender.source_key
        or v_tender.source_key = any(coalesce(p.identity_aliases, '{}'::text[]))
      )
    order by p.created_at desc nulls last
    limit 1;
  end if;

  if v_project.id is null then
    insert into public.projects(
      name, client, ref, location, notes, status, pipeline_stage,
      operational_state, operational_state_at, operational_state_source,
      business_ref, identity_aliases, origin_type, workflow_type,
      updated_at, last_activity_at
    ) values (
      v_winner_name || ' · ' || coalesce(nullif(btrim(v_tender.title), ''), 'TED award'),
      v_winner_name,
      v_reference,
      coalesce(nullif(btrim(v_tender.payload #>> '{winner,country}'), ''), nullif(btrim(v_tender.payload->>'country'), '')),
      'PPPP V2 · EU award sales.' || E'\n' ||
        'TED award: ' || coalesce(v_tender.title, '—') || E'\n' ||
        'Fituesi: ' || v_winner_name || E'\n' ||
        'Autoriteti kontraktues: ' || coalesce(v_tender.authority, '—') || E'\n' ||
        'Publikimi: ' || coalesce(v_tender.publication_no, '—') || E'\n' ||
        'Source key: ' || coalesce(v_tender.source_key, '—') || E'\n' ||
        'Asnjë email nuk u dërgua nga aprovimi i Project-it.',
      'pritje', 'rfq_in',
      'active_work', now(), 'pppp_v2_eu_award_sales_approval',
      v_tender.source_key,
      array(
        select distinct x
        from unnest(array[v_tender.source_key, v_tender.publication_no, v_tender.procurement_no]::text[]) as x
        where nullif(btrim(x), '') is not null
      ),
      'tender_award', 'eu_award_sales', now(), now()
    ) returning * into v_project;
    v_created := true;
  else
    update public.projects
    set workflow_type = coalesce(workflow_type, 'eu_award_sales'),
        updated_at = now()
    where id = v_project.id
    returning * into v_project;
  end if;

  update public.kek_tender_watch
  set project_id = v_project.id,
      status = 'promoted',
      updated_at = now()
  where id = v_tender.id;

  -- Keep already reconciled TED messages inside the new canonical Project.
  update public.project_emails pe
  set project_id = v_project.id,
      tender_watch_id = coalesce(pe.tender_watch_id, v_tender.id),
      updated_at = now()
  where pe.project_id is null
    and (
      pe.tender_watch_id = v_tender.id
      or exists (
        select 1 from public.tender_email_links tel
        where tel.tender_watch_id = v_tender.id
          and tel.gmail_message_id = pe.gmail_message_id
      )
    );

  -- Materialize only contacts backed by verified enrichment or real Gmail history.
  -- Never trust winner.email merely because it is syntactically valid.
  for v_contact in
    select distinct on (lower(x.email))
      lower(x.email) as email,
      x.name,
      x.company,
      x.role,
      x.message_id
    from (
      select
        oc.contact_email as email,
        null::text as name,
        coalesce(nullif(oc.company_name, ''), v_winner_name) as company,
        coalesce(nullif(oc.outreach_kind, ''), 'TED award contact') as role,
        oc.gmail_message_id as message_id
      from public.outreach_contacts oc
      where oc.tender_watch_id = v_tender.id
        and (
          nullif(btrim(oc.gmail_message_id), '') is not null
          or lower(coalesce(oc.status, '')) in ('sent', 'replied', 'meeting')
        )

      union all

      select
        lower(nullif(btrim(c.contact->>'value'), '')) as email,
        null::text as name,
        v_winner_name as company,
        coalesce(nullif(c.contact->>'purpose', ''), 'TED award contact') as role,
        null::text as message_id
      from jsonb_array_elements(
        coalesce(v_tender.payload #> '{winner,contact_enrichment,organizations}', '[]'::jsonb)
      ) org(organization)
      cross join lateral jsonb_array_elements(
        coalesce(org.organization->'contacts', '[]'::jsonb)
      ) c(contact)
      where c.contact->>'type' = 'email'
        and nullif(btrim(c.contact->>'value'), '') is not null
        and coalesce((c.contact->>'draft_eligible')::boolean, true)
        and lower(coalesce(c.contact->>'confidence', '')) in ('high', 'medium')
        and lower(coalesce(c.contact->>'company_attribution', '')) <> 'external_domain'
    ) x
    where x.email ~* '^[A-Z0-9._%+\\-]+@[A-Z0-9.\\-]+\\.[A-Z]{2,}(
      project_id, email, name, company, role, source, source_message_ids,
      first_seen, last_seen, email_count, direct_count, cc_count,
      is_primary, status, created_at, updated_at
    ) values (
      v_project.id::text,
      v_contact.email,
      v_contact.name,
      v_contact.company,
      v_contact.role,
      'ted-award-sales-v1',
      case when v_contact.message_id is null then '[]'::jsonb else jsonb_build_array(v_contact.message_id) end,
      now(), now(), 0, 0, 0, false, 'active', now(), now()
    )
    on conflict(project_id, email) do update set
      company = coalesce(nullif(public.project_contacts.company, ''), excluded.company),
      role = coalesce(nullif(public.project_contacts.role, ''), excluded.role),
      status = 'active',
      updated_at = now();
  end loop;

  insert into public.tasks(
    project_id, title, detail, due_date, priority, status,
    source, category, source_ref
  ) values (
    v_project.id,
    'Kontakto fituesin · ' || left(v_winner_name, 140),
    'Project-i u aprovua nga TED award. Kontrollo kontaktet dhe draftin para dërgimit. Asnjë email nuk dërgohet automatikisht.',
    current_date,
    'larte', 'hapur', 'pppp_v2_eu_award_sales', 'klient',
    'TED-AWARD:' || v_tender.id::text || ':CONTACT'
  )
  on conflict(source, source_ref) do update set
    project_id = excluded.project_id,
    title = excluded.title,
    detail = excluded.detail,
    status = case
      when lower(coalesce(public.tasks.status, '')) in ('kryer', 'mbyllur', 'done') then public.tasks.status
      else 'hapur'
    end;

  return jsonb_build_object(
    'ok', true,
    'project_id', v_project.id,
    'project_created', v_created,
    'workflow_type', v_project.workflow_type,
    'tender_watch_id', v_tender.id,
    'human_send_required', true
  );
end;
$function$;

revoke all on function public.pppp_promote_ted_award_to_sales_project_v1(uuid)
  from public, anon;
grant execute on function public.pppp_promote_ted_award_to_sales_project_v1(uuid)
  to authenticated, service_role;
