/* PRISTEEL Home visual cleanup v1
 * Presentation-only cleanup for Home and the modern Workspace shell.
 * No data writes, auth changes, routing overrides, polling or observers.
 */
(function(){
'use strict';
if(window.__pstHomeVisualCleanupV1)return;
window.__pstHomeVisualCleanupV1=true;

function css(){
  if(document.getElementById('pst-home-visual-cleanup-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-home-visual-cleanup-v1-css';
  s.textContent=`
/* The old project/import toolbar is redundant while a Workspace page is active. */
body.pst-ui-v2:has(#page-workspace-home.active) .topbar,
body.pst-ui-v2:has(#page-workspace-projects.active) .topbar,
body.pst-ui-v2:has(#page-workspace-inbox.active) .topbar,
body.pst-ui-v2:has(#page-workspace-commercial.active) .topbar,
body.pst-ui-v2:has(#page-workspace-apps.active) .topbar,
body.pst-ui-v2:has(#page-workspace-project.active) .topbar,
body.pst-ui-v2:has(#page-finance.active) .topbar,
body.pst-ui-v2:has(#page-contacts.active) .topbar{display:none!important}
body.pst-ui-v2:has(#page-workspace-home.active) #modbar,
body.pst-ui-v2:has(#page-workspace-projects.active) #modbar,
body.pst-ui-v2:has(#page-workspace-inbox.active) #modbar,
body.pst-ui-v2:has(#page-workspace-commercial.active) #modbar,
body.pst-ui-v2:has(#page-workspace-apps.active) #modbar,
body.pst-ui-v2:has(#page-workspace-project.active) #modbar,
body.pst-ui-v2:has(#page-finance.active) #modbar,
body.pst-ui-v2:has(#page-contacts.active) #modbar{display:none!important}

/* Reclaim the vertical space left by the legacy chrome. */
body.pst-ui-v2:has(#page-workspace-home.active) .content,
body.pst-ui-v2:has(#page-workspace-projects.active) .content,
body.pst-ui-v2:has(#page-workspace-inbox.active) .content,
body.pst-ui-v2:has(#page-workspace-commercial.active) .content,
body.pst-ui-v2:has(#page-workspace-apps.active) .content,
body.pst-ui-v2:has(#page-workspace-project.active) .content,
body.pst-ui-v2:has(#page-finance.active) .content,
body.pst-ui-v2:has(#page-contacts.active) .content{padding-top:14px!important}

/* Modern page heads stay contextual, but not oversized. */
#page-workspace-home.active .pst-ws-head,
#page-workspace-projects.active .pst-ws-head,
#page-workspace-inbox.active .pst-ws-head,
#page-workspace-commercial.active .pst-ws-head,
#page-workspace-apps.active .pst-ws-head{margin-bottom:12px!important;align-items:center!important}
#page-workspace-home.active .pst-ws-eyebrow{display:none!important}
#page-workspace-home.active .pst-ws-sub{margin-top:3px!important}

/* Home: keep every useful control, remove air between them. */
#page-workspace-home.active #pst-bcc-home-search{min-height:58px!important;margin:0 0 8px!important;padding:9px 13px!important;border-radius:12px!important}
#page-workspace-home.active .pst-bcc-home-icon{width:36px!important;height:36px!important;border-radius:10px!important}
#page-workspace-home.active .pst-bcc-home-icon svg{width:18px!important;height:18px!important}
#page-workspace-home.active .pst-bcc-home-copy small{margin-top:2px!important}
#page-workspace-home.active .pst-hcc-tabs{margin:0 0 8px!important}
#page-workspace-home.active .pst-hcc-quick-label{margin:0 0 5px 2px!important}
#page-workspace-home.active .pst-ws-quick{margin-bottom:12px!important}
#page-workspace-home.active .pst-ws-card-hd{padding:13px 16px!important}

/* Preserve the approved calm task treatment. */
#page-workspace-home .pst-ws-action.pst-dash-task-card{border:1px solid #E2E9EC!important;border-left:1px solid #E2E9EC!important;background:#fff!important;box-shadow:0 1px 2px rgba(31,55,66,.025)!important}
#page-workspace-home .pst-ws-action.pst-dash-task-card:hover{border-color:#CADCE4!important;border-left-color:#CADCE4!important;background:#FCFEFF!important;box-shadow:0 7px 22px rgba(45,82,97,.06)!important}
#page-workspace-home .pst-dash-task-overdue{border-color:#E2E9EC!important}
#page-workspace-home .pst-ws-action-tag,#page-workspace-home .pst-dash-task-overdue .pst-ws-action-tag,#page-workspace-home .pst-dash-task-today .pst-ws-action-tag{background:#F3F6F7!important;color:#6D7B82!important;border:1px solid #DDE5E8!important;box-shadow:none!important}
#page-workspace-home .pst-dash-task-timing,#page-workspace-home .pst-dash-task-overdue .pst-dash-task-timing{color:#6E7C83!important;font-weight:600!important}
#page-workspace-home .pst-ws-head .pst-ws-actions .pst-ws-btn{height:36px!important;min-height:36px!important;border-radius:10px!important;padding:0 13px!important}

@media(max-width:800px){
  body.pst-ui-v2:has(#page-workspace-home.active) .content,
  body.pst-ui-v2:has(#page-workspace-projects.active) .content,
  body.pst-ui-v2:has(#page-workspace-inbox.active) .content,
  body.pst-ui-v2:has(#page-workspace-commercial.active) .content,
  body.pst-ui-v2:has(#page-workspace-apps.active) .content,
  body.pst-ui-v2:has(#page-workspace-project.active) .content,
  body.pst-ui-v2:has(#page-finance.active) .content,
  body.pst-ui-v2:has(#page-contacts.active) .content{padding-top:10px!important}
  #page-workspace-home.active #pst-bcc-home-search{min-height:54px!important}
}
`;
  document.head.appendChild(s);
}
function apply(){css();return true;}
function schedule(){apply();}
css();
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeVisualCleanupV1={apply:apply,schedule:schedule};
})();
