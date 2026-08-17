/* PRISTEEL Home Runtime Owner Guard v1
 * Loaded before the ordered runtime bootstrap.
 * Workspace Architecture may build the Home shell during startup, but once the
 * runtime is complete only Home Canonical may render Home data.
 */
(function(){
'use strict';
/* Cache-proof the retired legacy Home. Even if a browser still has the old
 * pristeel-dashboard-calm.js asset cached, its own startup guard will stop it. */
window.__pstDashboardCalmLoaded=true;
if(window.__pstHomeRuntimeOwnerGuardV1)return;
window.__pstHomeRuntimeOwnerGuardV1=true;

var rawGo=typeof window.pstWorkspaceGo==='function'?window.pstWorkspaceGo:null;
var canonicalLoading=false;
var canonicalPromise=null;
var runtimeReady=!!window.__pstModulesReady;
var finalizeTimer=null;

function canonical(){return window.PSTHomeCanonicalV1||null;}
function hasHomeShell(){return !!(document.getElementById('page-workspace-home')&&document.getElementById('pst-ws-home-actions')&&document.getElementById('pst-ws-home-projects'));}
function renderCanonical(){
  var api=canonical();
  if(!api||typeof api.render!=='function'||!hasHomeShell())return false;
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
    s.src='pristeel-home-canonical-v1.js?v=20260817-runtimeowner1';
    s.defer=true;
    s.setAttribute('data-pst-home-canonical-v1','1');
    s.onload=function(){canonicalLoading=false;resolve(canonical());};
    s.onerror=function(){canonicalLoading=false;reject(new Error('Nuk u ngarkua Home canonical owner.'));};
    document.head.appendChild(s);
  }).catch(function(error){canonicalPromise=null;console.error('PPPP Home runtime owner guard:',error);return null;});
  return canonicalPromise;
}
function finalizeHome(){
  runtimeReady=true;
  if(finalizeTimer)clearTimeout(finalizeTimer);
  finalizeTimer=setTimeout(function(){
    ensureCanonical().then(function(){
      var tries=0;
      (function apply(){
        if(renderCanonical())return;
        if(++tries<80)setTimeout(apply,50);
      })();
    });
  },120);
}
function routedGo(key){
  var args=arguments,k=String(key||'home').toLowerCase();
  if(k==='home'){
    ensureCanonical();
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

window.PSTHomeRuntimeOwnerGuardV1={
  ensureCanonical:ensureCanonical,
  finalizeHome:finalizeHome,
  renderCanonical:renderCanonical,
  isRuntimeReady:function(){return runtimeReady;}
};

document.addEventListener('pst:modules-ready',finalizeHome,{once:true});
if(window.__pstModulesReady)finalizeHome();
})();
