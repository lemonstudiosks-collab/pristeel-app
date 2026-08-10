/* PRISTEEL project-first RFQ navigation v1
 * Routes RFQ clicks inside an active project to the native Project-first procurement draft.
 * Legacy RFQ remains available when there is no active project context.
 * Additive only: no RFQ content, supplier, BOM or persistence logic is changed.
 */
(function(){
'use strict';
if(window.__pstProjectFirstRfqNavigationV1)return;
window.__pstProjectFirstRfqNavigationV1=true;

function projectId(){
  var d=window.__pstIntegrityLastData||{};
  return String(window.__pstCurrentProjectId||window._curProjId||(d.project&&d.project.id)||'').trim();
}
async function openNative(id){
  id=String(id||projectId()).trim();
  if(!id)return false;
  window.__pstCurrentProjectId=id;
  window._curProjId=id;

  // Ensure the Project-first workspace itself is visible before rendering its RFQ draft.
  if(typeof window.pstOpenProjectWorkspace==='function'){
    try{await window.pstOpenProjectWorkspace(id);}catch(e){}
  }

  var R=window.PSTProjectFirstRfqDraftV1;
  if(R&&typeof R.open==='function')return !!(await R.open(id));

  var P=window.PSTProjectFirstV2;
  if(P&&typeof P.render==='function'){
    P.render('procurement');
    return true;
  }
  return false;
}
function isFlowRfq(el){
  if(!el)return false;
  var step=el.closest&&el.closest('.flow-step');
  if(!step)return false;
  var oc=String(step.getAttribute('onclick')||'');
  return /flowGoto\(\s*['\"]rfq['\"]\s*\)/i.test(oc)||/\bRFQ\b/i.test(step.textContent||'');
}
function wrapFlowGoto(){
  var base=window.flowGoto;
  if(typeof base!=='function'||base.__pstProjectFirstRfqNavigationV1)return false;
  function wrapped(page){
    if(String(page||'').toLowerCase()==='rfq'&&projectId()){
      openNative(projectId());
      return false;
    }
    return base.apply(this,arguments);
  }
  wrapped.__pstProjectFirstRfqNavigationV1=true;
  wrapped.__base=base;
  window.flowGoto=wrapped;
  return true;
}

// Capture before the legacy inline/document handlers so RFQ cannot flash/open the old page first.
window.addEventListener('click',function(e){
  var t=e.target;
  var projectAction=t&&t.closest&&t.closest('[data-pf2-action="rfq"]');
  if(!projectAction&&!isFlowRfq(t))return;
  var id=projectId();
  if(!id)return;
  e.preventDefault();
  e.stopPropagation();
  openNative(id);
},true);

function install(){wrapFlowGoto();}
install();
[80,220,500,1000].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTProjectFirstRfqNavigationV1={open:openNative,install:install};
})();