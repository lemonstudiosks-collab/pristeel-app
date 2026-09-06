/* PRISTEEL Finance Canonical v1
 * Live Finance hub + schema compatibility for the existing Finance UI.
 * Reads canonical production tables. Writes happen only after the existing
 * explicit human actions/confirmations; this module never auto-pays or auto-saves.
 */
(function(){
'use strict';
if(window.__pstFinanceCanonicalV1)return;
window.__pstFinanceCanonicalV1=true;

var seq=0,refreshTimer=0;
function A(v){return Array.isArray(v)?v:[];}
function N(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function S(v){return String(v==null?'':v);}
function today(){return new Date().toISOString().slice(0,10);}
function eur(v){return N(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function isEur(r){return S(r&&r.currency||'EUR').toUpperCase()==='EUR';}
function sum(rows,pick){return A(rows).reduce(function(s,r){return s+(isEur(r)?N(pick(r)):0);},0);}
function unpaid(rows){return A(rows).filter(function(r){return !r.paid;});}
function overdue(rows){var t=today();return unpaid(rows).filter(function(r){return r.due_date&&r.due_date<t;});}
function api(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('PPPP API nuk është gati.'));return window.supaFetch(path,method,body);}
function salesAmount(r){return N(r.gross_amount)||N(r.total_price)||N(r.net_amount);}
function supplierAmount(r){return N(r.amount)||N(r.net_amount);}
function tile(id){
  var nodes=[].slice.call(document.querySelectorAll('#fin-hub-grid>div[onclick]'));
  return nodes.filter(function(x){return S(x.getAttribute('onclick')).indexOf("finSwitchTab('"+id+"')")>=0;})[0]||null;
}
function liveBox(card,primary,secondary,tone){
  if(!card)return;
  var old=card.querySelector('[data-fin-live]');if(!old){old=document.createElement('div');old.setAttribute('data-fin-live','1');card.appendChild(old);}
  old.className='pst-fin-live '+(tone||'');
  old.innerHTML='<b>'+S(primary)+'</b><span>'+S(secondary)+'</span>';
}
function installStyle(){
  if(document.getElementById('pst-finance-canonical-style'))return;
  var s=document.createElement('style');s.id='pst-finance-canonical-style';s.textContent='\
#fin-hub-grid>div[onclick]{min-height:142px!important}\
.pst-fin-live{margin-top:auto;padding-top:10px;border-top:1px solid #EEF1F4;display:grid;gap:2px}\
.pst-fin-live b{font-size:13px;color:#243447}.pst-fin-live span{font-size:9.5px;color:#7A8798;line-height:1.35}\
.pst-fin-live.warn b{color:#9A5C28}.pst-fin-live.bad b{color:#9A514C}.pst-fin-live.ok b{color:#506E58}\
';document.head.appendChild(s);
}
async function snapshot(){
  var r=await Promise.all([
    api('invoices_out?select=id,gross_amount,total_price,net_amount,currency,paid,due_date,payment_date&order=date.desc').catch(function(){return[];}),
    api('invoices_in?select=id,amount,net_amount,currency,paid,due_date,payment_date&order=date.desc').catch(function(){return[];}),
    api('expenses?select=id,amount,currency,date,due_date,paid,payment_date&order=date.desc').catch(function(){return[];}),
    api('tax_obligations?select=id,tax_type,period,base_amount,tax_amount,due_date,status,payment_date&order=due_date.asc').catch(function(){return[];}),
    api('bank_guarantees?select=id,status,amount_guaranteed,fee_amount,currency,expiry_date').catch(function(){return[];}),
    api('other_costs?select=id&limit=1000').catch(function(){return[];})
  ]);
  return{sales:A(r[0]),suppliers:A(r[1]),expenses:A(r[2]),taxes:A(r[3]),guarantees:A(r[4]),other:A(r[5])};
}
async function hydrate(){
  installStyle();var g=document.getElementById('fin-hub-grid');if(!g||!g.children.length)return false;
  var my=++seq;
  ['inv','supp','exp','atk','tax','aging','bg','oc'].forEach(function(id){liveBox(tile(id),'Duke ngarkuar…','Të dhëna live nga Financat');});
  var d=await snapshot();if(my!==seq)return false;
  var su=unpaid(d.sales),iu=unpaid(d.suppliers),eu=unpaid(d.expenses),so=overdue(d.sales),io=overdue(d.suppliers),eo=overdue(d.expenses);
  var salesTotal=sum(d.sales,salesAmount),salesUnpaid=sum(su,salesAmount),suppTotal=sum(d.suppliers,supplierAmount),suppUnpaid=sum(iu,supplierAmount),expTotal=sum(d.expenses,function(x){return x.amount;}),expUnpaid=sum(eu,function(x){return x.amount;});
  liveBox(tile('inv'),d.sales.length+' fatura · '+eur(salesTotal),su.length+' pa paguar · '+eur(salesUnpaid),so.length?'bad':'ok');
  liveBox(tile('supp'),d.suppliers.length+' fatura · '+eur(suppTotal),iu.length+' pa paguar · '+eur(suppUnpaid),io.length?'bad':'ok');
  liveBox(tile('exp'),d.expenses.length+' shpenzime · '+eur(expTotal),eu.length+' pa paguar · '+eur(expUnpaid),eo.length?'warn':'ok');
  var taxOpen=d.taxes.filter(function(x){return S(x.status).toLowerCase()!=='paid';}),taxOver=taxOpen.filter(function(x){return x.due_date&&x.due_date<today();});
  liveBox(tile('atk'),d.taxes.length+' obligime',taxOpen.length+' të hapura'+(taxOver.length?' · '+taxOver.length+' me vonesë':''),taxOver.length?'bad':'ok');
  var taxAmt=taxOpen.reduce(function(s,x){return s+N(x.tax_amount);},0);
  liveBox(tile('tax'),eur(taxAmt)+' detyrime të hapura',d.taxes.length?d.taxes.length+' regjistrime canonical':'0 regjistrime',taxOver.length?'bad':'ok');
  var dueCount=so.length+io.length+eo.length;
  liveBox(tile('aging'),dueCount+' me vonesë',(su.length+iu.length+eu.length)+' pagesa të hapura',dueCount?'bad':'ok');
  var activeBg=d.guarantees.filter(function(x){return ['expired','closed','released','cancelled'].indexOf(S(x.status).toLowerCase())<0;});
  liveBox(tile('bg'),activeBg.length+' aktive',eur(sum(activeBg,function(x){return x.amount_guaranteed;}))+' vlerë e garantuar',activeBg.length?'warn':'ok');
  liveBox(tile('oc'),d.other.length+' regjistrime','Kosto të tjera operative',d.other.length?'warn':'ok');
  return true;
}
function refreshHubSoon(){
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(function(){refreshTimer=0;hydrate().catch(function(){});},35);
}
function chainWrap(name,marker,after){
  var cur=window[name];if(typeof cur!=='function'||cur[marker])return false;
  var w=function(){var out=cur.apply(this,arguments);try{after.apply(this,arguments);}catch(e){}return out;};
  w[marker]=true;w.__base=cur;
  if(cur.__pstStabilityV2)w.__pstStabilityV2=true;
  if(cur.__pstFinanceBase)w.__pstFinanceBase=cur.__pstFinanceBase;
  window[name]=w;return true;
}
function installHub(){
  var hubWrapped=chainWrap('finShowHub','__pstFinanceCanonicalHubV1',function(){refreshHubSoon();});
  chainWrap('finSwitchTab','__pstFinanceCanonicalTabV1',function(tab){if(tab==='atk')setTimeout(renderTaxCanonical,180);});
  var g=document.getElementById('fin-hub-grid');if(g&&g.children.length&&(hubWrapped||!g.querySelector('[data-fin-live]')))refreshHubSoon();
}
function refValue(id){var e=document.getElementById(id);return e?S(e.value).trim():'';}
function confirmDo(msg){return typeof window.confirm!=='function'||window.confirm(msg);}
function alertErr(e){if(typeof window.alert==='function')window.alert('Gabim: '+S(e&&e.message||e));}
function refreshTab(tab){if(typeof window.finSwitchTab==='function')setTimeout(function(){window.finSwitchTab(tab);},20);refreshHubSoon();}
function installCanonicalWrites(){
  window.finMarkPaid=async function(kind,id){
    if(!confirmDo('A jeni i sigurt që kjo faturë është paguar sot?'))return;
    try{await api((kind==='out'?'invoices_out':'invoices_in')+'?id=eq.'+encodeURIComponent(id),'PATCH',{paid:true,payment_date:today()});refreshTab('aging');}catch(e){alertErr(e);}
  };
  window.finMarkPaid.__pstFinanceCanonicalV1=true;
  window.expSave=async function(){
    var amt=N(refValue('exp-amt'));if(!(amt>0)){if(window.alert)window.alert('Shkruaj shumën.');return;}
    if(!confirmDo('A jeni i sigurt që doni ta ruani këtë shpenzim?'))return;
    var paid=refValue('exp-paid')==='true',supplier=refValue('exp-sup'),nr=refValue('exp-nr'),vat=refValue('exp-vat'),notes=refValue('exp-notes'),desc=[];
    if(supplier)desc.push('Furnitori: '+supplier);if(nr)desc.push('Fatura: '+nr);if(vat)desc.push('TVSH e deklaruar në formular: '+vat+'%');
    var rec={category:refValue('exp-cat')||'other',amount:amt,date:refValue('exp-date')||today(),due_date:refValue('exp-due')||null,currency:'EUR',paid:paid,payment_date:paid?today():null,description:desc.join(' · ')||null,notes:notes||null};
    try{await api('expenses','POST',rec);var f=document.getElementById('exp-form');if(f)f.style.display='none';refreshTab('exp');}catch(e){alertErr(e);}
  };
  window.expSave.__pstFinanceCanonicalV1=true;
  window.expMarkPaid=async function(id){if(!confirmDo('A jeni i sigurt që ky shpenzim është paguar sot?'))return;try{await api('expenses?id=eq.'+encodeURIComponent(id),'PATCH',{paid:true,payment_date:today()});refreshTab('exp');}catch(e){alertErr(e);}};
  window.expMarkPaid.__pstFinanceCanonicalV1=true;
  window.atkSave=async function(){
    var amt=N(refValue('atk-amt')),period=refValue('atk-period'),due=refValue('atk-due');if(!period||!due){if(window.alert)window.alert('Plotëso periudhën dhe afatin e pagesës.');return;}if(!confirmDo('A jeni i sigurt që doni ta ruani këtë detyrim tatimor?'))return;
    var year=refValue('atk-year'),paid=refValue('atk-paid')==='true',ref=refValue('atk-ref'),notes=refValue('atk-notes');if(year&&period.indexOf(year)<0)period=period+' · '+year;
    var n=[ref?'Referenca: '+ref:'',notes].filter(Boolean).join(' · ');
    var rec={tax_type:refValue('atk-type'),period:period,base_amount:0,tax_amount:amt,due_date:due,status:paid?'paid':'open',payment_date:paid?today():null,notes:n||null};
    try{await api('tax_obligations','POST',rec);var f=document.getElementById('atk-form');if(f)f.style.display='none';refreshTab('atk');}catch(e){alertErr(e);}
  };
  window.atkSave.__pstFinanceCanonicalV1=true;
  window.atkMarkPaid=async function(id){if(!confirmDo('A jeni i sigurt që ky detyrim është paguar sot?'))return;try{await api('tax_obligations?id=eq.'+encodeURIComponent(id),'PATCH',{status:'paid',payment_date:today()});refreshTab('atk');}catch(e){alertErr(e);}};
  window.atkMarkPaid.__pstFinanceCanonicalV1=true;
}
async function renderTaxCanonical(){
  var list=document.getElementById('fin-atk-list');if(!list)return false;
  try{var rows=A(await api('tax_obligations?select=id,tax_type,period,base_amount,tax_amount,due_date,status,payment_date,notes&order=due_date.asc'));var open=rows.filter(function(r){return S(r.status).toLowerCase()!=='paid';});
    if(!rows.length){list.innerHTML='<div style="padding:18px;color:var(--text3);font-size:11px">0 obligime tatimore të regjistruara.</div>';return true;}
    list.innerHTML='<div style="overflow:auto"><table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr><th>Lloji</th><th>Periudha</th><th>Afati</th><th style="text-align:right">Shuma</th><th>Statusi</th><th></th></tr></thead><tbody>'+rows.map(function(r){var paid=S(r.status).toLowerCase()==='paid',late=!paid&&r.due_date&&r.due_date<today();return'<tr><td>'+S(r.tax_type||'—')+'</td><td>'+S(r.period||'—')+'</td><td>'+S(r.due_date||'—')+'</td><td style="text-align:right;font-weight:700">'+eur(r.tax_amount)+'</td><td>'+(paid?'Paguar':late?'Me vonesë':'Hapur')+'</td><td>'+(!paid?'<button class="btn btn-sm" onclick="atkMarkPaid(\''+r.id+'\')">Paguar</button>':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
    var sum=document.getElementById('fin-atk-sum');if(sum)sum.innerHTML='<div class="card" style="padding:10px 12px"><b>'+open.length+' obligime të hapura</b><div style="font-size:11px;color:var(--text3);margin-top:3px">'+eur(open.reduce(function(s,r){return s+N(r.tax_amount);},0))+'</div></div>';
    return true;
  }catch(e){list.innerHTML='<div style="padding:12px;color:var(--red-text);font-size:11px">Gabim: '+S(e.message)+'</div>';return false;}
}
function install(){installStyle();installHub();installCanonicalWrites();}
install();[120,500,1200].forEach(function(ms){setTimeout(install,ms);});document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTFinanceCanonicalV1={install:install,hydrate:hydrate,snapshot:snapshot,renderTaxCanonical:renderTaxCanonical};
})();