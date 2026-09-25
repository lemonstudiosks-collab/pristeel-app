import assert from 'node:assert';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const source=fs.readFileSync('pristeel-german-commercial-gate-v1.js','utf8');
const migration=fs.readFileSync('supabase/migrations/20260925182500_german_commercial_gate_v1.sql','utf8');
const projectId='4422b24f-5c59-4b1f-bee5-08359301073a';
const rows=[
  {project_id:'38bdf772-d73e-47b2-9d0f-6020e105aa62',scenario_key:'stacon_d22',project_name:'STACON D-22',variant_label:'D-22/26',landed_cost_eur:84608.40,selling_price_eur:87375,transport_cost_eur:15300,weight_kg:37464,outcome:'win',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{}},
  {project_id:'577a3a5f-cb3f-4049-9c2a-45e6bf158703',scenario_key:'roleff_411320',project_name:'Roleff',variant_label:'PST-QUO-2026-010',landed_cost_eur:202420,selling_price_eur:221142,transport_cost_eur:15200,weight_kg:81400,outcome:'price_loss',cost_confidence:'reconstructed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{}},
  {project_id:'6945392e-b9ab-4ea1-9f11-3ec026750e95',scenario_key:'rsb_sindelfingen',project_name:'RSB Sindelfingen',variant_label:'D-26',landed_cost_eur:331053,selling_price_eur:355797,transport_cost_eur:25550,outcome:'price_loss',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{}},
  {project_id:'fc96208d-356c-410a-a356-96ce9e9b4d2f',scenario_key:'evosys_anf9203',project_name:'EVOSYS',variant_label:'ANF-9203',landed_cost_eur:2258.57,selling_price_eur:2311.69,transport_cost_eur:1100,mechanical_cost_eur:700,packaging_cost_eur:100,weight_kg:132.802,outcome:'landed_economics_loss',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{}},
  {project_id:'57209f36-b019-4596-b9c1-c2d33488e721',scenario_key:'airbus_h24x',project_name:'Airbus',variant_label:'H24X',landed_cost_eur:308184.15,selling_price_eur:329252.91,outcome:'client_self_perform',cost_confidence:'conflicting',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{exclude_from_price_stats:true}},
  {project_id:'5767b41b-af14-4874-96c6-b754bb8cbc23',scenario_key:'geiger',project_name:'Geiger',variant_label:'PST-GEI-001/26',landed_cost_eur:22651,selling_price_eur:24631.32,outcome:'scope_mismatch',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{exclude_from_price_stats:true}},
  {project_id:'b56b3730-7787-4c37-9a7e-0371dd237ebb',scenario_key:'rsb_hamburg',project_name:'RSB Hamburg',variant_label:'PST-HH-001',landed_cost_eur:116460,selling_price_eur:128295,outcome:'open_stale',cost_confidence:'reconstructed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{}},
  {project_id:'982be03c-bae4-4611-b723-f77f2fd13c07',scenario_key:'stacon_d23',project_name:'STACON D-23',variant_label:'D-23/26',landed_cost_eur:119504,selling_price_eur:133155,outcome:'open',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{data_quality_warning:'later_revision_send_unverified'}},
  {project_id:projectId,scenario_key:'kropp_basis',project_name:'Kropp',variant_label:'Basisangebot',landed_cost_eur:255267.40,selling_price_eur:269143.53,transport_cost_eur:15000,weight_kg:60331,outcome:'open',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{variant_map:'basis'}},
  {project_id:projectId,scenario_key:'kropp_optimized',project_name:'Kropp',variant_label:'Optimized HEM280',landed_cost_eur:228118.45,selling_price_eur:241994.58,transport_cost_eur:15000,weight_kg:60331,outcome:'open',cost_confidence:'confirmed',selling_confidence:'confirmed',outcome_confidence:'confirmed',metadata:{variant_map:'alternative_hem280_optimized'}}
];

assert.match(migration,/pppp_german_commercial_benchmarks/);
assert.match(migration,/pppp_commercial_gate_settings/);
assert.match(migration,/da0ef9f7-afc4-46e1-ba4a-99d10e13cfba/,'D23 must reference the canonical supplier offer UUID');
assert.strictEqual((migration.match(/^\('[0-9a-f-]{36}'/gm)||[]).length,10,'Migration must seed exactly ten audited scenarios');
assert.doesNotMatch(source,/supaFetch\([^\n]+['"](?:POST|PATCH|DELETE)['"]/,'Gate must never write through Supabase');

const dom=new JSDOM('<!doctype html><html><head></head><body><main id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"><section data-pf2-margin>legacy</section><section data-pf2-compare>compare</section></div></div></main><button id="pst-finalize-client-offer">Finalize</button></body></html>',{runScripts:'outside-only',url:'https://pppp.test'});
const w=dom.window;
w.__pstCurrentProjectId=projectId;
w.__pstIntegrityLastData={project:{id:projectId,name:'Kropp TB Thalaubach',client:'Kropp Bau GmbH',location:'Germany'},supplierOffers:[{id:'s1',offer_ref:'Basis A',total_eur:255267.40,transport_eur:15000,qty_kg:60331},{id:'s2',offer_ref:'Optimized HEM280 B',total_eur:228118.45,transport_eur:15000,qty_kg:60331}],ourOffers:[{id:'c1',doc_nr:'Basis A',total_eur:269143.53},{id:'c2',doc_nr:'Optimized HEM280 B',total_eur:241994.58}]};
w.supaFetch=async path=>path.startsWith('pppp_german_commercial_benchmarks')?rows:[{market:'DE',logistics_risk_share:.28,small_one_off_weight_kg:1000,small_one_off_fixed_cost_share:.45,spread_band_very_aggressive:4,spread_band_competitive:6,spread_band_review:8}];
w.pstPiNew=()=>{};
w.eval(source);
await w.PSTGermanCommercialGateV1.refresh();
const T=w.PSTGermanCommercialGateV1._test;

assert.strictEqual(T.landedCost({total_amount:10000,base_cost:10000,transport_cost:900,incoterm:'DAP Hamburg'}),10000,'DAP total must not add transport twice');
assert.strictEqual(T.landedCost({base_cost:10000,transport_cost:900,incoterm:'EXW'}),10900,'EXW landed cost must add transport');
assert.strictEqual(Math.round(T.targetPrice(94000,6)),100000,'Target price simulation must solve spread as share of selling price');
assert.strictEqual(T.variantKey({offer_ref:'Basisangebot A'}),'basis');
assert.strictEqual(T.variantKey({offer_state:{offer_variant:'alternative_hem280_optimized'}}),'optimized');

const ev=T.enrich(rows[3],T.defaults);
assert(ev.warnings.some(x=>/Rrezik logjistik/.test(x.text)),'EVOSYS must trigger logistics risk');
assert(ev.warnings.some(x=>/Small one-off/.test(x.text)),'EVOSYS must trigger small one-off warning');
const stats=T.statistics(rows);
assert.strictEqual(stats.count,8,'Airbus and Geiger non-price outcomes must be excluded from price statistics');
assert.strictEqual(stats.priceLosses,2);

const card=w.document.querySelector('[data-gcg]');
assert(card,'German project must render the gate');
assert(card.textContent.includes('Commercial Gate — Germany'));
assert(card.textContent.includes('Basisangebot'));
assert.strictEqual(w.document.querySelector('[data-pf2-margin]').hidden,true,'Legacy commercial summary must yield to the German gate');
const selector=card.querySelector('[data-gcg-scenario]');
assert(selector && selector.options.length===2,'Kropp supplier/customer variants must remain separate');
selector.value='kropp_optimized';selector.dispatchEvent(new w.Event('change',{bubbles:true}));
assert(w.document.querySelector('[data-gcg]').textContent.includes('241.994,58 EUR'),'Optimized scenario must map to optimized customer price');

const finalize=w.document.getElementById('pst-finalize-client-offer');
finalize.click();
assert(w.document.querySelector('.gcg-modal'),'Final output must require a human commercial review');
assert(w.document.querySelector('.gcg-modal').textContent.includes('nuk po aprovon'),'Review must state there is no automatic approval');

dom.window.close();
console.log('German Commercial Gate smoke test passed.');
