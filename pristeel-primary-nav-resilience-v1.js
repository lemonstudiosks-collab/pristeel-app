/* PRISTEEL Primary Navigation Resilience v1
 * Direct, read-only navigation ownership for the six daily PPPP zones.
 * Repairs route-wrapper collisions without changing project/business state.
 */
(function(){
'use strict';
if(window.__pstPrimaryNavResilienceV1)return;
window.__pstPrimaryNavResilienceV1=true;

var KEYS={home:1,tenders:1,projects:1,contacts:1,finance:1,apps:1};
var assistantLoading=false;

function S(v){return String(v==null?'':v);}
function hidePages(except){
  document.querySelectorAll('.page').forEach(function(p){
    if(p===except)return;
    p.classList.remove('active');
    p.style.display='none';
  });
}
function mark(key){
  document.querySelectorAll('#pst-ws-canonical-nav .pst-ws-navbtn,.pst-ws-navbtn').forEach(function(b){
    b.classList.toggle('active',b.getAttribute('data-key')===key);
  });
}
function activate(id,key){
  var p=document.getElementById(id);if(!p)return false;
  hidePages(p);p.classList.add('active');p.style.display='block';mark(key);return p;
}
function applyDecorators(force){
  [0,70,220,650].forEach(function(ms){setTimeout(function(){
    try{var X=window.PSTOperatingExperienceV1;if(X&&typeof X.apply==='function')X.apply();}catch(e){}
    try{var A=window.PSTOperatingAssistantV2;if(A&&typeof A.apply==='function')A.apply(!!force);}catch(e){}
    try{var R=window.PSTRedesignFinalizerV1;if(R&&typeof R.apply==='function')R.apply();}catch(e){}
  },ms);});
}
function ensureAssistant(){
  if(window.PSTOperatingAssistantV2){applyDecorators(true);return true;}
  if(assistantLoading||document.querySelector('script[data-pst-operating-assistant-resilience]'))return false;
  assistantLoading=true;
  var s=document.createElement('script');
  s.src='pristeel-operating-assistant-v2.js?v=20260823-2';s.defer=true;
  s.setAttribute('data-pst-operating-assistant-resilience','1');
  s.onload=function(){assistantLoading=false;applyDecorators(true);};
  s.onerror=function(){assistantLoading=false;};
  document.head.appendChild(s);return false;
}
function openHome(){
  var H=window.PSTHomeCanonicalV1;
  if(H&&typeof H.activateHome==='function')H.activateHome();else activate('page-workspace-home','home');
  if(H&&typeof H.render==='function')Promise.resolve(H.render(true)).then(function(){ensureAssistant();applyDecorators(true);});
  else{ensureAssistant();applyDecorators(true);}
  mark('home');return true;
}
function openOpportunities(){
  var out=false;
  if(typeof window.pstTenderBizOpenMonitor==='function'){out=window.pstTenderBizOpenMonitor();}
  else if(typeof window.pstWsKekTenders==='function'){out=window.pstWsKekTenders();}
  else if(typeof window.showPage==='function'){out=window.showPage('kek-tenders');}
  else out=activate('page-kek-tenders','tenders');
  mark('tenders');applyDecorators(false);return out===undefined?true:out;
}
function openProjects(){
  var out=false;
  if(typeof window.pstProjectsModernOpen==='function')out=window.pstProjectsModernOpen();
  else{
    var page=activate('page-workspace-projects','projects');
    if(page&&typeof window.pstWsRenderProjects==='function')try{window.pstWsRenderProjects();}catch(e){}
    out=!!page;
  }
  mark('projects');applyDecorators(false);return out===undefined?true:out;
}
function openPartners(){
  var C=window.PSTContactMasterV1,out=false;
  if(C&&typeof C.open==='function')out=C.open();
  else if(typeof window.showPage==='function')out=window.showPage('contacts');
  else out=activate('page-contacts','contacts')||activate('page-workspace-contacts','contacts');
  mark('contacts');applyDecorators(false);return out===undefined?true:out;
}
function legacyShow(page){
  try{var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function'){L.showPage(page);return true;}}catch(e){}
  try{if(typeof window.showPage==='function'){window.showPage(page);return true;}}catch(e){}
  return false;
}
function openFinance(){
  var ok=legacyShow('finance');if(!ok)ok=!!activate('page-finance','finance');
  mark('finance');
  setTimeout(function(){try{if(typeof window.finShowHub==='function')window.finShowHub();}catch(e){}applyDecorators(false);},40);
  return ok;
}
function systemFallback(){
  var p=activate('page-workspace-apps','apps');if(!p)return false;
  if(!p.querySelector('.pst-primary-system-fallback')){
    var s=document.createElement('section');s.className='pst-primary-system-fallback';
    s.style.cssText='max-width:980px;margin:26px auto;padding:24px;border:1px solid #dce6ea;border-radius:18px;background:#fff';
    s.innerHTML='<div style="font-size:9px;font-weight:800;letter-spacing:.12em;color:#526b76">SYSTEM</div><h1 style="margin:5px 0 4px;font-size:24px">Sistemi</h1><p style="margin:0 0 18px;color:#77878e;font-size:11px">Integrimet dhe mjetet teknike. Puna e përditshme fillon nga Home ose Projects.</p><div style="display:flex;gap:9px;flex-wrap:wrap"><button type="button" data-sys-gmail>Gmail</button><button type="button" data-sys-docs>Dokumentet</button><button type="button" data-sys-all>Të gjitha modulet</button></div>';
    p.appendChild(s);
    s.querySelectorAll('button').forEach(function(b){b.style.cssText='min-height:38px;padding:0 14px;border:1px solid #d9e3e7;border-radius:10px;background:#f7fafb;color:#455b65;font-weight:700;cursor:pointer';});
    s.querySelector('[data-sys-gmail]').onclick=function(){if(typeof window.pstWsGmail==='function')window.pstWsGmail('inbox');};
    s.querySelector('[data-sys-docs]').onclick=function(){if(typeof window.pstOpenDocumentCenter==='function')window.pstOpenDocumentCenter();};
    s.querySelector('[data-sys-all]').onclick=function(){if(typeof window.openModuleHub==='function')window.openModuleHub();};
  }
  return true;
}
function openSystem(){
  var current=document.getElementById('page-workspace-apps');
  if(current&&S(current.innerHTML).trim()){activate('page-workspace-apps','apps');mark('apps');applyDecorators(false);return true;}
  if(typeof window.openModuleHub==='function'){
    try{window.openModuleHub();mark('apps');applyDecorators(false);return true;}catch(e){}
  }
  var ok=systemFallback();mark('apps');applyDecorators(false);return ok;
}
function route(key){
  key=S(key).toLowerCase();
  if(key==='home')return openHome();
  if(key==='tenders')return openOpportunities();
  if(key==='projects')return openProjects();
  if(key==='contacts')return openPartners();
  if(key==='finance')return openFinance();
  if(key==='apps')return openSystem();
  return false;
}
function intercept(e){
  var b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;
  if(!b)return;var key=S(b.getAttribute('data-key')).toLowerCase();if(!KEYS[key])return;
  e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();route(key);
}
document.addEventListener('click',intercept,true);
document.addEventListener('pst:modules-ready',function(){ensureAssistant();applyDecorators(true);},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){ensureAssistant();applyDecorators(true);});
if(document.readyState!=='loading'){ensureAssistant();applyDecorators(false);}else document.addEventListener('DOMContentLoaded',function(){ensureAssistant();applyDecorators(false);},{once:true});

window.PSTPrimaryNavResilienceV1={route:route,openHome:openHome,openProjects:openProjects,openFinance:openFinance,openSystem:openSystem,ensureAssistant:ensureAssistant};
})();
