/* PRISTEEL Home operational-state policy v1
 * Universal Home rule: one project has one Home role at a time.
 * Canonical operational_state from projects wins over stale task-derived UI.
 * Event-driven only: no polling, no MutationObserver, no project-specific IDs.
 */
(function(){
'use strict';
var VERSION='20260821-2';
if(window.PSTHomeOperationalStatePolicyV1&&window.PSTHomeOperationalStatePolicyV1.version===VERSION)return;
window.__pstHomeOperationalStatePolicyV1=true;
var applying=false,queued=false;
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').trim().toLowerCase();}
function inactive(p){var s=N(p&&p.status);return ['mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost'].indexOf(s)>-1;}
function waitButton(p){return '<button type="button" class="pst-home-wait-item" data-project-id="'+E(p.id)+'" data-pst-operational-wait="1"><span class="pst-home-wait-dot"></span><span class="pst-home-wait-copy"><b>'+E(p.name||'Projekt')+'</b><small>Në pritje të '+E(p.client||'klientit')+' · presim përgjigjen e klientit</small></span><span class="pst-home-wait-arrow">›</span></button>';}
function ensureWaitingHost(actionsHost){var sec=document.getElementById('pst-home-waiting');if(sec)return sec;var owner=actionsHost&&(actionsHost.closest('.pst-ws-card')||actionsHost.parentElement);if(!owner)return null;owner.insertAdjacentHTML('afterend','<section id="pst-home-waiting"><div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër; nuk kërkohet veprim tani.</span></div></div><div class="pst-home-wait-list"></div></section>');return document.getElementById('pst-home-waiting');}
function hasProjectCard(list,id){var hit=false;if(!list)return false;list.querySelectorAll('.pst-home-wait-item[data-project-id]').forEach(function(b){if(b.getAttribute('data-project-id')===id)hit=true;});return hit;}
function bindWaiting(sec){if(!sec)return;sec.querySelectorAll('[data-pst-operational-wait="1"]').forEach(function(b){if(b.__pstOperationalBound)return;b.__pstOperationalBound=true;b.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();var id=b.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);});});}
function actionSnapshot(){try{return window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.snapshot==='function'?window.PSTHomeCanonicalV1.snapshot():null;}catch(e){return null;}}
async function apply(){
 if(applying){queued=true;return false;}applying=true;
 try{
  if(typeof window.supaFetch!=='function')return false;
  var page=document.getElementById('page-workspace-home'),actionsHost=document.getElementById('pst-ws-home-actions'),projectsHost=document.getElementById('pst-ws-home-projects');
  if(!page||!actionsHost||!projectsHost)return false;
  var rows=A(await window.supaFetch('projects?select=id,name,client,ref,status,pipeline_stage,operational_state,operational_state_at,last_activity_at&limit=3000'));
  var wait={},execution={};
  rows.forEach(function(p){var id=String(p&&p.id||'');if(!id||inactive(p))return;var s=N(p.operational_state);if(s==='wait_for_client')wait[id]=p;else if(s==='execution')execution[id]=p;});
  var snap=actionSnapshot(),actionByKey={};A(snap&&snap.actions).forEach(function(a){if(a&&a.key)actionByKey[String(a.key)]=a;});

  /* Confirmed waiting state suppresses all task-derived action cards. Confirmed execution suppresses only bootstrap execution_won tasks; real contract/document actions remain eligible. */
  actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){
    var id=card.getAttribute('data-project-id'),key=card.getAttribute('data-ws-action'),a=actionByKey[key]||null;
    if(wait[id]||(execution[id]&&a&&N(a.source)==='execution_won'))card.remove();
  });

  var sec=document.getElementById('pst-home-waiting');
  if(Object.keys(wait).length)sec=ensureWaitingHost(actionsHost);
  if(sec){
   var list=sec.querySelector('.pst-home-wait-list');
   if(list){
    list.querySelectorAll('[data-pst-operational-wait="1"]').forEach(function(b){if(!wait[b.getAttribute('data-project-id')])b.remove();});
    Object.keys(wait).forEach(function(id){if(!hasProjectCard(list,id))list.insertAdjacentHTML('beforeend',waitButton(wait[id]));});
   }
   if(!sec.querySelector('.pst-home-wait-item'))sec.remove();else bindWaiting(sec);
  }

  /* One project = one role: action OR waiting OR projects-in-work, never duplicated. */
  var occupied={};
  actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
  document.querySelectorAll('#pst-home-waiting .pst-home-wait-item[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
  projectsHost.querySelectorAll('.pst-canonical-project[data-project-id]').forEach(function(card){
    var id=card.getAttribute('data-project-id');
    if(occupied[id]){card.remove();return;}
    if(execution[id]){var n=card.querySelector('.pst-ws-projectcard-next');if(n)n.innerHTML='<b>Hapi i radhës:</b> Koordino prodhimin dhe dokumentacionin e ekzekutimit';}
  });

  var actionCount=actionsHost.querySelectorAll('.pst-canonical-action').length;
  var hb=document.getElementById('pst-ws-b-home');if(hb){hb.textContent=String(actionCount);hb.style.display=actionCount?'inline-flex':'none';}
  var totalProjects=rows.filter(function(p){return !inactive(p);}).length;
  var pb=document.getElementById('pst-ws-b-projects');if(pb){pb.textContent=String(totalProjects);pb.style.display=totalProjects?'inline-flex':'none';}
  page.dataset.pstOperationalPolicy='single-role-v2';
  return true;
 }catch(e){if(window.console)console.warn('PPPP Home operational-state policy:',e);return false;}
 finally{applying=false;if(queued){queued=false;setTimeout(apply,0);}}
}
document.addEventListener('pst:home-canonical-rendered',function(){apply();});
document.addEventListener('pst:modules-ready',function(){setTimeout(apply,0);},{once:true});
window.addEventListener('pageshow',function(){setTimeout(apply,0);});
window.PSTHomeOperationalStatePolicyV1={version:VERSION,apply:apply};
setTimeout(apply,0);
})();
