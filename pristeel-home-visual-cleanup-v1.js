/* PRISTEEL Home visual cleanup v1
 * Home-only visual cleanup. No data writes, auth changes or global observers.
 */
(function(){
'use strict';
if(window.__pstHomeVisualCleanupV1)return;
window.__pstHomeVisualCleanupV1=true;

var hidden=[];
function txt(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim();}
function homeVisible(){var p=document.getElementById('page-workspace-home');return !!p&&p.style.display!=='none'&&p.classList.contains('active');}
function hide(el){if(!el||el.dataset.pstHomeHidden==='1')return;el.dataset.pstHomeHidden='1';el.dataset.pstHomeDisplay=el.style.display||'';el.style.display='none';hidden.push(el);}
function restore(){hidden.forEach(function(el){if(el&&el.isConnected&&el.dataset.pstHomeHidden==='1'){el.style.display=el.dataset.pstHomeDisplay||'';delete el.dataset.pstHomeHidden;delete el.dataset.pstHomeDisplay;}});hidden=[];}
function legacyTop(){
  var nodes=Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function(el){return txt(el)==='Import Dokument';});
  for(var i=0;i<nodes.length;i++){
    var cur=nodes[i];
    for(var d=0;cur&&d<7;d++,cur=cur.parentElement){
      var t=txt(cur);
      if(/Import Dokument/i.test(t)&&(/Mbyll projektin|Projekt i ri|Eksporto|Administrator/i.test(t)))return cur;
    }
  }
  return null;
}
function applyShell(){
  if(!homeVisible()){restore();return;}
  restore();
  var top=legacyTop();if(top)hide(top);
  document.querySelectorAll('body *').forEach(function(el){if(txt(el).toUpperCase()==='ADMINISTRATOR')hide(el);});
}
function css(){
  if(document.getElementById('pst-home-visual-cleanup-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-home-visual-cleanup-v1-css';
  s.textContent=`
#page-workspace-home .pst-ws-action.pst-dash-task-card{border:1px solid #E2E9EC!important;border-left:1px solid #E2E9EC!important;background:#fff!important;box-shadow:0 1px 2px rgba(31,55,66,.025)!important}
#page-workspace-home .pst-ws-action.pst-dash-task-card:hover{border-color:#CADCE4!important;border-left-color:#CADCE4!important;background:#FCFEFF!important;box-shadow:0 7px 22px rgba(45,82,97,.06)!important}
#page-workspace-home .pst-dash-task-overdue{border-color:#E2E9EC!important}
#page-workspace-home .pst-ws-action-tag,#page-workspace-home .pst-dash-task-overdue .pst-ws-action-tag,#page-workspace-home .pst-dash-task-today .pst-ws-action-tag{background:#F3F6F7!important;color:#6D7B82!important;border:1px solid #DDE5E8!important;box-shadow:none!important}
#page-workspace-home .pst-dash-task-timing,#page-workspace-home .pst-dash-task-overdue .pst-dash-task-timing{color:#6E7C83!important;font-weight:600!important}
#page-workspace-home .pst-ws-head .pst-ws-actions .pst-ws-btn{height:36px!important;min-height:36px!important;border-radius:10px!important;padding:0 13px!important}
`;
  document.head.appendChild(s);
}
function schedule(){[0,120,400,900,1800].forEach(function(ms){setTimeout(applyShell,ms);});}
css();schedule();
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh'))schedule();},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeVisualCleanupV1={apply:function(){css();applyShell();},schedule:schedule};
})();
