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
const euAwardMigration = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260923055720_add_eu_award_sales_project_promotion_v1.sql'),
  'utf8',
).toLowerCase();
const euAwardCorrection = fs.readFileSync(
  path.join(root, 'supabase/migrations/20260923060909_fix_eu_award_sales_contact_task_category_v1.sql'),
  'utf8',
).toLowerCase();
const schemaCompat = fs.readFileSync(path.join(root, 'pristeel-project-schema-compat.js'), 'utf8');
const workbench = fs.readFileSync(path.join(root, 'pristeel-project-workbench-v2.js'), 'utf8');
const tenderActions = fs.readFileSync(path.join(root, 'pristeel-tender-priority-actions-v1.js'), 'utf8');
const opportunities = fs.readFileSync(path.join(root, 'pristeel-project-centric-workflow-v1.js'), 'utf8');

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
assert(euAwardMigration.includes('pppp_promote_ted_award_to_sales_project_v1'), 'EU award approval RPC is missing');
assert(euAwardMigration.includes("workflow_type = coalesce(workflow_type, 'eu_award_sales')"), 'Existing exact projects must retain explicit EU workflow classification');
assert(euAwardMigration.includes("'tender_award', 'eu_award_sales'"), 'New EU award projects need canonical origin and workflow');
assert(euAwardMigration.includes('pppp_link_ted_email_to_approved_project_v1'), 'TED email continuity trigger is missing');
assert(euAwardMigration.includes('from public, anon'), 'Promotion RPC must not be anonymous');
assert(euAwardMigration.includes('human_send_required'), 'Promotion must preserve the outbound human gate');
assert(euAwardCorrection.includes("'pppp_v2_eu_award_sales', 'klient'"), 'Correction must be safe when replayed after the already-correct base migration');
assert(euAwardCorrection.includes('else\n    execute v_fixed;'), 'Correction migration must be idempotent for fresh database replays');
assert(opportunities.includes('data-pcw-ti="promote_award"'), 'TED award console must expose explicit approval');
assert(opportunities.includes('Aprovo · krijo Project'), 'TED award approval label must explain the state change');
assert(tenderActions.includes("db('rpc/pppp_promote_ted_award_to_sales_project_v1'"), 'Frontend must use the bounded promotion RPC');
assert(tenderActions.includes('Së pari aprovoje Opportunity-n'), 'Draft preparation must wait for the Project approval gate');
assert.doesNotThrow(() => new Function(schemaCompat));
assert.doesNotThrow(() => new Function(workbench));
assert.doesNotThrow(() => new Function(tenderActions));
assert.doesNotThrow(() => new Function(opportunities));

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
    supplierDecisions: overrides.supplierDecisions || [],
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

setData('eu_award_sales');
steps = labels();
assert.equal(steps[1].label, 'Kontaktimi');
assert.equal(steps[1].state, 'current', 'An approved EU award Project must start at contact preparation');
assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /kontaktet/i);

setData('eu_award_sales', { emails: [{ id: 'mail-1', direction: 'outgoing', sent_at: '2026-09-22T10:00:00Z' }] });
steps = labels();
assert.equal(steps[1].label, 'Kontaktimi');
assert.equal(steps[1].state, 'current');

setData('eu_award_sales', { emails: [{ id: 'mail-2', direction: 'incoming', sent_at: '2026-09-23T10:00:00Z', subject: 'Please quote' }] });
steps = labels();
assert.equal(steps[2].label, 'Client RFQ');
assert.equal(steps[2].state, 'current');
assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /Client RFQ/i);

for (const lane of ['eu_award_sales', 'self_tender', 'steel_trading']) {
  setData(lane, { supplierOffers: [{ id: 'supplier-offer-1', supplier: 'Supplier A', total_eur: 1000, currency: 'EUR' }] });
  assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /aprovo furnitorin/i, `${lane} must stop at the shared human supplier gate`);
  setData(lane, {
    supplierOffers: [{ id: 'supplier-offer-1', supplier: 'Supplier A', total_eur: 1000, currency: 'EUR' }],
    supplierDecisions: [{ id: 'decision-1', status: 'active', decision_type: 'selected_producer', supplier_offer_id: 'supplier-offer-1', supplier_name: 'Supplier A' }],
  });
  assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /Përgatit çmimin/i, `${lane} may advance only after the shared human supplier gate`);
}

setData('self_tender', {
  supplierOffers: [{ id: 'supplier-offer-1', supplier: 'Supplier A' }],
  supplierDecisions: [{ status: 'active', decision_type: 'selected_producer', supplier_offer_id: 'supplier-offer-1' }],
  ourOffers: [{ id: 'tender-draft', followup_status: 'draft', created_at: '2026-09-23T08:00:00Z' }],
});
assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /dosjen e tenderit/i, 'Self-tender draft must be described as price + dossier, not as a normal client offer');

setData('self_tender', {
  ourOffers: [{ id: 'tender-submission', followup_status: 'sent', sent_at: '2026-09-23T08:00:00Z' }],
});
assert.match(window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData).title, /Aplikimi është dorëzuar/i, 'Self-tender submission must wait for clarification/result');

setData('steel_trading', {
  ourOffers: [{ id: 'client-offer', followup_status: 'sent', sent_at: '2026-09-23T08:00:00Z' }],
  emails: [{ id: 'client-reply', direction: 'incoming', sent_at: '2026-09-23T09:00:00Z', subject: 'Please revise the offer' }],
});
const negotiation = window.PSTProjectWorkbenchV3.currentNext(window.__pstIntegrityLastData);
assert.match(negotiation.title, /negociatën/i, 'Client reply after an offer must enter the negotiation/revision decision');
assert.equal(negotiation.area, 'communication');

setData('steel_trading', { project: { status: 'Fituar', pipeline_stage: 'production_control' } });
steps = labels();
assert.equal(steps.at(-1).label, 'Ekzekutimi');
assert.equal(steps.at(-1).state, 'current');

setData('', { project: { business_type: 'hybrid' } });
steps = labels();
assert.equal(steps.length, 4, 'Unclassified projects must preserve the established generic workflow');

window.close();

const actionDom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'https://example.test/pristeel-procurement.html',
  runScripts: 'outside-only',
});
const aw = actionDom.window;
aw.setTimeout = (fn) => { fn(); return 1; };
aw.clearTimeout = () => {};
aw.confirm = () => true;
aw.alert = (message) => { throw new Error(`Unexpected alert: ${message}`); };
aw.open = () => null;
const tenderId = '11111111-1111-4111-8111-111111111111';
const projectId = '22222222-2222-4222-8222-222222222222';
const award = {
  id: tenderId,
  source_key: 'TED:award:111',
  publication_no: 'TED-111',
  title: 'Structural steel package',
  status: 'review',
  project_id: null,
  relevance_score: 96,
  payload: { source: 'TED', notice_phase: 'award', winner: { name: 'Winner GmbH', company_type: 'gc_epc', email: 'procurement@winner.example' } },
};
const rpcCalls = [];
aw.supaFetch = async (requestPath, method, body) => {
  if (String(requestPath).startsWith('kek_tender_watch?')) return [{ ...award }];
  if (requestPath === 'rpc/pppp_promote_ted_award_to_sales_project_v1') {
    rpcCalls.push({ method, body });
    award.project_id = projectId;
    award.status = 'promoted';
    return { ok: true, project_id: projectId, project_created: true, workflow_type: 'eu_award_sales', human_send_required: true };
  }
  return [];
};
aw.eval(tenderActions);
await assert.rejects(() => aw.PSTTenderPriorityActionsV2.prepareDraft(tenderId), /Së pari aprovoje Opportunity-n/);
const promotion = await aw.PSTTenderPriorityActionsV2.promoteAward(tenderId);
assert.equal(promotion.project_id, projectId);
assert.equal(rpcCalls.length, 1, 'One human approval must make exactly one bounded promotion call');
assert.deepEqual(JSON.parse(JSON.stringify(rpcCalls[0])), { method: 'POST', body: { p_tender_watch_id: tenderId } });
actionDom.window.close();

console.log('PPPP V2 workflow smoke OK (3 lanes + generic compatibility)');
