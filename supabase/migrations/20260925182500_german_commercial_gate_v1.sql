create table if not exists public.pppp_german_commercial_benchmarks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  document_id uuid references public.documents_registry(id) on delete set null,
  supplier_offer_id uuid references public.offers(id) on delete set null,
  scenario_key text not null,
  project_name text not null,
  customer text not null,
  scope_category text not null,
  variant_label text not null default 'Basis',
  weight_kg numeric,
  production_cost_eur numeric not null default 0,
  treatment_cost_eur numeric not null default 0,
  bought_out_cost_eur numeric not null default 0,
  mechanical_cost_eur numeric not null default 0,
  packaging_cost_eur numeric not null default 0,
  transport_cost_eur numeric not null default 0,
  other_cost_eur numeric not null default 0,
  landed_cost_eur numeric not null,
  selling_price_eur numeric not null,
  outcome text not null check (outcome in ('win','price_loss','landed_economics_loss','scope_mismatch','client_self_perform','open','open_stale','unknown')),
  reason text,
  cost_confidence text not null check (cost_confidence in ('confirmed','reconstructed','estimated','missing','conflicting')),
  selling_confidence text not null check (selling_confidence in ('confirmed','reconstructed','estimated','missing','conflicting')),
  outcome_confidence text not null check (outcome_confidence in ('confirmed','reconstructed','estimated','missing','conflicting')),
  sent_evidence_status text,
  technical_condition text,
  source_notes text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, scenario_key)
);

create index if not exists pppp_german_commercial_benchmarks_outcome_idx
  on public.pppp_german_commercial_benchmarks (outcome) where is_active;
create index if not exists pppp_german_commercial_benchmarks_document_idx
  on public.pppp_german_commercial_benchmarks (document_id) where document_id is not null;
create index if not exists pppp_german_commercial_benchmarks_supplier_offer_idx
  on public.pppp_german_commercial_benchmarks (supplier_offer_id) where supplier_offer_id is not null;

create table if not exists public.pppp_commercial_gate_settings (
  market text primary key,
  logistics_risk_share numeric not null default 0.28 check (logistics_risk_share > 0 and logistics_risk_share < 1),
  small_one_off_weight_kg numeric not null default 1000 check (small_one_off_weight_kg > 0),
  small_one_off_fixed_cost_share numeric not null default 0.45 check (small_one_off_fixed_cost_share > 0 and small_one_off_fixed_cost_share < 1),
  spread_band_very_aggressive numeric not null default 4,
  spread_band_competitive numeric not null default 6,
  spread_band_review numeric not null default 8,
  updated_at timestamptz not null default now()
);

alter table public.pppp_german_commercial_benchmarks enable row level security;
alter table public.pppp_commercial_gate_settings enable row level security;

revoke all on table public.pppp_german_commercial_benchmarks from anon;
revoke all on table public.pppp_commercial_gate_settings from anon;
revoke all on table public.pppp_german_commercial_benchmarks from authenticated;
revoke all on table public.pppp_commercial_gate_settings from authenticated;
grant select on table public.pppp_german_commercial_benchmarks to authenticated;
grant select on table public.pppp_commercial_gate_settings to authenticated;
grant all on table public.pppp_german_commercial_benchmarks to service_role;
grant all on table public.pppp_commercial_gate_settings to service_role;

drop policy if exists "authenticated_read_german_commercial_benchmarks" on public.pppp_german_commercial_benchmarks;
create policy "authenticated_read_german_commercial_benchmarks"
  on public.pppp_german_commercial_benchmarks for select
  to authenticated using (true);

drop policy if exists "authenticated_read_commercial_gate_settings" on public.pppp_commercial_gate_settings;
create policy "authenticated_read_commercial_gate_settings"
  on public.pppp_commercial_gate_settings for select
  to authenticated using (true);

insert into public.pppp_commercial_gate_settings (
  market, logistics_risk_share, small_one_off_weight_kg, small_one_off_fixed_cost_share,
  spread_band_very_aggressive, spread_band_competitive, spread_band_review
) values ('DE', 0.28, 1000, 0.45, 4, 6, 8)
on conflict (market) do update set
  logistics_risk_share=excluded.logistics_risk_share,
  small_one_off_weight_kg=excluded.small_one_off_weight_kg,
  small_one_off_fixed_cost_share=excluded.small_one_off_fixed_cost_share,
  spread_band_very_aggressive=excluded.spread_band_very_aggressive,
  spread_band_competitive=excluded.spread_band_competitive,
  spread_band_review=excluded.spread_band_review,
  updated_at=now();

insert into public.pppp_german_commercial_benchmarks (
  project_id, document_id, supplier_offer_id, scenario_key, project_name, customer,
  scope_category, variant_label, weight_kg, production_cost_eur, treatment_cost_eur,
  bought_out_cost_eur, mechanical_cost_eur, packaging_cost_eur, transport_cost_eur,
  other_cost_eur, landed_cost_eur, selling_price_eur, outcome, reason,
  cost_confidence, selling_confidence, outcome_confidence, sent_evidence_status,
  technical_condition, source_notes, metadata
) values
('38bdf772-d73e-47b2-9d0f-6020e105aa62','fb519c18-77e3-4284-8293-df588aaa686c','4db97c0d-dc94-4741-b0a5-5edb2a85aec6','stacon_d22','STACON D-22','Stacon GmbH & Co. KG','fabrication_delivery','D-22/26',37464,69308.40,0,0,0,0,15300,0,84608.40,87375,'win','Kontratë dhe ekzekutim i konfirmuar.','confirmed','confirmed','confirmed','sent_confirmed',null,'Supplier contract ES145-03/2026 and customer offer D-22/26.', '{"benchmark_positive":true}'::jsonb),
('577a3a5f-cb3f-4049-9c2a-45e6bf158703','2fad14b0-809a-492e-9c77-408b93e31873',null,'roleff_411320','Roleff 411320-KR','Roleff GmbH & Co. KG','fabrication_galvanizing_delivery','PST-QUO-2026-010',81400,146520,40700,0,0,0,15200,0,202420,221142,'price_loss','Klienti e refuzoi ofertën si jo konkurruese ndaj konkurrencës.','reconstructed','confirmed','confirmed','sent_confirmed',null,'Reference cost reconstructed from supplier/transport/treatment evidence; not accounting-final.', '{"gmail_feedback":"not_competitive"}'::jsonb),
('6945392e-b9ab-4ea1-9f11-3ec026750e95',null,'29b0b40e-c7bc-480e-b340-df34e0422355','rsb_sindelfingen','RSB Sindelfingen','RSB GmbH','fabrication_delivery','D-26/Sindelfingen-01',null,305503,0,0,0,0,25550,0,331053,355797,'price_loss','Buyer feedback: vergeben, zu teuer.','confirmed','confirmed','confirmed','sent_confirmed',null,'Customer offer exists in Gmail/project evidence but is not fully linked in documents_registry.', '{"data_quality_warning":"missing_document_registry_link"}'::jsonb),
('fc96208d-356c-410a-a356-96ce9e9b4d2f','04944188-ac68-4aa8-be9e-58eb230605b5','16ec3342-8362-468e-bb46-b3b2c165a6f7','evosys_anf9203','EVOSYS ANF-9203','Evosys Laser GmbH','small_one_off','ANF-9203',132.802,358.57,0,0,700,100,1100,0,2258.57,2311.69,'landed_economics_loss','German-equivalent pricing plus customs/clearance and transport risk removed the advantage.','confirmed','confirmed','confirmed','sent_confirmed',null,'Small one-off benchmark: fixed logistics and processing dominate landed economics.', '{"logistics_risk":true,"small_one_off":true}'::jsonb),
('57209f36-b019-4596-b9c1-c2d33488e721','da9169f6-0ad0-46e7-9cfc-17be4f96e3e9','40aa287d-9de1-456a-954f-b2ec8ab8b508','airbus_h24x','STACON Airbus H24X','Stacon GmbH & Co. KG','fabrication_delivery','H24X',104573,308184.15,0,0,0,0,0,0,308184.15,329252.91,'client_self_perform','Client shifted work internally due to other-project scheduling. Not a price loss.','conflicting','confirmed','confirmed','sent_confirmed','Supplier basis may not fully include console scope.','Excluded from price-loss statistics.', '{"exclude_from_price_stats":true}'::jsonb),
('5767b41b-af14-4874-96c6-b754bb8cbc23','8946719b-d13f-49b9-9f71-3ca100c65cb4','69e8a663-246f-4cc1-b22c-0f16f9eec05a','geiger','Geiger Stahlbaugruppen','Geiger Schlüsselfertigbau GmbH & Co. KG','material_supply','PST-GEI-001/26',6076,19801,0,0,0,0,2850,0,22651,24631.32,'scope_mismatch','General Contractor had little use for the pure-material/subcontracting model.','confirmed','confirmed','confirmed','sent_confirmed',null,'Excluded from price-loss statistics.', '{"exclude_from_price_stats":true}'::jsonb),
('b56b3730-7787-4c37-9a7e-0371dd237ebb',null,'3cf15bc5-7985-4623-b5c0-27ec804a3a91','rsb_hamburg','RSB Hamburg CTB','RSB GmbH','fabrication_galvanizing_delivery','PST-HH-001',41117.3,108960,0,0,0,0,7500,0,116460,128295,'open_stale','Buyer confirmed open on 01.07.2026; later follow-ups have no confirmed reply.','reconstructed','confirmed','confirmed','sent_confirmed',null,'Supplier basis is recorded as verbal; customer offer is verified in Gmail but missing registry linkage.', '{"data_quality_warning":"verbal_supplier_and_missing_document_registry_link"}'::jsonb),
('982be03c-bae4-4611-b723-f77f2fd13c07','983fd952-7795-4b65-a54b-5c64c0d1ab43','da0ef9f7-afc4-46e1-ba4a-99d10e13cfba','stacon_d23','STACON D-23/26','Stacon GmbH & Co. KG','fabrication_painting_delivery','D-23/26',56661.7,107654,0,0,0,0,11850,0,119504,133155,'open','Original May offer is verified sent; no confirmed outcome.','confirmed','confirmed','confirmed','initial_offer_sent_confirmed','Later PST-QUO-2026-020 must not be treated as sent without Gmail evidence.','Later revision remains a data-quality warning.', '{"data_quality_warning":"later_revision_send_unverified"}'::jsonb),
('4422b24f-5c59-4b1f-bee5-08359301073a','4436a9a4-3421-4352-877d-222509c0dc17','22ac1069-55bb-45bf-bd86-ada724e662be','kropp_basis','Kropp TB Thalaubach','Kropp Bau GmbH','hybrid_fabrication_bought_out','Basisangebot',60331,240267.40,0,0,0,0,15000,0,255267.40,269143.53,'open','Offer sent 10.09.2026; follow-up sent 17.09.2026.','confirmed','confirmed','confirmed','sent_confirmed',null,'Basis supplier scenario mapped only to Basisangebot.', '{"variant_map":"basis"}'::jsonb),
('4422b24f-5c59-4b1f-bee5-08359301073a','8e1070a3-d627-4ed3-8132-ea37f16a5ad4','dcfd2a36-32c0-44aa-92c4-50d8202fafad','kropp_optimized','Kropp TB Thalaubach','Kropp Bau GmbH','hybrid_fabrication_bought_out','Optimized HEM280',60331,213118.45,0,0,0,0,15000,0,228118.45,241994.58,'open','Offer sent 10.09.2026; 22.09 follow-up remains Gmail draft.','confirmed','confirmed','confirmed','sent_confirmed','Optimized HEM280 lengths require Kropp technical approval.','Optimized supplier basis mapped only to optimized customer offer.', '{"variant_map":"alternative_hem280_optimized","draft_followup_not_sent":true}'::jsonb)
on conflict (project_id, scenario_key) do update set
  document_id=excluded.document_id,
  supplier_offer_id=excluded.supplier_offer_id,
  project_name=excluded.project_name,
  customer=excluded.customer,
  scope_category=excluded.scope_category,
  variant_label=excluded.variant_label,
  weight_kg=excluded.weight_kg,
  production_cost_eur=excluded.production_cost_eur,
  treatment_cost_eur=excluded.treatment_cost_eur,
  bought_out_cost_eur=excluded.bought_out_cost_eur,
  mechanical_cost_eur=excluded.mechanical_cost_eur,
  packaging_cost_eur=excluded.packaging_cost_eur,
  transport_cost_eur=excluded.transport_cost_eur,
  other_cost_eur=excluded.other_cost_eur,
  landed_cost_eur=excluded.landed_cost_eur,
  selling_price_eur=excluded.selling_price_eur,
  outcome=excluded.outcome,
  reason=excluded.reason,
  cost_confidence=excluded.cost_confidence,
  selling_confidence=excluded.selling_confidence,
  outcome_confidence=excluded.outcome_confidence,
  sent_evidence_status=excluded.sent_evidence_status,
  technical_condition=excluded.technical_condition,
  source_notes=excluded.source_notes,
  metadata=excluded.metadata,
  is_active=true,
  updated_at=now();
