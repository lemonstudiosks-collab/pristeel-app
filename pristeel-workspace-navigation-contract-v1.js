/* PRISTEEL Workspace Navigation Contract v1
 * Captures the Workspace Architecture router before Home compatibility wrappers.
 * This module does not create a second router. It preserves one stable reference
 * to the existing top-level owner so later UI layers cannot strand navigation.
 */
(function(){
'use strict';
if(window.__pstWorkspaceNavigationContractV1)return;
window.__pstWorkspaceNavigationContractV1=true;

var owner=typeof window.pstWorkspaceGo==='function'?window.pstWorkspaceGo:null;
var expected={
  home:'page-workspace-home',
  projects:'page-workspace-projects',
  inbox:'page-workspace-inbox',
  commercial:'page-workspace-commercial',
  apps:'page-workspace-apps',
  finance:'page-finance',
  contacts:'page-contacts'
};
function pageActive(id){
  var p=document.getElementById(id);if(!p)return false;
  return p.classList.contains('active')&&p.style.display!=='none';
}
function go(key){
  key=String(key||'home').toLowerCase();
  if(typeof owner!=='function')return false;
  try{
    owner.call(window,key);
    var id=expected[key];
    if(!id)return true;
    /* Workspace Architecture activates the destination synchronously before data awaits. */
    return pageActive(id);
  }catch(e){
    try{console.error('PPPP workspace navigation contract:',key,e);}catch(x){}
    return false;
  }
}
function project(id){
  if(!id||typeof window.pstOpenProjectWorkspace!=='function')return Promise.resolve(false);
  try{
    return Promise.resolve(window.pstOpenProjectWorkspace(String(id))).then(function(ok){
      return ok!==false&&pageActive('page-workspace-project');
    }).catch(function(e){try{console.error('PPPP project navigation:',e);}catch(x){}return false;});
  }catch(e){return Promise.resolve(false);}
}
window.PSTWorkspaceNavigationV1={
  owner:'pristeel-workspace-architecture-v1',
  go:go,
  project:project,
  pageActive:pageActive,
  _base:owner,
  _expected:expected
};
})();
