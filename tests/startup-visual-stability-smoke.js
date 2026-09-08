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

async function firstPaintHomeLayoutCase(){
  const entry=fs.readFileSync('pristeel-native-ui-v3.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head><style>.pst-ws-create-menu{display:none}.pst-ws-create.open .pst-ws-create-menu{display:block}</style></head><body class="pst-ui-v2">
    <div class="sidebar" id="pst-v2-sidebar"><div id="pst-ws-sidebar">
      <div class="pst-ws-create" id="pst-ws-create" data-pst-create-owner="workspace-v1"><button type="button" class="pst-ws-create-main" aria-haspopup="menu" aria-expanded="false" onclick="pstWsToggleCreate(event)"><svg width="16" height="16" viewBox="0 0 24 24"></svg><span class="pst-ws-create-label">Krijo</span></button><div class="pst-ws-create-menu" id="pst-ws-create-menu"><button class="pst-ws-create-item" data-create-type="project" onclick="pstWsCreate('project')">Projekt i ri</button><button class="pst-ws-create-item" data-create-type="offer" onclick="pstWsCreate('offer')">Ofertë e re</button><button class="pst-ws-create-item" data-create-type="invoice" onclick="pstWsCreate('invoice')">Faturë e re</button><button class="pst-ws-create-item" data-create-type="task" onclick="pstWsCreate('task')">Detyrë e re</button></div></div>
      <div id="pst-ws-canonical-nav"><button class="pst-ws-navbtn"><span class="pst-nav-label">Kryefaqja</span></button></div>
    </div></div>
    <div id="page-workspace-home" class="page active"><div id="pst-native-home-v4"><header class="pn-head"><div><span class="pn-kicker">QENDRA E DREJTIMIT PPPP</span><h1>Pasqyra operative</h1><p>Çfarë kërkon vëmendjen tënde tani.</p></div><div class="pn-live">Të dhëna aktuale të platformës</div></header><div class="pn-ask-slot"><section class="pst-live-command-shell"><form class="pst-live-command"><div class="pst-live-command-mark">P</div><textarea class="pst-live-input" placeholder="P.sh. Çfarë po ndodh me STACON?"></textarea><button class="pst-live-send" type="submit">↑</button></form><div class="pst-live-result" hidden></div></section></div><section class="pn-work-grid"><article class="pn-panel"><header><div><span>PËR TY TANI</span><h2>Veprime prioritare</h2><p>Hapi tjetër, arsyeja dhe afati.</p></div></header><div class="pn-work-list"><button class="pn-work-row"><span class="pn-row-icon"></span><span class="pn-row-main"><span class="pn-row-project">Projekt</span><b class="pn-row-title">Hapi tjetër</b><span class="pn-row-reason">Arsye</span></span><strong class="pn-due">Sot</strong></button></div></article><article class="pn-panel"><header><div><span>NË VIJIM</span><h2>Afate, pritje dhe rikujtime</h2></div></header></article></section><section class="pn-pulse"><button class="pn-pulse-item"><span></span><span>Projekte aktive</span><b>21</b></button></section><section class="pn-exceptions" hidden></section></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  let created=0;
  w.pstWsToggleCreate=function(e){if(e){e.preventDefault();e.stopPropagation();}const wrap=w.document.getElementById('pst-ws-create');wrap.classList.toggle('open');wrap.querySelector('.pst-ws-create-main').setAttribute('aria-expanded',wrap.classList.contains('open')?'true':'false');};
  w.pstWsCreate=function(){created++;};
  w.PSTNativeUiV4={apply(){
    w.document.documentElement.classList.add('pst-native-ui-v4-ready');
    if(!w.document.getElementById('late-v4-css')){const s=w.document.createElement('style');s.id='late-v4-css';s.textContent='#pst-native-home-v4 .pn-head p{font-size:11.5px!important}#pst-native-home-v4 .pn-kicker{font-size:9px!important}#pst-native-home-v4 .pst-live-command-shell{min-height:150px!important}#pst-native-home-v4 .pn-panel>header h2{font-size:9px!important}#pst-native-home-v4 .pn-work-row .pn-row-title{font-size:8px!important}#pst-native-home-v4 .pn-pulse-item b{font-size:11px!important}';w.document.head.appendChild(s);}
    return true;
  }};
  w.eval(entry);
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  w.PSTUiOwnershipCleanupV1.apply();
  const snapshot=()=>{
    const css=sel=>w.getComputedStyle(w.document.querySelector(sel));
    return {subtitle:css('#pst-native-home-v4 .pn-head p').fontSize,kicker:css('#pst-native-home-v4 .pn-kicker').fontSize,commandMinHeight:css('#pst-native-home-v4 .pst-live-command-shell').minHeight,panelTitle:css('#pst-native-home-v4 .pn-panel>header h2').fontSize,rowTitle:css('#pst-native-home-v4 .pn-work-row .pn-row-title').fontSize,pulseValue:css('#pst-native-home-v4 .pn-pulse-item b').fontSize};
  };
  const first=snapshot();
  assert.deepStrictEqual(first,{subtitle:'14px',kicker:'12px',commandMinHeight:'64px',panelTitle:'14px',rowTitle:'12px',pulseValue:'18px'},'First-paint four-zone Home contract is not the intended stable size');
  assert.strictEqual(w.document.getElementById('pst-native-home-v4').getAttribute('data-pst-font-lock'),'1','Home must be excluded from late readability resizing');
  assert.strictEqual(w.document.querySelector('.pst-live-input').getAttribute('placeholder'),'Pyet PPPP për një projekt…','Home command copy must match the supported project-data scope');
  const before=w.document.getElementById('pst-ws-create').innerHTML;
  w.PSTNativeUiV4.apply();
  assert.strictEqual(w.document.getElementById('pst-ws-create').innerHTML,before,'Native UI apply must not rewrite the workspace-owned + Krijo DOM');
  w.pstWsToggleCreate({preventDefault(){},stopPropagation(){}});
  assert(w.document.getElementById('pst-ws-create').classList.contains('open'),'+ Krijo must open its dropdown');
  assert.strictEqual(w.document.querySelector('.pst-ws-create-main').getAttribute('aria-expanded'),'true','+ Krijo aria-expanded must match open state');
  assert.strictEqual(created,0,'Opening + Krijo must not create any business object');
  assert.strictEqual(w.document.querySelectorAll('.pst-ws-create-item').length,4,'+ Krijo must preserve exactly four canonical options');
  const actions=Array.from(w.document.querySelectorAll('.pst-ws-create-item')).map(x=>x.getAttribute('onclick')||'').join('|');
  for(const type of ['project','offer','invoice','task'])assert(actions.includes(`pstWsCreate('${type}')`),`Missing create option: ${type}`);
  const late=w.document.createElement('style');
  late.textContent='#page-workspace-home.active.pst-ux-home .pn-head p{font-size:18px!important}#page-workspace-home.active.pst-ux-home .pst-live-command-shell{min-height:180px!important}#page-workspace-home.active.pst-ux-home .pn-panel>header h2{font-size:20px!important}#page-workspace-home.active.pst-ux-home .pn-work-row .pn-row-title{font-size:18px!important}#page-workspace-home.active.pst-ux-home .pn-pulse-item b{font-size:24px!important}';
  w.document.head.appendChild(late);
  w.document.getElementById('page-workspace-home').classList.add('pst-ux-home');
  await wait(1500);
  w.PSTNativeUiV4.apply();
  await wait(1650);
  assert.deepStrictEqual(snapshot(),first,'Home typography or command dimensions changed after ~3 seconds');
  assert.strictEqual(w.document.getElementById('pst-ws-create').innerHTML,before,'Late Native UI apply rewrote + Krijo');
  assert.strictEqual(created,0,'Regression smoke must not create any object');
  dom.window.close();
}

(async()=>{await finalCurtainCase();await existingVisualCoordinatorCase();await firstPaintHomeLayoutCase();console.log('Startup visual stability smoke test passed.');process.exit(0);})().catch(e=>{console.error(e);process.exit(1);});