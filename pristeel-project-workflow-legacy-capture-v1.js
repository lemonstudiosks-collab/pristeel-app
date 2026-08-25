/* PRISTEEL canonical project workflow legacy capture v4
 * Compatibility bridge + project-local chrome cleanup for the canonical workspace.
 * IMPORTANT: cleanup is forbidden from hiding or mutating ancestors outside
 * #page-workspace-project. The only global interception is the legacy flow-bar
 * "Oferta jone" navigation, which is routed back into the canonical client-offer stage.
 * UI-only: no business-data writes or polling.
 */
(function(){
'use strict';
if(window.__pstProjectWorkflowLegacyCaptureV1)return;
window.__pstProjectWorkflowLegacyCaptureV1=true;
var installed=false,cleanScheduled=false;

function C(){return window.PSTCanonicalProjectWorkflowV1||null;}
function projectId(){
  var d=window.__pstIntegrityLastData||null;
  return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');
}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]+/g,' ').trim();}
function workspace(){return document.getElementById('page-workspace-project');}
function workspaceActive(){var p=workspace();return !!(p&&p.classList.contains('active'));}
function insideWorkspace(el){var p=workspace();return !!(p&&el&&p.contains(el));}
function insideGlobalFlowBar(el){var bar=document.getElementById('flow-bar');return !!(bar&&el&&bar.contains(el));}
function flowTarget(el){
  if(!el)return'';
  var oc=String(el.getAttribute('onclick')||'');
  var m=oc.match(/flowGoto\s*\(\s*['\"]([^'\"]+)['\"]\s*\)/i);
  if(m)return norm(m[1]);
  var txt=norm(el.textContent||'');
  if(/ofertat e furnitoreve|\bofertat\b/.test(txt))return'offers';
  if(/krahasimi/.test(txt))return'ranking';
  if(/cmimi|kalkulator/.test(txt))return'kalkulator';
  if(/oferta jone|oferta per klientin/.test(txt))return'oferta';
  if(/\brfq\b/.test(txt))return'rfq';
  if(/\bbom\b/.test(txt))return'bom';
  if(/fatur/.test(txt))return'invoices';
  if(/skedar/.test(txt))return'files';
  if(/projekt/.test(txt))return'project';
  return'';
}
function destination(target){
  if(target==='bom')return['procurement','bom'];
  if(target==='rfq')return['procurement','rfq'];
  if(target==='offers')return['procurement','offers'];
  if(target==='ranking'||target==='comparison')return['procurement','comparison'];
  if(target==='kalkulator'||target==='pricing')return['procurement','pricing'];
  if(target==='oferta'||target==='client_offer')return['procurement','client_offer'];
  if(target==='invoices'||target==='invoice'||target==='faturat')return['finance',''];
  if(target==='files'||target==='skedaret')return['files',''];
  if(target==='project'||target==='projects'||target==='overview')return['overview',''];
  return null;
}
function globalClientOfferStep(el,target){return !!(el&&insideGlobalFlowBar(el)&&(target||flowTarget(el))==='oferta');}
function openCanonical(dest){
  var c=C(),id=projectId();
  if(!c||!dest||!id)return false;
  var p=workspace();
  if(p&&p.classList.contains('active')){
    c.render(dest[0],dest[1]||undefined);
    scheduleClean();
    return true;
  }
  if(typeof window.pstOpenProjectWorkspace!=='function')return false;
  try{
    Promise.resolve(window.pstOpenProjectWorkspace(id)).then(function(){
      if(C())C().render(dest[0],dest[1]||undefined);
      scheduleClean();
    }).catch(function(e){try{console.warn('PPPP legacy flow return:',e);}catch(x){}});
    return true;
  }catch(e){return false;}
}
function labelOf(el){return norm(el&&el.textContent||'');}
function actionKey(txt){
  if(txt==='mbyll projektin')return'close';
  if(txt==='ruaj')return'save';
  if(txt==='projekt i ri')return'new';
  if(txt==='eksporto')return'export';
  return'';
}
function findLegacyRibbon(){
  var p=workspace();if(!workspaceActive()||!p)return null;
  var steps=[].slice.call(p.querySelectorAll('.flow-step'));
  if(steps.length<3)return null;
  var n=steps[0].parentElement,depth=0;
  while(n&&n!==p&&depth++<8){
    if(n.querySelectorAll('.flow-step').length>=3){n.classList.add('pwf-legacy-ribbon');return n;}
    n=n.parentElement;
  }
  steps.forEach(function(el){el.classList.add('pwf-legacy-step');});
  return null;
}
function hideDuplicateWorkflowCard(){
  var p=workspace();if(!p)return;
  [].slice.call(p.querySelectorAll('section,.pf2-card,.pst-pcv-card,.pst-pi-card')).forEach(function(card){
    var h=card.querySelector('header b,header h3,.pst-pi-hd b');
    var txt=norm(h?h.textContent:card.firstElementChild&&card.firstElementChild.textContent||'');
    if(txt==='workflow'||txt==='workflow project first'||/^workflow\b/.test(txt))card.classList.add('pwf-duplicate-workflow-card');
  });
}
function projectHeader(){var p=workspace();return p&&p.querySelector('.pst-pi-head');}
function cleanProjectHeader(){
  if(!workspaceActive())return;
  var head=projectHeader(),actions=head&&head.querySelector('.pst-pi-actions');
  if(!actions)return;
  [].slice.call(actions.children).forEach(function(ch){if(!ch.classList.contains('pwf-header-clean-actions'))ch.classList.add('pwf-header-old-action');});
  if(actions.querySelector('.pwf-header-clean-actions'))return;
  var clean=document.createElement('div');clean.className='pwf-header-clean-actions';
  clean.innerHTML='<button type="button" class="pwf-clean-back" data-pwf-clean-action="projects">← Projektet</button>'+
    '<details class="pwf-more"><summary aria-label="Më shumë veprime">⋯</summary><div class="pwf-more-menu">'+
    '<button type="button" data-pwf-clean-action="old">Pamja e vjetër</button>'+
    '<button type="button" data-pwf-clean-action="new">Projekt i ri</button>'+
    '<button type="button" data-pwf-clean-action="export">Eksporto</button>'+
    '<button type="button" class="danger" data-pwf-clean-action="close">Mbyll projektin</button>'+
    '</div></details>';
  actions.appendChild(clean);
}
function clean(){
  if(!workspaceActive())return false;
  findLegacyRibbon();
  hideDuplicateWorkflowCard();
  cleanProjectHeader();
  return true;
}
function scheduleClean(){
  if(cleanScheduled)return;
  cleanScheduled=true;
  [0,80,220,500].forEach(function(ms){setTimeout(function(){clean();if(ms===500)cleanScheduled=false;},ms);});
}
function originalAction(key){
  var p=workspace();if(!p)return null;
  var head=projectHeader(),target={close:'mbyll projektin',save:'ruaj',new:'projekt i ri',export:'eksporto'}[key]||'';
  var scope=head||p;
  return [].slice.call(scope.querySelectorAll('button')).filter(function(b){return !b.closest('.pwf-more-menu')&&labelOf(b)===target;})[0]||null;
}
function goTop(key){
  var R=window.PSTWorkspaceNavigationV1;
  if(R&&typeof R.go==='function')return R.go(key);
  if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo(key)!==false;
  return false;
}
function proxy(key){
  if(key==='projects')return goTop('projects');
  if(key==='old'){
    if(typeof window.pstPiOld==='function'){window.pstPiOld();return true;}
    return false;
  }
  var el=originalAction(key);
  if(el){el.click();return true;}
  return false;
}
function supplierDetail(e,detail){
  if(!workspaceActive()||!detail||!insideWorkspace(detail))return false;
  var p=workspace(),idx=detail.getAttribute('data-pf2-offer-detail'),row=p&&p.querySelector('[data-pf2-offer-detail-row="'+idx+'"]');
  if(!row)return false;
  e.preventDefault();
  e.stopImmediatePropagation();
  var opening=!!row.hidden;
  row.hidden=!opening;
  row.classList.toggle('pwf-detail-open',opening);
  detail.textContent=opening?'Mbyll':'Detaje';
  detail.setAttribute('aria-expanded',opening?'true':'false');
  if(opening)setTimeout(function(){try{row.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(x){}},0);
  return true;
}
function capture(e){
  if(!e.target||!e.target.closest)return;
  var detail=e.target.closest('[data-pf2-offer-detail]');
  if(detail&&supplierDetail(e,detail))return;

  var cleanAction=e.target.closest('[data-pwf-clean-action]');
  if(cleanAction&&workspaceActive()&&insideWorkspace(cleanAction)){
    e.preventDefault();e.stopImmediatePropagation();
    proxy(cleanAction.getAttribute('data-pwf-clean-action'));
    return;
  }

  var el=e.target.closest('.flow-step');
  if(el){
    var target=flowTarget(el),dest=destination(target);
    var allowed=insideWorkspace(el)||globalClientOfferStep(el,target);
    if(allowed&&dest&&projectId()&&C()){
      e.preventDefault();
      e.stopImmediatePropagation();
      openCanonical(dest);
      return;
    }
  }
  if(workspaceActive())scheduleClean();
}
function css(){
  if(document.getElementById('pwf-legacy-capture-css'))return;
  var s=document.createElement('style');
  s.id='pwf-legacy-capture-css';
  s.textContent='\
#page-workspace-project[data-pwf-area="overview"] #pst-pi-body>.pwf-project-context+.pf2-grid>.pf2-card.wide:first-child{display:none!important}\
#page-workspace-project.active .pwf-legacy-ribbon,#page-workspace-project.active .pwf-legacy-step,#page-workspace-project.active .pwf-duplicate-workflow-card{display:none!important}\
#page-workspace-project.active .pst-pi-head .pwf-header-old-action{display:none!important}\
#page-workspace-project.active .pst-pi-actions{display:flex!important;align-items:center!important;gap:8px!important}\
#page-workspace-project.active .pwf-header-clean-actions{display:flex;align-items:center;gap:7px;margin-left:auto}\
#page-workspace-project.active .pwf-clean-back,#page-workspace-project.active .pwf-more summary{height:36px;border:1px solid #D6E2E6;background:#fff;color:#436A7B;border-radius:9px;padding:0 12px;font:750 12px Inter,sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center}\
#page-workspace-project.active .pwf-clean-back:hover,#page-workspace-project.active .pwf-more summary:hover{background:#F2F8FA;border-color:#AAC9D4}\
#page-workspace-project.active .pwf-more{position:relative}#page-workspace-project.active .pwf-more summary{list-style:none;width:38px;padding:0;font-size:18px}#page-workspace-project.active .pwf-more summary::-webkit-details-marker{display:none}\
#page-workspace-project.active .pwf-more-menu{position:absolute;right:0;top:42px;z-index:80;width:190px;padding:6px;background:#fff;border:1px solid #DCE7EA;border-radius:10px;box-shadow:0 14px 35px rgba(31,55,65,.14)}\
#page-workspace-project.active .pwf-more-menu button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:9px 10px;border-radius:7px;color:#405058;font:700 11.5px Inter,sans-serif;cursor:pointer}#page-workspace-project.active .pwf-more-menu button:hover{background:#F2F7F9}#page-workspace-project.active .pwf-more-menu button.danger{color:#A64B42}\
#page-workspace-project.active .pf2-detail-btn[aria-expanded="true"]{background:#EAF5F8;border-color:#9CC4D2;color:#2F7089}\
#page-workspace-project.active .pf2-detail-row.pwf-detail-open>td{box-shadow:inset 0 2px 0 #D8E9EE}\
';
  document.head.appendChild(s);
}
function install(){
  if(installed)return true;
  if(!C())return false;
  css();
  window.addEventListener('click',capture,true);
  installed=true;
  scheduleClean();
  return true;
}
if(!install()){
  document.addEventListener('pst:modules-ready',function(){install();scheduleClean();},{once:true});
  setTimeout(function(){if(install())scheduleClean();},150);
  setTimeout(function(){if(install())scheduleClean();},500);
}
[0,180,650,1400].forEach(function(ms){setTimeout(scheduleClean,ms);});
window.PSTProjectWorkflowLegacyCaptureV1={
  install:install,clean:clean,flowTarget:flowTarget,destination:destination,openCanonical:openCanonical,
  supplierDetail:supplierDetail,proxy:proxy,
  _test:{actionKey:actionKey,workspaceActive:workspaceActive,insideWorkspace:insideWorkspace,insideGlobalFlowBar:insideGlobalFlowBar,globalClientOfferStep:globalClientOfferStep}
};
})();
