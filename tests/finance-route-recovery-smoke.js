const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const src=fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head><style>#page-finance.css-hidden{display:none!important}</style></head><body>
    <aside id="pst-ws-canonical-nav">
      <button class="pst-ws-navbtn active" data-key="home"><span>Home</span></button>
      <button class="pst-ws-navbtn" data-key="finance"><span id="finance-label">Financat</span></button>
    </aside>
    <div class="page active" id="page-workspace-home" style="display:block">Home</div>
    <div class="page css-hidden" id="page-finance" style="display:block">
      <div id="fin-hub" class="card" style="display:none"><div id="fin-hub-grid"></div></div>
      <div id="fin-tabs" style="display:none"></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;w.console=console;
  let baseRoutes=[];
  w.pstWorkspaceGo=function(key){baseRoutes.push(key);return true;};
  w.finSwitchTab=function(){};
  w.finShowHub=function(){
    const hub=w.document.getElementById('fin-hub');
    hub.style.display='';
    w.document.getElementById('fin-hub-grid').innerHTML='<button>Faturat</button><button>Shpenzimet</button>';
  };
  w.eval(src);
  await new Promise(r=>setTimeout(r,20));
  assert.strictEqual(typeof w.PSTFinanceStabilityV2.recoverFinance,'function','Finance recovery API missing');
  assert.strictEqual(typeof w.PSTFinanceStabilityV2.installCanonicalFinanceCapture,'function','Canonical Finance capture missing');

  // Existing direct route recovery must still work.
  const out=w.pstWorkspaceGo('finance');
  assert.strictEqual(out,true,'Finance route wrapper should own Finance navigation');
  await new Promise(r=>setTimeout(r,30));
  const finance=w.document.getElementById('page-finance');
  assert(finance.classList.contains('active'),'Finance page was not activated');
  assert.notStrictEqual(w.getComputedStyle(finance).display,'none','Finance page remains computed-hidden');
  assert.strictEqual(w.document.getElementById('page-workspace-home').classList.contains('active'),false,'Previous page remained active');
  assert(w.document.getElementById('fin-hub-grid').children.length>=2,'Existing Finance hub did not render');
  assert.strictEqual(w.PSTFinanceStabilityV2.financeSurfaceReady(),true,'Finance surface readiness did not verify rendered content');
  assert.strictEqual(baseRoutes.includes('finance'),false,'Broken legacy/workspace Finance route should not run before recovery');

  // Reproduce the production regression after #383: a later canonical nav owner
  // installs a capture listener that would otherwise consume Finance and leave it blank.
  w.document.getElementById('page-workspace-home').classList.add('active');
  w.document.getElementById('page-workspace-home').style.display='block';
  finance.classList.remove('active');
  finance.style.display='block';
  w.document.getElementById('fin-hub').style.display='none';
  w.document.getElementById('fin-hub-grid').innerHTML='';
  let lateCanonicalCalls=0;
  w.document.addEventListener('click',function(e){
    const b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key="finance"]'):null;
    if(!b)return;
    lateCanonicalCalls++;
    e.preventDefault();
    e.stopImmediatePropagation();
    finance.classList.add('active');
  },true);

  w.document.getElementById('finance-label').click();
  await new Promise(r=>setTimeout(r,40));
  assert.strictEqual(lateCanonicalCalls,0,'Later canonical Finance owner was allowed to consume the click before recovery');
  assert(finance.classList.contains('active'),'Captured Finance click did not activate existing Finance page');
  assert.notStrictEqual(w.getComputedStyle(finance).display,'none','Captured Finance click left page computed-hidden');
  assert(w.document.getElementById('fin-hub-grid').children.length>=2,'Captured Finance click did not render the existing Finance hub');
  assert(w.document.querySelector('[data-key="finance"]').classList.contains('active'),'Finance nav was not marked active');

  // A later module may wrap the shared router. Re-running the Finance installer
  // must find its existing owner in the chain instead of adding another layer.
  const financeRouter=w.pstWorkspaceGo;
  function lateWrapper(key){return financeRouter.apply(this,arguments);}
  lateWrapper.__pstRouteBase=financeRouter;
  w.pstWorkspaceGo=lateWrapper;
  w.PSTFinanceStabilityV2.install();
  assert.strictEqual(w.pstWorkspaceGo,lateWrapper,'Finance route owner was duplicated inside an existing wrapper chain');

  w.pstWorkspaceGo('projects');
  assert(baseRoutes.includes('projects'),'Non-Finance routes must continue to the existing router');
  dom.window.close();
  console.log('Finance route recovery smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
