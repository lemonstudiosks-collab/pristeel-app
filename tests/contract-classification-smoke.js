const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only' });
const w = dom.window;
w.console = console;
const writes = [];
const rows = [
  { id: 1, type: 'nda', title: 'Nënkontratë (Furnitori)', company: 'EUROSTEEL' },
  { id: 2, type: 'nda', title: 'Werkvertrag (Blerësi)', company: 'STACON GmbH' },
  { id: 3, type: 'nda', title: 'NDA', company: 'Sector Construction' }
];
w.supaFetch = async (path, method, body) => {
  method = method || 'GET';
  if (method === 'PATCH') { writes.push({ path, body }); return []; }
  if (path.startsWith('contracts?')) return rows.map(x => ({ ...x }));
  return [];
};
w.eval(fs.readFileSync('pristeel-contract-classification-v2.js', 'utf8'));

(async () => {
  const result = await w.supaFetch('contracts?order=created_at.desc', 'GET');
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.strictEqual(result[0].type, 'sub', 'Supplier subcontract stayed in NDA');
  assert.strictEqual(result[1].type, 'sales', 'Buyer Werkvertrag stayed in NDA');
  assert.strictEqual(result[2].type, 'nda', 'Real NDA was moved incorrectly');
  assert.ok(writes.some(x => x.path === 'contracts?id=eq.1' && x.body.type === 'sub'), 'Supplier contract correction was not persisted');
  assert.ok(writes.some(x => x.path === 'contracts?id=eq.2' && x.body.type === 'sales'), 'Sales contract correction was not persisted');
  assert.ok(!writes.some(x => x.path === 'contracts?id=eq.3'), 'Correct NDA should not be patched');
  console.log('Contract classification smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
