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
function installInteractionCss(){
  if(document.getElementById('pst-offer-interaction-close-css'))return;
  var s=document.createElement('style');s.id='pst-offer-interaction-close-css';
  s.textContent='#pst-offer-source-modal{display:none!important}#pst-offer-source-modal.on{display:block!important}';
  document.head.appendChild(s);
}
function currentDocNr(){
  var e=document.getElementById('of-nr'),v=String(e&&e.value||'').trim();
  if(/^PST-OFF-/i.test(v))return v;
  var p=document.getElementById('of-pre'),m=String(p&&p.textContent||'').match(/PST-OFF-\d{4}-\d{2}-\d{3,}/i);
  return m?m[0]:'';
}
function previewLang(){
  var l=String((document.getElementById('of-lang')||{}).value||'').toLowerCase().slice(0,2);
  if(l)return l;
  var t=String((document.getElementById('of-pre')||{}).textContent||'');
  if(/\bPONUDA\b|\bPONUĐAČ\b|\bUSLOVI\b/i.test(t))return'sr';
  if(/\bOFERT[ËE]\b|\bKUSHTET\b/i.test(t))return'sq';
  if(/\bANGEBOT\b/i.test(t))return'de';
  return'en';
}
function sent(row){
  var st=row&&row.offer_state||{},s=String(row&&(row.status||row.state||row.followup_status)||'').toLowerCase();
  return !!(row&&(row.sent_at||row.email_sent_at||row.dispatched_at)||st.pst_sent_at||st.sent_at||st.sent===true||/(sent|d[eë]rguar|versendet|poslano|submitted)/i.test(s));
}
function applyPreviewState(row){
  var pre=document.getElementById('of-pre');if(!pre||!row)return false;
  var lang=previewLang(),isSent=sent(row),texts={
    sr:{head:'Ponuda — sačuvana verzija',saved:'SAČUVANO · NIJE POSLATO',sent:'POSLATO'},
    sq:{head:'Oferta — versioni i ruajtur',saved:'RUAJTUR · NUK ËSHTË DËRGUAR',sent:'DËRGUAR'},
    en:{head:'Quotation — saved version',saved:'SAVED · NOT SENT',sent:'SENT'},
    de:{head:'Angebot — gespeicherte Version',saved:'GESPEICHERT · NICHT VERSENDET',sent:'VERSENDET'}
  },L=texts[lang]||texts.sr,b=pre.querySelector('[data-pst-offer-draft-banner="1"]');
  if(b){
    b.textContent=isSent?L.sent:L.saved;
    b.style.background=isSent?'#EAF5EF':'#EEF7FA';
    b.style.borderColor=isSent?'#BFDCCA':'#C9DFE7';
    b.style.color=isSent?'#2F7657':'#3E7E96';
  }
  var all=document.querySelectorAll('h1,h2,h3,h4,div,span');
  for(var i=0;i<all.length;i++){
    var x=all[i];if(x===pre||(x.closest&&x.closest('#of-pre'))||x.children.length)continue;
    var t=String(x.textContent||'').trim();
    if(/^(Angebot|Ponuda|Oferta|Quotation)\s*[—-]\s*(Entwurf|draft|review|pamja|final|gespeicherte|sačuvana|saved)/i.test(t)){x.textContent=L.head;break;}
  }
  return true;
}
async function patchSavedPreview(){
  var nr=currentDocNr(),pre=document.getElementById('of-pre');if(!nr||!pre)return false;
  var d=window.__pstIntegrityLastData||{},row=arr(d.ourOffers).filter(function(x){return String(x&&(x.doc_nr||x.document_nr)||'')===nr;})[0]||null;
  if(row)return applyPreviewState(row);
  if(typeof window.supaFetch!=='function')return false;
  try{
    var rows=await window.supaFetch('documents_registry?doc_nr=eq.'+encodeURIComponent(nr)+'&select=doc_nr,followup_status,offer_state,total_eur,client,project,created_at&limit=1');
    row=rows&&rows[0]||null;if(!row)return false;
    return applyPreviewState(row);
  }catch(e){return false;}
}
function schedulePreview(){[80,260,700,1400].forEach(function(ms){setTimeout(patchSavedPreview,ms);});}
function loadIntegrityUi(){
  installInteractionCss();
  if(!window.PSTOurOfferHistoryUiV1)loadUi('pristeel-our-offer-history-ui-v1.js?v=20260818-3','data-pst-our-offer-history-ui');
  if(!window.PSTOfferSourceDocumentOpenV1)loadUi('pristeel-offer-source-document-open-v1.js?v=20260818-1','data-pst-offer-source-document-open');
  if(!window.PSTProjectPipelineConsistencyV1)loadUi('pristeel-project-pipeline-consistency-v1.js?v=20260812-1','data-pst-pipeline-consistency');
  if(!window.PSTProjectEmailReviewUiV1)loadUi('pristeel-project-email-review-ui-v1.js?v=20260813-review2','data-pst-project-email-review-ui');
}

install();loadIntegrityUi();schedulePreview();
document.addEventListener('pst:modules-ready',function(){install();loadIntegrityUi();schedulePreview();},{once:true});
document.addEventListener('pst:offer-saved',schedulePreview);
document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('button'):null;
  if(b&&/^(ruaj|save|sačuvaj|speichern|e dërgova|shëno ofertën si të dërguar)$/i.test(String(b.textContent||'').trim()))schedulePreview();
},true);
window.PSTOurOfferSourceV1={
  install:install,
  canonicalize:canonicalize,
  newestFirst:newestFirst,
  loadIntegrityUi:loadIntegrityUi,
  patchSavedPreview:patchSavedPreview,
  isRegistryQuote:isRegistryQuote,
  isLegacyOurOffer:isLegacyOurOffer
};
})();