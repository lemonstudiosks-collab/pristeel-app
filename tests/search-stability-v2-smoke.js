const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const source = fs.readFileSync('pristeel-search-stable-v2.js', 'utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source), 'Stable search must not use global observers or polling');
  assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source), 'Stable search must remain read-only');
  assert(source.includes('WAIT_MS=2800'), 'Stable search must bound source waits');
  assert(source.includes('no preload on modal open') || source.includes('Të dhënat ngarkohen vetëm pasi fillon kërkimin'), 'Stable search must document lazy loading');

  const dom = new JSDOM(`<!doctype html><html><body class="pst-ui-v2">
    <button id="pst-bcc-home-search">Kërko</button>
  </body></html>`, { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  let calls = 0;
  w.PSTBusinessCommandCenterV1 = {
    tokenGroups(q){ return q.toLowerCase().split(/\s+/).filter(Boolean).map(x => [x]); }
  };
  w.PSTBusinessCommandCenterDeepGmail = { decorate(){} };
  w.pstOpenProjectWorkspace = () => {};
  w.open = () => ({ focus(){} });
  w.supaFetch = async path => {
    calls++;
    if(path.startsWith('projects?')) return [{id:'p1',name:'Geiger Stahlbau',client:'Geiger',ref:'GEI-001'}];
    if(path.startsWith('project_emails?')) return [{id:'e1',project_id:'p1',subject:'Geiger RFQ',snippet:'request for steel',gmail_thread_id:'t1'}];
    return [];
  };

  w.eval(source);
  assert(w.PSTSearchStableV2, 'Stable search API missing');
  w.openCmdK();
  assert(w.document.getElementById('pst-bcc'), 'Stable search modal did not open');
  await new Promise(r => setTimeout(r, 80));
  assert.strictEqual(calls, 0, 'Opening search must not preload Supabase data');

  w.document.querySelector('.pst-bcc-close').click();
  assert(!w.document.getElementById('pst-bcc'), 'Close must work without waiting for network work');

  w.openCmdK();
  const input = w.document.getElementById('pst-bcc-input');
  input.value = 'Geiger';
  input.dispatchEvent(new w.Event('input', {bubbles:true}));
  await new Promise(r => setTimeout(r, 450));
  assert(calls > 0, 'Typing a real query must start lazy source loading');
  assert(w.document.body.textContent.includes('Geiger Stahlbau') || w.document.body.textContent.includes('Geiger RFQ'), 'Search did not render matching data');

  const before = calls;
  w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert(!w.document.getElementById('pst-bcc'), 'Escape must always close the search modal');
  assert(calls >= before, 'Close should not depend on network cancellation');

  dom.window.close();
  console.log('Stable search v2 smoke test passed.');
})().catch(err => { console.error(err); process.exit(1); });
