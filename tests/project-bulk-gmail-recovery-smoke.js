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
w.eval(fs.readFileSync('pristeel-project-linked-gmail-recovery-v2.js', 'utf8'));

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

const L = w.PSTLinkedGmailRecoveryV2 && w.PSTLinkedGmailRecoveryV2._test;
assert(L, 'Linked Gmail recovery test API missing');

const collapsed = L.collapseRepeatedFiles([
  { key:'m1:a1', filename:'RECHNUNG - PRISTEEL - EVOSYS LASER .pdf', size:70000, mimeType:'application/pdf', internalDate:1000 },
  { key:'m2:a2', filename:'RECHNUNG - PRISTEEL - EVOSYS LASER .pdf', size:70000, mimeType:'application/pdf', internalDate:2000 },
  { key:'m3:a3', filename:'image001.png', size:3300, mimeType:'image/png', inline:true, internalDate:3000 },
  { key:'m4:a4', filename:'RECHNUNG - PRISTEEL - EVOSYS LASER .pdf', size:71000, mimeType:'application/pdf', internalDate:4000 }
]);
assert.strictEqual(collapsed.files.length, 2, 'Exact Gmail copies should collapse but changed-size files must remain');
assert.strictEqual(collapsed.duplicates, 1, 'Repeated exact attachment was not counted');
assert.strictEqual(collapsed.signatures, 1, 'Inline signature was not filtered');
assert.strictEqual(collapsed.files[1].duplicateCount, 2, 'Collapsed representative should record its Gmail copy count');
assert.strictEqual(collapsed.files[1].internalDate, 2000, 'Newest repeated Gmail copy should represent the group');

const technical = [
  { key:'pdf', filename:'EVO_119.029_0.PDF', size:149000, internalDate:1000 },
  { key:'dxf', filename:'EVO_119.029_0.DXF', size:3000000, internalDate:1000 },
  { key:'stp', filename:'EVO_119.029_0.stp', size:1800000, internalDate:1000 }
];
L.markRecommended(technical);
assert(technical.every(x => x.recommended === true), 'PDF/DXF/STP with the same basename are distinct technical files and should all remain selectable');
assert.notStrictEqual(L.versionFamily(technical[0]), L.versionFamily(technical[1]), 'Different technical extensions must not share one version family');

const conservative = [
  { key:'eml', filename:'AW Evosys Laser - Zollcon Anfrage.eml', size:1400000, internalDate:6000 },
  { key:'tpl', filename:'Evosys Briefvorlage blanko.docx', size:54000, internalDate:5000 },
  { key:'pdf2', filename:'2026-08-06_Vollmacht Abfertigung 2025 - DE.pdf', size:321000, internalDate:4000 },
  { key:'inv', filename:'RECHNUNG - PRISTEEL - EVOSYS LASER .pdf', size:70000, internalDate:3000 },
  { key:'cmr', filename:'CMR AL1000170755.pdf', size:73000, internalDate:2000 }
];
L.markRecommended(conservative);
assert.strictEqual(conservative[0].recommended, false, '.eml exports must stay visible but not be auto-selected');
assert.strictEqual(conservative[1].recommended, false, 'Blank/template documents must stay visible but not be auto-selected');
assert.strictEqual(conservative[2].recommended, true, 'Operational PDFs should remain auto-selected');
assert.strictEqual(conservative[3].recommended, true, 'Invoices should remain auto-selected');
assert.strictEqual(conservative[4].recommended, true, 'CMR documents should remain auto-selected');
assert(/Email export/.test(conservative[0].selectionNote), 'Email export must explain why it is manual');
assert(/Template/.test(conservative[1].selectionNote), 'Template must explain why it is manual');

console.log('Bulk + linked Gmail recovery isolation/dedup/selection smoke test passed.');
dom.window.close();
process.exit(0);