do $$
declare
  v_project_id uuid;
  v_basis_link_id bigint;
  v_alt_link_id bigint;
begin
  select id into strict v_project_id
  from public.projects
  where ref = '979306_TB Thalaubach'
    and client = 'Kropp Bau GmbH';

  select id into strict v_basis_link_id
  from public.project_attachment_links
  where gmail_message_id = '1a08baa1e7892100'
    and attachment_name = 'Kropp_Basisangebot_FINAL.pdf';

  select id into strict v_alt_link_id
  from public.project_attachment_links
  where gmail_message_id = '1a08baa1e7892100'
    and attachment_name = 'Kropp_Alternativangebot_HEM280_FINAL.pdf';

  if exists (
    select 1 from public.documents_registry
    where series = 'QUO' and year = 2026 and seq = 29
      and doc_nr <> 'PST-OFF-2026-09-029'
  ) then
    raise exception 'QUO sequence 29 is already occupied by another document';
  end if;

  if exists (
    select 1 from public.documents_registry
    where series = 'QUO' and year = 2026 and seq = 30
      and doc_nr <> 'PST-OFF-2026-09-030'
  ) then
    raise exception 'QUO sequence 30 is already occupied by another document';
  end if;

  insert into public.documents_registry (
    created_at, series, year, seq, doc_nr, project, client, total_eur,
    payment_plan, project_id, offer_state, followup_status,
    currency, total_amount, exchange_rate_to_eur
  )
  select
    '2026-09-10T14:12:56+00:00'::timestamptz,
    'QUO', 2026, 29, 'PST-OFF-2026-09-029',
    'Kropp Bau GmbH – 979306 TB Thalaubach', 'Kropp Bau GmbH', 269143.53,
    '[]'::jsonb, v_project_id,
    jsonb_build_object(
      'source','historical-backfill-kropp-sent-v1',
      'document_type','client_offer',
      'offer_variant','basis',
      'ref','979306_TB Thalaubach',
      'proj','Kropp Bau GmbH – 979306 TB Thalaubach',
      'cli','Kropp Bau GmbH',
      'con','Steffen Gies',
      'em','Steffen.Gies@kropp-gruppe.de',
      'cc',jsonb_build_array('TBThalaubach@kropp-gruppe.de'),
      'date','2026-09-10',
      'currency','EUR',
      'pst_revision',1,
      'revision_status','sent',
      'pst_document_status','sent',
      'send_mode','human_sent',
      'pst_sent_at','2026-09-10T14:12:56+00:00',
      'gmail_auto_send',false,
      'gmail_message_id','1a08baa1e7892100',
      'gmail_thread_id','1a08ba76000515ac',
      'attachment_name','Kropp_Basisangebot_FINAL.pdf',
      'attachment_link_id',v_basis_link_id,
      'human_pricing_approved',true,
      'human_review_required',true,
      'human_send_required',true,
      'historical_registration',true,
      'oferPos',jsonb_build_array(
        jsonb_build_object('pos','1.0','description','HEM 280 S355J2 inkl. HDG, gemäß Kropp-Anfrage','qty',60331,'unit','kg','price',3.130,'total',188836.03),
        jsonb_build_object('pos','2.0','description','80 komplette Anschlusskonsolen HEA 340 inkl. HDG','qty',80,'unit','Stk.','price',592.50,'total',47400.00),
        jsonb_build_object('pos','3.0','description','Befestigungsmaterial LV 01.01-01.10','qty',3544,'unit','Stk.','price_basis','pauschal','total',16407.50),
        jsonb_build_object('pos','4.0','description','Transport + Holzauflagen bis Thalau','qty',5,'unit','LKW','price',3300.00,'total',16500.00),
        jsonb_build_object('pos','5.0','description','Qualitätsdokumentation / Welding Book','qty',1,'unit','pauschal','price_basis','inkl.','total',0)
      ),
      'technical_scope',jsonb_build_object(
        'execution_class','EXC2','surface','HDG','delivery_term','DAP 36157 Thalau',
        'trucks',5,'validity_days',10,'payment_terms','Nach Vereinbarung',
        'end_stop_buffers_included',4
      )
    ),
    'open','EUR',269143.53,1
  where not exists (
    select 1 from public.documents_registry where doc_nr = 'PST-OFF-2026-09-029'
  );

  insert into public.documents_registry (
    created_at, series, year, seq, doc_nr, project, client, total_eur,
    payment_plan, project_id, offer_state, followup_status,
    currency, total_amount, exchange_rate_to_eur
  )
  select
    '2026-09-10T14:12:56+00:00'::timestamptz,
    'QUO', 2026, 30, 'PST-OFF-2026-09-030',
    'Kropp Bau GmbH – 979306 TB Thalaubach', 'Kropp Bau GmbH', 241994.58,
    '[]'::jsonb, v_project_id,
    jsonb_build_object(
      'source','historical-backfill-kropp-sent-v1',
      'document_type','client_offer',
      'offer_variant','alternative_hem280_optimized',
      'ref','979306_TB Thalaubach',
      'proj','Kropp Bau GmbH – 979306 TB Thalaubach',
      'cli','Kropp Bau GmbH',
      'con','Steffen Gies',
      'em','Steffen.Gies@kropp-gruppe.de',
      'cc',jsonb_build_array('TBThalaubach@kropp-gruppe.de'),
      'date','2026-09-10',
      'currency','EUR',
      'pst_revision',1,
      'revision_status','sent',
      'pst_document_status','sent',
      'send_mode','human_sent',
      'pst_sent_at','2026-09-10T14:12:56+00:00',
      'gmail_auto_send',false,
      'gmail_message_id','1a08baa1e7892100',
      'gmail_thread_id','1a08ba76000515ac',
      'attachment_name','Kropp_Alternativangebot_HEM280_FINAL.pdf',
      'attachment_link_id',v_alt_link_id,
      'human_pricing_approved',true,
      'human_review_required',true,
      'human_send_required',true,
      'historical_registration',true,
      'technical_approval_required',true,
      'technical_approval_note','Optimierte HEM280-Längen gelten nur vorbehaltlich technischer Freigabe durch Kropp; ohne Freigabe gilt das Basisangebot.',
      'oferPos',jsonb_build_array(
        jsonb_build_object('pos','1.0','description','HEM 280 S355J2 inkl. HDG – optimierte Längen','qty',60331,'unit','kg','price',2.680,'total',161687.08),
        jsonb_build_object('pos','2.0','description','80 komplette Anschlusskonsolen HEA 340 inkl. HDG','qty',80,'unit','Stk.','price',592.50,'total',47400.00),
        jsonb_build_object('pos','3.0','description','Befestigungsmaterial LV 01.01-01.10','qty',3544,'unit','Stk.','price_basis','pauschal','total',16407.50),
        jsonb_build_object('pos','4.0','description','Transport + Holzauflagen bis Thalau','qty',5,'unit','LKW','price',3300.00,'total',16500.00),
        jsonb_build_object('pos','5.0','description','Qualitätsdokumentation / Welding Book','qty',1,'unit','pauschal','price_basis','inkl.','total',0)
      ),
      'technical_scope',jsonb_build_object(
        'execution_class','EXC2','surface','HDG','delivery_term','DAP 36157 Thalau',
        'trucks',5,'validity_days',10,'payment_terms','Nach Vereinbarung',
        'end_stop_buffers_included',4
      )
    ),
    'open','EUR',241994.58,1
  where not exists (
    select 1 from public.documents_registry where doc_nr = 'PST-OFF-2026-09-030'
  );

  update public.projects
  set pipeline_stage = case
        when pipeline_stage in ('rfq_in','technical_review','supplier_selection','pricing') then 'client_offer'
        else pipeline_stage
      end,
      operational_state = 'wait_for_client',
      operational_state_at = greatest(coalesce(operational_state_at,'epoch'::timestamptz),'2026-09-10T14:12:56+00:00'::timestamptz),
      operational_state_source = 'historical-backfill-kropp-sent-v1',
      updated_at = greatest(coalesce(updated_at,'epoch'::timestamptz),now())
  where id = v_project_id;
end $$;
