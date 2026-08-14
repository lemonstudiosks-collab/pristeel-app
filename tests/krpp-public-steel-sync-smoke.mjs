import assert from 'node:assert/strict';
import { authorityPriority, classifyKrppSteel, parseDetailHtml, parseNoticeIndexHtml, prepareRelevantRows, selectCandidates } from '../scripts/krpp-public-steel-sync.mjs';

assert.equal(authorityPriority('TREPÇA Sh.A.'),'A');
assert.equal(authorityPriority('KOSTT sh.a.'),'A');
assert.equal(authorityPriority('KRU Prishtina'),'B');
assert.equal(authorityPriority('Komuna e Prizrenit'),'other');

const indexHtml=`
<h1>On-line njoftimet 14.08.2026</h1><h2>PlusMinusB05 Njoftim per Kontrat</h2>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=7001">1. Furnizim me material metalik</a>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=7002">2. Furnizim me printera</a>
<h2>PlusMinusB08 Njoftim për dhënie të kontratës</h2>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=7003">3. Furnizim me llamarine</a>
<h1>On-line njoftimet 13.08.2026</h1><h2>PlusMinusB54 Korrigjim</h2>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=7004">4. Punime me konstruksion metalik</a>`;
const notices=parseNoticeIndexHtml(indexHtml,'https://e-prokurimi.rks-gov.net/index');
assert.equal(notices.length,4);
const candidates=selectCandidates(notices,{recentDateCount:30,fullScanDateCount:2,maxCandidates:50});
assert.deepEqual(candidates.map(x=>x.detail_id).sort(),['7001','7002','7004']);

const trepcaHtml=`<table>
<tr><td>Blerësi</td><td>TREPÇA Sh.A.</td></tr>
<tr><td>Kodi/Numri</td><td>2026/TREPCA-26-100-1-2-1/B05-0010001</td></tr>
<tr><td>Emërtimi</td><td>Furnizim me material metalik për terminalin doganor</td></tr>
<tr><td>Lloji i dokumentit*</td><td>B05 Njoftim per Kontrat</td></tr>
<tr><td>Lloji i kontratës</td><td>1 Furnizim</td></tr>
<tr><td>FPP</td><td>27000000-5 Metalet bazë dhe produktet e shoqëruara</td></tr>
<tr><td>Vlera e parashikuar</td><td>120,000.00</td></tr>
<tr><td>Afati për dorëzimin e ofertave/kërkesës për pjesëmarrje</td><td>10.09.2026 14:00</td></tr>
<tr><td>Data e njoftimit</td><td>14.08.2026</td></tr></table>`;
const trepca=parseDetailHtml(trepcaHtml,notices[0].detail_url,notices[0]);
assert.equal(trepca.procurement_no,'TREPCA-26-100-1-2-1');
assert.equal(trepca.payload.authority_priority,'A');
const c1=classifyKrppSteel(trepca);
assert.equal(c1.category,'raw_material');
assert.ok(c1.relevance_score>=65);

const sheet=classifyKrppSteel({title:'Furnizim me llamarinë të çelikut',fpp:'28527000-2'});
assert.equal(sheet.category,'raw_material');
assert.ok(sheet.relevance_score>=65);
const structure=classifyKrppSteel({title:'Ndërtimi i mbulesës me konstruksion metalik',fpp:'45000000-7'});
assert.equal(structure.category,'steel_structure');
assert.ok(structure.relevance_score>=65);
const genericMetal=classifyKrppSteel({title:'Furnizim me pajisje zyre',fpp:'27000000-5'});
assert.ok(genericMetal.relevance_score<35,'broad metal FPP alone must not create noise');
const relevant=prepareRelevantRows([trepca],'2026-08-14T07:00:00.000Z',35);
assert.equal(relevant.length,1);
assert.equal(relevant[0].payload.source,'KRPP');
console.log('KRPP public steel sync smoke: OK');
