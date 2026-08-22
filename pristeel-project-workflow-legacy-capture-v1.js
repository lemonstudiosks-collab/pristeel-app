/* PRISTEEL canonical project workflow legacy capture v1
 * Compatibility-only bridge for the old horizontal project flow.
 * It prevents the legacy ribbon from escaping the canonical project workspace.
 * No data writes, no polling, no outbound actions.
 */
(function(){
'use strict';
if(window.__pstProjectWorkflowLegacyCaptureV1)return;
window.__pstProjectWorkflowLegacyCaptureV1=true;

function C(){return window.PSTCanonicalProjectWorkflowV1||null;}
function projectId(){
  var d=window.__pstIntegrityLastData||null;
  return String(window.__pstCurrentProjectId||window._curProjId||(d&&d.project&&d.project.id)||'');
}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_]+/g,' ').trim();}
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
function openCanonical(dest){
  var c=C(),id=projectId();
  if(!c||!dest||!id)return false;
  var p=document.getElementById('page-workspace-project');
  if(p&&p.classList.contains('active')){
    c.render(dest[0],dest[1]||undefined);
    return true;
  }
  if(typeof window.pstOpenProjectWorkspace!=='function')return false;
  try{
    Promise.resolve(window.pstOpenProjectWorkspace(id)).then(function(){
      if(C())C().render(dest[0],dest[1]||undefined);
    }).catch(function(e){try{console.warn('PPPP legacy flow return:',e);}catch(x){}});
    return true;
  }catch(e){return false;}
}
function capture(e){
  var el=e.target&&e.target.closest?e.target.closest('.flow-step'):null;
  if(!el)return;
  var target=flowTarget(el),dest=destination(target);
  if(!dest||!projectId()||!C())return;
  e.preventDefault();
  e.stopImmediatePropagation();
  openCanonical(dest);
}
function css(){
  if(document.getElementById('pwf-legacy-capture-css'))return;
  var s=document.createElement('style');
  s.id='pwf-legacy-capture-css';
  s.textContent='#page-workspace-project[data-pwf-area="overview"] #pst-pi-body>.pwf-project-context+.pf2-grid>.pf2-card.wide:first-child{display:none!important}';
  document.head.appendChild(s);
}
function install(){
  if(!C())return false;
  css();
  window.addEventListener('click',capture,true);
  return true;
}
if(!install()){
  document.addEventListener('pst:modules-ready',function(){install();},{once:true});
  setTimeout(install,150);
  setTimeout(install,500);
}
window.PSTProjectWorkflowLegacyCaptureV1={install:install,flowTarget:flowTarget,destination:destination,openCanonical:openCanonical};
})();
