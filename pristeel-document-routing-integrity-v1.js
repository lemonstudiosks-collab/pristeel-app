/* PRISTEEL document creation routing integrity */
(function(){
'use strict';
if(window.__pstDocumentRoutingIntegrityV1)return;window.__pstDocumentRoutingIntegrityV1=true;
var original=window.pstCreateSelectedDocument;
function show(page){var L=window.__pstWorkspaceLegacy||{},fn=L.pstV2Go||L.showPage||window.pstV2Go||window.showPage;try{if(typeof fn==='function')fn.call(window,page);}catch(e){}var el=document.getElementById('page-'+page);if(!el)return false;document.querySelectorAll('.page').forEach(function(x){if(x!==el){x.classList.remove('active');x.style.display='none';}});el.classList.add('active');el.style.display='block';if(typeof window.applyModuleChrome==='function')try{window.applyModuleChrome(page);}catch(e){}window.scrollTo({top:0,behavior:'auto'});return true;}
function fail(t){alert(t);}
window.pstCreateSelectedDocument=function(){var D=window.PST_DOC_CENTER||{},t=D.selectedType||'invoice';if(t==='offer'){if(!show('oferta'))return fail('Faqja reale e ofertës nuk u gjet.');try{if(typeof window.resetOfferForm==='function')window.resetOfferForm();}catch(e){}setTimeout(function(){try{if(typeof window.fillOfferNr==='function')window.fillOfferNr(true);}catch(e){}},120);return;}if(t==='invoice'){if(!show('invoices'))return fail('Faqja reale e faturës nuk u gjet.');setTimeout(function(){if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');},80);return;}if((t==='credit_note'||t==='debit_note')&&typeof window.pstOpenAdjustment==='function'){window.pstOpenAdjustment(t,'');return;}if(typeof original==='function')return original();fail('Krijimi i këtij dokumenti nuk është lidhur ende.');};
})();
