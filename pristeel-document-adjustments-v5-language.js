/* PRISTEEL credit/debit notes v5: SQ, EN, DE, SR */
(function(){
'use strict';
if(window.__pstDocumentAdjustmentsV5LanguageLoaded)return;
window.__pstDocumentAdjustmentsV5LanguageLoaded=true;

var currentType='credit_note';
var installedOpen=false,installedSave=false,installedDetail=false;
var LANGS=['sq','en','de','sr'];
var T={
 sq:{name:'Shqip',credit:'Notë Kreditore',debit:'Notë Debitore',newDoc:'e re',creditSub:'Dokumenti ia ul blerësit shumën për pagesë. Fatura origjinale mbetet e pandryshuar.',debitSub:'Dokumenti ia rrit blerësit shumën për pagesë. Fatura origjinale mbetet e pandryshuar.',number:'Numri',date:'Data',language:'Gjuha',invoice:'Fatura origjinale',method:'Metoda e llogaritjes',weight:'Sipas peshës reale',manual:'Korrigjim manual',reason:'Arsyeja',currency:'Valuta',mode:'Lloji i korrigjimit',gross:'Shuma bruto',explanation:'Shpjegimi',partial:'I pjesshëm',full:'I plotë',quantity:'Diferencë peshe / sasie',price:'Korrigjim çmimi',error:'Gabim në faturë',returned:'Mall i kthyer',discount:'Zbritje e mëvonshme',additional:'Kosto/shtesë e mëvonshme',other:'Tjetër',cancel:'Anulo',save:'Ruaj',description:'Përshkrimi',billed:'Kg faturuar',actual:'Pesha reale',difference:'Diferenca',priceKg:'Çmimi/kg',netValue:'Vlera neto',net:'Neto',vat:'TVSH',total:'Totali',buyer:'Blerësi',project:'Projekti',reasonTitle:'ARSYEJA',originalInvoice:'Fatura origjinale',print:'PDF / Printo',close:'Mbyll',unchanged:'Ky dokument korrigjon faturën {invoice}; fatura origjinale mbetet e pandryshuar.',autoCredit:'Fatura përfshinte {billed} kg për “{desc}” me {price} EUR/kg; pesha reale e verifikuar është {actual} kg. Diferenca për kreditim: {diff} kg = {amount} EUR neto.',autoDebit:'Fatura përfshinte {billed} kg për “{desc}” me {price} EUR/kg; pesha reale e verifikuar është {actual} kg. Diferenca për debitimin shtesë: {diff} kg = {amount} EUR neto.',placeholder:'Shpjegimi krijohet automatikisht nga pesha dhe çmimi; mund ta ndryshosh.',recoveryTitle:'Plotëso të dhënat e peshës së faturës',recoveryText:'Kjo faturë e vjetër nuk i ka ruajtur pozicionet në regjistër. Plotëso këto fusha një herë dhe sistemi vazhdon me llogaritjen automatike.',useWeight:'Llogarit sipas peshës'},
 en:{name:'English',credit:'Credit Note',debit:'Debit Note',newDoc:'',creditSub:'This document reduces the amount payable by the buyer. The original invoice remains unchanged.',debitSub:'This document increases the amount payable by the buyer. The original invoice remains unchanged.',number:'Number',date:'Date',language:'Language',invoice:'Original invoice',method:'Calculation method',weight:'Based on actual weight',manual:'Manual adjustment',reason:'Reason',currency:'Currency',mode:'Adjustment type',gross:'Gross amount',explanation:'Explanation',partial:'Partial',full:'Full',quantity:'Weight / quantity difference',price:'Price correction',error:'Invoice error',returned:'Returned goods',discount:'Subsequent discount',additional:'Subsequent additional cost',other:'Other',cancel:'Cancel',save:'Save',description:'Description',billed:'Invoiced kg',actual:'Actual weight',difference:'Difference',priceKg:'Price/kg',netValue:'Net value',net:'Net',vat:'VAT',total:'Total',buyer:'Buyer',project:'Project',reasonTitle:'REASON',originalInvoice:'Original invoice',print:'PDF / Print',close:'Close',unchanged:'This document adjusts invoice {invoice}; the original invoice remains unchanged.',autoCredit:'The invoice included {billed} kg for “{desc}” at {price} EUR/kg; the verified actual weight is {actual} kg. Difference to be credited: {diff} kg = {amount} EUR net.',autoDebit:'The invoice included {billed} kg for “{desc}” at {price} EUR/kg; the verified actual weight is {actual} kg. Additional difference to be debited: {diff} kg = {amount} EUR net.',placeholder:'The explanation is generated automatically from the weight and price; it can be edited.',recoveryTitle:'Enter the invoice weight details',recoveryText:'This older invoice does not contain saved line items. Enter these values once and the system will continue with the automatic calculation.',useWeight:'Calculate by weight'},
 de:{name:'Deutsch',credit:'Gutschrift',debit:'Belastungsanzeige',newDoc:'neu',creditSub:'Dieses Dokument reduziert den vom Käufer zu zahlenden Betrag. Die ursprüngliche Rechnung bleibt unverändert.',debitSub:'Dieses Dokument erhöht den vom Käufer zu zahlenden Betrag. Die ursprüngliche Rechnung bleibt unverändert.',number:'Nummer',date:'Datum',language:'Sprache',invoice:'Ursprüngliche Rechnung',method:'Berechnungsmethode',weight:'Nach tatsächlichem Gewicht',manual:'Manuelle Korrektur',reason:'Grund',currency:'Währung',mode:'Art der Korrektur',gross:'Bruttobetrag',explanation:'Erläuterung',partial:'Teilweise',full:'Vollständig',quantity:'Gewichts- / Mengendifferenz',price:'Preiskorrektur',error:'Rechnungsfehler',returned:'Warenrückgabe',discount:'Nachträglicher Rabatt',additional:'Nachträgliche Zusatzkosten',other:'Sonstiges',cancel:'Abbrechen',save:'Speichern',description:'Beschreibung',billed:'Berechnete kg',actual:'Tatsächliches Gewicht',difference:'Differenz',priceKg:'Preis/kg',netValue:'Nettowert',net:'Netto',vat:'MwSt.',total:'Gesamt',buyer:'Käufer',project:'Projekt',reasonTitle:'GRUND',originalInvoice:'Ursprüngliche Rechnung',print:'PDF / Drucken',close:'Schließen',unchanged:'Dieses Dokument korrigiert die Rechnung {invoice}; die ursprüngliche Rechnung bleibt unverändert.',autoCredit:'Die Rechnung enthielt {billed} kg für „{desc}“ zu {price} EUR/kg; das geprüfte tatsächliche Gewicht beträgt {actual} kg. Gutzuschreibende Differenz: {diff} kg = {amount} EUR netto.',autoDebit:'Die Rechnung enthielt {billed} kg für „{desc}“ zu {price} EUR/kg; das geprüfte tatsächliche Gewicht beträgt {actual} kg. Nachzubelastende Differenz: {diff} kg = {amount} EUR netto.',placeholder:'Die Erläuterung wird automatisch aus Gewicht und Preis erstellt und kann bearbeitet werden.',recoveryTitle:'Gewichtsdaten der Rechnung ergänzen',recoveryText:'Bei dieser älteren Rechnung wurden keine Positionen gespeichert. Ergänzen Sie diese Werte einmalig; anschließend erfolgt die Berechnung automatisch.',useWeight:'Nach Gewicht berechnen'},
 sr:{name:'Srpski',credit:'Knjižno odobrenje',debit:'Knjižno zaduženje',newDoc:'novo',creditSub:'Ovaj dokument umanjuje iznos koji kupac treba da plati. Originalna faktura ostaje neizmenjena.',debitSub:'Ovaj dokument uvećava iznos koji kupac treba da plati. Originalna faktura ostaje neizmenjena.',number:'Broj',date:'Datum',language:'Jezik',invoice:'Originalna faktura',method:'Metod obračuna',weight:'Prema stvarnoj težini',manual:'Ručna korekcija',reason:'Razlog',currency:'Valuta',mode:'Vrsta korekcije',gross:'Bruto iznos',explanation:'Obrazloženje',partial:'Delimično',full:'Potpuno',quantity:'Razlika u težini / količini',price:'Korekcija cene',error:'Greška na fakturi',returned:'Vraćena roba',discount:'Naknadni popust',additional:'Naknadni dodatni trošak',other:'Drugo',cancel:'Otkaži',save:'Sačuvaj',description:'Opis',billed:'Fakturisani kg',actual:'Stvarna težina',difference:'Razlika',priceKg:'Cena/kg',netValue:'Neto vrednost',net:'Neto',vat:'PDV',total:'Ukupno',buyer:'Kupac',project:'Projekat',reasonTitle:'RAZLOG',originalInvoice:'Originalna faktura',print:'PDF / Štampa',close:'Zatvori',unchanged:'Ovaj dokument koriguje fakturu {invoice}; originalna faktura ostaje neizmenjena.',autoCredit:'Faktura je obuhvatala {billed} kg za „{desc}“ po ceni od {price} EUR/kg; proverena stvarna težina iznosi {actual} kg. Razlika za odobrenje: {diff} kg = {amount} EUR neto.',autoDebit:'Faktura je obuhvatala {billed} kg za „{desc}“ po ceni od {price} EUR/kg; proverena stvarna težina iznosi {actual} kg. Dodatna razlika za zaduženje: {diff} kg = {amount} EUR neto.',placeholder:'Obrazloženje se automatski kreira na osnovu težine i cene i može se izmeniti.',recoveryTitle:'Unesite podatke o težini sa fakture',recoveryText:'Ova starija faktura nema sačuvane stavke. Unesite ove vrednosti jednom i sistem će nastaviti automatski obračun.',useWeight:'Obračunaj prema težini'}
};

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function parse(v){for(var i=0;i<4&&typeof v==='string';i++){if(!v.trim())return null;try{v=JSON.parse(v);}catch(e){break;}}return v;}
function list(v){v=parse(v);if(Array.isArray(v))return v;if(v&&typeof v==='object'){var x=v.items||v.positions||v.line_items||v.invoice_items||v.rows;if(x&&x!==v)return list(x);}return[];}
function num(v){if(v==null||v==='')return 0;var s=String(v).trim().replace(/[^0-9,\.\-]/g,'');if(s.indexOf(',')>-1&&s.indexOf('.')>-1){if(s.lastIndexOf(',')>s.lastIndexOf('.'))s=s.replace(/\./g,'').replace(',','.');else s=s.replace(/,/g,'');}else if(s.indexOf(',')>-1)s=s.replace(/\./g,'').replace(',','.');var n=parseFloat(s);return isFinite(n)?n:0;}
function locale(l){return l==='de'?'de-DE':l==='en'?'en-GB':l==='sr'?'sr-Latn-RS':'sq-AL';}
function fmt(v,l,d){return Number(v||0).toLocaleString(locale(l),{minimumFractionDigits:d,maximumFractionDigits:d});}
function money(v,c,l){return Number(v||0).toLocaleString(locale(l),{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function dateText(v,l){if(!v)return'—';var d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d.getTime())?String(v):d.toLocaleDateString(locale(l));}
function tr(){return T[getLang()]||T.de;}
function getLang(){var e=document.getElementById('pst-adj-language');return e&&LANGS.indexOf(e.value)>-1?e.value:'de';}
function normalizeLang(v){v=String(v||'').toLowerCase();if(v.indexOf('de')===0||v.indexOf('germ')>-1||v.indexOf('deutsch')>-1)return'de';if(v.indexOf('en')===0||v.indexOf('engl')>-1)return'en';if(v.indexOf('sr')===0||v.indexOf('serb')>-1)return'sr';if(v.indexOf('sq')===0||v.indexOf('alb')>-1||v.indexOf('shq')>-1)return'sq';return'';}
function recordLang(r){var m=String(r&&r.notes||'').match(/\[lang:(sq|en|de|sr)\]/i);return m?m[1].toLowerCase():'sq';}
function selectedInvoice(){var D=window.PST_DOC_CENTER||{},id=String((document.getElementById('pst-adj-invoice')||{}).value||'');return (Array.isArray(D.invoices)?D.invoices:[]).filter(function(r){return String(r.id)===id;})[0]||null;}
function defaultLang(){var r=selectedInvoice(),x=normalizeLang(r&&(r.lang||r.language||r.document_language));if(x)return x;try{x=normalizeLang(localStorage.getItem('pst_document_language'));}catch(e){}return x||'de';}
function setLabel(id,text){var e=document.getElementById(id);if(!e)return;var f=e.closest('.pst-adj-field');var l=f&&f.querySelector('label');if(l)l.textContent=text;}
function setOption(selectId,value,text){var s=document.getElementById(selectId);if(!s)return;Array.prototype.forEach.call(s.options,function(o){if(o.value===value)o.textContent=text;});}
function replaceVars(t,v){return t.replace(/\{(\w+)\}/g,function(_,k){return v[k]==null?'':v[k];});}

function injectLanguage(){
 var modal=document.getElementById('pst-adj-bg');if(!modal)return false;
 var grid=modal.querySelector('.pst-adj-body .pst-adj-grid');if(!grid)return false;
 if(!document.getElementById('pst-adj-language')){
   var field=document.createElement('div');field.className='pst-adj-field';field.id='pst-adj-language-field';
   field.innerHTML='<label>Gjuha</label><select id="pst-adj-language">'+LANGS.map(function(l){return'<option value="'+l+'">'+T[l].name+'</option>';}).join('')+'</select>';
   var date=document.getElementById('pst-adj-date'),dateField=date&&date.closest('.pst-adj-field');
   if(dateField&&dateField.nextSibling)grid.insertBefore(field,dateField.nextSibling);else grid.insertBefore(field,grid.firstChild);
   var sel=document.getElementById('pst-adj-language');sel.value=defaultLang();
   sel.addEventListener('change',function(){try{localStorage.setItem('pst_document_language',sel.value);}catch(e){}translateModal();updateAutoReason(true);});
 }
 translateModal();bindModal();return true;
}
function translateRecovery(d){
 var box=document.getElementById('pst-adj-v4-recovery');if(!box)return;
 var divs=box.querySelectorAll('div');if(divs[0])divs[0].textContent=d.recoveryTitle;if(divs[1])divs[1].textContent=d.recoveryText;
 var labels=box.querySelectorAll('label');var txt=[d.description,d.billed,d.actual,d.priceKg];Array.prototype.forEach.call(labels,function(l,i){var input=l.querySelector('input');if(input){while(l.firstChild&&l.firstChild!==input)l.removeChild(l.firstChild);l.insertBefore(document.createTextNode((txt[i]||'')+' '),input);}});
 var b=box.querySelector('button');if(b)b.textContent=d.useWeight;
}
function translateModal(){
 var d=tr(),modal=document.getElementById('pst-adj-bg');if(!modal)return;
 var h=modal.querySelector('.pst-adj-hd h3'),p=modal.querySelector('.pst-adj-hd p');
 if(h)h.textContent=(currentType==='credit_note'?d.credit:d.debit)+(d.newDoc?' '+d.newDoc:'');
 if(p)p.textContent=currentType==='credit_note'?d.creditSub:d.debitSub;
 setLabel('pst-adj-nr',d.number);setLabel('pst-adj-date',d.date);setLabel('pst-adj-language',d.language);setLabel('pst-adj-invoice',d.invoice);setLabel('pst-adj-method',d.method);setLabel('pst-adj-reason',d.reason);setLabel('pst-adj-currency',d.currency);setLabel('pst-adj-mode',d.mode);setLabel('pst-adj-amount',d.gross);setLabel('pst-adj-reason-text',d.explanation);
 setOption('pst-adj-method','weight',d.weight);setOption('pst-adj-method','manual',d.manual);setOption('pst-adj-mode','partial',d.partial);setOption('pst-adj-mode','full',d.full);setOption('pst-adj-reason','quantity_correction',d.quantity);setOption('pst-adj-reason','price_correction',d.price);setOption('pst-adj-reason','invoice_error',d.error);setOption('pst-adj-reason','returned_goods',d.returned);setOption('pst-adj-reason','discount',d.discount);setOption('pst-adj-reason','additional_charge',d.additional);setOption('pst-adj-reason','other',d.other);
 var ta=document.getElementById('pst-adj-reason-text');if(ta)ta.placeholder=d.placeholder;
 var th=modal.querySelectorAll('#pst-adj-v3-lines th');var heads=[d.description,d.billed,d.actual,d.difference,d.priceKg,d.netValue];Array.prototype.forEach.call(th,function(x,i){if(heads[i])x.textContent=heads[i];});
 var ft=modal.querySelectorAll('.pst-adj-ft button');if(ft[0])ft[0].textContent=d.cancel;if(ft[1])ft[1].textContent=d.save+' '+(currentType==='credit_note'?d.credit:d.debit);
 translateRecovery(d);
}
function rows(){return Array.prototype.slice.call(document.querySelectorAll('tr[id^="pst-adj-v3-row-"]'));}
function explanation(){
 var l=getLang(),d=T[l],credit=currentType==='credit_note',parts=[];
 rows().forEach(function(row){
  var cells=row.querySelectorAll('td'),inputs=row.querySelectorAll('input[type="number"]');if(cells.length<6||inputs.length<2)return;
  var desc=(cells[0].textContent||'').trim(),billed=num(cells[1].textContent),actual=num(inputs[0].value),price=num(inputs[1].value),diff=credit?billed-actual:actual-billed;
  if(diff<=0||price<=0)return;
  parts.push(replaceVars(credit?d.autoCredit:d.autoDebit,{desc:desc,billed:fmt(billed,l,3),actual:fmt(actual,l,3),price:fmt(price,l,2),diff:fmt(diff,l,3),amount:fmt(diff*price,l,2)}));
 });
 return parts.join('\n');
}
function updateAutoReason(force){var ta=document.getElementById('pst-adj-reason-text');if(!ta)return;var method=document.getElementById('pst-adj-method');if(method&&method.value!=='weight')return;if(force||ta.dataset.auto==='1'||!ta.value.trim()){ta.value=explanation();ta.dataset.auto='1';}}
function bindModal(){
 var modal=document.getElementById('pst-adj-bg');if(!modal||modal.__pstLangBound)return;modal.__pstLangBound=true;
 modal.addEventListener('input',function(e){if(e.target&&e.target.id==='pst-adj-reason-text')return;setTimeout(function(){translateModal();updateAutoReason(false);},0);},true);
 modal.addEventListener('change',function(e){if(e.target&&e.target.id==='pst-adj-invoice'){var s=document.getElementById('pst-adj-language');if(s&&!s.dataset.user){s.value=defaultLang();}setTimeout(function(){translateModal();updateAutoReason(true);},40);}else setTimeout(function(){translateModal();updateAutoReason(false);},0);},true);
 var obs=new MutationObserver(function(){translateModal();});obs.observe(modal,{childList:true,subtree:true});
}

function installOpen(){
 var base=window.pstOpenAdjustment;if(typeof base!=='function'||base.__pstLanguageWrapped)return false;
 window.pstOpenAdjustment=async function(type,invoiceId){currentType=type||'credit_note';var r=await base.apply(this,arguments);setTimeout(injectLanguage,20);setTimeout(injectLanguage,120);return r;};
 window.pstOpenAdjustment.__pstLanguageWrapped=true;window.pstOpenAdjustment.__pstBase=base;installedOpen=true;return true;
}
function installSave(){
 var base=window.pstSaveAdjustment;if(typeof base!=='function'||base.__pstLanguageWrapped)return false;
 window.pstSaveAdjustment=async function(type){
  currentType=type||currentType;updateAutoReason(false);var l=getLang();try{localStorage.setItem('pst_document_language',l);}catch(e){}
  var real=window.supaFetch;
  if(typeof real!=='function')return base.apply(this,arguments);
  window.supaFetch=async function(path,method,body){
   if(path==='commercial_adjustments'&&String(method||'').toUpperCase()==='POST'&&body&&typeof body==='object'){
    var clean=String(body.notes||'').replace(/\[lang:(sq|en|de|sr)\]\s*/ig,'').trim();body.notes='[lang:'+l+'] '+clean;
    if(Array.isArray(body.items))body.items=body.items.map(function(x){var y={};Object.keys(x||{}).forEach(function(k){y[k]=x[k];});y.document_language=l;return y;});
    var ta=document.getElementById('pst-adj-reason-text');if(ta)body.reason_text=ta.value.trim();
   }
   return real.apply(window,arguments);
  };
  try{return await base.apply(this,arguments);}finally{window.supaFetch=real;}
 };
 window.pstSaveAdjustment.__pstLanguageWrapped=true;window.pstSaveAdjustment.__pstBase=base;installedSave=true;return true;
}

function reasonName(code,l){var d=T[l];return({invoice_error:d.error,price_correction:d.price,quantity_correction:d.quantity,returned_goods:d.returned,discount:d.discount,additional_charge:d.additional,other:d.other})[code]||code||'';}
function detailItems(r,l){var d=T[l],items=list(r.items);if(!items.length)return'';return '<table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:11px"><thead><tr style="background:#F3F8FA"><th style="padding:8px;text-align:left">'+esc(d.description)+'</th><th style="padding:8px;text-align:right">'+esc(d.billed)+'</th><th style="padding:8px;text-align:right">'+esc(d.actual)+'</th><th style="padding:8px;text-align:right">'+esc(d.difference)+'</th><th style="padding:8px;text-align:right">'+esc(d.priceKg)+'</th><th style="padding:8px;text-align:right">'+esc(d.netValue)+'</th></tr></thead><tbody>'+items.map(function(x){return '<tr><td style="padding:8px;border-bottom:1px solid #E3E8EA">'+esc(x.desc||d.description)+'</td><td style="padding:8px;border-bottom:1px solid #E3E8EA;text-align:right">'+fmt(num(x.original_kg),l,3)+'</td><td style="padding:8px;border-bottom:1px solid #E3E8EA;text-align:right">'+fmt(num(x.actual_kg),l,3)+'</td><td style="padding:8px;border-bottom:1px solid #E3E8EA;text-align:right">'+fmt(num(x.delta_kg),l,3)+'</td><td style="padding:8px;border-bottom:1px solid #E3E8EA;text-align:right">'+money(num(x.price_kg),r.currency,l)+'</td><td style="padding:8px;border-bottom:1px solid #E3E8EA;text-align:right">'+money(num(x.net_amount),r.currency,l)+'</td></tr>';}).join('')+'</tbody></table>';}
function detailHtml(r){
 var l=recordLang(r),d=T[l],credit=r.document_type==='credit_note',title=credit?d.credit.toUpperCase():d.debit.toUpperCase(),sign=credit?'−':'+';
 return '<div style="font-family:Arial,sans-serif;color:#222;padding:28px;max-width:900px;margin:auto"><div style="display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #5B9BB3;padding-bottom:16px"><div><div style="font-size:22px;font-weight:800;color:#326F87">PRISTEEL</div><div style="font-size:11px;color:#777;margin-top:3px">Rr. Tringë Smajli nr. 16, 10000 Prishtinë, Kosovë</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:800">'+esc(title)+'</div><div style="font-size:12px;margin-top:5px">'+esc(r.document_nr)+'</div><div style="font-size:11px;color:#666">'+dateText(r.document_date,l)+'</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px"><div><div style="font-size:9px;color:#777;text-transform:uppercase">'+esc(d.buyer)+'</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+esc(r.client)+'</div><div style="font-size:11px;margin-top:4px">'+esc(r.address||'')+'</div><div style="font-size:11px">'+esc(r.contact||'')+'</div></div><div><div style="font-size:9px;color:#777;text-transform:uppercase">'+esc(d.originalInvoice)+'</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+esc(r.original_invoice_nr)+'</div><div style="font-size:11px;margin-top:4px">'+esc(d.project)+': '+esc(r.project||'')+'</div></div></div><div style="margin-top:24px;border:1px solid #DCE5E8;border-radius:8px;overflow:hidden"><div style="background:#F3F8FA;padding:10px 12px;font-size:10px;font-weight:700">'+esc(d.reasonTitle)+'</div><div style="padding:13px 12px;font-size:12px"><b>'+esc(reasonName(r.reason_code,l))+'</b><div style="margin-top:5px;line-height:1.5;white-space:pre-line">'+esc(r.reason_text)+'</div></div></div>'+detailItems(r,l)+'<table style="width:100%;border-collapse:collapse;margin-top:22px"><tr><td style="padding:8px;border-bottom:1px solid #DDD">'+esc(d.net)+'</td><td style="padding:8px;border-bottom:1px solid #DDD;text-align:right">'+sign+money(r.net_amount,r.currency,l)+'</td></tr><tr><td style="padding:8px;border-bottom:1px solid #DDD">'+esc(d.vat)+' '+num(r.vat_rate)+'%</td><td style="padding:8px;border-bottom:1px solid #DDD;text-align:right">'+sign+money(r.vat_amount,r.currency,l)+'</td></tr><tr><td style="padding:11px 8px;font-size:15px;font-weight:800">'+esc(d.total.toUpperCase())+'</td><td style="padding:11px 8px;text-align:right;font-size:15px;font-weight:800;color:'+(credit?'#2F7657':'#A65F2E')+'">'+sign+money(r.gross_amount,r.currency,l)+'</td></tr></table><div style="font-size:10px;color:#777;margin-top:30px">'+esc(replaceVars(d.unchanged,{invoice:r.original_invoice_nr||''}))+'</div></div>';
}
function installDetail(){
 if(installedDetail)return true;
 window.pstOpenAdjustmentDetail=function(r){
  var old=document.getElementById('pst-adj-bg');if(old)old.remove();var l=recordLang(r),d=T[l],D=window.PST_DOC_CENTER||{};
  var bg=document.createElement('div');bg.className='pst-adj-bg';bg.id='pst-adj-bg';bg.onclick=function(e){if(e.target===bg)bg.remove();};
  bg.innerHTML='<div class="pst-adj-modal" style="width:min(1040px,97vw)"><div class="pst-adj-hd"><div><h3>'+esc((r.document_type==='credit_note'?d.credit:d.debit)+' '+(r.document_nr||''))+'</h3><p>'+esc(d.originalInvoice)+' '+esc(r.original_invoice_nr||'')+'</p></div><button class="pst-adj-x" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+((D.icons&&D.icons.close)||'×')+'</button></div><div class="pst-adj-body">'+detailHtml(r)+'</div><div class="pst-adj-ft"><button class="pst-adj-btn" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+esc(d.close)+'</button><button class="pst-adj-btn primary" onclick="pstPrintAdjustment(\''+esc(r.id)+'\')">'+esc(d.print)+'</button></div></div>';
  document.body.appendChild(bg);
 };
 window.pstPrintAdjustment=function(id){var D=window.PST_DOC_CENTER||{},r=(Array.isArray(D.adjustments)?D.adjustments:[]).filter(function(x){return String(x.id)===String(id);})[0];if(!r)return;var l=recordLang(r),html=detailHtml(r),fn=(r.document_nr||'Dokument')+'-'+l+'.pdf';if(typeof window.pstExportPdf==='function')window.pstExportPdf(html,fn);else{var w=window.open('','_blank');w.document.write('<html><body>'+html+'</body></html>');w.document.close();w.print();}};
 installedDetail=true;return true;
}

function install(){if(!installedOpen)installOpen();if(!installedSave)installSave();installDetail();}
var tries=0,timer=setInterval(function(){install();if(installedOpen&&installedSave&&installedDetail&&++tries>20)clearInterval(timer);else if(++tries>240)clearInterval(timer);},100);
install();
})();
