const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const source=fs.readFileSync('pristeel-project-workflow-legacy-capture-v1.js','utf8');
  new Function(source);
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Legacy workflow capture must not observe or poll globally');
  assert(!/supaFetch\s*\(/.test(source),'Legacy workflow capture must remain UI-only');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="page active" data-pwf-area="overview">
      <div id="pst-pi-body"><div class="pwf-project-context"></div><div class="pf2-grid"><section class="pf2-card wide">Workflow</section></div></div>
    </div>
    <button id="offers" class="flow-step" onclick="flowGoto('offers')">Ofertat</button>
    <button id="ranking" class="flow-step" onclick="flowGoto('ranking')">Krahasimi</button>
    <button id="pricing" class="flow-step" onclick="flowGoto('kalkulator')">Çmimi</button>
    <button id="client" class="flow-step" onclick="flowGoto('oferta')">Oferta jonë</button>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';
  w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley'}};
  const calls=[];
  w.PSTCanonicalProjectWorkflowV1={render:(area,stage)=>{calls.push([area,stage]);return true;}};
  w.pstOpenProjectWorkspace=async()=>true;
  w.flowGoto=()=>{throw new Error('legacy flowGoto must not win');};

  w.eval(source);
  const api=w.PSTProjectWorkflowLegacyCaptureV1;
  assert(api,'Legacy capture API must be installed');
  assert.strictEqual(JSON.stringify(api.destination('offers')),JSON.stringify(['procurement','offers']));
  assert.strictEqual(JSON.stringify(api.destination('ranking')),JSON.stringify(['procurement','comparison']));
  assert.strictEqual(JSON.stringify(api.destination('kalkulator')),JSON.stringify(['procurement','pricing']));
  assert.strictEqual(JSON.stringify(api.destination('oferta')),JSON.stringify(['procurement','client_offer']));

  /* Repeated install attempts must never stack capture listeners. */
  api.install();
  api.install();

  ['offers','ranking','pricing','client'].forEach(id=>{
    const btn=w.document.getElementById(id);
    btn.removeAttribute('onclick');
  });
  w.document.getElementById('offers').click();
  w.document.getElementById('ranking').click();
  w.document.getElementById('pricing').click();
  w.document.getElementById('client').click();

  assert.strictEqual(JSON.stringify(calls),JSON.stringify([
    ['procurement','offers'],
    ['procurement','comparison'],
    ['procurement','pricing'],
    ['procurement','client_offer']
  ]),'Old ribbon stages must land exactly once in the canonical project flow');

  const css=w.document.getElementById('pwf-legacy-capture-css');
  assert(css&&css.textContent.includes('data-pwf-area="overview"'),'Overview duplicate-workflow cleanup CSS must be installed');
  dom.window.close();
  console.log('Canonical legacy workflow capture smoke test passed.');
})();
