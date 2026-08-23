/* PRISTEEL Home Happy v4
 * Compatibility shim + live navigation stability guard.
 * Home Command Center remains the visual owner. No business-data writes.
 */
(function(){
'use strict';
if(window.__pstHomeHappyV1)return;
window.__pstHomeHappyV1=true;

function S(v){return String(v==null?'':v);}
function hidePages(except){document.querySelectorAll('.page').forEach(function(p){if(p===except)return;p.classList.remove('active');p.style.display='none';});}
function mark(key){document.querySelectorAll('#pst-ws-canonical-nav .pst-ws-navbtn,.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});}
function activate(id,key){var p=document.getElementById(id);if(!p)return false;hidePages(p);p.classList.add('active');p.style.display='block';mark(key);return true;}
function openProjects(filter){
 var ready=document.getElementById('page-workspace-projects');
 var out;
 if(ready&&ready.querySelector('.pst-pm-page')&&Array.isArray(window.__pstWorkspaceProjectRows)&&window.__pstWorkspaceProjectRows.length){out=activate('page-workspace-projects','projects');}
 else if(typeof window.pstProjectsModernOpen==='function')out=window.pstProjectsModernOpen();
 else out=activate('page-workspace-projects','projects');
 mark('projects');
 Promise.resolve(out).then(function(){
  if(!filter)return;
  var tries=0;(function wait(){var b=document.querySelector('#page-workspace-projects [data-pm-filter="'+S(filter)+'"]');if(b){b.click();return;}if(++tries<20)setTimeout(wait,50);})();
 }).catch(function(e){console.warn('PPPP Projects navigation:',e);});
 return out===undefined?true:out;
}
function route(key){
 key=S(key).toLowerCase();
 if(key==='home'){
  var H=window.PSTHomeCanonicalV1;if(H&&typeof H.activateHome==='function')H.activateHome();else activate('page-workspace-home','home');
  if(H&&typeof H.render==='function')Promise.resolve(H.render(true)).catch(function(){});mark('home');return true;
 }
 if(key==='projects')return openProjects();
 if(key==='tenders'){var x;if(typeof window.pstTenderBizOpenMonitor==='function')x=window.pstTenderBizOpenMonitor();else if(typeof window.pstWsKekTenders==='function')x=window.pstWsKekTenders();else if(typeof window.showPage==='function')x=window.showPage('kek-tenders');mark('tenders');return x===undefined?true:x;}
 if(key==='contacts'){var C=window.PSTContactMasterV1,x=false;if(C&&typeof C.open==='function')x=C.open();else if(typeof window.showPage==='function')x=window.showPage('contacts');mark('contacts');return x===undefined?true:x;}
 if(key==='finance'){try{if(window.__pstWorkspaceLegacy&&typeof window.__pstWorkspaceLegacy.showPage==='function')window.__pstWorkspaceLegacy.showPage('finance');else if(typeof window.showPage==='function')window.showPage('finance');else activate('page-finance','finance');}catch(e){activate('page-finance','finance');}mark('finance');setTimeout(function(){try{if(typeof window.finShowHub==='function')window.finShowHub();}catch(e){}},40);return true;}
 if(key==='apps'){try{if(typeof window.openModuleHub==='function')window.openModuleHub();else activate('page-workspace-apps','apps');}catch(e){activate('page-workspace-apps','apps');}mark('apps');return true;}
 return false;
}
function installNavigationStability(){
 if(window.__pstNavigationInteractionStabilityV1)return true;
 window.__pstNavigationInteractionStabilityV1=true;
 /* Break the cached v2 finalizer <-> navigation re-entry cycle. */
 try{
  var R=window.PSTPrimaryNavResilienceV1;
  if(R){R.ensureAssistant=function(){return true;};R.ensureCommandCenter=function(){return true;};}
 }catch(e){}
 window.addEventListener('click',function(e){
  var nav=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;
  if(nav){var key=S(nav.getAttribute('data-key')).toLowerCase();if(/^(home|tenders|projects|contacts|finance|apps)$/.test(key)){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();route(key);return;}}
  var tile=e.target&&e.target.closest?e.target.closest('.pst-hog-tile[data-hog-act]'):null;
  if(tile){var act=S(tile.getAttribute('data-hog-act')).toLowerCase();if(act===''||act==='waiting'){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProjects(act==='waiting'?'waiting':null);}}
 },true);
 return true;
}
function decorate(){
 installNavigationStability();
 var p=document.getElementById('page-workspace-home');
 if(!p||!p.classList.contains('active')||p.style.display==='none')return false;
 var pulse=document.getElementById('pst-home-pulse');if(pulse)pulse.remove();
 p.querySelectorAll('.pst-happy-stats').forEach(function(x){x.remove();});
 try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 return true;
}
installNavigationStability();
window.PSTHomeHappyV1={decorate:decorate,refresh:decorate,applyNow:decorate,installNavigationStability:installNavigationStability,route:route,openProjects:openProjects};
})();
