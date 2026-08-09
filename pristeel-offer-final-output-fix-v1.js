/* PRISTEEL generated commercial offer output fix v1
 * - Never uses the project name as a fallback profile.
 * - Ensures commercial component rows (base/zinc/powder/transport/installation) reach the generated offer.
 * - Payment default is "according to agreement" unless a user explicitly chooses another term.
 * - Additive only: does not mutate supplier/source offers.
 */
(function(){
'use strict';
if(window.__pstOfferFinalOutputFixV1)return;
window.__pstOfferFinalOutputFixV1=true;

function E(id){return document.getElementById(id);}
function n(v){var x=parseFloat(String(v==null?'':v).replace(',','.'));return isFinite(x)?x:0;}
function lang(){return String((E('of-lang')||{value:'sr'}).value||'sr');}
function labels(){
  var l=lang();
  var M={
    sq:{agreement:'Sipas marrëveshjes',base:'Konstruksion çeliku',zinc:'Zinkim i nxehtë (EN ISO 1461)',coat:'Ngjyrosje Powder Coating pas zinktimit',transport:'Transporti',install:'Montimi i konstruksionit metalik'},
    en:{agreement:'As agreed',base:'Steel construction',zinc:'Hot-dip galvanizing (EN ISO 1461)',coat:'Powder coating after galvanizing',transport:'Transport',install:'Installation of the steel structure'},
    de:{agreement:'Nach Vereinbarung',base:'Stahlkonstruktion',zinc:'Feuerverzinkung (EN ISO 1461)',coat:'Pulverbeschichtung nach Verzinkung',transport:'Transport',install:'Montage der Stahlkonstruktion'},
    sr:{agreement:'Po dogovoru',base:'Čelična konstrukcija',zinc:'Toplo cinkovanje (EN ISO 1461)',coat:'Powder coating nakon cinkovanja',transport:'Transport',install:'Montaža čelične konstrukcije'}
  };
  return M[l]||M.sr;
}
function paySelect(){return E('of-pay-preset');}
function ensureAgreementOption(){
  var s=paySelect();if(!s)return;
  var o=Array.prototype.find.call(s.options||[],function(x){return x.value==='agreement';});
  if(!o){o=document.createElement('option');o.value='agreement';o.textContent=labels().agreement;s.insertBefore(o,s.firstChild);}
  else o.textContent=labels().agreement;
}
function explicitPayment(){var s=paySelect();return !!(s&&s.dataset.pstPaymentExplicit==='1');}
function setAgreementDefault(force){
  var s=paySelect();if(!s)return;
  ensureAgreementOption();
  if(force||(!explicitPayment()&&(!s.value||s.value==='net30'))){s.value='agreement';s.dataset.pstPaymentExplicit='0';}
}
function bindPayment(){
  var s=paySelect();if(!s||s.__pstAgreementBound)return;
  s.__pstAgreementBound=true;
  s.addEventListener('change',function(){s.dataset.pstPaymentExplicit='1';});
}
function agreementPlan(p){return Array.isArray(p)&&p.length===1&&String(p[0]&&p[0].ev||'')==='agreement';}
function wrapPayment(){
  ensureAgreementOption();bindPayment();setAgreementDefault(false);
  var bp=window.buildPayPlan;
  if(typeof bp==='function'&&!bp.__pstAgreementDefault){
    var wp=function(){var s=paySelect();if(s&&s.value==='agreement')return[{pct:100,ev:'agreement',days:0}];return bp.apply(this,arguments);};
    wp.__pstAgreementDefault=true;wp.__base=bp;window.buildPayPlan=wp;
  }
  var pt=window.payPlanText;
  if(typeof pt==='function'&&!pt.__pstAgreementDefault){
    var wt=function(plan){if(agreementPlan(plan))return labels().agreement;return pt.apply(this,arguments);};
    wt.__pstAgreementDefault=true;wt.__base=pt;window.payPlanText=wt;
  }
}
function removed(key){try{var P=window.PSTOfferPositionPreservationV1;if(P&&typeof P.removed==='function')return P.removed().indexOf(key)>=0;}catch(x){}return false;}
function posKey(p){
  try{var P=window.PSTOfferPositionPreservationV1;if(P&&typeof P.inferKey==='function')return P.inferKey(p);}catch(x){}
  var d=String(p&&p.desc||'').toLowerCase();
  if(/powder|pulver|coating|ngjyros/.test(d))return'coat';
  if(/cink|zink|galvan/.test(d))return'zinc';
  if(/transport|fracht|prevoz/.test(d))return'transport';
  if(/montage|installation|montim|montaž/.test(d))return'install';
  if(/steel|stahl|čeli|celik|konstruks/.test(d))return'base';
  return String(p&&p._pstKey||'');
}
function hasKey(key){return Array.isArray(window.oferPos)&&window.oferPos.some(function(p){return posKey(p)===key;});}
function addPricing(key,desc,qty,unit,price){
  if(!(price>0)||removed(key)||hasKey(key)||!Array.isArray(window.oferPos))return;
  window.oferPos.push({desc:desc,qty:qty,unit:unit,price:price,_pstSource:'pricing-auto',_pstKey:key});
}
function ensureCommercialPositions(){
  if(!Array.isArray(window.oferPos))return;
  var L=labels(),kg=n((E('of-kg')||{}).value);
  var base=n((E('pst-sale-base')||E('of-pr')||{}).value);
  var zinc=n((E('pst-sale-zinc')||E('of-zn')||{}).value);
  var coat=n((E('pst-sale-coat')||E('pst-of-coat')||{}).value);
  var tr=n((E('pst-sale-transport')||E('of-tr')||{}).value);
  var ins=n((E('pst-sale-install')||E('pst-of-install')||{}).value);
  var iu=String((E('pst-install-unit')||{}).value||'kg');
  addPricing('base',L.base,kg,'kg',base);
  addPricing('zinc',L.zinc,kg,'kg',zinc);
  addPricing('coat',L.coat,kg,'kg',coat);
  addPricing('transport',L.transport,1,'ls',tr);
  if(ins>0)addPricing('install',L.install,iu==='kg'?kg:1,iu==='kg'?'kg':'ls',ins);
  if(typeof window.renderOferPos==='function')window.renderOferPos();
}
function patchFallbackProfile(){
  var pre=E('of-pre'),proj=String((E('of-proj')||{}).value||'').trim();if(!pre||!proj)return;
  var L=labels();
  Array.prototype.forEach.call(pre.querySelectorAll('tr'),function(tr){
    var tds=tr.querySelectorAll('td');if(tds.length<5)return;
    for(var i=0;i<tds.length;i++){
      if(String(tds[i].textContent||'').trim()===proj){tds[i].textContent=L.base;break;}
    }
  });
}
function wrapBeforeOutput(name){
  var fn=window[name];if(typeof fn!=='function'||fn.__pstFinalOutputFix)return;
  var w=function(){wrapPayment();ensureCommercialPositions();var r=fn.apply(this,arguments);if(name==='genOfer')patchFallbackProfile();return r;};
  w.__pstFinalOutputFix=true;w.__base=fn;window[name]=w;
}
function wrapState(){
  var c=window.collectOfferFormState;
  if(typeof c==='function'&&!c.__pstFinalOutputFix){
    var cw=function(){var st=c.apply(this,arguments)||{};var s=paySelect();st.paymentExplicit=explicitPayment();st.paymentPreset=s?String(s.value||'agreement'):'agreement';return st;};
    cw.__pstFinalOutputFix=true;cw.__base=c;window.collectOfferFormState=cw;
  }
  var a=window.applyOfferFormState;
  if(typeof a==='function'&&!a.__pstFinalOutputFix){
    var aw=function(st){
      ensureAgreementOption();var s=paySelect(),saved=String(st&&st.paymentPreset||st&&st.payPreset||'');
      var explicit=st&&st.paymentExplicit===true;
      if(st&&st.paymentExplicit==null&&saved&&saved!=='net30'&&saved!=='agreement')explicit=true;
      if(s){if(explicit&&saved){s.value=saved;s.dataset.pstPaymentExplicit='1';}else{s.value='agreement';s.dataset.pstPaymentExplicit='0';}}
      var r=a.apply(this,arguments);
      if(s){if(explicit&&saved){s.value=saved;s.dataset.pstPaymentExplicit='1';}else{s.value='agreement';s.dataset.pstPaymentExplicit='0';}}
      return r;
    };
    aw.__pstFinalOutputFix=true;aw.__base=a;window.applyOfferFormState=aw;
  }
}
function wrapNew(){
  ['ofertaStartNewDraft','resetOfferForm'].forEach(function(name){var fn=window[name];if(typeof fn!=='function'||fn.__pstFinalOutputFix)return;var w=function(){var r=fn.apply(this,arguments);setAgreementDefault(true);return r;};w.__pstFinalOutputFix=true;w.__base=fn;window[name]=w;});
}
function install(){wrapPayment();wrapState();wrapNew();wrapBeforeOutput('genOfer');wrapBeforeOutput('saveOfferState');wrapBeforeOutput('printOfer');setAgreementDefault(false);}
function schedule(){[80,220,500,900].forEach(function(ms){setTimeout(install,ms);});}
document.addEventListener('pst:modules-ready',install);
document.addEventListener('change',function(e){if(e.target&&e.target.id==='of-lang'){ensureAgreementOption();}},true);
install();schedule();
window.PSTOfferFinalOutputFixV1={install:install,ensureCommercialPositions:ensureCommercialPositions,patchFallbackProfile:patchFallbackProfile,setAgreementDefault:setAgreementDefault};
})();
