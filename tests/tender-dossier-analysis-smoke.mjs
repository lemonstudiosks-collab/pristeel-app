import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractAppDossier,extractKrppDossier,officialUrl,chooseAnalysisDocuments} from '../supabase/functions/pppp-tender-dossier-analysis/parser.mjs';

const appHtml=`<html><body>
<div>Numri i referencës: REF-111</div>
<div class="modal"><p>Numri i referencës :</p><b>REF-111</b><a href="/GetData/DownloadDocument?docType=Call+Document&documentId=aaa">other.docx</a></div>
<div class="modal"><h4>Blerje llamarinë çeliku</h4><p>Numri i referencës :</p><b>REF-96830-08-20-2026</b>
<a href="/GetData/DownloadDocument?docType=Call+Document&amp;documentId=one">Procesverbal i miratimit te kritereve.docx</a>
<a href="/GetData/DownloadDocument?docType=Call+Document&amp;documentId=two">DST.docx</a>
<a href="/GetData/DownloadDocument?docType=Call+Document&amp;documentId=three">Njoftim kontrate.docx</a></div>
<div class="modal"><p>Numri i referencës :</p><b>REF-222</b><a href="/GetData/DownloadDocument?documentId=bbb">wrong.pdf</a></div>
</body></html>`;
const app=extractAppDossier(appHtml,'REF-96830-08-20-2026');
assert.equal(app.found,true,'APP exact reference was not found');
assert.equal(app.documents.length,3,'APP parser must isolate the exact dossier documents');
assert(app.documents.every(d=>d.url.startsWith('https://www.app.gov.al/GetData/DownloadDocument')),'APP documents must stay on the official allowlisted host');
assert(app.documents.some(d=>d.name==='DST.docx'),'APP dossier did not preserve the document filename');
assert(!app.documents.some(d=>d.name==='wrong.pdf'),'APP parser leaked a neighbouring tender document');

const krppHtml=`<html><body><h1>Rezervuari</h1><a href="/SPIN_PROD/download/DST.pdf">DST.pdf</a><a href="https://evil.example/file.pdf">evil.pdf</a><a href="javascript:alert(1)">bad.docx</a></body></html>`;
const krpp=extractKrppDossier(krppHtml,'https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4255945');
assert.equal(krpp.found,true,'KRPP page was not accepted');
assert.equal(krpp.documents.length,1,'KRPP parser must keep only official document URLs');
assert.equal(officialUrl('https://evil.example/file.pdf'),'','SSRF allowlist accepted an external host');
assert.equal(officialUrl('http://www.app.gov.al/file.pdf'),'','SSRF allowlist accepted insecure HTTP');

const ordered=chooseAnalysisDocuments([{name:'Njoftim kontrate.docx',url:'https://www.app.gov.al/a'},{name:'DST.docx',url:'https://www.app.gov.al/b'},{name:'Specifikime teknike.pdf',url:'https://www.app.gov.al/c'}],2);
assert.equal(ordered.length,2);
assert(ordered.some(d=>d.name==='DST.docx')&&ordered.some(d=>d.name==='Specifikime teknike.pdf'),'High-value technical dossier files were not prioritized');

const frontend=fs.readFileSync('pristeel-tender-dossier-analysis-v1.js','utf8');
const edge=fs.readFileSync('supabase/functions/pppp-tender-dossier-analysis/index.ts','utf8');
const finalizer=fs.readFileSync('pristeel-redesign-finalizer-v1.js','utf8');
assert(frontend.includes('/functions/v1/pppp-tender-dossier-analysis'),'Frontend is not wired to the dossier edge function');
assert(frontend.includes('[data-pcw-tender]'),'Whole tender-card interaction is not preserved');
assert(!/MutationObserver|setInterval\s*\(/.test(frontend),'Tender dossier UI must remain bounded and polling-free');
assert(edge.includes("type:'input_file'"),'Edge function does not pass official dossier files to OpenAI');
assert(edge.includes("source==='TED'"),'TED awards must not be routed through open-bid dossier analysis');
assert(frontend.includes("mode:'bundle'")&&frontend.includes('Shkarko dosjen ZIP'),'Frontend must expose an explicit dossier ZIP download');
assert(edge.includes("npm:fflate@0.8.2")&&edge.includes('zipSync')&&edge.includes('fetchOfficialBinary'),'Edge function must bundle official dossier documents server-side');
assert(edge.includes('MAX_BUNDLE_BYTES')&&edge.includes('officialUrl(loc,current)'),'Dossier bundle must preserve size and redirect allowlist boundaries');
assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'),'Purpose-limited persistence path is missing');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(edge),'Tender analysis must not contain external/binding action endpoints');
assert(finalizer.includes('data-pst-tender-dossier-analysis-v3'),'Finalizer does not load the current dossier analysis runtime');
console.log('Tender dossier parser + security + runtime smoke test passed.');

assert(frontend.includes('Kushtet teknike')&&frontend.includes('Kushtet komerciale'),'Primary dossier view must expose technical and commercial conditions');
