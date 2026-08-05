const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'https://localhost/' });
const w = dom.window;
w.console = console;
w.fetch = async () => ({ ok: true, json: async () => ({ files: [] }) });

const project = {
  id: 'airbus-1', name: '260784_Airbus H24X_Anfrage Fertigung', client: 'Stacon', ref: '260784',
  status: 'pritje', pipeline_stage: 'rfq_in'
};
const eurosteel = {
  id: 'offer-eurosteel', supplier: 'EUROSTEEL', project_name: 'STACON',
  file_name: 'EUROSTEEL_Angebot_260784.pdf', total_eur: 42100, created_at: '2026-06-01'
};
const staconFile = {
  id: 'file-stacon', project_ref: '260784', project_name: 'STACON', file_name: 'Airbus_H24X_260784_drawings.zip'
};

w.supaFetch = async path => {
  if (path.startsWith('projects?id=eq.airbus-1')) return [project];
  if (path.startsWith('offers?select=*')) return [eurosteel];
  if (path.startsWith('project_docs?select=*')) return [staconFile];
  if (path.startsWith('contacts?')) return [];
  if (path.startsWith('crm_deals?')) return [];
  return [];
};

w.eval(fs.readFileSync('pristeel-project-data-integrity-v1.js', 'utf8'));

(async () => {
  const data = await w.PSTProjectDataIntegrity.load('airbus-1');
  assert.ok(data.supplierOffers.some(x => x.supplier === 'EUROSTEEL'), 'EUROSTEEL offer was not recovered through project identity');
  assert.ok(data.projectDocs.some(x => x.file_name.includes('260784')), 'STACON/Airbus file was not recovered through project reference');
  assert.ok(data.files.some(x => x.file_name && x.file_name.includes('Airbus_H24X')), 'Recovered project file was not exposed in the unified files collection');
  assert.ok(w.PSTProjectDataIntegrity.relationScore(eurosteel, project) >= 100, 'Strong project relation score was not produced');
  console.log('Project recovery smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
