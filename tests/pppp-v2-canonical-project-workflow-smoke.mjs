import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20260923130000_pppp_v2_canonical_project_workflow_v1.sql'), 'utf8');
const loader = fs.readFileSync(path.join(root, 'pristeel-project-data-integrity-v1.js'), 'utf8');
const workbench = fs.readFileSync(path.join(root, 'pristeel-project-workbench-v2.js'), 'utf8');

assert.match(sql, /create or replace view public\.pppp_project_workflow_state_v1\s+with \(security_invoker = true\)/i);
assert.doesNotMatch(sql, /create table|create or replace function|update\s+public\.|insert\s+into\s+public\.|delete\s+from\s+public\./i, 'canonical workflow migration must remain read-only');
assert.match(sql, /as human_gate/i, 'commercial and commitment gates must remain visible in the read model');
for (const stage of ['customer_po','supplier_po','procurement','transport','delivery','invoice','payment','closed']) {
  assert(sql.includes(`'${stage}'`), `shared post-award stage missing: ${stage}`);
}
assert(loader.includes('pppp_project_workflow_state_v1?project_id=eq.'), 'Project loader must fetch the canonical workflow state');
assert(loader.includes('workflowState:out[16]'), 'Canonical state must be attached to the isolated project payload');

const dom = new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project" class="active"><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></section></body></html>', {
  url: 'https://example.test/pristeel-procurement.html', runScripts: 'outside-only', pretendToBeVisual: true,
});
const { window } = dom;
window.__pstCurrentProjectId = 'p1';
window._curProjId = 'p1';
window.PSTCanonicalProjectWorkflowV1 = { render() { return true; } };
window.__pstIntegrityLastData = {
  project: { id: 'p1', name: 'Canonical V2', client: 'Client', workflow_type: 'steel_trading', business_type: 'trading', status: 'Fituar', pipeline_stage: 'production_control' },
  workflowState: { project_id: 'p1', workflow_type: 'steel_trading', current_stage: 'customer_po', next_action_title: 'Përgatit Supplier PO', next_action_area: 'execution', human_gate: true, rfq_count: 2, supplier_offer_count: 2 },
  rfqs: [], supplierOffers: [], supplierDecisions: [], ourOffers: [], emails: [], projectDocs: [], invoicesOut: [],
};
window.eval(workbench);
assert.equal(window.PSTProjectWorkbenchV3.sync(), true);
const stages = [...window.document.querySelectorAll('.pwb3-phase')].map((node) => ({
  label: node.querySelector('b')?.textContent,
  state: node.classList.contains('current') ? 'current' : node.classList.contains('done') ? 'done' : 'upcoming',
}));
assert.equal(stages.find((stage) => stage.label === 'Customer PO')?.state, 'current');
assert.equal(stages.find((stage) => stage.label === 'Supplier PO')?.state, 'upcoming');
assert.equal(stages.find((stage) => stage.label === 'Closed')?.state, 'upcoming');
const next = window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData);
assert.equal(next.title, 'Përgatit Supplier PO');
assert.equal(next.area, 'execution');
assert.match(next.copy, /aprovim eksplicit/i);
dom.window.close();

console.log('PPPP V2 canonical project workflow smoke: ok');
