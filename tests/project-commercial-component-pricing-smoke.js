const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const code=fs.readFileSync('pristeel-project-commercial-component-pricing-v1.js','utf8');
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
  w.oferPos=[];
  if(pr>0&&kg>0)w.oferPos.push({desc:'Čelična konstrukcija',qty:kg,unit:'kg',price:pr});
  if(zn>0&&kg>0)w.oferPos.push({desc:'Cinkovanje',qty:kg,unit:'kg',price:zn});
};
w.collectOfferFormState=function(){return{pr:w.document.getElementById('of-pr').value,kg:w.document.getElementById('of-kg').value,zn:w.document.getElementById('of-zn').value,oferPos:JSON.parse(JSON.stringify(w.oferPos))};};
w.applyOfferFormState=function(){};
w.saveOfferState=function(){};w.genOfer=function(){};w.printOfer=function(){};w.ofertaStartNewDraft=function(){};
w.eval(code);

assert(w.PSTProjectCommercialComponentPricingV1.inject(),'component pricing panel should inject');
const d=w.document;
d.getElementById('pst-sale-base').value='1.97';
d.getElementById('pst-sale-zinc').value='0.44';
d.getElementById('pst-sale-coat').value='0.58';
w.PSTProjectCommercialComponentPricingV1.sync();
assert.strictEqual(d.getElementById('of-pr').value,'1.97');
assert.strictEqual(d.getElementById('of-zn').value,'0.44');
assert.strictEqual(d.getElementById('pst-of-coat').value,'0.58');
assert(d.getElementById('pst-diff-base').textContent.includes('+0,12'),'base uplift should be +0.12 EUR/kg');
assert(d.getElementById('pst-diff-zinc').textContent.includes('+0,02'),'zinc uplift should be +0.02 EUR/kg');
assert(d.getElementById('pst-diff-coat').textContent.includes('+0,02'),'coating uplift should be +0.02 EUR/kg');

w.buildOferPosFromQuick();
assert.strictEqual(w.oferPos.length,3,'quick positions should include base, zinc and coating');
assert.strictEqual(w.oferPos[0].price,1.97);
assert.strictEqual(w.oferPos[1].price,0.44);
assert.strictEqual(w.oferPos[2].price,0.58);
assert(/powder coating/i.test(w.oferPos[2].desc),'coating should be a distinct selling position');

const st=w.collectOfferFormState();
assert.strictEqual(st.coat,'0.58','coating selling price must persist in offer state');
assert.strictEqual(st.componentPricing.base,'1.97');
assert.strictEqual(st.componentPricing.zinc,'0.44');
assert.strictEqual(st.componentPricing.coat,'0.58');

dom.window.close();
console.log('Project commercial component pricing smoke test passed.');
