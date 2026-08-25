const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const simplified=fs.readFileSync('pristeel-project-commercial-simplified-v1.js','utf8');
const bridge=fs.readFileSync('pristeel-offer-revision-email-bridge-v1.js','utf8');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="pf2-on"><div class="pst-pi-tabs"><button class="on" data-pf2-tab="commercial">Komercialja</button></div><div id="pst-pi-body"></div></div>
<div id="page-oferta"></div><input id="of-nr" />
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.__pstWorkspaceLegacy={showPage:()=>true};
w.oferPos=[];w.renderOferPos=()=>{};w.genOfer=()=>{};
w.__pstIntegrityLastData={supplierOffers:[],ourOffers:[{
 supplier:'OFERTA JONE - PRISTEEL -> SSP / Fiva Investment',offer_ref:'PRISTEEL / EWAS / 25.08.2026 / DRAFT',currency:'EUR',vat_pct:18,total_eur:null,created_at:'2026-08-25T10:50:20Z',positions:[
  {key:'pole_6m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 6 m siren pole',unit_price_net_eur:823.73,unit_price_gross_eur:972,theoretical_steel_weight_kg:224.31,our_net_eur_per_kg:3.672,our_gross_eur_per_kg:4.333},
  {key:'pole_9m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 9 m siren pole',unit_price_net_eur:1315.68,unit_price_gross_eur:1552.50,theoretical_steel_weight_kg:385.49,our_net_eur_per_kg:3.413,our_gross_eur_per_kg:4.027},
  {key:'pole_12m',qty:null,unit:'pc',description:'Supply, hot-dip galvanizing and erection of 12 m siren pole',unit_price_net_eur:2470.34,unit_price_gross_eur:2915,theoretical_steel_weight_kg:760.46,our_net_eur_per_kg:3.248,our_gross_eur_per_kg:3.833},
  {key:'transport',qty:null,unit:'truck',description:'Transport to site',unit_price_net_eur:250,unit_price_gross_eur:295},
  {key:'crane',qty:null,unit:'day',description:'Mobile crane',unit_price_net_eur:500,unit_price_gross_eur:590}
 ]
}]};
w.eval(simplified);w.eval(bridge);
w.PSTProjectCommercialSimplifiedV1.render();
w.PSTOfferRevisionEmailBridgeV1.decorateClientOfferCard();
const card=w.document.querySelector('.pst-csf-client');
assert.ok(card,'client card should render');
assert.equal(card.getAttribute('data-pst-structured-client-offer'),'1');
assert.ok(card.querySelector('h3').textContent.includes('PRISTEEL / EWAS'));
assert.ok(card.querySelector('p').textContent.includes('5 pozicione'));
const detail=card.querySelector('[data-csf-detail-panel="client"]').textContent.replace(/\s+/g,' ');
assert.ok(detail.includes('224,31 kg')&&detail.includes('823,73 EUR/pc net')&&detail.includes('3,672 EUR/kg net'));
assert.ok(detail.includes('385,49 kg')&&detail.includes('1.315,68 EUR/pc net'));
assert.ok(detail.includes('760,46 kg')&&detail.includes('2.470,34 EUR/pc net'));
const rows=w.PSTOfferRevisionEmailBridgeV1._test.structuredEditorRows(w.__pstIntegrityLastData.ourOffers[0]);
assert.equal(rows.length,5);assert.equal(rows[0].price,823.73);assert.equal(rows[0].qty,'');
console.log('Structured client offer smoke test passed.');
dom.window.close();
