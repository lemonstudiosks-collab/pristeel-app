const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const prefill=fs.readFileSync('pristeel-project-commercial-prefill-v1.js','utf8');
  const rescue=fs.readFileSync('pristeel-project-commercial-prefill-rescue-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <button id="open" data-pf2-action="offer">Krijo / edito ofertë</button>
    <div id="page-oferta" class="page">
      <div id="price-advisor"></div>
      <select id="pa-country"><option value="DE" selected>Germany</option><option value="ME">Montenegro</option></select>
      <select id="pa-type"><option value="stahlbau" selected>Konstruksion çeliku</option></select>
      <select id="pa-exc"><option selected>EXC2</option><option>EXC3</option></select>
      <input id="pa-cost" value="2.000">
      <select id="of-lang"><option value="de" selected>DE</option><option value="sr">SR</option></select>
      <input id="of-proj"><input id="of-ref"><input id="of-cli"><input id="of-con"><input id="of-em"><input id="of-adr">
      <input id="of-pr" value="0.000"><input id="of-kg" value="0"><input id="of-zn" value="0.000"><input id="of-tr" value="0.00">
      <select id="of-inc"><option selected>DAP</option><option>DDP</option></select>
      <input id="of-loc"><input id="of-val" value="30">
      <select id="of-pay-preset"><option value="net30" selected>30 Tage netto</option><option value="custom">Custom</option></select>
      <select id="of-cer"><option selected>EN 10204 3.1</option><option>EN 10204 3.2</option></select>
    </div>
    <div id="pst-cdb-choice"><button id="prod" data-m="production">Prodhim</button></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test'});
  const w=dom.window;
  w.oferPos=[];
  w.buildPayPlan=()=>[{pct:100,ev:'net',days:30}];
  w.payPresetChanged=()=>{};
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';
  w.__pstIntegrityLastData={
    project:{id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',status:'aktiv'},
    contacts:[
      {name:'Fadil Rexhaj',company:'Sector Construction',email:'sector.construction20@gmail.com'},
      {name:'Aleksandar Cinge',company:'Italian Style d.o.o.',email:'aleksandarcinge@gmail.com'}
    ],
    emails:[
      {from_name:'Aleksandar Cinge',from_email:'aleksandarcinge@gmail.com',body_text:'Poštovani Arianite, U prilogu Vam dostavljamo projektnu dokumentaciju i molimo ponudu za izradu i isporuku čelične konstrukcije. S poštovanjem, Aleksandar.'}
    ],
    supplierOffers:[{supplier:'Sector Construction',price_kg:1.85,zinc_kg:0.42,currency:'EUR',notes:'Powder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH'}],
    bom:[]
  };
  w.eval(prefill);
  w.eval(rescue);
  w.document.getElementById('open').click();
  w.document.getElementById('prod').onclick=()=>w.document.getElementById('page-oferta').classList.add('active');
  w.document.getElementById('prod').click();
  await new Promise(r=>setTimeout(r,700));
  assert.strictEqual(w.document.getElementById('of-proj').value,'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA');
  assert.strictEqual(w.document.getElementById('of-cli').value,'ITALIAN STYLE');
  assert.strictEqual(w.document.getElementById('of-con').value,'Aleksandar Cinge');
  assert.strictEqual(w.document.getElementById('of-lang').value,'sr');
  assert.strictEqual(w.document.getElementById('pa-country').value,'ME');
  assert.strictEqual(w.document.getElementById('pa-cost').value,'1.85');
  assert.strictEqual(w.document.getElementById('of-pr').value,'');
  assert.strictEqual(w.document.getElementById('of-inc').value,'');
  assert.strictEqual(w.document.getElementById('pa-exc').value,'');
  assert.strictEqual(w.document.getElementById('of-pay-preset').value,'');
  assert.strictEqual(w.document.getElementById('of-cer').value,'');
  assert(w.document.getElementById('pst-project-cost-basis'),'cost basis panel should be injected in the real click flow');
  dom.window.close();
  console.log('Project commercial prefill rescue smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
