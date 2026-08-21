/* PRISTEEL Home Canonical Interaction v1
 * Final UX/state decorator for the canonical Home owner.
 * - Whole action card opens its project/task target.
 * - Urgent/new-client-request cards get a warm amber treatment.
 * - Operational project state is enforced after the canonical/final Home render.
 * - Read-only: no project/task/email data writes.
 */
(function(){
'use strict';
if(window.__pstHomeCanonicalInteractionV1)return;
window.__pstHomeCanonicalInteractionV1=true;

var VERSION='20260821-4';
var stateApplying=false,stateQueued=false;

function str(v){return String(v==null?'':v);}
function norm(v){return str(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function esc(v){return str(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function interactiveTarget(target){return !!(target&&target.closest&&target.closest('button,a,input,select,textarea,[contenteditable="true"],[role="button"]'));}
function openRow(row){
  if(!row)return false;
  var pid=str(row.getAttribute('data-action-project')||row.getAttribute('data-project-id')||'').trim();
  var kind=str(row.getAttribute('data-action-kind')||row.getAttribute('data-kind')||'').trim().toLowerCase();
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
  var titleNode=row.querySelector('.pst-ws-action-main b,.pst-ws-action-title');
  var tagNode=row.querySelector('.pst-ws-tag,.pst-ws-action-tag');
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
function inactiveProject(p){
  var s=norm(p&&p.status);
  return ['mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost'].indexOf(s)>-1;
}
function ensureWaitingSection(actionsHost){
  var sec=document.getElementById('pst-home-waiting');
  if(sec)return sec;
  var owner=actionsHost&&(actionsHost.closest('.pst-ws-card')||actionsHost.parentElement);
  if(!owner)return null;
  owner.insertAdjacentHTML('afterend','<section id="pst-home-waiting"><div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër; nuk kërkohet veprim tani.</span></div></div><div class="pst-home-wait-list"></div></section>');
  return document.getElementById('pst-home-waiting');
}
function waitingItem(p){
  return '<button type="button" class="pst-home-wait-item" data-project-id="'+esc(p.id)+'" data-pst-operational-wait="1"><span class="pst-home-wait-dot"></span><span class="pst-home-wait-copy"><b>'+esc(p.name||'Projekt')+'</b><small>Në pritje të '+esc(p.client||'klientit')+' · presim përgjigjen e palës tjetër</small></span><span class="pst-home-wait-arrow">›</span></button>';
}
function snapshotActionMap(){
  var out={};
  try{
    var snap=window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.snapshot==='function'?window.PSTHomeCanonicalV1.snapshot():null;
    arr(snap&&snap.actions).forEach(function(a){if(a&&a.key)out[str(a.key)]=a;});
  }catch(e){}
  return out;
}
function bindOperationalWaiting(sec){
  if(!sec)return;
  sec.querySelectorAll('[data-pst-operational-wait="1"]').forEach(function(b){
    if(b.__pstOperationalBound)return;
    b.__pstOperationalBound=true;
    b.addEventListener('click',function(e){
      e.preventDefault();e.stopPropagation();
      var id=b.getAttribute('data-project-id');
      if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);
    });
  });
}
async function applyOperationalStatePolicy(){
  if(stateApplying){stateQueued=true;return false;}
  stateApplying=true;
  try{
    if(typeof window.supaFetch!=='function')return false;
    var page=document.getElementById('page-workspace-home');
    var actionsHost=document.getElementById('pst-ws-home-actions');
    var projectsHost=document.getElementById('pst-ws-home-projects');
    if(!page||!actionsHost||!projectsHost)return false;

    var rows=arr(await window.supaFetch('projects?select=id,name,client,status,pipeline_stage,operational_state,operational_state_at,last_activity_at&limit=3000'));
    var wait={},execution={},stateBy={};
    rows.forEach(function(p){
      var id=str(p&&p.id).trim();if(!id||inactiveProject(p))return;
      var st=norm(p.operational_state);stateBy[id]=st;
      if(st==='wait_for_client')wait[id]=p;
      else if(st==='execution')execution[id]=p;
    });

    var actionMap=snapshotActionMap();
    actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){
      var id=card.getAttribute('data-project-id');
      var key=card.getAttribute('data-ws-action');
      var a=actionMap[key]||null;
      if(wait[id]){card.remove();return;}
      if(execution[id]&&a&&norm(a.source)==='execution_won')card.remove();
    });

    var sec=document.getElementById('pst-home-waiting');
    var existing=[];
    if(sec){
      sec.querySelectorAll('.pst-home-wait-item[data-project-id]').forEach(function(b){
        var id=b.getAttribute('data-project-id');
        if(!id||wait[id]||execution[id])return;
        existing.push({id:id,html:b.outerHTML});
      });
    }
    if(Object.keys(wait).length||existing.length)sec=ensureWaitingSection(actionsHost);
    if(sec){
      var list=sec.querySelector('.pst-home-wait-list');
      if(list){
        var html='';
        Object.keys(wait).sort(function(a,b){return str(wait[a].name).localeCompare(str(wait[b].name));}).forEach(function(id){html+=waitingItem(wait[id]);});
        existing.forEach(function(x){if(!wait[x.id]&&!execution[x.id])html+=x.html;});
        list.innerHTML=html;
      }
      if(!sec.querySelector('.pst-home-wait-item'))sec.remove();else bindOperationalWaiting(sec);
    }

    var occupied={};
    actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
    document.querySelectorAll('#pst-home-waiting .pst-home-wait-item[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
    projectsHost.querySelectorAll('.pst-canonical-project[data-project-id]').forEach(function(card){
      var id=card.getAttribute('data-project-id');
      if(occupied[id]){card.remove();return;}
      if(execution[id]){
        var next=card.querySelector('.pst-ws-projectcard-next');
        if(next)next.innerHTML='<b>Hapi i radhës:</b> Projekt në ekzekutim · ndiq prodhimin dhe dokumentacionin';
      }
    });

    var actionCount=actionsHost.querySelectorAll('.pst-canonical-action').length;
    var hb=document.getElementById('pst-ws-b-home');
    if(hb){hb.textContent=str(actionCount);hb.style.display=actionCount?'inline-flex':'none';}
    page.dataset.pstOperationalPolicy='canonical-interaction-v4';
    page.dataset.pstOperationalPolicyAt=new Date().toISOString();
    decorate(page);
    return true;
  }catch(e){
    if(window.console)console.warn('PPPP Home operational-state enforcement:',e);
    return false;
  }finally{
    stateApplying=false;
    if(stateQueued){stateQueued=false;setTimeout(applyOperationalStatePolicy,0);}
  }
}
function scheduleOperationalStatePolicy(){
  [0,180,650].forEach(function(ms){setTimeout(applyOperationalStatePolicy,ms);});
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
  scheduleOperationalStatePolicy();
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
document.addEventListener('pst:home-canonical-rendered',scheduleOperationalStatePolicy);
document.addEventListener('pst:visual-ready',applyOperationalStatePolicy);
window.addEventListener('pageshow',function(){setTimeout(applyOperationalStatePolicy,0);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTHomeCanonicalInteractionV1={version:VERSION,decorate:decorate,openRow:openRow,urgentRow:urgentRow,applyOperationalStatePolicy:applyOperationalStatePolicy,_test:{norm:norm,interactiveTarget:interactiveTarget}};
})();
