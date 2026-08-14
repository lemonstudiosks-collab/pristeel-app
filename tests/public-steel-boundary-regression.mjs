import assert from 'node:assert/strict';
import { classifyKrppSteelV2, prepareKrppRowsV2 } from '../scripts/krpp-public-steel-sync-v2.mjs';
import { classifyAlbaniaSteelV2, prepareAppRowsV2 } from '../scripts/app-albania-steel-sync-v2.mjs';

for(const title of [
  'Furnizim me kripë industriale të pa jodizuar',
  'Ndërtimi i objektit të Gjykatës Themelore në Pejë',
  'Furnizim me aparatura hematologjike',
  'Supervizim i punimeve në rrjet',
  'Siguracion i detyrueshëm TPL'
]){
  assert.ok(classifyKrppSteelV2({title}).relevance_score<35,`KRPP false positive: ${title}`);
  assert.ok(classifyAlbaniaSteelV2({title,cpvs:[]}).relevance_score<55,`APP false positive: ${title}`);
}

for(const title of ['Furnizim me profile IPE 200','Furnizim me profile HEB 300','Furnizim me HEM 400','Furnizim me UPE 160']){
  assert.ok(classifyKrppSteelV2({title}).relevance_score>=65,`profile code should match: ${title}`);
}

const trepca=classifyKrppSteelV2({title:'Furnizim me material metalik',fpp:'27000000-5'});
assert.equal(trepca.category,'raw_material');
assert.ok(trepca.relevance_score>=65);
const sheet=classifyKrppSteelV2({title:'Furnizim me llamarinë të çelikut',fpp:'28527000-2'});
assert.equal(sheet.category,'raw_material');
const genericConstruction=classifyKrppSteelV2({title:'Ndërtimi i objektit administrativ',fpp:'45000000-7'});
assert.ok(genericConstruction.relevance_score<35);
const metalConstruction=classifyKrppSteelV2({title:'Ndërtimi i mbulesës me konstruksion metalik',fpp:'45000000-7'});
assert.equal(metalConstruction.category,'steel_structure');

const woodPole=classifyAlbaniaSteelV2({title:'Blerje shtylla druri dhe beton-arme',cpvs:['44212222-1']});
assert.ok(woodPole.relevance_score<55,'generic 4421 code without steel text must not qualify');
const steelStructure=classifyAlbaniaSteelV2({title:'Montim i strukturave metalike',cpvs:['45223100-7']});
assert.equal(steelStructure.category,'steel_structure');
const rawSteel=classifyAlbaniaSteelV2({title:'Furnizim me llamarina çeliku',cpvs:['44330000-2']});
assert.equal(rawSteel.category,'raw_material');

const expiredKrpp=prepareKrppRowsV2([{title:'Furnizim me çelik',fpp:'27115000-4',deadline:'2026-08-01',payload:{source:'KRPP'}}],{today:new Date('2026-08-14T00:00:00Z')});
assert.equal(expiredKrpp.length,0,'expired KRPP opportunity must not remain active');

const appRows=[
 { 'autoriteti kontraktor':'KESH sh.a.','objekti i prokurimit':'Furnizim me llamarina çeliku','numri i references':'REF-A','data e publikimit':'01-01-2026','data e mbylljes':'02-01-2026','kodi cpv':'44330000-2','operatori ekonomik fitues':'Fitues shpk' },
 { 'autoriteti kontraktor':'KESH sh.a.','objekti i prokurimit':'Furnizim me llamarina çeliku','numri i references':'REF-B','data e publikimit':'10-08-2026','data e mbylljes':'20-08-2026','kodi cpv':'44330000-2' }
];
const appRelevant=prepareAppRowsV2(appRows,{today:new Date('2026-08-14T00:00:00Z'),recentDays:60,minScore:55});
assert.deepEqual(appRelevant.map(x=>x.procurement_no),['REF-B'],'old Albania awards should be time-bounded while active opportunities remain');
console.log('Public steel boundary regression: OK');
