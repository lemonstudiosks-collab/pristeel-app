/* PRISTEEL document currency v1
 * Additive currency layer for our quotations and outgoing invoices.
 * Existing document builders remain manual-first and EUR remains the default.
 * Foreign-currency documents keep their original amount while EUR reporting uses
 * an explicit exchange rate (1 document currency = ? EUR). No silent FX guessing.
 */
(function(){
'use strict';
if(window.__pstDocumentCurrencyV1)return;
window.__pstDocumentCurrencyV1=true;

var CURS=['EUR','USD','CHF','GBP'];
var installed={};
function el(id){return document.getElementById(id);}
function text(v){return String(v==null?'':v).trim();}
function num(v){var n=parseFloat(v);return isFinite(n)?n:0;}
function cur(v){v=text(v).toUpperCase();return CURS.indexOf(v)>=0?v:'EUR';}
function fmt(v){return num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2});}
function offerCurrency(){return cur((el('pst-of-currency')||{}).value||'EUR');}
function invoiceCurrency(){return cur((el('pst-iv-currency')||{}).value||'EUR');}
function offerRate(){var c=offerCurrency();return c==='EUR'?1:num((el('pst-of-fx')||{}).value)||0;}
function invoiceRate(){var c=invoiceCurrency();return c==='EUR'?1:num((el('pst-iv-fx')||{}).value)||0;}
function toEur(amount,currency,rate){var a=num(amount),c=cur(currency),r=c==='EUR'?1:num(rate);return c==='EUR'?a:(r>0?a*r:null);}
function fieldLabel(id,value){var x=el(id),box=x&&x.closest('div'),l=box&&box.querySelector('label');if(l)l.textContent=value;}
function optionHtml(selected){return CURS.map(function(c){return'<option value="'+c+'"'+(c===selected?' selected':'')+'>'+c+'</option>';}).join('');}
function rateVisibility(kind){
  var c=kind==='offer'?offerCurrency():invoiceCurrency();
  var fx=el(kind==='offer'?'pst-of-fx-wrap':'pst-iv-fx-wrap');
  var inp=el(kind==='offer'?'pst-of-fx':'pst-iv-fx');
  if(fx)fx.style.display=c==='EUR'?'none':'';
  if(inp&&c==='EUR')inp.value='1';
}
function refreshLabels(){
  var c=offerCurrency();
  fieldLabel('of-pr','Çmimi '+c+'/kg');fieldLabel('of-zn','Zinktimi '+c+'/kg (ops.)');fieldLabel('of-tr','Transporti '+c+' total (ops.)');
  var sum=el('ofp-sum');if(sum)sum.textContent=sum.textContent.replace(/\s(?:EUR|USD|CHF|GBP)\s*$/,' '+c);
  var ic=invoiceCurrency(),tbl=el('iv-items-tbl');
  if(tbl){[].slice.call(tbl.querySelectorAll('th')).forEach(function(th){var t=text(th.textContent);if(/çmimi\/?kg|cmimi\/?kg|price\/?kg/i.test(t))th.textContent='Çmimi/kg ('+ic+')';});}
}
function injectOffer(){
  var p=el('of-pr');if(!p)return false;
  if(!el('pst-of-currency')){
    var host=p.closest('.field-group');if(!host)return false;
    var a=document.createElement('div');a.innerHTML='<label class="lbl">Valuta</label><select id="pst-of-currency">'+optionHtml('EUR')+'</select>';host.appendChild(a);
    var b=document.createElement('div');b.id='pst-of-fx-wrap';b.style.display='none';b.innerHTML='<label class="lbl">Kursi → EUR</label><input type="number" id="pst-of-fx" step="0.000001" min="0" placeholder="1 '+offerCurrency()+' = ? EUR"><div style="font-size:9px;color:var(--text3);margin-top:2px">Opsional për ofertën; kërkohet për raportim të saktë në EUR.</div>';host.appendChild(b);
    el('pst-of-currency').addEventListener('change',function(){if(this.value!=='EUR'&&num(el('pst-of-fx').value)===1)el('pst-of-fx').value='';rateVisibility('offer');refreshLabels();regenerate('offer');});
    el('pst-of-fx').addEventListener('input',function(){this.placeholder='1 '+offerCurrency()+' = ? EUR';});
  }
  rateVisibility('offer');refreshLabels();return true;
}
function injectInvoice(){
  var t=el('iv-type');if(!t)return false;
  if(!el('pst-iv-currency')){
    var host=t.closest('.field-group');if(!host)return false;
    var a=document.createElement('div');a.innerHTML='<label class="lbl">Valuta</label><select id="pst-iv-currency">'+optionHtml('EUR')+'</select>';host.appendChild(a);
    var b=document.createElement('div');b.id='pst-iv-fx-wrap';b.style.display='none';b.innerHTML='<label class="lbl">Kursi → EUR</label><input type="number" id="pst-iv-fx" step="0.000001" min="0" placeholder="1 USD = ? EUR"><div style="font-size:9px;color:var(--text3);margin-top:2px">Për Finance: 1 njësi e valutës së faturës = ? EUR.</div>';host.appendChild(b);
    el('pst-iv-currency').addEventListener('change',function(){if(this.value!=='EUR'&&num(el('pst-iv-fx').value)===1)el('pst-iv-fx').value='';rateVisibility('invoice');refreshLabels();regenerate('invoice');});
  }
  rateVisibility('invoice');refreshLabels();return true;
}
function setCurrency(kind,currency,rate){
  var c=cur(currency),s=el(kind==='offer'?'pst-of-currency':'pst-iv-currency'),f=el(kind==='offer'?'pst-of-fx':'pst-iv-fx');
  if(s)s.value=c;if(f)f.value=c==='EUR'?'1':(num(rate)>0?String(rate):'');
  rateVisibility(kind);refreshLabels();
}
function patchPreview(rootId,currency){
  var root=el(rootId),c=cur(currency);if(!root||c==='EUR')return;
  var walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);var n,nodes=[];
  while((n=walker.nextNode()))nodes.push(n);
  nodes.forEach(function(node){var s=node.nodeValue||'';if(/EUR\s*[·•]\s*USD\s*[·•]\s*CHF/i.test(s))return;node.nodeValue=s.replace(/€/g,c).replace(/\bEUR\b/g,c);});
}
function regenerate(kind){
  try{
    if(kind==='offer'){var pv=el('of-preview-col'),pre=el('of-pre');if(pv&&pv.style.display!=='none'&&pre&&!/Ploteso|Plotëso/i.test(pre.textContent||'')&&typeof window.genOfer==='function')window.genOfer();}
    else{var iv=el('iv-preview');if(iv&&!/Plotëso/i.test(iv.textContent||'')&&typeof window.genInvoiceOut==='function')window.genInvoiceOut();}
  }catch(e){}
}
function wrapPostRender(name,rootId,getCurrency){
  var f=window[name];if(typeof f!=='function'||f.__pstCurrencyV1)return false;
  var w=function(){var r=f.apply(this,arguments);patchPreview(rootId,getCurrency());refreshLabels();return r;};w.__pstCurrencyV1=true;w.__base=f;window[name]=w;return true;
}
function wrapOfferState(){
  var f=window.collectOfferFormState;
  if(typeof f==='function'&&!f.__pstCurrencyV1){var w=function(){var s=f.apply(this,arguments)||{};s.currency=offerCurrency();s.exchange_rate_to_eur=offerRate()||null;return s;};w.__pstCurrencyV1=true;w.__base=f;window.collectOfferFormState=w;}
  var a=window.applyOfferFormState;
  if(typeof a==='function'&&!a.__pstCurrencyV1){var x=function(s){var r=a.apply(this,arguments);setTimeout(function(){injectOffer();setCurrency('offer',s&&s.currency||'EUR',s&&s.exchange_rate_to_eur);},0);return r;};x.__pstCurrencyV1=true;x.__base=a;window.applyOfferFormState=x;}
  var rr=window.renderOferPos;
  if(typeof rr==='function'&&!rr.__pstCurrencyV1){var rw=function(){var r=rr.apply(this,arguments);refreshLabels();return r;};rw.__pstCurrencyV1=true;rw.__base=rr;window.renderOferPos=rw;}
}
function wrapRegister(){
  var f=window.registerDocNr;if(typeof f!=='function'||f.__pstCurrencyV1)return false;
  var w=function(series,nr,project,client,totalAmount,payPlan,offerState,revenueBreakdown){
    var isQ=series==='QUO',isI=series==='INV';if(!isQ&&!isI)return f.apply(this,arguments);
    var c=isQ?offerCurrency():invoiceCurrency(),rate=isQ?offerRate():invoiceRate(),amount=(totalAmount==null?null:num(totalAmount));
    if(isQ){offerState=Object.assign({},offerState||{},{currency:c,exchange_rate_to_eur:rate||null});}
    var eur=amount==null?null:toEur(amount,c,rate);
    return Promise.resolve(f.call(this,series,nr,project,client,eur,payPlan,offerState,revenueBreakdown)).then(function(){
      if(typeof window.supaFetch!=='function'||!nr)return;
      var patch={currency:c,exchange_rate_to_eur:c==='EUR'?1:(rate||null)};
      if(amount!=null){patch.total_amount=amount;patch.total_eur=eur;}
      return window.supaFetch('documents_registry?doc_nr=eq.'+encodeURIComponent(nr),'PATCH',patch);
    });
  };w.__pstCurrencyV1=true;w.__base=f;window.registerDocNr=w;return true;
}
function patchRegistryFromInvoice(row){
  if(!row||!row.invoice_nr||typeof window.supaFetch!=='function')return Promise.resolve();
  var c=cur(row.currency),rate=c==='EUR'?1:num(row.exchange_rate_to_eur),amount=num(row.gross_amount)||num(row.total_price),eur=toEur(amount,c,rate);
  return window.supaFetch('documents_registry?doc_nr=eq.'+encodeURIComponent(row.invoice_nr),'PATCH',{currency:c,total_amount:amount||null,total_eur:eur,exchange_rate_to_eur:c==='EUR'?1:(rate||null)}).catch(function(){});
}
function wrapFetch(){
  var f=window.supaFetch;if(typeof f!=='function'||f.__pstDocumentCurrencyV1)return false;
  var w=async function(path,method,body){
    var isOut=/^invoices_out(?:\?|$)/.test(String(path||''))&&String(method||'GET').toUpperCase()==='POST'&&body;
    if(!isOut)return f.apply(this,arguments);
    var c=invoiceCurrency(),rate=invoiceRate();
    var rows=(Array.isArray(body)?body:[body]).map(function(r){return Object.assign({},r,{currency:c,exchange_rate_to_eur:c==='EUR'?1:(rate||null)});});
    var send=Array.isArray(body)?rows:rows[0],result=await f.call(this,path,method,send);
    await Promise.all(rows.map(patchRegistryFromInvoice));return result;
  };w.__pstDocumentCurrencyV1=true;w.__base=f;window.supaFetch=w;return true;
}
function amountOfDoc(d){if(!d)return 0;return d.total_amount!=null?num(d.total_amount):num(d.total_eur);}
function decorateQuoteSelect(){
  var s=el('iv-from-quo'),docs=Array.isArray(window._quoDocs)?window._quoDocs:[];if(!s)return;
  docs.forEach(function(d,i){var o=s.options[i+1];if(!o)return;var c=cur(d.currency||(d.offer_state&&d.offer_state.currency)||'EUR'),a=amountOfDoc(d);o.textContent=(d.doc_nr||'Ofertë')+' — '+(d.client||'')+(a?(' — '+fmt(a)+' '+c):'');});
}
function wrapQuoteFlow(){
  var f=window.quoSelected;
  if(typeof f==='function'&&!f.__pstCurrencyV1){var w=function(){var r=f.apply(this,arguments),i=text((el('iv-from-quo')||{}).value),d=i===''?null:(window._quoDocs||[])[parseInt(i,10)];if(d){var c=cur(d.currency||(d.offer_state&&d.offer_state.currency)||'EUR'),rate=num(d.exchange_rate_to_eur||(d.offer_state&&d.offer_state.exchange_rate_to_eur));setCurrency('invoice',c,rate);var cv=el('iv-contract-value');if(cv)cv.value=amountOfDoc(d)||'';}decorateQuoteSelect();return r;};w.__pstCurrencyV1=true;w.__base=f;window.quoSelected=w;}
  var l=window.loadQuoRegistry;
  if(typeof l==='function'&&!l.__pstCurrencyV1){var q=function(){var r=l.apply(this,arguments);Promise.resolve(r).finally(function(){setTimeout(decorateQuoteSelect,0);});return r;};q.__pstCurrencyV1=true;q.__base=l;window.loadQuoRegistry=q;}
}
function decorateArchive(){
  var root=el('oa-list'),rows=Array.isArray(window._oaRows)?window._oaRows:[];if(!root||!rows.length)return;
  var q=text((el('oa-search')||{}).value).toLowerCase();var shown=rows.filter(function(r){return !q||((r.doc_nr||'')+' '+(r.client||'')+' '+(r.project||'')).toLowerCase().indexOf(q)>-1;});
  var trs=[].slice.call(root.querySelectorAll('tbody tr'));trs.forEach(function(tr,i){var d=shown[i];if(!d)return;var c=cur(d.currency||(d.offer_state&&d.offer_state.currency)||'EUR'),a=amountOfDoc(d);var td=[].slice.call(tr.querySelectorAll('td')).filter(function(x){return /€/.test(x.textContent||'');})[0];if(td)td.textContent=fmt(a)+' '+c;});
}
function wrapArchive(){
  var f=window.oaRender;if(typeof f==='function'&&!f.__pstCurrencyV1){var w=function(){var r=f.apply(this,arguments);setTimeout(decorateArchive,0);return r;};w.__pstCurrencyV1=true;w.__base=f;window.oaRender=w;}
  var m=window.oaOpenQuoteModal;if(typeof m==='function'&&!m.__pstCurrencyV1){var z=function(id){var r=m.apply(this,arguments);if(typeof window.supaFetch==='function')window.supaFetch('documents_registry?id=eq.'+encodeURIComponent(id)+'&select=currency,total_amount,total_eur,offer_state&limit=1').then(function(rows){var d=rows&&rows[0];setTimeout(function(){var bg=el('pst-of-modal'),amt=bg&&bg.querySelector('.pst-modal-bd div[style*="font-size:22px"]');if(d&&amt)amt.textContent=fmt(amountOfDoc(d))+' '+cur(d.currency||(d.offer_state&&d.offer_state.currency)||'EUR');},0);}).catch(function(){});return r;};z.__pstCurrencyV1=true;z.__base=m;window.oaOpenQuoteModal=z;}
}
function decorateInvoiceList(){
  var root=el('iv-out-list'),rows=Array.isArray(window.invoicesOutList)?window.invoicesOutList:[];if(!root)return;
  var cards=[].slice.call(root.querySelectorAll('.project-card'));cards.forEach(function(card,i){var r=rows[i];if(!r)return;var c=cur(r.currency);var spans=[].slice.call(card.querySelectorAll('span'));var s=spans.filter(function(x){return /\sEUR\b/.test(x.textContent||'');})[0];if(s)s.textContent=s.textContent.replace(/\sEUR\b/,' '+c);});
}
function wrapInvoiceDisplays(){
  var f=window.loadInvoicesOut;if(typeof f==='function'&&!f.__pstCurrencyV1){var w=function(){var r=f.apply(this,arguments);[40,160].forEach(function(ms){setTimeout(decorateInvoiceList,ms);});return r;};w.__pstCurrencyV1=true;w.__base=f;window.loadInvoicesOut=w;}
  var d=window.openInvoiceDetail;if(typeof d==='function'&&!d.__pstCurrencyV1){var x=function(type,id){var r=d.apply(this,arguments);if(type==='out'){var row=(window.invoicesOutList||[]).filter(function(v){return String(v.id)===String(id);})[0];var bg=el('inv-detail-modal'),amt=bg&&bg.querySelector('.pst-modal-bd>div[style*="font-size:22px"]');if(row&&amt)amt.textContent=fmt(row.gross_amount||row.total_price)+' '+cur(row.currency);}return r;};x.__pstCurrencyV1=true;x.__base=d;window.openInvoiceDetail=x;}
}
function rangeForTax(){var y=text((el('fin-year')||{}).value)||String(new Date().getFullYear()),p=text((el('fin-period')||{}).value)||'year';if(typeof window.periodRange==='function')return window.periodRange(y,p);if(p==='year')return{from:y+'-01-01',to:y+'-12-31'};var q=parseInt(p,10)||1,m=(q-1)*3+1,end=q*3,last=new Date(Number(y),end,0).getDate();return{from:y+'-'+String(m).padStart(2,'0')+'-01',to:y+'-'+String(end).padStart(2,'0')+'-'+String(last).padStart(2,'0')};}
function inRange(row,r){return row&&row.date&&row.date>=r.from&&row.date<=r.to;}
function converted(row,rateField){var c=cur(row.currency),rate=c==='EUR'?1:num(row[rateField]);if(c!=='EUR'&&rate<=0)return null;var x=Object.assign({},row);['amount','total_price','net_amount','vat_amount','gross_amount','contract_value','transport_cost'].forEach(function(k){if(x[k]!=null)x[k]=num(x[k])*rate;});x.currency='EUR';return x;}
function wrapFinance(){
  var f=window.calcTaxSummary;if(typeof f!=='function'||f.__pstCurrencyV1)return false;
  var w=function(){
    var r=rangeForTax(),outs=Array.isArray(window.invoicesOutList)?window.invoicesOutList:[],ins=Array.isArray(window.invoicesInList)?window.invoicesInList:[];
    var missing=[];outs.filter(function(x){return inRange(x,r)&&cur(x.currency)!=='EUR'&&num(x.exchange_rate_to_eur)<=0;}).forEach(function(x){missing.push(x.invoice_nr||'Faturë dalëse');});ins.filter(function(x){return inRange(x,r)&&cur(x.currency)!=='EUR'&&num(x.exchange_rate)<=0;}).forEach(function(x){missing.push(x.supplier_invoice_nr||'Faturë hyrëse');});
    if(missing.length){alert('Përmbledhja financiare nuk u llogarit sepse mungon kursi → EUR për: '+missing.join(', ')+'. Plotëso kursin që raporti të mos japë shifra të gabuara.');return false;}
    var oo=window.invoicesOutList,ii=window.invoicesInList;window.invoicesOutList=outs.map(function(x){return converted(x,'exchange_rate_to_eur')||x;});window.invoicesInList=ins.map(function(x){return converted(x,'exchange_rate')||x;});
    try{return f.apply(this,arguments);}finally{window.invoicesOutList=oo;window.invoicesInList=ii;}
  };w.__pstCurrencyV1=true;w.__base=f;window.calcTaxSummary=w;return true;
}
function wrapFresh(){var c=window.PSTCommercialDocumentBuilderV1;if(!c||typeof c.fresh!=='function'||c.fresh.__pstCurrencyV1)return;var f=c.fresh,w=function(type){var r=f.apply(this,arguments);setTimeout(function(){enhance();setCurrency(type==='offer'?'offer':'invoice','EUR',1);},100);return r;};w.__pstCurrencyV1=true;w.__base=f;c.fresh=w;}
function enhance(){injectOffer();injectInvoice();wrapOfferState();wrapRegister();wrapFetch();wrapQuoteFlow();wrapArchive();wrapInvoiceDisplays();wrapFinance();wrapFresh();wrapPostRender('genOfer','of-pre',offerCurrency);wrapPostRender('genInvoiceOut','iv-preview',invoiceCurrency);decorateQuoteSelect();decorateArchive();decorateInvoiceList();refreshLabels();}

[0,100,350,900,1800].forEach(function(ms){setTimeout(enhance,ms);});
document.addEventListener('pst:modules-ready',enhance,{once:true});
document.addEventListener('change',function(e){if(e.target&&e.target.id==='iv-proj-select')setTimeout(function(){decorateQuoteSelect();},80);});
window.PSTDocumentCurrencyV1={enhance:enhance,offerCurrency:offerCurrency,invoiceCurrency:invoiceCurrency,setCurrency:setCurrency,toEur:toEur,decorateQuoteSelect:decorateQuoteSelect};
})();
