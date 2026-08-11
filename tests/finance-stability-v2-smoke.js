const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const s=fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
assert(/finSwitchTab/.test(s),'Finance wrapper missing');
assert(/setTimeout/.test(s),'bounded watchdog missing');
assert(/Duke ngarkuar/i.test(s),'loading-state detection missing');
assert(!/supaFetch\s*\(/.test(s),'Finance guard must not issue reads/writes itself');
assert(!/setInterval\s*\(/.test(s),'Finance guard must not poll');

async function testInvoiceLinks(){
  const dom=new JSDOM(`<!doctype html><html><body>
    <select id="iv-proj-select"><option value=""></option><option value="p1">Project 1</option></select>
    <select id="ivin-proj-select"><option value=""></option><option value="p1">Project 1</option></select>
    <select id="iv-from-quo"><option value=""></option></select>
    <select id="iv-milestone"><option value=""></option><option value="1">Milestone 2</option></select>
  </body></html>`,{url:'https://localhost/pristeel-procurement.html',runScripts:'outside-only'});
  const w=dom.window;
  w.console=console;
  w.__pstIntegrityLastData={project:{id:'p1',name:'Project 1'}};
  w._quoDocs=[];
  let baseRegistryCalls=0;
  w.loadQuoRegistry=function(){baseRegistryCalls++;return Promise.resolve([]);};
  const writes=[];
  const passthrough=[];
  w.supaFetch=async function(path,method,body){
    if(path.indexOf('documents_registry?series=eq.QUO&project_id=eq.p1')===0){
      return [{id:'q1',project_id:'p1',doc_nr:'PST-QUO-2026-001',client:'Client',total_eur:12000}];
    }
    if(path==='invoices_out'&&method==='POST'){writes.push({table:'out',body});return [body];}
    if(path==='invoices_in'&&method==='POST'){writes.push({table:'in',body});return [body];}
    passthrough.push({path,method,body});return [{ok:true}];
  };
  w.eval(fs.readFileSync('pristeel-invoice-project-link-v1.js','utf8'));
  assert.strictEqual(w.PSTInvoiceProjectLinkV1.isFetchGuardInstalled(),true,'Invoice DB guard did not install');

  w.document.getElementById('iv-proj-select').value='p1';
  w.document.getElementById('ivin-proj-select').value='p1';
  await w.PSTInvoiceProjectLinkV1.loadScopedOffers();
  const offerSelect=w.document.getElementById('iv-from-quo');
  assert.strictEqual(offerSelect.options.length,2,'Scoped offer dropdown was not rebuilt');
  assert.strictEqual(w._quoDocs.length,1,'Only current-project offers should be loaded');
  offerSelect.value='0';
  w.document.getElementById('iv-milestone').value='1';

  await w.supaFetch('invoices_out','POST',{invoice_nr:'PST-INV-2026-010',project:'Project 1'});
  assert.strictEqual(writes[0].body.project_id,'p1','Outgoing invoice project_id missing');
  assert.strictEqual(writes[0].body.source_offer_id,'q1','Outgoing invoice source_offer_id missing');
  assert.strictEqual(writes[0].body.source_offer_doc_nr,'PST-QUO-2026-001','Outgoing invoice source offer number missing');
  assert.strictEqual(writes[0].body.source_milestone_index,1,'Outgoing invoice milestone trace missing');

  await w.supaFetch('invoices_in','POST',{supplier_invoice_nr:'SUP-1',project:'Project 1'});
  assert.strictEqual(writes[1].body.project_id,'p1','Incoming invoice project_id missing');

  w._quoDocs=[{id:'q2',project_id:'p2',doc_nr:'PST-QUO-2026-002'}];
  offerSelect.innerHTML='<option value=""></option><option value="0">Other offer</option>';
  offerSelect.value='0';
  await assert.rejects(
    ()=>w.supaFetch('invoices_out','POST',{invoice_nr:'BAD'}),
    e=>e&&e.code==='PST_INVOICE_PROJECT_OFFER_MISMATCH',
    'Offer/project mismatch must stop invoice save'
  );
  assert.strictEqual(writes.length,2,'Mismatch must not reach invoice insert');

  const other=await w.supaFetch('tasks','POST',{title:'x'});
  assert.deepStrictEqual(other,[{ok:true}],'Non-invoice writes must pass through');
  assert.strictEqual(passthrough.length,1,'Non-invoice write should hit original supaFetch once');
  assert.strictEqual(baseRegistryCalls,0,'Project-scoped invoice flow should not fall back to global offer registry');
  dom.window.close();
}

async function testInvoicePaymentTaskPlanner(){
  const mod=await import('../scripts/invoice-payment-task-sync.mjs');
  assert.strictEqual(mod.daysFromToday('2026-08-22','2026-08-11'),11,'Date-only day difference is wrong');
  assert.strictEqual(mod.daysFromToday('2026-08-10','2026-08-11'),-1,'Overdue day difference is wrong');
  assert.strictEqual(mod.priorityForDays(-1),'urgjent','Overdue invoice must be urgent');
  assert.strictEqual(mod.priorityForDays(0),'e larte','Due-today invoice must be high priority');
  assert.strictEqual(mod.priorityForDays(3),'e larte','Near-term invoice must be high priority');
  assert.strictEqual(mod.priorityForDays(7),'mesatare','Seven-day invoice should be medium priority');

  const outgoing={
    id:'out-1',invoice_nr:'PST-INV-2026-010',project_id:'p1',project:'EVOSYS',client:'Evosys Laser GmbH',
    due_date:'2026-08-15',paid:false,gross_amount:2399.60,currency:'EUR'
  };
  const outgoingTask=mod.taskFromInvoice(outgoing,'out','2026-08-11');
  assert.strictEqual(outgoingTask.source,'invoice_receivable');
  assert.strictEqual(outgoingTask.source_ref,'out-1');
  assert.strictEqual(outgoingTask.project_id,'p1');
  assert.strictEqual(outgoingTask.category,'klient');
  assert.strictEqual(outgoingTask.priority,'mesatare');
  assert.match(outgoingTask.title,/PST-INV-2026-010/);

  const incoming={
    id:'in-1',supplier_invoice_nr:'SUP-77',project_id:'p2',project:'Project B',supplier:'Supplier GmbH',
    due_date:'2026-08-12',paid:false,amount:5000,currency:'EUR'
  };
  const incomingTask=mod.taskFromInvoice(incoming,'in','2026-08-11');
  assert.strictEqual(incomingTask.source,'invoice_payable');
  assert.strictEqual(incomingTask.category,'furnitor');
  assert.strictEqual(incomingTask.priority,'e larte');

  const existing={
    id:'task-existing',source:'invoice_receivable',source_ref:'out-existing',status:'hapur',done_at:null,
    due_date:'2026-08-14',project_id:'p3',title:'old',detail:'old',priority:'mesatare',category:'klient'
  };
  const plan=mod.planInvoiceTasks({
    today:'2026-08-11',
    lookaheadDays:7,
    outgoing:[
      outgoing,
      {id:'out-future',invoice_nr:'FUTURE',due_date:'2026-09-30',paid:false},
      {id:'out-existing',invoice_nr:'EXIST',project_id:'p3',project:'P3',client:'C3',due_date:'2026-08-13',paid:false,total_price:100,currency:'EUR'},
      {id:'out-paid',invoice_nr:'PAID',project_id:'p4',project:'P4',client:'C4',due_date:'2026-08-10',paid:true,total_price:100,currency:'EUR'}
    ],
    incoming:[incoming],
    existingTasks:[
      existing,
      {id:'task-paid',source:'invoice_receivable',source_ref:'out-paid',status:'hapur',done_at:null,due_date:'2026-08-10'}
    ]
  });

  assert.strictEqual(plan.planned.filter(x=>x.action==='create').length,2,'Expected one outgoing and one incoming task create');
  assert.strictEqual(plan.planned.filter(x=>x.action==='update').length,1,'Existing unpaid invoice task should update, not duplicate');
  assert.strictEqual(plan.complete.length,1,'Paid invoice should complete its existing task');
  assert.strictEqual(plan.complete[0].task.id,'task-paid');
  assert.ok(plan.skipped.some(x=>x.id==='out-future'&&x.reason==='outside_window'),'Far-future invoice should not create noise');
  assert.ok(!plan.planned.some(x=>x.invoice.id==='out-paid'),'Paid invoice must not reopen/create a payment task');

  const movedFuturePlan=mod.planInvoiceTasks({
    today:'2026-08-11',
    lookaheadDays:7,
    outgoing:[{id:'out-existing',invoice_nr:'EXIST',project_id:'p3',project:'P3',client:'C3',due_date:'2026-09-01',paid:false,total_price:100,currency:'EUR'}],
    existingTasks:[existing]
  });
  assert.strictEqual(movedFuturePlan.planned.length,1,'Existing task must stay synced when due date is extended');
  assert.strictEqual(movedFuturePlan.planned[0].task.due_date,'2026-09-01');
}

async function testDocumentCurrency(){
  const dom=new JSDOM(`<!doctype html><html><body>
    <div class="field-group"><div><label class="lbl">Cmimi EUR/kg</label><input id="of-pr"></div><div><label class="lbl">Total kg</label><input id="of-kg"></div></div>
    <div class="field-group"><div><label class="lbl">Zinktimi EUR/kg</label><input id="of-zn"></div><div><label class="lbl">Transporti EUR total</label><input id="of-tr"></div></div>
    <div id="of-preview-col" style="display:block"><div id="of-pre">Plotëso</div></div><div id="ofp-sum">100.00 EUR</div>
    <div class="field-group"><div><label class="lbl">Lloji</label><select id="iv-type"><option>standard</option></select></div><div><label class="lbl">X</label><input></div></div>
    <table id="iv-items-tbl"><thead><tr><th>Çmimi/kg</th></tr></thead></table><div id="iv-preview">Plotëso</div>
    <select id="iv-from-quo"><option value="">—</option><option value="0">Quote</option></select><input id="iv-contract-value"><select id="iv-milestone"><option value=""></option></select>
    <select id="fin-year"><option value="2026" selected>2026</option></select><select id="fin-period"><option value="year" selected>year</option></select>
    <div id="iv-out-list"></div><div id="oa-list"></div><input id="oa-search">
  </body></html>`,{url:'https://localhost/pristeel-procurement.html',runScripts:'outside-only'});
  const w=dom.window;w.console=console;w.alertMessages=[];w.alert=m=>w.alertMessages.push(String(m));
  const registryCalls=[],dbCalls=[];
  w.collectOfferFormState=()=>({lang:'de'});
  w.applyOfferFormState=()=>{};
  w.renderOferPos=()=>{};
  w.registerDocNr=async function(series,nr,project,client,total,pay,state){registryCalls.push({series,nr,total,state});return[];};
  w.supaFetch=async function(path,method,body){dbCalls.push({path,method,body});if(path==='invoices_out'&&method==='POST')return [body];return[];};
  w.genOfer=function(){w.document.getElementById('of-pre').innerHTML='<div>100 EUR</div><div>EUR · USD · CHF · GBP</div>';};
  w.genInvoiceOut=function(){w.document.getElementById('iv-preview').innerHTML='<div>250 EUR</div>';};
  w.quoSelected=function(){};w.loadQuoRegistry=function(){return Promise.resolve([]);};
  let taxCalls=0,taxRevenue=0,taxCost=0;
  w.calcTaxSummary=function(){taxCalls++;taxRevenue=(w.invoicesOutList||[]).reduce((a,x)=>a+(parseFloat(x.net_amount)||0),0);taxCost=(w.invoicesInList||[]).reduce((a,x)=>a+(parseFloat(x.net_amount)||parseFloat(x.amount)||0),0);};
  w.PSTCommercialDocumentBuilderV1={fresh:function(){return true;}};
  w.eval(fs.readFileSync('pristeel-document-currency-v1.js','utf8'));
  w.PSTDocumentCurrencyV1.enhance();

  assert(w.document.getElementById('pst-of-currency'),'Offer currency selector missing');
  assert(w.document.getElementById('pst-iv-currency'),'Invoice currency selector missing');
  w.PSTDocumentCurrencyV1.setCurrency('offer','USD',0.92);
  const state=w.collectOfferFormState();
  assert.strictEqual(state.currency,'USD');assert.strictEqual(state.exchange_rate_to_eur,0.92);
  await w.registerDocNr('QUO','PST-OFF-2026-999','P','C',100,null,state,null);
  assert.strictEqual(registryCalls[0].total,92,'Registry total_eur must be converted, not raw USD');
  assert.strictEqual(registryCalls[0].state.currency,'USD');
  const quotePatch=dbCalls.find(x=>/documents_registry\?doc_nr=eq.PST-OFF-2026-999/.test(x.path));
  assert(quotePatch,'Document currency registry patch missing');
  assert.strictEqual(quotePatch.body.total_amount,100);assert.strictEqual(quotePatch.body.total_eur,92);assert.strictEqual(quotePatch.body.currency,'USD');

  w.genOfer();
  assert(/100 USD/.test(w.document.getElementById('of-pre').textContent),'Offer preview did not switch to USD');
  assert(/EUR · USD · CHF · GBP/.test(w.document.getElementById('of-pre').textContent),'Bank supported-currency list must not be rewritten');

  w.PSTDocumentCurrencyV1.setCurrency('invoice','CHF',1.04);
  await w.supaFetch('invoices_out','POST',{invoice_nr:'PST-INV-2026-999',gross_amount:500,total_price:500,currency:'EUR'});
  const invWrite=dbCalls.find(x=>x.path==='invoices_out'&&x.method==='POST');
  assert.strictEqual(invWrite.body.currency,'CHF');assert.strictEqual(invWrite.body.exchange_rate_to_eur,1.04);
  const invPatch=dbCalls.find(x=>/documents_registry\?doc_nr=eq.PST-INV-2026-999/.test(x.path));
  assert(invPatch,'Invoice registry currency patch missing');assert.strictEqual(invPatch.body.total_amount,500);assert.strictEqual(invPatch.body.total_eur,520);
  w.genInvoiceOut();assert(/250 CHF/.test(w.document.getElementById('iv-preview').textContent),'Invoice preview did not switch to CHF');

  w._quoDocs=[{id:'q-usd',doc_nr:'Q-USD',client:'Client',currency:'USD',total_amount:1000,total_eur:920,exchange_rate_to_eur:0.92,payment_plan:[]}];
  w.document.getElementById('iv-from-quo').value='0';w.quoSelected();
  assert.strictEqual(w.PSTDocumentCurrencyV1.invoiceCurrency(),'USD','Invoice must inherit source quote currency');
  assert.strictEqual(w.document.getElementById('iv-contract-value').value,'1000','Invoice contract value must stay in document currency');
  assert(/1.000,00 USD/.test(w.document.getElementById('iv-from-quo').options[1].textContent),'Quote dropdown must show original document currency');

  w.invoicesOutList=[{date:'2026-08-01',currency:'USD',exchange_rate_to_eur:0.9,net_amount:100,vat_amount:10,gross_amount:110}];
  w.invoicesInList=[{date:'2026-08-02',currency:'CHF',exchange_rate:1.05,net_amount:50,vat_amount:0,amount:50}];
  w.calcTaxSummary();
  assert.strictEqual(taxCalls,1);assert.strictEqual(taxRevenue,90,'Outgoing FX conversion for Finance is wrong');assert.strictEqual(taxCost,52.5,'Incoming FX conversion for Finance is wrong');
  assert.strictEqual(w.invoicesOutList[0].net_amount,100,'Finance wrapper must restore original document-currency rows');

  w.invoicesOutList=[{invoice_nr:'NO-RATE',date:'2026-08-01',currency:'USD',exchange_rate_to_eur:null,net_amount:100}];w.invoicesInList=[];
  w.calcTaxSummary();
  assert.strictEqual(taxCalls,1,'Finance must not calculate a foreign-currency row without FX rate');
  assert(w.alertMessages.some(x=>/NO-RATE/.test(x)&&/kursi/i.test(x)),'Missing FX rate warning is missing');
  dom.window.close();
}

(async()=>{
  await testInvoiceLinks();
  await testInvoicePaymentTaskPlanner();
  await testDocumentCurrency();
  console.log('Finance stability + invoice traceability + payment tasks + document currency smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});