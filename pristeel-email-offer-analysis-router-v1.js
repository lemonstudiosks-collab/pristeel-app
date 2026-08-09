/* PRISTEEL email offer analysis router v1
 * Deterministically routes the Analyze Offer click before legacy document handlers.
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
  var key='';try{key=localStorage.getItem('pristeel_apikey')||'';}catch(_e){}
  var structured=window.PSTEmailOfferStructuredFallbackV1;
  var core=window.PSTEmailOfferIntakeV1;
  if(key&&core&&typeof core.analyze==='function'){
    core.analyze(id);
    return;
  }
  if(structured&&typeof structured.analyze==='function'){
    structured.analyze(id);
    return;
  }
  /* Structured module is loaded by bootstrap immediately before this router.
     If a browser delays execution unexpectedly, fail closed rather than opening
     the weaker legacy parser. */
  alert('Analiza e strukturuar ende nuk është gati. Provo përsëri pas një momenti.');
}
window.addEventListener('click',route,true);
window.PSTEmailOfferAnalysisRouterV1={route:route};
})();
