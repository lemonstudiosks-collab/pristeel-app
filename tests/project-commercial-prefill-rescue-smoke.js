const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const rescue=fs.readFileSync('pristeel-project-commercial-prefill-rescue-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on"></div>
    <div id="page-oferta" class="page" style="display:block">
      <div>Ende s'ka ofertë të ruajtur për këtë projekt — kjo është një ofertë e re.</div>
      <div id="price-advisor"></div>
      <select id="pa-country"><option value="" selected>— Zgjidh —</option><option value="DE">Germany</option><option value="ME">Montenegro</option></select>
      <select id="pa-type"><option value="stahlbau" selected>Konstruksion çeliku</option></select>
      <select id="pa-exc"><option value="">— Zgjidh —</option><option>EXC2</option><option>EXC3</option></select>
      <input id="pa-cost" value="2.000">
      <select id="of-lang"><option value="" selected>— Zgjidh —</option><option value="de">DE</option><option value="sr">SR</option></select>
      <input id="of-proj" value="Lagerhalle Hamburg"><input id="of-ref" value="ANF-2026-001"><input id="of-cli" value="STACON GmbH"><input id="of-con" value="Herr Muller"><input id="of-em" value="muellerer@stacon.de"><input id="of-adr">
      <input id="of-pr" value="0.000"><input id="of-kg" value="0"><input id="of-zn" value="0.000"><input id="of-tr" value="0.00"><textarea id="of-not"></textarea>
      <select id="of-inc"><option value="" selected>— Zgjidh —</option><option>DAP</option><option>DDP</option></select>
      <input id="of-loc" value="Hamburg"><input id="of-val" value="30"><input id="of-del" value="">
      <select id="of-pay-preset"><option value="" selected>— Zgjidh —</option><option value="net30">30 Tage netto</option><option value="custom">Custom</option></select>
      <select id="of-cer"><option value="" selected>— Zgjidh —</option><option>EN 10204 3.1</option><option>EN 10204 3.2</option></select>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test'});
  const w=dom.window;
  w.oferPos=[{desc:'DEMO',qty:1,unit:'kg',price:1}];
  w.buildPayPlan=()=>[{pct:100,ev:'net',days:30}];
  w.payPresetChanged=()=>{};
  w.renderOferPos=()=>{};
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';
  const data={
    project:{id:'p1',name:'ITALIAN STYLE - Hala - CARINVEST',client:'ITALIAN STYLE',ref:'MARKO JOVANOVIC',status:'pritje',pipeline_stage:'pricing'},
    contacts:[
      {name:'Aleksandar Cingelic',company:'ITALIAN STYLE',email:'aleksandarcinge@gmail.com'},
      {name:'Marko Jovanovic',company:'Italian Style d.o.o.',email:'marko@italianstyle.me'}
    ],
    emails:[{from_name:'Ermal Rula',from_email:'ermalrula@gmail.com',body_text:'U prilogu ponuda za CARINVEST.'}],
    supplierOffers:[{id:'es1',supplier:'Eurosteel',offer_ref:'ES287-08/2026',price_kg:1.80,qty_kg:171100,total_eur:359612.40,currency:'EUR',notes:'REVIEW REQUIRED: transport destination says Budva. Erection quantity does not reconcile.',positions:[
      {description:'Fabrication Road River 1 and 2',qty:151100,unit:'kg',unit_price:1.80,total_eur:271980},
      {description:'Fabrication Vinh Lam 2',qty:20000,unit:'kg',unit_price:1.60,total_eur:32000},
      {description:'HDG bolts and anchors',qty:8500,unit:'kg',unit_price:4.50,total_eur:38250}
    ]}],
    ourOffers:[],bom:[]
  };
  w.__pstIntegrityLastData=data;
  w.PSTProjectDataIntegrity={load:async()=>data};
  w.eval(rescue);

  const ok=w.PSTProjectCommercialPrefillRescueV1.hydrate(data,'production');
  assert.strictEqual(ok,true,'Rescue must hydrate a visible project offer form');
  assert.strictEqual(w.document.getElementById('of-proj').value,'ITALIAN STYLE - Hala - CARINVEST');
  assert.strictEqual(w.document.getElementById('of-ref').value,'MARKO JOVANOVIC');
  assert.strictEqual(w.document.getElementById('of-cli').value,'ITALIAN STYLE');
  assert.strictEqual(w.document.getElementById('of-con').value,'Marko Jovanovic');
  assert.strictEqual(w.document.getElementById('of-em').value,'marko@italianstyle.me');
  assert.strictEqual(w.document.getElementById('of-kg').value,'171100');
  assert.strictEqual(w.document.getElementById('pa-cost').value,'','Supplier cost must not become one automatic selling cost/kg');
  assert.strictEqual(w.document.getElementById('of-pr').value,'');
  assert.strictEqual(w.document.getElementById('of-loc').value,'');
  assert.strictEqual(w.document.getElementById('of-inc').value,'');
  assert.strictEqual(w.document.getElementById('pa-exc').value,'');
  assert.strictEqual(w.document.getElementById('of-pay-preset').value,'');
  assert.strictEqual(w.document.getElementById('of-cer').value,'');

  assert.strictEqual(w.oferPos.length,3,'Supplier quotation rows must replace legacy/demo rows as internal cost-basis positions');
  assert(w.oferPos.every(r=>r.price===0&&r._pstNeedsPrice===true),'Selling prices must remain blank and human-approved');
  assert.deepStrictEqual(w.oferPos.map(r=>r._pstSupplierUnitCost),[1.8,1.6,4.5],'Supplier unit costs must be preserved internally');
  assert(w.oferPos.every(r=>r._pstSupplier==='Eurosteel'),'Supplier provenance must stay attached to every imported cost row');

  const summary=w.document.getElementById('pst-project-supplier-quote-summary');
  assert(summary,'Exact supplier quote summary should be visible in the client-offer workspace');
  assert(/151\.100/.test(summary.textContent)&&/1,80/.test(summary.textContent),'Supplier line detail is missing');
  const warnings=w.PSTProjectCommercialPrefillRescueV1._test.warningRows(data,data.supplierOffers[0]);
  assert(warnings.length>0,'Supplier review warning logic must remain active');
  assert(warnings.some(x=>/Budva/.test(x)),'Cross-project transport-location warning must remain active');

  dom.window.close();
  console.log('Project commercial prefill rescue smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1)});