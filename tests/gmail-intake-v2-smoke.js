const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(() => {
  const handoffSource = fs.readFileSync('pristeel-gmail-tab-handoff.js', 'utf8');
  const intakeSource = fs.readFileSync('pristeel-gmail-intake-v2.js', 'utf8');
  const revisionSource = fs.readFileSync('pristeel-gmail-intake-revision-fix-v1.js', 'utf8');
  const bootstrap = fs.readFileSync('pristeel-project-emails.js', 'utf8');

  assert(!/location\.assign\s*\(/.test(handoffSource), 'Gmail handoff must not reload the platform');
  assert(!/PRISTEEL_MAIN/.test(handoffSource), 'Named-window takeover must stay removed');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(handoffSource), 'Handoff must be bounded and event-driven');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(intakeSource), 'Intake must not poll or observe the whole page');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(revisionSource), 'Revision selection must be bounded');

  ['pristeel-gmail-intake.js', 'pristeel-gmail-intake-ux.js', 'pristeel-gmail-intake-client.js', 'pristeel-gmail-linked-guard.js', 'pristeel-gmail-open-project.js', 'pristeel-gmail-auth-gate.js'].forEach(name => {
    assert(!bootstrap.includes(`'${name}?`), `Legacy Gmail module is still loaded: ${name}`);
  });
  assert(bootstrap.includes('pristeel-gmail-intake-v2.js'), 'Gmail intake v2 is not loaded');
  assert(bootstrap.includes('pristeel-gmail-intake-revision-fix-v1.js'), 'Revision selection fix is not loaded');

  const handoffDom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/pristeel-app/'
  });
  const hw = handoffDom.window;
  let opened = '';
  hw.focus = () => {};
  hw.PSTGmailIntakeV2 = { open: target => { opened = target; } };
  hw.name = 'PRISTEEL_MAIN';
  hw.eval(handoffSource);
  const target = 'https://example.test/pristeel-app/pristeel-procurement.html?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1';
  assert.strictEqual(hw.PSTGmailHandoffV3.openTarget(target), true, 'Existing platform did not accept Gmail handoff');
  assert(opened.includes('gmail_message_id=m1'), 'Intake did not open inside the existing platform');
  assert.strictEqual(hw.name, '', 'Old named-window state was not cleared');
  assert.strictEqual(hw.location.pathname, '/pristeel-app/', 'Handoff changed the platform path instead of opening in place');
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

  console.log('Gmail handoff and intake v2 smoke test passed.');
})();
