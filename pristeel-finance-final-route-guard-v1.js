/* PRISTEEL Finance Final Route Guard v1
 * Final, narrow navigation guard for the existing Finance surface.
 * Loaded after the canonical primary navigation owner so late router replacement
 * cannot leave Finance selected in the sidebar while page-finance stays blank.
 * Reuses the existing Finance engine and Finance Stability recovery only.
 * No Finance writes, schema changes, Receipt Inbox, Camera, OCR or automation logic.
 */
(function(){
'use strict';
if(window.__pstFinanceFinalRouteGuardV1)return;
window.__pstFinanceFinalRouteGuardV1=true;

function computedVisible(el){
  if(!el||el.hidden)return false;
  try{
    var cs=window.getComputedStyle&&window.getComputedStyle(el);
    if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;
  }catch(e){}
  return !(el.style&&el.style.display==='none');
}

function markFinance(){
  var host=document.getElementById('pst-ws-canonical-nav');
  if(!host)return;
  host.querySelectorAll('.pst-ws-navbtn[data-key]').forEach(function(b){
    b.classList.toggle('active',String(b.dataset.key||'').toLowerCase()==='finance');
  });
}

function surfaceReady(){
  var p=document.getElementById('page-finance');
  var hub=document.getElementById('fin-hub');
  var grid=document.getElementById('fin-hub-grid');
  return !!(p&&p.classList.contains('active')&&computedVisible(p)&&computedVisible(hub)&&grid&&grid.children&&grid.children.length>0);
}

function fallbackRecover(){
  var p=document.getElementById('page-finance');
  if(!p)return false;
  document.querySelectorAll('.page').forEach(function(page){
    if(page===p)return;
    page.classList.remove('active');
    page.style.display='none';
  });
  p.hidden=false;
  p.removeAttribute('hidden');
  p.classList.add('active');
  p.style.setProperty('display','block','important');
  try{if(typeof window.finShowHub==='function')window.finShowHub();}catch(e){}
  try{
    var D=window.PSTFinanceDailyV1;
    if(D&&typeof D.apply==='function')D.apply(true);
  }catch(e){}
  markFinance();
  return true;
}

function recover(){
  markFinance();
  var S=window.PSTFinanceStabilityV2;
  if(S&&typeof S.recoverFinance==='function'){
    try{
      var out=S.recoverFinance();
      Promise.resolve(out).catch(function(){fallbackRecover();});
    }catch(e){fallbackRecover();}
  }else{
    fallbackRecover();
  }
  [0,60,180,500].forEach(function(ms){
    setTimeout(function(){if(!surfaceReady())fallbackRecover();},ms);
  });
  return true;
}

function installWorkspaceRoute(){
  var current=window.pstWorkspaceGo;
  if(typeof current!=='function')return false;
  if(current.__pstFinanceFinalRouteGuardV1)return true;
  var wrapped=function(key){
    if(String(key||'').toLowerCase()==='finance')return recover();
    return current.apply(this,arguments);
  };
  wrapped.__pstFinanceFinalRouteGuardV1=true;
  wrapped.__pstFinanceFinalRouteBase=current;
  window.pstWorkspaceGo=wrapped;
  return true;
}

function patchPrimaryNavApi(){
  var P=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1;
  if(!P||typeof P.openFinance!=='function'||P.openFinance.__pstFinanceFinalRouteGuardV1)return false;
  var original=P.openFinance;
  var guarded=function(){return recover();};
  guarded.__pstFinanceFinalRouteGuardV1=true;
  guarded.__pstFinanceFinalRouteBase=original;
  P.openFinance=guarded;
  return true;
}

function install(){
  installWorkspaceRoute();
  patchPrimaryNavApi();
  return true;
}

install();
[60,250,900].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',function(){install();setTimeout(install,120);},{once:true});
window.addEventListener('pageshow',function(){setTimeout(install,50);});

window.PSTFinanceFinalRouteGuardV1={install:install,recover:recover,surfaceReady:surfaceReady,fallbackRecover:fallbackRecover};
})();
