/* PRISTEEL project-first actions v1
 * Explicit desktop upload and explicit repair for legacy projects missing a Drive folder.
 * Also loads read-only duplicate context, per-message linked-email full-body sync,
 * Gmail-equivalent contact view dedupe, explicit Gmail recovery auth, project summary command,
 * its read-only Project Intelligence conversation extension, live intelligence recovery,
 * Project Analysis run guard, and guarded Gmail project auto-link.
 */
(function(){
'use strict';if(window.__pstProjectFirstActionsV1)return;window.__pstProjectFirstActionsV1=true;
function data(){return window.__pstIntegrityLastData||null;}
async function makeDrive(btn){var d=data(),id=d&&d.project&&d.project.id;if(!id||!window.PSTProjectDriveLifecycleV1)return;try{btn.disabled=true;btn.textContent='Duke krijuar…';var ok=await window.PSTProjectDriveLifecycleV1.ensureForCreatedProject(id);if(!ok)throw new Error('Dosja nuk u krijua. Kontrollo autorizimin Google Drive.');btn.textContent='U krijua';if(typeof window.pstPiRefresh==='function')window.pstPiRefresh();}catch(e){btn.disabled=false;btn.textContent='Krijo / lidh Drive';alert(e.message||e);}}
function inject(){var d=data(),page=document.getElementById('page-workspace-project');if(!d||!page||!page.classList.contains('pf2-on'))return false;var cards=[].slice.call(page.querySelectorAll('.pf2-card')),c=cards.filter(function(x){var b=x.querySelector('header b');return b&&String(b.textContent).trim()==='Skedarët e projektit';})[0];if(!c)return false;var h=c.querySelector('header');if(!h)return false;if(d.project&&d.project.drive_folder_id&&d.drive&&d.drive.state==='not-authorized'){var sub=h.querySelector('div span');if(sub)sub.textContent='Drive pa autorizim';var empty=c.querySelector('.pf2-empty');if(empty)empty.textContent='Autorizo Gmail & Drive për të lexuar skedarët e dosjes së projektit.';}if(!h.querySelector('[data-pf2-desktop]')){var b=document.createElement('button');b.type='button';b.className='pf2-btn';b.dataset.pf2Desktop='1';b.textContent='Ngarko nga kompjuteri';b.onclick=function(){if(window.PSTProjectFileUpload&&window.PSTProjectFileUpload.open)window.PSTProjectFileUpload.open();else alert('Ngarkimi nga kompjuteri nuk është gati.');};h.appendChild(b);}if(!d.project.drive_folder_id&&!h.querySelector('[data-pf2-drive-create]')){var g=document.createElement('button');g.type='button';g.className='pf2-btn';g.dataset.pf2DriveCreate='1';g.textContent='Krijo / lidh Drive';g.onclick=function(){makeDrive(g);};h.appendChild(g);}if(window.PSTProjectSummaryCommandV1&&typeof window.PSTProjectSummaryCommandV1.decorateFiles==='function')window.PSTProjectSummaryCommandV1.decorateFiles();return true;}
function loadScript(src,key,ready){if(ready()||document.querySelector('script[data-pst-'+key+']'))return;var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute('data-pst-'+key,'1');document.head.appendChild(s);}
function loadDuplicateContext(){loadScript('pristeel-project-duplicate-context-v1.js?v=20260809-2','duplicate-context',function(){return !!window.PSTProjectDuplicateContextV1;});}
function loadEmailBodySync(){loadScript('pristeel-project-email-body-sync-v1.js?v=20260809-2','email-body-sync',function(){return !!window.PSTProjectEmailBodySyncV1;});}
function loadContactViewDedupe(){loadScript('pristeel-project-contact-view-dedupe-v1.js?v=20260809-1','contact-view-dedupe',function(){return !!window.PSTProjectContactViewDedupeV1;});}
function loadLinkedGmailAuthGate(){loadScript('pristeel-linked-gmail-auth-gate-v1.js?v=20260809-1','linked-gmail-auth-gate',function(){return !!window.PSTLinkedGmailAuthGateV1;});}
function loadProjectSummary(){loadScript('pristeel-project-summary-command-v1.js?v=20260815-brief2','project-summary-command',function(){return !!window.PSTProjectSummaryCommandV1;});}
function loadProjectAnalysisRunGuard(){loadScript('pristeel-project-analysis-run-guard-v1.js?v=20260818-6','project-analysis-run-guard',function(){return !!window.PSTProjectAnalysisRunGuardV1;});}
function loadProjectConversation(){loadScript('pristeel-project-intelligence-conversation-v1.js?v=20260816-coverage1','project-intelligence-conversation',function(){return !!window.PSTProjectIntelligenceConversationV1;});}
function loadProjectLiveIntelligence(){loadScript('pristeel-project-live-intelligence-v1.js?v=20260817-1','project-live-intelligence',function(){return !!window.PSTProjectLiveIntelligenceV1;});}
function loadGmailProjectAutoLink(){loadScript('pristeel-gmail-project-auto-link-v1.js?v=20260816-autolink5','gmail-project-auto-link',function(){return !!window.PSTGmailProjectAutoLinkV1;});}
function refreshAfterGmailClose(e){var t=e.target&&e.target.closest?e.target.closest('#pgc-close'):null;if(!t)return;var modal=t.closest('#pgc-bg'),st=modal&&modal.querySelector('#pgc-status'),msg=String(st&&st.textContent||'');if(msg.indexOf('U lidhën')!==0)return;var id=String(window.__pstCurrentProjectId||window._curProjId||'');if(!id)return;setTimeout(function(){if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);},0);}
function projectFirstVisible(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('pf2-on'));}
function supplierOfferCard(){var p=document.getElementById('page-workspace-project');if(!p)return null;return [].slice.call(p.querySelectorAll('.pf2-card')).filter(function(c){var b=c.querySelector('header b');return b&&String(b.textContent||'').trim()==='Oferta furnitorësh';})[0]||null;}
function showSupplierOffers(){
  if(!projectFirstVisible()||!window.PSTProjectFirstV2||typeof window.PSTProjectFirstV2.render!=='function')return false;
  window.PSTProjectFirstV2.render('commercial');
  try{if(typeof window.renderFlowBar==='function')window.renderFlowBar('offers');}catch(e){}
  setTimeout(function(){
    if(window.PSTSupplierOfferPostsaveUiV1&&typeof window.PSTSupplierOfferPostsaveUiV1.decorate==='function')window.PSTSupplierOfferPostsaveUiV1.decorate();
    var c=supplierOfferCard();if(c)try{c.scrollIntoView({behavior:'smooth',block:'start'});}catch(e){c.scrollIntoView();}
  },0);
  return true;
}
function openSupplierOffers(){
  if(!projectFirstVisible()||!window.PSTProjectFirstV2||typeof window.PSTProjectFirstV2.render!=='function')return false;
  var d=data(),id=String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');
  var I=window.PSTProjectDataIntegrity;
  if(id&&I&&typeof I.load==='function'){
    I.load(id).then(function(fresh){if(fresh)window.__pstIntegrityLastData=fresh;showSupplierOffers();}).catch(function(err){if(window.console&&console.warn)console.warn('Project-first commercial refresh:',err);showSupplierOffers();});
  }else showSupplierOffers();
  return true;
}
function installFlowBridge(){
  var base=window.flowGoto;if(typeof base!=='function'||base.__pstProjectFirstOffersBridge)return false;
  var wrapped=function(page){if(page==='offers'&&openSupplierOffers())return;return base.apply(this,arguments);};
  wrapped.__pstProjectFirstOffersBridge=true;wrapped.__base=base;window.flowGoto=wrapped;return true;
}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-pf2-tab="files"]')){setTimeout(inject,0);setTimeout(inject,120);}},true);
document.addEventListener('click',refreshAfterGmailClose,true);
document.addEventListener('pst:modules-ready',function(){installFlowBridge();if(window.PSTProjectSummaryCommandV1&&typeof window.PSTProjectSummaryCommandV1.decorate==='function')window.PSTProjectSummaryCommandV1.decorate();},{once:true});
window.PSTProjectFirstActionsV1={inject:inject,refreshAfterGmailClose:refreshAfterGmailClose,installFlowBridge:installFlowBridge,openSupplierOffers:openSupplierOffers,showSupplierOffers:showSupplierOffers};loadDuplicateContext();loadEmailBodySync();loadContactViewDedupe();loadLinkedGmailAuthGate();loadProjectSummary();loadProjectAnalysisRunGuard();loadProjectConversation();loadProjectLiveIntelligence();loadGmailProjectAutoLink();installFlowBridge();
})();
