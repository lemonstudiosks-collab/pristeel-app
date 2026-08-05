const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM('<!doctype html><html><body><div class="pst-pm-head-actions"></div></body></html>', {
  runScripts: 'outside-only',
  url: 'https://example.test/'
});
const w = dom.window;
w.console = console;
w.PSTProjectDataIntegrity = { safe: async () => [] };
w.eval(fs.readFileSync('pristeel-project-bulk-gmail-recovery-v1.js', 'utf8'));

const B = w.PSTBulkGmailRecovery;
assert(B, 'Bulk recovery API missing');

const projects = [
  { id: 'airbus', name: '260784 Airbus', client: 'STACON' },
  { id: 'd22', name: 'STACON D-22/26', client: 'STACON' },
  { id: 'tennet', name: 'TenneT SPIE', client: 'SPIE' }
];
const emails = [
  { gmail_message_id: 'm-airbus', gmail_thread_id: 't-airbus', project_id: 'airbus', sent_at: '2026-08-01' },
  { gmail_message_id: 'm-d22', gmail_thread_id: 't-d22', project_id: 'd22', sent_at: '2026-08-02' },
  { gmail_message_id: 'm-tennet', gmail_thread_id: 't-tennet', project_id: null, sent_at: '2026-08-03' }
];
const links = [
  { project_id: 'tennet', gmail_message_id: 'm-tennet', gmail_thread_id: 't-tennet' },
  { project_id: 'airbus', gmail_message_id: 'm-airbus', gmail_thread_id: 't-airbus' }
];
const inventory = B.buildInventory(projects, emails, links);
const byId = Object.fromEntries(Array.from(inventory, x => [x.project.id, x]));
assert.deepStrictEqual(Array.from(byId.airbus.mails, x => x.gmail_message_id), ['m-airbus']);
assert.deepStrictEqual(Array.from(byId.d22.mails, x => x.gmail_message_id), ['m-d22']);
assert.deepStrictEqual(Array.from(byId.tennet.mails, x => x.gmail_message_id), ['m-tennet']);
assert(!Array.from(byId.airbus.mails).some(x => x.gmail_message_id === 'm-d22'), 'Same-client email leaked into Airbus');

assert.strictEqual(B.skipAttachment({ filename:'smime.p7s', mimeType:'application/pkcs7-signature', body:{ attachmentId:'a', size:1000 } }), true);
assert.strictEqual(B.skipAttachment({ filename:'image001.png', mimeType:'image/png', headers:[{name:'Content-Disposition',value:'inline'}], body:{ attachmentId:'b', size:12000 } }), true);
assert.strictEqual(B.skipAttachment({ filename:'260784_Angebot_Eurosteel.pdf', mimeType:'application/pdf', body:{ attachmentId:'c', size:240000 } }), false);

const deduped = B.uniqueFiles([
  { filename:'offer.pdf', size:100, key:'1' },
  { filename:'offer.pdf', size:100, key:'2' },
  { filename:'drawing.pdf', size:200, key:'3' }
]);
assert.deepStrictEqual(Array.from(deduped, x => x.filename), ['offer.pdf', 'drawing.pdf']);

console.log('Bulk Gmail recovery isolation smoke test passed.');
dom.window.close();
