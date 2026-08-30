/* PRISTEEL email modules bootstrap */
(function(){
'use strict';

/* Critical startup lane.
 * This runs before the long ordered module sequence so the visible shell does not
 * wait for all business modules before becoming stable, and project navigation
 * is available as soon as the Projects/Home rows exist.
 */
(function criticalStartupLane(){
  if(window.__pstCriticalStartupLaneV1)return;
  window.__pstCriticalStartupLaneV1=true;
  var startedAt=Date.now(),homeTriggered=false,navRequested=false;

  function S(v){return String(v==null?'':v);}
  function setProjectContext(id){
    id=S(id).trim();if(!id)return'';
    window.__pstCurrentProjectId=id;window._curProjId=id;
    try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
    var select=document.getElementById('global-proj');
    if(select&&[].slice.call(select.options||[]).some(function(o){return S(o.value)===id;}))select.value=id;
    return id;
  }
  function ensureProjectPage(){
    var p=document.getElementById('page-workspace-project');
    if(p)return p;
    var list=document.getElementById('page-workspace-projects');
    var host=list&&list.parentNode;
    if(!host)host=document.querySelector('.content')||document.querySelector('.workspace-content')||document.querySelector('.pst-ws-content')||document.querySelector('main')||document.body;
    p=document.createElement('div');p.id='page-workspace-project';p.className='page';p.style.display='none';host.appendChild(p);return p;
  }
  function forceProjectVisible(){
    var p=ensureProjectPage();
    [].slice.call(document.querySelectorAll('.page')).forEach(function(page){if(page!==p){page.classList.remove('active');page.style.display='none';}});
    p.classList.add('active');p.style.display='block';
    document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){var k=S(b.getAttribute('data-key')).toLowerCase();b.classList.toggle('active',k==='projects');});
    return p;
  }
  function showProjectLoading(id){
    var p=forceProjectVisible();
    p.innerHTML='<div class="pst-ws-page"><div style="margin:24px auto;max-width:760px;background:#fff;border:1px solid #DDE7EB;border-radius:14px;padding:18px 20px;color:#61747C;font:650 12px Inter,Arial,sans-serif">Duke hapur projektin…</div></div>';
    p.setAttribute('data-pst-critical-project',S(id));
    return p;
  }
  function showProjectError(error){
    var p=forceProjectVisible();
    p.innerHTML='<div class="pst-ws-page"><div style="margin:24px auto;max-width:760px;background:#fff;border:1px solid #E5C9C5;border-radius:14px;padding:18px 20px;color:#A64B42;font:650 12px Inter,Arial,sans-serif">Projekti nuk u hap: '+S(error&&error.message||error||'gabim i panjohur').replace(/</g,'&lt;')+'</div></div>';
  }
  function openerAvailable(){return typeof window.pstOpenProjectWorkspace==='function'||typeof window.loadProject==='function'||typeof window.openOverview==='function'||!!(window.__pstWorkspaceLegacy&&typeof window.__pstWorkspaceLegacy.openOverview==='function');}
  function waitForOpener(){
    if(openerAvailable())return Promise.resolve(true);
    return new Promise(function(resolve){var n=0;(function wait(){if(openerAvailable()){resolve(true);return;}if(++n>=240){resolve(false);return;}setTimeout(wait,50);})();});
  }
  async function openProject(id){
    id=setProjectContext(id);if(!id)return false;
    showProjectLoading(id);
    try{
      var ready=await waitForOpener();if(!ready)throw new Error('Moduli i projektit nuk u ngarkua me kohë.');
      if(typeof window.pstOpenProjectWorkspace==='function'){
        await Promise.resolve(window.pstOpenProjectWorkspace(id));forceProjectVisible();
        try{document.dispatchEvent(new CustomEvent('pst:project-opened',{detail:{project_id:id,source:'critical-startup'}}));}catch(e){}
        return true;
      }
      if(typeof window.loadProject==='function'){
        await Promise.resolve(window.loadProject(id));forceProjectVisible();return true;
      }
      var legacy=window.__pstWorkspaceLegacy||{};
      if(typeof legacy.openOverview==='function'){await Promise.resolve(legacy.openOverview(id));return true;}
      if(typeof window.openOverview==='function'){await Promise.resolve(window.openOverview(id));return true;}
      throw new Error('Nuk u gjet funksioni i hapjes së projektit.');
    }catch(error){showProjectError(error);return false;}
  }
  function independentControl(target,row){
    if(!target||!target.closest||!row)return false;
    var el=target.closest('.pst-pm-more,#pst-pm-menu,button,a,input,select,textarea,[role="button"],[data-act],[contenteditable="true"]');
    return !!(el&&row.contains(el));
  }
  function projectHit(target){
    if(!target||!target.closest)return'';
    var row=target.closest('#page-workspace-projects .pst-pm-row[data-project-id]');
    if(row&&!independentControl(target,row))return S(row.getAttribute('data-project-id')).trim();
    var home=target.closest('#page-workspace-home [data-live-project],#page-workspace-home [data-live-open],#pst-project-control-home-v2 [data-live-project],#pst-project-control-home-v2 [data-live-open]');
    if(home)return S(home.getAttribute('data-live-project')||home.getAttribute('data-live-open')).trim();
    var direct=target.closest('#page-workspace-projects [data-pm-open]');
    if(direct&&!direct.closest('.pst-pm-more,#pst-pm-menu'))return S(direct.getAttribute('data-pm-open')).trim();
    return'';
  }
  document.addEventListener('click',function(e){
    var id=projectHit(e.target);if(!id)return;
    e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProject(id);
  },true);
  document.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' ')return;var id=projectHit(e.target);if(!id)return;
    e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProject(id);
  },true);
  window.pstCriticalOpenProject=openProject;

  function homeShellReady(){return !!(document.getElementById('page-workspace-home')&&document.getElementById('pst-ws-home-actions')&&document.getElementById('pst-ws-home-projects'));}
  function triggerFinalHomeEarly(){
    if(homeTriggered||!homeShellReady())return false;
    var guard=window.PSTHomeRuntimeOwnerGuardV1;
    if(!guard||typeof guard.finalizeHome!=='function')return false;
    homeTriggered=true;
    try{guard.finalizeHome();}catch(e){homeTriggered=false;return false;}
    return true;
  }
  function loadPrimaryNavEarly(){
    if(window.PSTPrimaryNavResilienceV1){try{window.PSTPrimaryNavResilienceV1.apply();}catch(e){}return true;}
    if(navRequested||!document.getElementById('pst-ws-sidebar'))return false;
    navRequested=true;
    var s=document.createElement('script');
    s.src='pristeel-primary-nav-resilience-v1.js?v=20260827-singleowner1&pst_critical=20260830-startup1';
    s.defer=true;s.setAttribute('data-pst-primary-nav-critical','1');
    s.onload=function(){try{if(window.PSTPrimaryNavResilienceV1)window.PSTPrimaryNavResilienceV1.apply();}catch(e){}};
    s.onerror=function(){navRequested=false;};document.head.appendChild(s);return true;
  }
  function normalizeSidebarLabels(){
    var root=document.getElementById('pst-ws-sidebar');if(!root)return;
    var labels={home:'Home',tenders:'Mundësitë',opportunities:'Mundësitë',projects:'Projektet',contacts:'Partnerët',partners:'Partnerët',finance:'Financat',apps:'Sistemi',system:'Sistemi'};
    root.querySelectorAll('.pst-ws-navbtn').forEach(function(b){
      var key=S(b.getAttribute('data-key')||b.getAttribute('data-pst-business-zone')||b.getAttribute('data-pstBusinessZone')).toLowerCase();
      if(!labels[key])return;var span=b.querySelector('.pst-nav-label')||b.querySelector('span');if(span&&span.textContent!==labels[key])span.textContent=labels[key];
    });
  }
  (function stabilize(){
    triggerFinalHomeEarly();loadPrimaryNavEarly();normalizeSidebarLabels();
    if(Date.now()-startedAt<60000)setTimeout(stabilize,200);
  })();
})();

var files=[
  'pristeel-auth-persistence.js?v=20260812-remember1',
  'pristeel-login-brand-v1.js?v=20260812-readable1',
  'pristeel-login-transition-v2.js?v=20260809-identity1',
  'pristeel-project-identity-lock-v1.js?v=20260809-1',
  'pristeel-project-reference-v1.js?v=20260812-3',
  'pristeel-project-create-dedupe-guard-v1.js?v=20260812-businessref1',
  'pristeel-gmail-tab-handoff.js?v=20260809-2',
  'pristeel-email-core.js?v=20260801-2',
  'pristeel-email-supplier-domain-safety-v1.js?v=20260812-3',
  'pristeel-email-full-body-v1.js?v=20260808-2',
  'pristeel-google-workspace-auth.js?v=20260806-3',
  'pristeel-project-routing-rules.js?v=20260802-2',
  'pristeel-gmail-project-search-expansion.js?v=20260802-2',
  'pristeel-email-outreach.js?v=20260801-1',
  'pristeel-email-project.js?v=20260801-1',
  'pristeel-email-daily.js?v=20260802-1',
  'pristeel-drive-import.js?v=20260809-1',
  'pristeel-drive-intelligence.js?v=20260801-1',
  'pristeel-drive-workspace.js?v=20260801-1',
  'pristeel-project-attachments.js?v=20260801-1',
  'pristeel-email-relations.js?v=20260801-1',
  'pristeel-project-contacts.js?v=20260801-1',
  'pristeel-email-multi-link-ui.js?v=20260801-1',
  'pristeel-project-gmail-collector.js?v=20260802-1',
  'pristeel-project-gmail-collector-ui-fix.js?v=20260802-2',
  'pristeel-project-gmail-safety.js?v=20260802-3',
  'pristeel-gmail-cross-thread-safety-v1.js?v=20260809-3',
  'pristeel-gmail-audit.js?v=20260814-ai1',
  'pristeel-project-discovery.js?v=20260801-1',
  'pristeel-project-discovery-create-fix.js?v=20260801-1',
  'pristeel-supplier-project-guard.js?v=20260802-2',
  'pristeel-project-schema-compat.js?v=20260801-2',
  'pristeel-historical-project-audit.js?v=20260801-1',
  'pristeel-groq-rate-limit.js?v=20260814-ai2',
  'pristeel-gemini-test-ui-v1.js?v=20260814-1',
  'pristeel-project-analysis.js?v=20260801-1',
  'pristeel-project-analysis-document-intelligence-v1.js?v=20260816-2',
  'pristeel-project-intelligence-ui.js?v=20260802-5',
  'pristeel-project-workspace.js?v=20260802-1',
  'pristeel-ui-v2.js?v=20260801-1',
  'pristeel-ui-session.js?v=20260801-1',
  'pristeel-ui-v2-polish.js?v=20260801-1',
  'pristeel-dashboard-action-controls-v2.js?v=20260803-1',
  'pristeel-utilities.js?v=20260808-focusradio1',
  'pristeel-email-shortcuts.js?v=20260801-1',
  'pristeel-visual-refresh.js?v=20260801-2',
  'pristeel-project-board-layout.js?v=20260802-2',
  'pristeel-project-loss.js?v=20260803-1',
  'pristeel-document-shortcuts.js?v=20260803-1',
  'pristeel-invoice-copy-fix.js?v=20260803-1',
  'pristeel-document-center-stable-v2.js?v=20260808-3',
  'pristeel-document-adjustments-v3.js?v=20260803-1',
  'pristeel-dashboard-calm.js?v=20260803-1',
  'pristeel-workspace-architecture-v1.js?v=20260804-1',
  'pristeel-outreach-followup-v1.js?v=20260813-1',
  'pristeel-workspace-release-fix-v3.js?v=20260804-2',
  'pristeel-email-relation-safety-v2.js?v=20260804-1',
  'pristeel-gmail-intake-v3.js?v=20260807-stability1',
  'pristeel-gmail-intake-auth-bridge-v1.js?v=20260809-2',
  'pristeel-gmail-create-linked-v1.js?v=20260807-1',
  'pristeel-gmail-intake-revision-fix-v1.js?v=20260806-2',
  'pristeel-project-drive-lifecycle-v1.js?v=20260808-3',
  'pristeel-contract-classification-v2.js?v=20260805-2',
  'pristeel-project-data-integrity-v1.js?v=20260812-businessref1',
  'pristeel-project-load-stability-v2.js?v=20260828-fastopen1',
  'pristeel-project-state-contract-v1.js?v=20260818-1',
  'pristeel-our-offer-source-v1.js?v=20260812-1',
  'pristeel-project-file-unifier-v2.js?v=20260805-1',
  'pristeel-document-routing-integrity-v1.js?v=20260804-1',
  'pristeel-project-integrity-ui-v1.js?v=20260828-cleanowner1',
  'pristeel-project-attachments-relations-v2.js?v=20260804-1',
  'pristeel-project-integrity-safety-v2.js?v=20260804-1',
  'pristeel-projects-modern-v1.js?v=20260808-2',
  'pristeel-project-readability-tuning-v1.js?v=20260822-standard3',
  'pristeel-project-duplicate-manager-v1.js?v=20260812-businessref1',
  'pristeel-project-duplicate-button-fix-v1.js?v=20260808-3',
  'pristeel-modules-unified-v1.js?v=20260804-1',
  'pristeel-ui-corrections-v2.js?v=20260807-10',
  'pristeel-project-context-navigation-v1.js?v=20260805-1',
  'pristeel-project-linked-gmail-recovery-v2.js?v=20260805-1',
  'pristeel-project-bulk-gmail-recovery-v1.js?v=20260805-1',
  'pristeel-project-closure-direct-v1.js?v=20260805-1',
  'pristeel-project-flow-actions-v1.js?v=20260805-2',
  'pristeel-rfq-stability-v2.js?v=20260807-stability1',
  'pristeel-rfq-no-bom-v1.js?v=20260808-2',
  'pristeel-offer-pricing-stability-v2.js?v=20260807-stability1',
  'pristeel-our-offer-stability-v2.js?v=20260807-stability1',
  'pristeel-offer-project-status-sync-v1.js?v=20260808-1',
  'pristeel-offer-resave-fix-v1.js?v=20260808-1',
  'pristeel-finance-stability-v2.js?v=20260807-stability1',
  'pristeel-workflow-governance-v1.js?v=20260808-6',
  'pristeel-quote-followup-governance-v1.js?v=20260808-2',
  'pristeel-modal-navigation-safety-v2.js?v=20260807-stability1',
  'pristeel-project-open-direct-v1.js?v=20260805-2',
  'pristeel-project-contacts-full-v1.js?v=20260805-1',
  'pristeel-contacts-provenance-ui-v1.js?v=20260811-1',
  'pristeel-dashboard-task-cards-v1.js?v=20260807-10',
  'pristeel-business-command-center-v1.js?v=20260807-10',
  'pristeel-gmail-deep-search-v1.js?v=20260807-10',
  'pristeel-business-command-center-deep-gmail-v1.js?v=20260807-10',
  'pristeel-search-stable-v2.js?v=20260807-stability1',
  'pristeel-project-command-view-v1.js?v=20260807-10',
  'pristeel-project-first-v2.js?v=20260828-activeoverview1',
  'pristeel-email-offer-intake-v1.js?v=20260814-ai1',
  'pristeel-email-offer-intake-ui-fix-v1.js?v=20260809-3',
  'pristeel-email-offer-intake-structured-fallback-v1.js?v=20260809-3',
  'pristeel-email-offer-analysis-router-v1.js?v=20260809-1',
  'pristeel-email-offer-draft-editor-bridge-v1.js?v=20260812-currency1',
  'pristeel-supplier-offer-postsave-ui-v1.js?v=20260809-1',
  'pristeel-project-first-execution-v1.js?v=20260808-1',
  'pristeel-project-first-actions-v1.js?v=20260828-headerclean1',
  'pristeel-supplier-capability-manager-v1.js?v=20260808-3',
  'pristeel-project-first-commercial-v1.js?v=20260822-layout1',
  'pristeel-commercial-layout-hotfix-v1.js?v=20260822-layout1',
  'pristeel-project-file-upload-v1.js?v=20260808-1',
  'pristeel-project-bom-document-extract-v1.js?v=20260810-1',
  'pristeel-project-first-bom-preview-v1.js?v=20260810-1',
  'pristeel-project-first-rfq-draft-v1.js?v=20260810-single-source1',
  'pristeel-bom-rfq-autoflow-v1.js?v=20260815-rfqbody1',
  'pristeel-home-command-center-v2.js?v=20260807-12',
  'pristeel-redesign-finalizer-v1.js?v=20260828-sourcelink1',
  'pristeel-home-live-fix-v1.js?v=20260817-1',
  'pristeel-home-stability-v2.js?v=20260817-1',
  'pristeel-home-project-recovery-v3.js?v=20260817-1',
  'pristeel-home-visual-cleanup-v1.js?v=20260817-1',
  'pristeel-commercial-navigation-fix-v1.js?v=20260808-4',
  'pristeel-commercial-document-builder-v1.js?v=20260808-2',
  'pristeel-project-commercial-prefill-rescue-v1.js?v=20260820-bridge3',
  'pristeel-project-commercial-component-pricing-v1.js?v=20260809-2',
  'pristeel-offer-position-preservation-v1.js?v=20260809-1',
  'pristeel-offer-final-output-fix-v1.js?v=20260810-3',
  'pristeel-offer-client-output-finalizer-v1.js?v=20260818-draftgate2',
  'pristeel-offer-number-integrity-v1.js?v=20260810-visible1',
  'pristeel-invoice-identity-v1.js?v=20260809-1',
  'pristeel-invoice-project-link-v1.js?v=20260811-1',
  'pristeel-document-currency-v1.js?v=20260811-1',
  'pristeel-gmail-live-inbox-v2.js?v=20260808-2',
  'pristeel-gmail-live-triage-v1.js?v=20260813-1',
  'pristeel-gmail-intake-click-fix-v1.js?v=20260808-1',
  'pristeel-kek-tender-watch-v1.js?v=20260827-singleowner1',
  'pristeel-project-lifecycle-tracking-v1.js?v=20260815-1',
  'pristeel-project-intelligence-resilience-v1.js?v=20260815-1',
  'pristeel-project-workflow-canonical-v1.js?v=20260822-flow2',
  'pristeel-project-workflow-legacy-capture-v1.js?v=20260822-flow2',
  'pristeel-tender-priority-actions-v1.js?v=20260827-ux1',
  'pristeel-home-operating-grid-v1.js?v=20260823-homegrid2',
  'pristeel-project-classification-v1.js?v=20260830-rowopen1',
  'pristeel-primary-nav-resilience-v1.js?v=20260827-singleowner1',
  'pristeel-project-execution-guard-v1.js?v=20260829-postaward1'
];
var completed=false,timeoutMs=8000,maxAttempts=2;
var diag=window.__pstBootstrapDiagnostics=window.__pstBootstrapDiagnostics||{started_at:new Date().toISOString(),total:files.length,loaded:0,errors:[],timeouts:[],retries:[],completed:false};
function ready(){if(completed)return;completed=true;diag.completed=true;diag.completed_at=new Date().toISOString();window.__pstModulesReady=true;try{document.dispatchEvent(new CustomEvent('pst:modules-ready'));}catch(e){}}
function next(i){if(window.__pstAbortBootstrap){ready();return;}load(i+1,1);}
function load(i,attempt){
 if(i>=files.length){ready();return;}
 if(window.__pstAbortBootstrap){ready();return;}
 attempt=attempt||1;
 var base=files[i],src=base;
 if(base.indexOf('pristeel-project-open-direct-v1.js?')===0)src=base+'&pst_hotfix=20260830-navrepair2';
 if(attempt>1)src=src+(src.indexOf('?')>-1?'&':'?')+'pst_retry='+Date.now();
 var el=document.createElement('script'),settled=false,timer=null;
 el.src=src;el.defer=true;el.setAttribute('data-pst-bootstrap-index',String(i));el.setAttribute('data-pst-bootstrap-attempt',String(attempt));
 function finish(kind,error){
  if(settled)return;settled=true;if(timer)clearTimeout(timer);el.onload=null;el.onerror=null;
  if(kind==='load'){diag.loaded++;next(i);return;}
  try{el.remove();}catch(e){}
  var row={index:i,module:base,attempt:attempt,at:new Date().toISOString(),error:error?String(error):null};
  if(kind==='timeout')diag.timeouts.push(row);else diag.errors.push(row);
  if(attempt<maxAttempts){diag.retries.push({index:i,module:base,attempt:attempt+1,reason:kind,at:new Date().toISOString()});load(i,attempt+1);return;}
  console.error('Nuk u ngarkua moduli pas '+maxAttempts+' tentimeve:',base,kind,error||'');next(i);
 }
 el.onload=function(){finish('load');};
 el.onerror=function(e){finish('error',e&&e.message||'script error');};
 timer=setTimeout(function(){finish('timeout','>'+timeoutMs+'ms');},timeoutMs);
 document.head.appendChild(el);
}
load(0,1);
})();