const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const src=fs.readFileSync('pristeel-project-commercial-simplified-v1.js','utf8');
assert.ok(!/supaFetch\s*\(/.test(src),'simplified Commercial layer must not write/read business data directly');
assert.ok(!/gmail\.googleapis\.com/.test(src),'simplified Commercial layer must not send/create email itself');
assert.ok(/Ofertat e furnitorëve/.test(src),'supplier offers must be the central Commercial surface');
assert.ok(/Krijo revision/.test(src),'sent client offers must expose a direct revision action');
assert.ok(/Analizë e avancuar/.test(src),'advanced analysis must be collapsed behind an explicit disclosure');
assert.ok(/Këshilltari i çmimit/.test(src),'price advisor must be treated as optional advanced tooling');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="pf2-on"><div class="pst-pi-tabs"><button data-pf2-tab="overview"></button><button class="on" data-pf2-tab="commercial">Komercialja</button></div><div id="pst-pi-body"></div></div>
<div id="page-oferta"><section class="card" id="advisor"><b>KËSHILLTARI I ÇMIMIT</b><button>Analizo çmimin</button></section></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley'},supplierOffers:[
 {supplier:'Eurosteel',currency:'EUR',price_kg:1.85,total_eur:73155.21,positions:[{key:'install',desc:'Montim',qty:25828.74,unit:'kg',price_neg:.40,scope:'full_installation'}]},
 {supplier:'Sector Construction',currency:'EUR',price_kg:1.80,total_eur:65000,positions:[{key:'install',desc:'Asistencë',qty:1,unit:'ls',price_neg:.30,scope:'assistance_only',persons:3,days:10}]}
],ourOffers:[{doc_nr:'PST-OFF-2026-08-025',total_eur:80916.34,created_at:'2026-08-19T15:17:40Z',followup_status:'open',offer_state:{pst_document_status:'sent',pst_sent_at:'2026-08-21T05:53:29Z',oferPos:[{desc:'Čelična konstrukcija',qty:25828.74,unit:'kg',price:1.95}]}}]};
w.eval(src);
w.PSTProjectCommercialSimplifiedV1.render();
const root=w.document.querySelector('[data-pst-csf="1"]');
assert.ok(root,'simplified Commercial surface should render');
assert.ok(root.textContent.indexOf('Ofertat e furnitorëve')>=0,'supplier offers should be visible prominently');
assert.strictEqual(root.querySelectorAll('.pst-csf-supplier').length,2,'all supplier offers should be visible as cards');
assert.strictEqual(root.querySelector('.pst-csf-next [data-csf-action]').getAttribute('data-csf-action'),'revision','sent offer must route directly to revision');
assert.strictEqual(w.PSTProjectCommercialSimplifiedV1._test.offerSent(w.__pstIntegrityLastData.ourOffers[0]),true,'pst_document_status/pst_sent_at must count as sent proof');
assert.ok(root.querySelector('.pst-csf-advanced')&&!root.querySelector('.pst-csf-advanced').open,'advanced comparison should be collapsed by default');

let leaked=0;w.document.addEventListener('click',()=>{leaked++;},true);
const detail=root.querySelector('[data-csf-detail="1"]');
detail.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
assert.strictEqual(root.querySelector('[data-csf-detail-panel="1"]').hidden,false,'supplier detail should expand inline');
assert.strictEqual(leaked,0,'supplier detail click must be hard-stopped before legacy document handlers can navigate');

w.PSTProjectCommercialSimplifiedV1.simplifyOfferEditor();
assert.strictEqual(w.document.getElementById('advisor').style.display,'none','price advisor should be collapsed by default');
assert.ok(w.document.querySelector('.pst-csf-advisor-toggle'),'optional advisor toggle should be available');
console.log('Project Commercial simplified smoke test passed.');
dom.window.close();
