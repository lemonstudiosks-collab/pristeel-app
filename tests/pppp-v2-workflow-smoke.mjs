import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260923053249_add_pppp_v2_workflow_type.sql'),
  'utf8',
).toLowerCase();
const correction = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260923054055_correct_pppp_v2_workflow_backfill.sql'),
  'utf8',
).toLowerCase();
const schemaCompat = fs.readFileSync(path.join(root, 'pristeel-project-schema-compat.js'), 'utf8');
const workbench = fs.readFileSync(path.join(root, 'pristeel-project-workbench-v2.js'), 'utf8');

for (const lane of ['eu_award_sales', 'self_tender', 'steel_trading']) {
  assert(migration.includes(`'${lane}'`), `Migration must allow ${lane}`);
  assert(schemaCompat.includes(`value="${lane}"`), `Project form must expose ${lane}`);
}
assert(migration.includes("k.project_id = p.id"), 'Tender backfill must require an exact linked tender');
assert(migration.includes("coalesce(k.payload->>'notice_phase', 'opportunity') <> 'award'"), 'Award notices must not be backfilled as self tenders');
assert(migration.includes("lower(coalesce(business_type, '')) = 'trading'"), 'Existing trading projects need deterministic V2 classification');
assert(correction.includes("workflow_type = 'self_tender'"));
assert(correction.includes("lower(coalesce(business_type, '')) = 'trading'"), 'Trading evidence must repair synthetic tender collisions');
assert(correction.includes("p.origin_type = 'tender'"), 'Future self-tender backfill must require canonical tender origin');
assert(correction.includes("!~* '^acceptance:'"), 'Acceptance fixtures must never classify a production workflow');
assert.doesNotThrow(() => new Function(schemaCompat));
assert.doesNotThrow(() => new Function(workbench));

const dom = new JSDOM(
  '<!doctype html><html><head></head><body><section id="page-workspace-project" class="active"><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></section></body></html>',
  { url: 'https://example.test/pristeel-procurement.html', runScripts: 'outside-only', pretendToBeVisual: true },
);
const { window } = dom;
window.__pstCurrentProjectId = 'v2-project';
window._curProjId = 'v2-project';
window.PSTCanonicalProjectWorkflowV1 = { render() { return true; } };

function setData(workflowType, overrides = {}) {
  window.__pstIntegrityLastData = {
    project: {
      id: 'v2-project',
      name: 'PPPP V2 test',
      client: 'Client',
      status: 'aktiv',
      pipeline_stage: 'rfq_in',
      business_type: workflowType === 'steel_trading' ? 'trading' : 'fabrication',
      workflow_type: workflowType,
      ...overrides.project,
    },
    rfqs: overrides.rfqs || [],
    supplierOffers: overrides.supplierOffers || [],
    ourOffers: overrides.ourOffers || [],
    emails: overrides.emails || [],
    projectDocs: [],
    invoicesOut: [],
  };
}

window.eval(workbench);

function labels() {
  assert.equal(window.PSTProjectWorkbenchV3.sync(), true);
  return [...window.document.querySelectorAll('.pwb3-phase')].map((node) => ({
    label: node.querySelector('b')?.textContent,
    state: node.classList.contains('current') ? 'current' : node.classList.contains('done') ? 'done' : 'upcoming',
  }));
}

setData('steel_trading');
let steps = labels();
assert.deepEqual(steps.map((step) => step.label), ['Client RFQ', 'Furnitorët', 'Krahasimi', 'Oferta', 'Negociata', 'Won / Lost', 'Ekzekutimi']);
assert.equal(steps[0].state, 'current');

setData('self_tender', { rfqs: [{ id: 'rfq-1' }] });
steps = labels();
assert.deepEqual(steps.map((step) => step.label), ['Tenderi', 'Kërkesat', 'Furnitorët', 'Çmimi & dosja', 'Aplikimi', 'Won / Lost']);
assert.equal(steps[2].state, 'current');

setData('eu_award_sales', { emails: [{ id: 'mail-1', direction: 'outgoing', sent_at: '2026-09-22T10:00:00Z' }] });
steps = labels();
assert.equal(steps[1].label, 'Kontaktimi');
assert.equal(steps[1].state, 'current');

setData('steel_trading', { project: { status: 'Fituar', pipeline_stage: 'production_control' } });
steps = labels();
assert.equal(steps.at(-1).label, 'Ekzekutimi');
assert.equal(steps.at(-1).state, 'current');

setData('', { project: { business_type: 'hybrid' } });
steps = labels();
assert.equal(steps.length, 4, 'Unclassified projects must preserve the established generic workflow');

window.close();
console.log('PPPP V2 workflow smoke OK (3 lanes + generic compatibility)');
