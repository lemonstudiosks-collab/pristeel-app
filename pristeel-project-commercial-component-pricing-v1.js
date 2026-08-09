/* PRISTEEL component-level commercial pricing v1
 * Keeps supplier cost and PRISTEEL selling price separate per component.
 * Adds powder-coating selling price support without touching legacy form markup.
 * Never saves, generates or sends automatically.
 */
(function(){
'use strict';
if(window.__pstProjectCommercialComponentPricingV1)return;
window.__pstProjectCommercialComponentPricingV1=true;

function E(id){return document.getElementById(id);}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function fmt(v){return v>0?v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:3}):'—';}
function pageVisible(){var p=E('page-oferta');if(!p)return false;if(p.classList.contains('active'))return true;var d=String(p.style&&p.style.display||'').toLowerCase();if(d==='block'||d==='flex'||d==='grid')return true;try{var c=getComputedStyle(p);return c.display!=='none'&&c.visibility!=='hidden';}catch(e){return false;}}
function parseCost(attr){var box=E('pst-project-cost-basis');if(!box)return 0;var el=box.querySelector('['+attr+']');if(!el)return 0;var m=String(el.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return m?n(m[0]):0;}
function costs(){return{base:parseCost('data-base'),zinc:parseCost('data-zinc'),coat:parseCost('data-coat')};}
function ensureHidden(){var h=E('pst-of-coat');if(h)return h;var p=E('page-oferta');if(!p)return null;h=document.createElement('input');h.type='hidden';h.id='pst-of-coat';h.value='';p.appendChild(h);return h;}
function sale(id){return n((E(id)||{}).value);}
function setLegacy(){var b=E('pst-sale-base'),z=E('pst-sale-zinc'),c=E('pst-sale-coat');if(!b||!z||!c)return;var pr=E('of-pr'),zn=E('of-zn'),h=ensureHidden();if(pr)pr.value=b.value;if(zn)zn.value=z.value;if(h)h.value=c.value;updateDiffs();}
function diffText(s,c){if(!(s>0)||!(c>0))return'—';var d=s-c;return(d>=0?'+':'')+d.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:3})+' EUR/kg';}
function updateDiffs(){var c=costs();var map=[['base',sale('pst-sale-base'),c.base],['zinc',sale('pst-sale-zinc'),c.zinc],['coat',sale('pst-sale-coat'),c.coat]];map.forEach(function(r){var e=E('pst-diff-'+r[0]);if(e)e.textContent=diffText(r[1],r[2]);});}
function updateCostLabels(){var c=costs();[['base',c.base],['zinc',c.zinc],['coat',c.coat]].forEach(function(r){var e=E('pst-cost-'+r[0]);if(e)e.textContent=fmt(r[1])+' EUR/kg';});updateDiffs();}
function addCss(){if(E('pst-component-pricing-css'))return;var s=document.createElement('style');s.id='pst-component-pricing-css';s.textContent='.pst-cprice{border:1px solid #d7e7ec;background:#fff;border-radius:10px;padding:11px 13px;margin:10px 0 12px}.pst-cprice h4{margin:0 0 2px;font-size:11px;color:#397b94}.pst-cprice-sub{font-size:8.5px;color:#7d8d94;margin-bottom:9px}.pst-cprice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.pst-cprice-card{border:1px solid #e0eaed;border-radius:8px;padding:9px;background:#f9fcfd}.pst-cprice-card b{display:block;font-size:9px;margin-bottom:6px}.pst-cprice-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:end}.pst-cprice-row label{display:block;font-size:7px;text-transform:uppercase;color:#8b979c;margin-bottom:2px}.pst-cprice-row input{width:100%;height:32px;border:1px solid #cfdde2;border-radius:7px;padding:0 8px;font-size:10px;background:#fff}.pst-cprice-cost{font-size:9px;font-weight:650}.pst-cprice-diff{font-size:8px;color:#8c6729;margin-top:5px}.pst-cprice-note{font-size:8px;color:#6f7f86;margin-top:8px}@media(max-width:800px){.pst-cprice-grid{grid-template-columns:1fr}}';document.head.appendChild(s);}
function inject(){if(!pageVisible())return false;var basis=E('pst-project-cost-basis');if(!basis)return false;addCss();var old=E('pst-component-pricing');if(old){updateCostLabels();return true;}ensureHidden();var wrap=document.createElement('div');wrap.id='pst-component-pricing';wrap.className='pst-cprice';wrap.innerHTML='<h4>Çmimet tona për blerësin</h4><div class="pst-cprice-sub">Kostoja e furnitorit mbetet e pandryshuar. Çdo komponent ka çmimin tonë dhe diferencën e vet.</div><div class="pst-cprice-grid">'+
'<div class="pst-cprice-card"><b>Furnizim + punim</b><div class="pst-cprice-row"><div><label>Kosto furnitori</label><div class="pst-cprice-cost" id="pst-cost-base">—</div></div><div><label>Çmimi ynë EUR/kg</label><input id="pst-sale-base" type="number" step="0.01" min="0"></div></div><div class="pst-cprice-diff" id="pst-diff-base">—</div></div>'+
'<div class="pst-cprice-card"><b>Zinkimi</b><div class="pst-cprice-row"><div><label>Kosto furnitori</label><div class="pst-cprice-cost" id="pst-cost-zinc">—</div></div><div><label>Çmimi ynë EUR/kg</label><input id="pst-sale-zinc" type="number" step="0.01" min="0"></div></div><div class="pst-cprice-diff" id="pst-diff-zinc">—</div></div>'+
'<div class="pst-cprice-card"><b>Powder Coating</b><div class="pst-cprice-row"><div><label>Kosto furnitori</label><div class="pst-cprice-cost" id="pst-cost-coat">—</div></div><div><label>Çmimi ynë EUR/kg</label><input id="pst-sale-coat" type="number" step="0.01" min="0"></div></div><div class="pst-cprice-diff" id="pst-diff-coat">—</div></div>'+
'</div><div class="pst-cprice-note">Këto janë çmime draft. Gjenerimi, ruajtja dhe oferta finale vazhdojnë të kërkojnë veprim njerëzor.</div>';
  basis.parentNode.insertBefore(wrap,basis.nextSibling);
  var pr=n((E('of-pr')||{}).value),zn=n((E('of-zn')||{}).value),co=n((ensureHidden()||{}).value);
  if(pr>0)E('pst-sale-base').value=String(pr);if(zn>0)E('pst-sale-zinc').value=String(zn);if(co>0)E('pst-sale-coat').value=String(co);
  ['pst-sale-base','pst-sale-zinc','pst-sale-coat'].forEach(function(id){E(id).addEventListener('input',setLegacy);E(id).addEventListener('change',setLegacy);});
  updateCostLabels();setLegacy();return true;
}
function schedule(){[90,220,500,900].forEach(function(ms){setTimeout(inject,ms);});}
function coatDesc(){var l=String((E('of-lang')||{value:'sr'}).value||'sr');return({de:'Pulverbeschichtung nach Verzinkung',en:'Powder coating after galvanizing',sq:'Ngjyrosje Powder Coating pas zinktimit',sr:'Powder coating nakon cinkovanja'})[l]||'Powder coating';}
function appendCoatingPosition(){var kg=n((E('of-kg')||{}).value),co=n((ensureHidden()||{}).value);if(!(kg>0&&co>0)||!Array.isArray(window.oferPos))return;var exists=window.oferPos.some(function(p){return /powder|pulver|coating|ngjyros/i.test(String(p&&p.desc||''));});if(!exists)window.oferPos.push({desc:coatDesc(),qty:kg,unit:'kg',price:co});if(typeof window.renderOferPos==='function')window.renderOferPos();}
function wrapQuick(){var fn=window.buildOferPosFromQuick;if(typeof fn!=='function'||fn.__pstComponentPricing)return;var w=function(){var r=fn.apply(this,arguments);appendCoatingPosition();return r;};w.__pstComponentPricing=true;w.__base=fn;window.buildOferPosFromQuick=w;}
function ensureQuickPositions(){var kg=n((E('of-kg')||{}).value);if(!(kg>0)||!Array.isArray(window.oferPos)||window.oferPos.length)return;var has=n((E('of-pr')||{}).value)>0||n((E('of-zn')||{}).value)>0||n((ensureHidden()||{}).value)>0||n((E('of-tr')||{}).value)>0;if(has&&typeof window.buildOferPosFromQuick==='function')window.buildOferPosFromQuick();}
function wrapBefore(name){var fn=window[name];if(typeof fn!=='function'||fn.__pstComponentPricing)return;var w=function(){setLegacy();ensureQuickPositions();return fn.apply(this,arguments);};w.__pstComponentPricing=true;w.__base=fn;window[name]=w;}
function wrapState(){var c=window.collectOfferFormState;if(typeof c==='function'&&!c.__pstComponentPricing){var cw=function(){setLegacy();var st=c.apply(this,arguments)||{};st.coat=String((ensureHidden()||{}).value||'');st.componentPricing={base:String((E('pst-sale-base')||{}).value||''),zinc:String((E('pst-sale-zinc')||{}).value||''),coat:String((E('pst-sale-coat')||{}).value||'')};return st;};cw.__pstComponentPricing=true;cw.__base=c;window.collectOfferFormState=cw;}
  var a=window.applyOfferFormState;if(typeof a==='function'&&!a.__pstComponentPricing){var aw=function(st){var r=a.apply(this,arguments);var h=ensureHidden();if(h&&st)h.value=String(st.coat||st.componentPricing&&st.componentPricing.coat||'');schedule();setTimeout(function(){if(st&&st.componentPricing){if(E('pst-sale-base'))E('pst-sale-base').value=st.componentPricing.base||'';if(E('pst-sale-zinc'))E('pst-sale-zinc').value=st.componentPricing.zinc||'';if(E('pst-sale-coat'))E('pst-sale-coat').value=st.componentPricing.coat||'';}setLegacy();},260);return r;};aw.__pstComponentPricing=true;aw.__base=a;window.applyOfferFormState=aw;}}
function wrapNew(){var fn=window.ofertaStartNewDraft;if(typeof fn!=='function'||fn.__pstComponentPricing)return;var w=function(){var r=fn.apply(this,arguments);var h=ensureHidden();if(h)h.value='';var p=E('pst-component-pricing');if(p)p.remove();schedule();return r;};w.__pstComponentPricing=true;w.__base=fn;window.ofertaStartNewDraft=w;}
function install(){wrapQuick();wrapState();wrapBefore('saveOfferState');wrapBefore('genOfer');wrapBefore('printOfer');wrapNew();schedule();}
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-pf2-action="offer"],#pst-cdb-choice [data-m],#page-oferta [data-cdm]'):null;if(t)schedule();},true);
document.addEventListener('change',function(e){if(e.target&&e.target.id==='pst-project-cost-source')setTimeout(function(){updateCostLabels();},30);},true);
document.addEventListener('pst:modules-ready',install);
install();
window.PSTProjectCommercialComponentPricingV1={inject:inject,sync:setLegacy,appendCoatingPosition:appendCoatingPosition,ensureQuickPositions:ensureQuickPositions,update:updateCostLabels};
})();
