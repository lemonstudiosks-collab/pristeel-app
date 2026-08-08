/* PRISTEEL Document Center Actions Fix v1
 * Makes create/open controls explicit and immediately actionable.
 */
(function(){
'use strict';
if(window.__pstDocumentCenterActionsFixV1)return;
window.__pstDocumentCenterActionsFixV1=true;

function newDoc(type){
  if(type==='offer'){
    if(typeof window.oaNew==='function'){window.oaNew();return true;}
    if(typeof window.showPage==='function'){
      window.showPage('oferta');
      setTimeout(function(){try{if(typeof window.resetOfferForm==='function')window.resetOfferForm();}catch(e){}try{if(typeof window.fillOfferNr==='function')window.fillOfferNr(true);}catch(e){}},80);
      return true;
    }
    return false;
  }
  if(type==='invoice'){
    if(typeof window.showPage==='function'){
      window.showPage('invoices');
      setTimeout(function(){try{if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');}catch(e){}},60);
      return true;
    }
    return false;
  }
  if((type==='credit_note'||type==='debit_note')&&typeof window.pstOpenAdjustment==='function'){
    window.pstOpenAdjustment(type,'');return true;
  }
  return false;
}

function openDoc(type,id){
  if(type==='offer'){
    if(typeof window.oaOpenQuoteModal==='function'){window.oaOpenQuoteModal(id);return true;}
    if(typeof window.oaOpen==='function'){window.oaOpen(id);return true;}
    return false;
  }
  if(type==='invoice'){
    if(typeof window.openInvoiceDetail==='function'){window.openInvoiceDetail('out',id);return true;}
    return false;
  }
  return false;
}

document.addEventListener('click',function(e){
  var page=e.target&&e.target.closest?e.target.closest('#page-document-center'):null;
  if(!page)return;
  var typeBtn=e.target.closest('[data-type]');
  if(typeBtn){
    e.preventDefault();e.stopImmediatePropagation();
    var t=typeBtn.getAttribute('data-type')||'offer';
    try{if(typeof window.pstSelectDocumentType==='function')window.pstSelectDocumentType(t);}catch(err){}
    newDoc(t);
    return;
  }
  var newBtn=e.target.closest('#pst-dc-new');
  if(newBtn){
    e.preventDefault();e.stopImmediatePropagation();
    var t=(window.PST_DOC_CENTER_STABLE&&window.PST_DOC_CENTER_STABLE.selectedType)||'offer';
    newDoc(t);
    return;
  }
  var openBtn=e.target.closest('[data-open]');
  if(openBtn){
    e.preventDefault();e.stopImmediatePropagation();
    openDoc(openBtn.getAttribute('data-open'),openBtn.getAttribute('data-id'));
  }
},true);

window.PSTDocumentCenterActionsFixV1={newDoc:newDoc,openDoc:openDoc};
})();
