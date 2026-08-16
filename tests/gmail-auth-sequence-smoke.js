const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const handoffSrc = fs.readFileSync('pristeel-gmail-tab-handoff.js','utf8');
const bridgeSrc = fs.readFileSync('pristeel-gmail-intake-auth-bridge-v1.js','utf8');
const recoveryGateSrc = fs.readFileSync('pristeel-linked-gmail-auth-gate-v1.js','utf8');
const authSrc = fs.readFileSync('pristeel-google-workspace-auth.js','utf8');
const url = 'https://example.test/pristeel-procurement.html?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1';

assert(!authSrc.includes('Chrome e bllokoi dritaren e Google'), 'Google popup guidance must not assume Chrome');
assert(authSrc.includes('Shfletuesi e bllokoi dritaren e Google'), 'Google popup guidance must be browser-neutral');
assert(authSrc.includes('Gmail intake nuk hap pop-up automatikisht'), 'browser-neutral copy must not weaken the explicit OAuth boundary');

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

  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));
  assert.strictEqual(fallbacks.length, 0, 'Modules-ready must not bypass PRISTEEL login');

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

async function testLinkedRecoveryRequiresExplicitAuthClick(){
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url:'https://example.test/pristeel-procurement.html', runScripts:'outside-only' });
  const w = dom.window;
  let token = '';
  let authCalls = 0;
  let recoveryCalls = 0;
  let recoveredId = '';
  w.__pstIntegrityLastData = { project:{ id:'p-dukley', name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA' } };
  w.PSTGoogleWorkspaceAuth = {
    gmailScope:'gmail', driveScope:'drive',
    cachedToken: required => token && Array.isArray(required) && required.length === 2 ? token : '',
    authorizeForIntake: async () => { authCalls++; token='google-token'; return token; }
  };
  function originalRecovery(id){ recoveryCalls++; recoveredId=id; return true; }
  w.pstRecoverLinkedProjectGmail = originalRecovery;
  w.pstCollectProjectGmail = originalRecovery;
  w.eval(recoveryGateSrc);

  const first = w.pstCollectProjectGmail('p-dukley');
  assert.strictEqual(first, false, 'Recovery should pause when Google token is missing');
  assert.strictEqual(recoveryCalls, 0, 'Recovery must not start before explicit Google authorization');
  assert.strictEqual(authCalls, 0, 'Auth popup must never open automatically from recovery');
  assert.ok(w.document.getElementById('pst-linked-gmail-auth-gate'), 'Explicit auth gate must be visible');
  assert.ok(w.document.getElementById('pst-linked-gmail-auth-run'), 'Auth gate must provide a real authorization button');

  w.document.getElementById('pst-linked-gmail-auth-run').click();
  await wait(20);
  assert.strictEqual(authCalls, 1, 'Google authorization must start only from the explicit button click');
  assert.strictEqual(recoveryCalls, 1, 'Recovery should resume automatically after authorization succeeds');
  assert.strictEqual(recoveredId, 'p-dukley', 'Recovery must resume the same project');
  assert.strictEqual(w.document.getElementById('pst-linked-gmail-auth-gate'), null, 'Auth gate should close after success');
  dom.window.close();
}

(async function(){
  await testPlatformBeforeGoogle();
  testBothSessionsReady();
  testBridgeDoesNotStack();
  await testLinkedRecoveryRequiresExplicitAuthClick();
  console.log('Gmail auth sequence smoke test passed.');
})().catch(err => { console.error(err); process.exit(1); });