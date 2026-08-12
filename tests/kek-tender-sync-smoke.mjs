import assert from 'node:assert/strict';
import {
  classifyTender,
  parseDetailHtml,
  parseNoticeIndexHtml,
  parseSearchHtml,
  prepareRelevantRows,
  selectNoticeCandidates,
  sourceKey
} from '../scripts/kek-tender-sync.mjs';

const legacyHtml = `
<table>
<tr><th>Numri</th><th>Autoriteti</th><th>Publikimi</th><th>Lënda</th><th>FPP</th><th>Lloji</th><th>Vlera</th><th>Procedura</th><th>Publikuar</th></tr>
<tr>
<td>KEK-26-4111-1-2-1</td><td>KORPORATA ENERGJETIKE E KOSOVES sh.a.</td><td>2026/KEK-26-4111-1-2-1/B10-0016001</td>
<td><a href="/SPIN_PROD/APPLICATION/IPN/DocumentManagement/DokumentPodaciFrm.aspx?id=4112217">Furnizim me llamarinë të çelikut</a></td><td>28527000-2</td><td>Furnizim</td><td>Vlerë e mesme</td><td>Procedurë e hapur</td><td>12.08.2026 00:00</td>
</tr>
<tr>
<td>KEK-26-4222-5-2-1</td><td>KORPORATA ENERGJETIKE E KOSOVES sh.a.</td><td>2026/KEK-26-4222-5-2-1/B52-0016002</td>
<td>Vendosja e rrethojes perimetrike dhe konstruksione metalike</td><td>45453100-8</td><td>Pune</td><td>Vlerë e mesme</td><td>Procedurë e hapur</td><td>30.08.2026</td><td>12.08.2026</td>
</tr>
<tr>
<td>KEK-26-4333-1-2-1</td><td>KORPORATA ENERGJETIKE E KOSOVES sh.a.</td><td>2026/KEK-26-4333-1-2-1/B52-0016003</td>
<td>Furnizim me pjesë rezervë për turbine</td><td>29860000-5</td><td>Furnizim</td><td>Vlerë e mesme</td><td>Procedurë e hapur</td><td>12.08.2026</td>
</tr>
<tr>
<td>KEK-26-4444-1-2-1</td><td>KORPORATA ENERGJETIKE E KOSOVES sh.a.</td><td>2026/KEK-26-4444-1-2-1/B52-0016004</td>
<td>Furnizim me elemente lidhëse për rule</td><td>27115000-4</td><td>Furnizim</td><td>Vlerë e mesme</td><td>Procedurë e hapur</td><td>12.08.2026</td>
</tr>
<tr><td>616-26-100-1-2-1</td><td>KOMUNA</td><td>2026/616-26-100/B10-1</td><td>Furnizim me çelik</td><td>27115000-4</td><td>Furnizim</td><td>12.08.2026</td></tr>
</table>`;

const legacy = parseSearchHtml(legacyHtml, 'https://e-prokurimi.rks-gov.net/test');
assert.equal(legacy.length, 4, 'only KEK rows should be parsed from legacy result tables');
assert.equal(legacy[0].title, 'Furnizim me llamarinë të çelikut');
assert.equal(legacy[1].deadline, '2026-08-30');

const indexHtml = `
<h1>On-line njoftimet 12.08.2026</h1>
<h2>PlusMinusB05 Njoftim per Kontrat</h2>
<ul>
<li><a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=5001">1. Furnizim me llamarinë të çelikut</a></li>
<li><a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=5002">2. Furnizim me elemente lidhese per rule</a></li>
<li><a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=5003">3. Furnizim me printera</a></li>
</ul>
<h2>PlusMinusB08 Njoftim për dhënie të kontratës</h2>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=5004">1. Furnizim me shufra të çelikut</a>
<h1>On-line njoftimet 11.08.2026</h1>
<h2>PlusMinusB54 Formulari standard per korrigjimin e gabimeve</h2>
<a href="/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=5005">1. Konstruksione metalike për platformë</a>`;

const notices = parseNoticeIndexHtml(indexHtml, 'https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/NewPreglediDokumenataFrm.aspx');
assert.equal(notices.length, 5);
assert.equal(notices[0].detail_id, '5001');
assert.equal(notices[0].published_date, '2026-08-12');
assert.equal(notices[0].notice_type, 'B05');
assert.equal(notices[4].notice_type, 'B54');
assert.equal(notices[4].published_date, '2026-08-11');

const candidates = selectNoticeCandidates(notices, { recentDateCount: 30, maxCandidates: 120 });
assert.deepEqual(candidates.map(x => x.detail_id).sort(), ['5001', '5002', '5005']);
assert.ok(candidates.find(x => x.detail_id === '5002'), 'ambiguous fastening-elements title must be inspected for its FPP');
assert.ok(!candidates.find(x => x.detail_id === '5004'), 'award notices must not be raised as new bid opportunities');

const detailHtml = `
<table>
<tr><td>Blerësi</td><td>KORPORATA ENERGJETIKE E KOSOVES sh.a.</td></tr>
<tr><td>Kodi/Numri</td><td>2026/KEK-26-2874-1-2-1/B05-0017001</td></tr>
<tr><td>Emërtimi</td><td>Furnizim me elemente lidhese per rule</td></tr>
<tr><td>Lloji i dokumentit*</td><td>B05 Njoftim per Kontrat</td></tr>
<tr><td>Lloji i kontratës</td><td>1 Furnizim</td></tr>
<tr><td>FPP</td><td>27115000-4 Çelik</td></tr>
<tr><td>Lloji i procedurës</td><td>1 Procedurë e hapur</td></tr>
<tr><td>Vlera e parashikuar</td><td>50,000.00</td></tr>
<tr><td>Afati për dorëzimin e ofertave/kërkesës për pjesëmarrje</td><td>04.09.2026 14:00</td></tr>
<tr><td>Data e njoftimit</td><td>12.08.2026</td></tr>
</table>`;

const detail = parseDetailHtml(detailHtml, notices[1].detail_url, notices[1]);
assert.equal(detail.procurement_no, 'KEK-26-2874-1-2-1');
assert.equal(detail.publication_no, '2026/KEK-26-2874-1-2-1/B05-0017001');
assert.equal(detail.authority, 'KORPORATA ENERGJETIKE E KOSOVES sh.a.');
assert.equal(detail.fpp, '27115000-4');
assert.equal(detail.fpp_description, 'Çelik');
assert.equal(detail.contract_type, 'Furnizim');
assert.equal(detail.procedure, 'Procedurë e hapur');
assert.equal(detail.estimated_value, 50000);
assert.equal(detail.deadline, '2026-09-04');
assert.equal(detail.published_date, '2026-08-12');

const fppSteel = classifyTender(detail);
assert.equal(fppSteel.category, 'raw_material');
assert.ok(fppSteel.relevance_score >= 65, 'direct steel FPP must be definite raw material');

const raw = classifyTender(legacy[0]);
assert.equal(raw.category, 'raw_material');
assert.ok(raw.relevance_score >= 65);
const structure = classifyTender(legacy[1]);
assert.equal(structure.category, 'steel_structure');
assert.ok(structure.relevance_score >= 65);
const irrelevant = classifyTender(legacy[2]);
assert.equal(irrelevant.relevance_score, 0);

const relevant = prepareRelevantRows([detail], '2026-08-12T12:00:00.000Z', 35);
assert.equal(relevant.length, 1);
assert.equal(sourceKey(detail), detail.publication_no);
assert.equal(relevant[0].last_seen_at, '2026-08-12T12:00:00.000Z');

console.log('KEK tender sync smoke: OK');
