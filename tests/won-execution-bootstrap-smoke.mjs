import assert from 'node:assert/strict';
import { isWonStatus,isTerminalStatus,buildExecutionTasks,buildStageTasks,planExecutionBootstrap,planExecutionStageTasks,combineExecutionTasks } from '../scripts/won-execution-bootstrap.mjs';

assert.equal(isWonStatus('fituar'),true);
assert.equal(isWonStatus('closedwon'),true);
assert.equal(isWonStatus('realizuar'),false,'Realizuar must be terminal, not won-active');
assert.equal(isTerminalStatus('realizuar'),true);
assert.equal(isTerminalStatus('mbyllur'),true);
assert.equal(isTerminalStatus('fituar'),false);

const stacon={id:'stacon-22-26',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',ref:'D - 22/26',status:'fituar',pipeline_stage:'production_control',execution_bootstrapped_at:'2026-08-11T20:10:30Z'};
const initial=buildExecutionTasks(stacon,{hasSupplier:true,today:'2026-08-11'});
assert.equal(initial.length,4,'Legacy initial bootstrap contract must stay stable');
assert(initial.some(t=>t.source_ref==='stacon-22-26:scope_lock'));
assert(initial.some(t=>t.source_ref==='stacon-22-26:supplier_confirmation'));
assert(!initial.some(t=>t.source_ref==='stacon-22-26:production_docs'),'Stage-only production-doc task must not alter initial bootstrap contract');

const production=buildStageTasks(stacon,{hasSupplier:true,today:'2026-08-11',stage:'production_control'});
assert(production.some(t=>t.source_ref==='stacon-22-26:production_docs'));
assert(production.every(t=>t.source==='execution_won'&&t.status==='hapur'));

const baseLegacy=planExecutionBootstrap({projects:[stacon],supplierOffers:[{project_id:'stacon-22-26'}],existingTasks:[],today:'2026-08-13',nowIso:'2026-08-13T18:00:00Z'});
assert.equal(baseLegacy.projectPatches.length,0,'Already bootstrapped won project must not be patched unnecessarily');
assert.equal(baseLegacy.taskCreates.length,0,'Legacy bootstrap plan must stay non-retroactive');
const repair=planExecutionStageTasks({projects:[stacon],supplierOffers:[{project_id:'stacon-22-26'}],existingTasks:[],baseTaskCreates:baseLegacy.taskCreates,projectPatches:baseLegacy.projectPatches,eligibleProjectIds:baseLegacy.wonProjectIds,today:'2026-08-13'});
assert.equal(repair.taskCreates.length,5,'Stage repair must restore the missing production checklist');
assert.equal(repair.taskCreates[0].due_date,'2026-08-12','Repair must keep original bootstrap date as task baseline, not move deadlines every run');

const refs=repair.taskCreates.map(t=>t.source_ref);
const idempotent=planExecutionStageTasks({projects:[stacon],supplierOffers:[{project_id:'stacon-22-26'}],existingTasks:refs.map((source_ref,i)=>({id:String(i),source:'execution_won',source_ref,status:'hapur'})),eligibleProjectIds:['stacon-22-26'],today:'2026-08-14'});
assert.equal(idempotent.taskCreates.length,0,'Execution stage repair must be idempotent');

const audit={...stacon,id:'audit-1',pipeline_stage:'factory_audit',execution_bootstrapped_at:'2026-08-13T10:00:00Z'};
const auditPlan=planExecutionStageTasks({projects:[audit],existingTasks:[],eligibleProjectIds:['audit-1'],today:'2026-08-13'});
assert.deepEqual(auditPlan.taskCreates.map(t=>t.source_ref).sort(),['audit-1:factory_audit_release','audit-1:quality_dossier'].sort());

const transport={...stacon,id:'transport-1',pipeline_stage:'transport',execution_bootstrapped_at:'2026-08-13T10:00:00Z'};
const transportPlan=planExecutionStageTasks({projects:[transport],existingTasks:[],eligibleProjectIds:['transport-1'],today:'2026-08-13'});
assert.equal(transportPlan.taskCreates.length,5);
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:shipping_docs'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:client_invoice'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:payment_terms_capture'));
assert(transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:closure_review'));
assert(!transportPlan.taskCreates.some(t=>t.source_ref==='transport-1:scope_lock'),'Transport stage must not receive production-stage checklist');

const freshTransport={...transport,id:'fresh-transport',execution_bootstrapped_at:null};
const baseTransport=planExecutionBootstrap({projects:[freshTransport],existingTasks:[],today:'2026-08-13',nowIso:'2026-08-13T18:00:00Z'});
assert.equal(baseTransport.taskCreates.length,3,'Legacy plan may still describe initial universal tasks');
const stageTransport=planExecutionStageTasks({projects:[freshTransport],existingTasks:[],baseTaskCreates:baseTransport.taskCreates,projectPatches:baseTransport.projectPatches,eligibleProjectIds:baseTransport.wonProjectIds,today:'2026-08-13'});
const combined=combineExecutionTasks({basePlan:baseTransport,stagePlan:stageTransport,projects:[freshTransport]});
assert.equal(combined.length,5,'Actual apply plan must suppress universal production tasks for an advanced transport project');
assert(combined.every(t=>!['fresh-transport:scope_lock','fresh-transport:buyer_confirmation','fresh-transport:execution_schedule'].includes(t.source_ref)));

const realized={...stacon,id:'done-1',status:'realizuar',pipeline_stage:'transport'};
const terminalBase=planExecutionBootstrap({projects:[realized],wonOffers:[{project_id:'done-1'}],existingTasks:[],today:'2026-08-13'});
const terminalStage=planExecutionStageTasks({projects:[realized],existingTasks:[],eligibleProjectIds:terminalBase.wonProjectIds,today:'2026-08-13'});
assert.equal(terminalBase.taskCreates.length,0,'Realized project must receive no bootstrap tasks');
assert.equal(terminalStage.taskCreates.length,0,'Realized project must receive no stage tasks');
assert(terminalBase.skipped.some(x=>x.project_id==='done-1'&&x.reason==='terminal_status'));

console.log('Stage-aware won execution bootstrap smoke test passed.');