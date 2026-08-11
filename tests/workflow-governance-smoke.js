const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

async function testGovernance(){
 const source=fs.readFileSync('pristeel-workflow-governance-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Governance must not observe or poll');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;let saved=0,adjusted=0,closed=0,answer=false,mode='unpaid';
 w.confirm=()=>answer;
 w.saveInvoiceOut=()=>{saved++;};
 w.pstSaveAdjustment=()=>{adjusted++;};
 w.pstProjectsModernAction=(id,act)=>{if(act==='closed')closed++;};
 w.supaFetch=async path=>{
   if(path.startsWith('projects?id=eq.p1'))return[{id:'p1',name:'Dukley',status:'fituar'}];
   if(path.startsWith('invoices_out?project_id=eq.p1')){
     if(mode==='legacy')return[];
     return mode==='unpaid'?[{id:'i1',invoice_nr:'INV-1',paid:false,gross_amount:1000}]:[{id:'i1',invoice_nr:'INV-1',paid:true,paid_date:'2026-08-08',gross_amount:1000}];
   }
   if(path.startsWith('invoices_out?project=eq.Dukley'))return mode==='legacy'?[{id:'old1',invoice_nr:'OLD-INV',project:'Dukley',paid:false,gross_amount:750}]:[];
   return[];
 };
 w.eval(source);
 assert(w.PSTWorkflowGovernanceV1,'Governance API missing');
 w.saveInvoiceOut();w.pstSaveAdjustment();w.pstProjectsModernAction('p1','closed');
 assert.strictEqual(saved,0,'Invoice finalization must stop without approval');
 assert.strictEqual(adjusted,0,'Credit/debit finalization must stop without approval');
 assert.strictEqual(closed,0,'Programmatic project closure must stop without approval');
 answer=true;
 w.saveInvoiceOut();w.pstSaveAdjustment();w.pstProjectsModernAction('p1','closed');
 assert.strictEqual(saved,1,'Approved invoice finalization did not continue');
 assert.strictEqual(adjusted,1,'Approved adjustment finalization did not continue');
 assert.strictEqual(closed,1,'Approved programmatic closure did not continue');
 const dummy=w.document.createElement('button');w.document.body.appendChild(dummy);
 await w.PSTWorkflowGovernanceV1.openCloseGate(dummy,'p1');
 let go=w.document.getElementById('pst-close-confirm'),delivery=w.document.getElementById('pst-close-delivery');
 delivery.checked=true;delivery.dispatchEvent(new w.Event('change'));
 assert(go.disabled,'Project with unpaid invoice must stay blocked even after delivery confirmation');
 assert(w.document.getElementById('pst-close-gate').textContent.includes('papaguara'),'Unpaid invoice warning is missing');
 w.document.getElementById('pst-close-gate').remove();
 mode='paid';
 await w.PSTWorkflowGovernanceV1.openCloseGate(dummy,'p1');
 go=w.document.getElementById('pst-close-confirm');delivery=w.document.getElementById('pst-close-delivery');
 assert(w.document.getElementById('pst-close-gate').textContent.includes('Faturat e lidhura rezultojnë të paguara'),'Paid invoice verification is missing');
 delivery.checked=true;delivery.dispatchEvent(new w.Event('change'));
 assert.strictEqual(go.disabled,false,'Paid project should become closable after delivery confirmation');
 w.document.getElementById('pst-close-gate').remove();
 mode='legacy';
 await w.PSTWorkflowGovernanceV1.openCloseGate(dummy,'p1');
 go=w.document.getElementById('pst-close-confirm');delivery=w.document.getElementById('pst-close-delivery');
 delivery.checked=true;delivery.dispatchEvent(new w.Event('change'));
 assert(go.disabled,'Legacy name-linked unpaid invoice must block project closure');
 assert(w.document.getElementById('pst-close-gate').textContent.includes('OLD-INV'),'Legacy name-linked invoice was not included in closure verification');
 dom.window.close();
}

async function testExecutionBootstrap(){
 const mod=await import('../scripts/won-execution-bootstrap.mjs');
 assert.strictEqual(mod.isWonStatus('Fituar'),true,'Albanian won status not recognized');
 assert.strictEqual(mod.isWonStatus('won'),true,'English won status not recognized');
 assert.strictEqual(mod.isTerminalStatus('arkivuar'),true,'Archived status must be terminal');

 const projects=[
  {id:'p1',name:'Project One',client:'Client A',ref:'R1',status:'pritje',pipeline_stage:'commercial'},
  {id:'p2',name:'Project Two',client:'Client B',ref:'R2',status:'fituar',pipeline_stage:'production_control'},
  {id:'p3',name:'Archived',client:'Client C',ref:'R3',status:'arkivuar',pipeline_stage:'commercial'},
  {id:'p4',name:'Advanced',client:'Client D',ref:'R4',status:'fituar',pipeline_stage:'transport'}
 ];
 const plan=mod.planExecutionBootstrap({
  projects,
  wonOffers:[{project_id:'p1'},{project_id:'p3'}],
  supplierOffers:[{project_id:'p1',supplier:'Supplier A'}],
  rfqs:[],
  existingTasks:[{id:'t1',source:'execution_won',source_ref:'p2:scope_lock',status:'kryer'}],
  today:'2026-08-11'
 });

 assert.deepStrictEqual(new Set(plan.wonProjectIds),new Set(['p1','p2','p3','p4']),'Won project discovery is incomplete');
 const p1Patch=plan.projectPatches.find(x=>x.project.id==='p1');
 assert(p1Patch,'Won quote should bootstrap its linked project');
 assert.strictEqual(p1Patch.patch.status,'fituar','Won quotation should repair project status');
 assert.strictEqual(p1Patch.patch.pipeline_stage,'production_control','Won project should advance to production_control');
 assert(!plan.projectPatches.some(x=>x.project.id==='p4'),'Advanced execution stage must never regress');
 assert(plan.skipped.some(x=>x.project_id==='p3'&&x.reason==='terminal_status'),'Archived project must not be reopened');

 const p1Tasks=plan.taskCreates.filter(x=>x.project_id==='p1');
 assert.strictEqual(p1Tasks.length,4,'Supplier-backed won project should get four execution tasks');
 assert(p1Tasks.some(x=>x.source_ref==='p1:supplier_confirmation'&&x.category==='furnitor'),'Supplier confirmation task missing');
 const p2Tasks=plan.taskCreates.filter(x=>x.project_id==='p2');
 assert.strictEqual(p2Tasks.length,2,'Completed canonical task must not be recreated');
 assert(!p2Tasks.some(x=>x.source_ref==='p2:scope_lock'),'Completed scope task was recreated');
 const p4Tasks=plan.taskCreates.filter(x=>x.project_id==='p4');
 assert.strictEqual(p4Tasks.length,3,'Advanced won project should still receive missing execution checklist tasks');
}

(async()=>{
 await testGovernance();
 await testExecutionBootstrap();
 console.log('Workflow governance + won execution bootstrap smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
