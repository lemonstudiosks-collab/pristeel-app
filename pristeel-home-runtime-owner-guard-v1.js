/* PRISTEEL Home Runtime Owner Guard v14
 * Startup visibility belongs to the startup curtain/guard.
 * This module owns the final Workspace Home handoff and the critical navigation
 * lane that must work before the long ordered runtime finishes.
 */
(function(){
'use strict';
if(window.__pstHomeRuntimeOwnerGuardV14)return;
window.__pstHomeRuntimeOwnerGuardV14=true;
window.__pstHomeRuntimeOwnerGuardV13=true;
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
/* Suppress the stale ordered bootstrap copy. A fresh cache-busted Command Center is loaded by this owner. */
window.__pstHomeCommandCenterV2=true;

var bootVersion='20260821-home13-'+Date.now().toString(36);
var runtimeReady=!!window.__pstModulesReady;
var homeReady=false;
var visualReady=false;
var finalizing=null;
var canonicalPromise=null;
var interactionPromise=null;
var commandPromise=null;
var happyPromise=null;
var routerBase=null;
var finalizeTimer=null;
var recoveryTimer=null;
var absoluteTimer=null;
var startupObserver=null;
var startupFallbackTimer=null;
var earlyHomeStarted=false;
var criticalProjectBusy=false;

function S(v){return String(v==null?'':v);}
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
  try{document.dispatchEvent(new CustomEvent('pst:visual-ready',{detail:{owner:'home-runtime-v14',boot:bootVersion}}));}catch(e){}
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
  var page=document.getElementById('page-workspace-home');if(page)page.dataset.pstHomeRecovery=String(reason||'fallback');
  signalVisualReady();
  return true;
}
function routeChainHas(fn,marker){
  var seen=[];
  for(var i=0;i<64&&typeof fn==='function';i++){
    if(fn[marker])return true;
    if(seen.indexOf(fn)>=0)return true;
    seen.push(fn);
    fn=fn.__pstRouteBase||fn.__pstFinanceRouteBase||fn.__pstTenderHomeSignalBase||fn.__base;
  }
  return false;
}
function installFinalRouter(){
  var current=window.pstWorkspaceGo;if(typeof current!=='function')return false;
  if(routeChainHas(current,'__pstCanonicalFinalRouter'))return true;
  var base=current;routerBase=base;
  function finalGo(key){
    var k=String(key||'home').toLowerCase();
    if(k==='home'){renderFinalHome();return true;}
    return base.apply(this,arguments);
  }
  finalGo.__pstCanonicalFinalRouter=true;finalGo.__base=base;finalGo.__pstRouteBase=base;window.pstWorkspaceGo=finalGo;return true;
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
    installFinalRouter();
    hideLegacyHome();
    if(typeof api.activateHome==='function')api.activateHome();
    var ok=await Promise.resolve(api.render(true));
    if(ok===false)throw new Error('Canonical Home render dështoi.');
    await loadInteraction();
    await loadFreshCommandCenter();
    await loadHappy();
    applyFinalDecorators();
    normalizePrimaryLabels();
    var page=document.getElementById('page-workspace-home');
    if(page){
      page.dataset.pstHomeOwner='canonical-v3';
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
  window.pstV2OpenProject=window.pstV2OpenProject||function(id){if(typeof window.pstCriticalOpenProject==='function')return window.pstCriticalOpenProject(id);if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(id);if(typeof window.openOverview==='function')return window.openOverview(id);return false;};
  window.pstV2OpenMail=window.pstV2OpenMail||function(url){if(url){window.open(url,'PRISTEEL_GMAIL');return true;}return compatGo('outreach');};
}
function finalizeHome(){
  runtimeReady=true;clearLegacyLoginBlocker();installCompatApi();normalizePrimaryLabels();
  if(finalizeTimer)clearTimeout(finalizeTimer);
  finalizeTimer=setTimeout(function(){renderFinalHome();},120);
  if(recoveryTimer)clearTimeout(recoveryTimer);
  recoveryTimer=setTimeout(function(){if(!visualReady)revealBestAvailable('modules-ready-timeout');},7000);
}

/* ---------- Critical pre-bootstrap navigation lane ---------- */
function normalizePrimaryLabels(){
  var root=document.getElementById('pst-ws-sidebar');if(!root)return false;
  var byKey={home:'Home',opportunities:'Mundësitë',tenders:'Mundësitë',projects:'Projektet',partners:'Partnerët',contacts:'Partnerët',finance:'Financat',apps:'Sistemi',system:'Sistemi'};
  var byText={'Opportunities':'Mundësitë','Projects':'Projektet','Partners':'Partnerët','Contacts':'Partnerët','Finance':'Financat','System':'Sistemi','Apps':'Sistemi'};
  root.querySelectorAll('.pst-ws-navbtn').forEach(function(b){
    var key=S(b.getAttribute('data-key')||b.getAttribute('data-pst-business-zone')).toLowerCase();
    var label=b.querySelector('.pst-nav-label')||b.querySelector('span');if(!label)return;
    var wanted=byKey[key]||byText[S(label.textContent).trim()]||'';
    if(wanted&&S(label.textContent).trim()!==wanted)label.textContent=wanted;
  });
  return true;
}
function setProjectContext(id){
  id=S(id).trim();if(!id)return'';
  window.__pstCurrentProjectId=id;window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var select=document.getElementById('global-proj');
  if(select&&[].slice.call(select.options||[]).some(function(o){return S(o.value)===id;}))select.value=id;
  return id;
}
function ensureProjectPage(){
  var p=document.getElementById('page-workspace-project');if(p)return p;
  var list=document.getElementById('page-workspace-projects'),host=list&&list.parentNode;
  if(!host)host=document.querySelector('.content')||document.querySelector('.workspace-content')||document.querySelector('.pst-ws-content')||document.querySelector('main')||document.body;
  if(!host)throw new Error('Nuk u gjet zona e projektit në faqe.');
  p=document.createElement('div');p.id='page-workspace-project';p.className='page';p.style.display='none';host.appendChild(p);return p;
}
function activateProjectPage(){
  var p=ensureProjectPage();
  document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});
  p.classList.add('active');p.style.display='block';p.style.visibility='visible';p.style.opacity='1';
  document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',S(b.getAttribute('data-key')).toLowerCase()==='projects');});
  try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}
  return p;
}
function showProjectLoading(id){
  var p=activateProjectPage();p.setAttribute('data-pst-critical-project',S(id));
  p.innerHTML='<div class="pst-ws-page"><div style="margin:24px auto;max-width:820px;background:#fff;border:1px solid #DDE7EB;border-radius:14px;padding:18px 20px;color:#61747C;font:650 12px Inter,Arial,sans-serif">Duke hapur projektin…</div></div>';
  return p;
}
function showProjectFailure(error){
  var p=activateProjectPage();
  p.innerHTML='<div class="pst-ws-page"><div style="margin:24px auto;max-width:820px;background:#fff;border:1px solid #E4C5C1;border-radius:14px;padding:18px 20px;color:#A64B42;font:650 12px Inter,Arial,sans-serif">Projekti nuk u hap: '+S(error&&error.message||error||'gabim i panjohur').replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div></div>';
}
function independentProjectControl(target,row){
  if(!target||!target.closest||!row)return false;
  var el=target.closest('.pst-pm-more,#pst-pm-menu,button,a,input,select,textarea,[role="button"],[data-act],[contenteditable="true"]');
  return !!(el&&row.contains(el));
}
function projectIdFromTarget(target){
  if(!target||!target.closest)return'';
  var home=target.closest('#page-workspace-home [data-live-project],#page-workspace-home [data-live-open]');
  if(home)return S(home.getAttribute('data-live-project')||home.getAttribute('data-live-open')).trim();
  var row=target.closest('#page-workspace-projects .pst-pm-row[data-project-id]');
  if(row){if(independentProjectControl(target,row))return'';return S(row.getAttribute('data-project-id')||row.getAttribute('data-pm-open')).trim();}
  var direct=target.closest('#page-workspace-projects [data-pm-open]');
  if(direct)return S(direct.getAttribute('data-pm-open')).trim();
  var card=target.closest('#page-workspace-home .pst-ws-projectcard');
  if(card){var onclick=S(card.getAttribute('onclick')),m=onclick.match(/pstOpenProjectWorkspace\(['"]([^'"]+)/);if(m&&m[1])return S(m[1]).trim();}
  return'';
}
async function criticalOpenProject(id){
  id=setProjectContext(id);if(!id||criticalProjectBusy)return false;
  criticalProjectBusy=true;showProjectLoading(id);
  var firstError=null;
  try{
    if(typeof window.pstOpenProjectWorkspace==='function'){
      try{await Promise.resolve(window.pstOpenProjectWorkspace(id));activateProjectPage();return true;}catch(e){firstError=e;console.warn('PPPP critical project opener: workspace failed',e);}
    }
    if(typeof window.loadProject==='function'){
      try{await Promise.resolve(window.loadProject(id));activateProjectPage();return true;}catch(e){if(!firstError)firstError=e;}
    }
    var legacy=window.__pstWorkspaceLegacy||{};
    if(typeof legacy.openOverview==='function'){try{await Promise.resolve(legacy.openOverview(id));return true;}catch(e){if(!firstError)firstError=e;}}
    if(typeof window.openOverview==='function'){try{await Promise.resolve(window.openOverview(id));return true;}catch(e){if(!firstError)firstError=e;}}
    throw firstError||new Error('Moduli i projektit nuk është gati.');
  }catch(error){showProjectFailure(error);return false;}finally{criticalProjectBusy=false;}
}
function criticalProjectClick(event){
  var id=projectIdFromTarget(event.target);if(!id)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  criticalOpenProject(id);
}
function criticalProjectKey(event){
  if(event.key!=='Enter'&&event.key!==' ')return;var id=projectIdFromTarget(event.target);if(!id)return;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  criticalOpenProject(id);
}
window.pstCriticalOpenProject=criticalOpenProject;
document.addEventListener('click',criticalProjectClick,true);
document.addEventListener('keydown',criticalProjectKey,true);

function primeHomeAsSoonAsShellExists(){
  normalizePrimaryLabels();
  if(earlyHomeStarted||!hasHomeShell())return false;
  earlyHomeStarted=true;
  /* Reveal the stable Workspace shell early, but preserve the audited rule that canonical Home starts only after modules-ready. */
  clearLegacyLoginBlocker();installCompatApi();revealBestAvailable('early-shell');return true;
}
function startupReconcile(){normalizePrimaryLabels();primeHomeAsSoonAsShellExists();}
function startStartupWatch(){
  startupReconcile();
  if(typeof MutationObserver==='function'&&document.body){
    startupObserver=new MutationObserver(function(){startupReconcile();});
    startupObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
  }else{
    var started=Date.now();
    (function tick(){
      startupReconcile();
      if(Date.now()-started>60000){startupFallbackTimer=null;return;}
      startupFallbackTimer=setTimeout(tick,200);
    })();
  }
  var tries=0;(function waitShell(){startupReconcile();if(earlyHomeStarted||++tries>=300)return;setTimeout(waitShell,50);})();
}
function stopStartupWatch(){
  normalizePrimaryLabels();
  if(startupObserver){try{startupObserver.disconnect();}catch(e){}startupObserver=null;}
  if(startupFallbackTimer){clearTimeout(startupFallbackTimer);startupFallbackTimer=null;}
}
function bootstrapCompat(){
  clearLegacyLoginBlocker();ensureCompatScaffold();installCompatApi();extendStartupDeadline();
  startStartupWatch();
}

var API={
  bootVersion:bootVersion,
  loadCanonical:loadCanonical,loadInteraction:loadInteraction,loadFreshCommandCenter:loadFreshCommandCenter,loadHappy:loadHappy,
  finalizeHome:finalizeHome,installFinalRouter:installFinalRouter,renderCanonical:renderFinalHome,renderFinalHome:renderFinalHome,
  ensureCompatScaffold:ensureCompatScaffold,hideLegacyHome:hideLegacyHome,clearLegacyLoginBlocker:clearLegacyLoginBlocker,
  signalVisualReady:signalVisualReady,revealBestAvailable:revealBestAvailable,normalizePrimaryLabels:normalizePrimaryLabels,
  criticalOpenProject:criticalOpenProject,primeEarlyHome:primeHomeAsSoonAsShellExists,
  isRuntimeReady:function(){return runtimeReady;},isHomeReady:function(){return homeReady;},isVisualReady:function(){return visualReady;}
};
window.PSTHomeRuntimeOwnerGuardV1=window.PSTHomeRuntimeOwnerGuardV2=window.PSTHomeRuntimeOwnerGuardV3=window.PSTHomeRuntimeOwnerGuardV4=window.PSTHomeRuntimeOwnerGuardV5=window.PSTHomeRuntimeOwnerGuardV6=window.PSTHomeRuntimeOwnerGuardV7=window.PSTHomeRuntimeOwnerGuardV8=window.PSTHomeRuntimeOwnerGuardV9=window.PSTHomeRuntimeOwnerGuardV10=window.PSTHomeRuntimeOwnerGuardV11=window.PSTHomeRuntimeOwnerGuardV12=window.PSTHomeRuntimeOwnerGuardV13=window.PSTHomeRuntimeOwnerGuardV14=API;

clearLegacyLoginBlocker();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrapCompat,{once:true});else bootstrapCompat();
document.addEventListener('pst:modules-ready',function(){finalizeHome();setTimeout(stopStartupWatch,400);},{once:true});
if(window.__pstModulesReady){finalizeHome();setTimeout(stopStartupWatch,400);}
absoluteTimer=setTimeout(function(){if(!visualReady)revealBestAvailable('absolute-timeout');},45000);
})();
