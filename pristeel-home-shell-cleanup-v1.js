/* PRISTEEL Home shell cleanup v1
 * Home-only visual cleanup. Does not change auth, project selection or data.
 */
(function(){
'use strict';
if(window.__pstHomeShellCleanupV1)return;
window.__pstHomeShellCleanupV1=true;

var hidden=[];
function visibleHome(){
  var page=document.getElementById('page-workspace-home');
  return !!page&&page.style.display!=='none'&&page.classList.contains('active');
}
function text(el){return String((el&&el.textContent)||'').replace(/\s+/g,' ').trim();}
function rememberHide(el){
  if(!el||el.dataset.pstHomeShellHidden==='1')return;
  el.dataset.pstHomeShellHidden='1';
  el.dataset.pstHomeShellDisplay=el.style.display||'';
  el.style.display='none';
  hidden.push(el);
}
function restore(){
  hidden=hidden.filter(function(el){
    if(!el||!el.isConnected)return false;
    if(el.dataset.pstHomeShellHidden==='1'){
      el.style.display=el.dataset.pstHomeShellDisplay||'';
      delete el.dataset.pstHomeShellHidden;
      delete el.dataset.pstHomeShellDisplay;
    }
    return false;
  });
}
function findLegacyHeader(){
  var nodes=Array.prototype.slice.call(document.querySelectorAll('body *')).filter(function(el){
    return text(el)==='Import Dokument';
  });
  for(var i=0;i<nodes.length;i++){
    var cur=nodes[i];
    for(var depth=0;cur&&depth<7;depth++,cur=cur.parentElement){
      var t=text(cur);
      if(/Import Dokument/i.test(t)&&(/Mbyll projektin|Projekt i ri|Eksporto|Administrator/i.test(t))){
        return cur;
      }
    }
  }
  return null;
}
function hideAdministrator(){
  document.querySelectorAll('body *').forEach(function(el){
    if(text(el).toUpperCase()==='ADMINISTRATOR')rememberHide(el);
  });
}
function cleanup(){
  if(!visibleHome()){restore();return false;}
  restore();
  var header=findLegacyHeader();
  if(header)rememberHide(header);
  hideAdministrator();
  document.body.classList.add('pst-home-shell-clean');
  return true;
}
function schedule(){[0,120,400,900,1800].forEach(function(ms){setTimeout(cleanup,ms);});}

var style=document.createElement('style');
style.id='pst-home-shell-cleanup-v1-css';
style.textContent=`
/* Home priorities should read as information, not danger alerts. */
#page-workspace-home .pst-dash-task-overdue .pst-dash-task-timing,
#page-workspace-home .pst-dash-task-timing{color:#6E7C83!important;font-weight:600!important}
#page-workspace-home .pst-ws-action-tag,
#page-workspace-home .pst-dash-task-overdue .pst-ws-action-tag{color:#6D7B82!important;background:#F3F6F7!important;border:1px solid #DDE5E8!important;box-shadow:none!important}
#page-workspace-home .pst-ws-action.pst-dash-task-card{border-left:1px solid #E2E9EC!important}
#page-workspace-home .pst-ws-action.pst-dash-task-card:hover{border-left-color:#CADCE4!important}
/* Keep Home controls visually consistent. */
#page-workspace-home .pst-ws-head .pst-ws-actions .pst-ws-btn{height:36px!important;min-height:36px!important;border-radius:10px!important;padding:0 13px!important}
`;
document.head.appendChild(style);

document.addEventListener('click',function(event){
  if(event.target.closest&&event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh'))schedule();
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeShellCleanupV1={apply:cleanup,schedule:schedule};
schedule();
})();
