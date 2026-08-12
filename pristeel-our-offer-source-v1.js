/* PRISTEEL our-offer source of truth v1
 * Read-only normalization over the project integrity loader.
 * Canonical rule:
 *   1) If documents_registry contains one or more QUO rows, use those as ourOffers.
 *   2) Otherwise fall back to legacy "OFERTA JONE" rows in offers.
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
function canonicalize(data){
  if(!data||typeof data!=='object')return data;
  var registry=uniq(arr(data.docs).filter(isRegistryQuote));
  var legacy=uniq(arr(data.offers).filter(isLegacyOurOffer));
  data.ourOffers=registry.length?registry:legacy;
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

install();
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTOurOfferSourceV1={
  install:install,
  canonicalize:canonicalize,
  isRegistryQuote:isRegistryQuote,
  isLegacyOurOffer:isLegacyOurOffer
};
})();