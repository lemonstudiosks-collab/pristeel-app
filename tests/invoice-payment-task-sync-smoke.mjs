import assert from 'node:assert/strict';
import { dateOnly,daysFromToday,priorityForDays,taskFromInvoice,missingDueDateTask,planInvoiceTasks } from '../scripts/invoice-payment-task-sync.mjs';

assert.equal(dateOnly('2026-08-22'),'2026-08-22');
assert.equal(dateOnly('22.08.2026'),'');
assert.equal(daysFromToday('2026-08-22','2026-08-13'),9);
assert.equal(priorityForDays(-1),'urgjent');
assert.equal(priorityForDays(2),'e larte');

const evosys={id:'out-1',invoice_nr:'PST-INV-2026-002',project_id:'p1',project:'EVOSYS Laser — ANF-8915',client:'Evosys Laser GmbH',due_date:'2026-08-18',paid:false,gross_amount:2399.60,currency:'EUR'};
const eurosteel={id:'in-1',supplier_invoice_nr:'035/2026',project_id:'p1',project:'EVOSYS Laser — ANF-8915 (POROSI E KONFIRMUAR)',supplier:'Eurosteel Sh.p.k',due_date:null,paid:false,amount:2500,currency:'EUR'};

const payment=taskFromInvoice(evosys,'out','2026-08-13');
assert.equal(payment.source,'invoice_receivable');
assert.equal(payment.due_date,'2026-08-18');
assert(payment.title.includes('PST-INV-2026-002'));

const review=missingDueDateTask(eurosteel,'in','2026-08-13');
assert.equal(review.source,'invoice_due_date_missing');
assert.equal(review.source_ref,'in:in-1');
assert.equal(review.due_date,'2026-08-13','Task due today is the administrative review deadline, not an invented invoice due date');
assert(review.title.includes('Plotëso afatin e pagesës'));
assert(review.detail.includes('mos e hamendëso'));

let plan=planInvoiceTasks({outgoing:[evosys],incoming:[eurosteel],existingTasks:[],today:'2026-08-13',lookaheadDays:7});
assert.equal(plan.planned.length,2);
assert(plan.planned.some(x=>x.task.source==='invoice_receivable'&&x.action==='create'));
assert(plan.planned.some(x=>x.task.source==='invoice_due_date_missing'&&x.reason==='missing_due_date'));
assert(!plan.planned.some(x=>x.task.source==='invoice_payable'&&x.invoice.id==='in-1'),'Missing due date must never generate a guessed payment task');

const missingTask={id:'task-missing',source:'invoice_due_date_missing',source_ref:'in:in-1',status:'hapur',due_date:'2026-08-13'};
const eurosteelWithDue={...eurosteel,due_date:'2026-08-16'};
plan=planInvoiceTasks({incoming:[eurosteelWithDue],existingTasks:[missingTask],today:'2026-08-13',lookaheadDays:7});
assert(plan.complete.some(x=>x.task.id==='task-missing'&&x.reason==='due_date_filled'),'Missing-due review must close once due_date is entered');
assert(plan.planned.some(x=>x.task.source==='invoice_payable'&&x.task.due_date==='2026-08-16'),'Real supplier payment task must use the explicit due_date');

const payableTask={id:'task-pay',source:'invoice_payable',source_ref:'in-1',status:'hapur',due_date:'2026-08-16'};
plan=planInvoiceTasks({incoming:[{...eurosteelWithDue,paid:true,paid_date:'2026-08-15'}],existingTasks:[missingTask,payableTask],today:'2026-08-15',lookaheadDays:7});
assert.equal(plan.planned.length,0);
assert(plan.complete.some(x=>x.task.id==='task-pay'&&x.reason==='invoice_paid'));
assert(plan.complete.some(x=>x.task.id==='task-missing'&&x.reason==='invoice_paid'));

const far={...evosys,id:'out-far',due_date:'2026-09-30'};
plan=planInvoiceTasks({outgoing:[far],existingTasks:[],today:'2026-08-13',lookaheadDays:7});
assert.equal(plan.planned.length,0,'Future payment outside lookahead must not create noise');
assert(plan.skipped.some(x=>x.id==='out-far'&&x.reason==='outside_window'));

const overdue={...evosys,id:'out-overdue',due_date:'2026-08-01'};
plan=planInvoiceTasks({outgoing:[overdue],existingTasks:[],today:'2026-08-13',lookaheadDays:7});
assert.equal(plan.planned[0].task.priority,'urgjent');
assert.equal(plan.planned[0].reason,'overdue');

console.log('Invoice payment + missing due-date automation smoke test passed.');