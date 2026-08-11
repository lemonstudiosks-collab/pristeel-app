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
  {id:'p4',name:'Advanced',client:'Client D',ref:'R4',status:'fituar',pipeline_stage:'transport'},
  {id:'p5',name:'Invoiced Execution',client:'Client E',ref:'R5',status:'pritje',pipeline_stage:'production_control'},
  {id:'p6',name:'Early Invoice',client:'Client F',ref:'R6',status:'pritje',pipeline_stage:'client_offer'},
  {id:'p7',name:'Legacy Bootstrapped',client:'Client G',ref:'R7',status:'fituar',pipeline_stage:'production_control',execution_bootstrapped_at:'2026-08-01T10:00:00Z',execution_bootstrap_source:'legacy_execution_repair'}
 ];
 const nowIso='2026-08-11T20:15:00Z';
 const plan=mod.planExecutionBootstrap({
  projects,
  wonOffers:[{project_id:'p1'},{project_id:'p3'}],
  invoicesOut:[{project_id:'p5',invoice_nr:'INV-5'},{project_id:'p6',invoice_nr:'INV-6'}],
  supplierOffers:[{project_id:'p1',supplier:'Supplier A'}],
  rfqs:[],
  existingTasks:[{id:'t1',source:'execution_won',source_ref:'p2:scope_lock',status:'kryer'}],
  today:'2026-08-11',
  nowIso
 });

 assert.deepStrictEqual(new Set(plan.wonProjectIds),new Set(['p1','p2','p3','p4','p5','p7']),'Won project discovery is incomplete or promoted an early-stage invoice');
 const p1Patch=plan.projectPatches.find(x=>x.project.id==='p1');
 assert(p1Patch,'Won quote should bootstrap its linked project');
 assert.strictEqual(p1Patch.patch.status,'fituar','Won quotation should repair project status');
 assert.strictEqual(p1Patch.patch.pipeline_stage,'production_control','Won project should advance to production_control');
 assert.strictEqual(p1Patch.patch.execution_bootstrap_source,'won_quote','Won quote bootstrap provenance missing');
 assert.strictEqual(p1Patch.patch.execution_bootstrapped_at,nowIso,'Bootstrap timestamp missing');

 const p5Patch=plan.projectPatches.find(x=>x.project.id==='p5');
 assert(p5Patch,'Invoiced execution project should be recognized as won');
 assert.strictEqual(p5Patch.patch.status,'fituar','Invoiced execution should repair status');
 assert.strictEqual(p5Patch.patch.execution_bootstrap_source,'invoice_execution','Invoice evidence provenance missing');
 assert(!Object.prototype.hasOwnProperty.call(p5Patch.patch,'pipeline_stage'),'Already-correct execution stage should not be rewritten');

 const p4Patch=plan.projectPatches.find(x=>x.project.id==='p4');
 assert(p4Patch,'Newly discovered won project should receive a bootstrap marker');
 assert(!Object.prototype.hasOwnProperty.call(p4Patch.patch,'pipeline_stage'),'Advanced execution stage must never regress');
 assert.strictEqual(p4Patch.patch.execution_bootstrap_source,'project_status');

 assert(!plan.wonProjectIds.includes('p6'),'An invoice in an early-stage project must not auto-promote it to won');
 assert(plan.skipped.some(x=>x.project_id==='p3'&&x.reason==='terminal_status'),'Archived project must not be reopened');
 assert(!plan.projectPatches.some(x=>x.project.id==='p7'),'Already bootstrapped legacy project must not be patched again');
 assert(!plan.taskCreates.some(x=>x.project_id==='p7'),'Already bootstrapped legacy project must not get retroactive checklist tasks');

 const p1Tasks=plan.taskCreates.filter(x=>x.project_id==='p1');
 assert.strictEqual(p1Tasks.length,4,'Supplier-backed won project should get four execution tasks');
 assert(p1Tasks.some(x=>x.source_ref==='p1:supplier_confirmation'&&x.category==='furnitor'),'Supplier confirmation task missing');
 const p2Tasks=plan.taskCreates.filter(x=>x.project_id==='p2');
 assert.strictEqual(p2Tasks.length,2,'Completed canonical task must not be recreated');
 assert(!p2Tasks.some(x=>x.source_ref==='p2:scope_lock'),'Completed scope task was recreated');
 const p4Tasks=plan.taskCreates.filter(x=>x.project_id==='p4');
 assert.strictEqual(p4Tasks.length,3,'Advanced won project should receive missing execution checklist tasks once');
 const p5Tasks=plan.taskCreates.filter(x=>x.project_id==='p5');
 assert.strictEqual(p5Tasks.length,3,'Invoiced execution project should get the universal execution checklist');
}

(async()=>{
 await testGovernance();
 await testExecutionBootstrap();
 console.log('Workflow governance + won execution bootstrap smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
