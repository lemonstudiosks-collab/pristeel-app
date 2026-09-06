/* PRISTEEL Finance Canonical v1
 * Read-only live KPIs for the existing Finance UI.
 * This layer never replaces Finance business-write handlers. The established
 * pristeel-finance.js remains the owner of explicit user-confirmed writes.
 */
(function(){
'use strict';
if(window.__pstFinanceCanonicalV1)return;
window.__pstFinanceCanonicalV1=true;

var seq=0,refreshTimer=0;
var VIEW_IDS=['inv','supp','exp','atk','tax','aging','bg','oc'];
function A(v){return Array.isArray(v)?v:[];}
function N(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function S(v){return String(v==null?'':v);}
function today(){return new Date().toISOString().slice(0,10);}
function eur(v){return N(v).toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';}
function isEur(r){return S(r&&r.currency||'EUR').toUpperCase()==='EUR';}
function sum(rows,pick){return A(rows).reduce(function(s,r){return s+(isEur(r)?N(pick(r)):0);},0);}
function unpaid(rows){return A(rows).filter(function(r){return !r.paid;});}
function overdue(rows){var t=today();return unpaid(rows).filter(function(r){return r.due_date&&r.due_date<t;});}
function api(path){
  if(typeof window.supaFetch!=='function')return Promise.reject(new Error('PPPP API nuk është gati.'));
  return Promise.resolve(window.supaFetch(path));
}
function read(name,path){
  return api(path).then(function(rows){return{name:name,rows:A(rows),error:null};}).catch(function(err){
    return{name:name,rows:[],error:err||new Error('Gabim i panjohur')};
  });
}
function salesAmount(r){return N(r.gross_amount)||N(r.net_amount);}
function supplierAmount(r){return N(r.amount)||N(r.net_amount);}
function tile(id){
  var nodes=[].slice.call(document.querySelectorAll('#fin-hub-grid>div[onclick]'));
  return nodes.filter(function(x){return S(x.getAttribute('onclick')).indexOf("finSwitchTab('"+id+"')")>=0;})[0]||null;
}
function liveBox(card,primary,secondary,tone){
  if(!card)return;
  var old=card.querySelector('[data-fin-live]');
  if(!old){old=document.createElement('div');old.setAttribute('data-fin-live','1');card.appendChild(old);}
  old.className='pst-fin-live '+(tone||'');old.textContent='';
  var b=document.createElement('b'),sp=document.createElement('span');
  b.textContent=S(primary);sp.textContent=S(secondary);old.appendChild(b);old.appendChild(sp);
}
function readError(id,label){liveBox(tile(id),'Gabim në lexim',label+' nuk u lexuan nga databaza.','bad');}
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
    read('sales','invoices_out?select=id,gross_amount,net_amount,currency,paid,due_date,paid_date&order=date.desc'),
    read('suppliers','invoices_in?select=id,amount,net_amount,currency,paid,due_date,paid_date&order=date.desc'),
    read('expenses','expenses?select=id,amount,currency,date,due_date,paid,paid_date&order=date.desc'),
    read('taxes','tax_obligations?select=id,tax_type,period_year,period_label,amount,due_date,paid,paid_date&order=due_date.asc'),
    read('guarantees','bank_guarantees?select=id,status,amount_guaranteed,fee_amount,expiry_date'),
    read('other','other_costs?select=id,amount,currency&limit=1000')
  ]);
  var out={};r.forEach(function(x){out[x.name]=x;});return out;
}
async function hydrate(){
  installStyle();var g=document.getElementById('fin-hub-grid');if(!g||!g.children.length)return false;
  var my=++seq;
  VIEW_IDS.forEach(function(id){liveBox(tile(id),'Duke ngarkuar…','Të dhëna live nga Financat');});
  var d=await snapshot();if(my!==seq)return false;

  if(d.sales.error){readError('inv','Faturat e shitjes');}
  else{var su=unpaid(d.sales.rows),so=overdue(d.sales.rows);liveBox(tile('inv'),d.sales.rows.length+' fatura · '+eur(sum(d.sales.rows,salesAmount)),su.length+' pa paguar · '+eur(sum(su,salesAmount)),so.length?'bad':'ok');}
  if(d.suppliers.error){readError('supp','Faturat e furnitorëve');}
  else{var iu=unpaid(d.suppliers.rows),io=overdue(d.suppliers.rows);liveBox(tile('supp'),d.suppliers.rows.length+' fatura · '+eur(sum(d.suppliers.rows,supplierAmount)),iu.length+' pa paguar · '+eur(sum(iu,supplierAmount)),io.length?'bad':'ok');}
  if(d.expenses.error){readError('exp','Shpenzimet');}
  else{var eu=unpaid(d.expenses.rows),eo=overdue(d.expenses.rows);liveBox(tile('exp'),d.expenses.rows.length+' shpenzime · '+eur(sum(d.expenses.rows,function(x){return x.amount;})),eu.length+' pa paguar · '+eur(sum(eu,function(x){return x.amount;})),eo.length?'warn':'ok');}
  if(d.taxes.error){readError('atk','Tatimet');readError('tax','Përmbledhja tatimore');}
  else{
    var taxOpen=d.taxes.rows.filter(function(x){return !x.paid;}),taxOver=overdue(d.taxes.rows),taxAmt=sum(taxOpen,function(x){return x.amount;});
    liveBox(tile('atk'),d.taxes.rows.length+' obligime',taxOpen.length+' të hapura'+(taxOver.length?' · '+taxOver.length+' me vonesë':''),taxOver.length?'bad':'ok');
    liveBox(tile('tax'),eur(taxAmt)+' detyrime të hapura',d.taxes.rows.length+' regjistrime',taxOver.length?'bad':'ok');
  }
  if(d.sales.error||d.suppliers.error||d.expenses.error){readError('aging','Afatet e pagesave');}
  else{
    var salesUnpaid=unpaid(d.sales.rows),supplierUnpaid=unpaid(d.suppliers.rows),expenseUnpaid=unpaid(d.expenses.rows);
    var dueCount=overdue(d.sales.rows).length+overdue(d.suppliers.rows).length+overdue(d.expenses.rows).length;
    liveBox(tile('aging'),dueCount+' me vonesë',(salesUnpaid.length+supplierUnpaid.length+expenseUnpaid.length)+' pagesa të hapura',dueCount?'bad':'ok');
  }
  if(d.guarantees.error){readError('bg','Garancitë bankare');}
  else{
    var activeBg=d.guarantees.rows.filter(function(x){return ['expired','closed','released','cancelled','skaduar','mbyllur','lëshuar'].indexOf(S(x.status).toLowerCase())<0;});
    var bgValue=activeBg.reduce(function(s,x){return s+N(x.amount_guaranteed);},0);
    liveBox(tile('bg'),activeBg.length+' aktive',eur(bgValue)+' vlerë e garantuar',activeBg.length?'warn':'ok');
  }
  if(d.other.error){readError('oc','Kostot e tjera');}
  else{liveBox(tile('oc'),d.other.rows.length+' regjistrime',eur(sum(d.other.rows,function(x){return x.amount;}))+' kosto të tjera',d.other.rows.length?'warn':'ok');}
  return true;
}
function refreshHubSoon(){
  if(refreshTimer)clearTimeout(refreshTimer);
  refreshTimer=setTimeout(function(){refreshTimer=0;hydrate().catch(function(){VIEW_IDS.forEach(function(id){readError(id,'Financat');});});},35);
}
function chainWrap(name,marker,after){
  var cur=window[name];if(typeof cur!=='function'||cur[marker])return false;
  var w=function(){var out=cur.apply(this,arguments);try{after.apply(this,arguments);}catch(e){}return out;};
  w[marker]=true;w.__base=cur;
  if(cur.__pstStabilityV2)w.__pstStabilityV2=true;
  if(cur.__pstFinanceBase)w.__pstFinanceBase=cur.__pstFinanceBase;
  window[name]=w;return true;
}
function forceSubview(tab){
  if(VIEW_IDS.indexOf(tab)<0)return;
  var hub=document.getElementById('fin-hub'),tabs=document.getElementById('fin-tabs');
  if(hub)hub.style.display='none';if(tabs)tabs.style.display='flex';
  VIEW_IDS.forEach(function(v){var el=document.getElementById('fin-view-'+v);if(el)el.style.display=(v===tab)?'':'none';});
}
function installSwitch(){
  return chainWrap('finSwitchTab','__pstFinanceCanonicalSwitchV2',function(tab){
    forceSubview(S(tab));
    setTimeout(function(){forceSubview(S(tab));},0);
  });
}
function installHub(){
  var wrapped=chainWrap('finShowHub','__pstFinanceCanonicalHubV2',refreshHubSoon);
  var g=document.getElementById('fin-hub-grid');if(g&&g.children.length&&(wrapped||!g.querySelector('[data-fin-live]')))refreshHubSoon();
}
function computedVisible(el){
  if(!el||el.hidden)return false;
  try{var cs=window.getComputedStyle&&window.getComputedStyle(el);if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;}catch(e){}
  return !(el.style&&el.style.display==='none');
}
function safeSurfaceReady(){
  var p=document.getElementById('page-finance');if(!p||!p.classList.contains('active')||!computedVisible(p))return false;
  var hub=document.getElementById('fin-hub'),grid=document.getElementById('fin-hub-grid');
  if(computedVisible(hub)&&grid&&grid.children&&grid.children.length)return true;
  return VIEW_IDS.some(function(v){return computedVisible(document.getElementById('fin-view-'+v));});
}
function installSafeActivationObserver(){
  var p=document.getElementById('page-finance');if(!p)return false;
  var old=p.__pstFinanceStabilityObserver;
  if(old&&old!==p.__pstFinanceCanonicalObserver&&typeof old.disconnect==='function')old.disconnect();
  if(p.__pstFinanceCanonicalObserver)return true;
  if(typeof MutationObserver!=='function')return false;
  var o=new MutationObserver(function(){
    if(!p.classList.contains('active')||safeSurfaceReady())return;
    setTimeout(function(){
      if(!p.classList.contains('active')||safeSurfaceReady())return;
      var r=window.PSTFinanceStabilityV2;if(r&&typeof r.recoverFinance==='function')r.recoverFinance();
    },70);
  });
  o.observe(p,{attributes:true,attributeFilter:['class','style','hidden']});
  p.__pstFinanceCanonicalObserver=o;
  return true;
}
function install(){installStyle();installSwitch();installHub();installSafeActivationObserver();}
install();
[120,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTFinanceCanonicalV1={install:install,hydrate:hydrate,snapshot:snapshot,forceSubview:forceSubview,safeSurfaceReady:safeSurfaceReady,installSafeActivationObserver:installSafeActivationObserver};
})();