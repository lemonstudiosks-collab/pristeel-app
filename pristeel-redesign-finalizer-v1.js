/* PRISTEEL redesign finalizer v1
 * Preview revision: 20260818-priority-card-click1.
 * Re-applies the read-only redesign after legacy workspace renders.
 * Also repairs Home priority-card interaction after visual decorators run.
 * Bounded timeouts only. No polling, observers, writes, auth or project-open overrides.
 */
(function(){
'use strict';
if(window.__pstRedesignFinalizerV1)return;
window.__pstRedesignFinalizerV1=true;

function readability(){
  try{
    var R=window.PSTPlatformReadabilityV1;
    if(R&&typeof R.apply==='function'){R.apply(document);return;}
    if(document.querySelector('script[data-pst-platform-readability]'))return;
    var s=document.createElement('script');
    s.src='pristeel-platform-readability-v1.js?v=20260812-1';
    s.defer=true;
    s.setAttribute('data-pst-platform-readability','1');
    s.onload=function(){var x=window.PSTPlatformReadabilityV1;if(x&&typeof x.apply==='function')x.apply(document);};
    document.head.appendChild(s);
  }catch(e){console.warn('PRISTEEL finalizer readability:',e);}
}

function openPriorityCard(row){
  if(!row)return false;
  var pid=String(row.getAttribute('data-project-id')||'').trim();
  var kind=String(row.getAttribute('data-kind')||'').trim().toLowerCase();
  try{
    if(pid&&typeof window.pstOpenProjectWorkspace==='function'){
      window.pstOpenProjectWorkspace(pid);
      return true;
    }
    if(kind==='task'&&typeof window.pstWorkspaceGo==='function'){
      window.pstWorkspaceGo('tasks');
      return true;
    }
    if(typeof window.pstWorkspaceGo==='function'){
      window.pstWorkspaceGo('projects');
      return true;
    }
  }catch(e){console.warn('PRISTEEL finalizer priority open:',e);}
  return false;
}

function priorityIsUrgent(row){
  if(!row)return false;
  var title=row.dataset&&row.dataset.pstOriginalTitle||'';
  if(!title){
    var t=row.querySelector('.pst-ws-action-title');
    title=t?String(t.getAttribute('title')||t.textContent||''):'';
  }
  var tag=row.querySelector('.pst-ws-action-tag');
  var label=tag?String(tag.textContent||''):'';
  return /^\s*urgjent\b/i.test(title)||/\burgjent\b/i.test(label)||String(row.getAttribute('data-urgent')||'')==='1';
}

function repairPriorityControls(row){
  if(!row)return;
  var controls=row.querySelector('.pst-ws-action-controls');
  if(!controls)return;

  /* DashboardTaskCardsV1 used to add a second broken Open button and could
   * move the canonical Done button into the overflow menu. Restore the
   * canonical controls and keep their original handlers intact. */
  var canonicalOpen=row.querySelector('.pst-ws-action-open');
  var canonicalDone=row.querySelector('.pst-ws-action-done');
  var canonicalDismiss=row.querySelector('.pst-ws-action-dismiss');
  var source=row.querySelector('.pst-task-source-open');

  row.querySelectorAll('.pst-dash-task-open').forEach(function(b){if(b.parentNode)b.remove();});

  if(canonicalDone){
    canonicalDone.textContent='Kryer';
    canonicalDone.title='Shënoje si të kryer';
    canonicalDone.classList.remove('pst-dash-task-dismiss');
  }
  if(canonicalDismiss){
    canonicalDismiss.textContent='•••';
    canonicalDismiss.title='Hiqe nga lista';
  }

  /* Move canonical nodes out of any generated menu before deleting it. */
  if(canonicalOpen)controls.appendChild(canonicalOpen);
  if(canonicalDone)controls.appendChild(canonicalDone);
  if(source)controls.appendChild(source);
  if(canonicalDismiss)controls.appendChild(canonicalDismiss);
  row.querySelectorAll('.pst-dash-task-menu').forEach(function(menu){if(menu.parentNode)menu.remove();});
}

function repairPriorityCards(){
  var page=document.getElementById('page-workspace-home');
  if(!page)return 0;
  var count=0;
  page.querySelectorAll('#pst-ws-home-actions > .pst-canonical-action').forEach(function(row){
    repairPriorityControls(row);
    row.classList.toggle('pst-final-priority-urgent',priorityIsUrgent(row));
    row.style.cursor='pointer';
    row.setAttribute('title','Kliko për ta hapur');

    if(row.dataset.pstFinalPriorityClick!=='1'){
      row.dataset.pstFinalPriorityClick='1';
      row.addEventListener('click',function(event){
        var interactive=event.target&&event.target.closest?event.target.closest('button,a,input,select,textarea,[role="button"]'):null;
        if(interactive)return;
        openPriorityCard(row);
      });
      row.addEventListener('keydown',function(event){
        if(event.key!=='Enter'&&event.key!==' ')return;
        var interactive=event.target&&event.target.closest?event.target.closest('button,a,input,select,textarea,[role="button"]'):null;
        if(interactive)return;
        event.preventDefault();
        openPriorityCard(row);
      });
    }
    count++;
  });
  return count;
}

function installPriorityStyle(){
  if(document.getElementById('pst-final-priority-card-css'))return;
  var s=document.createElement('style');
  s.id='pst-final-priority-card-css';
  s.textContent=`
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action{cursor:pointer!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action .pst-ws-action-main{cursor:pointer!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent{background:#FFF2EF!important;border-color:#E3A198!important;border-left-color:#BF5548!important;box-shadow:0 3px 12px rgba(151,65,54,.10)!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent:hover{background:#FFEAE6!important;border-color:#D98A80!important;border-left-color:#B5483C!important;box-shadow:0 7px 22px rgba(151,65,54,.14)!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent .pst-ws-action-title{color:#79372F!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent .pst-ws-action-tag{background:#B94F43!important;border-color:#B94F43!important;color:#fff!important}
`;
  document.head.appendChild(s);
}

function apply(){
  readability();
  try{
    var C=window.PSTBusinessCommandCenterV1;
    if(C&&typeof C.open==='function')window.openCmdK=C.open;
    if(C&&typeof C.decorateHome==='function')C.decorateHome();
  }catch(e){console.warn('PRISTEEL finalizer search:',e);}
  try{
    var D=window.PSTDashboardTaskCardsV1;
    if(D&&typeof D.decorate==='function')D.decorate();
  }catch(e){console.warn('PRISTEEL finalizer cards:',e);}
  try{
    var H=window.PSTHomeCommandCenterV2;
    if(H&&typeof H.decorate==='function')H.decorate(false);
  }catch(e){console.warn('PRISTEEL finalizer home:',e);}
  try{
    var G=window.PSTBusinessCommandCenterDeepGmail;
    if(G&&document.getElementById('pst-bcc')&&typeof G.decorate==='function')G.decorate();
  }catch(e){console.warn('PRISTEEL finalizer Gmail search:',e);}
  try{
    var P=window.PSTProjectCommandViewV1;
    var projectPage=document.getElementById('page-workspace-project');
    if(P&&projectPage&&projectPage.style.display!=='none'&&typeof P.load==='function')P.load(window.__pstCurrentProjectId||window._curProjId||'',false);
  }catch(e){console.warn('PRISTEEL finalizer project:',e);}
  try{installPriorityStyle();repairPriorityCards();}catch(e){console.warn('PRISTEEL finalizer priority cards:',e);}
}
/* Startup decoration is deliberately short. Later repairs are event-driven, not clock-driven. */
function schedule(){[0,80,220,450].forEach(function(ms){setTimeout(apply,ms);});}

document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(event){
  var t=event.target&&event.target.closest?event.target.closest('.pst-ws-navbtn,#pst-ws-home-refresh,[onclick*="pstWorkspaceGo"],[data-pm-open],[data-release-filter]'):null;
  if(t)[0,80,250,700].forEach(function(ms){setTimeout(apply,ms);});
},true);
if(document.readyState!=='loading')schedule();
window.PSTRedesignFinalizerV1={apply:apply,schedule:schedule,readability:readability,repairPriorityCards:repairPriorityCards,openPriorityCard:openPriorityCard};
})();