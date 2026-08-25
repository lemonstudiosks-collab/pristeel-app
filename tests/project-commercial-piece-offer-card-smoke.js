const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const resave=fs.readFileSync('pristeel-offer-resave-fix-v1.js','utf8');
const simplified=fs.readFileSync('pristeel-project-commercial-simplified-v1.js','utf8');
const bridge=fs.readFileSync('pristeel-offer-revision-email-bridge-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="page pf2-on active" style="display:block"><div class="pst-pi-tabs"><button class="on" data-pf2-tab="commercial">Komercialja</button></div><div id="pst-pi-body"></div></div>
<div id="page-oferta" class="page" style="display:none">
 <input id="of-nr" />
 <div id="of-preview-col">
  <div id="of-preview-toolbar" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
   <div class="section-title">Angebot — Entwurf zur Prüfung</div>
   <div>
    <button onclick="ofBackToEdit()">← Kthehu / Edito</button>
    <button onclick="copyOferte()">Kopjo</button>
    <button onclick="downloadPDF()">PDF</button>
    <button onclick="saveCurrentOffer()">Ruaj</button>
   </div>
  </div>
  <div id="of-pre"></div>
 </div>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
let editorOpened=0,rowsRendered=0,offerGenerated=0;
w.__pstWorkspaceLegacy={showPage:(name)=>{if(name==='oferta')editorOpened++;w.document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));const p=w.document.getElementById('page-'+name);if(p)p.classList.add('active');}};
w.oferPos=[];
w.renderOferPos=()=>{rowsRendered++;};
w.genOfer=()=>{offerGenerated++;};
w.scrollTo=()=>{};
w.registerDocNr=function(){};
w.__pstIntegrityLastData={supplierOffers:[{
 supplier:'Sector Construction',currency:'EUR',pricing_unit:'pc',vat_pct:18,total_eur:null,
 inclusions:'Steel material; fabrication; hot-dip galvanizing; pole erection/installation',
 positions:[
  {key:'pole_6m',qty:1,unit:'pc',desc:'Shtyllë sirene 6 m',price_neg:686.44,total_neg:686.44,price_gross:810,vat_pct:18,main_chs:{od_mm:244.5,t_mm:6,length_mm:6000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}},
  {key:'pole_9m',qty:1,unit:'pc',desc:'Shtyllë sirene 9 m',price_neg:1144.07,total_neg:1144.07,price_gross:1350,vat_pct:18,main_chs:{od_mm:273,t_mm:6.3,length_mm:9000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}},
  {key:'pole_12m',qty:1,unit:'pc',desc:'Shtyllë sirene 12 m',price_neg:2245.76,total_neg:2245.76,price_gross:2650,vat_pct:18,main_chs:{od_mm:323.9,t_mm:8,length_mm:12000},top_spigot:{od_mm:88.9,t_mm:4,length_mm:1500}}
 ]
}],ourOffers:[]};

// Production order: offer-resave is loaded fresh before bootstrap and before Commercial.
w.eval(resave);
w.eval(simplified);
w.eval(bridge);
w.PSTProjectCommercialSimplifiedV1.render();
w.PSTOfferRevisionEmailBridgeV1.wrapCommercialRender();
w.PSTOfferRevisionEmailBridgeV1.decoratePieceOfferCards();

const card=w.document.querySelector('.pst-csf-supplier');
assert.ok(card,'supplier card should render');
assert.equal(card.getAttribute('data-pst-piece-offer'),'1','per-piece offer should be decorated');
assert.equal(card.querySelector('header>b').textContent,'3 çmime / copë');
const text=card.querySelector('.pst-csf-kvs').textContent.replace(/\s+/g,' ');
assert.ok(text.includes('6 m')&&text.includes('224,31 kg')&&text.includes('686,44 EUR/pc net')&&text.includes('3,060 EUR/kg net'));
assert.ok(text.includes('9 m')&&text.includes('385,49 kg')&&text.includes('1.144,07 EUR/pc net')&&text.includes('2,968 EUR/kg net'));
assert.ok(text.includes('12 m')&&text.includes('760,46 kg')&&text.includes('2.245,76 EUR/pc net')&&text.includes('2,953 EUR/kg net'));
assert.ok(text.includes('810,00 EUR/pc bruto')&&text.includes('3,611 EUR/kg bruto'));
assert.ok(text.includes('TVSH')&&text.includes('18%'));
assert.ok(text.toLowerCase().includes('zinkim + montim'));
assert.ok(text.includes('Ø244,5×6')&&text.includes('Ø88,9×4'));
assert.equal(w.PSTOfferRevisionEmailBridgeV1._test.piecePositions(w.__pstIntegrityLastData.supplierOffers[0]).length,3);
assert.ok(Math.abs(w.PSTOfferRevisionEmailBridgeV1._test.pieceWeight(w.__pstIntegrityLastData.supplierOffers[0].positions[0])-224.306)<0.02);
assert.ok(Math.abs(w.PSTOfferRevisionEmailBridgeV1._test.pieceNetKg(w.__pstIntegrityLastData.supplierOffers[0].positions[0])-3.0603)<0.001);

w.__pstIntegrityLastData.ourOffers=[{
 id:'ssp-ewas-draft',supplier:'OFERTA JONE - PRISTEEL -> SSP / Fiva Investment',offer_ref:'PRISTEEL / EWAS / 25.08.2026 / DRAFT',currency:'EUR',vat_pct:18,created_at:'2026-08-25T10:50:20Z',positions:[
  {key:'pole_6m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 6 m siren pole',unit_price_net_eur:823.73,unit_price_gross_eur:972,theoretical_steel_weight_kg:224.31,our_net_eur_per_kg:3.672,our_gross_eur_per_kg:4.333},
  {key:'pole_9m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 9 m siren pole',unit_price_net_eur:1315.68,unit_price_gross_eur:1552.50,theoretical_steel_weight_kg:385.49,our_net_eur_per_kg:3.413,our_gross_eur_per_kg:4.027},
  {key:'pole_12m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 12 m siren pole',unit_price_net_eur:2470.34,unit_price_gross_eur:2915,theoretical_steel_weight_kg:760.46,our_net_eur_per_kg:3.248,our_gross_eur_per_kg:3.833},
  {key:'transport',qty:null,unit:'truck',description:'Transport to site',unit_price_net_eur:250,unit_price_gross_eur:295},
  {key:'crane',qty:null,unit:'day',description:'Mobile crane',unit_price_net_eur:500,unit_price_gross_eur:590}
 ]
}];
// Simulate the stale pointer seen in production. It must not hide the real structured draft.
w.__pstIntegrityLastData.currentOurOffer={offer_ref:'STALE EMPTY POINTER',created_at:'2026-08-25T11:00:00Z'};
w.PSTProjectCommercialSimplifiedV1.render();
w.PSTOfferRevisionEmailBridgeV1.decorateClientOfferCard();
const client=w.document.querySelector('.pst-csf-client');
assert.ok(client,'structured client offer should render');
assert.equal(client.getAttribute('data-pst-structured-client-offer'),'1');
assert.ok(client.querySelector('h3').textContent.includes('PRISTEEL / EWAS'));
assert.ok(client.querySelector('p').textContent.includes('5 pozicione'));
const clientText=client.querySelector('[data-csf-detail-panel="client"]').textContent.replace(/\s+/g,' ');
assert.ok(clientText.includes('224,31 kg')&&clientText.includes('823,73 EUR/pc net')&&clientText.includes('3,672 EUR/kg net'));
assert.ok(clientText.includes('385,49 kg')&&clientText.includes('1.315,68 EUR/pc net'));
assert.ok(clientText.includes('760,46 kg')&&clientText.includes('2.470,34 EUR/pc net'));
const editorRows=w.PSTOfferRevisionEmailBridgeV1._test.structuredEditorRows(w.__pstIntegrityLastData.ourOffers[0]);
assert.equal(editorRows.length,5);assert.equal(editorRows[0].price,823.73);assert.equal(editorRows[0].qty,'');

// Exact live regression: modern Workspace hides all non-active pages with inline display:none.
// The captured legacy showPage only toggles active classes, so the offer page used to remain invisible.
let staleCommercialRan=false;
w.addEventListener('click',function(ev){
 const b=ev.target&&ev.target.closest?ev.target.closest('[data-csf-action="edit"]'):null;
 if(!b)return;
 staleCommercialRan=true;
 ev.preventDefault();
 if(typeof ev.stopImmediatePropagation==='function')ev.stopImmediatePropagation();
},true);
const rawLiveButton=w.document.createElement('button');
rawLiveButton.type='button';
rawLiveButton.setAttribute('data-csf-action','edit');
rawLiveButton.textContent='Vazhdo editimin';
w.document.body.appendChild(rawLiveButton);
editorOpened=0;rowsRendered=0;offerGenerated=0;w.oferPos.length=0;
const realSetTimeout=w.setTimeout;
w.setTimeout=(fn)=>{fn();return 1;};
rawLiveButton.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
w.setTimeout=realSetTimeout;
assert.equal(staleCommercialRan,false,'stale Commercial handler must never receive structured edit click');
assert.equal(editorOpened,1,'live owner must invoke the legacy offer route exactly once');
assert.equal(w.document.getElementById('page-workspace-project').style.display,'none','Project workspace must be hidden after edit navigation');
assert.equal(w.document.getElementById('page-oferta').style.display,'block','Offer editor must be visibly displayed after legacy navigation');
assert.ok(w.document.getElementById('page-oferta').classList.contains('active'),'Offer editor must own active page state');
assert.equal(w.oferPos.length,5,'live owner must load all structured positions');
assert.equal(w.oferPos[0].price,823.73);
assert.equal(w.oferPos[0].qty,'');
assert.equal(w.document.getElementById('of-nr').value,'PRISTEEL / EWAS / 25.08.2026 / DRAFT');
assert.ok(rowsRendered>0,'editor rows must render');
assert.ok(offerGenerated>0,'offer preview must regenerate');
assert.equal(w.PSTOfferResaveFixV1.bestStructuredOffer().id,'ssp-ewas-draft','fresh module must ignore stale empty pointer');
const toolbar=w.document.getElementById('of-preview-toolbar');
assert.equal(toolbar.style.display,'none','structured offer preview status/action strip must stay hidden');
assert.equal(toolbar.getAttribute('data-pst-structured-preview-toolbar-hidden'),'1','hidden strip must be explicitly marked');
assert.ok(w.document.getElementById('of-pre'),'printable offer preview must remain mounted');
assert.notEqual(w.document.getElementById('of-pre').style.display,'none','printable offer preview must remain visible');

console.log('Project Commercial per-piece supplier and clean visible structured edit smoke test passed.');
dom.window.close();
