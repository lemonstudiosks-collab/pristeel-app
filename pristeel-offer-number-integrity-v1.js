/* PRISTEEL offer number integrity v1
 * Keeps an existing project offer number when editing and calculates the next offer number
 * from the visible doc_nr suffix instead of relying on legacy seq metadata.
 * Restores the current offer number in the generated client document after older output cleanup.
 * Does not change pricing, BOM, VAT, PDF content structure or project data.
 */
(function(){
'use strict';
if(window.__pstOfferNumberIntegrityV1)return;
window.__pstOfferNumberIntegrityV1=true;

var editDocNr='';
var editOfferState=null;
var originalNext=null;

function A(v){return Array.isArray(v)?v:[];}
function E(id){return document.getElementById(id);}
function currentData(){return window.__pstIntegrityLastData||null;}
function currentYear(){return new Date().getFullYear();}
function currentMonth(){return String(new Date().getMonth()+1).padStart(2,'0');}
function parseOfferNr(nr){
  var s=String(nr||'').trim();
  var m=s.match(/^PST-OFF-(\d{4})-(\d{2})-(\d{1,4})$/i);
  if(m)return{year:+m[1],month:m[2],seq:+m[3],nr:s};
  var l=s.match(/^PST-OFF-(\d{4})-(\d{1,4})$/i);
  if(l)return{year:+l[1],month:'',seq:+l[2],nr:s};
  return null;
}
function newestOwnOffer(){
  var d=currentData(),rows=A(d&&d.ourOffers);
  if(!rows.length)return null;
  return rows.slice().sort(function(a,b){
    return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));
  })[0]||null;
}
function armExistingEdit(btn){
  var txt=String(btn&&btn.textContent||'').trim();
  if(!/Krijo\s*\/\s*edito\s+ofert/i.test(txt))return false;
  var r=newestOwnOffer(),p=r&&parseOfferNr(r.doc_nr||r.document_nr||r.reference);
  if(!r||!p)return false;
  editDocNr=p.nr;
  editOfferState=r.offer_state||null;
  return true;
}
function restoreExistingNumber(){
  if(!editDocNr)return false;
  var el=E('of-nr');
  if(!el)return false;
  if(editOfferState&&typeof window.applyOfferFormState==='function'){
    try{window.applyOfferFormState(editOfferState);}catch(e){}
  }
  el.value=editDocNr;
  try{el.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
  return true;
}
function scheduleRestore(){[80,220,500,900].forEach(function(ms){setTimeout(restoreExistingNumber,ms);});}

function fallbackNext(){
  if(typeof originalNext==='function'){
    try{return Promise.resolve(originalNext());}catch(e){}
  }
  var y=currentYear(),m=currentMonth();
  return Promise.resolve({nr:'PST-OFF-'+y+'-'+m+'-001',seq:1,year:y});
}
function safeNextOfferNr(){
  var y=currentYear(),m=currentMonth();
  if(typeof window.supaFetch!=='function')return fallbackNext();
  return window.supaFetch('documents_registry?select=doc_nr,series,year&limit=3000')
    .then(function(rows){
      var max=0,seen=false;
      A(rows).forEach(function(r){
        var p=parseOfferNr(r&&r.doc_nr);
        if(!p||p.year!==y)return;
        if(p.month&&p.month!==m)return;
        seen=true;
        max=Math.max(max,p.seq||0);
      });
      if(!seen)return fallbackNext();
      return{nr:'PST-OFF-'+y+'-'+m+'-'+String(max+1).padStart(3,'0'),seq:max+1,year:y};
    })
    .catch(fallbackNext);
}
function wrapNext(){
  var fn=window.nextOfferNr;
  if(typeof fn!=='function'||fn.__pstNumberIntegrity)return false;
  originalNext=fn;
  safeNextOfferNr.__pstNumberIntegrity=true;
  safeNextOfferNr.__base=fn;
  window.nextOfferNr=safeNextOfferNr;
  return true;
}
function wrapRegister(){
  var fn=window.registerDocNr;
  if(typeof fn!=='function'||fn.__pstNumberIntegrity)return false;
  var w=function(series,nr){
    var args=arguments,r=fn.apply(this,args),p=String(series||'').toUpperCase()==='QUO'?parseOfferNr(nr):null;
    if(!p||typeof window.supaFetch!=='function')return r;
    return Promise.resolve(r).then(function(v){
      return window.supaFetch('documents_registry?doc_nr=eq.'+encodeURIComponent(p.nr),'PATCH',{series:'QUO',year:p.year,seq:p.seq})
        .then(function(){return v;}).catch(function(){return v;});
    });
  };
  w.__pstNumberIntegrity=true;w.__base=fn;window.registerDocNr=w;return true;
}
function currentNumber(){
  var raw=String((E('of-nr')||{}).value||editDocNr||'').trim();
  return parseOfferNr(raw)?raw:'';
}
function ensureVisibleNumber(){
  var root=E('of-pre'),nr=currentNumber();
  if(!root||!nr)return false;
  var existing=root.querySelector('[data-pst-offer-number-visible="1"]');
  if(existing){existing.textContent=nr;return true;}
  var found=false;
  Array.prototype.forEach.call(root.querySelectorAll('*'),function(el){
    if(el.children.length)return;
    var t=String(el.textContent||'').trim();
    if(/^PST-OFF-\d{4}-(?:\d{2}-)?\d{1,4}$/i.test(t)){
      el.textContent=nr;found=true;
    }
  });
  if(found)return true;
  var title=null;
  Array.prototype.some.call(root.querySelectorAll('*'),function(el){
    if(el.children.length)return false;
    if(/^(PONUDA|ANGEBOT|QUOTATION|OFERT[ËE])$/i.test(String(el.textContent||'').trim())){title=el;return true;}
    return false;
  });
  if(!title||!title.parentElement)return false;
  var d=document.createElement('div');
  d.setAttribute('data-pst-offer-number-visible','1');
  d.style.cssText='font-size:13px;color:#B87333;font-weight:600;letter-spacing:1px;margin-top:2px;text-align:right';
  d.textContent=nr;
  title.parentElement.appendChild(d);
  return true;
}
function wrapOutput(){
  var fn=window.genOfer;
  if(typeof fn!=='function'||fn.__pstNumberVisible)return false;
  var w=function(){
    var r=fn.apply(this,arguments);
    ensureVisibleNumber();
    setTimeout(ensureVisibleNumber,0);
    setTimeout(ensureVisibleNumber,120);
    return r;
  };
  w.__pstNumberVisible=true;w.__base=fn;window.genOfer=w;return true;
}
function install(){wrapNext();wrapRegister();wrapOutput();if(editDocNr)restoreExistingNumber();ensureVisibleNumber();}

document.addEventListener('click',function(e){
  var b=e.target&&e.target.closest?e.target.closest('[data-pf2-action="offer"]'):null;
  if(b){
    editDocNr='';editOfferState=null;
    if(armExistingEdit(b))scheduleRestore();
    return;
  }
  var mode=e.target&&e.target.closest?e.target.closest('#pst-cdb-choice [data-m]'):null;
  if(mode&&editDocNr)scheduleRestore();
  var out=e.target&&e.target.closest?e.target.closest('button,a'):null;
  if(out&&(/Gjenero\s+Ofert/i.test(String(out.textContent||''))||/^PDF$/i.test(String(out.textContent||'').trim()))){
    setTimeout(ensureVisibleNumber,0);setTimeout(ensureVisibleNumber,120);
  }
},true);
document.addEventListener('pst:modules-ready',function(){install();},{once:true});
install();[150,500,1200].forEach(function(ms){setTimeout(install,ms);});
window.PSTOfferNumberIntegrityV1={install:install,restoreExistingNumber:restoreExistingNumber,parseOfferNr:parseOfferNr,safeNextOfferNr:safeNextOfferNr,ensureVisibleNumber:ensureVisibleNumber};
})();
