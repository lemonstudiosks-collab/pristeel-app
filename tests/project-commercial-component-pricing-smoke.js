const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const code=fs.readFileSync('pristeel-project-commercial-component-pricing-v1.js','utf8');
const preserveCode=fs.readFileSync('pristeel-offer-position-preservation-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-oferta" style="display:block">
  <div id="price-advisor"></div>
  <div id="pst-project-cost-basis">
    <strong data-base>1,85 EUR/kg</strong>
    <strong data-zinc>0,42 EUR/kg</strong>
    <strong data-coat>0,56 EUR/kg</strong>
  </div>
  <input id="of-pr" value=""><input id="of-kg" value="1000"><input id="of-zn" value=""><input id="of-tr" value="0">
  <select id="of-lang"><option value="sr" selected>Srpski</option></select>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
const w=dom.window;
w.oferPos=[];
w.renderOferPos=function(){};
w.buildOferPosFromQuick=function(){
  const pr=parseFloat(w.document.getElementById('of-pr').value)||0;
  const kg=parseFloat(w.document.getElementById('of-kg').value)||0;
  const zn=parseFloat(w.document.getElementById('of-zn').value)||0;
  const tr=parseFloat(w.document.getElementById('of-tr').value)||0;
  w.oferPos=[];
  if(pr>0&&kg>0)w.oferPos.push({desc:'Čelična konstrukcija',qty:kg,unit:'kg',price:pr});
  if(zn>0&&kg>0)w.oferPos.push({desc:'Cinkovanje',qty:kg,unit:'kg',price:zn});
  if(tr>0)w.oferPos.push({desc:'Transport',qty:1,unit:'ls',price:tr});
};
w.addOferPos=function(d){w.oferPos.push(d||{desc:'',qty:0,unit:'kg',price:0});};
w.updOferPos=function(i,f,v){const p=w.oferPos[i];if(!p)return;if(f==='desc'||f==='unit')p[f]=v;else p[f]=parseFloat(v)||0;};
w.remOferPos=function(i){w.oferPos.splice(i,1);};
w.collectOfferFormState=function(){return{pr:w.document.getElementById('of-pr').value,kg:w.document.getElementById('of-kg').value,zn:w.document.getElementById('of-zn').value,tr:w.document.getElementById('of-tr').value,oferPos:JSON.parse(JSON.stringify(w.oferPos))};};
w.applyOfferFormState=function(st){w.oferPos=JSON.parse(JSON.stringify(st&&st.oferPos||[]));};
w.saveOfferState=function(){};w.genOfer=function(){};w.printOfer=function(){};w.ofertaStartNewDraft=function(){w.oferPos=[];};
w.eval(code);
w.eval(preserveCode);

assert(w.PSTProjectCommercialComponentPricingV1.inject(),'component pricing panel should inject');
const d=w.document;
d.getElementById('pst-sale-base').value='1.97';
d.getElementById('pst-sale-zinc').value='0.44';
d.getElementById('pst-sale-coat').value='0.58';
d.getElementById('pst-cost-transport-input').value='600';
d.getElementById('pst-sale-transport').value='750';
d.getElementById('pst-install-unit').value='kg';
d.getElementById('pst-cost-install-input').value='0.18';
d.getElementById('pst-sale-install').value='0.22';
w.PSTProjectCommercialComponentPricingV1.sync();
assert.strictEqual(d.getElementById('of-pr').value,'1.97');
assert.strictEqual(d.getElementById('of-zn').value,'0.44');
assert.strictEqual(d.getElementById('of-tr').value,'750');
assert.strictEqual(d.getElementById('pst-of-coat').value,'0.58');
assert.strictEqual(d.getElementById('pst-of-install').value,'0.22');
assert(d.getElementById('pst-diff-base').textContent.includes('+0,12'),'base uplift should be +0.12 EUR/kg');
assert(d.getElementById('pst-diff-zinc').textContent.includes('+0,02'),'zinc uplift should be +0.02 EUR/kg');
assert(d.getElementById('pst-diff-coat').textContent.includes('+0,02'),'coating uplift should be +0.02 EUR/kg');
assert(d.getElementById('pst-diff-transport').textContent.includes('+150,00'),'transport uplift should be +150 EUR total');
assert(d.getElementById('pst-diff-install').textContent.includes('+0,04'),'installation uplift should be +0.04 EUR/kg');

w.buildOferPosFromQuick();
assert.strictEqual(w.oferPos.length,5,'quick positions should include base, zinc, coating, transport and installation');
assert.strictEqual(w.oferPos[0].price,1.97);
assert.strictEqual(w.oferPos[1].price,0.44);
assert.strictEqual(w.oferPos[2].price,0.58);
assert(/powder coating/i.test(w.oferPos[2].desc),'coating should be before transport');
assert.strictEqual(w.oferPos[3].price,750);
assert(/transport/i.test(w.oferPos[3].desc),'transport should remain a distinct total position');
assert.strictEqual(w.oferPos[4].price,0.22);
assert(/montaž/i.test(w.oferPos[4].desc),'installation should be a distinct selling position');
assert.strictEqual(w.oferPos[4].unit,'kg');

// Manual rows must append and survive any later refresh from pricing.
w.addOferPos({desc:'Ankera speciale',qty:20,unit:'pc',price:8});
assert.strictEqual(w.oferPos.length,6);
w.buildOferPosFromQuick();
assert.strictEqual(w.oferPos.length,6,'pricing refresh must not delete a manually added position');
assert(w.oferPos.some(p=>p.desc==='Ankera speciale'),'manual position must remain active');

// BOM/imported rows are source rows too and must survive pricing refresh.
w.oferPos.push({desc:'IPE 200 S355',qty:500,unit:'kg',price:0,spec:{kind:'ih',profile:'IPE',dim:'200'}});
w.buildOferPosFromQuick();
assert.strictEqual(w.oferPos.length,7,'BOM/imported position must be appended, not replaced');
assert(w.oferPos.some(p=>p.spec&&p.spec.profile==='IPE'),'BOM source position must remain');

// Editing an imported/pricing row turns it into an explicit human override.
let baseIdx=w.oferPos.findIndex(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='base');
w.updOferPos(baseIdx,'price','2.05');
w.buildOferPosFromQuick();
baseIdx=w.oferPos.findIndex(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='base');
assert.strictEqual(w.oferPos[baseIdx].price,2.05,'manual edit of a pricing position must survive refresh');
assert.strictEqual(w.oferPos.filter(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='base').length,1,'manual override must not create a duplicate base row');

// Explicit delete is the only way a standard row disappears, and it must not auto-return.
let zincIdx=w.oferPos.findIndex(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='zinc');
w.remOferPos(zincIdx);
w.buildOferPosFromQuick();
assert.strictEqual(w.oferPos.some(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='zinc'),false,'manually deleted zinc row must not be recreated automatically');
assert(w.PSTOfferPositionPreservationV1.removed().includes('zinc'),'manual delete tombstone should be tracked');

const st=w.collectOfferFormState();
assert.strictEqual(st.coat,'0.58','coating selling price must persist in offer state');
assert.strictEqual(st.installation,'0.22','installation selling price must persist in offer state');
assert.strictEqual(st.transportCost,'600','transport cost must persist in offer state');
assert.strictEqual(st.installationCost,'0.18','installation cost must persist in offer state');
assert.strictEqual(st.componentPricing.base,'1.97');
assert.strictEqual(st.componentPricing.zinc,'0.44');
assert.strictEqual(st.componentPricing.coat,'0.58');
assert.strictEqual(st.componentPricing.transportSale,'750');
assert.strictEqual(st.componentPricing.installationSale,'0.22');
assert.strictEqual(st.componentPricing.installationUnit,'kg');
assert(st.positionPreservation.removedKeys.includes('zinc'),'manual delete decision must persist with the draft');

// Reopening a saved draft preserves both rows and manual-delete decisions.
w.applyOfferFormState(st);
w.buildOferPosFromQuick();
assert(w.oferPos.some(p=>p.desc==='Ankera speciale'),'manual position must survive draft reload');
assert(w.oferPos.some(p=>p.spec&&p.spec.profile==='IPE'),'BOM position must survive draft reload');
assert.strictEqual(w.oferPos.some(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='zinc'),false,'deleted standard row must stay deleted after draft reload');

// Installation can be switched to lump sum without disturbing the other rows.
d.getElementById('pst-install-unit').value='ls';
d.getElementById('pst-cost-install-input').value='1800';
d.getElementById('pst-sale-install').value='2200';
w.PSTProjectCommercialComponentPricingV1.sync();
w.buildOferPosFromQuick();
const installRow=w.oferPos.find(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='install');
assert.strictEqual(installRow.unit,'ls','installation can also be quoted as a lump sum');
assert.strictEqual(installRow.qty,1);
assert.strictEqual(installRow.price,2200);
assert(w.oferPos.some(p=>p.desc==='Ankera speciale'),'changing installation unit must not erase manual rows');

// A genuinely new draft resets deletion decisions from the prior draft.
w.ofertaStartNewDraft();
w.buildOferPosFromQuick();
assert(w.oferPos.some(p=>w.PSTOfferPositionPreservationV1.inferKey(p)==='zinc'),'new draft resets prior deletion decisions');

dom.window.close();
console.log('Project commercial component pricing and position preservation smoke test passed.');
