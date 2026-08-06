const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(() => {
  const handoffSource = fs.readFileSync('pristeel-gmail-tab-handoff.js', 'utf8');
  const intakeSource = fs.readFileSync('pristeel-gmail-intake-v2.js', 'utf8');
  const revisionSource = fs.readFileSync('pristeel-gmail-intake-revision-fix-v1.js', 'utf8');
  const bootstrap = fs.readFileSync('pristeel-project-emails.js', 'utf8');

  assert(!/window\.close\s*\(|\.close\s*\(\)/.test(handoffSource), 'Gmail launch must never close a tab');
  assert(!/BroadcastChannel|handoff_request|handoff_ack/.test(handoffSource), 'Cross-tab handoff must stay removed');
  assert(!/location\.assign\s*\(|PRISTEEL_MAIN/.test(handoffSource), 'Gmail launch must not navigate or take over a named window');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(handoffSource), 'Gmail launch must be bounded and direct');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(intakeSource), 'Intake must not poll or observe the whole page');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(revisionSource), 'Revision selection must be bounded');

  ['pristeel-gmail-intake.js', 'pristeel-gmail-intake-ux.js', 'pristeel-gmail-intake-client.js', 'pristeel-gmail-linked-guard.js', 'pristeel-gmail-open-project.js', 'pristeel-gmail-auth-gate.js'].forEach(name => {
    assert(!bootstrap.includes(`'${name}?`), `Legacy Gmail module is still loaded: ${name}`);
  });
  assert(bootstrap.includes('pristeel-gmail-tab-handoff.js?v=20260806-2'), 'Direct Gmail launch cache version is not active');
  assert(bootstrap.includes('pristeel-gmail-intake-v2.js'), 'Gmail intake v2 is not loaded');
  assert(bootstrap.includes('pristeel-gmail-intake-revision-fix-v1.js'), 'Revision selection fix is not loaded');

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
  handoffDom.window.close();

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
  intakeDom.window.close();

  console.log('Gmail direct launch and intake v2 smoke test passed.');
})();
