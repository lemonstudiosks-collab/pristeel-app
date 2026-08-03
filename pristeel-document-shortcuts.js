/* PRISTEEL: quick offer/invoice actions and safe invoice duplication */
(function(){
'use strict';
if(window.__pstDocumentShortcutsLoaded)return;
window.__pstDocumentShortcutsLoaded=true;

var installedDetailWrapper=false;
var observer=null;

var style=document.createElement('style');
style.id='pst-document-shortcuts-style';
style.textContent=`
.pst-doc-shortcut svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pst-copy-invoice-btn{white-space:nowrap}
#pst-doc-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:4400;background:#25292C;color:#fff;border-radius:10px;padding:10px 14px;font-size:11px;box-shadow:0 8px 28px rgba(20,25,28,.22)}
`;
document.head.appendChild(style);

function arr(value){return Array.isArray(value)?value:[];}
function clone(value){try{return JSON.parse(JSON.stringify(value));}catch(e){return value;}}
function enc(value){return encodeURIComponent(String(value==null?'':value));}
function today(){return new Date().toISOString().slice(0,10);}
function toast(text){
  var old=document.getElementById('pst-doc-toast');if(old)old.remove();
  var el=document.createElement('div');el.id='pst-doc-toast';el.textContent=text;document.body.appendChild(el);
  setTimeout(function(){if(el.parentNode)el.remove();},5200);
}
function setValue(id,value){
  var el=document.getElementById(id);if(!el)return;
  var val=value==null?'':String(value);
  if(el.tagName==='SELECT'&&val){
    var found=Array.prototype.some.call(el.options,function(option){return String(option.value)===val;});
    if(!found){var option=document.createElement('option');option.value=val;option.textContent=val;el.appendChild(option);}
  }
  el.value=val;
}
function shiftedDueDate(row){
  if(!row||!row.date||!row.due_date)return '';
  var issued=new Date(row.date+'T12:00:00'),due=new Date(row.due_date+'T12:00:00');
  if(isNaN(issued)||isNaN(due))return '';
  var days=Math.max(0,Math.round((due-issued)/86400000));
  var next=new Date();next.setHours(12,0,0,0);next.setDate(next.getDate()+days);
  return next.toISOString().slice(0,10);
}
function waitForInvoiceForm(){
  return new Promise(function(resolve,reject){
    var tries=0,timer=setInterval(function(){
      var form=document.getElementById('iv-nr');
      if(form){clearInterval(timer);resolve(form);return;}
      if(++tries>60){clearInterval(timer);reject(new Error('Formulari i faturës nuk u hap.'));}
    },100);
  });
}
function resetInvoiceDraft(){
  try{invoiceItems=[];}catch(e){}
  try{extraCostsOut=[];}catch(e){}
  try{ivoutFileData=null;}catch(e){}
  ['iv-nr','iv-ref','iv-proj','iv-cli','iv-con','iv-adr','iv-inc','iv-loc','iv-pay','iv-cer','iv-not','iv-contract-value','iv-advance-pct','iv-due-date','iv-total-override'].forEach(function(id){setValue(id,'');});
  setValue('iv-date',today());setValue('iv-lang','de');setValue('iv-type','standard');setValue('iv-transport','0');setValue('iv-vat','0');setValue('iv-vat-rate','0');
  var file=document.getElementById('ivout-file');if(file)file.value='';
  var fileStatus=document.getElementById('ivout-file-status');if(fileStatus)fileStatus.textContent='';
  var preview=document.getElementById('iv-preview');if(preview)preview.innerHTML='Plotëso të dhënat dhe kliko Gjenero...';
  if(typeof window.renderInvItems==='function')window.renderInvItems();else if(typeof renderInvItems==='function')renderInvItems();
  if(typeof window.renderExtraCosts==='function')window.renderExtraCosts('out');else if(typeof renderExtraCosts==='function')renderExtraCosts('out');
  if(typeof window.toggleVatRate==='function')window.toggleVatRate('iv');else if(typeof toggleVatRate==='function')toggleVatRate('iv');
  setTimeout(function(){if(typeof window.prefillDocNr==='function')window.prefillDocNr('INV','iv-nr');else if(typeof prefillDocNr==='function')prefillDocNr('INV','iv-nr');},180);
}
function openInvoicePage(){
  if(typeof window.showPage==='function')window.showPage('invoices');
  if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');
}
window.pstNewInvoice=function(){
  openInvoicePage();
  waitForInvoiceForm().then(function(){resetInvoiceDraft();window.scrollTo({top:0,behavior:'smooth'});}).catch(function(error){toast(error.message||String(error));});
};
window.pstNewOffer=function(){
  if(typeof window.oaNew==='function'){window.oaNew();return;}
  if(typeof window.showPage==='function')window.showPage('oferta');
  setTimeout(function(){if(typeof window.fillOfferNr==='function')window.fillOfferNr(true);},220);
};

async function getInvoice(id){
  try{
    if(typeof invoicesOutList!=='undefined'){
      var cached=arr(invoicesOutList).filter(function(row){return String(row.id)===String(id);})[0];
      if(cached)return cached;
    }
  }catch(e){}
  if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');
  var rows=await window.supaFetch('invoices_out?id=eq.'+enc(id)+'&select=*&limit=1');
  if(!rows||!rows.length)throw new Error('Fatura nuk u gjet.');
  return rows[0];
}
function copyFields(row){
  setValue('iv-nr','');
  setValue('iv-date',today());
  setValue('iv-lang',row.lang||'de');
  setValue('iv-ref',row.ref||'');
  setValue('iv-proj',row.project||'');
  setValue('iv-cli',row.client||'');
  setValue('iv-con',row.contact||'');
  setValue('iv-adr',row.address||'');
  setValue('iv-inc',row.incoterms||'');
  setValue('iv-loc',row.delivery_location||'');
  setValue('iv-pay',row.payment_terms||'');
  setValue('iv-cer',row.certificate||'');
  setValue('iv-not',row.notes||'');
  setValue('iv-type',row.invoice_type||'standard');
  setValue('iv-contract-value',row.contract_value||'');
  setValue('iv-advance-pct',row.advance_pct||'');
  setValue('iv-due-date',shiftedDueDate(row));
  setValue('iv-transport',row.transport_cost||0);
  setValue('iv-vat',row.vat_applicable?'1':'0');
  setValue('iv-vat-rate',row.vat_rate||0);
  setValue('iv-total-override','');

  try{invoiceItems=clone(arr(row.items));}catch(e){}
  try{extraCostsOut=clone(arr(row.extra_costs));}catch(e){}
  try{ivoutFileData=null;}catch(e){}

  var file=document.getElementById('ivout-file');if(file)file.value='';
  var fileStatus=document.getElementById('ivout-file-status');if(fileStatus)fileStatus.textContent='';
  var preview=document.getElementById('iv-preview');if(preview)preview.innerHTML='Të dhënat u kopjuan. Bëji korrigjimet dhe kliko Gjenero Faturën.';
  if(typeof window.renderInvItems==='function')window.renderInvItems();else if(typeof renderInvItems==='function')renderInvItems();
  if(typeof window.renderExtraCosts==='function')window.renderExtraCosts('out');else if(typeof renderExtraCosts==='function')renderExtraCosts('out');
  if(typeof window.toggleVatRate==='function')window.toggleVatRate('iv');else if(typeof toggleVatRate==='function')toggleVatRate('iv');
  setTimeout(function(){if(typeof window.prefillDocNr==='function')window.prefillDocNr('INV','iv-nr');else if(typeof prefillDocNr==='function')prefillDocNr('INV','iv-nr');},180);
}
window.pstCopyInvoice=async function(id){
  try{
    var row=await getInvoice(id);
    if(typeof window.closeInvoiceDetail==='function')window.closeInvoiceDetail();
    openInvoicePage();
    await waitForInvoiceForm();
    copyFields(row);
    window.scrollTo({top:0,behavior:'smooth'});
    toast('U krijua një draft i ri nga fatura '+(row.invoice_nr||'e zgjedhur')+'. Origjinalja nuk u ndryshua.');
  }catch(error){toast('Kopjimi dështoi: '+(error.message||error));}
};

function shortcutButton(id,label,icon,handler,primary){
  var button=document.createElement('button');
  button.type='button';button.id=id;button.className='pst-dash-btn pst-doc-shortcut'+(primary?' primary':'');
  button.innerHTML=icon+'<span>'+label+'</span>';button.addEventListener('click',handler);return button;
}
var OFFER_ICON='<svg viewBox="0 0 24 24"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h4M8 12h8M8 16h6"/></svg>';
var INVOICE_ICON='<svg viewBox="0 0 24 24"><path d="M5 3h14v18l-2-1.5L15 21l-2-1.5L11 21l-2-1.5L7 21l-2-1.5z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>';
function injectDashboardShortcuts(){
  var host=document.querySelector('.pst-dash-actions');if(!host)return;
  if(!document.getElementById('pst-new-offer-shortcut'))host.insertBefore(shortcutButton('pst-new-offer-shortcut','Ofertë e re',OFFER_ICON,window.pstNewOffer,false),host.firstChild);
  if(!document.getElementById('pst-new-invoice-shortcut')){
    var offer=document.getElementById('pst-new-offer-shortcut');
    var invoice=shortcutButton('pst-new-invoice-shortcut','Faturë e re',INVOICE_ICON,window.pstNewInvoice,false);
    if(offer&&offer.nextSibling)host.insertBefore(invoice,offer.nextSibling);else host.appendChild(invoice);
  }
}
function invoiceIdFromRow(row){
  var code=row.getAttribute('onclick')||'';
  var match=code.match(/openInvoiceDetail\s*\(\s*['"]out['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
  return match?match[1]:'';
}
function injectInvoiceRowButtons(){
  var host=document.getElementById('iv-out-list');if(!host)return;
  host.querySelectorAll('.project-card').forEach(function(row){
    if(row.querySelector('.pst-copy-invoice-btn'))return;
    var id=invoiceIdFromRow(row);if(!id)return;
    var actions=row.lastElementChild;
    if(!actions||actions===row.firstElementChild)return;
    var button=document.createElement('button');button.type='button';button.className='btn btn-sm pst-copy-invoice-btn';button.textContent='Kopjo';
    button.title='Krijo një faturë të re me të njëjtat të dhëna';
    button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();window.pstCopyInvoice(id);});
    actions.insertBefore(button,actions.firstChild);
  });
}
function injectDetailCopyButton(id){
  var modal=document.getElementById('inv-detail-modal');if(!modal||modal.querySelector('.pst-copy-invoice-detail'))return;
  var body=modal.querySelector('.pst-modal-bd');if(!body)return;
  var footer=body.lastElementChild;if(!footer)return;
  var button=document.createElement('button');button.type='button';button.className='btn btn-sm btn-primary pst-copy-invoice-detail';button.textContent='Kopjo si faturë të re';
  button.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();window.pstCopyInvoice(id);});
  footer.insertBefore(button,footer.firstChild);
}
function wrapInvoiceDetail(){
  if(installedDetailWrapper||typeof window.openInvoiceDetail!=='function')return;
  installedDetailWrapper=true;
  var original=window.openInvoiceDetail;
  window.openInvoiceDetail=function(type,id){
    var result=original.apply(this,arguments);
    if(type==='out')setTimeout(function(){injectDetailCopyButton(id);},30);
    return result;
  };
}
function apply(){injectDashboardShortcuts();injectInvoiceRowButtons();wrapInvoiceDetail();}
function start(){
  apply();
  observer=new MutationObserver(function(){setTimeout(apply,0);});
  observer.observe(document.body,{childList:true,subtree:true});
  var tries=0,timer=setInterval(function(){apply();if(++tries>120)clearInterval(timer);},250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
