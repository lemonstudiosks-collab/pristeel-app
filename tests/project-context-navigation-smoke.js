const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
<select id="global-proj"><option value="tennet">PROJEKT TENNET · SPIE</option></select>
<input id="i-projname"><input id="i-client"><input id="i-ref"><span id="proj-badge"></span>
<div id="page-bom" class="page"></div>
</body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
const w = dom.window;
w.console = console;
const paths = [];
const opened = [];
const navigated = [];
const loaded = [];
const project = { id: 'p-airbus', name: '260784_Airbus H24X_Anfrage Fertigung', client: 'Stacon', ref: '' };

w.PSTProjectDataIntegrity = {
  safe: async path => {
    paths.push(path);
    if (path.startsWith('files?project_id=eq.p-airbus')) {
      return [{ id: 'file-1', file_name: '260784 drawing.pdf', file_type: 'application/pdf', project_id: 'p-airbus' }];
    }
    return [];
  },
  load: async () => ({
    project,
    docs: [
      { id: 'quote-airbus', series: 'QUO', doc_nr: 'PST-QUO-AIRBUS', project: '260784 Airbus H24X Anfrage Fertigung' },
      { id: 'quote-wrong', series: 'QUO', doc_nr: 'D-22/26', project: 'STACON D-22/26' }
    ],
    offers: [], projectDocs: [], attachmentLinks: [], inboxDocs: [],
    drive: { rows: [], state: 'no-folder' }, mailAttachments: [], ourOffers: [], supplierOffers: [], files: []
  })
};
w.__pstWorkspaceLegacy = { showPage: page => navigated.push(page) };
w.loadProject = (id, silent) => loaded.push({ id, silent });
w.oaOpenQuoteModal = id => opened.push(id);
w.open = () => {};

w.eval(fs.readFileSync('pristeel-project-context-navigation-v1.js', 'utf8'));

(async () => {
  const data = await w.PSTProjectDataIntegrity.load(project.id);
  assert.deepStrictEqual(data.ourOffers.map(x => x.id), ['quote-airbus'], 'Offers from another STACON project leaked into Airbus');
  assert.ok(data.files.some(x => x.id === 'file-1'), 'Real files table metadata was not included');
  assert.ok(paths.some(path => path.includes('select=id,file_name,file_type,size_kb,created_at,project_id,page_context')), 'Files metadata query is missing');
  assert.ok(paths.every(path => !path.includes('file_base64')), 'List query must never request file_base64');
  assert.strictEqual(w.document.getElementById('global-proj').value, project.id, 'Active project selector was not repaired');
  assert.strictEqual(w.document.getElementById('i-projname').value, project.name);

  w.__pstIntegrityLastData = data;
  w.pstProjectOpenOurOffer(0);
  assert.deepStrictEqual(opened, ['quote-airbus'], 'Saved quotation did not open with the real modal');

  w.pstProjectGoStep('bom');
  await new Promise(resolve => setTimeout(resolve, 260));
  assert.ok(loaded.some(x => x.id === project.id && x.silent === true), 'Legacy project context was not loaded before navigation');
  assert.ok(navigated.includes('bom'), 'Workflow step did not navigate to the BOM page');
  assert.strictEqual(w.document.getElementById('global-proj').value, project.id, 'Navigation lost the active project');

  console.log('Project context and navigation smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
