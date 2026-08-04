const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://localhost/pristeel-procurement.html',
  runScripts: 'outside-only'
});
const w = dom.window;
let contactSyncs = 0;
let refreshes = 0;
const writes = [];
w.console = console;
w.__pstIntegrityLastData = { project: { id: 'project-1' } };
w.pstSyncProjectContacts = async id => { assert.strictEqual(id, 'project-1'); contactSyncs++; };
w.pstPiRefresh = () => { refreshes++; };
w.supaFetch = async (path, method, body) => { if (method && method !== 'GET') writes.push({ path, method, body }); return []; };
w.pstPiRepair = async () => { await w.supaFetch('project_emails?id=eq.1', 'PATCH', { project_id: 'project-1' }); };
w.eval(fs.readFileSync('pristeel-project-integrity-safety-v2.js', 'utf8'));

(async () => {
  await w.pstPiRepair();
  assert.strictEqual(contactSyncs, 1, 'Contact sync was not called');
  assert.strictEqual(refreshes, 1, 'Project workspace was not refreshed');
  assert.strictEqual(writes.length, 0, 'Safety patch must not rewrite email relations');
  console.log('Workspace safety smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
