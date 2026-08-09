/* PRISTEEL email offer analysis router v1
 * Deterministically routes supplier-email offer analysis to the structured parser.
 * Window capture runs before document capture, removing render-order races.
 */
(function(){
'use strict';
if(window.__pstEmailOfferAnalysisRouterV1)return;window.__pstEmailOfferAnalysisRouterV1=true;
function route(e){
  var t=e.target&&e.target.closest?e.target.closest('[data-esf-analyze],[data-eoi-analyze]'):null;
  if(!t)return;
  var id=t.getAttribute('data-esf-analyze')||t.getAttribute('data-eoi-analyze')||'';
  if(!id)return;
  e.preventDefault();
  e.stopImmediatePropagation();
  var structured=window.PSTEmailOfferStructuredFallbackV1;
  if(structured&&typeof structured.analyze==='function'){
    structured.analyze(id);
    return;
  }
  /* The structured module is loaded by bootstrap immediately before this router.
     Fail closed rather than allowing the weaker legacy analyzer to open. */
  alert('Analiza e strukturuar ende nuk është gati. Provo përsëri pas një momenti.');
}
window.addEventListener('click',route,true);
window.PSTEmailOfferAnalysisRouterV1={route:route};
})();
