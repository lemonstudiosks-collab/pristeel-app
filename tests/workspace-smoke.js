const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const legacyPages = ['qendra','import','newproject','bom','rfq','offers','ranking','outreach','finance','contacts','kalkulator','settings','contracts','library','invoices','oferta'];
const pageHtml = legacyPages.map(id => `<div id="page-${id}" class="page" style="display:none">${id}</div>`).join('');
const dom = new JSDOM(`<!doctype html><html><head></head><body class="pst-ui-v2 pst-alive"><div class="app-shell"><aside class="sidebar"><div id="pst-v2-sidebar"></div></aside><main class="main"><div class="content"><div id="page-home" class="page"></div>${pageHtml}</div></main></div><select id="global-proj"></select></body></html>`, {
  url: 'https://lemonstudiosks-collab.github.io/pristeel-app/pristeel-procurement.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});

const w = dom.window;
w.console = console;
w.scrollTo = () => {};
w.open = () => ({ focus() {} });
w.alert = () => {};
w.confirm = () => true;
w.authGetSession = () => ({ access_token: 'test', refresh_token: 'test' });
w.PSTGoogleWorkspaceAuth = {};
w.projects = [];

const sampleProject = {
  id: 'project-1', name: 'Test Project', client: 'Test Client', ref: 'REF-1',
  status: 'aktiv', pipeline_stage: 'technical_review', created_at: '2026-08-01T10:00:00Z',
  updated_at: '2026-08-04T08:00:00Z', deadline: '2026-08-20'
};
const sampleInvoice = {
  id: 'invoice-1', invoice_nr: 'PST-INV-2026-002', client: 'Evosys Laser GmbH',
  project: 'EVOSYS Laser — ANF-8915', currency: 'EUR', gross_amount: 1599.60,
  vat_applicable: false, vat_rate: 0,
  items: [{ description: 'Steel fabrication', kg: 516, price_kg: 3.10 }],
  created_at: '2026-07-23T10:00:00Z'
};

w.supaFetch = async function(path, method, body) {
  if (path.startsWith('projects?')) return [sampleProject];
  if (path.startsWith('invoices_out?')) return [sampleInvoice];
  if (path.startsWith('commercial_adjustments?')) return [];
  if (path === 'commercial_adjustments' && method === 'POST') return [{ id: 'adjustment-1', ...body }];
  return [];
};

function showPage(page) {
  w.document.querySelectorAll('.page').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
  const target = w.document.getElementById(`page-${page}`);
  if (!target) throw new Error(`Missing legacy page: ${page}`);
  target.classList.add('active');
  target.style.display = 'block';
}
w.showPage = showPage;
w.pstV2Go = showPage;
w.goHome = () => showPage('qendra');
w.renderHome = () => showPage('qendra');
w.openOverview = () => {};
w.loadProject = () => {};
w.newProject = () => showPage('newproject');
w.openCmdK = () => {};
w.applyModuleChrome = () => {};

function load(file) {
  const source = fs.readFileSync(file, 'utf8');
  w.eval(`${source}\n//# sourceURL=${file}`);
}
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function active(id) {
  const el = w.document.getElementById(id);
  return !!el && el.classList.contains('active') && el.style.display !== 'none';
}

(async () => {
  load('pristeel-document-center-core.js');
  load('pristeel-document-adjustments-v3.js');
  load('pristeel-workspace-architecture-v1.js');
  load('pristeel-workspace-release-fix.js');
  await wait(900);

  assert.strictEqual(typeof w.pstWorkspaceGo, 'function', 'Workspace router missing');
  assert.ok(w.document.getElementById('pst-ws-sidebar'), 'Workspace sidebar missing');

  w.pstWorkspaceGo('finance');
  await wait(30);
  assert.ok(active('page-finance'), 'Finance route did not open');

  w.pstWorkspaceGo('contacts');
  await wait(30);
  assert.ok(active('page-contacts'), 'Contacts route did not open');

  w.pstWorkspaceGo('apps');
  await wait(180);
  const moduleTitle = [...w.document.querySelectorAll('.pst-ws-navbtn span')].find(el => el.textContent.trim() === 'Modulet');
  assert.ok(moduleTitle, 'Apps was not renamed to Modulet');
  const procurementCard = [...w.document.querySelectorAll('.pst-ws-app')].find(card => card.textContent.includes('Prokurimi'));
  assert.ok(procurementCard, 'Procurement module card missing');
  procurementCard.click();
  await wait(30);
  assert.ok(active('page-bom'), 'Procurement card did not open BOM');

  w.pstWorkspaceGo('projects');
  await wait(180);
  assert.ok(w.document.getElementById('pst-release-project-list').textContent.includes('Test Project'), 'Projects did not load');

  w.pstOpenDocumentCenter('invoice');
  await wait(180);
  assert.strictEqual(w.document.getElementById('pst-dc-filter').value, 'invoice', 'Invoice filter was not applied');
  assert.strictEqual(w.document.querySelector('.pst-dc-toolbar-title').textContent, 'Faturat', 'Invoice register title is wrong');

  await w.pstOpenAdjustment('credit_note', 'invoice-1');
  await wait(100);
  const modalText = w.document.getElementById('pst-adj-bg').textContent;
  assert.ok(modalText.includes('Pesha reale'), 'Real-weight field missing');
  assert.ok(modalText.includes('Çmimi/kg'), 'Editable price/kg field missing');
  const actual = w.document.querySelector('#pst-adj-v3-lines input[step="0.001"]');
  assert.ok(actual, 'Actual weight input missing');
  actual.value = '500';
  actual.dispatchEvent(new w.Event('input', { bubbles: true }));
  await wait(20);
  const summary = w.document.getElementById('pst-adj-v3-summary').textContent.replace(/\s+/g, ' ');
  assert.ok(summary.includes('49,60') || summary.includes('49.60'), `Credit calculation is wrong: ${summary}`);

  w.pstWsRefreshHome({ preventDefault() {}, stopPropagation() {} });
  await wait(100);
  assert.ok(w.document.getElementById('page-workspace-home'), 'Home refresh damaged workspace');

  console.log('Workspace browser smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
