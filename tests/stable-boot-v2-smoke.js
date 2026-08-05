const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-stable-boot-v2.js', 'utf8');
assert(!source.includes('MutationObserver'), 'Stable boot must not use MutationObserver');
assert(!source.includes('setInterval'), 'Stable boot must not use setInterval');

async function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

(async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="auth-gate" style="display:none"><form id="auth-form"></form></div>
    <div id="app-shell-root" style="display:none"><div id="final-workspace">Final</div></div>
  </body></html>`, {
    runScripts: 'outside-only',
    url: 'https://example.test/'
  });
  const w = dom.window;
  Object.defineProperty(w.document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  w.authGetSession = () => ({ email: 'sales@prissteel.com' });
  w.startApp = function () {
    w.document.getElementById('auth-gate').style.display = 'none';
    w.document.getElementById('app-shell-root').style.display = '';
  };

  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.startApp();
  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));

  assert(w.document.documentElement.classList.contains('pst-stable-boot'), 'App must remain hidden during finalisation');
  await sleep(950);
  assert(!w.document.documentElement.classList.contains('pst-stable-boot'), 'Boot hold must end after final modules settle');
  assert(w.document.documentElement.classList.contains('pst-app-ready'), 'Final app must be revealed');
  assert.strictEqual(w.document.getElementById('app-shell-root').style.display, '', 'Final workspace must remain visible');

  dom.window.close();
  console.log('Stable boot v2 smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
