const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-project-file-curation-v1.js', 'utf8');
assert(!/['"]DELETE['"]/.test(source), 'File curation must never delete original files');

(async () => {
  const calls = [];
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="pst-pi-body"></div></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/'
  });
  const w = dom.window;
  w.console = console;
  w.confirm = () => true;
  w.supaFetch = async (path, method, body) => {
    calls.push({ path, method: method || 'GET', body });
    if (String(path).startsWith('dashboard_action_states?')) return [];
    return [];
  };
  w.PSTDriveImport = {
    importFiles: async (_projectId, files) => ({ uploaded: files.length, skipped: 0, files: [] })
  };
  w.eval(source);

  const C = w.PSTProjectFileCuration;
  assert(C, 'Curation API missing');

  const selectedFile = { file_name: 'Eurosteel Offer.pdf', size: 2048 };
  const driveCopy = { name: 'Eurosteel Offer.pdf', size: '2048', id: 'drive-1' };
  assert.strictEqual(C.identity(selectedFile), C.identity(driveCopy), 'Imported selection must match its Drive record');
  assert.strictEqual(C.actionKey('p1', selectedFile), C.actionKey('p1', driveCopy), 'Curation key must remain stable across sources');

  const rows = C.collect({
    projectDocs: [selectedFile],
    attachmentLinks: [],
    inboxDocs: [],
    drive: { rows: [driveCopy, { name: 'Drawing.dwg', size: 5000, id: 'drive-2' }] },
    docs: []
  });
  assert.strictEqual(rows.length, 2, 'Duplicate file representations must be collapsed');

  await w.PSTDriveImport.importFiles('p1', [new w.File(['abc'], 'Chosen.pdf', { type: 'application/pdf' })]);
  const kept = calls.find(call => call.method === 'POST' && call.body && call.body.action_type === 'project_file_curation');
  assert(kept, 'Selected imports must be persisted as curated files');
  assert.strictEqual(kept.body.state, 'kept');
  assert.strictEqual(kept.body.source_ref, 'p1');

  dom.window.close();
  console.log('Project file curation smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
