const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const handoffSrc = fs.readFileSync('pristeel-gmail-tab-handoff.js','utf8');
const bridgeSrc = fs.readFileSync('pristeel-gmail-intake-auth-bridge-v1.js','utf8');
const url = 'https://example.test/pristeel-procurement.html?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1';

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

async function testPlatformBeforeGoogle(){
  const dom = new JSDOM('<!doctype html><form id="auth-form"></form>', { url, runScripts:'outside-only' });
  const w = dom.window;
  let session = null;
  let fallbacks = [];
  let bridgeCalls = 0;
  w.authGetSession = () => session;
  w.document.addEventListener('pst:gmail-handoff-fallback', e => fallbacks.push(e.detail && e.detail.target));
  w.eval(handoffSrc);

  assert.strictEqual(w.__pstGmailHandoffPending, true, 'Direct Gmail target must be held while PRISTEEL is logged out');
  assert.strictEqual(fallbacks.length, 0, 'Intake must not open before PRISTEEL login');

  // Bootstrap may finish while the platform is still locked. This must not release intake.
  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));
  assert.strictEqual(fallbacks.length, 0, 'Modules-ready must not bypass PRISTEEL login');

  // After explicit login, Google authorization is the next gate.
  session = { access_token:'platform-token' };
  w.PSTGoogleWorkspaceAuth = {
    gmailScope:'gmail', driveScope:'drive',
    currentToken: () => ''
  };
  w.PSTGmailIntakeAuthBridgeV1 = {
    render: () => { bridgeCalls++; return true; }
  };
  w.document.getElementById('auth-form').dispatchEvent(new w.Event('submit', { bubbles:true, cancelable:true }));
  await wait(180);

  assert.strictEqual(bridgeCalls, 1, 'Google auth should be offered only after PRISTEEL login');
  assert.strictEqual(fallbacks.length, 0, 'Intake must still wait while Google auth is missing');
  dom.window.close();
}

function testBothSessionsReady(){
  const dom = new JSDOM('<!doctype html><form id="auth-form"></form>', { url, runScripts:'outside-only' });
  const w = dom.window;
  let fallbacks = [];
  w.authGetSession = () => ({ access_token:'platform-token' });
  w.document.addEventListener('pst:gmail-handoff-fallback', e => fallbacks.push(e.detail && e.detail.target));
  w.eval(handoffSrc);

  // In production these modules load later than the handoff module.
  w.PSTGoogleWorkspaceAuth = {
    gmailScope:'gmail', driveScope:'drive',
    currentToken: required => Array.isArray(required) && required.length === 2 ? 'google-token' : ''
  };
  w.PSTGmailIntakeAuthBridgeV1 = { render: () => { throw new Error('Bridge should not render with valid Google token'); } };
  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));

  assert.strictEqual(fallbacks.length, 1, 'Intake should open once both platform and Google sessions are ready');
  assert.ok(/gmail_message_id=m1/.test(fallbacks[0]), 'Original Gmail message target must be preserved');
  assert.strictEqual(w.__pstGmailHandoffPending, false, 'Handoff pending flag must clear after release');
  dom.window.close();
}

function testBridgeDoesNotStack(){
  const dom = new JSDOM('<!doctype html><div id="pgi2-bg"></div>', { url, runScripts:'outside-only' });
  const w = dom.window;
  let session = null;
  w.authGetSession = () => session;
  w.PSTGoogleWorkspaceAuth = {
    gmailScope:'gmail', driveScope:'drive',
    currentToken: () => ''
  };
  w.eval(bridgeSrc);

  assert.strictEqual(w.PSTGmailIntakeAuthBridgeV1.render(), false, 'Google auth must not appear above PRISTEEL login');
  assert.strictEqual(w.document.getElementById('pst-gmail-intake-auth-bridge'), null);

  session = { access_token:'platform-token' };
  assert.strictEqual(w.PSTGmailIntakeAuthBridgeV1.render(), false, 'Google auth must not stack under an active Intake modal');
  assert.strictEqual(w.document.getElementById('pst-gmail-intake-auth-bridge'), null);

  w.document.getElementById('pgi2-bg').remove();
  assert.strictEqual(w.PSTGmailIntakeAuthBridgeV1.render(), true, 'Google auth should appear when platform is ready and Intake is not open');
  assert.ok(w.document.getElementById('pst-gmail-intake-auth-bridge'));
  dom.window.close();
}

(async function(){
  await testPlatformBeforeGoogle();
  testBothSessionsReady();
  testBridgeDoesNotStack();
  console.log('Gmail auth sequence smoke test passed.');
})().catch(err => { console.error(err); process.exit(1); });
