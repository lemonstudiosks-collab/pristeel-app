/* PRISTEEL redesign finalizer v1
 * Revision: 20260823-navigation-loop-fix1.
 * Re-applies presentation-only styling after workspace renders.
 * Canonical Home exclusively owns priority-card navigation and business state.
 * Bounded timeouts only. No polling, observers, auth or project-open overrides.
 */
(function(){
'use strict';
if(window.__pstRedesignFinalizerV1)return;
window.__pstRedesignFinalizerV1=true;

function primaryNavigationResilience(){
  try{
    /* Primary Navigation Resilience is an ordered final bootstrap owner.
     * The finalizer must never dynamically load or re-enter it, otherwise
     * navigation -> decorators -> finalizer -> navigation creates a timer loop.
     */
    return !!window.PSTPrimaryNavResilienceV1;
  }catch(e){console.warn('PRISTEEL finalizer primary navigation:',e);return false;}
}
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
function sectionTheme(){
  try{
    var T=window.PSTSectionThemeV1;
    if(T&&typeof T.apply==='function'){T.apply();return;}
    if(document.querySelector('script[data-pst-section-theme]'))return;
    var s=document.createElement('script');
    s.src='pristeel-section-theme-v1.js?v=20260822-2';
    s.defer=true;
    s.setAttribute('data-pst-section-theme','1');
    document.head.appendChild(s);
  }catch(e){console.warn('PRISTEEL finalizer section theme:',e);}
}
function operatingExperience(){
  try{
    var X=window.PSTOperatingExperienceV1;
    if(X&&typeof X.apply==='function'){X.apply();return;}
    var existing=document.querySelector('script[data-pst-operating-experience]');
    if(existing)return;
    var s=document.createElement('script');
    s.src='pristeel-operating-experience-v1.js?v=20260823-1';
    s.defer=true;
    s.setAttribute('data-pst-operating-experience','1');
    s.onload=function(){var x=window.PSTOperatingExperienceV1;if(x&&typeof x.apply==='function')x.apply();};
    document.head.appendChild(s);
  }catch(e){console.warn('PRISTEEL finalizer operating experience:',e);}
}
function operatingAssistant(){
  try{
    var X=window.PSTOperatingAssistantV2;
    if(X&&typeof X.apply==='function'){X.apply();return;}
    var existing=document.querySelector('script[data-pst-operating-assistant-v2]');
    if(existing)return;
    var s=document.createElement('script');
    s.src='pristeel-operating-assistant-v2.js?v=20260823-2';
    s.defer=true;
    s.setAttribute('data-pst-operating-assistant-v2','1');
    s.onload=function(){var x=window.PSTOperatingAssistantV2;if(x&&typeof x.apply==='function')x.apply(true);};
    document.head.appendChild(s);
  }catch(e){console.warn('PRISTEEL finalizer operating assistant:',e);}
}
function contactCards(){
  try{
    var C=window.PSTContactCategoryCardsV1;
    if(C&&typeof C.decorate==='function'){C.decorate();return;}
    if(document.querySelector('script[data-pst-contact-category-cards]'))return;
    var s=document.createElement('script');s.src='pristeel-contact-category-cards-v1.js?v=20260822-1';s.defer=true;s.setAttribute('data-pst-contact-category-cards','1');s.onload=function(){var x=window.PSTContactCategoryCardsV1;if(x&&typeof x.decorate==='function')x.decorate();};document.head.appendChild(s);
  }catch(e){console.warn('PRISTEEL finalizer contact cards:',e);}
}
function priorityIsUrgent(row){if(!row)return false;var title=row.dataset&&row.dataset.pstOriginalTitle||'';if(!title){var t=row.querySelector('.pst-ws-action-title');title=t?String(t.getAttribute('title')||t.textContent||''):'';}var tag=row.querySelector('.pst-ws-action-tag'),label=tag?String(tag.textContent||''):'';return /^\s*urgjent\b/i.test(title)||/\burgjent\b/i.test(label)||String(row.getAttribute('data-urgent')||'')==='1';}
function repairPriorityControls(row){if(!row)return;var controls=row.querySelector('.pst-ws-action-controls');if(!controls)return;var canonicalOpen=row.querySelector('.pst-ws-action-open'),canonicalDone=row.querySelector('.pst-ws-action-done'),canonicalDismiss=row.querySelector('.pst-ws-action-dismiss'),source=row.querySelector('.pst-task-source-open');row.querySelectorAll('.pst-dash-task-open').forEach(function(b){if(b.parentNode)b.remove();});if(canonicalDone){canonicalDone.textContent='Kryer';canonicalDone.title='Shënoje si të kryer';canonicalDone.classList.remove('pst-dash-task-dismiss');}if(canonicalDismiss){canonicalDismiss.textContent='•••';canonicalDismiss.title='Hiqe nga lista';}if(canonicalOpen)controls.appendChild(canonicalOpen);if(canonicalDone)controls.appendChild(canonicalDone);if(source)controls.appendChild(source);if(canonicalDismiss)controls.appendChild(canonicalDismiss);row.querySelectorAll('.pst-dash-task-menu').forEach(function(menu){if(menu.parentNode)menu.remove();});}
function repairPriorityCards(){var page=document.getElementById('page-workspace-home');if(!page)return 0;var count=0;page.querySelectorAll('#pst-ws-home-actions > .pst-canonical-action').forEach(function(row){repairPriorityControls(row);row.classList.toggle('pst-final-priority-urgent',priorityIsUrgent(row));row.style.cursor='pointer';row.setAttribute('title','Kliko për ta hapur');count++;});return count;}
function installPriorityStyle(){if(document.getElementById('pst-final-priority-card-css'))return;var s=document.createElement('style');s.id='pst-final-priority-card-css';s.textContent=`
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action{cursor:pointer!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action .pst-ws-action-main{cursor:pointer!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent{background:#FFF8E8!important;border-color:#E4C56B!important;border-left-color:#C9932E!important;box-shadow:0 3px 12px rgba(149,109,31,.10)!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent:hover{background:#FFF2D6!important;border-color:#D8B34F!important;border-left-color:#B98222!important;box-shadow:0 7px 22px rgba(149,109,31,.14)!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent .pst-ws-action-title{color:#614C1E!important}
#page-workspace-home #pst-ws-home-actions>.pst-canonical-action.pst-final-priority-urgent .pst-ws-action-tag{background:#C9932E!important;border-color:#C9932E!important;color:#fff!important}`;document.head.appendChild(s);}
function apply(){
  primaryNavigationResilience();sectionTheme();readability();contactCards();operatingExperience();operatingAssistant();
  try{var C=window.PSTBusinessCommandCenterV1;if(C&&typeof C.open==='function')window.openCmdK=C.open;if(C&&typeof C.decorateHome==='function')C.decorateHome();}catch(e){console.warn('PRISTEEL finalizer search:',e);}
  try{var D=window.PSTDashboardTaskCardsV1;if(D&&typeof D.decorate==='function')D.decorate();}catch(e){console.warn('PRISTEEL finalizer cards:',e);}
  try{var H=window.PSTHomeCommandCenterV2;if(H&&typeof H.decorate==='function')H.decorate(false);}catch(e){console.warn('PRISTEEL finalizer home:',e);}
  try{var G=window.PSTBusinessCommandCenterDeepGmail;if(G&&document.getElementById('pst-bcc')&&typeof G.decorate==='function')G.decorate();}catch(e){console.warn('PRISTEEL finalizer Gmail search:',e);}
  try{var P=window.PSTProjectCommandViewV1,projectPage=document.getElementById('page-workspace-project');if(P&&projectPage&&projectPage.style.display!=='none'&&typeof P.load==='function')P.load(window.__pstCurrentProjectId||window._curProjId||'',false);}catch(e){console.warn('PRISTEEL finalizer project:',e);}
  try{installPriorityStyle();repairPriorityCards();}catch(e){console.warn('PRISTEEL finalizer priority cards:',e);}
  try{var X=window.PSTOperatingExperienceV1;if(X&&typeof X.apply==='function')X.apply();}catch(e){console.warn('PRISTEEL finalizer operating experience apply:',e);}
  try{var A=window.PSTOperatingAssistantV2;if(A&&typeof A.apply==='function')A.apply(false);}catch(e){console.warn('PRISTEEL finalizer operating assistant apply:',e);}
}
function schedule(){[0,80,220,450,1400,2100].forEach(function(ms){setTimeout(apply,ms);});}
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(event){var t=event.target&&event.target.closest?event.target.closest('.pst-ws-navbtn,#pst-ws-home-refresh,[onclick*="pstWorkspaceGo"],[data-pm-open],[data-release-filter],[data-pwf-area],[data-pwf-stage],[onclick*="showPage"],[onclick*="openModuleHub"]'):null;if(t)[0,80,250,700,1450,2200].forEach(function(ms){setTimeout(apply,ms);});},true);
if(document.readyState!=='loading')schedule();
window.PSTRedesignFinalizerV1={apply:apply,schedule:schedule,primaryNavigationResilience:primaryNavigationResilience,readability:readability,sectionTheme:sectionTheme,operatingExperience:operatingExperience,operatingAssistant:operatingAssistant,contactCards:contactCards,repairPriorityCards:repairPriorityCards};
})();