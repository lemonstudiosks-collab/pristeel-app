/* PRISTEEL Home Runtime Owner Guard v3
 * Loaded before the ordered runtime bootstrap.
 * Canonical Workspace Home is the only allowed Home renderer.
 * Historical Home implementations and the obsolete blocking login handoff are
 * retired before their scripts execute.
 */
(function(){
'use strict';
if(window.__pstHomeRuntimeOwnerGuardV3)return;
window.__pstHomeRuntimeOwnerGuardV3=true;
window.__pstHomeRuntimeOwnerGuardV2=true;
window.__pstHomeRuntimeOwnerGuardV1=true;

/* Definitively retire historical owners. Files may remain in the static
 * artifact for compatibility with old references, but their startup guards
 * must stop them before they register timers, observers or routers. */
window.__pstDashboardCalmLoaded=true;
window.__pstDashboardFocusLoaded=true;
window.__pstOperationalHomeLoaded=true;
window.__pstUiV2Loaded=true;
window.__pstHomeLiveFixV1=true;
window.__pstHomeStabilityV2=true;
window.__pstHomeProjectRecoveryV3=true;
window.__pstHomeOperationalPriorityV1=true;
window.__pstHomeVisualCleanupV1=true;
/* The startup guard is the only startup-visibility owner. A cached historical
 * login-transition asset must never be able to cover the authenticated app. */
window.__pstLoginTransitionV2=true;

var rawGo=typeof window.pstWorkspaceGo==='function'?window.pstWorkspaceGo:null;
var canonicalLoading=false;
var canonicalPromise=null;
var runtimeReady=!!window.__pstModulesReady;
var finalizeTimer=null;
var scaffoldTries=0;

function clearLegacyLoginBlocker(){
 try{document.documentElement.classList.remove('pst-login-switching');}catch(e){}
 var old=document.getElementById('pst-login-transition-v2');if(old&&old.parentNode)old.remove();
 var css=document.getElementById('pst-login-transition-v2-style');if(css&&css.parentNode)css.remove();
}
function canonical(){return window.PSTHomeCanonicalV1||null;}
function hasHomeShell(){return !!(document.getElementById('page-workspace-home')&&document.getElementById('pst-ws-home-actions')&&document.getElementById('pst-ws-home-projects'));}
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
function compatGo(page){
 page=String(page||'home');
 if(page==='home'){
   if(runtimeReady&&renderCanonical())return true;
   if(typeof window.pstWorkspaceGo==='function'&&window.pstWorkspaceGo!==compatGo)return window.pstWorkspaceGo('home');
   ensureCanonical();return true;
 }
 if(typeof window.showPage==='function'){window.showPage(page);return true;}
 return false;
}
function installCompatApi(){
 if(typeof window.pstV2Go!=='function'||window.pstV2Go.__pstLegacyHome){window.pstV2Go=compatGo;}
 window.pstV2Go.__pstCanonicalCompat=true;
 window.pstV2NewProject=window.pstV2NewProject||function(){if(typeof window.newProject==='function')return window.newProject();return compatGo('newproject');};
 window.pstV2Search=window.pstV2Search||function(){if(typeof window.openCmdK==='function')return window.openCmdK();return false;};
 window.pstV2Refresh=function(){if(renderCanonical())return true;ensureCanonical().then(renderCanonical);return true;};
 window.pstV2RenderDashboard=window.pstV2Refresh;
 window.pstV2OpenProject=window.pstV2OpenProject||function(id){if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(id);if(typeof window.openOverview==='function')return window.openOverview(id);return compatGo('import');};
 window.pstV2OpenMail=window.pstV2OpenMail||function(url){if(url){window.open(url,'PRISTEEL_GMAIL');return true;}return compatGo('outreach');};
}
function bootstrapCompat(){
 clearLegacyLoginBlocker();ensureCompatScaffold();installCompatApi();
 if(!document.getElementById('pst-home-owner-v3-style')){
   var s=document.createElement('style');s.id='pst-home-owner-v3-style';
   s.textContent='body.pst-ui-v2 .sidebar>*:not(#pst-v2-sidebar){display:none!important}body.pst-ui-v2 #right-rail,body.pst-ui-v2 #modbar,body.pst-ui-v2 #util-fab{display:none!important}html.pst-runtime-ready #page-home{display:none!important;visibility:hidden!important;pointer-events:none!important}';
   document.head.appendChild(s);
 }
 if(!ensureCompatScaffold()&&scaffoldTries++<80)setTimeout(bootstrapCompat,50);
}

function renderCanonical(){
  var api=canonical();
  if(!api||typeof api.render!=='function'||!hasHomeShell())return false;
  clearLegacyLoginBlocker();hideLegacyHome();
  try{if(typeof api.activateHome==='function')api.activateHome();}catch(e){}
  api.render(true);
  return true;
}
function ensureCanonical(){
  if(canonical())return Promise.resolve(canonical());
  if(canonicalPromise)return canonicalPromise;
  canonicalPromise=new Promise(function(resolve,reject){
    canonicalLoading=true;
    var existing=document.querySelector('script[data-pst-home-canonical-v1]');
    if(existing){
      if(canonical()){canonicalLoading=false;resolve(canonical());return;}
      existing.addEventListener('load',function(){canonicalLoading=false;resolve(canonical());},{once:true});
      existing.addEventListener('error',function(e){canonicalLoading=false;reject(e);},{once:true});
      return;
    }
    var s=document.createElement('script');
    s.src='pristeel-home-canonical-v1.js?v=20260817-canonical2';
    s.defer=true;
    s.setAttribute('data-pst-home-canonical-v1','1');
    s.onload=function(){canonicalLoading=false;resolve(canonical());};
    s.onerror=function(){canonicalLoading=false;reject(new Error('Nuk u ngarkua Home canonical owner.'));};
    document.head.appendChild(s);
  }).catch(function(error){canonicalPromise=null;console.error('PPPP Home runtime owner guard:',error);return null;});
  return canonicalPromise;
}
function finalizeHome(){
  runtimeReady=true;clearLegacyLoginBlocker();hideLegacyHome();installCompatApi();
  if(finalizeTimer)clearTimeout(finalizeTimer);
  finalizeTimer=setTimeout(function(){
    ensureCanonical().then(function(){
      var tries=0;
      (function apply(){
        if(renderCanonical())return;
        if(++tries<100)setTimeout(apply,50);
      })();
    });
  },80);
}
function routedGo(key){
  var args=arguments,k=String(key||'home').toLowerCase();
  if(k==='home'){
    clearLegacyLoginBlocker();hideLegacyHome();ensureCanonical();
    if(runtimeReady&&renderCanonical())return true;
    return rawGo?rawGo.apply(window,args):true;
  }
  return rawGo?rawGo.apply(window,args):false;
}

try{
  Object.defineProperty(window,'pstWorkspaceGo',{
    configurable:true,
    enumerable:true,
    get:function(){return canonicalLoading&&rawGo?rawGo:routedGo;},
    set:function(fn){
      if(typeof fn!=='function')return;
      if(canonicalLoading)return;
      rawGo=fn;
      ensureCanonical();
    }
  });
}catch(e){console.error('PPPP could not install Home route guard',e);}

window.PSTHomeRuntimeOwnerGuardV1=window.PSTHomeRuntimeOwnerGuardV2=window.PSTHomeRuntimeOwnerGuardV3={
  ensureCanonical:ensureCanonical,
  finalizeHome:finalizeHome,
  renderCanonical:renderCanonical,
  ensureCompatScaffold:ensureCompatScaffold,
  hideLegacyHome:hideLegacyHome,
  clearLegacyLoginBlocker:clearLegacyLoginBlocker,
  isRuntimeReady:function(){return runtimeReady;}
};

clearLegacyLoginBlocker();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrapCompat,{once:true});else bootstrapCompat();
document.addEventListener('pst:modules-ready',finalizeHome,{once:true});
if(window.__pstModulesReady)finalizeHome();
})();
