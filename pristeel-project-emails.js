/* PRISTEEL modules bootstrap — production17 single workspace */
(function(){
'use strict';
if(window.__pstProduction17BootstrapLoaded)return;
window.__pstProduction17BootstrapLoaded=true;
var booting=false;
function hasSession(){try{var s=JSON.parse(localStorage.getItem('pristeel_session')||'null');return !!(s&&(s.access_token||s.refresh_token));}catch(e){return false;}}
function installBootScreen(){
 if(!hasSession())return;booting=true;
 if(!document.getElementById('pst-workspace-boot-css')){var st=document.createElement('style');st.id='pst-workspace-boot-css';st.textContent='html.pst-workspace-booting .app-shell{visibility:hidden!important}#pst-workspace-boot{position:fixed;inset:0;z-index:99999;background:#F4F9FB;display:flex;align-items:center;justify-content:center;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#20272B}#pst-workspace-boot .box{width:310px;text-align:center}#pst-workspace-boot .mark{width:46px;height:46px;margin:0 auto 14px;border-radius:14px 14px 14px 6px;background:linear-gradient(145deg,#72AEC4,#3E7E96);display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:800;box-shadow:0 10px 24px rgba(62,126,150,.22)}#pst-workspace-boot b{display:block;font-size:16px}#pst-workspace-boot span{display:block;font-size:10.5px;color:#7B898F;margin-top:4px}#pst-workspace-boot .bar{height:6px;background:#E4EFF3;border-radius:99px;overflow:hidden;margin-top:18px}#pst-workspace-boot .bar i{display:block;height:100%;width:42%;border-radius:99px;background:linear-gradient(90deg,#67A8C0,#3F7F98);animation:pstBootMove 1.15s ease-in-out infinite}@keyframes pstBootMove{0%{transform:translateX(-110%)}100%{transform:translateX(340%)}}';document.head.appendChild(st);}
 document.documentElement.classList.add('pst-workspace-booting');
 function add(){if(document.getElementById('pst-workspace-boot'))return;var e=document.createElement('div');e.id='pst-workspace-boot';e.innerHTML='<div class="box"><div class="mark">P</div><b>PRISTEEL</b><span>Po përgatitet workspace-i…</span><div class="bar"><i></i></div></div>';document.body.appendChild(e);}if(document.body)add();else document.addEventListener('DOMContentLoaded',add,{once:true});
}
function finishBoot(){if(!booting)return;booting=false;document.documentElement.classList.remove('pst-workspace-booting');var e=document.getElementById('pst-workspace-boot');if(e)e.remove();try{window.dispatchEvent(new CustomEvent('pst:workspace-ready'));}catch(_e){}}
function waitForFinalWorkspace(){var tries=0,t=setInterval(function(){var login=Array.prototype.some.call(document.querySelectorAll('input[type="password"]'),function(x){var r=x.getBoundingClientRect(),s=getComputedStyle(x);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';});var ready=!!(document.getElementById('pst-ws-sidebar')&&document.querySelector('.pst-ws-navbtn')&&document.querySelector('.pst-ws-page,.pst-ws-project-head'));if(login||ready||++tries>110){clearInterval(t);finishBoot();}},80);}
installBootScreen();
var files=[
 'pristeel-login-theme-v2.js?v=20260804-production5',
 'pristeel-gmail-tab-handoff.js?v=20260803-1',
 'pristeel-email-core.js?v=20260801-2',
 'pristeel-google-workspace-auth.js?v=20260802-2',
 'pristeel-project-routing-rules.js?v=20260802-2',
 'pristeel-gmail-project-search-expansion.js?v=20260802-2',
 'pristeel-gmail-auth-gate.js?v=20260803-1',
 'pristeel-email-outreach.js?v=20260801-1',
 'pristeel-email-project.js?v=20260801-1',
 'pristeel-email-daily.js?v=20260802-1',
 'pristeel-drive-import.js?v=20260802-4',
 'pristeel-drive-intelligence.js?v=20260801-1',
 'pristeel-drive-workspace.js?v=20260801-1',
 'pristeel-project-attachments.js?v=20260801-1',
 'pristeel-gmail-intake.js?v=20260801-1',
 'pristeel-gmail-intake-ux.js?v=20260802-1',
 'pristeel-gmail-intake-client.js?v=20260801-1',
 'pristeel-gmail-linked-guard.js?v=20260801-1',
 'pristeel-gmail-open-project.js?v=20260801-1',
 'pristeel-email-relations.js?v=20260801-1',
 'pristeel-project-contacts.js?v=20260801-1',
 'pristeel-email-multi-link-ui.js?v=20260801-1',
 'pristeel-project-gmail-collector.js?v=20260802-1',
 'pristeel-project-gmail-collector-ui-fix.js?v=20260802-2',
 'pristeel-project-gmail-safety.js?v=20260802-3',
 'pristeel-gmail-audit.js?v=20260801-1',
 'pristeel-project-discovery.js?v=20260801-1',
 'pristeel-project-discovery-create-fix.js?v=20260801-1',
 'pristeel-supplier-project-guard.js?v=20260802-2',
 'pristeel-project-schema-compat.js?v=20260801-2',
 'pristeel-historical-project-audit.js?v=20260801-1',
 'pristeel-groq-rate-limit.js?v=20260801-2',
 'pristeel-project-analysis.js?v=20260801-1',
 'pristeel-project-intelligence-ui.js?v=20260802-5',
 'pristeel-ui-v2.js?v=20260801-1',
 'pristeel-ui-session.js?v=20260801-1',
 'pristeel-ui-v2-polish.js?v=20260801-1',
 'pristeel-dashboard-action-controls-v2.js?v=20260804-2',
 'pristeel-utilities.js?v=20260801-1',
 'pristeel-email-shortcuts.js?v=20260801-1',
 'pristeel-visual-refresh.js?v=20260801-2',
 'pristeel-project-board-layout.js?v=20260802-2',
 'pristeel-project-loss.js?v=20260804-2',
 'pristeel-document-shortcuts.js?v=20260804-2',
 'pristeel-invoice-copy-fix.js?v=20260804-2',
 'pristeel-document-center-core.js?v=20260804-2',
 'pristeel-document-adjustments-v3.js?v=20260804-2',
 'pristeel-document-adjustments-v4.js?v=20260804-production4',
 'pristeel-document-adjustments-v4-ui-fix.js?v=20260804-production4',
 'pristeel-document-adjustments-v5-language-v2.js?v=20260804-production5',
 'pristeel-workspace-architecture-v1.js?v=20260804-production3',
 'pristeel-workspace-release-fix-v2.js?v=20260804-production13',
 'pristeel-workspace-runtime-guard.js?v=20260804-production13',
 'pristeel-project-document-reconciliation-lite.js?v=20260804-production8',
 'pristeel-project-status-actions.js?v=20260804-production13',
 'pristeel-projects-modern-list.js?v=20260804-production13',
 'pristeel-project-family-workspace.js?v=20260804-production17',
 'pristeel-project-gmail-documents.js?v=20260804-production17',
 'pristeel-system-health.js?v=20260804-production17',
 'pristeel-production17-controller.js?v=20260804-production17'
];
function load(i){if(window.__pstAbortBootstrap){finishBoot();return;}if(i>=files.length){waitForFinalWorkspace();return;}var s=document.createElement('script');s.src=files[i];s.defer=true;s.setAttribute('data-pst-production17',String(i));s.onload=function(){if(!window.__pstAbortBootstrap)load(i+1);else finishBoot();};s.onerror=function(){console.error('Nuk u ngarkua moduli:',files[i]);if(!window.__pstAbortBootstrap)load(i+1);else finishBoot();};document.head.appendChild(s);}
load(0);setTimeout(finishBoot,15000);
})();