const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
  <button data-pf2-tab="files">Skedarët</button>
  <div id="pst-pi-body">
    <div class="pf2-note">Ky projekt përdor një dosje permanente Google Drive.</div>
    <a class="pf2-btn p" target="_blank" href="https://drive.google.com/drive/folders/folder-1">Hap Drive</a>
  </div>
</body></html>`, {
  runScripts: 'outside-only',
  url: 'https://example.test/'
});
const w = dom.window;
w.console = console;

let authorized = false;
let authorizeCalls = 0;
let renderedTab = '';
const driveRows = Array.from({ length: 18 }, (_, i) => ({
  id: `drive-${i + 1}`,
  name: `file-${i + 1}.pdf`,
  mimeType: 'application/pdf',
  webViewLink: `https://drive.google.com/file/d/drive-${i + 1}/view`
}));

w.PSTProjectDataIntegrity = {
  load: async () => ({
    project: { id: 'project-1', drive_folder_id: 'folder-1' },
    docs: [{ id: 'legacy-1', file_name: 'legacy.pdf' }],
    projectDocs: [],
    attachmentLinks: [],
    inboxDocs: [],
    mailAttachments: [],
    files: [],
    drive: authorized ? { state: 'ok', rows: driveRows } : { state: 'not-authorized', rows: [] }
  })
};
w.PSTDriveImport = {
  authorize: async () => { authorizeCalls++; authorized = true; return 'drive-token'; }
};
w.PSTProjectFirstV2 = {
  render: tab => { renderedTab = tab; }
};

w.eval(fs.readFileSync('pristeel-project-file-unifier-v2.js', 'utf8'));

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  const first = await w.PSTProjectDataIntegrity.load('project-1');
  w.__pstIntegrityLastData = first;
  assert.strictEqual(first.files.length, 1, 'Legacy file unification must stay intact before Drive auth');

  await wait(720);
  const link = w.document.querySelector('a.pf2-btn');
  assert.strictEqual(authorizeCalls, 0, 'Drive authorization must never start automatically');
  assert.strictEqual(link.textContent, 'Lidhu me Drive', 'New device must get an explicit Drive connect action');
  assert.strictEqual(link.hasAttribute('target'), false, 'Connect action must not open Drive before authorization');
  assert.match(w.document.querySelector('.pf2-note').textContent, /Autorizo Drive në këtë pajisje/, 'Files tab must explain why Drive files are missing');

  link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(80);

  assert.strictEqual(authorizeCalls, 1, 'Drive authorization must run exactly once after the user click');
  assert.strictEqual(w.__pstIntegrityLastData.drive.state, 'ok', 'Project data must reload after Drive authorization');
  assert.strictEqual(w.__pstIntegrityLastData.drive.rows.length, 18, 'Reloaded project must expose the permanent Drive folder files');
  assert.strictEqual(renderedTab, 'files', 'Files tab must rerender after successful authorization');
  assert.strictEqual(w.__pstIntegrityLastData.files.length, 19, 'Unified files must contain legacy registry plus Drive files');

  console.log('Project Drive cross-device smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
