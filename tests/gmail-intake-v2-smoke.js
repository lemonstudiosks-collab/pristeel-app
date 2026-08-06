const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const handoffSource = fs.readFileSync('pristeel-gmail-tab-handoff.js', 'utf8');
  const authSource = fs.readFileSync('pristeel-google-workspace-auth.js', 'utf8');
  const intakeSource = fs.readFileSync('pristeel-gmail-intake-v2.js', 'utf8');
  const revisionSource = fs.readFileSync('pristeel-gmail-intake-revision-fix-v1.js', 'utf8');
  const bootstrap = fs.readFileSync('pristeel-project-emails.js', 'utf8');

  assert(!/window\.close\s*\(|\.close\s*\(\)/.test(handoffSource), 'Gmail launch must never close a tab');
  assert(!/BroadcastChannel|handoff_request|handoff_ack/.test(handoffSource), 'Cross-tab handoff must stay removed');
  assert(!/location\.assign\s*\(|PRISTEEL_MAIN/.test(handoffSource), 'Gmail launch must not navigate or take over a named window');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(handoffSource), 'Gmail launch must be bounded and direct');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(intakeSource), 'Intake must not poll or observe the whole page');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(revisionSource), 'Intake helpers must be bounded');
  assert(authSource.includes('authorizeForIntake'), 'Combined Gmail and Drive authorization is missing');
  assert(authSource.includes('localStorage'), 'Google token is not shared across same-origin platform tabs');
  assert(revisionSource.includes('pgi2-authorize-google'), 'Click-driven Google authorization button is missing');

  ['pristeel-gmail-intake.js', 'pristeel-gmail-intake-ux.js', 'pristeel-gmail-intake-client.js', 'pristeel-gmail-linked-guard.js', 'pristeel-gmail-open-project.js', 'pristeel-gmail-auth-gate.js'].forEach(name => {
    assert(!bootstrap.includes(`'${name}?`), `Legacy Gmail module is still loaded: ${name}`);
  });
  assert(bootstrap.includes('pristeel-gmail-tab-handoff.js?v=20260806-2'), 'Direct Gmail launch cache version is not active');
  assert(bootstrap.includes('pristeel-gmail-intake-v2.js'), 'Gmail intake v2 is not loaded');
  assert(bootstrap.includes('pristeel-gmail-intake-revision-fix-v1.js'), 'Intake safety helper is not loaded');

  const directUrl = 'https://example.test/pristeel-app/pristeel-procurement.html?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1';
  const handoffDom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: directUrl
  });
  const hw = handoffDom.window;
  let closeCalls = 0;
  hw.close = () => { closeCalls += 1; };
  hw.name = 'PRISTEEL_MAIN';
  hw.eval(handoffSource);
  assert.strictEqual(closeCalls, 0, 'Direct Gmail launch closed its own tab');
  assert.strictEqual(hw.name, '', 'Legacy named-window state was not cleared');
  assert.strictEqual(hw.__pstGmailHandoffPending, false, 'Direct launch was incorrectly left waiting for another tab');
  assert.strictEqual(hw.__pstAbortBootstrap, false, 'Direct launch aborted the platform bootstrap');
  assert(hw.__pstPendingGmailIntakeTarget.includes('gmail_message_id=m1'), 'Direct launch did not preserve the Gmail request');
  assert.strictEqual(hw.location.pathname, '/pristeel-app/pristeel-procurement.html', 'Direct launch changed the platform path');

  let opened = '';
  hw.PSTGmailIntakeV2 = { open: target => { opened = target; } };
  assert.strictEqual(hw.PSTGmailHandoffV4.openTarget(directUrl), true, 'Direct intake target was rejected');
  assert(opened.includes('gmail_thread_id=t1'), 'Direct intake did not open in the current platform tab');

  const authDom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: directUrl
  });
  const aw = authDom.window;
  let popupCalls = 0;
  aw.PSTEmail = {};
  aw.localStorage.setItem('pristeel_gclient', 'client-id');
  aw.google = { accounts: { oauth2: {
    initTokenClient: options => ({ requestAccessToken: () => { popupCalls += 1; options.callback({ access_token: 'token-1', expires_in: 3600, scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/drive' }); } })
  } } };
  aw.eval(authSource);
  await assert.rejects(() => aw.PSTEmail.auth(), /Autorizimi i Google kerkohet/, 'Gmail intake tried to open Google automatically');
  assert.strictEqual(popupCalls, 0, 'Google popup was opened without a user click');
  await aw.PSTGoogleWorkspaceAuth.authorizeForIntake();
  assert.strictEqual(popupCalls, 1, 'Explicit Google authorization did not open exactly once');
  assert.strictEqual(aw.localStorage.getItem('pst_google_workspace_token_v2'), 'token-1', 'Google token was not persisted for another platform tab');

  const intakeDom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/pristeel-app/'
  });
  const iw = intakeDom.window;
  iw.eval(intakeSource);
  const test = iw.PSTGmailIntakeV2._test;
  const prepared = test.prepareAttachments([
    { key: 'junk', filename: 'image001.jpg', mimeType: 'image/jpeg', size: 59000, sentAt: 300 },
    { key: 'dup1', filename: 'Drawing.pdf', mimeType: 'application/pdf', size: 2000, sentAt: 100 },
    { key: 'dup2', filename: 'Drawing.pdf', mimeType: 'application/pdf', size: 2000, sentAt: 200 }
  ]);
  const byKey = Object.fromEntries(prepared.map(x => [x.key, x]));
  assert.strictEqual(byKey.junk.junk, true, 'Generic signature image was not filtered');
  assert.strictEqual(byKey.junk.recommended, false, 'Generic signature image was selected');
  assert.strictEqual(byKey.dup1.duplicate || byKey.dup2.duplicate, true, 'Exact duplicate was not detected');

  iw.document.body.innerHTML = '<div id="pgi2-bg"><label class="pgi2-file-row"><input class="pgi2-file" type="checkbox" checked><span class="pgi2-file-main"><b>Offer_REV1.pdf</b></span><i>I rekomanduar</i></label><label class="pgi2-file-row"><input class="pgi2-file" type="checkbox" checked><span class="pgi2-file-main"><b>Offer_REV2.pdf</b></span><i>I rekomanduar</i></label></div>';
  iw.eval(revisionSource);
  iw.PSTGmailIntakeRevisionFixV1.normalize(iw.document.getElementById('pgi2-bg'));
  const boxes = iw.document.querySelectorAll('.pgi2-file');
  assert.strictEqual(boxes[0].checked, false, 'Older revision remained selected');
  assert.strictEqual(boxes[1].checked, true, 'Newest revision was not selected');

  let authorizeCalls = 0;
  let reopenedTarget = '';
  iw.__pstPendingGmailIntakeTarget = directUrl;
  iw.PSTGoogleWorkspaceAuth = { authorizeForIntake: () => { authorizeCalls += 1; return Promise.resolve('token'); } };
  iw.PSTGmailIntakeV2.open = target => { reopenedTarget = target; return Promise.resolve(); };
  iw.document.body.innerHTML = '<div id="pgi2-bg"><div class="pgi2-body"><div class="pgi2-status bad">Autorizimi i Google kerkohet. Kliko “Autorizo Gmail dhe Drive” per te vazhduar.</div></div></div>';
  assert.strictEqual(iw.PSTGmailIntakeRevisionFixV1.renderGoogleAuth(iw.document.getElementById('pgi2-bg')), true, 'Authorization prompt was not rendered');
  iw.document.getElementById('pgi2-authorize-google').click();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.strictEqual(authorizeCalls, 1, 'Authorization was not started directly from the button click');
  assert.strictEqual(reopenedTarget, directUrl, 'Gmail intake did not resume after authorization');

  authDom.window.close();
  intakeDom.window.close();
  console.log('Gmail direct launch, popup-safe authorization and intake v2 smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
