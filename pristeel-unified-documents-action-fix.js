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

/* Safe delete controls for the global Document Center. */
if(!document.querySelector('script[data-pst-document-delete]')){
  var s=document.createElement('script');
  s.src='pristeel-document-delete-actions.js?v=20260804-production9';
  s.defer=true;
  s.setAttribute('data-pst-document-delete','1');
  s.onerror=function(){console.error('Nuk u ngarkua moduli i fshirjes së dokumenteve.');};
  document.head.appendChild(s);
}
})();