/* PRISTEEL global search compatibility/router
 * Loaded directly by pristeel-procurement.html before the redesign bootstrap.
 * Owns only the global shortcut/click routing. The UI/data engine lives in
 * pristeel-search-stable-v2.js.
 */
(function(){
'use strict';
if(window.__pstSearchAuthorityInstalled)return;
window.__pstSearchAuthorityInstalled=true;
var pending=null;
function stable(){return window.PSTSearchStableV2&&typeof window.PSTSearchStableV2.open==='function'?window.PSTSearchStableV2:null;}
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
  var t=searchTrigger(e.target);if(!t)return;
  e.preventDefault();e.stopImmediatePropagation();open('');
},true);
document.addEventListener('keydown',function(e){
  if((e.ctrlKey||e.metaKey)&&String(e.key||'').toLowerCase()==='k'){
    e.preventDefault();e.stopImmediatePropagation();open('');return;
  }
  if(e.key==='Escape'){
    var engine=stable();
    if(engine&&document.getElementById('pst-bcc')){e.preventDefault();e.stopImmediatePropagation();engine.close();}
  }
},true);
document.addEventListener('pst:modules-ready',flush,{once:true});
window.pstOpenSearch=open;
window.openCmdK=open;
window.PSTLegacySearchShim={open:open,flush:flush};
})();