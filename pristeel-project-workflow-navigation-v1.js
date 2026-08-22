/* PRISTEEL project workflow navigation continuity v1
 * Keeps Project-First context when a project workflow temporarily enters legacy pages.
 * Fixes backward navigation from our offer / calculator / legacy ranking without creating
 * a second router or changing any project/commercial data.
 */
(function(){
'use strict';
if(window.__pstProjectWorkflowNavigationV1)return;
window.__pstProjectWorkflowNavigationV1=true;

var ORIGIN_KEY='__pstProjectWorkflowOrigin';

function data(){return window.__pstIntegrityLastData||null;}
function activeLegacyPage(){
  var p=document.querySelector('.page.active');
  if(!p||!p.id||p.id.indexOf('page-')!==0)return'';
  return p.id.slice(5);
}
function liveProjectId(){
  var d=data();
  return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');
}
function storedOrigin(){
  var o=window[ORIGIN_KEY];
  if(!o||!o.projectId)return null;
  if(o.at&&Date.now()-o.at>4*60*60*1000){window[ORIGIN_KEY]=null;return null;}
  return o;
}
function remember(reason){
  var id=liveProjectId();
  if(!id)return false;
  window[ORIGIN_KEY]={projectId:id,view:'commercial',reason:String(reason||''),at:Date.now()};
  return true;
}
function explicitOfferProject(){
  var s=document.getElementById('oe-proj');
  return String(s&&s.value||'');
}
function returnProjectId(){
  var o=storedOrigin();
  if(o&&o.projectId)return String(o.projectId);
  var page=activeLegacyPage();
  if(page==='oferta'){
    var explicit=explicitOfferProject();
    if(explicit)return explicit;
  }
  return liveProjectId();
}
function logWarn(label,e){try{console.warn('PRISTEEL workflow navigation '+label+':',e);}catch(x){}}
function activateProject(id){
  id=String(id||'');
  if(!id)return;
  window.__pstCurrentProjectId=id;
  window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  var s=document.getElementById('global-proj');if(s)s.value=id;
}
function commercialInjectAndScroll(selector){
  var waits=[0,80,220,500];
  waits.forEach(function(ms){setTimeout(function(){
    try{
      if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('commercial');
      if(window.PSTProjectFirstCommercialV1&&typeof window.PSTProjectFirstCommercialV1.inject==='function')window.PSTProjectFirstCommercialV1.inject();
      if(window.PSTSupplierOfferPostsaveUiV1&&typeof window.PSTSupplierOfferPostsaveUiV1.decorate==='function')window.PSTSupplierOfferPostsaveUiV1.decorate();
      if(selector){var el=document.querySelector(selector);if(el&&ms>=80)el.scrollIntoView({behavior:'auto',block:'start'});}
    }catch(e){logWarn('render',e);}
  },ms);});
}
function supplierCardSelector(){
  var p=document.getElementById('page-workspace-project');
  if(!p)return null;
  var cards=[].slice.call(p.querySelectorAll('.pf2-card'));
  var c=cards.filter(function(x){var b=x.querySelector('header b');return b&&String(b.textContent||'').trim()==='Oferta furnitorësh';})[0];
  if(!c)return null;
  if(!c.id)c.id='pst-project-supplier-offers-card';
  return'#pst-project-supplier-offers-card';
}
function openModern(id,mode){
  id=String(id||returnProjectId());
  if(!id||typeof window.pstOpenProjectWorkspace!=='function')return false;
  activateProject(id);
  try{
    Promise.resolve(window.pstOpenProjectWorkspace(id)).then(function(){
      activateProject(id);
      if(mode==='offers'){
        commercialInjectAndScroll(null);
        setTimeout(function(){var sel=supplierCardSelector();if(sel)commercialInjectAndScroll(sel);},90);
      }else{
        commercialInjectAndScroll('[data-pf2-compare]');
      }
      window[ORIGIN_KEY]=null;
    }).catch(function(e){logWarn('open project',e);});
  }catch(e){logWarn('open project',e);return false;}
  return true;
}
function openComparison(){return openModern(returnProjectId(),'comparison');}
function openSupplierOffers(){return openModern(returnProjectId(),'offers');}

function installFlowBridge(){
  var base=window.flowGoto;
  if(typeof base!=='function'||base.__pstWorkflowContinuityV1)return false;
  var wrapped=function(page){
    page=String(page||'');
    if(page==='ranking'&&returnProjectId()){remember('flow-ranking');if(openComparison())return;}
    if(page==='offers'&&returnProjectId()){remember('flow-offers');if(openSupplierOffers())return;}
    if(page==='kalkulator'||page==='oferta')remember('flow-'+page);
    return base.apply(this,arguments);
  };
  wrapped.__pstWorkflowContinuityV1=true;
  wrapped.__base=base;
  window.flowGoto=wrapped;
  return true;
}
function installBackBridge(){
  var base=window.goBack;
  if(typeof base!=='function'||base.__pstWorkflowContinuityV1)return false;
  var wrapped=function(){
    var page=activeLegacyPage(),id=returnProjectId();
    if(id&&(page==='oferta'||page==='kalkulator')){
      if(openModern(id,'comparison'))return;
    }
    if(id&&page==='ranking'){
      if(openModern(id,'offers'))return;
    }
    return base.apply(this,arguments);
  };
  wrapped.__pstWorkflowContinuityV1=true;
  wrapped.__base=base;
  window.goBack=wrapped;
  return true;
}
function installOfferEntryBridge(){
  var base=window.pstPiNew;
  if(typeof base!=='function'||base.__pstWorkflowContinuityV1)return false;
  var wrapped=function(type){if(String(type||'')==='offer')remember('project-offer-editor');return base.apply(this,arguments);};
  wrapped.__pstWorkflowContinuityV1=true;
  wrapped.__base=base;
  window.pstPiNew=wrapped;
  return true;
}
function install(){installFlowBridge();installBackBridge();installOfferEntryBridge();}

document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('#page-workspace-project [data-pf2-action="offer"],#page-workspace-project [data-pf2-tab="commercial"]'):null;
  if(t)remember('project-commercial');
},true);
document.addEventListener('pst:modules-ready',function(){setTimeout(install,0);setTimeout(install,180);},{once:true});
[0,120,500,1200].forEach(function(ms){setTimeout(install,ms);});

window.PSTProjectWorkflowNavigationV1={
  remember:remember,
  openComparison:openComparison,
  openSupplierOffers:openSupplierOffers,
  install:install,
  activeLegacyPage:activeLegacyPage,
  returnProjectId:returnProjectId
};
})();
