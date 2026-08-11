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

(async()=>{
  await testInvoiceLinks();
  console.log('Finance stability + invoice traceability smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});