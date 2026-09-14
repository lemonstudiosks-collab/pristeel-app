/* PRISTEEL Opportunities lifecycle truth bridge v2
 * Keeps Project-Centric Workflow as the click/filter owner while preserving
 * factual lifecycle semantics: a prepared Gmail draft is NOT a sent email.
 * This bridge never changes delivery state and never sends external email.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesWaitingBridgeV1)return;
window.__pstOpportunitiesWaitingBridgeV1=true;

var VERSION='20260914-truth1';
var api=null,state=null,observer=null,retryCount=0;
function S(v){return String(v==null?'':v);}
function isDraftReady(row){return /^(draft_pending|draft_created)$/.test(S(row&&row.status).toLowerCase());}
function shouldHideSource(button){
  if(!button)return false;
  var source=S(button.getAttribute('data-pcw-source')).toUpperCase();
  if(source==='ALL'||source==='UNDP_KOSOVO')return true;
  var count=Number(S(button.querySelector('i')&&button.querySelector('i').textContent).replace(/[^0-9.-]/g,''));
  return isFinite(count)&&count<=0;
}
function installStateBridge(){
  api=window.PSTProjectCentricWorkflowV1||null;
  state=api&&api._state||null;
  if(!state)return false;
  try{Object.defineProperty(state,'__pstOpportunityWaitingStateBridge',{value:true,configurable:true});}catch(e){state.__pstOpportunityWaitingStateBridge=true;}
  return true;
}
function decorate(){
  if(!installStateBridge())return false;
  var page=document.getElementById('page-kek-tenders');if(!page)return false;
  var life=page.querySelector('#pst-pcw-lifecycle-tabs');
  if(life){
    var draft=life.querySelector('[data-pcw-lifecycle="draft"]');
    if(draft){draft.hidden=false;draft.setAttribute('aria-hidden','false');draft.style.setProperty('display','inline-flex','important');}
  }
  var sources=page.querySelector('#pst-pcw-opportunity-tabs');
  if(sources){
    sources.querySelectorAll('[data-pcw-source]').forEach(function(button){
      var hide=shouldHideSource(button);button.hidden=hide;button.setAttribute('aria-hidden',hide?'true':'false');
    });
  }
  page.setAttribute('data-pst-opportunities-waiting-bridge','truth');
  return true;
}
function observe(){
  if(observer||typeof MutationObserver!=='function')return;
  var root=document.getElementById('page-kek-tenders');if(!root)return;
  observer=new MutationObserver(function(){decorate();});
  observer.observe(root,{childList:true,subtree:true});
}
function boot(){
  if(!installStateBridge()){
    if(retryCount++<30)setTimeout(boot,100);
    return;
  }
  decorate();observe();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTOpportunitiesWaitingBridgeV1={version:VERSION,decorate:decorate,installStateBridge:installStateBridge,_test:{isDraftReady:isDraftReady,shouldHideSource:shouldHideSource}};
})();
