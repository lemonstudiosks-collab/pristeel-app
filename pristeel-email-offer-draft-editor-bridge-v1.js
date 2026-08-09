/* PRISTEEL email-offer draft -> supplier-offer editor bridge v1
 * Scope: only drafts originating from Gmail and marked with SOURCE_EMAIL.
 * Ensures the base unit-price row is visible in the editor and preserves €/kg
 * even when the email did not contain a quantity.
 */
(function(){
'use strict';
if(window.__pstEmailOfferDraftEditorBridgeV1)return;window.__pstEmailOfferDraftEditorBridgeV1=true;
function A(v){return Array.isArray(v)?v:[];}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function mailById(id){var d=window.__pstIntegrityLastData||{};return A(d.emails).find(function(m){return String(m.gmail_message_id||m.id||'')===String(id);})||null;}
function sourceText(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'').replace(/\u0000/g,' ').trim();}
function applyBaseRow(id){
 var api=window.PSTEmailOfferStructuredFallbackV1,m=mailById(id);if(!api||!api._test||!api._test.structured||!m)return false;
 var x=api._test.structured(sourceText(m),m),base=A(x.positions).find(function(p){return p&&p.kind==='base';})||A(x.positions)[0];if(!base)return false;
 var rows=document.querySelectorAll('#oe-rows tr:not(.oe-calcrow)'),row=rows&&rows[0];if(!row)return false;
 var cells=row.children;if(!cells||cells.length<7)return false;
 var desc=cells[2]&&cells[2].querySelector('input'),qty=cells[3]&&cells[3].querySelector('input'),unit=cells[4]&&cells[4].querySelector('input'),po=cells[5]&&cells[5].querySelector('input'),pn=cells[6]&&cells[6].querySelector('input');
 var price=n(base.unit_price),description=String(base.description||'Konstruksion metalik');
 if(desc)desc.value=description;if(qty)qty.value='';if(unit)unit.value=base.unit||'kg';if(po)po.value=price||'';if(pn)pn.value=price||'';
 if(typeof window.pstPos==='function'){
   window.pstPos(0,'desc',description);window.pstPos(0,'qty','');window.pstPos(0,'unit',base.unit||'kg');window.pstPos(0,'price_orig',price);window.pstPos(0,'price_neg',price);
 }
 if(typeof window.pstCalc==='function')window.pstCalc();
 return true;
}
async function onOpen(e){
 var t=e.target&&e.target.closest?e.target.closest('[data-esf-open]'):null;if(!t)return;
 var id=t.getAttribute('data-esf-open')||'';if(!id)return;
 var api=window.PSTEmailOfferStructuredFallbackV1;if(!api||typeof api.openDraft!=='function')return;
 e.preventDefault();e.stopImmediatePropagation();
 await api.openDraft(id);
 applyBaseRow(id);
}
function captureDraftForSave(){
 var notes=document.getElementById('oe-notes'),proj=document.getElementById('oe-proj'),sup=document.getElementById('oe-sup'),supQ=document.getElementById('oe-sup-q');
 var txt=String(notes&&notes.value||''),mk=txt.match(/\[SOURCE_EMAIL:[^\]]+\]/);if(!mk)return null;
 var row=document.querySelector('#oe-rows tr:not(.oe-calcrow)');if(!row)return null;var c=row.children||[];
 var qty=c[3]&&c[3].querySelector('input'),unit=c[4]&&c[4].querySelector('input'),price=c[6]&&c[6].querySelector('input');
 var p=n(price&&price.value),q=n(qty&&qty.value),u=String(unit&&unit.value||'').trim().toLowerCase();
 if(!(p>0)||q>0||u!=='kg')return null;
 return{marker:mk[0],projectId:String(proj&&proj.value||''),supplier:String((sup&&sup.value)||(supQ&&supQ.value)||'').trim(),price:p};
}
function wrapSave(){
 var fn=window.pstSaveOffer;if(typeof fn!=='function'||fn.__pstEmailRateWrapped)return;
 var wrapped=async function(){
   var keep=captureDraftForSave(),out=await fn.apply(this,arguments);
   if(keep&&keep.projectId&&typeof window.supaFetch==='function'){
     try{
       var rows=await window.supaFetch('offers?project_id=eq.'+encodeURIComponent(keep.projectId)+'&order=created_at.desc&limit=30');
       var hit=A(rows).find(function(r){return String(r&&r.notes||'').indexOf(keep.marker)>-1&&(!keep.supplier||String(r.supplier||'').trim()===keep.supplier);});
       if(hit&&hit.id&&!(n(hit.price_kg)>0))await window.supaFetch('offers?id=eq.'+encodeURIComponent(hit.id),'PATCH',{price_kg:keep.price});
     }catch(err){if(window.console&&console.warn)console.warn('Email offer unit-rate preserve:',err);}
   }
   return out;
 };
 wrapped.__pstEmailRateWrapped=true;window.pstSaveOffer=wrapped;
}
window.addEventListener('click',onOpen,true);
wrapSave();document.addEventListener('pst:modules-ready',wrapSave,{once:true});
window.PSTEmailOfferDraftEditorBridgeV1={applyBaseRow:applyBaseRow,captureDraftForSave:captureDraftForSave,wrapSave:wrapSave};
})();
