/* PRISTEEL Workspace runtime guard
 * Final safety layer for navigation and module actions.
 */
(function(){
'use strict';
if(window.__pstWorkspaceRuntimeGuardLoaded)return;
window.__pstWorkspaceRuntimeGuardLoaded=true;

function legacy(page){
  if(typeof window.pstWsLegacy==='function')return window.pstWsLegacy(page);
  if(typeof window.pstV2Go==='function'){window.pstV2Go(page);return true;}
  if(typeof window.showPage==='function'){window.showPage(page);return true;}
  return false;
}
function go(key){
  if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo(key);return true;}
  if(key==='finance')return legacy('finance');
  if(key==='contacts')return legacy('contacts');
  if(key==='inbox')return legacy('inbox');
  if(key==='projects')return legacy('import');
  return false;
}
function text(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim();}
function moduleAction(name){
  var actions={
    'Prokurimi':function(){return legacy('bom');},
    'Detyrat':function(){return legacy('qendra');},
    'Outreach':function(){return legacy('outreach');},
    'Dokumentet':function(){if(typeof window.pstOpenDocumentCenter==='function'){window.pstOpenDocumentCenter('invoice');return true;}return legacy('invoices');},
    'Kalkulatori':function(){return legacy('kalkulator');},
    'Cilësimet':function(){return legacy('settings');},
    'Kontratat':function(){return legacy('contracts');},
    'Skedarët':function(){return legacy('library');},
    'Integrimet':function(){return go('apps');},
    'Pamja klasike':function(){return legacy('qendra');}
  };
  return actions[name]||null;
}
function wire(){
  document.querySelectorAll('.pst-ws-navbtn[data-key]').forEach(function(btn){
    if(btn.__pstGuardWired)return;btn.__pstGuardWired=true;
    btn.addEventListener('click',function(ev){
      var key=btn.getAttribute('data-key');
      if(!key)return;
      setTimeout(function(){
        var active=document.querySelector('.page.active');
        if(!active||getComputedStyle(active).display==='none')go(key);
      },80);
    },true);
  });
  document.querySelectorAll('.pst-ws-app').forEach(function(card){
    if(card.__pstGuardWired)return;
    var n=text(card.querySelector('.pst-ws-app-name'));
    var action=moduleAction(n);if(!action)return;
    card.__pstGuardWired=true;
    card.style.cursor='pointer';
    card.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();action();},true);
  });
  document.querySelectorAll('button,a').forEach(function(el){
    var t=text(el).toLowerCase();
    if(el.__pstRefreshGuard||t!=='rifresko')return;
    el.__pstRefreshGuard=true;
    el.setAttribute('type','button');
    el.addEventListener('click',function(ev){
      ev.preventDefault();ev.stopPropagation();
      if(typeof window.pstOperationalHomeRender==='function')window.pstOperationalHomeRender();
      else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home');
      else if(typeof window.goHome==='function')window.goHome();
    },true);
  });
}
function check(){
  wire();
  var apps=document.querySelector('.pst-ws-navbtn[data-key="apps"] span');
  if(apps&&text(apps)==='Apps')apps.textContent='Modulet';
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check);else check();
var observer=new MutationObserver(check);observer.observe(document.documentElement,{childList:true,subtree:true});
setInterval(check,2500);
})();