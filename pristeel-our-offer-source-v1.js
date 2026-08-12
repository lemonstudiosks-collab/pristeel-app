/* PRISTEEL our-offer source of truth v1
 * Read-only normalization over the project integrity loader.
 * Canonical rule:
 *   1) If documents_registry contains one or more QUO rows, use those as ourOffers.
 *   2) Otherwise fall back to legacy "OFERTA JONE" rows in offers.
 *   3) The newest canonical row is currentOurOffer; older rows remain in ourOfferHistory.
 * No rows are moved, rewritten or deleted.
 */
(function(){
'use strict';
if(window.PSTOurOfferSourceV1)return;

function arr(v){return Array.isArray(v)?v:[];}
function isRegistryQuote(row){return String(row&&row.series||'').trim().toUpperCase()==='QUO';}
function isLegacyOurOffer(row){
  return /oferta jone|our offer|pristeel/i.test(String(row&&(row.supplier||row.origin||row.source)||''));
}
function rowKey(row){return String(row&&(row.id||row.doc_nr||row.document_nr||row.offer_ref)||'');}
function uniq(rows){
  var seen={};
  return arr(rows).filter(function(row){
    var key=rowKey(row)||JSON.stringify(row||{});
    if(seen[key])return false;
    seen[key]=1;
    return true;
  });
}
function stamp(row){
  var v=row&&(row.updated_at||row.created_at||row.date||(row.offer_state&&row.offer_state.date))||'';
  var t=Date.parse(v);return isFinite(t)?t:0;
}
function newestFirst(rows){return uniq(rows).slice().sort(function(a,b){return stamp(b)-stamp(a);});}
function canonicalize(data){
  if(!data||typeof data!=='object')return data;
  var registry=newestFirst(arr(data.docs).filter(isRegistryQuote));
  var legacy=newestFirst(arr(data.offers).filter(isLegacyOurOffer));
  var canonical=registry.length?registry:legacy;
  data.ourOffers=canonical;
  data.currentOurOffer=canonical[0]||null;
  data.ourOfferHistory=canonical.slice(1);
  data.ourOfferSource=registry.length?'documents_registry':(legacy.length?'legacy_offers':'none');
  return data;
}
function install(){
  var P=window.PSTProjectDataIntegrity;
  if(!P||typeof P.load!=='function')return false;
  if(P.load.__pstOurOfferSourceV1)return true;
  var base=P.load;
  var wrapped=async function(){
    var data=await base.apply(this,arguments);
    return canonicalize(data);
  };
  wrapped.__pstOurOfferSourceV1=true;
  wrapped.__base=base;
  P.load=wrapped;
  return true;
}
function loadUi(path,attr){
  if(document.querySelector('script['+attr+']'))return;
  var s=document.createElement('script');s.src=path;s.defer=true;s.setAttribute(attr,'1');document.head.appendChild(s);
}
function loadIntegrityUi(){
  if(!window.PSTOurOfferHistoryUiV1)loadUi('pristeel-our-offer-history-ui-v1.js?v=20260812-1','data-pst-our-offer-history-ui');
  if(!window.PSTProjectPipelineConsistencyV1)loadUi('pristeel-project-pipeline-consistency-v1.js?v=20260812-1','data-pst-pipeline-consistency');
}

install();loadIntegrityUi();
document.addEventListener('pst:modules-ready',function(){install();loadIntegrityUi();},{once:true});
window.PSTOurOfferSourceV1={
  install:install,
  canonicalize:canonicalize,
  newestFirst:newestFirst,
  loadIntegrityUi:loadIntegrityUi,
  isRegistryQuote:isRegistryQuote,
  isLegacyOurOffer:isLegacyOurOffer
};
})();