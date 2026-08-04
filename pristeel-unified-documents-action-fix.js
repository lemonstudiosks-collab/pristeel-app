/* PRISTEEL unified documents action routing fix */
(function(){
'use strict';
if(window.__pstUnifiedDocumentsActionFixLoaded)return;
window.__pstUnifiedDocumentsActionFixLoaded=true;
document.addEventListener('click',function(e){
  var b=e.target.closest('.pst-ws-rowaction');
  if(!b)return;
  var tr=b.closest('tr');
  if(!tr)return;
  var text=String(tr.textContent||'');
  if(text.indexOf('Faturë hyrëse')>-1){
    e.preventDefault();e.stopImmediatePropagation();
    if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('finance');
    else if(typeof window.pstWsLegacy==='function')window.pstWsLegacy('finance');
  }
},true);
})();