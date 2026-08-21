/* PRISTEEL manufacturer/supplier terms flow-down v1
 * General Commercial rule:
 * - Supplier/manufacturer quotation remains the cost/scope basis.
 * - Supplier technical/commercial conditions flow into the buyer draft by default.
 * - PRISTEEL selling prices remain separate and human-approved.
 * - Nothing is saved, generated as final, or sent automatically by this module.
 */
(function(){
'use strict';
if(window.__pstManufacturerTermsFlowdownV1)return;
window.__pstManufacturerTermsFlowdownV1=true;

var flow=null;
function A(v){return Array.isArray(v)?v:[];}
function E(id){return document.getElementById(id);}
function L(v){return String(v==null?'':v).trim();}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function data(){return window.__pstIntegrityLastData||null;}
function offerRate(o){return n(o&&(o.price_kg!=null?o.price_kg:(o.unit_price!=null?o.unit_price:o.priceKg)));}
function offers(){return A(data()&&data().supplierOffers).filter(function(o){return offerRate(o)>0;});}
function lang(){return L((E('of-lang')||{}).value||'sq').toLowerCase();}
function labels(l){
  return ({
    sr:{title:'Uslovi proizvodne osnove → uslovi prema kupcu',auto:'Automatski preneseno iz izabrane ponude proizvođača. Možete urediti tekst prije čuvanja ili slanja.',inc:'UKLJUČENO U PONUDU',exc:'NIJE UKLJUČENO / OBEZBJEĐUJE KUPAC',cond:'KOMERCIJALNI I TEHNIČKI USLOVI',pay:'USLOVI PLAĆANJA',warn:'Izvor sadrži napomenu za tehničku provjeru. Provjerite označene uslove prije finalnog slanja.'},
    de:{title:'Herstellerbedingungen → Kundenangebot',auto:'Automatisch aus dem gewählten Herstellerangebot übernommen. Vor Speichern oder Versand bearbeitbar.',inc:'IM ANGEBOT ENTHALTEN',exc:'NICHT ENTHALTEN / BAUSEITS',cond:'KAUFMÄNNISCHE UND TECHNISCHE BEDINGUNGEN',pay:'ZAHLUNGSBEDINGUNGEN',warn:'Die Quelle enthält einen technischen Prüfhinweis. Bedingungen vor dem finalen Versand prüfen.'},
    en:{title:'Manufacturer terms → buyer offer',auto:'Automatically carried over from the selected manufacturer quotation. Editable before saving or sending.',inc:'INCLUDED IN THE OFFER',exc:'NOT INCLUDED / BY CLIENT',cond:'COMMERCIAL AND TECHNICAL CONDITIONS',pay:'PAYMENT TERMS',warn:'The source contains a technical review note. Verify the flagged conditions before final sending.'},
    sq:{title:'Kushtet e prodhuesit → oferta për blerësin',auto:'Barten automatikisht nga oferta e zgjedhur e prodhuesit. Mund t’i redaktoni para ruajtjes ose dërgimit.',inc:'PËRFSHIHET NË OFERTË',exc:'NUK PËRFSHIHET / E SIGURON KLIENTI',cond:'KUSHTET KOMERCIALE DHE TEKNIKE',pay:'KUSHTET E PAGESËS',warn:'Burimi përmban shënim për verifikim teknik. Kontrolloni kushtet e shënuara para dërgimit final.'}
  })[l]||({title:'Manufacturer terms → buyer offer',auto:'Automatically carried over from the selected manufacturer quotation. Editable before saving or sending.',inc:'INCLUDED IN THE OFFER',exc:'NOT INCLUDED / BY CLIENT',cond:'COMMERCIAL AND TECHNICAL CONDITIONS',pay:'PAYMENT TERMS',warn:'The source contains a technical review note. Verify the flagged conditions before final sending.'});
}
function sourceKey(o){return L(o&&o.id)||L(o&&o.offer_ref)||[L(o&&o.supplier||o&&o.supplier_name),L(o&&o.created_at)].join('|');}
function lineList(v){
  var s=L(v);if(!s)return'';
  var xs=s.split(/\s*;\s*|\n+/).map(function(x){return L(x).replace(/^[-•]\s*/, '');}).filter(Boolean);
  return xs.length?'• '+xs.join('\n• '):'';
}
function technicalClauses(o,l){
  var t=[o&&o.raw_text,o&&o.notes].filter(Boolean).join('\n'),out=[];
  if(/theoretical\s+weights?|teorijsk\w*\s+težin|pesh\w*\s+teorike/i.test(t)){
    out.push(l==='sr'?'Navedene težine su teorijske; konačne količine utvrđuju se prema završnoj reviziji odobrene dokumentacije.':l==='de'?'Die angegebenen Gewichte sind theoretisch; die endgültigen Mengen ergeben sich aus der final freigegebenen Dokumentation.':l==='sq'?'Peshat e shënuara janë teorike; sasitë përfundimtare përcaktohen sipas dokumentacionit final të aprovuar.':'Stated weights are theoretical; final quantities are determined from the final approved documentation.');
  }
  if(/\bLME\b|raw\s+material.*market|sirovin\w*.*trži|market\s+prices?/i.test(t)){
    out.push(l==='sr'?'Cijene sirovina zasnovane su na važećim tržišnim cijenama; značajne promjene mogu biti predmet korekcije cijene i/ili roka.':l==='de'?'Die Rohstoffpreise basieren auf den aktuellen Marktpreisen; wesentliche Änderungen können eine Anpassung von Preis und/oder Termin erfordern.':l==='sq'?'Çmimet e lëndës së parë bazohen në çmimet aktuale të tregut; ndryshimet e rëndësishme mund të kërkojnë korrigjim të çmimit dhe/ose afatit.':'Raw-material prices are based on current market prices; material changes may require adjustment of price and/or delivery time.');
  }
  if(/dimensional\s+toler|toleranc/i.test(t)){
    out.push(l==='sr'?'Dimenzionalne tolerancije primjenjuju se prema konačno odobrenoj tehničkoj specifikaciji.':l==='de'?'Maßtoleranzen gelten gemäß der final freigegebenen technischen Spezifikation.':l==='sq'?'Tolerancat dimensionale zbatohen sipas specifikimit teknik final të aprovuar.':'Dimensional tolerances apply according to the final approved technical specification.');
  }
  if(/technical\s+specification.*(change|impact)|promjen\w*.*tehnič|changes?.*scope/i.test(t)){
    out.push(l==='sr'?'Promjene tehničke specifikacije, količina ili obima mogu uticati na cijenu i rok realizacije.':l==='de'?'Änderungen der technischen Spezifikation, Mengen oder des Leistungsumfangs können Preis und Termin beeinflussen.':l==='sq'?'Ndryshimet e specifikimit teknik, sasive ose scope-it mund të ndikojnë në çmim dhe afat.':'Changes to the technical specification, quantities or scope may affect price and delivery time.');
  }
  return out;
}
function hasReviewFlag(o){return /(review required|review flag|inconsistent|clarif|verify|verifik|paqart|neuskla|uskladiti)/i.test([o&&o.notes,o&&o.raw_text].filter(Boolean).join(' '));}
function compose(o,l){
  var z=labels(l),parts=[],inc=lineList(o&&o.inclusions),exc=lineList(o&&o.exclusions),tc=technicalClauses(o,l);
  if(inc)parts.push(z.inc+'\n'+inc);
  if(exc)parts.push(z.exc+'\n'+exc);
  if(tc.length)parts.push(z.cond+'\n• '+tc.join('\n• '));
  return parts.join('\n\n');
}
function ensureOption(sel,value,text){
  if(!sel||!value)return false;
  var hit=[].find.call(sel.options||[],function(o){return String(o.value)===String(value);});
  if(!hit){var op=document.createElement('option');op.value=String(value);op.textContent=text||String(value);sel.appendChild(op);}
  return true;
}
function setSelect(id,value){var e=E(id);if(!e||!L(value))return false;ensureOption(e,L(value),L(value));e.value=L(value);try{e.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}return true;}
function setValue(id,value){var e=E(id);if(!e||value==null||L(value)==='')return false;e.value=String(value);try{e.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}return true;}
function paymentText(o){return L(o&&o.payment_terms);}
function buildFlow(o){
  var l=lang();return{
    version:1,
    sourceKey:sourceKey(o),
    sourceOfferRef:L(o&&o.offer_ref),
    sourceSupplier:L(o&&o.supplier||o&&o.supplier_name),
    incoterm:L(o&&o.incoterms).toUpperCase(),
    validityDays:n(o&&o.validity_days)||null,
    deliveryWeeks:n(o&&o.delivery_weeks)||null,
    certificate:L(o&&o.cert),
    paymentTerms:paymentText(o),
    inclusions:L(o&&o.inclusions),
    exclusions:L(o&&o.exclusions),
    reviewRequired:hasReviewFlag(o),
    text:compose(o,l),
    language:l,
    appliedAt:new Date().toISOString()
  };
}
function paymentOption(){
  var s=E('of-pay-preset');if(!s)return null;
  ensureOption(s,'supplierflow',lang()==='sr'?'Uslovi proizvođača':lang()==='de'?'Herstellerbedingungen':lang()==='sq'?'Kushtet e prodhuesit':'Manufacturer terms');
  return s;
}
function applyFields(f){
  if(!f)return;
  if(f.incoterm)setSelect('of-inc',f.incoterm);
  if(f.validityDays)setValue('of-val',f.validityDays);
  if(f.deliveryWeeks)setValue('of-del',f.deliveryWeeks);
  if(f.certificate)setSelect('of-cer',f.certificate);
  if(f.paymentTerms){var s=paymentOption();if(s){s.value='supplierflow';try{s.dispatchEvent(new Event('change',{bubbles:true}));}catch(x){}}}
}
function addCss(){
  if(E('pst-manufacturer-flowdown-css'))return;
  var s=document.createElement('style');s.id='pst-manufacturer-flowdown-css';
  s.textContent='.pst-mfd{border:1px solid #d7e7dc;background:#fbfdfb;border-radius:10px;padding:11px 13px;margin:10px 0 12px}.pst-mfd-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.pst-mfd h4{font-size:11px;margin:0;color:#356741}.pst-mfd small{display:block;font-size:8.5px;color:#728078;margin-top:2px;line-height:1.4}.pst-mfd-badge{font-size:7.5px;font-weight:700;text-transform:uppercase;border:1px solid #bcd5c2;border-radius:20px;padding:3px 7px;color:#356741;background:#fff;white-space:nowrap}.pst-mfd textarea{width:100%;min-height:150px;margin-top:9px;border:1px solid #d9e4dc;border-radius:8px;background:#fff;padding:9px 10px;font:10px/1.45 Inter,Arial,sans-serif;resize:vertical}.pst-mfd-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:8px;color:#6f7d73}.pst-mfd-warn{margin-top:8px;padding:7px 9px;border-radius:7px;background:#fff8e8;color:#806224;font-size:8.5px}';document.head.appendChild(s);
}
function render(){
  var basis=E('pst-project-cost-basis');if(!basis)return false;
  addCss();var old=E('pst-manufacturer-terms-flowdown');if(!flow){if(old)old.remove();return false;}
  var z=labels(lang()),wrap=old||document.createElement('div');wrap.id='pst-manufacturer-terms-flowdown';wrap.className='pst-mfd';
  wrap.innerHTML='<div class="pst-mfd-top"><div><h4>'+esc(z.title)+'</h4><small>'+esc(z.auto)+'</small></div><span class="pst-mfd-badge">AUTO FLOW-DOWN</span></div>'+
    '<textarea id="pst-manufacturer-flowdown-text" aria-label="Manufacturer terms flow-down">'+esc(flow.text||'')+'</textarea>'+
    '<div class="pst-mfd-meta">'+(flow.incoterm?'<span>Incoterm: <b>'+esc(flow.incoterm)+'</b></span>':'')+(flow.validityDays?'<span>Validitet: <b>'+esc(flow.validityDays)+'</b></span>':'')+(flow.certificate?'<span>Cert: <b>'+esc(flow.certificate)+'</b></span>':'')+(flow.paymentTerms?'<span>Pagesa: <b>'+esc(flow.paymentTerms)+'</b></span>':'')+'</div>'+
    (flow.reviewRequired?'<div class="pst-mfd-warn">'+esc(z.warn)+'</div>':'');
  if(!old)basis.parentNode.insertBefore(wrap,basis.nextSibling);
  var ta=E('pst-manufacturer-flowdown-text');if(ta)ta.addEventListener('input',function(){if(flow)flow.text=this.value;});
  return true;
}
function applyOffer(o){if(!o)return false;flow=buildFlow(o);applyFields(flow);render();window.__pstManufacturerTermsFlowdown=flow;return true;}
function selectedOffer(){
  var s=E('pst-project-cost-source');if(!s||s.value==='')return null;var i=parseInt(s.value,10),xs=offers();return isFinite(i)&&i>=0&&i<xs.length?xs[i]:null;
}
function restore(st){
  var f=st&&st.supplierTermsFlowdown;if(!f||typeof f!=='object')return false;
  flow={};Object.keys(f).forEach(function(k){flow[k]=f[k];});window.__pstManufacturerTermsFlowdown=flow;applyFields(flow);render();return true;
}
function flowText(){return flow&&L(flow.text);}
function wrapPayment(){
  var bp=window.buildPayPlan;if(typeof bp==='function'&&!bp.__pstManufacturerFlowdown){
    var base=bp;var w=function(){var s=E('of-pay-preset');if(s&&s.value==='supplierflow'&&flow&&flow.paymentTerms)return[{pct:100,ev:'supplierFlow',text:flow.paymentTerms}];return base.apply(this,arguments);};w.__pstManufacturerFlowdown=true;w.__base=base;window.buildPayPlan=w;
  }
  var pt=window.payPlanText;if(typeof pt==='function'&&!pt.__pstManufacturerFlowdown){
    var baseText=pt;var tw=function(plan,l){if(A(plan).length===1&&plan[0]&&plan[0].ev==='supplierFlow'&&L(plan[0].text))return L(plan[0].text);return baseText.apply(this,arguments);};tw.__pstManufacturerFlowdown=true;tw.__base=baseText;window.payPlanText=tw;
  }
}
function wrapState(){
  var c=window.collectOfferFormState;if(typeof c==='function'&&!c.__pstManufacturerFlowdown){
    var base=c;var w=function(){var st=base.apply(this,arguments)||{};if(flow){var ta=E('pst-manufacturer-flowdown-text');if(ta)flow.text=ta.value;st.supplierTermsFlowdown=JSON.parse(JSON.stringify(flow));}return st;};w.__pstManufacturerFlowdown=true;w.__base=base;window.collectOfferFormState=w;
  }
  var a=window.applyOfferFormState;if(typeof a==='function'&&!a.__pstManufacturerFlowdown){
    var baseApply=a;var aw=function(st){var r=baseApply.apply(this,arguments);setTimeout(function(){restore(st);},0);setTimeout(function(){restore(st);},160);return r;};aw.__pstManufacturerFlowdown=true;aw.__base=baseApply;window.applyOfferFormState=aw;
  }
}
function wrapOutput(){
  var g=window.genOfer;if(typeof g!=='function'||g.__pstManufacturerFlowdown)return;
  var base=g;var w=function(){
    var note=E('of-not'),txt=flowText();if(!note||!txt)return base.apply(this,arguments);
    var original=note.value,sep=L(original)?'\n\n':'';note.value=original+sep+txt;
    try{return base.apply(this,arguments);}finally{note.value=original;}
  };w.__pstManufacturerFlowdown=true;w.__base=base;window.genOfer=w;
}
function install(){wrapPayment();wrapState();wrapOutput();paymentOption();render();}
function hydrate(){
  install();var s=E('pst-project-cost-source');if(!s||s.value===''||s.dataset.pstTermsApplied==='1')return false;var o=selectedOffer();if(!o)return false;s.dataset.pstTermsApplied='1';return applyOffer(o);
}
function schedule(){[80,180,350,700,1200].forEach(function(ms){setTimeout(hydrate,ms);});}

document.addEventListener('change',function(e){
  var t=e.target;if(!t)return;
  if(t.id==='pst-project-cost-source'){
    if(t.value===''){t.dataset.pstTermsApplied='';return;}
    var o=selectedOffer();if(o){t.dataset.pstTermsApplied='1';applyOffer(o);}
  }else if(t.id==='of-lang'&&flow){
    var oldText=flow.text,autoOld=compose({inclusions:flow.inclusions,exclusions:flow.exclusions,raw_text:'',notes:''},flow.language||'');
    flow.language=lang();
    if(!L(oldText)||oldText===autoOld)flow.text=compose({inclusions:flow.inclusions,exclusions:flow.exclusions},flow.language);
    render();
  }
},true);
document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('[data-pf2-action="offer"]'):null;if(a)schedule();},true);
document.addEventListener('pst:modules-ready',function(){install();schedule();},{once:true});
window.addEventListener('pageshow',function(){install();schedule();});
install();schedule();
window.PSTManufacturerTermsFlowdownV1={install:install,applyOffer:applyOffer,hydrate:hydrate,current:function(){return flow;},_test:{compose:compose,buildFlow:buildFlow,technicalClauses:technicalClauses}};
})();
