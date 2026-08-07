/* PRISTEEL legacy search compatibility shim
 * The real search UI lives in pristeel-search-stable-v2.js.
 * This file remains because pristeel-procurement.html loads it directly.
 * It creates no modal, no shortcut listener and performs no data queries.
 */
(function(){
'use strict';
if(window.__pstLegacySearchShim)return;
window.__pstLegacySearchShim=true;
function open(initial){
  if(window.PSTSearchStableV2&&typeof window.PSTSearchStableV2.open==='function'){
    window.PSTSearchStableV2.open(typeof initial==='string'?initial:'');
    return true;
  }
  if(window.PSTBusinessCommandCenterV1&&typeof window.PSTBusinessCommandCenterV1.open==='function'){
    window.PSTBusinessCommandCenterV1.open(typeof initial==='string'?initial:'');
    return true;
  }
  return false;
}
window.pstOpenSearch=open;
window.PSTLegacySearchShim={open:open};
})();