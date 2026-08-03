/* PRISTEEL credit/debit notes v3: real-weight and editable-price adjustment */
(function(){
'use strict';
if(window.__pstDocumentAdjustmentsV3Loaded)return;
window.__pstDocumentAdjustmentsV3Loaded=true;

var S={type:'credit_note',nr:null,lines:[],invoice:null};

function center(){return window.PST_DOC_CENTER||null;}
function esc(v){var D=center();return D&&D.esc?D.esc(v):String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function num(v){var D=center();if(D&&D.num)return D.num(v);if(v==null||v==='')return 0;if(typeof v==='string')v=v.replace(/\s/g,'').replace(/,(?=\d{1,6}$)/,'.');var n=parseFloat(v);return isFinite(n)?n:0;}
function parse(v){for(var i=0;i<3&&typeof v==='string';i++){if(!v.trim())return null;try{v=JSON.parse(v);}catch(e){break;}}return v;}
function list(v){v=parse(v);if(Array.isArray(v))return v;if(v&&typeof v==='object'){var x=v.items||v.positions||v.line_items||v.invoice_items||v.rows;if(x&&x!==v)return list(x);}return [];}
function safeItems(r){return list(r&&r.items||r&&r.invoice_items||r&&r.line_items||[]);}
function money(v,c){var D=center();return D&&D.money?D.money(v,c||'EUR'):num(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(c||'EUR');}
function dateText(v){var D=center();if(D&&D.dateText)return D.dateText(v);if(!v)return '—';var d=new Date(String(v).slice(0,10)+'T12:00:00');return isNaN(d)?String(v):d.toLocaleDateString('de-DE');}
function toast(t){var D=center();if(D&&D.toast){D.toast(t);return;}alert(t);}
function label(t){var D=center();return D&&D.labels&&D.labels[t]?D.labels[t]:{name:t==='debit_note'?'Notë Debitore':'Notë Kreditore'};}
function grossInvoice(r){var D=center();return D&&D.grossInvoice?D.grossInvoice(r):num(r&&r.gross_amount||r&&r.total_price||r&&r.total_eur);}
function close(){var e=document.getElementById('pst-adj-bg');if(e)e.remove();}
function itemDesc(x){return x.desc||x.description||x.pershkrimi||x.name||x.label||[x.profile,x.profil,x.dim,x.dimension,x.grade,x.std,x.standard].filter(Boolean).join(' ')||'Pozicion';}
function billedKg(x){return num(x.kg||x.total_kg||x.kg_total||x.weight||x.weight_kg||x.total_weight);}
function itemPrice(x){return num(x.priceKg||x.price_kg||x.pricePerKg||x.price_per_kg||x.unit_price||x.unitPrice||x.cmimi_kg||x.price);}
function invoiceOption(r){return '<option value="'+esc(r.id)+'">'+esc(r.invoice_nr||'Pa numër')+' — '+esc(r.client||'')+' — '+money(grossInvoice(r),r.currency||'EUR')+'</option>';}

async function loadInvoices(){
  var D=center();
  if(typeof window.supaFetch!=='function')throw new Error('Lidhja me databazën nuk është gati.');
  var rows=await window.supaFetch('invoices_out?select=*&order=created_at.desc&limit=300');
  if(D)D.invoices=Array.isArray(rows)?rows:[];
  return D?D.invoices:(rows||[]);
}
function invoices(){var D=center();return D&&Array.isArray(D.invoices)?D.invoices:[];}
function selectedInvoice(){
  var id=String((document.getElementById('pst-adj-invoice')||{}).value||'');
  return invoices().filter(function(r){return String(r.id)===id;})[0]||null;
}
async function nextNr(t){
  var s=t==='credit_note'?'CN':'DN',y=new Date().getFullYear();
  var rows=await window.supaFetch('commercial_adjustments?document_type=eq.'+t+'&year=eq.'+y+'&order=seq.desc&limit=1');
  var seq=rows&&rows.length?num(rows[0].seq)+1:1;
  return{series:s,year:y,seq:seq,nr:'PST-'+s+'-'+y+'-'+String(seq).padStart(3,'0')};
}
function buildLines(r){
  S.lines=safeItems(r).map(function(x,i){
    var kg=billedKg(x),price=itemPrice(x);
    return{index:i,desc:itemDesc(x),original_kg:kg,actual_kg:kg,delta_kg:0,price_kg:price,net_amount:0,gross_amount:0,source:x};
  });
}
function priorBalance(r){
  var D=center(),credit=0,debit=0;
  ((D&&D.adjustments)||[]).forEach(function(x){
    if(String(x.original_invoice_id)!==String(r.id)||x.status==='cancelled')return;
    if(x.document_type==='credit_note')credit+=num(x.gross_amount);
    if(x.document_type==='debit_note')debit+=num(x.gross_amount);
  });
  return{credit:credit,debit:debit,remaining:Math.max(0,grossInvoice(r)+debit-credit)};
}
function calculate(){
  var r=S.invoice,rate=r&&r.vat_applicable?num(r.vat_rate):0,valid=true,invalidMessage='';
  S.lines.forEach(function(x){
    var raw=S.type==='credit_note'?(x.original_kg-x.actual_kg):(x.actual_kg-x.original_kg);
    if(raw<-.000001){
      valid=false;
      invalidMessage=S.type==='credit_note'?'Pesha reale nuk mund të jetë më e madhe se pesha e faturuar për notë kreditore.':'Pesha reale nuk mund të jetë më e vogël se pesha e faturuar për notë debitore.';
    }
    if(x.price_kg<0){valid=false;invalidMessage='Çmimi për kg nuk mund të jetë negativ.';}
    x.delta_kg=Math.max(0,raw);
    x.net_amount=x.delta_kg*Math.max(0,x.price_kg);
    x.gross_amount=x.net_amount*(1+rate/100);
  });
  var lines=S.lines.filter(function(x){return x.delta_kg>.000001&&x.price_kg>0;});
  var net=lines.reduce(function(a,x){return a+x.net_amount;},0),vat=net*rate/100,gross=net+vat;
  return{valid:valid,message:invalidMessage,lines:lines,net:net,vat:vat,gross:gross,rate:rate};
}
function autoExplanation(c){
  if(!c.lines.length)return'';
  var verb=S.type==='credit_note'?'kredituar':'debitor';
  return c.lines.map(function(x){
    return 'Fatura përfshinte '+x.original_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg me '+x.price_kg.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:6})+' EUR/kg; pesha reale e verifikuar është '+x.actual_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg. Diferenca për t’u '+verb+': '+x.delta_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg = '+x.net_amount.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR neto.';
  }).join('\n');
}
function recalc(){
  var c=calculate(),currency=S.invoice&&S.invoice.currency||'EUR';
  S.lines.forEach(function(x,i){
    var d=document.getElementById('pst-adj-v3-delta-'+i),v=document.getElementById('pst-adj-v3-value-'+i),row=document.getElementById('pst-adj-v3-row-'+i);
    if(d)d.textContent=x.delta_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg';
    if(v)v.textContent=money(x.net_amount,currency);
    if(row){var wrong=(S.type==='credit_note'&&x.actual_kg>x.original_kg)||(S.type==='debit_note'&&x.actual_kg<x.original_kg);row.style.background=wrong?'#fff0ef':'';}
  });
  var sum=document.getElementById('pst-adj-v3-summary');
  if(sum){
    var sign=S.type==='credit_note'?'−':'+';
    sum.innerHTML=(c.valid?'':'<div style="color:#a33a2e;font-weight:700;margin-bottom:7px">'+esc(c.message)+'</div>')+
      '<div style="display:flex;justify-content:flex-end;gap:22px;flex-wrap:wrap"><span>Neto: <b>'+sign+money(c.net,currency)+'</b></span><span>TVSH '+c.rate+'%: <b>'+sign+money(c.vat,currency)+'</b></span><span>Totali: <b style="font-size:14px">'+sign+money(c.gross,currency)+'</b></span></div>';
  }
  var ta=document.getElementById('pst-adj-reason-text');
  if(ta&&(ta.dataset.auto==='1'||!ta.value.trim())){ta.value=autoExplanation(c);ta.dataset.auto='1';}
}
function renderRows(){
  var box=document.getElementById('pst-adj-v3-lines');if(!box)return;
  if(!S.lines.length){box.innerHTML='<div class="pst-adj-info">Kjo faturë nuk ka pozicione të ruajtura. Mund të përdoret “Korrigjim manual”.</div>';return;}
  box.innerHTML='<div class="pst-adj-items-hd">Korrigjimi sipas peshës reale</div><div style="overflow-x:auto"><table style="min-width:860px"><thead><tr><th>Përshkrimi</th><th>Kg faturuar</th><th>Pesha reale</th><th>Diferenca</th><th>Çmimi/kg</th><th>Vlera neto</th></tr></thead><tbody>'+S.lines.map(function(x,i){
    return '<tr id="pst-adj-v3-row-'+i+'"><td>'+esc(x.desc)+'</td><td>'+x.original_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td><input type="number" min="0" step="0.001" value="'+x.actual_kg+'" oninput="pstAdjV3Change('+i+',\'actual\',this.value)" style="width:105px;padding:7px;border:1px solid #dce1e4;border-radius:7px;font-size:10px"></td><td id="pst-adj-v3-delta-'+i+'">0.000 kg</td><td><input type="number" min="0" step="0.000001" value="'+x.price_kg+'" oninput="pstAdjV3Change('+i+',\'price\',this.value)" style="width:105px;padding:7px;border:1px solid #dce1e4;border-radius:7px;font-size:10px"></td><td id="pst-adj-v3-value-'+i+'">0.00 EUR</td></tr>';
  }).join('')+'</tbody></table></div><div id="pst-adj-v3-summary" style="padding:12px;background:#f6f8f9;border-top:1px solid #e4e7e9;font-size:11px"></div>';
  recalc();
}
window.pstAdjV3Change=function(i,field,value){
  if(!S.lines[i])return;
  if(field==='actual')S.lines[i].actual_kg=Math.max(0,num(value));
  if(field==='price')S.lines[i].price_kg=Math.max(0,num(value));
  recalc();
};
window.pstAdjV3ReasonEdited=function(el){if(el)el.dataset.auto='0';};
window.pstAdjV3MethodChanged=function(){
  var method=String((document.getElementById('pst-adj-method')||{}).value||'weight');
  var weight=document.getElementById('pst-adj-v3-weight-wrap'),manual=document.getElementById('pst-adj-v3-manual-wrap');
  if(weight)weight.style.display=method==='weight'?'block':'none';
  if(manual)manual.style.display=method==='manual'?'grid':'none';
  if(method==='weight')recalc();
};
window.pstAdjV3InvoiceChanged=function(){
  var r=selectedInvoice();S.invoice=r;
  var info=document.getElementById('pst-adj-info');
  if(!r){S.lines=[];if(info)info.textContent='Zgjidh faturën origjinale.';renderRows();return;}
  buildLines(r);
  var cur=document.getElementById('pst-adj-currency');if(cur)cur.value=r.currency||'EUR';
  var reason=document.getElementById('pst-adj-reason');if(reason)reason.value='quantity_correction';
  var b=priorBalance(r);
  if(info)info.innerHTML='<b>'+esc(r.invoice_nr||'Fatura')+'</b> · '+esc(r.client||'')+' · '+esc(r.project||'')+' · Totali origjinal: <b>'+money(grossInvoice(r),r.currency||'EUR')+'</b>'+(b.credit||b.debit?' · Nota të mëparshme: kredit '+money(b.credit,r.currency||'EUR')+', debit '+money(b.debit,r.currency||'EUR'):'');
  renderRows();
  var method=document.getElementById('pst-adj-method');if(method&&!S.lines.length)method.value='manual';
  window.pstAdjV3MethodChanged();
};

window.pstOpenAdjustment=async function(t,invoiceId){
  try{
    if(!center())throw new Error('Qendra e dokumenteve nuk është gati.');
    await loadInvoices();
    close();S.type=t;S.nr=null;S.lines=[];S.invoice=null;
    var l=label(t),direction=t==='credit_note'?'ia ul blerësit shumën për pagesë':'ia rrit blerësit shumën për pagesë';
    var bg=document.createElement('div');bg.className='pst-adj-bg';bg.id='pst-adj-bg';bg.onclick=function(e){if(e.target===bg)close();};
    bg.innerHTML='<div class="pst-adj-modal" style="width:min(1080px,97vw)"><div class="pst-adj-hd"><div><h3>'+esc(l.name)+' e re</h3><p>Dokumenti '+direction+'. Fatura origjinale mbetet e pandryshuar.</p></div><button class="pst-adj-x" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+center().icons.close+'</button></div><div class="pst-adj-body">'+
      '<div class="pst-adj-grid"><div class="pst-adj-field"><label>Numri</label><input id="pst-adj-nr" readonly placeholder="Duke gjeneruar…"></div><div class="pst-adj-field"><label>Data</label><input id="pst-adj-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
      '<div class="pst-adj-field full"><label>Fatura origjinale</label><select id="pst-adj-invoice" onchange="pstAdjV3InvoiceChanged()"><option value="">— zgjidh faturën —</option>'+invoices().map(invoiceOption).join('')+'</select></div>'+
      '<div class="pst-adj-field"><label>Metoda e llogaritjes</label><select id="pst-adj-method" onchange="pstAdjV3MethodChanged()"><option value="weight">Sipas peshës reale</option><option value="manual">Korrigjim manual</option></select></div>'+
      '<div class="pst-adj-field"><label>Arsyeja</label><select id="pst-adj-reason"><option value="quantity_correction">Diferencë peshe / sasie</option><option value="price_correction">Korrigjim çmimi</option><option value="invoice_error">Gabim në faturë</option><option value="returned_goods">Mall i kthyer</option><option value="discount">Zbritje e mëvonshme</option><option value="additional_charge">Kosto/shtesë e mëvonshme</option><option value="other">Tjetër</option></select></div>'+
      '<div class="pst-adj-field"><label>Valuta</label><input id="pst-adj-currency" value="EUR" readonly></div><div class="pst-adj-info" id="pst-adj-info">Zgjidh faturën origjinale.</div></div>'+
      '<div id="pst-adj-v3-weight-wrap" style="margin-top:16px"><div class="pst-adj-items" id="pst-adj-v3-lines"><div class="pst-adj-info">Zgjidh faturën origjinale.</div></div></div>'+
      '<div id="pst-adj-v3-manual-wrap" class="pst-adj-grid" style="display:none;margin-top:16px"><div class="pst-adj-field"><label>Lloji i korrigjimit</label><select id="pst-adj-mode"><option value="partial">I pjesshëm</option><option value="full">I plotë</option></select></div><div class="pst-adj-field"><label>Shuma bruto</label><input id="pst-adj-amount" type="number" min="0.01" step="0.01"></div></div>'+
      '<div class="pst-adj-field full" style="margin-top:16px"><label>Shpjegimi</label><textarea id="pst-adj-reason-text" data-auto="1" oninput="pstAdjV3ReasonEdited(this)" placeholder="Shpjegimi krijohet automatikisht nga pesha dhe çmimi; mund ta ndryshosh."></textarea></div></div>'+
      '<div class="pst-adj-ft"><button class="pst-adj-btn" onclick="document.getElementById(\'pst-adj-bg\').remove()">Anulo</button><button class="pst-adj-btn primary" id="pst-adj-save" onclick="pstSaveAdjustment(\''+t+'\')">Ruaj '+esc(l.name)+'</button></div></div>';
    document.body.appendChild(bg);
    S.nr=await nextNr(t);document.getElementById('pst-adj-nr').value=S.nr.nr;
    if(invoiceId){var select=document.getElementById('pst-adj-invoice');select.value=String(invoiceId);window.pstAdjV3InvoiceChanged();}
  }catch(e){toast('Nota nuk u hap: '+(e.message||e));}
};

window.pstSaveAdjustment=async function(t){
  var btn=document.getElementById('pst-adj-save'),r=S.invoice||selectedInvoice();
  var nr=String((document.getElementById('pst-adj-nr')||{}).value||'').trim(),date=String((document.getElementById('pst-adj-date')||{}).value||''),method=String((document.getElementById('pst-adj-method')||{}).value||'weight'),reason=String((document.getElementById('pst-adj-reason')||{}).value||''),text=String((document.getElementById('pst-adj-reason-text')||{}).value||'').trim(),currency=String((document.getElementById('pst-adj-currency')||{}).value||'EUR').trim().toUpperCase();
  if(!r){toast('Zgjidh faturën origjinale.');return;}
  if(!nr||!date){toast('Numri ose data mungon.');return;}
  var rate=r.vat_applicable?num(r.vat_rate):0,net=0,vat=0,gross=0,items=[],mode='partial';
  if(method==='weight'){
    var c=calculate();
    if(!c.valid){toast(c.message);return;}
    if(!c.lines.length){toast('Nuk ka diferencë peshe për t’u korrigjuar.');return;}
    if(c.lines.some(function(x){return x.price_kg<=0;})){toast('Vendos çmimin për kg te çdo rresht që korrigjohet.');return;}
    net=c.net;vat=c.vat;gross=c.gross;
    items=c.lines.map(function(x){return{desc:x.desc,original_kg:+x.original_kg.toFixed(3),actual_kg:+x.actual_kg.toFixed(3),delta_kg:+x.delta_kg.toFixed(3),price_kg:+x.price_kg.toFixed(6),net_amount:+x.net_amount.toFixed(2),gross_amount:+x.gross_amount.toFixed(2)};});
    if(!text)text=autoExplanation(c);
  }else{
    gross=num((document.getElementById('pst-adj-amount')||{}).value);mode=String((document.getElementById('pst-adj-mode')||{}).value||'partial');
    if(gross<=0){toast('Shuma duhet të jetë më e madhe se zero.');return;}
    if(!text){toast('Shkruaj arsyen e korrigjimit.');return;}
    net=rate?gross/(1+rate/100):gross;vat=gross-net;
    if(mode==='full'&&Math.abs(gross-grossInvoice(r))>.01){toast('Për korrigjim të plotë, shuma duhet të jetë e barabartë me faturën origjinale.');return;}
  }
  var balance=priorBalance(r);if(t==='credit_note'&&gross>balance.remaining+.01){toast('Nota kreditore kalon shumën e mbetur të faturës: '+money(balance.remaining,currency));return;}
  var n=S.nr||{},payload={document_type:t,series:t==='credit_note'?'CN':'DN',year:n.year||new Date(date).getFullYear(),seq:n.seq||num(nr.split('-').pop()),document_nr:nr,document_date:date,original_invoice_id:String(r.id),original_invoice_nr:r.invoice_nr||'',project_id:r.project_id?String(r.project_id):null,project:r.project||'',client:r.client||'',contact:r.contact||'',email:r.email||r.contact_email||'',address:r.address||'',currency:currency,reason_code:reason,reason_text:text,adjustment_mode:mode,items:items,net_amount:+net.toFixed(2),vat_rate:+rate.toFixed(4),vat_amount:+vat.toFixed(2),gross_amount:+gross.toFixed(2),notes:method==='weight'?'weight_adjustment_v3':'manual_adjustment',status:'issued'};
  try{
    btn.disabled=true;btn.textContent='Duke ruajtur…';
    var rows=await window.supaFetch('commercial_adjustments','POST',payload);
    close();toast(label(t).name+' '+nr+' u ruajt. Fatura origjinale nuk u ndryshua.');
    var D=center();if(D&&D.reload)await D.reload();
    var saved=rows&&rows[0]?rows[0]:(D&&D.adjustments||[]).filter(function(x){return x.document_nr===nr;})[0];
    if(saved)window.pstOpenAdjustmentDetail(saved);
  }catch(e){toast('Ruajtja dështoi: '+(e.message||e));if(btn){btn.disabled=false;btn.textContent='Ruaj '+label(t).name;}}
};

function reasonName(c){return({invoice_error:'Gabim në faturë',price_correction:'Korrigjim çmimi',quantity_correction:'Diferencë peshe / sasie',returned_goods:'Mall i kthyer',discount:'Zbritje e mëvonshme',additional_charge:'Kosto/shtesë e mëvonshme',other:'Tjetër'})[c]||c||'';}
function detailLines(r){var items=safeItems(r);if(!items.length)return'';return '<table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:11px"><thead><tr style="background:#f5f7f8"><th style="padding:8px;text-align:left">Përshkrimi</th><th style="padding:8px;text-align:right">Kg faturuar</th><th style="padding:8px;text-align:right">Kg real</th><th style="padding:8px;text-align:right">Diferenca</th><th style="padding:8px;text-align:right">Çmimi/kg</th><th style="padding:8px;text-align:right">Vlera</th></tr></thead><tbody>'+items.map(function(x){return '<tr><td style="padding:8px;border-bottom:1px solid #e6e6e6">'+esc(x.desc||'Pozicion')+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+num(x.original_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+num(x.actual_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+num(x.delta_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+money(x.price_kg,r.currency)+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+money(x.net_amount,r.currency)+'</td></tr>';}).join('')+'</tbody></table>';}
function detail(r){var credit=r.document_type==='credit_note',title=credit?'NOTË KREDITORE':'NOTË DEBITORE',sign=credit?'−':'+';return '<div style="font-family:Arial,sans-serif;color:#222;padding:28px;max-width:900px;margin:auto"><div style="display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #2B67AD;padding-bottom:16px"><div><div style="font-size:22px;font-weight:800">PRISTEEL</div><div style="font-size:11px;color:#777;margin-top:3px">Rr. Tringe Smajli nr.16, 10000 Prishtinë, Kosovë</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:800">'+title+'</div><div style="font-size:12px;margin-top:5px">'+esc(r.document_nr)+'</div><div style="font-size:11px;color:#666">'+dateText(r.document_date)+'</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px"><div><div style="font-size:9px;color:#777;text-transform:uppercase">Blerësi</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+esc(r.client)+'</div><div style="font-size:11px;margin-top:4px">'+esc(r.address||'')+'</div><div style="font-size:11px">'+esc(r.contact||'')+'</div></div><div><div style="font-size:9px;color:#777;text-transform:uppercase">Fatura origjinale</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+esc(r.original_invoice_nr)+'</div><div style="font-size:11px;margin-top:4px">Projekti: '+esc(r.project||'')+'</div></div></div><div style="margin-top:24px;border:1px solid #ddd;border-radius:8px;overflow:hidden"><div style="background:#F5F7F8;padding:10px 12px;font-size:10px;font-weight:700">ARSYEJA</div><div style="padding:13px 12px;font-size:12px"><b>'+esc(reasonName(r.reason_code))+'</b><div style="margin-top:5px;line-height:1.5;white-space:pre-line">'+esc(r.reason_text)+'</div></div></div>'+detailLines(r)+'<table style="width:100%;border-collapse:collapse;margin-top:22px"><tr><td style="padding:8px;border-bottom:1px solid #ddd">Vlera neto</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">'+sign+money(r.net_amount,r.currency)+'</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd">TVSH '+num(r.vat_rate)+'%</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">'+sign+money(r.vat_amount,r.currency)+'</td></tr><tr><td style="padding:11px 8px;font-size:15px;font-weight:800">TOTALI</td><td style="padding:11px 8px;text-align:right;font-size:15px;font-weight:800;color:'+(credit?'#2F7657':'#A65F2E')+'">'+sign+money(r.gross_amount,r.currency)+'</td></tr></table><div style="font-size:10px;color:#777;margin-top:30px">Ky dokument korrigjon faturën '+esc(r.original_invoice_nr)+'; fatura origjinale mbetet e pandryshuar.</div></div>';}
window.pstOpenAdjustmentDetail=function(r){close();var bg=document.createElement('div');bg.className='pst-adj-bg';bg.id='pst-adj-bg';bg.onclick=function(e){if(e.target===bg)close();};bg.innerHTML='<div class="pst-adj-modal" style="width:min(1040px,97vw)"><div class="pst-adj-hd"><div><h3>'+esc(label(r.document_type).name)+' '+esc(r.document_nr)+'</h3><p>Lidhur me faturën '+esc(r.original_invoice_nr)+'</p></div><button class="pst-adj-x" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+center().icons.close+'</button></div><div class="pst-adj-body">'+detail(r)+'</div><div class="pst-adj-ft"><button class="pst-adj-btn" onclick="document.getElementById(\'pst-adj-bg\').remove()">Mbyll</button><button class="pst-adj-btn primary" onclick="pstPrintAdjustment(\''+esc(r.id)+'\')">PDF / Printo</button></div></div>';document.body.appendChild(bg);};
window.pstPrintAdjustment=function(id){var D=center(),r=(D&&D.adjustments||[]).filter(function(x){return String(x.id)===String(id);})[0];if(!r)return;var html=detail(r),fn=(r.document_nr||'Dokument')+'.pdf';if(window.pstExportPdf)window.pstExportPdf(html,fn);else{var w=window.open('','_blank');w.document.write('<html><body>'+html+'</body></html>');w.document.close();w.print();}};
})();
