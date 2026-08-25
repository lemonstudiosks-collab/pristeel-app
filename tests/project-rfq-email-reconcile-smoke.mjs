import assert from 'node:assert/strict';
import { isRfqSubject, normalizeEmail, isExternalEmail, planRfqEmailRows } from '../scripts/project-rfq-email-reconcile.mjs';

assert.equal(isRfqSubject('RFQ – Round Conical Steel Siren Poles, 6 m / 9 m / 12 m – Kosovo EWAS Project'),true);
assert.equal(isRfqSubject('New RFQ – Round-Conical Siren Poles, Kosovo EWAS Project'),true);
assert.equal(isRfqSubject('Request for quotation - steel poles'),true);
assert.equal(isRfqSubject('Technical update - EWAS'),false);
assert.equal(normalizeEmail('ATOM <info@atompoles.eu>'),'info@atompoles.eu');
assert.equal(isExternalEmail('arianit.vllahiu@prissteel.com'),false);
assert.equal(isExternalEmail('info@atompoles.eu'),true);

const projectId='25f7c374-6830-4cae-b2b5-bd5d694c00e0';
const emails=[
  {gmail_message_id:'m1',project_id:projectId,project_name:'SSP - EWAS Siren Poles - Kosovo',direction:'outgoing',subject:'RFQ – Round Conical Steel Siren Poles, 6 m / 9 m / 12 m – Kosovo EWAS Project',to_emails:['info@atompoles.eu'],snippet:'Please quote.',sent_at:'2026-08-25T06:00:00Z',needs_review:false},
  {gmail_message_id:'m2',project_id:projectId,project_name:'SSP - EWAS Siren Poles - Kosovo',direction:'outgoing',subject:'EWAS - Siren Poles Technical Update',to_emails:['client@example.com'],snippet:'Update.',sent_at:'2026-08-25T06:01:00Z',needs_review:false},
  {gmail_message_id:'m3',project_id:projectId,project_name:'SSP - EWAS Siren Poles - Kosovo',direction:'incoming',subject:'RFQ reply',to_emails:['arianit.vllahiu@prissteel.com'],snippet:'Reply.',sent_at:'2026-08-25T07:00:00Z',needs_review:false}
];
let rows=planRfqEmailRows(emails,[]);
assert.equal(rows.length,1);
assert.equal(rows[0].supplier_email,'info@atompoles.eu');
assert.equal(rows[0].supplier_name,'Atompoles');
assert.equal(rows[0].status,'sent');
assert.equal(rows[0].project_id,projectId);

rows=planRfqEmailRows(emails,[{project_id:projectId,supplier_email:'info@atompoles.eu',subject:emails[0].subject}]);
assert.equal(rows.length,0,'reconcile must be idempotent');

const reviewEmail={...emails[0],gmail_message_id:'m4',to_emails:['sales@zincometal.gr'],needs_review:true};
assert.equal(planRfqEmailRows([reviewEmail],[]).length,0,'review-gated email must not create RFQ');

console.log('project-rfq-email-reconcile smoke: ok');
