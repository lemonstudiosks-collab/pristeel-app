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

let account = '';
let authorizeCalls = 0;
let forceAuthorizeCalls = 0;
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
    // Simulate the real browser failure: after auth the legacy loader says Drive is OK but returns zero rows.
    drive: account ? { state: 'ok', rows: [] } : { state: 'not-authorized', rows: [] },
    integration: { driveState: account ? 'ok' : 'not-authorized' }
  })
};
w.PSTDriveImport = {
  authorize: async () => { authorizeCalls++; account = 'wrong@example.com'; return 'drive-token-wrong'; }
};
w.PSTGoogleWorkspaceAuth = {
  driveScope: 'https://www.googleapis.com/auth/drive',
  currentToken: () => account ? `token-${account}` : '',
  clear: () => { account = ''; },
  getDriveToken: async options => {
    assert(options && options.forceConsent, 'Account switch must force an explicit Google account choice');
    forceAuthorizeCalls++;
    account = 'sales@prissteel.com';
    return 'drive-token-sales';
  }
};
w.PSTProjectFirstV2 = {
  render: tab => { renderedTab = tab; }
};

w.fetch = async url => {
  const u = String(url);
  if (u.includes('/drive/v3/about?')) {
    return { ok: true, status: 200, json: async () => ({ user: { emailAddress: account, displayName: account.split('@')[0] } }) };
  }
  if (u.includes('/drive/v3/files/folder-1?')) {
    if (account !== 'sales@prissteel.com') return { ok: false, status: 404, json: async () => ({ error: { message: 'File not found' } }) };
    return { ok: true, status: 200, json: async () => ({ id: 'folder-1', name: 'EVOSYS ANF-8915', mimeType: 'application/vnd.google-apps.folder', owners: [{ emailAddress: 'sales@prissteel.com', displayName: 'PRISTEEL' }] }) };
  }
  if (u.includes('/drive/v3/files?q=')) {
    assert.strictEqual(account, 'sales@prissteel.com', 'Folder contents must only be read with the authorized project Drive account');
    assert(u.includes('supportsAllDrives=true'), 'Drive list must support all Drive locations');
    assert(u.includes('includeItemsFromAllDrives=true'), 'Drive list must include accessible shared locations');
    return { ok: true, status: 200, json: async () => ({ files: driveRows }) };
  }
  throw new Error(`Unexpected fetch: ${u}`);
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

  // First authorization deliberately selects the wrong Google account.
  link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(760);
  assert.strictEqual(authorizeCalls, 1, 'Initial Drive authorization must run exactly once');
  assert.strictEqual(w.__pstIntegrityLastData.drive.state, 'folder-inaccessible', 'Wrong Google account must be distinguished from an empty Drive folder');
  assert.match(w.document.querySelector('.pf2-note').textContent, /wrong@example\.com/, 'UI must identify the Google account that cannot access the project folder');
  assert.strictEqual(link.textContent, 'Ndërro llogarinë Drive', 'Wrong account must expose an explicit account-switch action');

  // Retry forces account choice and uses the project Drive owner account.
  link.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(120);
  assert.strictEqual(forceAuthorizeCalls, 1, 'Retry must force one explicit Google account switch');
  assert.strictEqual(w.__pstIntegrityLastData.drive.state, 'ok', 'Correct Google account must make the project folder readable');
  assert.strictEqual(w.__pstIntegrityLastData.drive.rows.length, 18, 'Correct account must expose the permanent Drive folder files');
  assert.strictEqual(renderedTab, 'files', 'Files tab must rerender after successful authorization');
  assert.strictEqual(w.__pstIntegrityLastData.files.length, 19, 'Unified files must contain legacy registry plus Drive files');
  assert.match(w.document.querySelector('.pf2-note').textContent, /sales@prissteel\.com/, 'Successful link must identify the connected Drive account');
  assert.match(w.document.querySelector('.pf2-note').textContent, /18 skedarë/, 'Successful link must report the real folder file count');

  console.log('Project Drive cross-device smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});