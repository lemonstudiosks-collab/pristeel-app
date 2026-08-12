/* PRISTEEL supplier offer currency v1
 * Additive layer over the existing supplier-offer editor.
 * Keeps position prices in the quoted/original currency and stores:
 *   total_amount = original-currency total
 *   exchange_rate_to_eur = explicit rate (EUR = 1)
 *   total_eur = normalized EUR total
 * Foreign-currency saves fail closed when the FX rate is missing.
 */
(function(){
'use strict';
if(window.PSTSupplierOfferCurrencyV1)return;

function num(v){var n=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(n)?n:0;}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function currency(){var e=document.getElementById('oe-currency');return String(e&&e.value||'EUR').trim().toUpperCase()||'EUR';}
function fx(){var c=currency();if(c==='EUR')return 1;var e=document.getElementById('oe-fx'),r=num(e&&e.value);return r>0?r:null;}
function inferUnit(positions){
  var seen={};
  (Array.isArray(positions)?positions:[]).forEach(function(p){var u=String(p&&p.unit||'').trim().toLowerCase();if(u)seen[u]=1;});
  var units=Object.keys(seen);return units.length===1?units[0]:(units.length>1?'mixed':null);
}
function setMsg(text,err){var e=document.getElementById('oe-msg');if(e){e.textContent=text||'';e.className='oe-msg'+(err?' err':'');}}
function ensureControls(){
  if(document.getElementById('pst-so-currency-row'))return true;
  var bg=document.getElementById('oe-bg');if(!bg)return false;
  var sections=[].slice.call(bg.querySelectorAll('.oe-sec'));
  var posSec=sections.find(function(x){return /pozicionet/i.test(x.textContent||'');});
  if(!posSec)return false;
  var row=document.createElement('div');row.id='pst-so-currency-row';row.className='oe-g oe-g2';row.style.marginBottom='12px';
  row.innerHTML='<div class="oe-f"><label>Valuta e ofertës</label><select id="oe-currency"><option>EUR</option><option>USD</option><option>CHF</option><option>GBP</option></select><div class="oe-hint">Çmimet e pozicioneve ruhen në këtë valutë.</div></div>'
    +'<div class="oe-f" id="oe-fx-wrap"><label id="oe-fx-label">Kursi → EUR</label><input id="oe-fx" class="num" inputmode="decimal" placeholder="p.sh. 0.8600"><div class="oe-hint" id="oe-fx-hint">Kërkohet për valutë të huaj. Nuk supozohet automatikisht.</div></div>';
  posSec.parentNode.insertBefore(row,posSec);
  document.getElementById('oe-currency').addEventListener('change',function(){updateUi();if(typeof window.pstCalc==='function')window.pstCalc();});
  document.getElementById('oe-fx').addEventListener('input',function(){updateUi();});
  return true;
}
function replaceLabelFor(id,text){var e=document.getElementById(id);var l=e&&e.closest('.oe-f')&&e.closest('.oe-f').querySelector('label');if(l)l.textContent=text;}
function relabelMoney(){
  var c=currency(),sum=document.getElementById('oe-sum');
  if(sum){sum.innerHTML=sum.innerHTML.replace(/€\/kg/g,c+'/kg').replace(/\s€(?=<|\s|$)/g,' '+c);}
  document.querySelectorAll('[id^="oe-t"]').forEach(function(e){if(/\s€$/.test(e.textContent||''))e.textContent=e.textContent.replace(/\s€$/,' '+c);});
}
function updateUi(){
  if(!ensureControls())return;
  var c=currency(),wrap=document.getElementById('oe-fx-wrap'),rate=fx();
  if(wrap)wrap.style.display=c==='EUR'?'none':'';
  var fl=document.getElementById('oe-fx-label');if(fl)fl.textContent='Kursi '+c+' → EUR';
  var fh=document.getElementById('oe-fx-hint');if(fh)fh.textContent=c==='EUR'?'EUR raportohet 1:1.':'1 '+c+' = sa EUR. Kërkohet para ruajtjes.';
  replaceLabelFor('oe-zinc','Zinktim '+c+'/kg');
  replaceLabelFor('oe-transp','Transport '+c);
  var th=document.querySelectorAll('.oe-tbl thead th');
  if(th.length>=8){th[5].textContent='Çmimi '+c+'/njësi';th[6].textContent='Pas negocimit '+c;th[7].textContent='Totali '+c;}
  relabelMoney();
  var msg=document.getElementById('pst-so-fx-preview');
  if(!msg){msg=document.createElement('div');msg.id='pst-so-fx-preview';msg.className='oe-hint';var f=document.getElementById('oe-fx-wrap');if(f)f.appendChild(msg);}
  if(msg)msg.textContent=(c!=='EUR'&&rate)?('Kurs i regjistrimit: 1 '+c+' = '+rate+' EUR'):'';
}
function setControls(c,r){
  if(!ensureControls())return;
  var cur=document.getElementById('oe-currency'),rate=document.getElementById('oe-fx');
  c=String(c||'EUR').toUpperCase();if(!/^(EUR|USD|CHF|GBP)$/.test(c))c='EUR';
  cur.value=c;rate.value=c==='EUR'?'1':(num(r)>0?String(r):'');updateUi();
}
function wrapCalc(){
  var base=window.pstCalc;if(typeof base!=='function'||base.__pstSupplierCurrencyV1)return false;
  var wrapped=function(){var out=base.apply(this,arguments);updateUi();return out;};
  wrapped.__pstSupplierCurrencyV1=true;wrapped.__base=base;window.pstCalc=wrapped;return true;
}
function wrapOpen(){
  var base=window.pstOpenOffer;if(typeof base!=='function'||base.__pstSupplierCurrencyV1)return false;
  var wrapped=async function(offerId,projectId){
    var out=await base.apply(this,arguments);ensureControls();
    var c='EUR',r=1;
    if(offerId&&typeof window.supaFetch==='function'){
      try{var rows=await window.supaFetch('offers?id=eq.'+enc(offerId)+'&select=currency,exchange_rate_to_eur,total_amount,total_eur,pricing_unit&limit=1');var row=rows&&rows[0];if(row){c=row.currency||'EUR';r=row.exchange_rate_to_eur;}}catch(e){}
    }
    setControls(c,r);if(typeof window.pstCalc==='function')window.pstCalc();return out;
  };
  wrapped.__pstSupplierCurrencyV1=true;wrapped.__base=base;window.pstOpenOffer=wrapped;return true;
}
function wrapSave(){
  var base=window.pstSaveOffer;if(typeof base!=='function'||base.__pstSupplierCurrencyV1)return false;
  var wrapped=async function(){
    ensureControls();var c=currency(),rate=fx();
    if(c!=='EUR'&&!(rate>0)){setMsg('Vendos kursin '+c+' → EUR para ruajtjes. Valuta e huaj nuk ruhet pa kurs explicit.',true);var e=document.getElementById('oe-fx');if(e)e.focus();return false;}
    rate=rate||1;
    var rawFetch=window.supaFetch;
    if(typeof rawFetch!=='function')return base.apply(this,arguments);
    window.supaFetch=function(path,method,body){
      var m=String(method||'GET').toUpperCase(),isWrite=(m==='POST'||m==='PATCH'),isOffer=/^offers(?:\?|$)/.test(String(path||''));
      var isCoreSave=isOffer&&isWrite&&body&&typeof body==='object'&&(Object.prototype.hasOwnProperty.call(body,'positions')||Object.prototype.hasOwnProperty.call(body,'total_eur'));
      if(isCoreSave){
        var rec=Object.assign({},body),original=num(body.total_eur),unit=inferUnit(body.positions);
        rec.currency=c;rec.exchange_rate_to_eur=rate;rec.total_amount=original;rec.total_eur=+(original*rate).toFixed(6);
        if(unit)rec.pricing_unit=unit;
        return rawFetch.call(this,path,method,rec);
      }
      return rawFetch.apply(this,arguments);
    };
    try{return await base.apply(this,arguments);}finally{window.supaFetch=rawFetch;}
  };
  wrapped.__pstSupplierCurrencyV1=true;
  wrapped.__pstEmailRateWrapped=!!base.__pstEmailRateWrapped;
  wrapped.__base=base;window.pstSaveOffer=wrapped;return true;
}
function install(){var a=wrapCalc(),b=wrapOpen(),c=wrapSave();return a||b||c;}

install();
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTSupplierOfferCurrencyV1={install:install,ensureControls:ensureControls,updateUi:updateUi,setControls:setControls,inferUnit:inferUnit,_test:{fx:fx,currency:currency}};
})();