-- Keep Përfaqësime operationally separate from Mundësitë.
-- Production migration version: 20260927044732.
-- The legacy trigger/function is retained for audit/history, but the trigger is removed.
-- Existing auto-handed-off rows are archived, never deleted.
-- Seed the verified KOSTT / EBRD 55387 opportunity; company targets are registered
-- separately through the controlled ChatGPT bridge and linked project-specifically.

drop trigger if exists trg_pppp_tender_partnership_expansion_sync_v1 on public.kek_tender_watch;

comment on function public.pppp_tender_partnership_expansion_sync_v1() is
  'Legacy automatic Mundesite-to-Representations handoff. Trigger disabled 2026-09-27 to keep modules operationally separate; retained only for audit/history.';

update public.pppp_representation_opportunities_v1
set archived_at = coalesce(archived_at, now()),
    notes = concat_ws(E'\n', nullif(notes,''), '[2026-09-27] Archived from Representations because it was auto-handed-off from Mundësitë. Source tender remains untouched in its original module.'),
    updated_at = now()
where archived_at is null
  and fact_evidence->>'origin' = 'mundesite';

insert into public.pppp_representation_opportunities_v1(
  source_key, project_name, funding_institution, tender_reference, official_source,
  total_project_value, currency, financing, status, procurement_stage, tender_deadline,
  scope, procurement_packages, qualification_criteria, jv_consortium_rules,
  mandatory_site_visit, bid_guarantee, performance_guarantee,
  verification_status, fact_evidence, last_verified_at, notes
)
values (
  'ebrd:55387',
  'KOSTT Transmission Grid Strengthening',
  'EBRD / KOSTT',
  'EBRD Project ID 55387',
  'https://www.ebrd.com/home/work-with-us/projects/psd/55387.html',
  42800000.00,
  'EUR',
  'EBRD corporate loan up to EUR 25m; EUR 5.25m investment grant from the Danish Cooperation Fund; EFSD+ first-loss risk cover.',
  'approved',
  'pre-procurement — detailed procurement packages/notices not yet published',
  null,
  'Rehabilitation and upgrades of selected 110 kV substations; replacement of ageing transformers; refurbishment of transmission equipment; new 5.2 km underground double-circuit cable between Prizren 1 and Prizren 2; Electricity Market Management System (EMMS) and related digitalisation.',
  '{}'::text[],
  null,
  null,
  null,
  null,
  null,
  'verified',
  jsonb_build_object(
    'origin','representation_research',
    'official_project_id','55387',
    'location','Kosovo',
    'client','KOSTT - Transmission, System and Market Operator J.S.C.',
    'approval_date','2026-09-23',
    'status',jsonb_build_object('value','approved','evidence_status','confirmed','source','EBRD PSD 55387'),
    'total_project_value',jsonb_build_object('value',42800000,'currency','EUR','evidence_status','confirmed','source','EBRD PSD 55387'),
    'ebrd_finance',jsonb_build_object('value',25000000,'currency','EUR','evidence_status','confirmed','source','EBRD PSD 55387'),
    'danish_grant',jsonb_build_object('value',5250000,'currency','EUR','evidence_status','confirmed','source','EBRD PSD 55387'),
    'scope',jsonb_build_object('evidence_status','confirmed','source','EBRD PSD 55387'),
    'procurement_packages',jsonb_build_object('evidence_status','unknown','note','Detailed packages/lots not yet published on the official project page as verified 2026-09-27'),
    'qualification_criteria',jsonb_build_object('evidence_status','unknown','note','Not yet published'),
    'jv_consortium_rules',jsonb_build_object('evidence_status','unknown','note','Not yet published'),
    'tender_deadline',jsonb_build_object('evidence_status','unknown','note','No project-specific procurement deadline published yet'),
    'bid_guarantee',jsonb_build_object('evidence_status','unknown','note','Not yet published'),
    'performance_guarantee',jsonb_build_object('evidence_status','unknown','note','Not yet published'),
    'selected_candidate_companies',jsonb_build_array('KEC International Limited','Elnos Group','Electromontaj S.A.','Kalpataru Projects International Limited (KPIL)'),
    'candidate_selection_status','operator_selected_for_deep_analysis',
    'no_outreach_authorized',true
  ),
  now(),
  'Canonical Representation opportunity. Detailed procurement packages, qualification criteria, JV rules, guarantees and tender deadlines remain unconfirmed until officially published. Four companies were operator-selected for project-specific analysis: KEC, ELNOS, Electromontaj and KPIL. No email or external action is authorized.'
)
on conflict (source_key) do update
set project_name=excluded.project_name,
    funding_institution=excluded.funding_institution,
    tender_reference=excluded.tender_reference,
    official_source=excluded.official_source,
    total_project_value=excluded.total_project_value,
    currency=excluded.currency,
    financing=excluded.financing,
    status=excluded.status,
    procurement_stage=excluded.procurement_stage,
    scope=excluded.scope,
    verification_status=excluded.verification_status,
    fact_evidence=public.pppp_representation_opportunities_v1.fact_evidence || excluded.fact_evidence,
    last_verified_at=excluded.last_verified_at,
    notes=excluded.notes,
    archived_at=null,
    updated_at=now();
