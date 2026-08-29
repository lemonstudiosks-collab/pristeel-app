/* PRISTEEL project-first actions v2
 * Explicit desktop upload and explicit repair for legacy projects missing a Drive folder.
 * Also loads read-only duplicate context, per-message linked-email full-body sync,
 * Gmail-equivalent contact view dedupe, explicit Gmail recovery auth, project summary command,
 * its read-only Project Intelligence conversation extension, live intelligence recovery,
 * Project Analysis run guard, guarded Gmail project auto-link,
 * the final modern workspace cleanup/reconciler,
 * and a reliable Project -> Commercial document entry bridge.
 * Previous conversation runtime cache key: pristeel-project-intelligence-conversation-v1.js?v=20260816-coverage1
 */
(function(){
'use strict';if(window.__pstProjectFirstActionsV1)return;window.__pstProjectFirstActionsV1=true;
function data(){return window.__pstIntegrityLastData||null;}
function projectId(){var d=data();return String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||window._curProjId||'');}
function legacyDocument(type){var page=type==='invoice'?'invoices':'oferta';var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function'){L.showPage(page);return true;}if(typeof window.pstWsLegacy==='function'){window.pstWsLegacy(page);return true;}if(typeof window.showPage==='function'){window.showPage(page);return true;}return false;}
function openCommercialDocument(type){
  type=type==='invoice'?'invoice':'offer';
  var id=projectId();if(id){window.__pstCurrentProjectId=id;window._curProjId=id;}
  var tries=0;
  function go(){
    var nav=window.PSTCommercialNavigationFixV1;if(nav&&typeof nav.createDocument==='function')return nav.createDocument(type)!==false;
    var builder=window.PSTCommercialDocumentBuilderV1;if(builder&&typeof builder.begin==='function')return builder.begin(type)!==false;
    if(++tries<30){setTimeout(go,50);return true;}
    return legacyDocument(type);
  }
  return go();
}
function installCommercialEntryBridge(){
  if(typeof window.pstPiNew==='function')return true;
  var f=function(type){return openCommercialDocument(type);};
  f.__pstProjectCommercialEntryBridge=true;
  window.pstPiNew=f;
  return true;
}
async function makeDrive(btn){var d=data(),id=d&&d.project&&d.project.id;if(!id||!window.PSTProjectDriveLifecycleV1)return;try{btn.disabled=true;btn.textContent='Duke krijuar…';var ok=await window.PSTProjectDriveLifecycleV1.ensureForCreatedProject(id);if(!ok)throw new Error('Dosja nuk u krijua. Kontrollo autorizimin Google Drive.');btn.textContent='U krijua';if(typeof window.pstPiRefresh==='function')window.pstPiRefresh();}catch(e){btn.disabled=false;btn.textContent='Krijo / lidh Drive';alert(e.message||e);}}
function inject(){var d=data(),page=document.getElementById('page-workspace-project');if(!d||!page||!page.classList.contains('pf2-on'))return false;var cards=[].slice.call(page.querySelectorAll('.pf2-card')),c=cards.filter(function(x){var b=x.querySelector('header b');return b&&String(b.textContent).trim()==='Skedarët e projektit';})[0];if(!c)return false;var h=c.querySelector('header');if(!h)return false;if(d.project&&d.project.drive_folder_id&&d.drive&&d.drive.state==='not-authorized'){var sub=h.querySelector('div span');if(sub)sub.textContent='Drive pa autorizim';var empty=c.querySelector('.pf2-empty');if(empty)empty.textContent='Autorizo Gmail & Drive për të lexuar skedarët e dosjes së projektit.';}if(!h.querySelector('[data-pf2-desktop]')){var b=document.createElement('button');b.type='button';b.className='pf2-btn';b.dataset.pf2Desktop='1';b.textContent='Ngarko nga kompjuteri';b.onclick=function(){if(window.PSTProjectFileUpload&&window.PSTProjectFileUpload.open)window.PSTProjectFileUpload.open();else alert('Ngarkimi nga kompjuteri nuk është gati.');};h.appendChild(b);}if(!d.project.drive_folder_id&&!h.querySelector('[data-pf2-drive-create]')){var g=document.createElement('button');g.type='button';g.className='pf2-btn';g.dataset.pf2DriveCreate='1';g.textContent='Krijo / lidh Drive';g.onclick=function(){makeDrive(g);};h.appendChild(g);}if(window.PSTProjectSummaryCommandV1&&typeof window.PSTProjectSummaryCommandV1.decorateFiles==='function')window.PSTProjectSummaryCommandV1.decorateFiles();return true;}
function loadScript(src,key,ready){if(ready()||document.querySelector('script[data-pst-'+key+']'))return;var s=document.createElement('script');s.src=src;s.defer=true;s.setAttribute('data-pst-'+key,'1');document.head.appendChild(s);}
function loadDuplicateContext(){loadScript('pristeel-project-duplicate-context-v1.js?v=20260809-2','duplicate-context',function(){return !!window.PSTProjectDuplicateContextV1;});}
function loadEmailBodySync(){loadScript('pristeel-project-email-body-sync-v1.js?v=20260809-2','email-body-sync',function(){return !!window.PSTProjectEmailBodySyncV1;});}
function loadContactViewDedupe(){loadScript('pristeel-project-contact-view-dedupe-v1.js?v=20260809-1','contact-view-dedupe',function(){return !!window.PSTProjectContactViewDedupeV1;});}
function loadLinkedGmailAuthGate(){loadScript('pristeel-linked-gmail-auth-gate-v1.js?v=20260809-1','linked-gmail-auth-gate',function(){return !!window.PSTLinkedGmailAuthGateV1;});}
function loadProjectSummary(){loadScript('pristeel-project-summary-command-v1.js?v=20260828-headerclean1','project-summary-command',function(){return !!window.PSTProjectSummaryCommandV1;});}
function loadProjectAnalysisRunGuard(){loadScript('pristeel-project-analysis-run-guard-v1.js?v=20260818-7','project-analysis-run-guard',function(){return !!window.PSTProjectAnalysisRunGuardV1;});}
function loadProjectConversation(){loadScript('pristeel-project-intelligence-conversation-v1.js?v=20260824-project-chat2','project-intelligence-conversation',function(){return !!window.PSTProjectIntelligenceConversationV1;});}
function loadProjectLiveIntelligence(){loadScript('pristeel-project-live-intelligence-v1.js?v=20260817-1','project-live-intelligence',function(){return !!window.PSTProjectLiveIntelligenceV1;});}
function loadGmailProjectAutoLink(){loadScript('pristeel-gmail-project-auto-link-v1.js?v=20260816-autolink5','gmail-project-auto-link',function(){return !!window.PSTGmailProjectAutoLinkV1;});}

/* Modern project workspace cleanup.
 * UI-only: no project/business writes, no outbound actions.
 * Keeps one navigation system and reflects execution truth already stored in PPPP. */
var wcScheduled=false,wcObserver=null;
function wcNorm(v){return String(v==null?'':v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function wcPage(){var p=document.getElementById('page-workspace-project');return p&&p.classList.contains('active')&&p.classList.contains('pf2-on')?p:null;}
function wcExecution(){var d=data(),p=d&&d.project;if(!p)return false;var s=wcNorm(p.status),stage=wcNorm(p.pipeline_stage),op=wcNorm(p.operational_state);return /fituar|won/.test(s)||/production|execution|ekzek|transport/.test(stage)||/production|execution|ekzek/.test(op);}
function wcCss(){if(document.getElementById('pst-project-workspace-cleanup-css'))return;var s=document.createElement('style');s.id='pst-project-workspace-cleanup-css';s.textContent='\
#page-workspace-project .pst-wc-hide{display:none!important}\
#page-workspace-project .pst-wc-back{display:inline-flex!important;align-items:center;gap:6px;border:1px solid #D5E2E6!important;background:#fff!important;color:#315F72!important;font-weight:780!important}\
#page-workspace-project .pst-wc-back:hover{background:#EEF6F8!important;border-color:#BFD8E1!important}\
#page-workspace-project .pf2-shortcut{min-height:72px!important;padding:12px 13px!important;border-color:#DCE7EA!important;background:#fff!important}\
#page-workspace-project .pf2-shortcut>span{font-size:7.5px!important;letter-spacing:.55px!important;color:#7E9097!important}\
#page-workspace-project .pf2-shortcut>b{font-size:11px!important;line-height:1.28!important;color:#33474F!important;margin-top:5px!important}\
#page-workspace-project .pf2-shortcut>small{font-size:8px!important;color:#91A0A6!important;margin-top:4px!important}\
#page-workspace-project .pst-pic-working-banner{display:none;margin:10px 0 4px;padding:11px 12px;border:1px solid #BFD8E1;border-radius:10px;background:#EEF7FA;color:#315F72;align-items:flex-start;gap:10px}\
#page-workspace-project .pst-pic-working .pst-pic-working-banner{display:flex}\
#page-workspace-project .pst-pic-working-dot{width:9px;height:9px;border-radius:50%;background:#4D93AC;flex:0 0 auto;margin-top:3px;animation:pst-wc-pulse 1s ease-in-out infinite}\
#page-workspace-project .pst-pic-working-banner b{display:block;font-size:10px}\
#page-workspace-project .pst-pic-working-banner span{display:block;font-size:8.5px;color:#66818C;margin-top:2px;line-height:1.4}\
#page-workspace-project .pst-pic-working .pst-pic-prompts{opacity:.45;pointer-events:none}\
@keyframes pst-wc-pulse{0%,100%{opacity:.35;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}';document.head.appendChild(s);}
function wcHideTop(page){var d=data(),name=wcNorm(d&&d.project&&d.project.name);var kill={'administrator':1,'mbyll projektin':1,'ruaj':1,'projekt i ri':1,'eksporto':1};document.querySelectorAll('button,span,.badge').forEach(function(el){if(page.contains(el)&&el.closest('.pst-pi-head'))return;var r=el.getBoundingClientRect?el.getBoundingClientRect():null;if(!r||r.top<0||r.top>145||r.height>65)return;var t=wcNorm(el.textContent);if(!t)return;if(kill[t]||/^\d+\s*°/.test(t)||t==='kthjellet'||t==='kthjellet' || (name&&t===name))el.classList.add('pst-wc-hide');});var flow=document.getElementById('flow-bar');if(flow)flow.classList.add('pst-wc-hide');}
function wcBack(page){var actions=page.querySelector('.pst-pi-actions');if(!actions)return;var b=actions.querySelector('.pst-wc-back');if(!b){b=document.createElement('button');b.type='button';b.className='pst-pi-btn pst-wc-back';b.textContent='← Projektet';b.onclick=function(){if(typeof window.pstProjectsModernOpen==='function')return window.pstProjectsModernOpen();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');};actions.insertBefore(b,actions.firstChild);}Array.prototype.slice.call(actions.querySelectorAll('button')).forEach(function(x){if(x!==b&&wcNorm(x.textContent)==='projektet')x.classList.add('pst-wc-hide');});}
function wcHero(page){if(!wcExecution())return;var hero=page.querySelector('.pf2-hero');if(!hero)return;var h=hero.querySelector('h2'),p=hero.querySelector('p'),main=hero.querySelector('.pf2-actions .pf2-btn');if(h)h.textContent='Ekzekutimi i projektit';if(p)p.textContent='Kontrollo prodhimin, dokumentacionin e cilësisë, afatin, detyrimet financiare dhe dorëzimin.';if(main){main.textContent='Hap ekzekutimin';main.setAttribute('data-pf2-action','tab:execution');}Array.prototype.slice.call(hero.querySelectorAll('.pf2-shortcut')).forEach(function(c){var label=wcNorm(c.querySelector('span')&&c.querySelector('span').textContent),b=c.querySelector('b'),small=c.querySelector('small');if(label==='faza'){if(b)b.textContent='Ekzekutim';if(small)small.textContent='Prodhimi, afati dhe detyrat';c.setAttribute('data-pf2-action','tab:execution');}else if(label==='oferta'){if(b)b.textContent='Fituar / në ekzekutim';if(small)small.textContent='Kontrata, pagesat dhe garancitë';c.setAttribute('data-pf2-action','tab:commercial');}else if(label==='komunikimi'){if(small)small.textContent='Emailat e lidhur me projektin';}else if(label==='skedaret'||label==='skedaret'){if(small)small.textContent='Drive dhe dokumentet e projektit';}});}
function wcCanonical(page){if(!wcExecution())return;var ctx=page.querySelector('.pwf-project-context');if(!ctx)return;var d=data()||{},p=d.project||{},k=ctx.querySelector('.pwf-project-kpis');if(k){var emails=Array.isArray(d.emails)?d.emails.length:0,files=[].concat(d.projectDocs||[],d.attachmentLinks||[],d.inboxDocs||[],d.docs||[],d.files||[],d.drive&&d.drive.rows||[]).length;k.innerHTML='<div><span>Statusi</span><b>'+(p.status||'Fituar')+'</b></div><div><span>Faza</span><b>Ekzekutim</b></div><div><span>Komunikimi</span><b>'+emails+' emaila</b></div><div><span>Skedarë</span><b>'+files+'</b></div>';}var next=ctx.querySelector('.pwf-next');if(next){next.removeAttribute('data-pwf-stage');next.setAttribute('data-pwf-area','execution');var a=next.querySelector('span'),b=next.querySelector('b'),s=next.querySelector('small');if(a)a.textContent='HAPI I RADHËS';if(b)b.textContent='Kontrollo ekzekutimin';if(s)s.textContent='Prodhimi, dokumentet e cilësisë, afati, pagesat dhe dorëzimi.';}}
function wcRemoveDeadUpdate(page){Array.prototype.slice.call(page.querySelectorAll('button')).forEach(function(b){var t=wcNorm(b.textContent);if(t!=='perditeso projektin')return;var box=b.closest('section,article,.pf2-card,.card');if(!box){var q=b.parentElement;for(var i=0;i<4&&q;i++,q=q.parentElement){if(wcNorm(q.textContent).indexOf('cfare po ndodh me kete projekt')>-1){box=q;break;}}}if(box)box.classList.add('pst-wc-hide');else b.classList.add('pst-wc-hide');});}
function wcChat(page){Array.prototype.slice.call(page.querySelectorAll('.pst-pic')).forEach(function(root){var send=root.querySelector('.pst-pic-send'),busy=!!(send&&send.disabled);var banner=root.querySelector('.pst-pic-working-banner');if(!banner){banner=document.createElement('div');banner.className='pst-pic-working-banner';banner.innerHTML='<i class="pst-pic-working-dot"></i><div><b>PPPP po punon me projektin…</b><span>Po lexoj të dhënat, emailat dhe dokumentet. Mund të zgjasë disa sekonda.</span></div>';var log=root.querySelector('.pst-pic-log');if(log&&log.nextSibling)root.insertBefore(banner,log.nextSibling);else root.appendChild(banner);}root.classList.toggle('pst-pic-working',busy);});}
function wcRun(){wcScheduled=false;wcCss();var page=wcPage();if(!page)return;wcHideTop(page);wcBack(page);wcHero(page);wcCanonical(page);wcRemoveDeadUpdate(page);wcChat(page);}
function wcSchedule(){if(wcScheduled)return;wcScheduled=true;setTimeout(wcRun,0);}
function installWorkspaceCleanup(){wcCss();if(!wcObserver){wcObserver=new MutationObserver(wcSchedule);wcObserver.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','disabled']});document.addEventListener('click',wcSchedule,true);}wcSchedule();[150,500,1200,2600].forEach(function(ms){setTimeout(wcSchedule,ms);});return true;}

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
document.addEventListener('pst:modules-ready',function(){installFlowBridge();installCommercialEntryBridge();installWorkspaceCleanup();if(window.PSTProjectSummaryCommandV1&&typeof window.PSTProjectSummaryCommandV1.decorate==='function')window.PSTProjectSummaryCommandV1.decorate();},{once:true});
window.PSTProjectFirstActionsV1={inject:inject,refreshAfterGmailClose:refreshAfterGmailClose,installFlowBridge:installFlowBridge,openSupplierOffers:openSupplierOffers,showSupplierOffers:showSupplierOffers,openCommercialDocument:openCommercialDocument,installCommercialEntryBridge:installCommercialEntryBridge,installWorkspaceCleanup:installWorkspaceCleanup};loadDuplicateContext();loadEmailBodySync();loadContactViewDedupe();loadLinkedGmailAuthGate();loadProjectSummary();loadProjectAnalysisRunGuard();loadProjectConversation();loadProjectLiveIntelligence();loadGmailProjectAutoLink();installWorkspaceCleanup();installFlowBridge();installCommercialEntryBridge();
})();
