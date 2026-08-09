/* PRISTEEL invoice identity + project-flow bridge v1
 * Keeps Offer and Invoice as separate documents while preserving the shared visual language.
 * Narrow scope: project-flow navigation, invoice numbering/language labels, invoice-only visual accent,
 * and non-financial project-context prefill for a new outgoing invoice.
 */
(function(){
'use strict';
if(window.__pstInvoiceIdentityV1)return;
window.__pstInvoiceIdentityV1=true;
var baseFlowGoto=window.flowGoto;
var ACCENT='#4F7D73',ACCENT_SOFT='#EDF5F3',ACCENT_LINE='#BFD3CE';
function el(id){return document.getElementById(id);}
function clearDisplay(node){if(node&&node.style&&typeof node.style.removeProperty==='function')node.style.removeProperty('display');}
function text(id){var x=el(id);return String(x&&x.value||'').trim();}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function arr(v){return Array.isArray(v)?v:[];}
function setBlank(id,v){var x=el(id);if(!x||v==null||String(x.value||'').trim())return false;x.value=String(v);return true;}
function projectId(){var d=window.__pstIntegrityLastData;return String(d&&d.project&&d.project.id||window.__pstCurrentProjectId||window._curProjId||'');}
function projectLocation(p){var v=String(p&&(p.location||p.delivery_location||p.site||p.city)||'').trim();if(v)return v;var n=String(p&&p.name||'');if(/budva/i.test(n))return'Budva, Montenegro';if(/andrijevica/i.test(n))return'Andrijevica, Montenegro';return'';}
function matchingOfferSnapshot(p){
  if(!p||norm(text('of-proj'))!==norm(p.name||''))return null;
  return{ref:text('of-ref'),client:text('of-cli'),contact:text('of-con'),email:text('of-em'),address:text('of-adr'),location:text('of-loc'),lang:text('of-lang')};
}
function pickBuyerContact(ctx,p){
  var contacts=arr(ctx&&ctx.contacts),client=norm(p&&p.client),offers=arr(ctx&&ctx.supplierOffers);
  var suppliers=offers.map(function(o){return norm(o&&(o.supplier||o.supplier_name));}).filter(Boolean);
  var emails=arr(ctx&&ctx.emails);
  var ranked=contacts.map(function(c){
    var score=0,company=norm(c&&(c.company||c.client||c.organisation||c.organization)),name=norm(c&&(c.name||c.contact_name||c.person)),email=String(c&&c.email||'').toLowerCase().trim();
    if(client&&company&&(company.indexOf(client)>-1||client.indexOf(company)>-1))score+=100;
    if(email&&emails.some(function(m){return String(m&&m.from_email||'').toLowerCase().trim()===email;}))score+=20;
    if(suppliers.some(function(s){return (company&&company.indexOf(s)>-1)||(name&&name.indexOf(s)>-1);}))score-=120;
    return{contact:c,score:score};
  }).sort(function(a,b){return b.score-a.score;});
  return ranked.length&&ranked[0].score>0?ranked[0].contact:null;
}
function emailTextForContact(ctx,c){
  var email=String(c&&c.email||'').toLowerCase().trim(),name=norm(c&&(c.name||c.contact_name||c.person));
  return arr(ctx&&ctx.emails).filter(function(m){
    var from=String(m&&m.from_email||'').toLowerCase().trim(),fromName=norm(m&&m.from_name);
    return (email&&from===email)||(name&&fromName.indexOf(name)>-1);
  }).map(function(m){return String(m&&(m.body_text||m.body||m.text||m.snippet)||'');}).join('\n');
}
function inferLang(ctx,c){
  var t=' '+emailTextForContact(ctx,c).toLowerCase()+' ',s={sr:0,de:0,sq:0,en:0};
  [/poštovani/g,/ponud[au]/g,/isporuk/g,/izrad/g,/prilog/g,/poštovanjem/g,/zahtjev/g,/zahtev/g,/čelič/g].forEach(function(r){if(r.test(t))s.sr++;});
  [/sehr geehrte/g,/angebot/g,/lieferung/g,/mit freundlichen/g,/anfrage/g,/bitte/g].forEach(function(r){if(r.test(t))s.de++;});
  [/përshënd/g,/pershendet/g,/ju lutem/g,/çmim/g,/cmim/g,/bashk[ëe]ngjit/g,/furnizim/g].forEach(function(r){if(r.test(t))s.sq++;});
  [/dear /g,/please /g,/quotation/g,/kind regards/g,/delivery/g,/request for/g].forEach(function(r){if(r.test(t))s.en++;});
  var k=Object.keys(s).sort(function(a,b){return s[b]-s[a];})[0];return s[k]>=2?k:'';
}
function quietProjectSelect(id){
  var s=el('iv-proj-select');if(!s||!id)return false;
  var hit=Array.prototype.some.call(s.options||[],function(o){return String(o.value)===String(id);});
  if(!hit)return false;s.value=String(id);return true;
}
async function prefillProjectContext(){
  var id=projectId();if(!id)return false;
  var fresh=!text('iv-proj')&&!text('iv-cli')&&!text('iv-con')&&!text('iv-em');
  if(!fresh){quietProjectSelect(id);return false;}
  var ctx=window.__pstIntegrityLastData||null,p=ctx&&ctx.project;
  if(!p||String(p.id)!==id){
    p=null;
    if(typeof window.supaFetch==='function'){
      try{var rows=await window.supaFetch('projects?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');p=arr(rows)[0]||null;}catch(e){}
    }
  }
  if(!p)return false;
  var snap=matchingOfferSnapshot(p),contact=pickBuyerContact(ctx,p);
  setBlank('iv-proj',p.name||'');
  setBlank('iv-ref',p.ref||p.reference||(snap&&snap.ref)||'');
  setBlank('iv-cli',p.client||(snap&&snap.client)||'');
  setBlank('iv-loc',projectLocation(p)||(snap&&snap.location)||'');
  if(contact){setBlank('iv-con',contact.name||contact.contact_name||contact.person||'');setBlank('iv-em',contact.email||'');setBlank('iv-adr',contact.address||contact.full_address||'');}
  if(snap){setBlank('iv-con',snap.contact);setBlank('iv-em',snap.email);setBlank('iv-adr',snap.address);}
  var lang=(snap&&snap.lang)||inferLang(ctx,contact);if(lang&&el('iv-lang'))el('iv-lang').value=lang;
  quietProjectSelect(id);return true;
}
function scheduleProjectPrefill(){[60,180,420].forEach(function(ms){setTimeout(function(){prefillProjectContext().catch(function(){});},ms);});}
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
function seqFromNr(v,year){var s=String(v||'').trim();if(!s||s.indexOf('PST-INV-'+year+'-')!==0)return 0;var m=s.match(/-(\d{1,6})$/);return m?(parseInt(m[1],10)||0):0;}
async function nextInvoiceNr(){
  var d=new Date(),year=d.getFullYear(),month=String(d.getMonth()+1).padStart(2,'0'),max=0;
  if(typeof window.supaFetch==='function'){
    try{var reg=await window.supaFetch('documents_registry?series=eq.INV&year=eq.'+year+'&select=seq,doc_nr&order=seq.desc&limit=200');(Array.isArray(reg)?reg:[]).forEach(function(r){max=Math.max(max,parseInt(r&&r.seq,10)||0,seqFromNr(r&&r.doc_nr,year));});}catch(e){}
    try{var inv=await window.supaFetch('invoices_out?select=invoice_nr,created_at&order=created_at.desc&limit=1000');(Array.isArray(inv)?inv:[]).forEach(function(r){max=Math.max(max,seqFromNr(r&&r.invoice_nr,year));});}catch(e){}
  }
  var floor=year===2026?3:1,seq=Math.max(max+1,floor);
  return{nr:'PST-INV-'+year+'-'+month+'-'+String(seq).padStart(3,'0'),seq:seq,year:year,month:month};
}
function autoNumber(v){return !String(v||'').trim()||/^PST-INV-\d{4}-\d{3}$/i.test(String(v||'').trim());}
async function fillInvoiceNr(){var f=el('iv-nr');if(!f||!autoNumber(f.value))return f&&f.value||'';var x=await nextInvoiceNr();if(autoNumber(f.value))f.value=x.nr;return f.value;}
function syncPair(page){
  var offer=el('page-oferta'),invoice=el('page-invoices');clearDisplay(offer);clearDisplay(invoice);
  if(typeof window.showPage==='function')window.showPage(page);else if(typeof baseFlowGoto==='function')baseFlowGoto(page);
  clearDisplay(offer);clearDisplay(invoice);
  if(page==='invoices'){try{if(typeof window.invSwitchTab==='function')window.invSwitchTab('out');}catch(e){}fillInvoiceNr().catch(function(){});scheduleProjectPrefill();}
}
function normColor(v){return String(v||'').toLowerCase().replace(/\s+/g,'');}
function isOldAccent(v){var x=normColor(v);return x==='#b87333'||x==='rgb(184,115,51)'||x==='rgba(184,115,51,1)';}
function recolorInvoice(root){
  if(!root||!root.querySelectorAll)return;
  Array.prototype.forEach.call(root.querySelectorAll('*'),function(node){var s=node.style;if(!s)return;if(isOldAccent(s.color))s.color=ACCENT;if(isOldAccent(s.borderTopColor))s.borderTopColor=ACCENT;if(isOldAccent(s.borderBottomColor))s.borderBottomColor=ACCENT;if(isOldAccent(s.borderLeftColor))s.borderLeftColor=ACCENT;if(isOldAccent(s.borderRightColor))s.borderRightColor=ACCENT;});
}
function applyInvoiceAccent(){
  var preview=el('iv-preview');if(!preview||!preview.firstElementChild)return false;recolorInvoice(preview);
  var root=preview.firstElementChild,header=root&&root.firstElementChild;
  if(header){header.style.borderBottomColor=ACCENT;var right=header.lastElementChild;if(right&&right!==header.firstElementChild){var title=right.firstElementChild,nr=right.children&&right.children[1];if(title){title.style.color=ACCENT;title.style.backgroundColor=ACCENT_SOFT;title.style.border='1px solid '+ACCENT_LINE;title.style.borderRadius='5px';title.style.padding='5px 10px';title.style.display='inline-block';}if(nr)nr.style.color=ACCENT;}}
  preview.setAttribute('data-pst-invoice-accent','petrol');return true;
}
function wrapInvoiceGenerator(){var fn=window.genInvoiceOut;if(typeof fn!=='function'||fn.__pstInvoiceVisualAccent)return false;var wrapped=function(){var out=fn.apply(this,arguments);applyInvoiceAccent();return out;};wrapped.__pstInvoiceVisualAccent=true;wrapped.__base=fn;window.genInvoiceOut=wrapped;return true;}
function install(){patchLabels();wrapInvoiceGenerator();applyInvoiceAccent();}
window.flowGoto=function(page){page=String(page||'');if(page==='invoices'||page==='oferta')return syncPair(page);if(typeof baseFlowGoto==='function')return baseFlowGoto.apply(this,arguments);if(typeof window.showPage==='function')return window.showPage(page);};
install();
document.addEventListener&&document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTInvoiceIdentityV1={patchLabels:patchLabels,nextInvoiceNr:nextInvoiceNr,fillInvoiceNr:fillInvoiceNr,syncPair:syncPair,seqFromNr:seqFromNr,applyInvoiceAccent:applyInvoiceAccent,prefillProjectContext:prefillProjectContext,accent:ACCENT};
})();
