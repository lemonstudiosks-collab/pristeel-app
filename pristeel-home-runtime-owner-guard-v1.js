/* PRISTEEL Home Runtime Owner Guard v10
 * Deterministic Home startup coordinator.
 * Intermediate Home renderers stay hidden until the ordered runtime is complete.
 * Final sequence: Workspace shell -> Canonical data -> current Command Center -> Happy Home -> reveal.
 */
(function(){
'use strict';
if(window.__pstHomeRuntimeOwnerGuardV10)return;
window.__pstHomeRuntimeOwnerGuardV10=true;
window.__pstHomeRuntimeOwnerGuardV9=true;
window.__pstHomeRuntimeOwnerGuardV8=true;
window.__pstHomeRuntimeOwnerGuardV7=true;
window.__pstHomeRuntimeOwnerGuardV6=true;
window.__pstHomeRuntimeOwnerGuardV5=true;
window.__pstHomeRuntimeOwnerGuardV4=true;
window.__pstHomeRuntimeOwnerGuardV3=true;
window.__pstHomeRuntimeOwnerGuardV2=true;
window.__pstHomeRuntimeOwnerGuardV1=true;

/* Retire obsolete/competing Home writers before the ordered bootstrap reaches them. */
window.__pstDashboardCalmLoaded=true;
window.__pstDashboardFocusLoaded=true;
window.__pstOperationalHomeLoaded=true;
window.__pstUiV2Loaded=true;
window.__pstUiV2PolishLoaded=true;
window.__pstDashboardActionControlsV2Loaded=true;
window.__pstHomeLiveFixV1=true;
window.__pstHomeStabilityV2=true;
window.__pstHomeProjectRecoveryV3=true;
window.__pstHomeOperationalPriorityV1=true;
window.__pstHomeVisualCleanupV1=true;
window.__pstLoginTransitionV2=true;
/* The ordered bootstrap still contains Home Command Center with an old cache key.
 * Prevent that copy from initializing. v10 loads the current file exactly once at finalization. */
window.__pstHomeCommandCenterV2=true;

var runtimeReady=!!window.__pstModulesReady;
var homeReady=false;
var visualReady=false;
var finalizing=null;
var canonicalPromise=null;
var interactionPromise=null;
var happyPromise=null;
var commandPromise=null;
var routerBase=null;
var finalizeTimer=null;

/* Never expose a half-booted application because of an old timeout. */
if(window.__pstRuntimeRevealFallback){clearTimeout(window.__pstRuntimeRevealFallback);window.__pstRuntimeRevealFallback=null;}
try{
  if(window.PSTStartupGuard&&window.PSTStartupGuard.state&&window.PSTStartupGuard.state.maxTimer){
    clearTimeout(window.PSTStartupGuard.state.maxTimer);window.PSTStartupGuard.state.maxTimer=null;
  }
}catch(e){}

function clearLegacyLoginBlocker(){
  try{document.documentElement.classList.remove('pst-login-switching');}catch(e){}
  var old=document.getElementById('pst-login-transition-v2');if(old&&old.parentNode)old.remove();
  var css=document.getElementById('pst-login-transition-v2-style');if(css&&css.parentNode)css.remove();
}
function hideLegacyHome(){
  var old=document.getElementById('page-home');
  if(old){old.classList.remove('active');old.style.display='none';old.setAttribute('aria-hidden','true');}
}
function ensureCompatScaffold(){
  try{if(document.body)document.body.classList.add('pst-ui-v2');}catch(e){}
  var sidebar=document.getElementById('app-sidebar')||document.querySelector('.sidebar');
  if(sidebar&&!document.getElementById('pst-v2-sidebar')){
    var host=document.createElement('div');host.id='pst-v2-sidebar';host.style.height='100%';sidebar.insertBefore(host,sidebar.firstChild||null);
  }
  return !!document.getElementById('pst-v2-sidebar');
}
function installStartupCss(){
  var old=document.getElementById('pst-home-owner-v8-style');if(old)old.remove();
  var old9=document.getElementById('pst-home-owner-v9-style');if(old9)old9.remove();
  if(document.getElementById('pst-home-owner-v10-style'))return;
  var s=document.createElement('style');s.id='pst-home-owner-v10-style';s.textContent=`
body.pst-ui-v2 .sidebar>*:not(#pst-v2-sidebar){display:none!important}
body.pst-ui-v2 #right-rail,body.pst-ui-v2 #modbar,body.pst-ui-v2 #util-fab{display:none!important}
html:not(.pst-home-final-ready) #page-workspace-home.active>*{visibility:hidden!important}
html:not(.pst-home-final-ready) #page-workspace-home.active{min-height:68vh!important;position:relative!important}
html:not(.pst-home-final-ready) #page-workspace-home.active:after{content:'Po përgatitet platforma…';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;visibility:visible!important;background:#F7FAFB;color:#6F838C;font-size:12px;font-weight:650;letter-spacing:.1px;z-index:50}
html.pst-home-final-ready body.pst-ui-v2 .app-shell{display:flex!important;visibility:visible!important;opacity:1!important}
html.pst-home-final-ready body.pst-ui-v2 .sidebar{display:block!important;visibility:visible!important;opacity:1!important}
html.pst-home-final-ready body.pst-ui-v2 #pst-v2-sidebar{display:block!important;visibility:visible!important;opacity:1!important;height:100%!important}
html.pst-home-final-ready body.pst-ui-v2 #pst-ws-sidebar{display:flex!important;visibility:visible!important;opacity:1!important}
html.pst-home-final-ready body.pst-ui-v2 .content{display:block!important;visibility:visible!important;opacity:1!important}
html.pst-home-final-ready #page-workspace-home.active{display:block!important;visibility:visible!important;opacity:1!important}
html.pst-home-final-ready #page-workspace-home.active>*{visibility:visible!important}
html.pst-runtime-ready #page-home{display:none!important;visibility:hidden!important;pointer-events:none!important}
`;
  document.head.appendChild(s);
}
function hasHomeShell(){return !!(document.getElementById('page-workspace-home')&&document.getElementById('pst-ws-home-actions')&&document.getElementById('pst-ws-home-projects'));}
function forceHomeVisible(){
  clearLegacyLoginBlocker();hideLegacyHome();ensureCompatScaffold();
  try{document.body.classList.add('pst-ui-v2');}catch(e){}
  document.querySelectorAll('.page').forEach(function(p){if(p.id!=='page-workspace-home'){p.classList.remove('active');p.style.display='none';}});
  var p=document.getElementById('page-workspace-home');if(p){p.classList.add('active');p.style.display='block';p.style.visibility='visible';p.style.opacity='1';}
  var shell=document.querySelector('.app-shell');if(shell){shell.style.removeProperty('display');shell.style.removeProperty('visibility');shell.style.removeProperty('opacity');}
  var root=document.getElementById('app-shell-root');if(root){root.style.removeProperty('display');root.style.removeProperty('visibility');root.style.removeProperty('opacity');}
  var content=document.querySelector('.content');if(content){content.style.removeProperty('display');content.style.removeProperty('visibility');content.style.removeProperty('opacity');}
  var sidebar=document.getElementById('app-sidebar')||document.querySelector('.sidebar');if(sidebar){sidebar.style.removeProperty('display');sidebar.style.removeProperty('visibility');sidebar.style.removeProperty('opacity');}
  var v2=document.getElementById('pst-v2-sidebar');if(v2){v2.style.removeProperty('display');v2.style.removeProperty('visibility');v2.style.removeProperty('opacity');}
  var ws=document.getElementById('pst-ws-sidebar');if(ws){ws.style.removeProperty('display');ws.style.removeProperty('visibility');ws.style.removeProperty('opacity');}
  document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='home');});
  return !!p;
}
function signalVisualReady(){
  if(visualReady)return;
  visualReady=true;
  if(window.__pstRuntimeRevealFallback){clearTimeout(window.__pstRuntimeRevealFallback);window.__pstRuntimeRevealFallback=null;}
  forceHomeVisible();
  try{document.documentElement.classList.add('pst-home-final-ready','pst-runtime-ready');}catch(e){}
  try{if(window.PSTStartupGuard&&typeof window.PSTStartupGuard.visualReady==='function')window.PSTStartupGuard.visualReady();}catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:visual-ready',{detail:{owner:'home-runtime-v10',final:true}}));}catch(e){}
}
function loadScriptOnce(path,attr,globalName){
  var api=globalName&&window[globalName];if(api)return Promise.resolve(api);
  return new Promise(function(resolve,reject){
    var existing=document.querySelector('script['+attr+'],script[src*="'+path+'"]');
    if(existing){
      if(globalName&&window[globalName]){resolve(window[globalName]);return;}
      existing.addEventListener('load',function(){resolve(globalName?window[globalName]:true);},{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var s=document.createElement('script');s.src=path+'?v=20260819-home-final2';s.defer=true;s.setAttribute(attr,'1');
    s.onload=function(){resolve(globalName?window[globalName]:true);};
    s.onerror=function(){reject(new Error('Nuk u ngarkua '+path));};
    document.head.appendChild(s);
  });
}
function loadCurrentCommandCenter(){
  if(window.PSTHomeCommandCenterV2&&window.PSTHomeCommandCenterV2.__pstFinalCurrent)return Promise.resolve(window.PSTHomeCommandCenterV2);
  if(commandPromise)return commandPromise;
  commandPromise=new Promise(function(resolve,reject){
    /* The bootstrap copy was intentionally blocked. Load a fresh, content-current owner now. */
    window.__pstHomeCommandCenterV2=false;
    try{delete window.PSTHomeCommandCenterV2;}catch(e){window.PSTHomeCommandCenterV2=null;}
    var previous=document.querySelector('script[data-pst-home-command-final]');if(previous&&previous.parentNode)previous.remove();
    var s=document.createElement('script');s.src='pristeel-home-command-center-v2.js?v=20260819-home-final2';s.defer=true;s.setAttribute('data-pst-home-command-final','1');
    s.onload=function(){var api=window.PSTHomeCommandCenterV2||null;if(api)api.__pstFinalCurrent=true;resolve(api);};
    s.onerror=function(){reject(new Error('Nuk u ngarkua Home Command Center final.'));};
    document.head.appendChild(s);
  }).catch(function(e){commandPromise=null;console.error('PPPP Home Command Center:',e);return null;});
  return commandPromise;
}
function loadInteraction(){
  if(window.PSTHomeCanonicalInteractionV1)return Promise.resolve(window.PSTHomeCanonicalInteractionV1);
  if(interactionPromise)return interactionPromise;
  interactionPromise=loadScriptOnce('pristeel-home-canonical-interaction-v1.js','data-pst-home-canonical-interaction-v1','PSTHomeCanonicalInteractionV1').catch(function(e){console.error('PPPP Home interaction:',e);return null;});
  return interactionPromise;
}
function loadCanonical(){
  if(window.PSTHomeCanonicalV1)return Promise.resolve(window.PSTHomeCanonicalV1);
  if(canonicalPromise)return canonicalPromise;
  canonicalPromise=loadScriptOnce('pristeel-home-canonical-v1.js','data-pst-home-canonical-v1','PSTHomeCanonicalV1').catch(function(e){canonicalPromise=null;console.error('PPPP Home canonical:',e);return null;});
  return canonicalPromise;
}
function loadHappy(){
  if(window.PSTHomeHappyV1)return Promise.resolve(window.PSTHomeHappyV1);
  if(happyPromise)return happyPromise;
  happyPromise=loadScriptOnce('pristeel-home-happy-v1.js','data-pst-home-happy-v1','PSTHomeHappyV1').catch(function(e){happyPromise=null;console.error('PPPP Home final visual:',e);return null;});
  return happyPromise;
}
function ensureShellBeforeFinal(){
  ensureCompatScaffold();
  if(hasHomeShell())return true;
  var go=window.pstWorkspaceGo;
  if(typeof go==='function'&&!go.__pstCanonicalFinalRouter){try{go.call(window,'home');}catch(e){console.warn('PPPP Home shell bootstrap:',e);}}
  return hasHomeShell();
}
async function renderFinalHome(){
  if(!runtimeReady)return false;
  if(finalizing)return finalizing;
  finalizing=(async function(){
    clearLegacyLoginBlocker();hideLegacyHome();installStartupCss();ensureShellBeforeFinal();
    var api=await loadCanonical();
    if(!api||typeof api.render!=='function')throw new Error('Canonical Home nuk është gati.');
    if(!hasHomeShell()){ensureShellBeforeFinal();if(!hasHomeShell())throw new Error('Workspace Home shell mungon.');}
    if(typeof api.activateHome==='function')api.activateHome();else forceHomeVisible();
    var ok=await Promise.resolve(api.render(true));
    if(ok===false)throw new Error('Canonical Home render dështoi.');
    await loadInteraction();
    if(window.PSTHomeCanonicalInteractionV1&&typeof window.PSTHomeCanonicalInteractionV1.decorate==='function')window.PSTHomeCanonicalInteractionV1.decorate(document);
    var command=await loadCurrentCommandCenter();
    if(command&&typeof command.decorate==='function')command.decorate(false);
    var happy=await loadHappy();
    if(happy&&typeof happy.decorate==='function')happy.decorate();
    if(window.PSTTaskSourceActionsV1&&typeof window.PSTTaskSourceActionsV1.decorate==='function')window.PSTTaskSourceActionsV1.decorate();
    forceHomeVisible();
    var page=document.getElementById('page-workspace-home');if(page){page.dataset.pstHomeOwner='canonical-v1';page.dataset.pstHomeCommand='current-final2';page.dataset.pstHomeFinal='happy-v1';page.dataset.pstHomeFinalAt=new Date().toISOString();}
    homeReady=true;signalVisualReady();return true;
  })().catch(function(e){console.error('PPPP final Home startup:',e);forceHomeVisible();return false;}).finally(function(){finalizing=null;});
  return finalizing;
}
function installFinalRouter(){
  var current=window.pstWorkspaceGo;if(typeof current!=='function')return false;
  if(current.__pstCanonicalFinalRouter)return true;
  routerBase=current;
  function finalGo(key){var k=String(key||'home').toLowerCase();if(k==='home'){renderFinalHome();return true;}return routerBase.apply(this,arguments);}
  finalGo.__pstCanonicalFinalRouter=true;finalGo.__base=routerBase;window.pstWorkspaceGo=finalGo;return true;
}
function compatGo(page){
  page=String(page||'home').toLowerCase();
  if(page==='home'){
    if(runtimeReady){renderFinalHome();return true;}
    var go=window.pstWorkspaceGo;if(typeof go==='function'&&go!==compatGo&&!go.__pstCanonicalFinalRouter)return go.call(window,'home');
    return false;
  }
  if(typeof window.showPage==='function'){window.showPage(page);return true;}
  return false;
}
function installCompatApi(){
  if(typeof window.pstV2Go!=='function'||window.pstV2Go.__pstLegacyHome)window.pstV2Go=compatGo;
  window.pstV2Go.__pstCanonicalCompat=true;
  window.pstV2NewProject=window.pstV2NewProject||function(){if(typeof window.newProject==='function')return window.newProject();return compatGo('newproject');};
  window.pstV2Search=window.pstV2Search||function(){if(typeof window.openCmdK==='function')return window.openCmdK();return false;};
  window.pstV2Refresh=function(){if(runtimeReady)renderFinalHome();return true;};
  window.pstV2RenderDashboard=window.pstV2Refresh;
  window.pstV2OpenProject=window.pstV2OpenProject||function(id){if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(id);if(typeof window.openOverview==='function')return window.openOverview(id);return false;};
  window.pstV2OpenMail=window.pstV2OpenMail||function(url){if(url){window.open(url,'PRISTEEL_GMAIL');return true;}return compatGo('outreach');};
}
function scheduleCanonical(){if(!runtimeReady)return false;renderFinalHome();return true;}
function renderCanonical(){if(!runtimeReady)return false;renderFinalHome();return true;}
function finalizeHome(){
  runtimeReady=true;clearLegacyLoginBlocker();installCompatApi();installStartupCss();
  if(finalizeTimer)clearTimeout(finalizeTimer);
  /* Late decorators finish first. Then the current Home is rendered once and revealed. */
  finalizeTimer=setTimeout(function(){installFinalRouter();renderFinalHome().then(function(ok){if(ok)setTimeout(function(){forceHomeVisible();if(window.PSTHomeHappyV1&&typeof window.PSTHomeHappyV1.decorate==='function')window.PSTHomeHappyV1.decorate();},1400);});},1100);
}
function bootstrapCompat(){
  clearLegacyLoginBlocker();ensureCompatScaffold();installCompatApi();installStartupCss();loadInteraction();
  /* Intentionally no Home render/reveal while ordered bootstrap is running. */
}

var API={
  loadCanonical:loadCanonical,loadInteraction:loadInteraction,loadHappy:loadHappy,loadCurrentCommandCenter:loadCurrentCommandCenter,
  scheduleCanonical:scheduleCanonical,finalizeHome:finalizeHome,installFinalRouter:installFinalRouter,
  renderCanonical:renderCanonical,renderFinalHome:renderFinalHome,ensureCompatScaffold:ensureCompatScaffold,
  hideLegacyHome:hideLegacyHome,clearLegacyLoginBlocker:clearLegacyLoginBlocker,forceHomeVisible:forceHomeVisible,
  signalVisualReady:signalVisualReady,isRuntimeReady:function(){return runtimeReady;},isHomeReady:function(){return homeReady;},isVisualReady:function(){return visualReady;}
};
window.PSTHomeRuntimeOwnerGuardV1=window.PSTHomeRuntimeOwnerGuardV2=window.PSTHomeRuntimeOwnerGuardV3=window.PSTHomeRuntimeOwnerGuardV4=window.PSTHomeRuntimeOwnerGuardV5=window.PSTHomeRuntimeOwnerGuardV6=window.PSTHomeRuntimeOwnerGuardV7=window.PSTHomeRuntimeOwnerGuardV8=window.PSTHomeRuntimeOwnerGuardV9=window.PSTHomeRuntimeOwnerGuardV10=API;

clearLegacyLoginBlocker();installStartupCss();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrapCompat,{once:true});else bootstrapCompat();
document.addEventListener('pst:modules-ready',finalizeHome,{once:true});
if(window.__pstModulesReady)finalizeHome();
/* Recovery only retries the final owner. It never reveals an intermediate Home. */
setTimeout(function(){if(!visualReady&&window.__pstModulesReady){runtimeReady=true;installFinalRouter();renderFinalHome();}},30000);
})();
