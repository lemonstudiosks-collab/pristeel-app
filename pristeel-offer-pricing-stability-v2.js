/* PRISTEEL Supplier Offer / Pricing Stability v2
 * Serializes autosaves so an in-flight first POST cannot create duplicate offers.
 * Repairs steel-origin select state after the legacy renderer.
 */
(function(){
'use strict';
if(window.__pstOfferPricingStabilityV2)return;
window.__pstOfferPricingStabilityV2=true;
var timers={},states={};
function key(o){return String(o&&o.id||'');}
function payload(o){return{project_id:window._curProjId,supplier:o.supplier||'',price_kg:o.priceKg||0,total_eur:o.totalEur||0,delivery_weeks:o.delivery||0,incoterms:o.inco||'EXW',cert:o.cert||'',notes:o.notes||'',origin:o.origin||'',zinc_kg:o.zincKg||0,transport_eur:o.transportEur||0,vat_pct:o.vatPct||0,qty_kg:o.kg||0,currency:o.currency||'EUR',pricing_unit:o.pricingUnit||'kg',positions:(Array.isArray(o.positions)&&o.positions.length)?o.positions:null};}
async function save(o){
 if(!window._curProjId||!o||typeof window.supaFetch!=='function')return;
 var k=key(o),s=states[k]||(states[k]={inflight:false,pending:false});
 if(s.inflight){s.pending=true;return;}
 s.inflight=true;s.pending=false;
 try{
   var rows=o.dbId?await window.supaFetch('offers?id=eq.'+encodeURIComponent(o.dbId),'PATCH',payload(o)):await window.supaFetch('offers','POST',payload(o));
   if(!o.dbId&&rows&&rows[0]&&rows[0].id)o.dbId=rows[0].id;
 }catch(error){if(window.console&&console.error)console.error('Ruajtja e ofertes:',error);}
 finally{
   s.inflight=false;
   if(s.pending){s.pending=false;setTimeout(function(){save(o);},0);}
 }
}
function schedule(o){
 if(!window._curProjId||!o)return;
 var k=key(o);clearTimeout(timers[k]);timers[k]=setTimeout(function(){save(o);},650);
}
function fixOriginSelects(){
 var list=document.getElementById('offer-list');if(!list||!Array.isArray(window.offers))return;
 var selects=list.querySelectorAll('select[onchange*="origin"]');
 selects.forEach(function(sel,i){var o=window.offers[i];if(o)sel.value=String(o.origin||'');});
}
function wrapRenderer(){
 if(typeof window.renderOffers!=='function'||window.renderOffers.__pstStablePricingWrapped)return;
 var original=window.renderOffers;
 var wrapped=function(){var out=original.apply(this,arguments);fixOriginSelects();return out;};
 wrapped.__pstStablePricingWrapped=true;window.renderOffers=wrapped;
}
window.scheduleOfferSave=schedule;window.saveOfferDb=save;
wrapRenderer();setTimeout(function(){wrapRenderer();fixOriginSelects();},0);
document.addEventListener('pst:modules-ready',function(){wrapRenderer();fixOriginSelects();},{once:true});
window.PSTOfferPricingStabilityV2={save:save,schedule:schedule,fixOriginSelects:fixOriginSelects,_states:states};
})();
