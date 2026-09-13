/* PRISTEEL Opportunities Waiting Bridge v1
 * Keeps Project-Centric Workflow as the click/filter owner while aligning the
 * visible lifecycle with PriSteel's operating rule: once PPPP prepares an
 * outreach draft, that opportunity is already "Në pritje" for the operator.
 * Raw Gmail/delivery state is never changed and no email is sent here.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesWaitingBridgeV1)return;
window.__pstOpportunitiesWaitingBridgeV1=true;

var VERSION='20260913-waiting1';
var api=null,state=null,observer=null,retryCount=0;
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function isDraftReady(row){return /^(draft_pending|draft_created)$/.test(S(row&&row.status).toLowerCase());}
function tenderById(id){return state&&A(state.rows).find(function(r){return S(r&&r.id)===S(id);})||null;}
function markDraftReady(id,row){
  if(!isDraftReady(row))return row;
  try{
    if(!row.__pstOpportunityOriginalStatus)Object.defineProperty(row,'__pstOpportunityOriginalStatus',{value:S(row.status),writable:true,configurable:true});
  }catch(e){row.__pstOpportunityOriginalStatus=S(row.status);}
  row.status='waiting_for_send';
  var tender=tenderById(id);
  if(tender){
    var payload=tender.payload&&typeof tender.payload==='object'?tender.payload:(tender.payload={});
    payload.pppp_waiting_reason='draft_ready';
    var contact=S(payload.ted_contact_status).toLowerCase();
    if(!contact||/^draft/.test(contact))payload.ted_contact_status='contacted';
  }
  return row;
}
function wrapArray(id,arr){
  arr=A(arr);
  arr.forEach(function(row){markDraftReady(id,row);});
  if(arr.__pstOpportunityWaitingArray)return arr;
  try{Object.defineProperty(arr,'__pstOpportunityWaitingArray',{value:true,configurable:true});}catch(e){arr.__pstOpportunityWaitingArray=true;}
  var nativePush=Array.prototype.push;
  try{Object.defineProperty(arr,'push',{configurable:true,writable:true,value:function(){var args=[].slice.call(arguments);args.forEach(function(row){markDraftReady(id,row);});return nativePush.apply(this,args);}});}catch(e){}
  return arr;
}
function wrapMap(map){
  map=map&&typeof map==='object'?map:{};
  Object.keys(map).forEach(function(id){if(Array.isArray(map[id]))map[id]=wrapArray(id,map[id]);});
  if(typeof Proxy!=='function')return map;
  return new Proxy(map,{set:function(target,key,value){target[key]=Array.isArray(value)?wrapArray(key,value):value;return true;}});
}
function installStateBridge(){
  api=window.PSTProjectCentricWorkflowV1||null;
  state=api&&api._state||null;
  if(!state)return false;
  if(state.__pstOpportunityWaitingStateBridge){
    Object.keys(state.outreachByTender||{}).forEach(function(id){A(state.outreachByTender[id]).forEach(function(row){markDraftReady(id,row);});});
    return true;
  }

  var lifecycle=S(state.lifecycle||'new').toLowerCase();
  try{
    Object.defineProperty(state,'lifecycle',{configurable:true,enumerable:true,get:function(){return lifecycle;},set:function(value){var next=S(value||'new').toLowerCase();lifecycle=next==='draft'?'waiting':next;if(lifecycle==='all')state.source='all';}});
    state.lifecycle=lifecycle;
  }catch(e){if(lifecycle==='draft')state.lifecycle='waiting';}

  var outreachMap=wrapMap(state.outreachByTender||{});
  try{
    Object.defineProperty(state,'outreachByTender',{configurable:true,enumerable:true,get:function(){return outreachMap;},set:function(value){outreachMap=wrapMap(value||{});}});
  }catch(e){state.outreachByTender=outreachMap;}
  try{Object.defineProperty(state,'__pstOpportunityWaitingStateBridge',{value:true,configurable:true});}catch(e){state.__pstOpportunityWaitingStateBridge=true;}
  return true;
}
function shouldHideSource(button){
  if(!button)return false;
  var source=S(button.getAttribute('data-pcw-source')).toUpperCase();
  if(source==='ALL'||source==='UNDP_KOSOVO')return true;
  var count=Number(S(button.querySelector('i')&&button.querySelector('i').textContent).replace(/[^0-9.-]/g,''));
  return isFinite(count)&&count<=0;
}
function decorate(){
  if(!installStateBridge())return false;
  var page=document.getElementById('page-kek-tenders');if(!page)return false;
  var life=page.querySelector('#pst-pcw-lifecycle-tabs');
  if(life){
    var draft=life.querySelector('[data-pcw-lifecycle="draft"]');if(draft){draft.hidden=true;draft.setAttribute('aria-hidden','true');}
  }
  var sources=page.querySelector('#pst-pcw-opportunity-tabs');
  if(sources){
    sources.querySelectorAll('[data-pcw-source]').forEach(function(button){
      var hide=shouldHideSource(button);button.hidden=hide;button.setAttribute('aria-hidden',hide?'true':'false');
    });
  }
  page.setAttribute('data-pst-opportunities-waiting-bridge','1');
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
  try{if(api&&typeof api.renderOpportunities==='function')api.renderOpportunities();}catch(e){}
  decorate();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTOpportunitiesWaitingBridgeV1={version:VERSION,decorate:decorate,installStateBridge:installStateBridge,_test:{isDraftReady:isDraftReady,shouldHideSource:shouldHideSource}};
})();
