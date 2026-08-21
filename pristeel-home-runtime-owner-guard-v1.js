/* PRISTEEL Home Runtime Owner Guard v12
 * Startup visibility belongs to the startup curtain/guard.
 * This module owns only the final Workspace Home handoff:
 * Workspace shell -> Canonical data -> fresh Command Center -> Happy Home -> reveal.
 */
(function(){
'use strict';
if(window.__pstHomeRuntimeOwnerGuardV12)return;
window.__pstHomeRuntimeOwnerGuardV12=true;
window.__pstHomeRuntimeOwnerGuardV11=true;
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

/* Retire obsolete Home writers. */
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
/* Suppress the stale ordered bootstrap copy. A fresh cache-busted Command Center is loaded after modules-ready. */
window.__pstHomeCommandCenterV2=true;

var bootVersion='20260819-'+Date.now().toString(36);
var runtimeReady=!!window.__pstModulesReady;
var homeReady=false;
var visualReady=false;
var finalizing=null;
var canonicalPromise=null;
var interactionPromise=null;
var commandPromise=null;
var happyPromise=null;
var releasePrime=null;
var releasePrimeTimer=null;
var routerBase=null;
var finalizeTimer=null;
var recoveryTimer=null;
var absoluteTimer=null;

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
function hasHomeShell(){
  return !!(document.getElementById('page-workspace-home')&&document.getElementById('pst-ws-home-actions')&&document.getElementById('pst-ws-home-projects'));
}
function extendStartupDeadline(){
  try{
    if(!window.PSTStartupGuard||!window.PSTStartupGuard.state||typeof window.PSTStartupGuard.failOpen!=='function')return;
    var st=window.PSTStartupGuard.state;
    if(st.maxTimer)clearTimeout(st.maxTimer);
    st.maxTimer=setTimeout(function(){
      try{document.documentElement.classList.add('pst-runtime-ready','pst-home-final-ready');}catch(e){}
      try{window.PSTStartupGuard.failOpen();}catch(e){}
    },45000);
  }catch(e){}
}
function signalVisualReady(){
  if(visualReady)return;
  visualReady=true;
  if(recoveryTimer){clearTimeout(recoveryTimer);recoveryTimer=null;}
  if(absoluteTimer){clearTimeout(absoluteTimer);absoluteTimer=null;}
  try{document.documentElement.classList.add('pst-runtime-ready','pst-home-final-ready');}catch(e){}
  try{
    if(window.__pstRuntimeRevealFallback&&window.__pstRuntimeRevealFallback!==-1)clearTimeout(window.__pstRuntimeRevealFallback);
    window.__pstRuntimeRevealFallback=null;
  }catch(e){}
  try{
    if(window.PSTStartupGuard&&typeof window.PSTStartupGuard.visualReady==='function')window.PSTStartupGuard.visualReady();
  }catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:visual-ready',{detail:{owner:'home-runtime-v12',boot:bootVersion}}));}catch(e){}
}
function loadScriptOnce(path,attr,globalName){
  if(globalName&&window[globalName])return Promise.resolve(window[globalName]);
  return new Promise(function(resolve,reject){
    var existing=document.querySelector('script['+attr+']');
    if(existing){
      if(globalName&&window[globalName]){resolve(window[globalName]);return;}
      existing.addEventListener('load',function(){resolve(globalName?window[globalName]:true);},{once:true});
      existing.addEventListener('error',reject,{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src=path+'?pst_boot='+encodeURIComponent(bootVersion);
    s.defer=true;s.setAttribute(attr,'1');
    s.onload=function(){resolve(globalName?window[globalName]:true);};
    s.onerror=function(){reject(new Error('Nuk u ngarkua '+path));};
    document.head.appendChild(s);
  });
}
function loadCanonical(){
  if(window.PSTHomeCanonicalV1)return Promise.resolve(window.PSTHomeCanonicalV1);
  if(canonicalPromise)return canonicalPromise;
  canonicalPromise=loadScriptOnce('pristeel-home-canonical-v1.js','data-pst-home-canonical-v1','PSTHomeCanonicalV1')
    .catch(function(e){canonicalPromise=null;console.error('PPPP Home canonical:',e);return null;});
  return canonicalPromise;
}
function loadInteraction(){
  if(window.PSTHomeCanonicalInteractionV1)return Promise.resolve(window.PSTHomeCanonicalInteractionV1);
  if(interactionPromise)return interactionPromise;
  interactionPromise=loadScriptOnce('pristeel-home-canonical-interaction-v1.js','data-pst-home-canonical-interaction-v1','PSTHomeCanonicalInteractionV1')
    .catch(function(e){interactionPromise=null;console.error('PPPP Home interaction:',e);return null;});
  return interactionPromise;
}
function loadFreshCommandCenter(){
  if(commandPromise)return commandPromise;
  commandPromise=new Promise(function(resolve,reject){
    window.__pstHomeCommandCenterV2=false;
    try{delete window.PSTHomeCommandCenterV2;}catch(e){window.PSTHomeCommandCenterV2=null;}
    var previous=document.querySelector('script[data-pst-home-command-final]');if(previous&&previous.parentNode)previous.remove();
    var s=document.createElement('script');
    s.src='pristeel-home-command-center-v2.js?pst_boot='+encodeURIComponent(bootVersion);
    s.defer=true;s.setAttribute('data-pst-home-command-final','1');
    s.onload=function(){resolve(window.PSTHomeCommandCenterV2||null);};
    s.onerror=function(){reject(new Error('Nuk u ngarkua Home Command Center final.'));};
    document.head.appendChild(s);
  }).catch(function(e){commandPromise=null;console.error('PPPP Home Command Center:',e);return window.PSTHomeCommandCenterV2||null;});
  return commandPromise;
}
function loadHappy(){
  if(window.PSTHomeHappyV1)return Promise.resolve(window.PSTHomeHappyV1);
  if(happyPromise)return happyPromise;
  happyPromise=loadScriptOnce('pristeel-home-happy-v1.js','data-pst-home-happy-v1','PSTHomeHappyV1')
    .catch(function(e){happyPromise=null;console.error('PPPP Home Happy:',e);return null;});
  return happyPromise;
}
function requestBaseHome(){
  ensureCompatScaffold();
  if(hasHomeShell())return true;
  var go=window.pstWorkspaceGo;
  if(typeof go==='function'&&!go.__pstCanonicalFinalRouter){
    try{go.call(window,'home');}catch(e){console.warn('PPPP Home shell request:',e);}
  }
  return hasHomeShell();
}
function waitForHomeShell(){
  if(requestBaseHome())return Promise.resolve(true);
  return new Promise(function(resolve){
    var tries=0;
    (function wait(){
      if(requestBaseHome()){resolve(true);return;}
      if(++tries>=80){resolve(false);return;}
      setTimeout(wait,50);
    })();
  });
}
function applyFinalDecorators(){
  try{if(window.PSTHomeCanonicalInteractionV1&&typeof window.PSTHomeCanonicalInteractionV1.decorate==='function')window.PSTHomeCanonicalInteractionV1.decorate(document);}catch(e){}
  try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate(false);}catch(e){}
  try{if(window.PSTHomeHappyV1&&typeof window.PSTHomeHappyV1.decorate==='function')window.PSTHomeHappyV1.decorate();}catch(e){}
  try{if(window.PSTTaskSourceActionsV1&&typeof window.PSTTaskSourceActionsV1.decorate==='function')window.PSTTaskSourceActionsV1.decorate();}catch(e){}
  try{if(window.PSTRedesignFinalizerV1&&typeof window.PSTRedesignFinalizerV1.apply==='function')window.PSTRedesignFinalizerV1.apply();}catch(e){}
}
function revealBestAvailable(reason){
  clearLegacyLoginBlocker();hideLegacyHome();ensureCompatScaffold();
  try{
    var api=window.PSTHomeCanonicalV1;
    if(api&&typeof api.activateHome==='function')api.activateHome();
    else {
      document.querySelectorAll('.page').forEach(function(p){if(p.id!=='page-workspace-home'){p.classList.remove('active');p.style.display='none';}});
      var fallbackPage=document.getElementById('page-workspace-home');
      if(fallbackPage){fallbackPage.classList.add('active');fallbackPage.style.display='block';fallbackPage.style.visibility='visible';fallbackPage.style.opacity='1';}
      else {var go=window.pstWorkspaceGo;if(typeof go==='function'&&!go.__pstCanonicalFinalRouter)go.call(window,'home');}
      document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='home');});
    }
  }catch(e){}
  applyFinalDecorators();
  var page=document.getElementById('page-workspace-home');if(page&&page.dataset)page.dataset.pstHomeRecovery=String(reason||'fallback');
  signalVisualReady();
  return true;
}
async function primeCanonicalAfterRelease(){
  if(runtimeReady)return false;
  if(releasePrime)return releasePrime;
  releasePrime=(async function(){
    clearLegacyLoginBlocker();ensureCompatScaffold();
    var shell=await waitForHomeShell();
    if(!shell||runtimeReady)return false;
    var api=await loadCanonical();
    if(!api||typeof api.render!=='function'||runtimeReady)return false;
    hideLegacyHome();
    if(typeof api.activateHome==='function')api.activateHome();
    var ok=await Promise.resolve(api.render(true));
    if(ok!==false)signalVisualReady();
    return ok!==false;
  })().catch(function(e){console.error('PPPP early Canonical Home:',e);return false;}).finally(function(){releasePrime=null;});
  return releasePrime;
}
function armReleasePrime(){
  if(runtimeReady||releasePrimeTimer)return;
  var tries=0;
  (function tick(){
    if(runtimeReady){releasePrimeTimer=null;return;}
    if(window.__pstWorkspaceReleaseFixV3Loaded){releasePrimeTimer=null;primeCanonicalAfterRelease();return;}
    if(++tries>=300){releasePrimeTimer=null;return;}
    releasePrimeTimer=setTimeout(tick,50);
  })();
}
async function renderFinalHome(){
  if(!runtimeReady)return false;
  if(finalizing)return finalizing;
  finalizing=(async function(){
    clearLegacyLoginBlocker();ensureCompatScaffold();
    var shell=await waitForHomeShell();
    if(!shell)throw new Error('Workspace Home shell mungon.');
    var api=await loadCanonical();
    if(!api||typeof api.render!=='function')throw new Error('Canonical Home nuk është gati.');
    hideLegacyHome();
    if(typeof api.activateHome==='function')api.activateHome();
    var ok=await Promise.resolve(api.render(true));
    if(ok===false)throw new Error('Canonical Home render dështoi.');
    await loadInteraction();
    await loadFreshCommandCenter();
    await loadHappy();
    applyFinalDecorators();
    installFinalRouter();
    var page=document.getElementById('page-workspace-home');
    if(page&&page.dataset){
      page.dataset.pstHomeOwner='canonical-v1';
      page.dataset.pstHomeCommand='fresh-current';
      page.dataset.pstHomeFinal='happy-v1';
      page.dataset.pstHomeBoot=bootVersion;
      page.dataset.pstHomeFinalAt=new Date().toISOString();
    }
    homeReady=true;
    signalVisualReady();
    return true;
  })().catch(function(e){
    console.error('PPPP final Home startup:',e);
    return revealBestAvailable('final-error');
  }).finally(function(){finalizing=null;});
  return finalizing;
}
function installFinalRouter(){
  var current=window.pstWorkspaceGo;if(typeof current!=='function')return false;
  if(current.__pstCanonicalFinalRouter)return true;
  var base=current;routerBase=base;
  function finalGo(key){
    var k=String(key||'home').toLowerCase();
    if(k==='home'){renderFinalHome();return true;}
    return base.apply(this,arguments);
  }
  finalGo.__pstCanonicalFinalRouter=true;finalGo.__base=base;window.pstWorkspaceGo=finalGo;return true;
}
function compatGo(page){
  page=String(page||'home').toLowerCase();
  if(page==='home'){
    if(runtimeReady){renderFinalHome();return true;}
    var go=window.pstWorkspaceGo;
    if(typeof go==='function'&&go!==compatGo&&!go.__pstCanonicalFinalRouter)return go.call(window,'home');
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
function finalizeHome(){
  runtimeReady=true;
  if(releasePrimeTimer){clearTimeout(releasePrimeTimer);releasePrimeTimer=null;}
  clearLegacyLoginBlocker();installCompatApi();extendStartupDeadline();
  installFinalRouter();
  if(finalizeTimer)clearTimeout(finalizeTimer);
  finalizeTimer=setTimeout(function(){renderFinalHome();},20);
  if(recoveryTimer)clearTimeout(recoveryTimer);
  recoveryTimer=setTimeout(function(){if(!visualReady)revealBestAvailable('modules-ready-timeout');},7000);
}
function bootstrapCompat(){
  clearLegacyLoginBlocker();ensureCompatScaffold();installCompatApi();extendStartupDeadline();armReleasePrime();
}

var API={
  bootVersion:bootVersion,
  loadCanonical:loadCanonical,loadInteraction:loadInteraction,loadFreshCommandCenter:loadFreshCommandCenter,loadHappy:loadHappy,
  finalizeHome:finalizeHome,installFinalRouter:installFinalRouter,renderCanonical:renderFinalHome,renderFinalHome:renderFinalHome,
  ensureCompatScaffold:ensureCompatScaffold,hideLegacyHome:hideLegacyHome,clearLegacyLoginBlocker:clearLegacyLoginBlocker,
  signalVisualReady:signalVisualReady,revealBestAvailable:revealBestAvailable,
  isRuntimeReady:function(){return runtimeReady;},isHomeReady:function(){return homeReady;},isVisualReady:function(){return visualReady;}
};
window.PSTHomeRuntimeOwnerGuardV1=window.PSTHomeRuntimeOwnerGuardV2=window.PSTHomeRuntimeOwnerGuardV3=window.PSTHomeRuntimeOwnerGuardV4=window.PSTHomeRuntimeOwnerGuardV5=window.PSTHomeRuntimeOwnerGuardV6=window.PSTHomeRuntimeOwnerGuardV7=window.PSTHomeRuntimeOwnerGuardV8=window.PSTHomeRuntimeOwnerGuardV9=window.PSTHomeRuntimeOwnerGuardV10=window.PSTHomeRuntimeOwnerGuardV11=window.PSTHomeRuntimeOwnerGuardV12=API;

clearLegacyLoginBlocker();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrapCompat,{once:true});else bootstrapCompat();
document.addEventListener('pst:modules-ready',finalizeHome,{once:true});
if(window.__pstModulesReady)finalizeHome();
absoluteTimer=setTimeout(function(){if(!visualReady)revealBestAvailable('absolute-timeout');},45000);
})();