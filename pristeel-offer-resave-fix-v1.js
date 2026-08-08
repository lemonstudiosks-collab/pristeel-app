/* PRISTEEL repeated offer save fix v1
 * Keeps the same QUO record editable across multiple days/sessions.
 * The legacy registerDocNr collision guard remains authoritative.
 */
(function(){
'use strict';
if(window.__pstOfferResaveFixV1)return;
window.__pstOfferResaveFixV1=true;

function install(){
  var original=window.registerDocNr;
  if(typeof original!=='function')return false;
  if(original.__pstOfferResaveWrapped)return true;

  function wrapped(series,nr,project,client,totalEur,payPlan,offerState,revenueBreakdown){
    var args=arguments;
    var result=original.apply(this,args);
    if(String(series||'').toUpperCase()!=='QUO')return result;

    return Promise.resolve(result).then(function(value){
      if(typeof window.supaFetch!=='function'||!nr)return value;
      var patch={
        project:project||'',
        client:client||'',
        total_eur:totalEur||null,
        payment_plan:payPlan||null,
        project_id:window._curProjId||window.__pstCurrentProjectId||null
      };
      if(offerState!==undefined)patch.offer_state=offerState;
      if(revenueBreakdown!==undefined)patch.revenue_breakdown=revenueBreakdown;

      return window.supaFetch('documents_registry?doc_nr=eq.'+encodeURIComponent(nr),'PATCH',patch)
        .then(function(){return value;});
    });
  }
  wrapped.__pstOfferResaveWrapped=true;
  wrapped.__pstOfferResaveOriginal=original;
  window.registerDocNr=wrapped;
  return true;
}

if(!install()){
  [0,150,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
}
window.PSTOfferResaveFixV1={install:install};
})();
