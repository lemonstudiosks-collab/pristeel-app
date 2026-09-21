import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync('scripts/opportunity-engine-v2.mjs','utf8');

assert.match(engine,/source\(row\)==='KRPP'.*krpp_authenticated_fetch_required/s,'KRPP blocked dossiers must retain authenticated-fetch action semantics');
assert.match(engine,/type:'dossier_fetch_required'.*Dosja APP kërkohet/s,'APP blocked dossiers must use a source-neutral dossier-fetch action');
assert.match(engine,/DIRECT_MANAGED_ACTION_TYPES=new Set\(/,'Direct Tender managed action ownership must be explicit');
assert.match(engine,/activeDirectActionMap\(/,'Direct Tender engine must batch-read current active actions before reconciliation');
assert.match(engine,/supersedeStaleDirectActions\(/,'Direct Tender engine must reconcile stale route actions');
assert.match(engine,/status:'superseded'/,'Stale automatic actions must leave the active queue');
assert.match(engine,/source_ref=in\.\(/,'Stale automatic task refs must be closed in a bounded batch');
assert.match(engine,/if\(current\.action_type==='dossier_amendment_review'\)continue/,'Unreviewed dossier amendment actions must survive routine route reconciliation');
assert.match(engine,/p_apply:false/,'Scheduled Direct Tender processing must remain proposal-only for project promotion');
assert.doesNotMatch(engine,/p_apply:true/,'Scheduled Direct Tender processing must never auto-create a project');

console.log('Direct Tender action reconciliation + human-gate smoke passed.');
