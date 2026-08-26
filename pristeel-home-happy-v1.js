/* PRISTEEL Home Happy v11
 * Compatibility shim + live navigation stability guard.
 * Loads Operational Truth, the final PPPP Control Room Home and its production visual layer.
 * v11 keeps Control Room boot deterministic and wires a self-contained Home visual refresh.
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
function ensureVisualCss(){
 if(document.getElementById('pst-home-visual-refresh-v1'))return true;
 var st=document.createElement('style');
 st.id='pst-home-visual-refresh-v1';
 st.textContent=[
  '#page-workspace-home{background:radial-gradient(circle at 8% 0%,rgba(63,120,139,.07),transparent 29%),radial-gradient(circle at 92% 6%,rgba(112,95,157,.055),transparent 25%),#f4f7f8!important}',
  '#pst-project-control-home-v2{max-width:1280px;padding-top:32px}',
  '.pst-cr-hero{border:1px solid rgba(255,255,255,.12);background:radial-gradient(circle at 86% 12%,rgba(132,193,204,.16),transparent 29%),linear-gradient(135deg,#18333d 0%,#214650 58%,#2a5d69 100%);box-shadow:0 18px 45px rgba(31,61,70,.15),0 2px 5px rgba(31,61,70,.08)}',
  '.pst-cr-command{border:1px solid rgba(218,233,237,.92);box-shadow:0 11px 25px rgba(10,34,42,.15)}',
  '.pst-cr-command-mark{background:#eaf3f5;color:#386d7b}',
  '.pst-cr-send{background:#356f7f;box-shadow:0 5px 12px rgba(30,85,101,.18)}.pst-cr-send:hover{background:#2d6271}',
  '.pst-cr-metrics{gap:10px;padding:13px 0 18px;background:transparent;border-top:1px solid rgba(255,255,255,.09)}',
  '.pst-cr-metrics>div{position:relative;min-height:88px;padding:15px 13px 14px 55px;border:1px solid rgba(255,255,255,.105)!important;border-radius:14px;background:rgba(255,255,255,.055);box-shadow:inset 0 1px rgba(255,255,255,.035)}',
  '.pst-cr-metrics>div::before{position:absolute;left:13px;top:15px;width:31px;height:31px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(255,255,255,.11);font-size:14px;line-height:1;font-weight:800}',
  '.pst-cr-metrics>div:nth-child(1)::before{content:"◫";background:rgba(106,170,188,.16);color:#bfe4ec}.pst-cr-metrics>div:nth-child(2)::before{content:"↗";background:rgba(102,181,137,.15);color:#c2e7d0}.pst-cr-metrics>div:nth-child(3)::before{content:"◷";background:rgba(198,163,101,.15);color:#ead9b8}.pst-cr-metrics>div:nth-child(4)::before{content:"✦";background:rgba(145,124,184,.15);color:#ddd0ef}',
  '.pst-cr-metrics span{color:#b4cbd1}.pst-cr-metrics small{color:#a8bec4}',
  '.pst-cr-grid{gap:20px;margin-top:22px}.pst-cr-radar,.pst-cr-stream{border-color:#dce5e8;box-shadow:0 8px 24px rgba(32,61,70,.055),0 1px 2px rgba(32,61,70,.04)}',
  '.pst-cr-radar>header,.pst-cr-stream>header{padding:19px 21px 16px;background:linear-gradient(180deg,#fff,#fbfcfc)}.pst-cr-radar header small{border:1px solid #dce9ec;background:#f0f6f7}',
  '.pst-cr-projects{padding:8px 10px 10px;background:#f8fafb}.pst-cr-project{margin:7px 0;padding:15px;border:1px solid #e2e9eb!important;border-radius:14px;background:#fff;box-shadow:0 2px 7px rgba(37,66,75,.035);transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease}.pst-cr-project:hover{transform:translateY(-1px);background:#fff;border-color:#cadadd!important;box-shadow:0 8px 18px rgba(37,66,75,.075)}',
  '.pst-cr-project:has(.pst-cr-status.execution){border-left:3px solid #7cad91!important}.pst-cr-project:has(.pst-cr-status.active){border-left:3px solid #72a6b5!important}.pst-cr-project:has(.pst-cr-status.waiting){border-left:3px solid #bea875!important}.pst-cr-project:has(.pst-cr-status.quiet){border-left:3px solid #aab5b9!important}',
  '.pst-cr-num{width:26px;height:26px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#f1f5f6;color:#778d95}.pst-cr-project-top>b{font-size:13.25px;color:#223942}.pst-cr-status{border:1px solid transparent}.pst-cr-status.execution{border-color:#d6e9de}.pst-cr-status.active{border-color:#d5e7ec}.pst-cr-status.waiting{border-color:#e8dfc9}.pst-cr-status.quiet{border-color:#e2e6e7}.pst-cr-next{padding-top:7px;border-top:1px dashed #e4eaec}',
  '.pst-cr-feed{padding:7px 9px 10px;background:#f9fbfb}.pst-cr-feed-row{margin:6px 0;padding:11px 10px;border:1px solid #e5ebed!important;border-radius:12px;background:#fff;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease}.pst-cr-feed-row:hover{transform:translateY(-1px);background:#fff;border-color:#d3e0e3!important;box-shadow:0 5px 14px rgba(37,66,75,.06)}',
  '.pst-cr-feed-icon{border:1px solid #dce8eb;background:#eef5f7}.pst-cr-feed-icon.context{border-color:#dcebe2}.pst-cr-feed-icon.offer{border-color:#ebe2d3}.pst-cr-feed-icon.file,.pst-cr-feed-icon.document{background:#f1f0f7;border-color:#e3e0ec;color:#6d6681}',
  '.pst-cr-project:focus-visible,.pst-cr-feed-row:focus-visible,.pst-cr-send:focus-visible,.pst-cr-open-answer:focus-visible{outline:3px solid rgba(83,139,155,.28);outline-offset:2px}',
  '@media(max-width:1050px){.pst-cr-metrics{gap:8px}.pst-cr-metrics>div:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.105)}}',
  '@media(max-width:720px){#pst-project-control-home-v2{padding-top:18px}.pst-cr-metrics{padding:12px 0 15px;gap:8px}.pst-cr-metrics>div{min-height:82px;padding:13px 10px 12px 46px;border-radius:12px}.pst-cr-metrics>div::before{left:9px;top:13px;width:28px;height:28px;border-radius:9px}.pst-cr-projects{padding:6px}.pst-cr-project{margin:6px 0;padding:13px 10px}.pst-cr-feed{padding:6px}}',
  '@media(prefers-reduced-motion:reduce){.pst-cr-project,.pst-cr-feed-row,.pst-cr-arrow,.pst-cr-send{transition:none!important}.pst-cr-project:hover,.pst-cr-feed-row:hover{transform:none!important}}'
 ].join('');
 document.head.appendChild(st);
 return true;
}
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
 ensureVisualCss();
 if(window.__pstProjectControlHomeV2&&window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.apply==='function'){try{window.PSTProjectControlHomeV1.apply(!!force);}catch(e){}return Promise.resolve(window.PSTProjectControlHomeV1);}
 if(controlLoading)return controlLoading;
 var existing=document.querySelector('script[data-pst-project-control-home-final]');
 if(existing){controlLoading=new Promise(function(resolve){var n=0;(function wait(){if(window.__pstProjectControlHomeV2||++n>80){var x=window.__pstProjectControlHomeV2?window.PSTProjectControlHomeV1:null;if(x&&typeof x.apply==='function')try{x.apply(!!force);}catch(e){}resolve(x);return;}setTimeout(wait,40);})();});return controlLoading;}
 controlLoading=new Promise(function(resolve){var s=document.createElement('script');s.src='pristeel-project-control-home-v1.js?pst_home='+Date.now();s.defer=true;s.setAttribute('data-pst-project-control-home-final','1');s.onload=function(){var x=window.__pstProjectControlHomeV2?window.PSTProjectControlHomeV1:null;if(x&&typeof x.apply==='function')try{x.apply(true);}catch(e){}resolve(x);};s.onerror=function(){console.error('PPPP Control Room nuk u ngarkua.');resolve(null);};document.head.appendChild(s);}).finally(function(){controlLoading=null;});
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
 ensureVisualCss();
 installNavigationStability();ensureTruth().then(function(T){if(T){try{T.decorateProjects();}catch(e){}try{T.syncHome(false);}catch(e){}}});
 var p=document.getElementById('page-workspace-home');
 if(!p||!p.classList.contains('active')||p.style.display==='none')return false;
 var pulse=document.getElementById('pst-home-pulse');if(pulse)pulse.remove();
 p.querySelectorAll('.pst-happy-stats').forEach(function(x){x.remove();});
 try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 ensureControlRoom(true);
 return true;
}
function bootControlRoom(){
 try{decorate();}catch(e){}
}
function scheduleInitialBoot(){
 ensureVisualCss();
 bootControlRoom();
 setTimeout(bootControlRoom,180);
 setTimeout(bootControlRoom,700);
 setTimeout(bootControlRoom,1600);
}
ensureVisualCss();ensureTruth();installNavigationStability();
window.PSTHomeHappyV1={decorate:decorate,refresh:decorate,applyNow:decorate,installNavigationStability:installNavigationStability,ensureTruth:ensureTruth,ensureControlRoom:ensureControlRoom,ensureVisualCss:ensureVisualCss,route:route,openProjects:openProjects};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleInitialBoot,{once:true});else scheduleInitialBoot();
window.addEventListener('pageshow',bootControlRoom);
document.addEventListener('visibilitychange',function(){if(!document.hidden)bootControlRoom();});
})();
