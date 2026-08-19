/* PRISTEEL global search compatibility/router
 * Loaded directly by pristeel-procurement.html before the redesign bootstrap.
 * Owns only global routing and a synchronous hard-close safety path.
 * The UI/data engine lives in pristeel-search-stable-v2.js.
 */
(function(){
'use strict';
if(window.__pstSearchAuthorityInstalled)return;
window.__pstSearchAuthorityInstalled=true;

/* Startup safety contract.
 * pristeel-roles.js is loaded after this file and contains a legacy 12-second
 * Home reveal fallback. A truthy sentinel prevents that fallback from being
 * scheduled, so an intermediate Home can never become visible mid-bootstrap.
 * The Home Runtime Owner Guard replaces this sentinel during final startup. */
if(typeof window.__pstRuntimeRevealFallback==='undefined')window.__pstRuntimeRevealFallback=-1;

var pending=null;
function stable(){return window.PSTSearchStableV2&&typeof window.PSTSearchStableV2.open==='function'?window.PSTSearchStableV2:null;}
function hardClose(){
  pending=null;
  var modal=document.getElementById('pst-bcc');
  if(modal)modal.remove();
  document.body.classList.remove('pst-bcc-open');
  return true;
}
function open(initial){
  var q=typeof initial==='string'?initial:'';
  var engine=stable();
  if(engine){pending=null;engine.open(q);return true;}
  pending=q;
  return true;
}
function flush(){var engine=stable();if(!engine||pending===null)return;var q=pending;pending=null;engine.open(q);}
function searchTrigger(target){return target&&target.closest?target.closest('#pst-bcc-home-search,.pst-bcc-sidebar-search,[onclick*="openCmdK"],[onclick*="pstWsSearch"],[onclick*="pstOpenSearch"]'):null;}
document.addEventListener('click',function(e){
  var modal=document.getElementById('pst-bcc');
  if(modal){
    var closeBtn=e.target&&e.target.closest?e.target.closest('.pst-bcc-close'):null;
    if(closeBtn||e.target===modal){
      e.preventDefault();
      e.stopImmediatePropagation();
      hardClose();
      return;
    }
  }
  var t=searchTrigger(e.target);if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();open('');
},true);
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&String(e.key||'').toLowerCase()==='k'){
    e.preventDefault();e.stopImmediatePropagation();open('');return;
  }
  if(e.key==='Escape'&&document.getElementById('pst-bcc')){
    e.preventDefault();
    e.stopImmediatePropagation();
    hardClose();
  }
},true);
document.addEventListener('pst:modules-ready',flush,{once:true});
window.pstOpenSearch=open;
window.openCmdK=open;
window.PSTLegacySearchShim={open:open,flush:flush,close:hardClose};
})();