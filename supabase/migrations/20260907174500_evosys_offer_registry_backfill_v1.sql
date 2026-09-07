-- EVOSYS ANF-9203 historical offer registry backfill.
-- Narrow/idempotent: this does not create a second offer workflow.
-- Future offers remain owned by the existing PPPP offer module, which allocates
-- the sequential number and registers QUO rows in documents_registry.

do $$
declare
  v_project public.projects%rowtype;
  v_exact public.documents_registry%rowtype;
  v_seq_conflict public.documents_registry%rowtype;
  v_state jsonb;
begin
  select *
    into v_project
  from public.projects
  where id = 'fc96208d-356c-410a-a356-96ce9e9b4d2f'::uuid
    and coalesce(ref, business_ref, '') ilike '%ANF-9203%'
  limit 1;

  if v_project.id is null then
    raise exception 'EVOSYS ANF-9203 project not found; refusing offer backfill';
  end if;

  select *
    into v_exact
  from public.documents_registry
  where lower(btrim(coalesce(doc_nr, ''))) = 'pst-off-2026-09-028'
  limit 1;

  select *
    into v_seq_conflict
  from public.documents_registry
  where series = 'QUO'
    and year = 2026
    and seq = 28
  limit 1;

  if v_exact.id is not null and v_exact.project_id is distinct from v_project.id then
    raise exception 'PST-OFF-2026-09-028 already belongs to another project; refusing overwrite';
  end if;

  if v_seq_conflict.id is not null
     and lower(btrim(coalesce(v_seq_conflict.doc_nr, ''))) <> 'pst-off-2026-09-028' then
    raise exception 'QUO 2026 seq 28 already belongs to document %; refusing overwrite', v_seq_conflict.doc_nr;
  end if;

  v_state := jsonb_build_object(
    'source', 'historical-backfill-evosys-anf9203-v1',
    'historical_registration', true,
    'document_type', 'client_offer',
    'rfq', 'ANF-9203',
    'ref', 'ANF-9203',
    'cli', 'Evosys Laser GmbH',
    'proj', v_project.name,
    'date', '2026-09-06',
    'currency', 'EUR',
    'pst_document_status', 'sent',
    'pst_sent_at', '2026-09-06T06:55:57Z',
    'revision_status', 'sent',
    'human_review_required', true,
    'human_send_required', true,
    'gmail_auto_send', false,
    'send_mode', 'human_sent',
    'drive_file_id', '16lcHG80ozvUaK1drKjMDKwFeAi64Qjqb',
    'drive_file_url', 'https://drive.google.com/file/d/16lcHG80ozvUaK1drKjMDKwFeAi64Qjqb/view?usp=drivesdk',
    'attachment_link_id', 2022,
    'attachment_name', 'PST-OFF-2026-09-028_EVOSYS_ANF-9203.pdf',
    'gmail_message_id', '1a0757af607ea471'
  );

  if v_exact.id is null then
    insert into public.documents_registry (
      series, year, seq, doc_nr, project, client,
      total_eur, project_id, offer_state, followup_status,
      currency, total_amount, created_at
    ) values (
      'QUO', 2026, 28, 'PST-OFF-2026-09-028',
      v_project.name, 'Evosys Laser GmbH',
      2311.69, v_project.id, v_state, 'sent',
      'EUR', 2311.69, '2026-09-06T06:55:57Z'::timestamptz
    );
  else
    update public.documents_registry
       set series = 'QUO',
           year = 2026,
           seq = 28,
           project = v_project.name,
           client = 'Evosys Laser GmbH',
           total_eur = 2311.69,
           project_id = v_project.id,
           offer_state = coalesce(offer_state, '{}'::jsonb) || v_state,
           followup_status = 'sent',
           currency = 'EUR',
           total_amount = 2311.69
     where id = v_exact.id;
  end if;
end
$$;
