/* PPPP UI Standard v1 — real platform presentation owner
 * Applies the approved visual system to the actual PPPP runtime surfaces.
 * No business-data writes, no polling and no replacement of Project/Gmail/Finance/TED engines.
 */
(function(){
'use strict';
if(window.__pstUIStandardV1){try{if(window.PSTUIStandardV1)window.PSTUIStandardV1.apply();}catch(e){}return;}
window.__pstUIStandardV1=true;
function load(attr,src,ready){try{var old=document.querySelector('script['+attr+']');if(old){if(ready)ready();return old;}var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute(attr,'1');s.onload=function(){if(ready)ready();};document.head.appendChild(s);return s;}catch(e){return false;}}
var CSS=`
:root{
 --pst-ui-bg:#F5F7FA;--pst-ui-surface:#FFFFFF;--pst-ui-surface-muted:#F8FAFC;--pst-ui-surface-strong:#EEF2F6;
 --pst-ui-text:#182230;--pst-ui-muted:#52616F;--pst-ui-soft:#7A8794;--pst-ui-border:#E2E8F0;--pst-ui-border-strong:#D4DDE8;
 --pst-ui-primary:#4E7495;--pst-ui-primary-hover:#3B6283;--pst-ui-primary-soft:#EDF4FA;--pst-ui-success:#3E8061;--pst-ui-warning:#A87424;--pst-ui-danger:#B45151;
 --pst-ui-shadow:0 1px 2px rgba(24,34,48,.035);--pst-ui-shadow-hover:0 10px 26px rgba(24,34,48,.07)
}
html.pst-ui-standard-v1 body,html.pst-ui-standard-v1 .main,html.pst-ui-standard-v1 .content,html.pst-ui-standard-v1 .page{background:var(--pst-ui-bg)!important;color:var(--pst-ui-text)!important}
html.pst-ui-standard-v1 body{font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important}
html.pst-ui-standard-v1 .sidebar,html.pst-ui-standard-v1 #pst-ws-sidebar,html.pst-ui-standard-v1 .topbar{background:#fff!important;border-color:var(--pst-ui-border)!important;box-shadow:none!important}
html.pst-ui-standard-v1 #pst-ws-canonical-nav .pst-ws-navbtn,html.pst-ui-standard-v1 .nav-item{min-height:38px;border-radius:9px!important;background:transparent!important;border:1px solid transparent!important;color:var(--pst-ui-muted)!important;font-weight:620!important}
html.pst-ui-standard-v1 #pst-ws-canonical-nav .pst-ws-navbtn:hover,html.pst-ui-standard-v1 .nav-item:hover{background:#F8FAFC!important;border-color:#EDF1F5!important;color:var(--pst-ui-text)!important}
html.pst-ui-standard-v1 #pst-ws-canonical-nav .pst-ws-navbtn.active,html.pst-ui-standard-v1 .nav-item.active{background:var(--pst-ui-primary-soft)!important;border-color:#D9E6F0!important;color:var(--pst-ui-primary-hover)!important;font-weight:760!important}
html.pst-ui-standard-v1 button,html.pst-ui-standard-v1 input,html.pst-ui-standard-v1 select,html.pst-ui-standard-v1 textarea{font-family:inherit}
html.pst-ui-standard-v1 input[type=text],html.pst-ui-standard-v1 input[type=search],html.pst-ui-standard-v1 input[type=email],html.pst-ui-standard-v1 input[type=number],html.pst-ui-standard-v1 input[type=date],html.pst-ui-standard-v1 select,html.pst-ui-standard-v1 textarea{background:#fff!important;border-color:var(--pst-ui-border-strong)!important;border-radius:9px!important;color:var(--pst-ui-text)!important;box-shadow:none!important}
html.pst-ui-standard-v1 input:focus,html.pst-ui-standard-v1 select:focus,html.pst-ui-standard-v1 textarea:focus{border-color:var(--pst-ui-primary)!important;box-shadow:0 0 0 3px rgba(78,116,149,.10)!important;outline:0!important}
html.pst-ui-standard-v1 .btn-primary,html.pst-ui-standard-v1 button.btn-primary,html.pst-ui-standard-v1 .pst-pm-btn.primary,html.pst-ui-standard-v1 .pst-pm-open,html.pst-ui-standard-v1 .pf2-btn.p{background:var(--pst-ui-primary)!important;border-color:var(--pst-ui-primary)!important;color:#fff!important;box-shadow:none!important}
html.pst-ui-standard-v1 .btn-primary:hover,html.pst-ui-standard-v1 button.btn-primary:hover,html.pst-ui-standard-v1 .pst-pm-btn.primary:hover,html.pst-ui-standard-v1 .pst-pm-open:hover,html.pst-ui-standard-v1 .pf2-btn.p:hover{background:var(--pst-ui-primary-hover)!important;border-color:var(--pst-ui-primary-hover)!important}
html.pst-ui-standard-v1 table th,html.pst-ui-standard-v1 .tbl th,html.pst-ui-standard-v1 .pcm-table th{background:#F8FAFC!important;color:var(--pst-ui-muted)!important;border-color:var(--pst-ui-border)!important;font-weight:750!important}
html.pst-ui-standard-v1 table td,html.pst-ui-standard-v1 .tbl td,html.pst-ui-standard-v1 .pcm-table td{border-color:#EDF1F5!important}
html.pst-ui-standard-v1 tbody tr:hover td{background:#FAFCFD!important}

/* Home — actual live Home owner */
#page-workspace-home{background:var(--pst-ui-bg)!important;min-height:100vh!important}
#pst-project-control-home-v2.pst-command-center-v2{max-width:1480px!important;margin:0 auto!important;padding:30px 32px 64px!important;color:var(--pst-ui-text)!important}
#pst-project-control-home-v2.pst-command-center-v2>.pst-live-head,#pst-project-control-home-v2.pst-command-center-v2>.pst-live-needs,#pst-project-control-home-v2.pst-command-center-v2>.pst-live-status{display:none!important}
#pst-project-control-home-v2.pst-command-center-v2>.pst-live-command-shell{background:#fff!important;border:1px solid var(--pst-ui-border)!important;border-radius:14px!important;box-shadow:var(--pst-ui-shadow)!important;padding:16px!important;margin:0 0 16px!important;color:var(--pst-ui-text)!important}
#pst-project-control-home-v2.pst-command-center-v2>.pst-live-command-shell:before{display:none!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command-intro{color:var(--pst-ui-text)!important;margin-bottom:11px!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command-intro span{color:var(--pst-ui-primary)!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command-intro b{color:var(--pst-ui-text)!important;font-size:16px!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command-intro small{color:var(--pst-ui-muted)!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command{background:#F8FAFC!important;border:1px solid var(--pst-ui-border)!important;box-shadow:none!important;border-radius:11px!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-command-mark,#pst-project-control-home-v2.pst-command-center-v2 .pst-live-send{background:var(--pst-ui-primary)!important;color:#fff!important}
#pst-project-control-home-v2.pst-command-center-v2 .pst-live-result{background:#F8FAFC!important;border-color:var(--pst-ui-border)!important;color:#374151!important}
.pst-cc-head h1{font-size:31px!important;letter-spacing:-.75px!important}.pst-cc-head p{font-size:12.5px!important;color:var(--pst-ui-muted)!important}.pst-cc-kicker{color:var(--pst-ui-primary)!important}
.pst-cc-kpi,.pst-cc-card{border-color:var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important}.pst-cc-kpi:hover{border-color:#C8D8E5!important;box-shadow:var(--pst-ui-shadow-hover)!important}
.pst-cc-kpi:nth-child(-n+2):after{background:var(--pst-ui-primary)!important}.pst-cc-card>header button{color:var(--pst-ui-primary)!important}.pst-cc-row>i,.pst-cc-funnel i{background:var(--pst-ui-primary)!important}.pst-cc-donut{background:conic-gradient(var(--pst-ui-primary) 0 calc(var(--a)*1%),var(--pst-ui-warning) calc(var(--a)*1%) calc(var(--b)*1%),#7EA2C0 calc(var(--b)*1%) calc(var(--c)*1%),#D7DEE6 calc(var(--c)*1%) 100%)!important}

/* Projects — real project register */
#page-workspace-projects{background:var(--pst-ui-bg)!important}
#page-workspace-projects .pst-pm-page{max-width:1480px!important;margin:0 auto!important;padding:30px 32px 60px!important}
#page-workspace-projects .pst-pm-head{align-items:center!important;margin-bottom:20px!important}
#page-workspace-projects .pst-pm-eyebrow{font-size:10px!important;letter-spacing:.12em!important;color:var(--pst-ui-primary)!important}
#page-workspace-projects .pst-pm-title{font-size:30px!important;line-height:1.12!important;letter-spacing:-.7px!important;color:var(--pst-ui-text)!important}
#page-workspace-projects .pst-pm-sub{font-size:12px!important;color:var(--pst-ui-muted)!important}
#page-workspace-projects .pst-pm-controls{padding:12px!important;margin-bottom:14px!important;border:1px solid var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important}
#page-workspace-projects .pst-pm-search,#page-workspace-projects .pst-pm-select{height:40px!important;font-size:12px!important}
#page-workspace-projects .pst-pm-toggle{border-color:var(--pst-ui-border)!important;background:#F5F7FA!important}.pst-pm-toggle button.on{color:var(--pst-ui-primary-hover)!important}
#page-workspace-projects .pst-pm-chip{height:31px!important;font-size:10px!important;border-color:var(--pst-ui-border)!important;color:var(--pst-ui-muted)!important}
#page-workspace-projects .pst-pm-chip:hover,#page-workspace-projects .pst-pm-chip.on{background:var(--pst-ui-primary-soft)!important;border-color:#D5E3EE!important;color:var(--pst-ui-primary-hover)!important}
#page-workspace-projects .pst-pm-list{gap:9px!important}
#page-workspace-projects .pst-pm-row{grid-template-columns:minmax(260px,1.8fr) minmax(420px,1.3fr) auto!important;gap:20px!important;padding:16px 15px 16px 19px!important;border:1px solid var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important;transform:none!important}
#page-workspace-projects .pst-pm-row:hover{border-color:#C9D8E4!important;box-shadow:var(--pst-ui-shadow-hover)!important}
#page-workspace-projects .pst-pm-row:before{width:3px!important;top:13px!important;bottom:13px!important}
#page-workspace-projects .pst-pm-name{font-size:14px!important;color:var(--pst-ui-text)!important}.pst-pm-client{font-size:11px!important;color:var(--pst-ui-muted)!important}.pst-pm-desc{font-size:10px!important;color:var(--pst-ui-soft)!important}
#page-workspace-projects .pst-pm-meta-label{font-size:8px!important;color:var(--pst-ui-soft)!important}.pst-pm-meta-value{font-size:10.5px!important;color:var(--pst-ui-muted)!important}.pst-pm-badge{font-size:9px!important;padding:4px 8px!important}
#page-workspace-projects .pst-pm-open{height:35px!important;border-radius:8px!important;font-size:10px!important;padding:0 13px!important}.pst-pm-more{height:35px!important;width:35px!important;border-color:var(--pst-ui-border)!important}
#page-workspace-projects .pst-pm-phase{background:#fff!important;border-color:var(--pst-ui-border)!important;border-radius:13px!important}.pst-pm-col{background:#F8FAFC!important;border-color:var(--pst-ui-border)!important}.pst-pm-col-head{background:#F8FAFC!important}

/* Project Detail — actual project-first workspace */
#page-workspace-project.pf2-on{background:var(--pst-ui-bg)!important}
#page-workspace-project.pf2-on .pst-pi-head,#page-workspace-project.pf2-on .pst-pi-body,#page-workspace-project.pf2-on .pst-pi-tabs{max-width:1480px!important;margin-left:auto!important;margin-right:auto!important}
#page-workspace-project.pf2-on .pst-pi-tabs{display:flex!important;gap:5px!important;padding:7px!important;background:#fff!important;border:1px solid var(--pst-ui-border)!important;border-radius:12px!important;box-shadow:var(--pst-ui-shadow)!important}
#page-workspace-project.pf2-on .pst-pi-tab{min-height:38px!important;padding:0 13px!important;border-radius:8px!important;font-size:11px!important;font-weight:650!important;color:var(--pst-ui-muted)!important;background:transparent!important}
#page-workspace-project.pf2-on .pst-pi-tab.on{background:var(--pst-ui-primary-soft)!important;color:var(--pst-ui-primary-hover)!important;font-weight:760!important}
#page-workspace-project.pf2-on .pf2-hero{gap:14px!important;margin-top:14px!important}.pf2-hero>div,.pf2-hero>aside{border-color:var(--pst-ui-border)!important;border-radius:14px!important;box-shadow:var(--pst-ui-shadow)!important}.pf2-hero>div>span{color:var(--pst-ui-primary)!important}.pf2-hero h2{font-size:22px!important;color:var(--pst-ui-text)!important}.pf2-hero p{font-size:12px!important;color:var(--pst-ui-muted)!important}
#page-workspace-project.pf2-on .pf2-shortcut{border-color:var(--pst-ui-border)!important;border-radius:10px!important}.pf2-shortcut:hover{border-color:#C9D8E4!important;background:#F8FAFC!important}.pf2-shortcut span{font-size:8px!important}.pf2-shortcut b{font-size:11px!important;color:var(--pst-ui-text)!important}.pf2-shortcut small{font-size:9px!important;color:var(--pst-ui-soft)!important}
#page-workspace-project.pf2-on .pf2-grid{gap:14px!important}.pf2-card{border-color:var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important}.pf2-card>header{padding:14px 16px!important;background:#fff!important;border-color:#EDF1F5!important}.pf2-card>header b{font-size:13px!important;color:var(--pst-ui-text)!important}.pf2-card>header span{font-size:10px!important;color:var(--pst-ui-soft)!important}
#page-workspace-project.pf2-on .pf2-line{padding:12px 14px!important;border-color:#EDF1F5!important}.pf2-line b{font-size:12px!important;color:var(--pst-ui-text)!important}.pf2-line span{font-size:10px!important;color:var(--pst-ui-muted)!important}.pf2-line a,.pf2-time a,.pf2-mail a{color:var(--pst-ui-primary)!important}
#page-workspace-project.pf2-on .pf2-gate{border-color:#E7D9BE!important;background:#FFFBF4!important;border-radius:12px!important}.pf2-gate.ok{border-color:#D3E5DA!important;background:#F5FAF7!important}.pf2-gate span{color:var(--pst-ui-warning)!important}.pf2-gate p{font-size:10.5px!important;color:var(--pst-ui-muted)!important}.pf2-badge.ok{background:#EAF4EE!important;color:var(--pst-ui-success)!important}.pf2-badge.warn{background:#FAF1E5!important;color:var(--pst-ui-warning)!important}.pf2-badge.info{background:var(--pst-ui-primary-soft)!important;color:var(--pst-ui-primary-hover)!important}

/* Finance — actual finance hub and ledgers */
#page-finance{background:var(--pst-ui-bg)!important}
#page-finance #fin-hub,#page-finance #fin-tabs,#page-finance [id^="fin-view-"]{max-width:1480px!important;margin-left:auto!important;margin-right:auto!important}
#page-finance #fin-hub{padding:30px 32px 60px!important}
#page-finance #fin-hub-grid{gap:12px!important}
#page-finance #fin-hub-grid>*{border-width:1px!important;border-color:var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important;background:#fff!important;min-height:112px!important}
#page-finance #fin-hub-grid>*:hover{box-shadow:var(--pst-ui-shadow-hover)!important;transform:none!important}
#page-finance #fin-tabs{background:#fff!important;border:1px solid var(--pst-ui-border)!important;border-radius:12px!important;padding:7px!important;box-shadow:var(--pst-ui-shadow)!important}
#page-finance [id^="fin-view-"]{background:transparent!important}
#page-finance #fin-inv-sum>div,#page-finance .card,#page-finance .metric,#page-finance .stat{border-color:var(--pst-ui-border)!important;border-radius:12px!important;box-shadow:var(--pst-ui-shadow)!important;background:#fff!important}
#page-finance table{background:#fff!important;border:1px solid var(--pst-ui-border)!important;border-radius:12px!important;overflow:hidden!important}

/* Opportunities / TED / Contacts / Documents / System */
#page-workspace-opportunities,#page-workspace-tenders,#page-tenders,#page-document-center,#page-workspace-contacts,#page-contacts{background:var(--pst-ui-bg)!important}
#page-workspace-opportunities .card,#page-workspace-tenders .card,#page-tenders .card,#page-document-center .card,.pcm-card{border-color:var(--pst-ui-border)!important;border-radius:13px!important;box-shadow:var(--pst-ui-shadow)!important;background:#fff!important}
#page-document-center,#page-workspace-contacts .pcm-page,#page-contacts .pcm-page{max-width:1480px!important;margin:0 auto!important;padding:30px 32px 60px!important}
.pcm-card{box-shadow:var(--pst-ui-shadow)!important}.pcm-card:hover{box-shadow:var(--pst-ui-shadow-hover)!important}

@media(max-width:1000px){#page-workspace-projects .pst-pm-row{grid-template-columns:1fr!important}.pst-pm-meta{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pst-pm-actions{justify-content:flex-start!important}}
@media(max-width:760px){#pst-project-control-home-v2.pst-command-center-v2,#page-workspace-projects .pst-pm-page,#page-finance #fin-hub,#page-document-center,#page-workspace-contacts .pcm-page,#page-contacts .pcm-page{padding-left:14px!important;padding-right:14px!important}.pst-cc-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}.pst-cc-grid,.pst-cc-grid.three{grid-template-columns:1fr!important}.pf2-grid,.pf2-hero{grid-template-columns:1fr!important}.pst-pm-meta{grid-template-columns:1fr 1fr!important}}
`;
function style(){try{var s=document.getElementById('pst-ui-standard-v1-css');if(!s){s=document.createElement('style');s.id='pst-ui-standard-v1-css';document.head.appendChild(s);}if(s.textContent!==CSS)s.textContent=CSS;return s;}catch(e){return null;}}
function commandCenter(){try{if(window.PSTCommandCenterV2&&typeof window.PSTCommandCenterV2.apply==='function'){window.PSTCommandCenterV2.apply(false);return true;}return load('data-pst-command-center-v2','pristeel-command-center-v2.js?v=20260831-1',function(){try{if(window.PSTCommandCenterV2&&typeof window.PSTCommandCenterV2.apply==='function')window.PSTCommandCenterV2.apply(true);}catch(e){}});}catch(e){return false;}}
function markRealSurfaces(){try{var ids=['page-workspace-home','page-workspace-projects','page-workspace-project','page-finance','page-workspace-opportunities','page-workspace-tenders','page-tenders','page-document-center','page-workspace-contacts','page-contacts'];ids.forEach(function(id){var el=document.getElementById(id);if(el)el.setAttribute('data-pst-ui-standard','v1');});}catch(e){}}
function apply(){try{document.documentElement.classList.add('pst-ui-standard-v1','pst-ui-command-center-v2');}catch(e){}style();markRealSurfaces();commandCenter();return true;}
function schedule(){[0,120,420,1100].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('pst:modules-ready',schedule,{once:true});document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(apply,60);});document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav button,.nav-item,[onclick*="pstWorkspaceGo"],[onclick*="showPage"],[data-pf2-tab]'):null;if(t)[80,260].forEach(function(ms){setTimeout(apply,ms);});},true);if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTUIStandardV1={apply:apply,version:'20260901-real-surfaces-v1'};
})();
