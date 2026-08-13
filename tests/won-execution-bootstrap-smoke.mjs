import assert from 'node:assert/strict';
import { isWonStatus,isTerminalStatus,buildExecutionTasks,planExecutionBootstrap } from '../scripts/won-execution-bootstrap.mjs';

assert.equal(isWonStatus('fituar'),true);
assert.equal(isWonStatus('closedwon'),true);
assert.equal(isWonStatus('realizuar'),false,'Realizuar must be terminal, not won-active');
assert.equal(isTerminalStatus('realizuar'),true);
assert.equal(isTerminalStatus('mbyllur'),true);
assert.equal(isTerminalStatus('fituar'),false);

const stacon={id:'stacon-22-26',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',ref:'D - 22/26',status:'fituar',pipeline_stage:'production_control',execution_bootstrapped_at:'2026-08-11T20:10:30Z'};
const production=buildExecutionTasks(stacon,{hasSupplier:true,today:'2026-08-11',stage:'production_control'});
assert(production.some(t=>t.source_ref==='stacon-22-26:scope_lock'));
assert(production.some(t=>t.source_ref==='stacon-22-26:supplier_confirmation'));
assert(production.some(t=>t.source_ref==='stacon-22-26:production_docs'));
assert(production.every(t=>t.source==='execution_won'&&t.status==='hapur'));

const repaired=planExecutionBootstrap({projects:[stacon],supplierOffers:[{project_id:'stacon-22-26'}],existingTasks:[],today:'2026-08-13',nowIso:'2026-08-13T18:00:00Z'});
assert.equal(repaired.projectPatches.length,0,'Already bootstrapped won project must not be patched unnecessarily');
assert(repaired.taskCreates.length>=5,'Already bootstrapped project with missing execution tasks must be repaired');
assert.equal(repaired.taskCreates[0].due_date,'2026-08-12','Repair must keep original bootstrap date as task baseline, not move deadlines every run');

const refs=repaired.taskCreates.map(t=>t.source_ref);
const idempotent=planExecutionBootstrap({projects:[stacon],supplierOffers:[{project_id:'stacon-22-26'}],existingTasks:refs.map((source_ref,i)=>({id:String(i),source:'execution_won',source_ref,status:'hapur'})),today:'2026-08-14'});
assert.equal(idempotent.taskCreates.length,0,'Execution task creation must be idempotent');

const audit={...stacon,id:'audit-1',pipeline_stage:'factory_audit',execution_bootstrapped_at:'2026-08-13T10:00:00Z'};
const auditPlan=planExecutionBootstrap({projects:[audit],existingTasks:[],today:'2026-08-13'});
assert.deepEqual(auditPlan.taskCreates.map(t=>t.source_ref).sort(),['audit-1:factory_audit_release','audit-1:quality_dossier'].sort());

const transport={...stacon,id:'transport-1',pipeline_stage:'transport',execution_bootstrapped_at:'2026-08-13T10:00:00Z'};
const transportPlan=planExecutionBootstrap({projects:[transport],existingTasks:[],today:'2026-08-13'});
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:shipping_docs'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:client_invoice'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:payment_terms_capture'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:closure_review'));
assert.equal(transportPlan.projectPatches.length,0,'Transport stage must not auto-close the project');

const realized={...stacon,id:'done-1',status:'realizuar',pipeline_stage:'transport'};
const terminal=planExecutionBootstrap({projects:[realized],wonOffers:[{project_id:'done-1'}],existingTasks:[],today:'2026-08-13'});
assert.equal(terminal.taskCreates.length,0,'Realized project must receive no new execution tasks');
assert(terminal.skipped.some(x=>x.project_id==='done-1'&&x.reason==='terminal_status'));

console.log('Stage-aware won execution bootstrap smoke test passed.');