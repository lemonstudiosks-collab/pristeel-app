const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

function wait(ms){return new Promise(r=>setTimeout(r,ms));}

async function finalCurtainCase(){
  const search=fs.readFileSync('pristeel-search.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body><div id="auth-gate" style="display:none"></div><div id="app-shell-root" style="display:flex"><div id="page-workspace-home" class="active" style="display:block">Final Home</div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.localStorage.setItem('pristeel_session',JSON.stringify({access_token:'test'}));
  w.eval(search);
  assert(w.document.documentElement.classList.contains('pst-stable-booting'),'Final startup curtain must engage for an authenticated app');
  assert(w.document.getElementById('pst-stable-startup-shell'),'Final startup curtain must have its own shell');

  w.document.dispatchEvent(new w.CustomEvent('pst:visual-ready'));
  w.document.dispatchEvent(new w.CustomEvent('pst:cosmetics-ready'));
  await wait(180);
  assert(w.document.documentElement.classList.contains('pst-stable-booting'),'Visual/cosmetic readiness must not expose an app while runtime modules are still loading');
  assert(!w.PSTStartupCurtainV1.isReleased(),'Curtain must remain owned until modules-ready');

  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));
  await wait(180);
  assert(!w.document.documentElement.classList.contains('pst-stable-booting'),'Curtain must release after modules + visual + cosmetics are ready');
  assert(w.PSTStartupCurtainV1.isReleased(),'Final curtain did not release after all three readiness gates');
  dom.window.close();
}

async function existingVisualCoordinatorCase(){
  const guard=fs.readFileSync('pristeel-startup-guard-v2.js','utf8');
  const cleanup=fs.readFileSync('pristeel-home-visual-cleanup-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body><div id="auth-gate" style="display:none"></div><div id="app-shell-root" style="display:flex"><div id="page-workspace-home" class="active" style="display:block"><div id="pst-ws-home-projects"></div><div id="pst-ws-home-actions"></div></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.localStorage.setItem('pristeel_session',JSON.stringify({access_token:'test'}));
  w.eval(guard);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.PSTStartupGuard.modulesReady();
  await wait(420);
  assert(!w.document.documentElement.classList.contains('pst-app-ready'),'App must stay hidden after modules-ready until visual-ready');

  let finalizer=0,home=0,stability=0,recovery=0,live=0;
  w.PSTRedesignFinalizerV1={apply(){finalizer++;}};
  w.PSTHomeCommandCenterV2={decorate(){home++;}};
  w.PSTHomeStabilityV2={apply(){stability++;return Promise.resolve(true);},enforce(){}};
  w.PSTHomeProjectRecoveryV3={recover(){recovery++;return Promise.resolve(true);}};
  w.PSTHomeLiveFixV1={apply(){live++;return Promise.resolve(true);},enforceLimits(){}};
  w.eval(cleanup);
  w.document.dispatchEvent(new w.CustomEvent('pst:modules-ready'));
  await wait(700);
  assert(w.document.documentElement.classList.contains('pst-runtime-ready'),'Final runtime-ready marker was not set');
  assert(w.document.documentElement.classList.contains('pst-app-ready'),'Startup guard did not reveal after visual-ready');
  assert(finalizer>0&&home>0&&stability>0&&recovery>0&&live>0,'Visual stabilization did not coordinate all current Home layers');
  dom.window.close();
}

(async()=>{
  await finalCurtainCase();
  await existingVisualCoordinatorCase();
  console.log('Startup visual stability smoke test passed.');
  process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
