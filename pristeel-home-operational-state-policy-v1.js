/* PRISTEEL Home operational-state policy v1
 * Universal Home rule: one project has one Home role at a time.
 * Canonical operational_state from projects wins over stale task-derived UI.
 * Event-driven only: no polling, no MutationObserver, no project-specific IDs.
 */
(function(){
'use strict';
if(window.__pstHomeOperationalStatePolicyV1)return;
window.__pstHomeOperationalStatePolicyV1=true;
var applying=false,queued=false;
function A(v){return Array.isArray(v)?v:[];}
function E(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return String(v||'').trim().toLowerCase();}
function inactive(p){var s=N(p&&p.status);return ['mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost'].indexOf(s)>-1;}
function waitButton(p){return '<button type="button" class="pst-home-wait-item" data-project-id="'+E(p.id)+'" data-pst-operational-wait="1"><span class="pst-home-wait-dot"></span><span class="pst-home-wait-copy"><b>'+E(p.name||'Projekt')+'</b><small>Në pritje të '+E(p.client||'klientit')+' · gjendje e konfirmuar: presim përgjigjen e klientit</small></span><span class="pst-home-wait-arrow">›</span></button>';}
function ensureWaitingHost(actionsHost){var sec=document.getElementById('pst-home-waiting');if(sec)return sec;var owner=actionsHost&&(actionsHost.closest('.pst-ws-card')||actionsHost.parentElement);if(!owner)return null;owner.insertAdjacentHTML('afterend','<section id="pst-home-waiting"><div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër; nuk kërkohet veprim tani.</span></div></div><div class="pst-home-wait-list"></div></section>');return document.getElementById('pst-home-waiting');}
function bindWaiting(sec){if(!sec)return;sec.querySelectorAll('.pst-home-wait-item').forEach(function(b){if(b.__pstOperationalBound)return;b.__pstOperationalBound=true;b.addEventListener('click',function(){var id=b.getAttribute('data-project-id');if(window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.openBrief==='function')window.PSTHomeCanonicalV1.openBrief(id,'waiting');else if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);});});}
async function apply(){
 if(applying){queued=true;return false;}applying=true;
 try{
  if(typeof window.supaFetch!=='function')return false;
  var page=document.getElementById('page-workspace-home'),actionsHost=document.getElementById('pst-ws-home-actions'),projectsHost=document.getElementById('pst-ws-home-projects');
  if(!page||!actionsHost||!projectsHost)return false;
  var rows=A(await window.supaFetch('projects?select=id,name,client,ref,status,pipeline_stage,operational_state,operational_state_at,last_activity_at&limit=3000'));
  var by={},wait={};rows.forEach(function(p){var id=String(p&&p.id||'');if(!id)return;by[id]=p;if(!inactive(p)&&N(p.operational_state)==='wait_for_client')wait[id]=p;});

  /* Waiting state suppresses stale action cards immediately. */
  actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(wait[id])card.remove();});

  var sec=document.getElementById('pst-home-waiting');
  if(Object.keys(wait).length)sec=ensureWaitingHost(actionsHost);
  if(sec){
   var list=sec.querySelector('.pst-home-wait-list');
   if(list){
    /* Remove operational cards whose project is no longer waiting. Verified canonical cards remain untouched. */
    list.querySelectorAll('[data-pst-operational-wait="1"]').forEach(function(b){if(!wait[b.getAttribute('data-project-id')])b.remove();});
    Object.keys(wait).forEach(function(id){if(!list.querySelector('.pst-home-wait-item[data-project-id="'+CSS.escape(id)+'"]'))list.insertAdjacentHTML('beforeend',waitButton(wait[id]));});
   }
   if(!sec.querySelector('.pst-home-wait-item'))sec.remove();else bindWaiting(sec);
  }

  /* One project = one role: action OR waiting OR projects-in-work, never duplicated. */
  var occupied={};
  actionsHost.querySelectorAll('.pst-canonical-action[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
  document.querySelectorAll('#pst-home-waiting .pst-home-wait-item[data-project-id]').forEach(function(card){var id=card.getAttribute('data-project-id');if(id)occupied[id]=1;});
  projectsHost.querySelectorAll('.pst-canonical-project[data-project-id]').forEach(function(card){if(occupied[card.getAttribute('data-project-id')])card.remove();});

  var actionCount=actionsHost.querySelectorAll('.pst-canonical-action').length;
  var hb=document.getElementById('pst-ws-b-home');if(hb){hb.textContent=String(actionCount);hb.style.display=actionCount?'inline-flex':'none';}
  var totalProjects=rows.filter(function(p){return !inactive(p);}).length;
  var pb=document.getElementById('pst-ws-b-projects');if(pb){pb.textContent=String(totalProjects);pb.style.display=totalProjects?'inline-flex':'none';}
  page.dataset.pstOperationalPolicy='single-role-v1';
  return true;
 }catch(e){if(window.console)console.warn('PPPP Home operational-state policy:',e);return false;}
 finally{applying=false;if(queued){queued=false;setTimeout(apply,0);}}
}
document.addEventListener('pst:home-canonical-rendered',function(){apply();});
document.addEventListener('pst:modules-ready',function(){setTimeout(apply,0);},{once:true});
window.addEventListener('pageshow',function(){setTimeout(apply,0);});
window.PSTHomeOperationalStatePolicyV1={apply:apply};
})();
