import assert from 'node:assert/strict';
import { authorityPriorityAlbania, classifyAlbaniaSteel, normalizeAppRecord, parseCsv, prepareAppRows } from '../scripts/app-albania-steel-sync.mjs';

assert.equal(authorityPriorityAlbania('KESH sh.a.'),'A');
assert.equal(authorityPriorityAlbania('Operatori i Sistemit te Transmetimit OST sh.a.'),'A');
assert.equal(authorityPriorityAlbania('Drejtoria e Tensionit te Larte OSSH sh.a'),'A');

const csv=`Autoriteti Kontraktor;Objekti i Prokurimit;Numri i References;Numri i Njoftimit;Fondi Limit;Data e Publikimit;Data e Mbylljes;Kodi CPV;Tipi i Kontrates;Procedura\nKESH sh.a.;Furnizim me llamarine dhe profile celiku;REF-100-08-14-2026;CN/100/08142026;120000000 Leke;14-08-2026;20-09-2026;14622000-0 - Çelik;Mallra;E hapur\nBashkia X;Furnizim me printera;REF-200-08-14-2026;CN/200/08142026;1000000 Leke;14-08-2026;20-09-2026;30232110-8 - Printera;Mallra;E hapur\nOST sh.a.;Ndertim platforme me konstruksion metalik;REF-300-08-14-2026;CN/300/08142026;300000000 Leke;14-08-2026;30-09-2026;45223100-7 - Montimi i strukturave metalike;Pune;E hapur`;
const records=parseCsv(csv);
assert.equal(records.length,3);
const first=normalizeAppRecord(records[0]);
assert.equal(first.authority,'KESH sh.a.');
assert.equal(first.payload.authority_priority,'A');
assert.equal(first.fpp,'14622000-0');
assert.equal(first.deadline,'2026-09-20');
const raw=classifyAlbaniaSteel(first);
assert.equal(raw.category,'raw_material');
assert.ok(raw.relevance_score>=65);
const structure=classifyAlbaniaSteel(normalizeAppRecord(records[2]));
assert.equal(structure.category,'steel_structure');
assert.ok(structure.relevance_score>=65);
const irrelevant=classifyAlbaniaSteel(normalizeAppRecord(records[1]));
assert.equal(irrelevant.relevance_score,0);
const relevant=prepareAppRows(records,{seenAt:'2026-08-14T07:00:00.000Z',minScore:55,recentDays:60,today:new Date('2026-08-14T00:00:00Z')});
assert.equal(relevant.length,2);
assert.ok(relevant.every(x=>x.payload.source==='APP_AL'));
assert.ok(relevant.every(x=>x.source_key.startsWith('APP_AL:')));

const quoted=parseCsv('Autoriteti Kontraktor,Objekti i Prokurimit,Numri i References,Data e Mbylljes,Kodi CPV\n"KESH sh.a.","Furnizim me pllaka, profile dhe llamarina çeliku",REF-400,20-09-2026,"44171000-9 - Pllaka"');
assert.equal(quoted.length,1);
assert.equal(normalizeAppRecord(quoted[0]).title,'Furnizim me pllaka, profile dhe llamarina çeliku');
console.log('APP Albania steel sync smoke: OK');
