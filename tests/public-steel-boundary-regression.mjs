import assert from 'node:assert/strict';
import { classifyKrppSteel, prepareRows as prepareKrppRows } from '../scripts/krpp-public-steel-runner.mjs';
import { classifyAlbaniaSteel, prepareRows as prepareAppRows } from '../scripts/app-albania-steel-runner.mjs';

for(const title of [
  'Furnizim me kripë industriale të pa jodizuar',
  'Ndërtimi i objektit të Gjykatës Themelore në Pejë',
  'Furnizim me aparatura hematologjike',
  'Supervizim i punimeve në rrjet',
  'Siguracion i detyrueshëm TPL',
  'Investim ne rehabilitimin e ndriçimit te rruges Et’hem Kazazi',
  'Renovimi i rruges KISLA-CUMHURIYET-BAHCELIK-HURIYET'
]){
  assert.ok(classifyKrppSteel({title}).relevance_score<35,`KRPP false positive: ${title}`);
  assert.ok(classifyAlbaniaSteel({title,cpvs:[]}).relevance_score<55,`APP false positive: ${title}`);
}

for(const title of ['Furnizim me profile IPE 200','Furnizim me profile HEB 300','Furnizim me HEM 400','Furnizim me UPE 160']){
  assert.ok(classifyKrppSteel({title}).relevance_score>=65,`profile code should match: ${title}`);
}

const trepca=classifyKrppSteel({title:'Furnizim me material metalik',fpp:'27000000-5'});
assert.equal(trepca.category,'raw_material');
assert.ok(trepca.relevance_score>=65);
assert.equal(classifyKrppSteel({title:'Furnizim me llamarinë të çelikut',fpp:'28527000-2'}).category,'raw_material');
assert.ok(classifyKrppSteel({title:'Ndërtimi i objektit administrativ',fpp:'45000000-7'}).relevance_score<35);
assert.equal(classifyKrppSteel({title:'Ndërtimi i mbulesës me konstruksion metalik',fpp:'45000000-7'}).category,'steel_structure');

assert.ok(classifyAlbaniaSteel({title:'Blerje shtylla druri dhe beton-arme',cpvs:['44212222-1']}).relevance_score<55);
assert.equal(classifyAlbaniaSteel({title:'Montim i strukturave metalike',cpvs:['45223100-7']}).category,'steel_structure');
assert.equal(classifyAlbaniaSteel({title:'Furnizim çeliku',cpvs:['14622000-7']}).category,'raw_material');
assert.equal(classifyAlbaniaSteel({title:'Furnizim hekuri',cpvs:['14711000-8']}).category,'raw_material');
assert.ok(classifyAlbaniaSteel({title:'Mirembajtje ambiente ndihmese',cpvs:['44171000-9']}).relevance_score<55,'generic plates CPV without steel text must stay below threshold');
assert.ok(classifyAlbaniaSteel({title:'Krijim ambienti arkive',cpvs:['44334000-0']}).relevance_score<55,'generic profiles CPV without metal text must stay below threshold');
assert.ok(classifyAlbaniaSteel({title:'Punime për ambjente arkive',cpvs:['44330000-2','44334000-0']}).relevance_score<55,'multiple broad profile CPVs must not stack into a false steel match');
assert.equal(classifyAlbaniaSteel({title:'Blerje profile metalike',cpvs:['44334000-0']}).category,'raw_material');
const genericIronAmongMany=classifyAlbaniaSteel({title:'Blerje materiale ndërtimi',cpvs:['14711000-8','44111200-3','44192200-4','44921200-4']});
assert.equal(genericIronAmongMany.category,'possible');
assert.ok(genericIronAmongMany.relevance_score>=55&&genericIronAmongMany.relevance_score<65,'iron among many generic CPVs should be review-only, not high-confidence raw steel');

const expiredKrpp=prepareKrppRows([{title:'Furnizim me çelik',fpp:'27115000-4',deadline:'2026-08-01',payload:{source:'KRPP'}}],{today:new Date('2026-08-14T00:00:00Z')});
assert.equal(expiredKrpp.length,0);
const appRows=[
 { 'autoriteti kontraktor':'KESH sh.a.','objekti i prokurimit':'Furnizim me llamarina çeliku','numri i references':'REF-A','data e publikimit':'01-01-2026','data e mbylljes':'02-01-2026','kodi cpv':'44330000-2','operatori ekonomik fitues':'Fitues shpk' },
 { 'autoriteti kontraktor':'KESH sh.a.','objekti i prokurimit':'Furnizim me llamarina çeliku','numri i references':'REF-B','data e publikimit':'10-08-2026','data e mbylljes':'20-08-2026','kodi cpv':'44330000-2' }
];
const appRelevant=prepareAppRows(appRows,{today:new Date('2026-08-14T00:00:00Z'),recentDays:60,minScore:55});
assert.deepEqual(appRelevant.map(x=>x.procurement_no),['REF-B']);
console.log('Public steel boundary regression: OK');
