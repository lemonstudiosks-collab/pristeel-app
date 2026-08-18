/* PRISTEEL repeated offer save fix v2
 * Keeps the same QUO record editable across multiple days/sessions.
 * Saving is not sending: a saved QUO is stored as open/saved unless it already has a sent marker.
 * Existing sent markers are preserved when a saved offer is edited again.
 * The legacy registerDocNr collision guard remains authoritative.
 */
(function(){
'use strict';
if(window.__pstOfferResaveFixV1)return;
window.__pstOfferResaveFixV1=true;

function obj(v){
  if(v&&typeof v==='object'&&!Array.isArray(v))return Object.assign({},v);
  if(typeof v==='string'&&v.trim())try{var x=JSON.parse(v);return x&&typeof x==='object'?x:{};}catch(e){}
  return{};
}
function syncMemory(nr,project,client,totalEur,payPlan,state,revenueBreakdown,followupStatus){
  var d=window.__pstIntegrityLastData;if(!d)return;
  var rows=Array.isArray(d.ourOffers)?d.ourOffers:[],row=null;
  for(var i=0;i<rows.length;i++){
    if(String(rows[i]&&(rows[i].doc_nr||rows[i].document_nr)||'')===String(nr)){row=rows[i];break;}
  }
  if(!row){
    row={doc_nr:nr,series:'QUO',created_at:new Date().toISOString()};
    rows.unshift(row);
    d.ourOffers=rows;
  }
  row.project=project||row.project||'';
  row.client=client||row.client||'';
  row.total_eur=totalEur||row.total_eur||null;
  row.payment_plan=payPlan||row.payment_plan||null;
  row.offer_state=state;
  if(revenueBreakdown!==undefined)row.revenue_breakdown=revenueBreakdown;
  row.followup_status=followupStatus||row.followup_status||'open';
  d.currentOurOffer=row;
  d.ourOfferHistory=rows.filter(function(x){return x!==row;});
}
function refreshUi(){
  try{if(window.PSTOurOfferHistoryUiV1&&typeof window.PSTOurOfferHistoryUiV1.schedule==='function')window.PSTOurOfferHistoryUiV1.schedule();}catch(e){}
  try{document.dispatchEvent(new CustomEvent('pst:offer-saved'));}catch(e){}
}
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
      var path='documents_registry?doc_nr=eq.'+encodeURIComponent(nr),patch={
        project:project||'',
        client:client||'',
        total_eur:totalEur||null,
        payment_plan:payPlan||null,
        project_id:window._curProjId||window.__pstCurrentProjectId||null
      };
      if(revenueBreakdown!==undefined)patch.revenue_breakdown=revenueBreakdown;

      return window.supaFetch(path+'&select=offer_state,followup_status&limit=1').catch(function(){return[];}).then(function(rows){
        var existing=obj(rows&&rows[0]&&rows[0].offer_state),incoming=obj(offerState),merged=Object.assign({},existing,incoming);
        var sent=!!(merged.pst_sent_at||merged.sent_at||merged.sent===true);
        merged.pst_document_status=sent?'sent':'saved';
        patch.offer_state=merged;
        if(!sent)patch.followup_status='open';
        return window.supaFetch(path,'PATCH',patch).then(function(){
          syncMemory(nr,project,client,totalEur,payPlan,merged,revenueBreakdown,patch.followup_status||(rows&&rows[0]&&rows[0].followup_status));
          refreshUi();
          return value;
        });
      });
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
