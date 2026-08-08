/* PRISTEEL commercial navigation fix v1
 * Routes Commercial/Offer entry points to the document register and makes
 * document-center create/open controls explicit and immediately actionable.
 */
(function(){
'use strict';
if(window.__pstCommercialNavigationFixV1)return;
window.__pstCommercialNavigationFixV1=true;

function norm(v){return String(v||'').replace(/\s+/g,' ').trim().toLowerCase();}
function openOfferRegister(){
  if(typeof window.pstOpenDocumentCenter!=='function')return false;
  window.pstOpenDocumentCenter('offer');
  setTimeout(function(){
    var filter=document.getElementById('pst-dc-filter');
    if(filter){filter.value='offer';if(typeof window.pstRenderDocumentList==='function')window.pstRenderDocumentList();}
    var types=document.querySelectorAll('#pst-dc-types .pst-dc-type');
    types.forEach(function(b){b.classList.toggle('active',norm(b.textContent)==='ofertë'||norm(b.textContent)==='oferte');});
  },0);
  return true;
}
function isCommercialNav(el){return !!el&&el.matches&&el.matches('.pst-ws-navbtn[data-key="commercial"]');}
function isHomeOfferShortcut(el){
  if(!el||!el.closest)return false;
  var quick=el.closest('#page-workspace-home .pst-ws-quick');
  if(!quick)return false;
  var button=el.closest('button');
  return !!button&&/^ofert[ëe]$/i.test(norm(button.textContent));
}
function createDocument(type){
  if(type==='offer'){
    if(typeof window.oaNew==='function'){window.oaNew();return true;}
    if(typeof window.showPage==='function'){
      try{if(typeof window.resetOfferForm==='function')window.resetOfferForm();}catch(e){}
      window.showPage('oferta');
      setTimeout(function(){try{if(typeof window.fillOfferNr==='function')window.fillOfferNr(true);}catch(e){}},120);
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
function openDocument(type,id){
  if(type==='offer'){
    if(typeof window.oaOpenQuoteModal==='function'){window.oaOpenQuoteModal(id);return true;}
    if(typeof window.oaOpen==='function'){window.oaOpen(id);return true;}
  }
  if(type==='invoice'&&typeof window.openInvoiceDetail==='function'){
    window.openInvoiceDetail('out',id);return true;
  }
  return false;
}

document.addEventListener('click',function(event){
  var target=event.target;
  var nav=target.closest&&target.closest('.pst-ws-navbtn[data-key="commercial"]');
  var quick=target.closest&&target.closest('#page-workspace-home .pst-ws-quick button');
  if(isCommercialNav(nav)||isHomeOfferShortcut(quick)){
    if(typeof window.pstOpenDocumentCenter!=='function')return;
    event.preventDefault();event.stopImmediatePropagation();openOfferRegister();return;
  }

  var page=target.closest&&target.closest('#page-document-center');
  if(!page)return;
  var typeBtn=target.closest('[data-type]');
  if(typeBtn){
    event.preventDefault();event.stopImmediatePropagation();
    var type=typeBtn.getAttribute('data-type')||'offer';
    try{if(typeof window.pstSelectDocumentType==='function')window.pstSelectDocumentType(type);}catch(e){}
    createDocument(type);return;
  }
  var newBtn=target.closest('#pst-dc-new');
  if(newBtn){
    event.preventDefault();event.stopImmediatePropagation();
    createDocument((window.PST_DOC_CENTER_STABLE&&window.PST_DOC_CENTER_STABLE.selectedType)||'offer');return;
  }
  var openBtn=target.closest('[data-open]');
  if(openBtn){
    event.preventDefault();event.stopImmediatePropagation();
    openDocument(openBtn.getAttribute('data-open'),openBtn.getAttribute('data-id'));return;
  }
},true);

window.PSTCommercialNavigationFixV1={openOfferRegister:openOfferRegister,createDocument:createDocument,openDocument:openDocument};
})();
