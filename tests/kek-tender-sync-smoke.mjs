import assert from 'node:assert/strict';
import { classifyTender, parseSearchHtml, prepareRelevantRows, sourceKey } from '../scripts/kek-tender-sync.mjs';

const html = `
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

const parsed = parseSearchHtml(html, 'https://e-prokurimi.rks-gov.net/test');
assert.equal(parsed.length, 4, 'only KEK rows should be parsed');
assert.equal(parsed[0].title, 'Furnizim me llamarinë të çelikut');
assert.equal(parsed[0].published_date, '2026-08-12');
assert.equal(parsed[0].deadline, null);
assert.equal(parsed[1].deadline, '2026-08-30');
assert.match(parsed[0].detail_url || '', /DokumentPodaciFrm\.aspx/);

const raw = classifyTender(parsed[0]);
assert.equal(raw.category, 'raw_material');
assert.ok(raw.relevance_score >= 65);

const structure = classifyTender(parsed[1]);
assert.equal(structure.category, 'steel_structure');
assert.ok(structure.relevance_score >= 65);

const irrelevant = classifyTender(parsed[2]);
assert.equal(irrelevant.relevance_score, 0);

const fppSteel = classifyTender(parsed[3]);
assert.ok(fppSteel.relevance_score >= 35, 'direct steel FPP must enter review');

const relevant = prepareRelevantRows(parsed, '2026-08-12T12:00:00.000Z', 35);
assert.equal(relevant.length, 3, 'non-steel turbine tender must be skipped');
assert.equal(sourceKey(parsed[0]), parsed[0].publication_no);
assert.equal(relevant[0].last_seen_at, '2026-08-12T12:00:00.000Z');

console.log('KEK tender sync smoke: OK');
