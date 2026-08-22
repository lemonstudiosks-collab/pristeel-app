/* PRISTEEL project readability tuning v1
 * Typography-only adjustments for the project register and Project-First workspace.
 * No data access, routing changes, polling or business logic.
 */
(function(){
'use strict';
if(window.__pstProjectReadabilityTuningV1)return;
window.__pstProjectReadabilityTuningV1=true;
var s=document.createElement('style');
s.id='pst-project-readability-tuning-v1-css';
s.textContent=`
/* Të gjitha projektet: daily-use text must be comfortably readable. */
.pst-pm-eyebrow{font-size:10.5px!important}
.pst-pm-title{font-size:26px!important;line-height:1.15!important}
.pst-pm-sub{font-size:12.5px!important;line-height:1.5!important}
.pst-pm-btn{height:38px!important;font-size:12px!important;padding:0 14px!important}
.pst-pm-search{height:40px!important;font-size:12.5px!important;padding:0 13px!important}
.pst-pm-select{height:40px!important;font-size:12px!important;padding:0 11px!important}
.pst-pm-toggle button{height:34px!important;font-size:12px!important;padding:0 12px!important}
.pst-pm-chip{height:32px!important;font-size:11.5px!important;padding:0 11px!important}
.pst-pm-chip i{min-width:19px!important;height:19px!important;font-size:10px!important}
.pst-pm-row{padding:15px 15px 15px 18px!important;gap:20px!important}
.pst-pm-name{font-size:15px!important;line-height:1.3!important}
.pst-pm-client{font-size:12.5px!important;line-height:1.4!important;margin-top:4px!important}
.pst-pm-desc{font-size:11.5px!important;line-height:1.4!important;margin-top:4px!important}
.pst-pm-meta-label{font-size:10px!important;line-height:1.25!important;margin-bottom:5px!important}
.pst-pm-meta-value{font-size:12px!important;line-height:1.4!important}
.pst-pm-badge{font-size:10.5px!important;line-height:1.25!important;padding:4px 8px!important}
.pst-pm-open{height:36px!important;font-size:11.5px!important;padding:0 13px!important}
.pst-pm-menu button{height:36px!important;font-size:12px!important}
.pst-pm-empty,.pst-pm-loading{font-size:12px!important;line-height:1.5!important}
.pst-pm-phase-head b{font-size:11.5px!important}
.pst-pm-phase-head span{font-size:11px!important}
.pst-pm-col-head b{font-size:12px!important}
.pst-pm-col-head i{font-size:10.5px!important}
.pst-pm-board-card{padding:11px 10px 11px 13px!important}
.pst-pm-board-name{font-size:13px!important;line-height:1.35!important}
.pst-pm-board-client{font-size:11.5px!important;line-height:1.4!important}
.pst-pm-board-date{font-size:10.5px!important}
.pst-pm-col-empty{font-size:11.5px!important}
#pst-pm-toast{font-size:12px!important}

/* Individual project: only a gentle lift from the current baseline. */
#page-workspace-project.pf2-on .pst-pi-tab{font-size:13px!important}
#page-workspace-project.pf2-on .pf2-card>header span{font-size:11.5px!important}
#page-workspace-project.pf2-on .pf2-note{font-size:12px!important}
#page-workspace-project.pf2-on .pf2-line span{font-size:12px!important}
#page-workspace-project.pf2-on .pf2-mail span{font-size:11.5px!important}
#page-workspace-project.pf2-on .pf2-mail p{font-size:12px!important}
#page-workspace-project.pf2-on .pf2-gate p{font-size:12px!important}
#page-workspace-project.pf2-on .pf2-flow span{font-size:11.5px!important}
#page-workspace-project.pf2-on .pf2-time small{font-size:11.5px!important}
`;
document.head.appendChild(s);

/* The ordered runtime already loads this tuning module. Use it as the single
 * bridge to the platform-wide typography policy instead of adding another
 * bootstrap owner. The policy is visual-only and applies to future DOM too. */
(function loadPlatformReadability(){
  if(window.__pstPlatformReadabilityV1||document.querySelector('script[data-pst-platform-readability]'))return;
  var r=document.createElement('script');
  r.src='pristeel-platform-readability-v1.js?v=20260822-standard2';
  r.defer=true;
  r.setAttribute('data-pst-platform-readability','1');
  r.onerror=function(){console.error('Nuk u ngarkua standardi i lexueshmërisë së platformës.');};
  document.head.appendChild(r);
})();

window.PSTProjectReadabilityTuningV1={styleId:s.id};
})();
