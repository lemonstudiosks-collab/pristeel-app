const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const src=fs.readFileSync('pristeel-project-first-commercial-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"></div></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.__pstIntegrityLastData={supplierOffers:[{
  supplier:'Sector Construction',currency:'EUR',price_kg:1.85,zinc_kg:0.42,qty_kg:25828.74,
  total_eur:65085.71,total_amount:65085.71,transport_eur:1800,
  positions:[
    {key:'base',qty:25828.74,unit:'kg',price_neg:1.85,total_neg:47783.17,desc:'Material + fabrikim konstruksioni sipas vizatimeve'},
    {key:'zinc',qty:25828.74,unit:'kg',price_neg:0.42,total_neg:10848.07,desc:'Galvanizim / zinkim i struktures'},
    {key:'coat',qty:8311.55,unit:'kg',price_neg:0.56,total_neg:4654.47,desc:'Powder coating vetem per POS 1,2,3,4,5,10,11,26,27,28,31,32,36,37,39,40'},
    {key:'transport',qty:2,unit:'kamion',price_neg:900,total_neg:1800,desc:'Transport'}
  ],
  raw_text:'1.85 €/kg pa TVSH. Zinktimi 0.42 €/kg pa TVSH. Powder Coating 0.56 €/kg pa TVSH. TVSH e zinktimit dhe ngjyres paguhet.',
  inclusions:'Material + fabrikim; galvanizim; powder coating per 8,311.55 kg; transport 2 kamiona.',
  exclusions:'Montimi nuk perfshihet.'
}]};
w.eval(src);
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coating(w.__pstIntegrityLastData.supplierOffers[0]),0.56,'Powder coating must be read from structured positions');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coatingQty(w.__pstIntegrityLastData.supplierOffers[0]),8311.55,'Coating scope quantity must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.transport(w.__pstIntegrityLastData.supplierOffers[0]),1800,'Transport must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.vat(w.__pstIntegrityLastData.supplierOffers[0]),'Sipas komponentit','Mixed VAT conditions must not be flattened to Pa TVSH');
assert(w.PSTProjectFirstCommercialV1.inject(),'Commercial comparison should inject');
const txt=w.document.getElementById('pst-pi-body').textContent;
assert(txt.includes('0,56 EUR/kg'),'Comparison must show powder coating rate');
assert(txt.includes('8.311,55 kg'),'Comparison must show coating scope quantity');
assert(txt.includes('1.800,00 EUR'),'Comparison must show transport');
assert(txt.includes('65.085,71 EUR'),'Comparison must show total');
const btn=w.document.querySelector('[data-pf2-offer-detail="0"]');
const row=w.document.querySelector('[data-pf2-offer-detail-row="0"]');
assert(btn&&row&&row.hidden,'Supplier details must exist collapsed');
btn.click();
assert(!row.hidden,'Supplier details must open');
const details=row.textContent;
assert(details.includes('47.783,17 EUR'),'Breakdown must show base subtotal');
assert(details.includes('10.848,07 EUR'),'Breakdown must show zinc subtotal');
assert(details.includes('4.654,47 EUR'),'Breakdown must show coating subtotal');
assert(details.includes('1.800,00 EUR'),'Breakdown must show transport subtotal');
console.log('Project commercial breakdown smoke test passed.');
dom.window.close();
