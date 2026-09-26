import assert from 'node:assert/strict';
import fs from 'node:fs';

const engine=fs.readFileSync('scripts/opportunity-engine-v2.mjs','utf8');
const boundary=fs.readFileSync('supabase/migrations/20260926170000_opportunity_module_boundary_hardening_v1.sql','utf8');

assert.match(engine,/source\(row\)==='KRPP'.*krpp_authenticated_fetch_required/s,'KRPP blocked dossiers must retain authenticated-fetch action semantics');
assert.match(engine,/type:'dossier_fetch_required'.*Dosja APP kërkohet/s,'APP blocked dossiers must use a source-neutral dossier-fetch action');
assert.match(engine,/DIRECT_MANAGED_ACTION_TYPES=new Set\(/,'Direct Tender managed action ownership must be explicit');
assert.match(engine,/activeDirectActionMap\(/,'Direct Tender engine must batch-read current active actions before reconciliation');
assert.match(engine,/supersedeStaleDirectActions\(/,'Direct Tender engine must reconcile stale route actions');
assert.match(engine,/status:'superseded'/,'Stale automatic actions must leave the active queue');
assert.match(engine,/source_ref=in\.\(/,'Stale automatic task refs must be closed in a bounded batch');
assert.match(engine,/if\(current\.action_type==='dossier_amendment_review'\)continue/,'Unreviewed dossier amendment actions must survive routine route reconciliation');
assert.doesNotMatch(engine,/pppp_tender_project_promotion_reconcile_v[12]/,'Scheduled Direct Tender processing must not call a Project promotion RPC');
assert.doesNotMatch(engine,/p_apply:true/,'Scheduled Direct Tender processing must never auto-create a project');
assert.match(boundary,/revoke all on function public\.pppp_tender_project_promotion_reconcile_v2\(boolean,integer\)[\s\S]*from public, anon, authenticated, service_role/i,'Promotion v2 RPC must not be executable by app/service roles');
assert.match(boundary,/grant execute on function public\.pppp_tender_project_promotion_reconcile_v2\(boolean,integer\)[\s\S]*to postgres/i,'Legacy promotion must be restricted to emergency database administration');

console.log('Direct Tender action reconciliation + human-gate smoke passed.');
