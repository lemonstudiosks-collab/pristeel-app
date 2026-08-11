import assert from 'node:assert/strict';
import {
  daysFromToday,
  priorityForDays,
  taskFromInvoice,
  planInvoiceTasks
} from '../scripts/invoice-payment-task-sync.mjs';

assert.equal(daysFromToday('2026-08-22','2026-08-11'),11,'Date-only day difference is wrong');
assert.equal(daysFromToday('2026-08-10','2026-08-11'),-1,'Overdue day difference is wrong');
assert.equal(priorityForDays(-1),'urgjent','Overdue invoice must be urgent');
assert.equal(priorityForDays(0),'e larte','Due-today invoice must be high priority');
assert.equal(priorityForDays(3),'e larte','Near-term invoice must be high priority');
assert.equal(priorityForDays(7),'mesatare','Seven-day invoice should be medium priority');

const outgoing={
  id:'out-1',invoice_nr:'PST-INV-2026-010',project_id:'p1',project:'EVOSYS',client:'Evosys Laser GmbH',
  due_date:'2026-08-15',paid:false,gross_amount:2399.60,currency:'EUR'
};
const outgoingTask=taskFromInvoice(outgoing,'out','2026-08-11');
assert.equal(outgoingTask.source,'invoice_receivable');
assert.equal(outgoingTask.source_ref,'out-1');
assert.equal(outgoingTask.project_id,'p1');
assert.equal(outgoingTask.category,'klient');
assert.equal(outgoingTask.priority,'mesatare');
assert.match(outgoingTask.title,/PST-INV-2026-010/);

const incoming={
  id:'in-1',supplier_invoice_nr:'SUP-77',project_id:'p2',project:'Project B',supplier:'Supplier GmbH',
  due_date:'2026-08-12',paid:false,amount:5000,currency:'EUR'
};
const incomingTask=taskFromInvoice(incoming,'in','2026-08-11');
assert.equal(incomingTask.source,'invoice_payable');
assert.equal(incomingTask.category,'furnitor');
assert.equal(incomingTask.priority,'e larte');

const existing={
  id:'task-existing',source:'invoice_receivable',source_ref:'out-existing',status:'hapur',done_at:null,
  due_date:'2026-08-14',project_id:'p3',title:'old',detail:'old',priority:'mesatare',category:'klient'
};
const plan=planInvoiceTasks({
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

assert.equal(plan.planned.filter(x=>x.action==='create').length,2,'Expected one outgoing and one incoming task create');
assert.equal(plan.planned.filter(x=>x.action==='update').length,1,'Existing unpaid invoice task should update, not duplicate');
assert.equal(plan.complete.length,1,'Paid invoice should complete its existing task');
assert.equal(plan.complete[0].task.id,'task-paid');
assert.ok(plan.skipped.some(x=>x.id==='out-future'&&x.reason==='outside_window'),'Far-future invoice should not create noise');
assert.ok(!plan.planned.some(x=>x.invoice.id==='out-paid'),'Paid invoice must not reopen/create a payment task');

const movedFuturePlan=planInvoiceTasks({
  today:'2026-08-11',
  lookaheadDays:7,
  outgoing:[{id:'out-existing',invoice_nr:'EXIST',project_id:'p3',project:'P3',client:'C3',due_date:'2026-09-01',paid:false,total_price:100,currency:'EUR'}],
  existingTasks:[existing]
});
assert.equal(movedFuturePlan.planned.length,1,'An existing payment task must stay synced when due date is extended');
assert.equal(movedFuturePlan.planned[0].task.due_date,'2026-09-01');

console.log('Invoice payment task sync smoke test passed.');
