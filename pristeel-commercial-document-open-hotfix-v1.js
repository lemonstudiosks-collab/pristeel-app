/* PRISTEEL commercial document open hotfix v1
 * Ensures Tregti/Prodhim choice opens the actual legacy offer/invoice editor.
 * Uses direct page activation to avoid workspace routing sending the user back to the register.
 */
(function(){
'use strict';
if(window.__pstCommercialDocumentOpenHotfixV1)return;
window.__pstCommercialDocumentOpenHotfixV1=true;

function activate(id){
  var page=document.getElementById(id);
  if(!page)return false;
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');p.style.display='none';});
  page.style.display='block';
  page.classList.add('active');
  try{window.scrollTo({top:0,behavior:'auto'});}catch(e){}
  return true;
}
function clearOffer(){
  try{if(typeof window.resetOfferForm==='function')window.resetOfferForm();}catch(e){}
  try{if(Array.isArray(window.oferPos)){window.oferPos.length=0;if(typeof window.renderOferPos==='function')window.renderOferPos();}}catch(e){}
}
function clearInvoice(){
  try{var i=0;while(document.getElementById('ivi-row-0')&&i++<500&&typeof window.remInvItem==='function')window.remInvItem(0);}catch(e){}
}
function open(type,mode){
  var B=window.PSTCommercialDocumentBuilderV1;
  try{if(B&&typeof B.setMode==='function')B.setMode(mode,true);else window.__pstCommercialDocumentMode=mode;}catch(e){}
  if(type==='offer'){
    clearOffer();
    if(!activate('page-oferta'))return false;
    setTimeout(function(){
      clearOffer();
      try{if(typeof window.fillOfferNr==='function')window.fillOfferNr(true);}catch(e){}
      try{if(B&&typeof B.enhance==='function')B.enhance();}catch(e){}
    },40);
    return true;
  }
  clearInvoice();
  if(!activate('page-invoices'))return false;
  setTimeout(function(){
    try{if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');}catch(e){}
    clearInvoice();
    try{if(typeof window.prefillDocNr==='function')window.prefillDocNr('INV','iv-nr');}catch(e){}
    try{if(B&&typeof B.enhance==='function')B.enhance();}catch(e){}
  },40);
  return true;
}

document.addEventListener('click',function(ev){
  var btn=ev.target&&ev.target.closest?ev.target.closest('#pst-cdb-choice [data-m]'):null;
  if(!btn)return;
  var box=document.getElementById('pst-cdb-choice');
  var title=box&&box.querySelector('h3');
  var type=title&&/fatur/i.test(title.textContent||'')?'invoice':'offer';
  var mode=btn.getAttribute('data-m')==='trading'?'trading':'production';
  ev.preventDefault();
  ev.stopImmediatePropagation();
  if(box&&box.parentNode)box.remove();
  open(type,mode);
},true);

window.PSTCommercialDocumentOpenHotfixV1={open:open};
})();
