const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const code=fs.readFileSync('pristeel-project-commercial-prefill-v1.js','utf8');
const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-oferta" class="active" style="display:block">
  <div id="price-advisor"></div>
  <select id="pa-country"><option value="DE" selected>Germany</option><option value="ME">Montenegro</option></select>
  <select id="pa-type"><option value="stahlbau" selected>Konstruksion çeliku</option><option value="stahlbau+verzinkt">Çelik + zinktim</option></select>
  <select id="pa-exc"><option selected>EXC2</option><option>EXC3</option><option>EXC4</option></select>
  <input id="pa-cost" value="">
  <select id="of-lang"><option value="de" selected>DE</option><option value="en">EN</option><option value="sq">SQ</option><option value="sr">SR</option></select>
  <input id="of-proj"><input id="of-ref"><input id="of-cli"><input id="of-con"><input id="of-em"><input id="of-adr">
  <input id="of-pr"><input id="of-kg"><input id="of-zn"><input id="of-tr">
  <select id="of-inc"><option selected>DAP</option><option>DDP</option><option>EXW</option></select>
  <input id="of-loc"><input id="of-del"><input id="of-val" value="30">
  <select id="of-pay-preset"><option value="net30" selected>30 Tage netto</option><option value="custom">Custom</option></select>
  <select id="of-cer"><option selected>EN 10204 3.1</option><option>EN 10204 3.2</option></select>
</div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.oferPos=[];
w.buildPayPlan=()=>[{pct:100,ev:'net',days:30}];
w.payPresetChanged=()=>{};
w.__pstCurrentProjectId='p1';
w._curProjId='p1';
w.__pstIntegrityLastData={
  project:{id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',ref:'',status:'aktiv'},
  contacts:[
    {name:'Fadil Rexhaj',company:'Sector Construction',email:'sector.construction20@gmail.com'},
    {name:'Aleksandar Cinge',company:'Italian Style d.o.o.',email:'aleksandarc inge@gmail.com'.replace(' ','')}
  ],
  emails:[
    {from_name:'Aleksandar Cinge',from_email:'aleksandarc inge@gmail.com'.replace(' ',''),body_text:'Poštovani Arianite, U prilogu Vam dostavljamo projektnu dokumentaciju i molimo ponudu za izradu i isporuku čelične konstrukcije. S poštovanjem, Aleksandar.'},
    {from_name:'Sector Construction',from_email:'sector.construction20@gmail.com',body_text:'Po ta jap cmimin ketu ne email. Furnizimi me material dhe punimi.'}
  ],
  supplierOffers:[{supplier:'Sector Construction',price_kg:1.85,zinc_kg:0.42,currency:'EUR',notes:'Powder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH\nTVSH: Pa TVSH'}],
  bom:[],ourOffers:[]
};
w.eval(code);
const api=w.PSTProjectCommercialPrefillV1;
assert(api,'prefill module missing');
assert.strictEqual(api.prefill('p1'),true,'project prefill should apply to a blank new offer');
assert.strictEqual(w.document.getElementById('of-proj').value,'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA');
assert.strictEqual(w.document.getElementById('of-cli').value,'ITALIAN STYLE');
assert.strictEqual(w.document.getElementById('of-con').value,'Aleksandar Cinge');
assert.strictEqual(w.document.getElementById('of-em').value,'aleksandarcinge@gmail.com');
assert.strictEqual(w.document.getElementById('of-lang').value,'sr','buyer email language should be inferred as Serbian');
assert.strictEqual(w.document.getElementById('pa-country').value,'ME','Budva project should suggest Montenegro');
assert.strictEqual(w.document.getElementById('pa-cost').value,'1.85','supplier unit rate should feed cost basis');
assert.strictEqual(w.document.getElementById('of-pr').value,'','supplier cost must never become our selling price');
assert.strictEqual(w.document.getElementById('of-zn').value,'','supplier zinc cost must never become our selling zinc price');
assert.strictEqual(w.document.getElementById('of-inc').value,'','unsupported Incoterm default must be cleared');
assert.strictEqual(w.document.getElementById('pa-exc').value,'','unsupported EXC default must be cleared');
assert.strictEqual(w.document.getElementById('of-pay-preset').value,'','unsupported payment default must be cleared');
assert.strictEqual(w.document.getElementById('of-cer').value,'','unsupported certificate default must be cleared');
assert.strictEqual(w.document.getElementById('of-val').value,'','unsupported validity default must be cleared');
assert.strictEqual(w.document.getElementById('of-loc').value,'Budva, Montenegro');
assert.strictEqual(w.buildPayPlan().length,0,'blank payment selection must not silently fall back to net 30');
const costText=w.document.getElementById('pst-project-cost-basis').textContent.replace(/\s+/g,' ');
assert(costText.includes('Sector Construction'),'cost basis must name supplier');
assert(costText.includes('1,85 EUR/kg'),'cost basis must show base rate');
assert(costText.includes('0,42 EUR/kg'),'cost basis must show zinc rate');
assert(costText.includes('0,56 EUR/kg'),'cost basis must show coating rate');
assert(costText.includes('Pa TVSH'),'cost basis must show supplier VAT note');
console.log('Project commercial prefill smoke test passed.');
dom.window.close();
