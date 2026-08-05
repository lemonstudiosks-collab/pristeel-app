const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('pristeel-startup-guard-v2.js', 'utf8');

function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }
function markup(gateDisplay, appDisplay){
  return `<!doctype html><html><head></head><body>
    <div id="auth-gate" style="display:${gateDisplay}">
      <div style="width:300px;text-align:center">
        <div style="color:#A65F2E">PRISTEEL</div>
        <div>Procurement Platform</div>
        <form id="auth-form"><input id="auth-email"><input id="auth-pass"><button type="submit" style="background:#A65F2E">Hyr</button></form>
        <div id="auth-err"></div>
      </div>
    </div>
    <div id="app-shell-root" style="display:${appDisplay}"><div class="legacy-screen">Old app</div></div>
  </body></html>`;
}

async function preBodyCase(){
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  w.document.body.remove();
  w.eval(source);
  const shell = w.document.getElementById('pst-startup-shell');
  assert(shell, 'Startup shell was not created before BODY');
  assert.strictEqual(shell.parentNode, w.document.documentElement, 'Early shell was not attached to HTML root');
  assert(w.document.getElementById('pst-startup-critical-css-v2').textContent.includes('#5B9BB3'), 'Brand blue missing');
  dom.window.close();
}

async function authCase(){
  const dom = new JSDOM(markup('flex','none'), { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await wait(80);
  assert(w.document.documentElement.classList.contains('pst-auth-ready'), 'Login was not revealed');
  assert(!w.document.documentElement.classList.contains('pst-booting'), 'Boot class remained on login');
  assert(w.document.querySelector('.pst-auth-mark'), 'Modern PRISTEEL login mark missing');
  assert.strictEqual(w.document.querySelector('#auth-form button').textContent, 'Hyr në PRISTEEL');
  dom.window.close();
}

async function appCase(){
  const dom = new JSDOM(markup('none','flex'), { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  w.localStorage.setItem('pristeel_session', JSON.stringify({ access_token:'test' }));
  w.eval(source);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.PSTStartupGuard.modulesReady();
  await wait(420);
  assert(w.document.documentElement.classList.contains('pst-app-ready'), 'Current app was not revealed');
  assert(!w.document.documentElement.classList.contains('pst-booting'), 'Boot class remained on app');
  assert.strictEqual(w.getComputedStyle(w.document.getElementById('app-shell-root')).visibility, 'visible');
  dom.window.close();
}

(async()=>{
  await preBodyCase();
  await authCase();
  await appCase();
  console.log('Startup guard v2 smoke test passed.');
  process.exit(0);
})().catch(error=>{ console.error(error); process.exit(1); });
