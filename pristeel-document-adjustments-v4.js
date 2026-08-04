/* PRISTEEL credit/debit notes v4
 * Recovers invoice lines from legacy records, snapshots and linked offers.
 * Keeps v3 calculation/save logic, but prevents silent fallback to gross manual mode.
 */
(function(){
'use strict';
if(window.__pstDocumentAdjustmentsV4Loaded)return;
window.__pstDocumentAdjustmentsV4Loaded=true;

function parse(v){
  for(var i=0;i<5&&typeof v==='string';i++){
    if(!v.trim())return null;
    try{v=JSON.parse(v);}catch(e){break;}
  }
  return v;
}
function num(v){
  if(v===undefined||v===null||v==='')return 0;
  if(typeof v==='string')v=v.replace(/\s/g,'').replace(/,(?=\d{1,6}$)/,'.');
  var n=parseFloat(v);return isFinite(n)?n:0;
}
function first(){
  for(var i=0;i<arguments.length;i++){
    var v=arguments[i];
    if(v!==undefined&&v!==null&&v!=='')return v;
  }
  return '';
}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}

function itemScore(x){
  x=parse(x);
  if(!x||typeof x!=='object'||Array.isArray(x))return 0;
  var score=0;
  if(first(x.desc,x.description,x.pershkrimi,x.name,x.label,x.product,x.material,x.profile,x.profil))score+=3;
  if(first(x.kg,x.total_kg,x.kg_total,x.weight,x.weight_kg,x.total_weight,x.quantity_kg))score+=4;
  if(first(x.priceKg,x.price_kg,x.pricePerKg,x.price_per_kg,x.unit_price,x.unitPrice,x.cmimi_kg))score+=4;
  if(first(x.amount,x.total,x.total_eur,x.line_total,x.sum,x.shuma))score+=1;
  return score;
}
function arrayScore(a){
  if(!Array.isArray(a)||!a.length)return 0;
  return a.slice(0,20).reduce(function(s,x){return s+itemScore(x);},0);
}
function findBestArray(root){
  root=parse(root);
  var best=[],bestScore=0,seen=[];
  function walk(v,depth){
    v=parse(v);if(v==null||depth>6)return;
    if(typeof v==='object'){
      if(seen.indexOf(v)>-1)return;seen.push(v);
    }
    if(Array.isArray(v)){
      var s=arrayScore(v);
      if(s>bestScore){best=v;bestScore=s;}
      v.slice(0,80).forEach(function(x){walk(x,depth+1);});
      return;
    }
    if(typeof v==='object'){
      var preferred=['items','invoice_items','line_items','positions','rows','items_json','details','materials','products','offer_items','data','metadata','payload','invoice_state','offer_state','quote_state','document_state'];
      preferred.forEach(function(k){if(Object.prototype.hasOwnProperty.call(v,k))walk(v[k],depth+1);});
      Object.keys(v).slice(0,120).forEach(function(k){if(preferred.indexOf(k)<0)walk(v[k],depth+1);});
    }
  }
  walk(root,0);
  return bestScore>=4?best:[];
}
function normalizeItem(r){
  r=parse(r)||{};
  if(typeof r!=='object')r={desc:String(r)};
  var desc=first(r.desc,r.description,r.pershkrimi,r.name,r.label,r.product,r.material,r.item_description,'');
  if(!desc)desc=[first(r.profile,r.profil,''),first(r.dim,r.dimension,r.dimensions,''),first(r.grade,r.material_grade,''),first(r.std,r.standard,'')].filter(Boolean).join(' ');
  var kg=num(first(r.kg,r.total_kg,r.kg_total,r.weight,r.weight_kg,r.totalWeight,r.total_weight,r.quantity_kg,''));
  var price=num(first(r.priceKg,r.price_kg,r.pricePerKg,r.price_per_kg,r.unit_price,r.unitPrice,r.cmimi_kg,r.price,''));
  var amount=num(first(r.amount,r.total,r.total_eur,r.line_total,r.sum,r.shuma,''));
  if(!kg&&amount&&price)kg=amount/price;
  if(!price&&amount&&kg)price=amount/kg;
  return{desc:String(desc||'Pozicion i faturës'),kg:kg||0,priceKg:price||0,source:r};
}
function usable(items){return Array.isArray(items)&&items.some(function(x){return num(x.kg)>0||num(x.priceKg)>0;});}
function snapshotFor(r){
  var nr=String(r&&r.invoice_nr||'').trim();if(!nr)return null;
  try{return parse(localStorage.getItem('pst_invoice_snapshot_'+nr));}catch(e){return null;}
}
function linkedOffer(r){
  var D=window.PST_DOC_CENTER||{},quotes=Array.isArray(D.quotes)?D.quotes:[];
  var refs=[r.quote_doc_nr,r.offer_nr,r.ref,r.reference].filter(Boolean).map(function(x){return String(x).toUpperCase().replace(/[^A-Z0-9]/g,'');});
  var project=String(r.project||'').toLowerCase().trim(),client=String(r.client||'').toLowerCase().trim();
  var best=null,bestScore=0;
  quotes.forEach(function(q){
    var score=0,qn=String(q.doc_nr||q.quote_nr||q.ref||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
    if(qn&&refs.indexOf(qn)>-1)score+=10;
    if(project&&String(q.project||'').toLowerCase().trim()===project)score+=4;
    if(client&&String(q.client||'').toLowerCase().trim()===client)score+=2;
    if(score>bestScore){best=q;bestScore=score;}
  });
  return bestScore>=4?best:null;
}
function textHints(r){
  var text='';try{text=JSON.stringify(r||{});}catch(e){}
  var price=0,kg=0,m;
  m=text.match(/(\d+(?:[\.,]\d+)?)\s*(?:EUR|€)\s*\/?\s*kg/i);if(m)price=num(m[1]);
  if(!price){m=text.match(/(?:price|çmimi|preis)[^0-9]{0,20}(\d+(?:[\.,]\d+)?)[^a-z0-9]{0,8}(?:EUR|€)?\s*\/?\s*kg/i);if(m)price=num(m[1]);}
  m=text.match(/(\d+(?:[\.,]\d+)?)\s*kg/i);if(m)kg=num(m[1]);
  return{kg:kg,price:price};
}
function deriveSingle(r){
  var h=textHints(r);
  var kg=num(first(r.total_kg,r.weight_kg,r.weight,r.theoretical_weight,r.quantity_kg,h.kg,''));
  var price=num(first(r.price_kg,r.priceKg,r.unit_price,r.cmimi_kg,h.price,''));
  var gross=num(first(r.gross_amount,r.total_price,r.total_eur,''));
  var rate=r.vat_applicable?num(r.vat_rate):0;
  var net=rate?gross/(1+rate/100):gross;
  net-=num(first(r.transport_cost,r.transport,''));
  var extras=findBestArray(first(r.extra_costs,r.other_costs,r.costs,[]));
  extras.forEach(function(x){net-=num(first(x.amount,x.total,x.sum,x.shuma,''));});
  if(!kg&&price&&net>0)kg=net/price;
  if(!price&&kg&&net>0)price=net/kg;
  if(!kg&&!price)return[];
  return[{desc:String(first(r.project,r.reference,'Pozicion i faturës')),kg:kg||0,priceKg:price||0,_derived:true}];
}
function recoverItems(r){
  var candidates=[r,snapshotFor(r),linkedOffer(r)];
  for(var i=0;i<candidates.length;i++){
    if(!candidates[i])continue;
    var a=findBestArray(candidates[i]).map(normalizeItem);
    if(usable(a))return a;
  }
  return deriveSingle(r);
}
function enrichRows(rows){
  return (Array.isArray(rows)?rows:[]).map(function(r){
    var copy=clone(r)||r;
    var existing=findBestArray(copy).map(normalizeItem);
    if(!usable(existing))existing=recoverItems(copy);
    if(existing.length){copy.items=existing;copy.invoice_items=existing;copy.__pstRecoveredItems=true;}
    return copy;
  });
}
function selectedRecord(){
  var D=window.PST_DOC_CENTER||{},id=String((document.getElementById('pst-adj-invoice')||{}).value||'');
  return (Array.isArray(D.invoices)?D.invoices:[]).filter(function(r){return String(r.id)===id;})[0]||null;
}
function fallbackBox(){
  var method=document.getElementById('pst-adj-method');
  var lines=document.getElementById('pst-adj-v3-lines');
  if(!method||!lines||method.value!=='manual'||document.getElementById('pst-adj-v4-recovery'))return;
  var r=selectedRecord();if(!r)return;
  var hint=deriveSingle(r)[0]||{};
  var wrap=document.createElement('div');wrap.id='pst-adj-v4-recovery';wrap.style.cssText='margin-top:14px;border:1px solid #bfdde8;background:#f4fafc;border-radius:11px;padding:14px';
  wrap.innerHTML='<div style="font-size:12px;font-weight:750;color:#326f87;margin-bottom:4px">Plotëso të dhënat e peshës së faturës</div><div style="font-size:10.5px;color:#66747b;line-height:1.5;margin-bottom:12px">Kjo faturë e vjetër nuk i ka ruajtur pozicionet në regjistër. Plotëso këto fusha një herë dhe sistemi vazhdon me llogaritjen automatike.</div><div style="display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:9px"><label style="font-size:9px;font-weight:700;color:#7a858b">PËRSHKRIMI<input id="pst-adj-v4-desc" value="'+esc(first(r.project,'Materiali i faturuar'))+'" style="display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #d7e2e6;border-radius:8px"></label><label style="font-size:9px;font-weight:700;color:#7a858b">KG TË FATURUARA<input id="pst-adj-v4-billed" type="number" min="0" step="0.001" value="'+(num(hint.kg)||'')+'" style="display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #d7e2e6;border-radius:8px"></label><label style="font-size:9px;font-weight:700;color:#7a858b">PESHA REALE<input id="pst-adj-v4-actual" type="number" min="0" step="0.001" value="" style="display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #d7e2e6;border-radius:8px"></label><label style="font-size:9px;font-weight:700;color:#7a858b">ÇMIMI/KG<input id="pst-adj-v4-price" type="number" min="0" step="0.000001" value="'+(num(hint.priceKg)||'')+'" style="display:block;width:100%;margin-top:5px;padding:9px;border:1px solid #d7e2e6;border-radius:8px"></label></div><button type="button" onclick="pstAdjV4UseRecovery()" style="margin-top:11px;border:0;border-radius:8px;background:linear-gradient(135deg,#67a8c0,#3f7f98);color:#fff;padding:9px 14px;font-size:10.5px;font-weight:750;cursor:pointer">Llogarit sipas peshës</button>';
  lines.parentNode.insertBefore(wrap,lines.parentNode.firstChild);
  var manual=document.getElementById('pst-adj-v3-manual-wrap');if(manual)manual.style.display='none';
}
window.pstAdjV4UseRecovery=function(){
  var r=selectedRecord();if(!r)return;
  var desc=String((document.getElementById('pst-adj-v4-desc')||{}).value||'Materiali i faturuar').trim();
  var billed=num((document.getElementById('pst-adj-v4-billed')||{}).value);
  var actual=num((document.getElementById('pst-adj-v4-actual')||{}).value);
  var price=num((document.getElementById('pst-adj-v4-price')||{}).value);
  if(billed<=0){alert('Vendos kilogramët e faturuar.');return;}
  if(price<=0){alert('Vendos çmimin për kg.');return;}
  r.items=[{desc:desc,kg:billed,priceKg:price}];r.invoice_items=r.items;
  var method=document.getElementById('pst-adj-method');if(method)method.value='weight';
  if(typeof window.pstAdjV3InvoiceChanged==='function')window.pstAdjV3InvoiceChanged();
  setTimeout(function(){
    var input=document.querySelector('#pst-adj-v3-row-0 input[type="number"]');if(input)input.value=actual;
    if(typeof window.pstAdjV3Change==='function')window.pstAdjV3Change(0,'actual',actual);
  },20);
};

function install(){
  var base=window.pstOpenAdjustment;
  if(typeof base!=='function'||base.__pstV4Wrapped)return false;
  var wrapped=async function(type,invoiceId){
    var real=window.supaFetch;
    if(typeof real!=='function')return base.apply(this,arguments);
    window.supaFetch=async function(path){
      var args=Array.prototype.slice.call(arguments,1);
      var result=await real.apply(window,[path].concat(args));
      if(typeof path==='string'&&path.indexOf('invoices_out?')===0&&Array.isArray(result))return enrichRows(result);
      return result;
    };
    try{return await base.call(this,type,invoiceId);}
    finally{
      window.supaFetch=real;
      setTimeout(fallbackBox,60);
      setTimeout(fallbackBox,220);
    }
  };
  wrapped.__pstV4Wrapped=true;wrapped.__pstBase=base;
  window.pstOpenAdjustment=wrapped;
  return true;
}
var tries=0,t=setInterval(function(){if(install()||++tries>160)clearInterval(t);},100);
install();
})();
