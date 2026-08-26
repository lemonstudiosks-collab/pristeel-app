/* PRISTEEL Home Happy v9
 * Compatibility shim + live navigation stability guard.
 * Loads Operational Truth and the final PPPP Control Room Home with live cache busting.
 */
(function(){
'use strict';
if(window.__pstHomeHappyV1)return;
window.__pstHomeHappyV1=true;

var truthLoading=null,controlLoading=null,projectRouteSeq=0;
function S(v){return String(v==null?'':v);}
function hidePages(except){document.querySelectorAll('.page').forEach(function(p){if(p===except)return;p.classList.remove('active');p.style.display='none';});}
function mark(key){document.querySelectorAll('#pst-ws-canonical-nav .pst-ws-navbtn,.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});}
function activate(id,key){var p=document.getElementById(id);if(!p)return false;hidePages(p);p.classList.add('active');p.style.display='block';mark(key);return true;}
function primeProjects(){var r=window.__pstWorkspaceProjectRows||window._allProjectsCache;if(Array.isArray(r)&&r.length)return Promise.resolve(r);var H=window.PSTHomeOperatingGridV1;if(H&&typeof H.loadData==='function')return Promise.resolve(H.loadData(false)).then(function(d){var p=d&&Array.isArray(d.projects)?d.projects:[];if(p.length)window._allProjectsCache=p;return p;}).catch(function(){return[];});return Promise.resolve([]);}
function ensureTruth(){
 if(window.PSTOperationalTruthV1)return Promise.resolve(window.PSTOperationalTruthV1);
 if(truthLoading)return truthLoading;
 var old=document.querySelector('script[data-pst-operational-truth]');
 if(old){truthLoading=new Promise(function(resolve){var n=0;(function wait(){if(window.PSTOperationalTruthV1||++n>50){resolve(window.PSTOperationalTruthV1||null);return;}setTimeout(wait,40);})();});return truthLoading;}
 truthLoading=primeProjects().then(function(){return new Promise(function(resolve){var s=document.createElement('script');s.src='pristeel-operational-truth-v1.js?v=20260823-truth1';s.defer=true;s.setAttribute('data-pst-operational-truth','1');s.onload=function(){resolve(window.PSTOperationalTruthV1||null);};s.onerror=function(){resolve(null);};document.head.appendChild(s);});}).finally(function(){truthLoading=null;});
 return truthLoading;
}
function ensureControlRoom(force){
 if(window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.apply==='function'){try{window.PSTProjectControlHomeV1.apply(!!force);}catch(e){}return Promise.resolve(window.PSTProjectControlHomeV1);}
 if(controlLoading)return controlLoading;
 var existing=document.querySelector('script[data-pst-project-control-home-final]');
 if(existing){controlLoading=new Promise(function(resolve){var n=0;(function wait(){if(window.PSTProjectControlHomeV1||++n>80){var x=window.PSTProjectControlHomeV1||null;if(x&&typeof x.apply==='function')try{x.apply(!!force);}catch(e){}resolve(x);return;}setTimeout(wait,40);})();});return controlLoading;}
 controlLoading=new Promise(function(resolve){var s=document.createElement('script');s.src='pristeel-project-control-home-v1.js?pst_home='+Date.now();s.defer=true;s.setAttribute('data-pst-project-control-home-final','1');s.onload=function(){var x=window.PSTProjectControlHomeV1||null;if(x&&typeof x.apply==='function')try{x.apply(true);}catch(e){}resolve(x);};s.onerror=function(){console.error('PPPP Control Room nuk u ngarkua.');resolve(null);};document.head.appendChild(s);}).finally(function(){controlLoading=null;});
 return controlLoading;
}
function projectsAlreadyLoaded(){var p=document.getElementById('page-workspace-projects'),r=window.__pstWorkspaceProjectRows||window._allProjectsCache;return !!(p&&p.querySelector('.pst-pm-page')&&Array.isArray(r)&&r.length);}
function openProjects(filter){
 filter=filter||'operative';var seq=++projectRouteSeq,T=window.PSTOperationalTruthV1;
 if(projectsAlreadyLoaded()){
  activate('page-workspace-projects','projects');
  if(T&&typeof T.setProjectFilter==='function')T.setProjectFilter(filter);
  return true;
 }
 if(T&&typeof T.openProjects==='function')return T.openProjects(filter);
 var out;if(typeof window.pstProjectsModernOpen==='function')out=window.pstProjectsModernOpen();else out=activate('page-workspace-projects','projects');mark('projects');
 Promise.resolve(out).then(function(){ensureTruth().then(function(X){if(seq===projectRouteSeq&&X&&typeof X.setProjectFilter==='function')X.setProjectFilter(filter);});}).catch(function(){});
 return out===undefined?true:out;
}
function fallbackFinance(){try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('finance');}catch(e){}activate('page-finance','finance');try{if(typeof window.finShowHub==='function')window.finShowHub();}catch(e){}return true;}
function fallbackSystem(){try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('apps');}catch(e){}activate('page-workspace-apps','apps');return true;}
function route(key){
 key=S(key).toLowerCase();var T=window.PSTOperationalTruthV1;
 if(key==='home'){
  var H=window.PSTHomeCanonicalV1;if(H&&typeof H.activateHome==='function')H.activateHome();else activate('page-workspace-home','home');
  if(H&&typeof H.render==='function')Promise.resolve(H.render(true)).then(function(){ensureTruth().then(function(X){if(X&&typeof X.syncHome==='function')X.syncHome(true);});return ensureControlRoom(true);}).catch(function(){ensureControlRoom(true);});else ensureControlRoom(true);mark('home');return true;
 }
 if(key==='projects')return openProjects('operative');
 if(key==='tenders')return T&&T.openOpportunities?T.openOpportunities(false):(typeof window.pstTenderBizOpenMonitor==='function'?window.pstTenderBizOpenMonitor():false);
 if(key==='contacts'){var C=window.PSTContactMasterV1,x=false;if(C&&typeof C.open==='function')x=C.open();else if(typeof window.showPage==='function')x=window.showPage('contacts');var p=document.getElementById('page-contacts');if(p){p.classList.add('active');p.style.display='block';}mark('contacts');return x===undefined?true:x;}
 if(key==='finance')return T&&T.openFinance?T.openFinance():fallbackFinance();
 if(key==='apps')return T&&T.openSystem?T.openSystem():fallbackSystem();
 return false;
}
function tileRoute(act){var T=window.PSTOperationalTruthV1;if(act===''||act==='projects')return openProjects('operative');if(act==='waiting')return openProjects('waiting');if(act==='tenders')return T&&T.openOpportunities?T.openOpportunities(true):route('tenders');if(act==='events')return T&&T.openActivity?T.openActivity():false;if(act==='finance')return T&&T.openFinance?T.openFinance():fallbackFinance();return false;}
function installNavigationStability(){
 if(window.__pstNavigationInteractionStabilityV2)return true;
 window.__pstNavigationInteractionStabilityV2=true;window.__pstNavigationInteractionStabilityV1=true;
 try{var R=window.PSTPrimaryNavResilienceV1;if(R){R.ensureAssistant=function(){return true;};R.ensureCommandCenter=function(){return true;};}}catch(e){}
 window.addEventListener('click',function(e){
  var nav=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;
  if(nav){var key=S(nav.getAttribute('data-key')).toLowerCase();if(/^(home|tenders|projects|contacts|finance|apps)$/.test(key)){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();route(key);return;}}
  var tile=e.target&&e.target.closest?e.target.closest('.pst-hog-tile[data-hog-act]'):null;
  if(tile){var act=S(tile.getAttribute('data-hog-act')).toLowerCase();if(act!=='main-action'){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();if(!tileRoute(act))ensureTruth().then(function(){tileRoute(act);});}}
 },true);
 return true;
}
function decorate(){
 installNavigationStability();ensureTruth().then(function(T){if(T){try{T.decorateProjects();}catch(e){}try{T.syncHome(false);}catch(e){}}});
 var p=document.getElementById('page-workspace-home');
 if(!p||!p.classList.contains('active')||p.style.display==='none')return false;
 var pulse=document.getElementById('pst-home-pulse');if(pulse)pulse.remove();
 p.querySelectorAll('.pst-happy-stats').forEach(function(x){x.remove();});
 try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 ensureControlRoom(true);
 return true;
}
ensureTruth();installNavigationStability();
window.PSTHomeHappyV1={decorate:decorate,refresh:decorate,applyNow:decorate,installNavigationStability:installNavigationStability,ensureTruth:ensureTruth,ensureControlRoom:ensureControlRoom,route:route,openProjects:openProjects};
})();
