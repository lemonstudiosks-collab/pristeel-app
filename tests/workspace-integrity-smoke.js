const fs = require('fs');
const assert = require('assert');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const NEW_FILES = [
  'pristeel-project-data-integrity-v1.js',
  'pristeel-project-integrity-ui-v1.js',
  'pristeel-document-routing-integrity-v1.js',
  'pristeel-project-attachments-relations-v2.js',
  'pristeel-projects-modern-v1.js'
];

for (const file of NEW_FILES) {
  new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
}

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div class="app-shell"><aside class="sidebar"><div id="pst-ws-sidebar"><button class="pst-ws-navbtn" data-key="projects"></button></div></aside>
<main class="main"><div class="content">
<div id="page-home" class="page"></div><div id="page-oferta" class="page" style="display:none"></div><div id="page-invoices" class="page" style="display:none"></div>
</div></main></div><select id="global-proj"><option value="project-1">EVOSYS Laser — ANF-8915</option></select>
</body></html>`, {
  url: 'https://localhost/pristeel-procurement.html',
  runScripts: 'outside-only',
  pretendToBeVisual: true
});
const w = dom.window;
w.console = console;
w.scrollTo = () => {};
w.alert = () => {};
w.confirm = () => true;
w.open = () => ({ focus() {} });
w.fetch = async () => ({ ok: true, json: async () => ({ files: [] }) });
w.PST_DOC_CENTER = { selectedType: 'offer' };
w.PSTGoogleWorkspaceAuth = {
  gmailScope: 'gmail', driveScope: 'drive', currentToken: () => '', getGmailToken: async () => 'token'
};
w.resetOfferFormCalled = 0;
w.fillOfferNrCalled = 0;
w.resetOfferForm = () => { w.resetOfferFormCalled++; };
w.fillOfferNr = () => { w.fillOfferNrCalled++; };
w.invSwitchTab = () => {};
w.applyModuleChrome = () => {};
w.pstWsCreate = () => {};
w.pstOpenProjectLoss = () => {};
w.loadProject = () => {};
w.openOverview = () => {};
w.PSTDriveImport = { importFiles: async () => ({ uploaded: 1, skipped: 0 }) };

const project = {
  id: 'project-1', name: 'EVOSYS Laser — ANF-8915', client: 'Evosys Laser GmbH', ref: 'ANF-8915',
  status: 'aktiv', pipeline_stage: 'client_offer', deadline: '2026-08-10', created_at: '2026-06-19T10:00:00Z',
  updated_at: '2026-08-04T10:00:00Z', drive_folder_id: null
};
const directEmail = {
  id: 1, gmail_message_id: 'direct-1', gmail_thread_id: 'thread-1', project_id: 'project-1',
  subject: 'ANF-8915 oferta', from_email: 'Ulli.Goethel@evosys-laser.com', from_name: 'Ulli Göthel',
  to_emails: ['sales@prissteel.com'], cc_emails: ['Tanja.Kelinski@evosys-laser.com'], bcc_emails: [],
  sent_at: '2026-07-01T10:00:00Z', has_attachments: true, gmail_url: 'https://mail.google.com/direct-1'
};
const linkedEmail = {
  id: 2, gmail_message_id: 'linked-2', gmail_thread_id: 'thread-2', project_id: null,
  subject: 'PST-INV-2026-002', from_email: 'sales@prissteel.com', from_name: 'PRISTEEL',
  to_emails: ['Tanja.Kelinski@evosys-laser.com'], cc_emails: [], bcc_emails: ['147958987@bcc.eu1.hubspot.com'],
  sent_at: '2026-07-23T10:00:00Z', has_attachments: true, gmail_url: 'https://mail.google.com/linked-2'
};
const writes = [];
function resultFor(path) {
  if (path.startsWith('projects?id=eq.project-1')) return [project];
  if (path.startsWith('projects?select=')) return [project];
  if (path.startsWith('project_email_links?project_id=eq.project-1')) return [{ id: 10, project_id: 'project-1', gmail_message_id: 'linked-2', created_at: '2026-07-23' }];
  if (path.startsWith('project_emails?project_id=eq.project-1')) return [directEmail];
  if (path.includes('project_emails?gmail_message_id=in.') && path.includes('linked-2')) return [linkedEmail];
  if (path.startsWith('project_contacts?project_id=eq.project-1')) return [];
  if (path.startsWith('contacts?email=not.is.null')) return [{ id: 9, email: 'ulli.goethel@evosys-laser.com', person: 'Ulli Göthel', company: 'Evosys Laser GmbH', role: 'Purchasing', kind: 'client' }];
  if (path.startsWith('bom_items?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', description: 'Schweissgestell', quantity: 1 }];
  if (path.startsWith('rfq_log?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', supplier_name: 'Eurosteel', status: 'received' }];
  if (path.startsWith('offers?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', supplier: 'Eurosteel', total_eur: 1393 }];
  if (path.startsWith('documents_registry?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', series: 'QUO', doc_nr: 'PST-QUO-2026-001' }];
  if (path.startsWith('invoices_out?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', invoice_nr: 'PST-INV-2026-002', gross_amount: 1599.6, currency: 'EUR' }];
  if (path.startsWith('commercial_adjustments?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', document_nr: 'PST-CN-2026-002', type: 'credit_note' }];
  if (path.startsWith('project_docs?project_id=eq.project-1')) return [{ id: 1, project_id: 'project-1', file_name: 'EVO_119.029_0.PDF' }];
  if (path.startsWith('project_attachment_links?project_id=eq.project-1')) return [];
  if (path.startsWith('offers_inbox?project_id=eq.project-1')) return [];
  if (path.startsWith('invoices_in?project_id=eq.project-1')) return [];
  if (path.startsWith('bank_guarantees?')) return [];
  if (path.startsWith('crm_deals?')) return [{ dealname: 'EVOSYS ANF-8915', amount: 1599.6, dealstage: 'closedwon', hs_object_id: 'deal-1' }];
  return [];
}
w.supaFetch = async (path, method, body) => {
  if (method && method !== 'GET') { writes.push({ path, method, body }); return []; }
  return resultFor(path);
};
w.PSTEmail = {
  auth: async () => 'gmail-token',
  gmail: async (path) => ({
    id: path.includes('linked-2') ? 'linked-2' : 'direct-1',
    payload: { headers: [{ name: 'From', value: 'Ulli Göthel <Ulli.Goethel@evosys-laser.com>' }], parts: [
      { filename: path.includes('linked-2') ? 'PST-INV-2026-002.pdf' : 'ANF-8915.pdf', mimeType: 'application/pdf', body: { attachmentId: 'att-1', size: 1200 }, headers: [{ name: 'Content-Disposition', value: 'attachment' }] }
    ] }
  }),
  map: async (ids, concurrency, fn) => Promise.all(ids.map(fn))
};

function legacyShow(page) {
  w.document.querySelectorAll('.page').forEach(el => { el.classList.remove('active'); el.style.display = 'none'; });
  const target = w.document.getElementById('page-' + page);
  if (target) { target.classList.add('active'); target.style.display = 'block'; }
}
w.showPage = legacyShow;
w.pstV2Go = legacyShow;
w.__pstWorkspaceLegacy = { showPage: legacyShow, pstV2Go: legacyShow };
w.pstWorkspaceGo = key => { if (key === 'projects') return; legacyShow(key); };

function load(file) { w.eval(fs.readFileSync(file, 'utf8') + `\n//# sourceURL=${file}`); }
function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  load('pristeel-project-data-integrity-v1.js');
  const data = await w.PSTProjectDataIntegrity.load('project-1');
  assert.strictEqual(data.emails.length, 2, 'Direct and relation-linked emails must be unified');
  assert.ok(data.contacts.some(c => /ulli/i.test(c.name)), 'Contacts must be derived from linked emails');
  assert.strictEqual(data.ourOffers.length, 1, 'Our QUO document must be identified');
  assert.strictEqual(data.supplierOffers.length, 1, 'Supplier offer must stay separate');
  assert.strictEqual(data.invoicesOut.length, 1, 'Outgoing invoice must load');
  assert.strictEqual(data.adjustments.length, 1, 'Credit/debit note must load');
  assert.strictEqual(writes.length, 0, 'Project data load must not write to the database');

  load('pristeel-project-integrity-ui-v1.js');
  await w.pstOpenProjectWorkspace('project-1');
  assert.ok(w.document.body.textContent.includes('EVOSYS Laser'), 'Project workspace title missing');
  assert.ok(w.document.body.textContent.includes('Emaila'), 'Project email count missing');
  const projectHeader=w.document.querySelector('#page-workspace-project .pst-pi-actions');
  assert.ok(projectHeader,'Project header actions missing');
  assert.ok(projectHeader.textContent.includes('Projektet'),'Project back action must remain');
  assert.ok(!projectHeader.textContent.includes('Pamja e vjetër'),'Legacy project-view action must not be rendered by the integrity UI owner');
  assert.ok(!projectHeader.textContent.includes('Puno me projektin'),'Generic legacy work action must not be rendered by the integrity UI owner');
  assert.ok(!projectHeader.textContent.includes('Rifresko'),'Manual refresh noise must not be rendered in the main project header');
  w.pstPiTab('communication');
  assert.ok(w.document.body.textContent.includes('Ulli Göthel'), 'Project contacts are not visible');
  w.pstPiTab('commercial');
  assert.ok(w.document.body.textContent.includes('PST-INV-2026-002'), 'Project invoice is not visible');

  load('pristeel-document-routing-integrity-v1.js');
  w.PST_DOC_CENTER.selectedType = 'offer';
  w.pstCreateSelectedDocument();
  await wait(160);
  assert.ok(w.document.getElementById('page-oferta').classList.contains('active'), 'Offer route did not open the real form');
  assert.ok(w.resetOfferFormCalled > 0, 'Offer form was not reset');
  assert.ok(w.fillOfferNrCalled > 0, 'Offer number was not generated');

  load('pristeel-project-attachments-relations-v2.js');
  await w.pstImportProjectEmailFiles('project-1');
  assert.ok(w.document.getElementById('pfa2-bg'), 'Relation-aware attachment modal did not open');
  assert.ok(w.document.body.textContent.includes('PST-INV-2026-002.pdf'), 'Attachment from project_email_links was not included');
  w.document.getElementById('pfa2-close').click();

  load('pristeel-projects-modern-v1.js');
  await w.pstProjectsModernOpen();
  assert.ok(w.document.querySelector('.pst-pm-row'), 'Modern project row-card did not render');
  assert.ok(w.document.body.textContent.includes('EVOSYS Laser'), 'Modern project list lost the project');
  const board = w.document.querySelector('[data-pm-view="board"]');
  board.click();
  assert.ok(w.document.querySelector('.pst-pm-board'), 'Board view did not render');

  console.log('Workspace integrity smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
