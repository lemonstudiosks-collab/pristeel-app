const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const src=fs.readFileSync('pristeel-project-first-commercial-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"></div></div></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
const sector={
  supplier:'Sector Construction',currency:'EUR',price_kg:1.85,zinc_kg:0.42,qty_kg:25828.74,
  total_eur:72834.33,total_amount:72834.33,transport_eur:1800,
  positions:[
    {key:'base',qty:25828.74,unit:'kg',price_neg:1.85,total_neg:47783.17,desc:'Material + fabrikim konstruksioni sipas vizatimeve'},
    {key:'zinc',qty:25828.74,unit:'kg',price_neg:0.42,total_neg:10848.07,desc:'Galvanizim / zinkim i struktures'},
    {key:'coat',qty:8311.55,unit:'kg',price_neg:0.56,total_neg:4654.47,desc:'Powder coating vetem per POS 1,2,3,4,5,10,11,26,27,28,31,32,36,37,39,40'},
    {key:'install',qty:25828.74,unit:'kg',price_neg:0.30,total_neg:7748.62,scope:'assistance_only',persons:3,days:10,desc:'Asistence ne montim - 3 persona per 10 dite'},
    {key:'transport',qty:2,unit:'kamion',price_neg:900,total_neg:1800,desc:'Transport'}
  ],
  raw_text:'1.85 €/kg pa TVSH. Zinktimi 0.42 €/kg pa TVSH. Powder Coating 0.56 €/kg pa TVSH. TVSH e zinktimit dhe ngjyres paguhet.',
  inclusions:'Material + fabrikim; galvanizim; powder coating per 8,311.55 kg; asistence montimi 3 persona/10 dite; transport 2 kamiona.',
  exclusions:'Montimi i plote nuk eshte konfirmuar.'
};
const eurosteel={
  supplier:'Eurosteel',currency:'EUR',price_kg:1.85,zinc_kg:0.40,qty_kg:25828.74,
  total_eur:73155.21,total_amount:73155.21,transport_eur:1800,
  positions:[
    {key:'base',qty:25828.74,unit:'kg',price_neg:1.85,total_neg:47783.17},
    {key:'zinc',qty:25828.74,unit:'kg',price_neg:0.40,total_neg:10331.50},
    {key:'coat',qty:8311.55,unit:'kg',price_neg:0.35,total_neg:2909.04},
    {key:'install',qty:25828.74,unit:'kg',price_neg:0.40,total_neg:10331.50,scope:'installation_unverified',desc:'Montim'},
    {key:'transport',qty:2,unit:'kamion',price_neg:900,total_neg:1800}
  ]
};
w.__pstIntegrityLastData={supplierOffers:[sector,eurosteel],ourOffers:[]};
w.eval(src);
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coating(sector),0.56,'Powder coating must be read from structured positions');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coatingQty(sector),8311.55,'Coating scope quantity must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.transport(sector),1800,'Transport must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.installation(sector),0.30,'Sector installation assistance rate must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.installation(eurosteel),0.40,'Eurosteel installation rate must be visible');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.installScope(sector),'Asistencë 3 persona / 10 ditë','Sector assistance scope must remain explicit');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.installScope(eurosteel),'Montim · scope për verifikim','Unverified installation scope must remain explicit');
assert.strictEqual(w.PSTProjectFirstCommercialV1._test.vat(sector),'Sipas komponentit','Mixed VAT conditions must not be flattened to Pa TVSH');
assert(w.PSTProjectFirstCommercialV1.inject(),'Commercial comparison should inject');
const txt=w.document.getElementById('pst-pi-body').textContent.replace(/\s+/g,' ');
assert(txt.includes('0,56 EUR/kg'),'Comparison must show Sector coating rate');
assert(txt.includes('0,35 EUR/kg'),'Comparison must show Eurosteel coating rate');
assert(txt.includes('8.311,55 kg'),'Comparison must show coating scope quantity');
assert(txt.includes('0,30 EUR/kg'),'Comparison must show Sector installation rate');
assert(txt.includes('Asistencë 3 persona / 10 ditë'),'Comparison must show Sector assistance scope');
assert(txt.includes('0,40 EUR/kg'),'Comparison must show Eurosteel installation rate');
assert(txt.includes('Montim · scope për verifikim'),'Comparison must show Eurosteel scope warning');
assert(txt.includes('HUMAN GATE · SCOPE TË NDRYSHME'),'Different installation scopes must create an explicit human gate');
assert(txt.includes('1.800,00 EUR'),'Comparison must show transport');
assert(txt.includes('72.834,33 EUR'),'Comparison must show Sector total');
assert(txt.includes('73.155,21 EUR'),'Comparison must show Eurosteel total');
const btn=w.document.querySelector('[data-pf2-offer-detail="0"]');
const row=w.document.querySelector('[data-pf2-offer-detail-row="0"]');
assert(btn&&row&&row.hidden,'Supplier details must exist collapsed');
btn.click();
assert(!row.hidden,'Supplier details must open');
const details=row.textContent;
assert(details.includes('47.783,17 EUR'),'Breakdown must show base subtotal');
assert(details.includes('10.848,07 EUR'),'Breakdown must show zinc subtotal');
assert(details.includes('4.654,47 EUR'),'Breakdown must show coating subtotal');
assert(details.includes('7.748,62 EUR'),'Breakdown must show installation assistance subtotal');
assert(details.includes('1.800,00 EUR'),'Breakdown must show transport subtotal');
console.log('Project commercial breakdown and installation scope smoke test passed.');
dom.window.close();
