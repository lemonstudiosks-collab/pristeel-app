import assert from 'node:assert/strict';
import fs from 'node:fs';
import {extractAppDossier,extractKrppDossier,extractKrppPostbackActions,extractAspNetFormState,officialUrl,chooseAnalysisDocuments} from '../supabase/functions/pppp-tender-dossier-analysis/parser.mjs';

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

const krppHtml=`<html><body><form method="post" action="./DokumentPodaciFrm.aspx?id=4255945">
<input type="hidden" name="__VIEWSTATE" value="STATE-1">
<input type="hidden" name="__EVENTVALIDATION" value="VALID-1">
<h1>Rezervuari</h1>
<a href="#top">Povratak na vrh</a>
<a href="DokumentPodaciFrm.aspx?id=4255945">B05 Njoftim per Kontrat</a>
<a href="javascript:WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(&quot;uiDokumentPodaci$uiDocumentCtl$uiOpenDocumentHtml&quot;, &quot;&quot;, true, &quot;&quot;, &quot;&quot;, false, true))">Ueb faqja</a>
<a href="javascript:WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions(&quot;uiDokumentPodaci$uiDownloadAll&quot;, &quot;FULL-4255945&quot;, true, &quot;&quot;, &quot;&quot;, false, true))">Shkarko plotë "Dosje tenderi"</a>
<a href="javascript:__doPostBack(&quot;uiDokumentPodaci$uiDokumentacijaZaNadmetanjeCtl$uiOpenDocumentZip&quot;,&quot;DOC-17&quot;)">Shkarko të gjithë dokumentacionin</a>
<input type="submit" name="uiDokumentPodaci$uiTroskovnikRepeater$ctl00$uiTroskovnikCtl$uiOpenDocumentZip" value="Shkarko paramasën">
<a href="/SPIN_PROD/download/DST.pdf">DST.pdf</a>
<a href="https://evil.example/file.pdf">evil.pdf</a>
</form></body></html>`;
const krppDetail='https://e-prokurimi.rks-gov.net/SPIN_PROD/application/ipn/DocumentManagement/DokumentPodaciFrm.aspx?id=4255945';
const krpp=extractKrppDossier(krppHtml,krppDetail);
assert.equal(krpp.found,true,'KRPP page was not accepted');
assert.equal(krpp.documents.length,1,'KRPP parser must keep only real official document URLs, not same-page HTML/navigation links');
assert.equal(krpp.documents[0].name,'DST.pdf');
assert.equal(krpp.postbacks.length,3,'KRPP parser must capture only allowlisted real download postbacks');
assert.equal(krpp.postbacks[0].event_target,'uiDokumentPodaci$uiDownloadAll','Full dossier postback must have highest priority');
assert.equal(krpp.postbacks[0].event_argument,'FULL-4255945','KRPP parser must preserve the exact WebForms event argument');
assert(krpp.postbacks.some(x=>x.event_target==='uiDokumentPodaci$uiDokumentacijaZaNadmetanjeCtl$uiOpenDocumentZip'&&x.event_argument==='DOC-17'),'KRPP parser must support classic __doPostBack target + argument');
assert(krpp.postbacks.some(x=>x.kind==='krpp_submit'&&x.submit_name==='uiDokumentPodaci$uiTroskovnikRepeater$ctl00$uiTroskovnikCtl$uiOpenDocumentZip'),'KRPP parser must preserve real WebForms submit controls');
assert(!krpp.postbacks.some(x=>/uiOpenDocumentHtml/.test(x.event_target||x.submit_name||'')),'KRPP HTML/web-page actions must never be treated as dossier files');
const krppState=extractAspNetFormState(krppHtml,krppDetail);
assert.equal(krppState.found,true,'KRPP ASP.NET form state was not found');
assert.equal(krppState.action,krppDetail,'KRPP form action must resolve to the allowlisted official page');
assert.equal(krppState.fields.__VIEWSTATE,'STATE-1');
assert.equal(krppState.fields.__EVENTVALIDATION,'VALID-1');
assert.equal(extractKrppPostbackActions(krppHtml).length,3);

const krppSecondaryHtml=`<html><body><form action="./DokumentPodaciFrm.aspx?id=4255945">
<input type="hidden" name="__VIEWSTATE" value="STATE-2">
<input type="hidden" name="__EVENTVALIDATION" value="VALID-2">
<div>Njoftim - B05 Njoftim per Kontrat</div>
<a href="javascript:__doPostBack(&quot;uiDokumentPodaci$uiDokumentacijaZaNadmetanjeCtl$uiOpenDocumentDoc_7&quot;,&quot;AL&quot;)">Shqip</a>
<a href="javascript:__doPostBack(&quot;uiDokumentPodaci$uiDokumentacijaZaNadmetanjeCtl$uiOpenDocumentDoc_8&quot;,&quot;EN&quot;)">English</a>
<a href="javascript:__doPostBack(&quot;uiDokumentPodaci$uiDocumentCtl$uiOpenDocumentPdf_9&quot;,&quot;AL&quot;)">Shqip</a>
</form></body></html>`;
const secondary=extractKrppDossier(krppSecondaryHtml,krppDetail);
assert.equal(secondary.form_state.fields.__VIEWSTATE,'STATE-2','Second-step KRPP page must expose the updated WebForms state');
assert(secondary.postbacks.some(x=>x.event_target.endsWith('uiOpenDocumentDoc_7')&&x.event_argument==='AL'),'Second-step KRPP dossier-language action must be captured');
assert(secondary.postbacks.some(x=>x.event_target.endsWith('uiOpenDocumentPdf_9')),'Second-step numeric language suffixes must remain allowlisted');
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
assert(edge.includes("const VERSION='v8'"),'KRPP two-step WebForms download fix must advance the analysis generation');
assert(edge.includes('fetchKrppActionFiles')&&edge.includes("application/x-www-form-urlencoded")&&edge.includes("__EVENTTARGET")&&edge.includes("__EVENTARGUMENT"),'KRPP bundle must execute exact ASP.NET postbacks with captured form state and argument');
assert(edge.includes("depth<2")&&edge.includes('extractKrppDossier(html,current)')&&edge.includes('krppChildActions'),'KRPP HTML response must be reparsed with its updated WebForms state and followed through a bounded second step');
assert(edge.includes('MAX_KRPP_SECONDARY_ACTIONS'),'KRPP secondary action traversal must stay bounded');
assert(edge.includes("action?.kind==='krpp_submit'")&&edge.includes('submit_name')&&edge.includes("submitName+'.x'"),'KRPP bundle must support named WebForms submit/image controls as well as postbacks');
assert(edge.includes('document_response_was_html')&&edge.includes('krpp_action_returned_html'),'Downloader must reject HTML/login/navigation responses instead of packaging them as tender files');
assert(edge.includes('fetchOfficialHtml(listingUrl)')&&edge.includes('seedCookies'),'KRPP download must warm the public listing session before opening the tender detail');
assert(edge.includes('extractKrppIntermediateDownloadUrl')&&edge.includes('fetchOfficialBinary(next,cookies,current)'),'KRPP action HTML must inspect only an official intermediate download URL and preserve the referer');
assert(edge.includes("kind:'script'")&&edge.includes("kind:'href'"),'Intermediate download parsing must distinguish explicit script navigation from ordinary anchors');
assert(!edge.includes("/[\"']([^\"']*(?:download|dokument|document|attachment|file)[^\"']*)[\"']/gi"),'Downloader must not treat arbitrary quoted document/file strings as download URLs');
assert(edge.includes("document_response_was_html:'+krppHtmlDiagnostic(html)"),'Secondary HTML responses must expose bounded diagnostic context instead of a generic failure');
assert(edge.includes('krppHtmlDiagnostic'),'KRPP HTML fallback must retain bounded diagnostic context for the next live failure');
assert(edge.includes('MAX_BUNDLE_BYTES')&&edge.includes('officialUrl(loc,current)'),'Dossier bundle must preserve size and redirect allowlist boundaries');
assert(edge.includes('SUPABASE_SERVICE_ROLE_KEY'),'Purpose-limited persistence path is missing');
assert(!/gmail\.googleapis\.com|sendgrid\.com|api\.mailgun|\/rest\/v1\/(?:purchase_orders|contracts|client_offers)/i.test(edge),'Tender analysis must not contain external/binding action endpoints');
assert(finalizer.includes('data-pst-tender-dossier-analysis-v3'),'Finalizer does not load the current dossier analysis runtime');
console.log('Tender dossier parser + security + runtime smoke test passed.');

assert(frontend.includes('Kushtet teknike')&&frontend.includes('Kushtet komerciale'),'Primary dossier view must expose technical and commercial conditions');
