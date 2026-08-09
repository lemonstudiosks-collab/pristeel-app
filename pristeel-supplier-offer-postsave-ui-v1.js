/* PRISTEEL supplier offer post-save UI v1
 * Shows unit-rate offers meaningfully when total is unknown and refreshes
 * Project-First Procurement after saving a Gmail-sourced supplier offer.
 */
(function(){
'use strict';
if(window.__pstSupplierOfferPostsaveUiV1)return;window.__pstSupplierOfferPostsaveUiV1=true;
function A(v){return Array.isArray(v)?v:[];}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function fmt(v,max){return Number(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:max==null?3:max});}
function date(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'';}
function name(r){return String(r&& (r.doc_nr||r.reference||r.supplier||r.supplier_name)||'Ofertë').trim();}
function offerMeta(r){
 var total=n(r&&(r.total_eur!=null?r.total_eur:r.total));
 var currency=String(r&&r.currency||'EUR').toUpperCase();
 if(total>0)return fmt(total,2)+' '+currency;
 var rate=n(r&&(r.price_kg!=null?r.price_kg:(r.unit_price!=null?r.unit_price:r.priceKg)));
 var unit=String(r&&(r.pricing_unit||r.unit)||'kg').trim()||'kg';
 if(rate>0)return fmt(rate,3)+' '+currency+'/'+unit+' · sasia e papërcaktuar';
 return 'Pa total / sasi';
}
function supplierCards(){
 var page=document.getElementById('page-workspace-project');if(!page||!page.classList.contains('pf2-on'))return[];
 return [].slice.call(page.querySelectorAll('.pf2-card')).filter(function(c){var b=c.querySelector('header b');return b&&String(b.textContent||'').trim()==='Oferta furnitorësh';});
}
function decorate(){
 var d=window.__pstIntegrityLastData||{},rows=A(d.supplierOffers);if(!rows.length)return false;
 supplierCards().forEach(function(card){
   var lines=[].slice.call(card.querySelectorAll('.pf2-line'));
   lines.forEach(function(line,i){var r=rows[i];if(!r)return;var s=line.querySelector('span');if(!s)return;var parts=[offerMeta(r),date(r.updated_at||r.created_at)].filter(Boolean);s.textContent=parts.join(' · ');});
 });
 var times=[].slice.call(document.querySelectorAll('#page-workspace-project .pf2-time'));
 times.forEach(function(t){var kind=t.querySelector('span'),b=t.querySelector('b'),small=t.querySelector('small');if(!kind||!b||!small||String(kind.textContent||'').indexOf('Ofertë furnitori')!==0)return;var nm=String(b.textContent||'').trim();var r=rows.find(function(x){return name(x)===nm||String(x.supplier||x.supplier_name||'').trim()===nm;});if(r)small.textContent=offerMeta(r);});
 return true;
}
function sourceEmailDraft(){var notes=document.getElementById('oe-notes');return /\[SOURCE_EMAIL:[^\]]+\]/.test(String(notes&&notes.value||''));}
function projectId(){var p=document.getElementById('oe-proj');return String((p&&p.value)||window.__pstCurrentProjectId||window._curProjId||'');}
function wrapSave(){
 var fn=window.pstSaveOffer;if(typeof fn!=='function'||fn.__pstPostsaveUiWrapped)return false;
 var wrapped=async function(){
   var fromEmail=sourceEmailDraft(),pid=projectId(),out=await fn.apply(this,arguments);
   if(fromEmail&&pid&&window.PSTProjectDataIntegrity&&typeof window.PSTProjectDataIntegrity.load==='function'){
     try{
       var fresh=await window.PSTProjectDataIntegrity.load(pid);window.__pstIntegrityLastData=fresh;
       if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render('procurement');
       setTimeout(decorate,0);
     }catch(e){if(window.console&&console.warn)console.warn('Supplier offer post-save refresh:',e);}
   }
   return out;
 };
 wrapped.__pstPostsaveUiWrapped=true;wrapped.__base=fn;window.pstSaveOffer=wrapped;return true;
}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-pf2-tab="procurement"],[data-pf2-tab="commercial"],[data-pf2-action="tab:commercial"]'):null;if(t)setTimeout(decorate,0);},true);
wrapSave();document.addEventListener('pst:modules-ready',function(){wrapSave();setTimeout(decorate,0);},{once:true});
window.PSTSupplierOfferPostsaveUiV1={decorate:decorate,offerMeta:offerMeta,wrapSave:wrapSave};
})();