/* PRISTEEL invoice identity + project-flow bridge v1
 * Keeps Offer and Invoice as separate documents while preserving the shared visual language.
 * Narrow scope: project-flow navigation between Offer/Invoice, invoice numbering, invoice language labels.
 */
(function(){
'use strict';
if(window.__pstInvoiceIdentityV1)return;
window.__pstInvoiceIdentityV1=true;
var baseFlowGoto=window.flowGoto;
function el(id){return document.getElementById(id);}
function clearDisplay(node){if(node&&node.style&&typeof node.style.removeProperty==='function')node.style.removeProperty('display');}
function patchLabels(){
  try{
    if(typeof INV_LABELS!=='undefined'&&INV_LABELS.sr){INV_LABELS.sr.t='RAČUN';INV_LABELS.sr.on='Broj računa:';}
    if(typeof INVOICE_TYPE_TITLES!=='undefined'){
      if(INVOICE_TYPE_TITLES.standard)INVOICE_TYPE_TITLES.standard.sr='RAČUN';
      if(INVOICE_TYPE_TITLES.advance)INVOICE_TYPE_TITLES.advance.sr='AVANSNI RAČUN';
      if(INVOICE_TYPE_TITLES.final)INVOICE_TYPE_TITLES.final.sr='KONAČNI RAČUN';
    }
    if(typeof ADV_NOTE_TXT!=='undefined')ADV_NOTE_TXT.sr='Ovaj račun pokriva ';
  }catch(e){if(window.console)console.warn('Invoice labels:',e);}
}
function seqFromNr(v,year){
  var s=String(v||'').trim();if(!s||s.indexOf('PST-INV-'+year+'-')!==0)return 0;
  var m=s.match(/-(\d{1,6})$/);return m?(parseInt(m[1],10)||0):0;
}
async function nextInvoiceNr(){
  var d=new Date(),year=d.getFullYear(),month=String(d.getMonth()+1).padStart(2,'0'),max=0;
  if(typeof window.supaFetch==='function'){
    try{
      var reg=await window.supaFetch('documents_registry?series=eq.INV&year=eq.'+year+'&select=seq,doc_nr&order=seq.desc&limit=200');
      (Array.isArray(reg)?reg:[]).forEach(function(r){max=Math.max(max,parseInt(r&&r.seq,10)||0,seqFromNr(r&&r.doc_nr,year));});
    }catch(e){}
    try{
      var inv=await window.supaFetch('invoices_out?select=invoice_nr,created_at&order=created_at.desc&limit=1000');
      (Array.isArray(inv)?inv:[]).forEach(function(r){max=Math.max(max,seqFromNr(r&&r.invoice_nr,year));});
    }catch(e){}
  }
  // User-confirmed 2026 invoice sequence already has #001 and #002.
  var floor=year===2026?3:1;
  var seq=Math.max(max+1,floor);
  return{nr:'PST-INV-'+year+'-'+month+'-'+String(seq).padStart(3,'0'),seq:seq,year:year,month:month};
}
function autoNumber(v){return !String(v||'').trim()||/^PST-INV-\d{4}-\d{3}$/i.test(String(v||'').trim());}
async function fillInvoiceNr(){
  var f=el('iv-nr');if(!f||!autoNumber(f.value))return f&&f.value||'';
  var x=await nextInvoiceNr();
  if(autoNumber(f.value))f.value=x.nr;
  return f.value;
}
function syncPair(page){
  var offer=el('page-oferta'),invoice=el('page-invoices');
  clearDisplay(offer);clearDisplay(invoice);
  if(typeof window.showPage==='function')window.showPage(page);
  else if(typeof baseFlowGoto==='function')baseFlowGoto(page);
  clearDisplay(offer);clearDisplay(invoice);
  if(page==='invoices'){
    try{if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');}catch(e){}
    fillInvoiceNr().catch(function(){});
  }
}
window.flowGoto=function(page){
  page=String(page||'');
  if(page==='invoices'||page==='oferta')return syncPair(page);
  if(typeof baseFlowGoto==='function')return baseFlowGoto.apply(this,arguments);
  if(typeof window.showPage==='function')return window.showPage(page);
};
patchLabels();
document.addEventListener&&document.addEventListener('pst:modules-ready',patchLabels,{once:true});
window.PSTInvoiceIdentityV1={patchLabels:patchLabels,nextInvoiceNr:nextInvoiceNr,fillInvoiceNr:fillInvoiceNr,syncPair:syncPair,seqFromNr:seqFromNr};
})();
