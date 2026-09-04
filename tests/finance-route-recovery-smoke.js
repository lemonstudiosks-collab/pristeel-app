const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const src=fs.readFileSync('pristeel-finance-stability-v2.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head><style>#page-finance.css-hidden{display:none!important}</style></head><body>
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
  w.pstWorkspaceGo('projects');
  assert(baseRoutes.includes('projects'),'Non-Finance routes must continue to the existing router');
  dom.window.close();
  console.log('Finance route recovery smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});