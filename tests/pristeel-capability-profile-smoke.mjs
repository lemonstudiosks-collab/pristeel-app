import assert from 'node:assert/strict';
import { assessPristeelTender, attachCapabilityPayload, capabilityCandidateHint, PRISTEEL_CAPABILITY_PROFILE_VERSION } from '../scripts/pristeel-capability-profile.mjs';
import { classifyKrppOpportunity, prepareRows, selectCandidates } from '../scripts/krpp-public-capability-runner.mjs';

function score(title,extra={}){return classifyKrppOpportunity({title,...extra});}

for(const title of ['Furnizim me profile IPE 200','Furnizim me profile HEB 300','Furnizim me llamarinë të çelikut','Furnizim me B500C armaturë']){
  const r=score(title);
  assert.ok(r.relevance_score>=65,`direct capability must be strong: ${title}`);
  assert.ok(['raw_material','steel_structure'].includes(r.category));
}

const hidden=[
  ['Rehabilitimi i nënstacionit 110 kV dhe zëvendësimi i portaleve','energy_grid'],
  ['Riparimi i transportuesit të thëngjillit dhe platformave të mirëmbajtjes','industrial_steelwork'],
  ['Punime mekanike në termocentral dhe rehabilitim i platformave','industrial_steelwork'],
  ['Ndërtimi i depos me konstruksion prefabrikuar','fabricated_structures'],
  ['Rehabilitimi i urës dhe zëvendësimi i elementeve mbajtëse','fabricated_structures']
];
for(const [title,family] of hidden){
  const r=score(title,{contract_type:'Punë'});
  assert.ok(r.relevance_score>=35,`contextual PRISTEEL package must reach review: ${title}`);
  assert.equal(r.capability_fit,'possible');
  assert.equal(r.capability_review_required,true);
  assert.ok(r.capability_matches.some(x=>x.key===family),`expected ${family}: ${title}`);
}

for(const title of [
  'Ndërtimi i objektit administrativ',
  'Furnizim me printera dhe laptopë',
  'Furnizim me instrumente kirurgjikale prej çeliku',
  'Furnizim me dollapa metalikë për zyre',
  'Siguracion i detyrueshëm TPL',
  'Furnizim me licencë për qasje institucionale në platformën për detektimin e plagjiaturës, Sistemi ANTIPLAGJIATUR',
  'Furnizim me licenca të avancuara të platformave të Inteligjencës Artificiale për nevojat e SIMS'
]){
  assert.ok(score(title).relevance_score<35,`false positive must stay below review threshold: ${title}`);
}

assert.ok(score('Ndërtimi i sheshit prej Urës se Zallit deri te Ura e Hajdaragëve ne Komunën e Pejës',{fpp:'45000000-7',contract_type:'Punë'}).relevance_score<35,'bridge name used only as location must not create a PRISTEEL review');
assert.ok(score('Furnizim me pajisje zyre',{fpp:'27000000-5'}).relevance_score<35);

const directStructure=score('Fabrikim dhe montim i platformave metalike me grating',{fpp:'45223100-7',contract_type:'Punë'});
assert.equal(directStructure.category,'steel_structure');
assert.equal(directStructure.capability_fit,'strong');
assert.equal(directStructure.capability_review_required,false);

assert.ok(capabilityCandidateHint('Rehabilitimi i nënstacionit 110 kV'));
assert.ok(capabilityCandidateHint('Riparimi i conveyor-it kryesor'));

const candidates=selectCandidates([
  {detail_id:'1',title:'Shërbime të përgjithshme',notice_type:'B05',published_date:'2026-08-17'},
  {detail_id:'2',title:'Rehabilitimi i nënstacionit 110 kV',notice_type:'B05',published_date:'2026-08-16'},
  {detail_id:'3',title:'Furnizim me profile IPE 200',notice_type:'B05',published_date:'2026-08-15'}
],{recentDateCount:30,fullScanDateCount:2,maxCandidates:50});
assert.ok(candidates.some(x=>x.detail_id==='1'),'newest date must be detail-scanned even with no keyword');
assert.ok(candidates.some(x=>x.detail_id==='2'),'capability-context title must be included');
assert.ok(candidates.some(x=>x.detail_id==='3'),'direct steel title must be included beyond full-scan dates');

const base={title:'Rehabilitimi i nënstacionit dhe portaleve',authority:'KOSTT',deadline:'2026-09-10',published_date:'2026-08-17',payload:{source:'KRPP',authority_priority:'A'}};
const assessed=assessPristeelTender(base);
const attached=attachCapabilityPayload(base,assessed);
assert.equal(attached.payload.capability_profile_version,PRISTEEL_CAPABILITY_PROFILE_VERSION);
assert.equal(attached.payload.capability_review_required,true);
assert.ok(Array.isArray(attached.payload.capability_matches));
const rows=prepareRows([base],{today:new Date('2026-08-17T00:00:00Z'),minScore:35});
assert.equal(rows.length,1);
assert.equal(rows[0].payload.capability_profile_version,PRISTEEL_CAPABILITY_PROFILE_VERSION);

console.log('PRISTEEL capability profile smoke: OK');
