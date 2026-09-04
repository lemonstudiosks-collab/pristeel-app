const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const stability=fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
  const finalGuard=fs.readFileSync('pristeel-finance-final-route-guard-v1.js','utf8');
  assert(!/supaFetch\s*\(/.test(finalGuard),'Final Finance route guard must not access PPPP data directly');
  assert(!/setInterval\s*\(/.test(finalGuard),'Final Finance route guard must stay bounded');

  const dom=new JSDOM(`<!doctype html><html><head>
    <style>#page-finance.css-hidden{display:none!important}</style>
  </head><body>
    <aside id="pst-ws-canonical-nav">
      <button class="pst-ws-navbtn active" data-key="home">Home</button>
      <button class="pst-ws-navbtn" data-key="finance">Financat</button>
    </aside>
    <div class="page active" id="page-workspace-home" style="display:block">Home</div>
    <div class="page css-hidden" id="page-finance" style="display:block">
      <div id="fin-hub" class="card" style="display:none"><div id="fin-hub-grid"></div></div>
      <div id="fin-tabs" style="display:none"></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;w.console=console;
  const initialRoutes=[];
  w.pstWorkspaceGo=function(key){initialRoutes.push(key);return true;};
  w.finSwitchTab=function(){};
  w.finShowHub=function(){
    const hub=w.document.getElementById('fin-hub');
    hub.style.display='';
    w.document.getElementById('fin-hub-grid').innerHTML='<button>Faturat</button><button>Shpenzimet</button>';
  };

  // Finance Stability loads earlier in the long bootstrap.
  w.eval(stability);

  // Reproduce the production regression: a later/final navigation owner replaces
  // pstWorkspaceGo and reports success while Finance remains computed-hidden/blank.
  const lateRoutes=[];
  w.pstWorkspaceGo=function(key){
    lateRoutes.push(key);
    if(String(key)==='finance'){
      const p=w.document.getElementById('page-finance');
      p.classList.add('active');
      p.style.display='block';
    }
    return true;
  };

  // The new guard is intentionally loaded last, after the final navigation owner.
  w.eval(finalGuard);
  assert.strictEqual(typeof w.PSTFinanceFinalRouteGuardV1.recover,'function','Final Finance route guard API missing');

  const out=w.pstWorkspaceGo('finance');
  assert.strictEqual(out,true,'Final Finance route should be owned by the recovery guard');
  await new Promise(r=>setTimeout(r,40));

  const finance=w.document.getElementById('page-finance');
  assert(finance.classList.contains('active'),'Finance page was not activated');
  assert.notStrictEqual(w.getComputedStyle(finance).display,'none','Finance page remains computed-hidden after final route recovery');
  assert.strictEqual(w.document.getElementById('page-workspace-home').classList.contains('active'),false,'Previous page remained active');
  assert(w.document.getElementById('fin-hub-grid').children.length>=2,'Existing Finance hub did not render');
  assert.strictEqual(w.PSTFinanceFinalRouteGuardV1.surfaceReady(),true,'Final Finance surface did not become ready');
  assert.strictEqual(lateRoutes.includes('finance'),false,'Broken late Finance router was allowed to consume the Finance route');
  assert(w.document.querySelector('[data-key="finance"]').classList.contains('active'),'Finance sidebar state was not marked active');

  w.pstWorkspaceGo('projects');
  assert(lateRoutes.includes('projects'),'Non-Finance routes must remain delegated to the current final router');

  dom.window.close();
  console.log('Finance final route guard smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
