/* PRISTEEL credit/debit note workflow — weight-based adjustments */
(function(){
'use strict';
if(window.__pstDocumentAdjustmentsLoaded)return;
window.__pstDocumentAdjustmentsLoaded=true;
var D=window.PST_DOC_CENTER;if(!D)return;
var currentNr=null;
var currentType='credit_note';
var currentLines=[];

function label(t){return D.labels[t]||D.labels.credit_note;}
function close(){var e=document.getElementById('pst-adj-bg');if(e)e.remove();}
function selectedInvoice(){
  var id=String((document.getElementById('pst-adj-invoice')||{}).value||'');
  return D.invoices.filter(function(r){return String(r.id)===id;})[0]||null;
}
function invoiceOption(r){
  return '<option value="'+D.esc(r.id)+'">'+D.esc(r.invoice_nr||'Pa numër')+' — '+D.esc(r.client||'')+' — '+D.money(D.grossInvoice(r),r.currency||'EUR')+'</option>';
}
async function nextNr(t){
  var s=t==='credit_note'?'CN':'DN',y=new Date().getFullYear();
  var rows=await supaFetch('commercial_adjustments?document_type=eq.'+t+'&year=eq.'+y+'&order=seq.desc&limit=1');
  var seq=rows&&rows.length?D.num(rows[0].seq)+1:1;
  return{series:s,year:y,seq:seq,nr:'PST-'+s+'-'+y+'-'+String(seq).padStart(3,'0')};
}
function itemDesc(x){return x.desc||x.description||x.name||[x.profile,x.dim,x.grade,x.std].filter(Boolean).join(' ')||'Pozicion';}
function billedKg(x){return D.num(x.kg||x.total_kg||x.kg_total||x.weight||x.weight_kg);}
function priceKg(x){return D.num(x.priceKg||x.price_kg||x.pricePerKg||x.price_per_kg||x.unit_price||x.price);}
function buildLines(r){
  currentLines=D.safeItems(r.items).map(function(x,i){
    var kg=billedKg(x),price=priceKg(x);
    return{index:i,desc:itemDesc(x),original_kg:kg,actual_kg:kg,delta_kg:0,price_kg:price,net_amount:0,gross_amount:0,source:x};
  });
}
function priorBalance(r){
  var list=D.adjustments||[],credit=0,debit=0;
  list.forEach(function(x){
    if(String(x.original_invoice_id)!==String(r.id)||x.status==='cancelled')return;
    if(x.document_type==='credit_note')credit+=D.num(x.gross_amount);
    if(x.document_type==='debit_note')debit+=D.num(x.gross_amount);
  });
  return{credit:credit,debit:debit,remaining:Math.max(0,D.grossInvoice(r)+debit-credit)};
}
function money(v,c){return D.money(v,c||'EUR');}
function calcWeight(){
  var r=selectedInvoice();if(!r)return{valid:false,net:0,vat:0,gross:0,rate:0,lines:[]};
  var rate=r.vat_applicable?D.num(r.vat_rate):0,valid=true;
  currentLines.forEach(function(x){
    var diff=currentType==='credit_note'?(x.original_kg-x.actual_kg):(x.actual_kg-x.original_kg);
    if(diff<-.0001)valid=false;
    x.delta_kg=Math.max(0,diff);
    x.net_amount=x.delta_kg*x.price_kg;
    x.gross_amount=x.net_amount*(1+rate/100);
  });
  var lines=currentLines.filter(function(x){return x.delta_kg>.0001&&x.net_amount>.0001;});
  var net=lines.reduce(function(s,x){return s+x.net_amount;},0),vat=net*rate/100,gross=net+vat;
  return{valid:valid,net:net,vat:vat,gross:gross,rate:rate,lines:lines};
}
function renderWeightRows(){
  var box=document.getElementById('pst-adj-weight-lines');if(!box)return;
  if(!currentLines.length){
    box.innerHTML='<div class="pst-adj-info">Kjo faturë nuk ka pozicione të ruajtura. Përdor metodën “Korrigjim manual”.</div>';
    return;
  }
  var actualLabel=currentType==='credit_note'?'Pesha reale':'Pesha reale / shtesë';
  box.innerHTML='<div class="pst-adj-items-hd">Korrigjimi sipas peshës reale</div>'+
    '<table><thead><tr><th>Përshkrimi</th><th>Kg faturuar</th><th>'+actualLabel+'</th><th>Diferenca</th><th>Çmimi/kg</th><th>Vlera</th></tr></thead><tbody>'+
    currentLines.map(function(x,i){
      return '<tr id="pst-adj-line-'+i+'"><td>'+D.esc(x.desc)+'</td><td>'+x.original_kg.toLocaleString('de-DE',{maximumFractionDigits:3})+'</td><td><input type="number" min="0" step="0.001" value="'+x.actual_kg+'" oninput="pstAdjustmentActualChanged('+i+',this.value)" style="width:92px;padding:6px 7px;border:1px solid #dce1e4;border-radius:7px;font-size:10px"></td><td id="pst-adj-delta-'+i+'">0.000 kg</td><td>'+money(x.price_kg,'EUR')+'</td><td id="pst-adj-value-'+i+'">0.00 EUR</td></tr>';
    }).join('')+'</tbody></table><div id="pst-adj-weight-summary" style="padding:12px;background:#f6f8f9;border-top:1px solid #e4e7e9;font-size:11px"></div>';
  recalcWeightUi();
}
function recalcWeightUi(){
  var r=selectedInvoice(),c=calcWeight();
  currentLines.forEach(function(x,i){
    var d=document.getElementById('pst-adj-delta-'+i),v=document.getElementById('pst-adj-value-'+i),row=document.getElementById('pst-adj-line-'+i);
    if(d)d.textContent=x.delta_kg.toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+' kg';
    if(v)v.textContent=money(x.net_amount,(r&&r.currency)||'EUR');
    if(row)row.style.background=(!c.valid&&x.delta_kg===0&&((currentType==='credit_note'&&x.actual_kg>x.original_kg)||(currentType==='debit_note'&&x.actual_kg<x.original_kg)))?'#fff0ef':'';
  });
  var s=document.getElementById('pst-adj-weight-summary');
  if(s){
    var sign=currentType==='credit_note'?'−':'+';
    s.innerHTML=(c.valid?'':'<div style="color:#a33a2e;font-weight:700;margin-bottom:6px">Pesha reale është në drejtim të gabuar për këtë lloj note.</div>')+
      '<div style="display:flex;justify-content:flex-end;gap:22px;flex-wrap:wrap"><span>Neto: <b>'+sign+money(c.net,(r&&r.currency)||'EUR')+'</b></span><span>TVSH '+c.rate+'%: <b>'+sign+money(c.vat,(r&&r.currency)||'EUR')+'</b></span><span>Totali: <b style="font-size:14px">'+sign+money(c.gross,(r&&r.currency)||'EUR')+'</b></span></div>';
  }
}
window.pstAdjustmentActualChanged=function(i,v){
  if(!currentLines[i])return;
  currentLines[i].actual_kg=Math.max(0,D.num(v));
  recalcWeightUi();
};
window.pstAdjustmentMethodChanged=function(){
  var m=String((document.getElementById('pst-adj-method')||{}).value||'weight');
  var w=document.getElementById('pst-adj-weight-wrap'),manual=document.getElementById('pst-adj-manual-wrap');
  if(w)w.style.display=m==='weight'?'block':'none';
  if(manual)manual.style.display=m==='manual'?'grid':'none';
  if(m==='weight')recalcWeightUi();
};
window.pstAdjustmentInvoiceChanged=function(){
  var r=selectedInvoice(),i=document.getElementById('pst-adj-info');
  if(!r){if(i)i.textContent='Zgjidh faturën origjinale.';currentLines=[];renderWeightRows();return;}
  currentType=String((document.getElementById('pst-adj-type-hidden')||{}).value||currentType);
  buildLines(r);
  var c=document.getElementById('pst-adj-currency');if(c)c.value=r.currency||'EUR';
  var reason=document.getElementById('pst-adj-reason');if(reason)reason.value='quantity_correction';
  var b=priorBalance(r);
  if(i)i.innerHTML='<b>'+D.esc(r.invoice_nr||'Fatura')+'</b> · '+D.esc(r.client||'')+' · '+D.esc(r.project||'')+' · Totali origjinal: <b>'+money(D.grossInvoice(r),r.currency||'EUR')+'</b>'+(b.credit||b.debit?' · Nota të mëparshme: kredit '+money(b.credit,r.currency||'EUR')+', debit '+money(b.debit,r.currency||'EUR'):'');
  renderWeightRows();
  var method=document.getElementById('pst-adj-method');if(method&&!currentLines.length)method.value='manual';
  window.pstAdjustmentMethodChanged();
};
window.pstOpenAdjustment=async function(t,invoiceId){
  if(!D.adjustmentsReady){D.toast('Së pari duhet aktivizuar tabela commercial_adjustments në Supabase.');return;}
  if(!D.invoices.length){try{D.invoices=D.arr(await supaFetch('invoices_out?order=created_at.desc&limit=250'));}catch(e){D.toast('Faturat nuk u ngarkuan: '+(e.message||e));return;}}
  close();currentType=t;currentLines=[];
  var l=label(t),bg=document.createElement('div');bg.className='pst-adj-bg';bg.id='pst-adj-bg';bg.onclick=function(e){if(e.target===bg)close();};
  var direction=t==='credit_note'?'ul shumën që i detyrohet blerësi':'rrit shumën që i detyrohet blerësi';
  bg.innerHTML='<div class="pst-adj-modal"><div class="pst-adj-hd"><div><h3>'+D.esc(l.name)+' e re</h3><p>Dokumenti '+direction+'. Fatura origjinale mbetet e pandryshuar.</p></div><button class="pst-adj-x" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+D.icons.close+'</button></div><div class="pst-adj-body">'+
    '<input id="pst-adj-type-hidden" type="hidden" value="'+t+'"><div class="pst-adj-grid">'+
    '<div class="pst-adj-field"><label>Numri</label><input id="pst-adj-nr" readonly placeholder="Duke gjeneruar…"></div><div class="pst-adj-field"><label>Data</label><input id="pst-adj-date" type="date" value="'+new Date().toISOString().slice(0,10)+'"></div>'+
    '<div class="pst-adj-field full"><label>Fatura origjinale</label><select id="pst-adj-invoice" onchange="pstAdjustmentInvoiceChanged()"><option value="">— zgjidh faturën —</option>'+D.invoices.map(invoiceOption).join('')+'</select></div>'+
    '<div class="pst-adj-field"><label>Metoda e llogaritjes</label><select id="pst-adj-method" onchange="pstAdjustmentMethodChanged()"><option value="weight">Sipas peshës reale</option><option value="manual">Korrigjim manual</option></select></div>'+
    '<div class="pst-adj-field"><label>Arsyeja</label><select id="pst-adj-reason"><option value="quantity_correction">Diferencë peshe / sasie</option><option value="invoice_error">Gabim në faturë</option><option value="price_correction">Korrigjim çmimi</option><option value="returned_goods">Mall i kthyer</option><option value="discount">Zbritje e mëvonshme</option><option value="additional_charge">Kosto/shtesë e mëvonshme</option><option value="other">Tjetër</option></select></div>'+
    '<div class="pst-adj-field"><label>Valuta</label><input id="pst-adj-currency" value="EUR" readonly></div>'+
    '<div class="pst-adj-info" id="pst-adj-info">Zgjidh faturën origjinale.</div></div>'+
    '<div id="pst-adj-weight-wrap" style="display:block;margin-top:16px"><div class="pst-adj-items" id="pst-adj-weight-lines"><div class="pst-adj-info">Zgjidh faturën origjinale.</div></div></div>'+
    '<div id="pst-adj-manual-wrap" class="pst-adj-grid" style="display:none;margin-top:16px"><div class="pst-adj-field"><label>Lloji i korrigjimit</label><select id="pst-adj-mode"><option value="partial">I pjesshëm</option><option value="full">I plotë</option></select></div><div class="pst-adj-field"><label>Shuma bruto</label><input id="pst-adj-amount" type="number" min="0.01" step="0.01"></div></div>'+
    '<div class="pst-adj-field full" style="margin-top:16px"><label>Shpjegimi i detyrueshëm</label><textarea id="pst-adj-reason-text" placeholder="P.sh. Fatura përfshinte 516 kg; pesha reale e verifikuar është 500 kg. Korrigjimi: 16 kg × 3.10 EUR/kg."></textarea></div>'+
    '</div><div class="pst-adj-ft"><button class="pst-adj-btn" onclick="document.getElementById(\'pst-adj-bg\').remove()">Anulo</button><button class="pst-adj-btn primary" id="pst-adj-save" onclick="pstSaveAdjustment(\''+t+'\')">Ruaj '+D.esc(l.name)+'</button></div></div>';
  document.body.appendChild(bg);
  try{currentNr=await nextNr(t);var n=document.getElementById('pst-adj-nr');if(n)n.value=currentNr.nr;}catch(e){D.toast('Numri nuk u gjenerua: '+(e.message||e));}
  if(invoiceId){var s=document.getElementById('pst-adj-invoice');s.value=String(invoiceId);window.pstAdjustmentInvoiceChanged();}
};
window.pstSaveAdjustment=async function(t){
  var btn=document.getElementById('pst-adj-save'),r=selectedInvoice(),nr=String((document.getElementById('pst-adj-nr')||{}).value||'').trim(),date=String((document.getElementById('pst-adj-date')||{}).value||''),method=String((document.getElementById('pst-adj-method')||{}).value||'weight'),reason=String((document.getElementById('pst-adj-reason')||{}).value||''),text=String((document.getElementById('pst-adj-reason-text')||{}).value||'').trim(),currency=String((document.getElementById('pst-adj-currency')||{}).value||'EUR').trim().toUpperCase();
  if(!r){D.toast('Zgjidh faturën origjinale.');return;}
  if(!nr||!date){D.toast('Numri ose data mungon.');return;}
  if(!text){D.toast('Shkruaj arsyen e korrigjimit.');return;}
  var net=0,vat=0,gross=0,rate=r.vat_applicable?D.num(r.vat_rate):0,items=[],mode='partial';
  if(method==='weight'){
    var c=calcWeight();
    if(!c.valid){D.toast(t==='credit_note'?'Për notë kreditore, pesha reale duhet të jetë më e vogël ose e barabartë me peshën e faturuar.':'Për notë debitore, pesha reale duhet të jetë më e madhe ose e barabartë me peshën e faturuar.');return;}
    if(!c.lines.length||c.gross<=0){D.toast('Nuk ka diferencë peshe për t’u korrigjuar.');return;}
    net=c.net;vat=c.vat;gross=c.gross;
    items=c.lines.map(function(x){return{desc:x.desc,original_kg:+x.original_kg.toFixed(3),actual_kg:+x.actual_kg.toFixed(3),delta_kg:+x.delta_kg.toFixed(3),price_kg:+x.price_kg.toFixed(6),net_amount:+x.net_amount.toFixed(2),gross_amount:+x.gross_amount.toFixed(2)};});
    mode=Math.abs(gross-D.grossInvoice(r))<.01?'full':'partial';
  }else{
    gross=D.num((document.getElementById('pst-adj-amount')||{}).value);
    mode=String((document.getElementById('pst-adj-mode')||{}).value||'partial');
    if(gross<=0){D.toast('Shuma duhet të jetë më e madhe se zero.');return;}
    net=rate?gross/(1+rate/100):gross;vat=gross-net;items=[];
    if(mode==='full'&&Math.abs(gross-D.grossInvoice(r))>.01){D.toast('Për korrigjim të plotë, shuma duhet të jetë e barabartë me faturën origjinale.');return;}
  }
  var balance=priorBalance(r);
  if(t==='credit_note'&&gross>balance.remaining+.01){D.toast('Nota kreditore kalon shumën e mbetur të faturës: '+money(balance.remaining,currency));return;}
  var n=currentNr||{},payload={document_type:t,series:t==='credit_note'?'CN':'DN',year:n.year||new Date(date).getFullYear(),seq:n.seq||D.num(nr.split('-').pop()),document_nr:nr,document_date:date,original_invoice_id:String(r.id),original_invoice_nr:r.invoice_nr||'',project_id:r.project_id?String(r.project_id):null,project:r.project||'',client:r.client||'',contact:r.contact||'',email:r.email||r.contact_email||'',address:r.address||'',currency:currency,reason_code:reason,reason_text:text,adjustment_mode:mode,items:items,net_amount:+net.toFixed(2),vat_rate:+rate.toFixed(4),vat_amount:+vat.toFixed(2),gross_amount:+gross.toFixed(2),notes:method==='weight'?'weight_adjustment':'manual_adjustment',status:'issued'};
  try{
    btn.disabled=true;btn.textContent='Duke ruajtur…';
    var rows=await supaFetch('commercial_adjustments','POST',payload);
    close();D.toast(label(t).name+' '+nr+' u ruajt. Fatura origjinale nuk u ndryshua.');
    await D.reload();
    var saved=rows&&rows[0]?rows[0]:D.adjustments.filter(function(x){return x.document_nr===nr;})[0];
    if(saved)window.pstOpenAdjustmentDetail(saved);
  }catch(e){D.toast('Ruajtja dështoi: '+(e.message||e));btn.disabled=false;btn.textContent='Ruaj '+label(t).name;}
};
function reason(c){return({invoice_error:'Gabim në faturë',price_correction:'Korrigjim çmimi',quantity_correction:'Diferencë peshe / sasie',returned_goods:'Mall i kthyer',discount:'Zbritje e mëvonshme',additional_charge:'Kosto/shtesë e mëvonshme',other:'Tjetër'})[c]||c||'';}
function detailLines(r){
  var items=D.safeItems(r.items);if(!items.length)return'';
  return '<table style="width:100%;border-collapse:collapse;margin-top:22px;font-size:11px"><thead><tr style="background:#f5f7f8"><th style="padding:8px;text-align:left">Përshkrimi</th><th style="padding:8px;text-align:right">Kg faturuar</th><th style="padding:8px;text-align:right">Kg real</th><th style="padding:8px;text-align:right">Diferenca</th><th style="padding:8px;text-align:right">Çmimi/kg</th><th style="padding:8px;text-align:right">Vlera</th></tr></thead><tbody>'+items.map(function(x){return '<tr><td style="padding:8px;border-bottom:1px solid #e6e6e6">'+D.esc(x.desc||'Pozicion')+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+D.num(x.original_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+D.num(x.actual_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+D.num(x.delta_kg).toLocaleString('de-DE',{minimumFractionDigits:3,maximumFractionDigits:3})+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+money(x.price_kg,r.currency)+'</td><td style="padding:8px;border-bottom:1px solid #e6e6e6;text-align:right">'+money(x.net_amount,r.currency)+'</td></tr>';}).join('')+'</tbody></table>';
}
function detail(r){
  var credit=r.document_type==='credit_note',title=credit?'NOTË KREDITORE':'NOTË DEBITORE',sign=credit?'−':'+';
  return '<div style="font-family:Arial,sans-serif;color:#222;padding:28px;max-width:880px;margin:auto"><div style="display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #2B67AD;padding-bottom:16px"><div><div style="font-size:22px;font-weight:800">PRISTEEL</div><div style="font-size:11px;color:#777;margin-top:3px">Rr. Tringe Smajli nr.16, 10000 Prishtinë, Kosovë</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:800">'+title+'</div><div style="font-size:12px;margin-top:5px">'+D.esc(r.document_nr)+'</div><div style="font-size:11px;color:#666">'+D.dateText(r.document_date)+'</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:22px"><div><div style="font-size:9px;color:#777;text-transform:uppercase">Blerësi</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+D.esc(r.client)+'</div><div style="font-size:11px;margin-top:4px">'+D.esc(r.address||'')+'</div><div style="font-size:11px">'+D.esc(r.contact||'')+'</div></div><div><div style="font-size:9px;color:#777;text-transform:uppercase">Fatura origjinale</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+D.esc(r.original_invoice_nr)+'</div><div style="font-size:11px;margin-top:4px">Projekti: '+D.esc(r.project||'')+'</div><div style="font-size:11px">Korrigjimi: '+(r.adjustment_mode==='full'?'i plotë':'i pjesshëm')+'</div></div></div><div style="margin-top:24px;border:1px solid #ddd;border-radius:8px;overflow:hidden"><div style="background:#F5F7F8;padding:10px 12px;font-size:10px;font-weight:700">ARSYEJA</div><div style="padding:13px 12px;font-size:12px"><b>'+D.esc(reason(r.reason_code))+'</b><div style="margin-top:5px;line-height:1.5">'+D.esc(r.reason_text)+'</div></div></div>'+detailLines(r)+'<table style="width:100%;border-collapse:collapse;margin-top:22px"><tr><td style="padding:8px;border-bottom:1px solid #ddd">Vlera neto</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">'+sign+money(r.net_amount,r.currency)+'</td></tr><tr><td style="padding:8px;border-bottom:1px solid #ddd">TVSH '+D.num(r.vat_rate)+'%</td><td style="padding:8px;border-bottom:1px solid #ddd;text-align:right">'+sign+money(r.vat_amount,r.currency)+'</td></tr><tr><td style="padding:11px 8px;font-size:15px;font-weight:800">TOTALI</td><td style="padding:11px 8px;text-align:right;font-size:15px;font-weight:800;color:'+(credit?'#2F7657':'#A65F2E')+'">'+sign+money(r.gross_amount,r.currency)+'</td></tr></table><div style="font-size:10px;color:#777;margin-top:30px">Ky dokument korrigjon faturën '+D.esc(r.original_invoice_nr)+'; fatura origjinale mbetet e pandryshuar.</div></div>';
}
window.pstOpenAdjustmentDetail=function(r){close();var bg=document.createElement('div');bg.className='pst-adj-bg';bg.id='pst-adj-bg';bg.onclick=function(e){if(e.target===bg)close();};bg.innerHTML='<div class="pst-adj-modal"><div class="pst-adj-hd"><div><h3>'+D.esc(label(r.document_type).name)+' '+D.esc(r.document_nr)+'</h3><p>Lidhur me faturën '+D.esc(r.original_invoice_nr)+'</p></div><button class="pst-adj-x" onclick="document.getElementById(\'pst-adj-bg\').remove()">'+D.icons.close+'</button></div><div class="pst-adj-body">'+detail(r)+'</div><div class="pst-adj-ft"><button class="pst-adj-btn" onclick="document.getElementById(\'pst-adj-bg\').remove()">Mbyll</button><button class="pst-adj-btn primary" onclick="pstPrintAdjustment(\''+D.esc(r.id)+'\')">PDF / Printo</button></div></div>';document.body.appendChild(bg);};
window.pstPrintAdjustment=function(id){var r=D.adjustments.filter(function(x){return String(x.id)===String(id);})[0];if(!r)return;var html=detail(r),fn=(r.document_nr||'Dokument')+'.pdf';if(window.pstExportPdf)window.pstExportPdf(html,fn);else{var w=window.open('','_blank');w.document.write('<html><body>'+html+'</body></html>');w.document.close();w.print();}};
})();
