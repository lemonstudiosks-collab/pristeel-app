/* PRISTEEL Home Canonical Interaction v1
 * UX-only decorator for the canonical Home owner.
 * - Whole action card opens its project/task target, not only the small Hap button.
 * - Urgent/new-client-request cards get a warm amber treatment across the whole card.
 * - No project/task/email data writes.
 */
(function(){
'use strict';
if(window.__pstHomeCanonicalInteractionV1)return;
window.__pstHomeCanonicalInteractionV1=true;

function str(v){return String(v==null?'':v);}
function norm(v){return str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function interactiveTarget(target){return !!(target&&target.closest&&target.closest('button,a,input,select,textarea,[contenteditable="true"],[role="button"]'));}
function openRow(row){
  if(!row)return false;
  var pid=str(row.getAttribute('data-action-project')||'').trim();
  var kind=str(row.getAttribute('data-action-kind')||'').trim().toLowerCase();
  if(pid&&typeof window.pstOpenProjectWorkspace==='function'){
    window.pstOpenProjectWorkspace(pid);
    return true;
  }
  if(kind==='task'&&typeof window.pstWorkspaceGo==='function'){
    window.pstWorkspaceGo('tasks');
    return true;
  }
  return false;
}
function urgentRow(row){
  if(!row)return false;
  var titleNode=row.querySelector('.pst-ws-action-main b');
  var tagNode=row.querySelector('.pst-ws-tag');
  var title=norm(titleNode&&titleNode.textContent);
  var tag=norm(tagNode&&tagNode.textContent);
  return /^(urgjent|urgent)\b/.test(title)||tag==='kerkese e re e klientit'||tag==='kerkese e klientit';
}
function decorate(root){
  root=root&&root.querySelectorAll?root:document;
  var list=[];
  if(root.matches&&root.matches('.pst-canonical-action'))list.push(root);
  Array.prototype.push.apply(list,[].slice.call(root.querySelectorAll('.pst-canonical-action')));
  list.forEach(function(row){
    row.classList.toggle('pst-canonical-action-urgent',urgentRow(row));
    row.setAttribute('data-pst-canonical-row-click','1');
  });
  return list.length;
}
function installStyle(){
  if(document.getElementById('pst-home-canonical-interaction-v1-style'))return;
  var s=document.createElement('style');
  s.id='pst-home-canonical-interaction-v1-style';
  s.textContent='\
.pst-canonical-action[data-pst-canonical-row-click="1"]{cursor:pointer;transition:border-color .14s ease,box-shadow .14s ease,background .14s ease}\
.pst-canonical-action[data-pst-canonical-row-click="1"]:hover{border-color:#b9d3dc;box-shadow:0 5px 16px rgba(57,101,118,.08)}\
.pst-canonical-action.pst-canonical-action-urgent{background:#fff9ed!important;border-color:#dfc184!important;box-shadow:inset 4px 0 0 #c6963f,0 5px 16px rgba(132,96,35,.07)!important}\
.pst-canonical-action.pst-canonical-action-urgent:hover{background:#fff6e4!important;border-color:#d3ad62!important;box-shadow:inset 4px 0 0 #b9842e,0 7px 18px rgba(132,96,35,.10)!important}\
.pst-canonical-action.pst-canonical-action-urgent .pst-ws-action-dot{background:#c6963f!important;box-shadow:0 0 0 4px rgba(198,150,63,.12)!important}\
.pst-canonical-action.pst-canonical-action-urgent .pst-ws-tag{background:#f7e8c8!important;color:#7c5921!important}\
';
  document.head.appendChild(s);
}
function loadOperationalPolicy(){
  var expected='20260821-2';
  if(window.PSTHomeOperationalStatePolicyV1&&window.PSTHomeOperationalStatePolicyV1.version===expected){
    if(typeof window.PSTHomeOperationalStatePolicyV1.apply==='function')setTimeout(function(){window.PSTHomeOperationalStatePolicyV1.apply();},0);
    return;
  }
  var old=document.querySelector('script[data-pst-home-operational-policy-fresh]');
  if(old&&old.parentNode)old.remove();
  window.__pstHomeOperationalStatePolicyV1=false;
  try{delete window.PSTHomeOperationalStatePolicyV1;}catch(e){window.PSTHomeOperationalStatePolicyV1=null;}
  var s=document.createElement('script');
  s.src='pristeel-home-operational-state-policy-v1.js?pst_home_policy='+String(Date.now());
  s.defer=true;
  s.setAttribute('data-pst-home-operational-policy-fresh','1');
  s.onload=function(){try{if(window.PSTHomeOperationalStatePolicyV1&&typeof window.PSTHomeOperationalStatePolicyV1.apply==='function')window.PSTHomeOperationalStatePolicyV1.apply();}catch(e){}};
  s.onerror=function(){console.error('Nuk u ngarkua Home operational-state policy.');};
  document.head.appendChild(s);
}
function onClick(e){
  var row=e.target&&e.target.closest?e.target.closest('.pst-canonical-action'):null;
  if(!row||interactiveTarget(e.target))return;
  if(openRow(row)){
    e.preventDefault();
    e.stopPropagation();
  }
}
function boot(){
  installStyle();
  decorate(document);
  loadOperationalPolicy();
  if(window.MutationObserver&&document.body){
    var observer=new MutationObserver(function(changes){
      changes.forEach(function(change){
        [].slice.call(change.addedNodes||[]).forEach(function(node){if(node&&node.nodeType===1)decorate(node);});
      });
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.__pstHomeCanonicalInteractionObserver=observer;
  }
}
document.addEventListener('click',onClick,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTHomeCanonicalInteractionV1={version:'20260821-3',decorate:decorate,openRow:openRow,urgentRow:urgentRow,loadOperationalPolicy:loadOperationalPolicy,_test:{norm:norm,interactiveTarget:interactiveTarget}};
})();
