const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-home" class="active"><section class="pst-ws-card"><div id="pst-ws-home-actions"><button class="pst-ws-action" data-project-id="p1"><span class="pst-ws-action-main"><span>Veprimi</span></span></button></div></section></div>
</body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
const w = dom.window;
let reads = 0;
w.supaFetch = async path => {
  reads++;
  if (path.startsWith('projects?')) return [{ id: 'p1', name: 'Projekti', client: 'Klienti', status: 'active' }];
  if (path.startsWith('documents_registry?')) return [{ id: 'd1', project_id: 'p1', doc_nr: 'QUO-1', followup_status: 'open', offer_state: { pst_sent_at: '2026-09-01T00:00:00Z' } }];
  return [];
};
w.PSTHomeCanonicalV1 = { getContext: () => ({ project: { name: 'Projekti', client: 'Klienti' } }) };
w.eval(fs.readFileSync('pristeel-automation-truth-v1.js', 'utf8'));

(async () => {
  const api = w.PSTAutomationTruthV1;
  await api.decorateHome();
  const label = w.document.querySelector('.pst-truth-project');
  const waiting = w.document.getElementById('pst-home-waiting');
  assert.ok(label && waiting, 'Home decorations render');
  assert.strictEqual(reads, 4, 'one batch of four reads');
  for (let i = 0; i < 5; i++) {
    w.document.dispatchEvent(new w.Event('pst:home-canonical-rendered'));
    await new Promise(resolve => setTimeout(resolve, 10));
    await api.decorateHome();
  }
  assert.strictEqual(reads, 4, 'rerenders do not repeat large Supabase reads within cache window');
  assert.strictEqual(w.document.querySelector('.pst-truth-project'), label, 'unchanged label is not rewritten');
  assert.strictEqual(w.document.getElementById('pst-home-waiting'), waiting, 'unchanged waiting lane is not rewritten');
  assert.strictEqual(w.document.querySelectorAll('#pst-home-waiting').length, 1, 'only one waiting lane');
  dom.window.close();
  console.log('Automation truth idle Home smoke test passed.');
})().catch(error => { console.error(error); dom.window.close(); process.exitCode = 1; });
