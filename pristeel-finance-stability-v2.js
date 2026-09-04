/* PRISTEEL Finance Stability v2
 * Keeps Finance usable if a read request stalls and aligns the Finance surface
 * with the approved calm PPPP palette. This layer is presentation/read-only:
 * it does not issue database requests, retry writes, or replace Finance business logic.
 */
(function(){
'use strict';
if(window.__pstFinanceStabilityV2)return;
window.__pstFinanceStabilityV2=true;

var WAIT=6000;
var lastActive=false;
var forcedPageDisplay=false;

function loadingText(el){return el&&/duke ngarkuar/i.test(String(el.textContent||''));}
function guard(id,label){
  setTimeout(function(){
    var el=document.getElementById(id);
    if(!loadingText(el))return;
    el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:10px 0">'+label+' nuk u ngarkua brenda afatit. Mund të vazhdosh në modul tjetër dhe të provosh përsëri.</div>';
  },WAIT);
}

function installStyle(){
  if(document.getElementById('pst-finance-stability-style'))return;
  var s=document.createElement('style');
  s.id='pst-finance-stability-style';
  s.textContent='\
#page-finance{--bg:#F7F8FA;--bg2:#F7F8FA;--bg3:#F1F4F7;--bg-card:#fff;--bg-hover:#F5F7F9;--text:#243447;--text2:#526576;--text3:#7A8798;--border:#E5E7EB;--border2:#D8E0E7;--bronze:#2F5F86;--bronze-light:#4F7FA3;--bronze-dark:#254E70;--bronze-bg:rgba(47,95,134,.08);--bronze-text:#2F5F86;--copper:#4F7FA3;--copper-bg:rgba(79,127,163,.08);--green:#5F7F68;--green-bg:rgba(95,127,104,.10);--green-text:#506E58;--red:#A86A64;--red-bg:rgba(168,106,100,.10);--red-text:#925A55;background:#F7F8FA!important;color:#243447!important}\
#page-finance>.card,#page-finance .card{background:#fff!important;border-color:#E5E7EB!important;box-shadow:0 1px 2px rgba(36,52,71,.04)!important}\
#fin-hub{padding:16px!important;border:1px solid #E5E7EB!important;border-radius:14px!important}\
#fin-hub-grid{gap:12px!important}\
#fin-hub-grid>*{border:1px solid #E5E7EB!important;background:#fff!important;box-shadow:0 1px 2px rgba(36,52,71,.04)!important;transform:none!important;border-radius:12px!important}\
#fin-hub-grid>*:hover{border-color:#D3DDE6!important;box-shadow:0 5px 16px rgba(36,52,71,.08)!important;transform:translateY(-1px)!important}\
#fin-hub-grid>a{border-style:solid!important}\
#fin-hub-grid>*>div[style*="position:absolute"]{background:#4F7FA3!important;height:3px!important}\
#fin-hub-grid>*>div[style*="font-weight:650"]{color:#243447!important}\
#fin-hub-grid>a>div[style*="font-weight:650"]{color:#2F5F86!important}\
#fin-tabs{gap:7px!important;padding:2px 0 4px}\
#fin-tabs .btn{background:#fff!important;border:1px solid #DDE4EA!important;color:#526576!important;box-shadow:none!important}\
#fin-tabs .btn:hover{background:#F4F7F9!important;border-color:#CBD7E0!important;color:#243447!important}\
#fin-tabs .btn.btn-primary{background:#2F5F86!important;border-color:#2F5F86!important;color:#fff!important}\
#fin-atk-types>div{border:1px solid #E5E7EB!important;background:#fff!important;box-shadow:0 1px 2px rgba(36,52,71,.04)!important;transform:none!important}\
#fin-atk-types>div:hover{border-color:#D3DDE6!important;box-shadow:0 4px 14px rgba(36,52,71,.07)!important}\
#fin-atk-types>div>div[style*="position:absolute"]{background:#A7874F!important;height:3px!important}\
#fin-atk-types>div>div[style*="font-weight:650"]{color:#243447!important}\
#fin-inv-sum>div{border:1px solid #E5E7EB!important;border-left:3px solid #4F7FA3!important;box-shadow:none!important}\
#fin-inv-sum>div:nth-child(2){border-left-color:#A7874F!important}\
#page-finance input,#page-finance select,#page-finance textarea{background:#fff!important;border-color:#DDE4EA!important;color:#243447!important}\
#page-finance input:focus,#page-finance select:focus,#page-finance textarea:focus{border-color:#4F7FA3!important;box-shadow:0 0 0 3px rgba(79,127,163,.10)!important}\
#page-finance table{color:#243447}\
#page-finance thead th{color:#7A8798!important;border-bottom-color:#E5E7EB!important}\
#page-finance tbody tr{border-bottom-color:#EEF1F4!important}\
';
  document.head.appendChild(s);
}

/* Invoice PDF/preview only: preserve the approved shared document model and
 * change only its colour palette. Offers remain on the original copper palette. */
var INVOICE_DOC_PALETTE={
  '#B87333':'#2F5F86',
  '#F8F6F3':'#F4F7FA',
  '#EAE5DE':'#DCE5EC',
  '#FCFBF9':'#F8FAFC',
  '#E8E4DE':'#DDE5EB',
  '#8A8378':'#6E7F8E'
};
var INVOICE_DOC_RGB_PALETTE={
  'rgb(184, 115, 51)':'rgb(47, 95, 134)',
  'rgb(248, 246, 243)':'rgb(244, 247, 250)',
  'rgb(234, 229, 222)':'rgb(220, 229, 236)',
  'rgb(252, 251, 249)':'rgb(248, 250, 252)',
  'rgb(232, 228, 222)':'rgb(221, 229, 235)',
  'rgb(138, 131, 120)':'rgb(110, 127, 142)'
};
function replaceInvoicePaletteText(text){
  var out=String(text||'');
  Object.keys(INVOICE_DOC_PALETTE).forEach(function(from){
    out=out.split(from).join(INVOICE_DOC_PALETTE[from]);
    out=out.split(from.toLowerCase()).join(INVOICE_DOC_PALETTE[from]);
  });
  Object.keys(INVOICE_DOC_RGB_PALETTE).forEach(function(from){
    out=out.split(from).join(INVOICE_DOC_RGB_PALETTE[from]);
  });
  return out;
}
function applyInvoiceDocumentTheme(){
  var el=document.getElementById('iv-preview');
  if(!el||!el.innerHTML||/Plotëso të dhënat/i.test(el.textContent||''))return false;
  el.innerHTML=replaceInvoicePaletteText(el.innerHTML);
  Array.prototype.forEach.call(el.querySelectorAll('[style]'),function(node){
    var css=node.getAttribute('style');
    var themed=replaceInvoicePaletteText(css);
    if(themed!==css)node.setAttribute('style',themed);
  });
  el.setAttribute('data-pst-invoice-document-theme','steel-blue-v1');
  return true;
}
function installInvoiceDocumentTheme(){
  var current=window.genInvoiceOut;
  if(typeof current!=='function'||current.__pstInvoiceDocumentThemeV1)return false;
  var wrapped=function(){
    var out=current.apply(this,arguments);
    applyInvoiceDocumentTheme();
    return out;
  };
  wrapped.__pstInvoiceDocumentThemeV1=true;
  wrapped.__pstInvoiceDocumentBase=current;
  window.genInvoiceOut=wrapped;
  return true;
}

function markTab(tab){
  ['inv','supp','exp','atk','tax','aging','bg','oc'].forEach(function(key){
    var b=document.getElementById('fin-tab-'+key);
    if(!b)return;
    b.classList.toggle('btn-primary',key===tab);
  });
}
function clearTabs(){
  ['inv','supp','exp','atk','tax','aging','bg','oc'].forEach(function(key){
    var b=document.getElementById('fin-tab-'+key);
    if(b)b.classList.remove('btn-primary');
  });
}
function polish(){
  installStyle();
  installInvoiceDocumentTheme();
  var p=document.getElementById('page-finance');
  if(p)p.setAttribute('data-pst-finance-owned','1');
}

function guardTab(tab){
  if(tab==='inv')guard('fin-inv-list','Faturat');
  if(tab==='supp')guard('ivin-list','Faturat e furnitorëve');
  if(tab==='exp')guard('fin-exp-list','Shpenzimet');
  if(tab==='atk')guard('fin-atk-list','Tatimet');
  if(tab==='aging')guard('fin-aging-list','Afatet e pagesave');
}

function installSwitch(){
  var current=window.finSwitchTab;
  if(typeof current!=='function'||current.__pstStabilityV2)return false;
  var wrapped=function(tab){
    var out=current.apply(this,arguments);
    markTab(tab);
    guardTab(tab);
    setTimeout(polish,0);
    return out;
  };
  wrapped.__pstStabilityV2=true;
  wrapped.__pstFinanceBase=current;
  window.finSwitchTab=wrapped;
  return true;
}

function installHub(){
  var current=window.finShowHub;
  if(typeof current!=='function'||current.__pstStabilityV2)return false;
  var wrapped=function(){
    var out=current.apply(this,arguments);
    clearTabs();
    setTimeout(polish,0);
    return out;
  };
  wrapped.__pstStabilityV2=true;
  wrapped.__pstFinanceBase=current;
  window.finShowHub=wrapped;
  return true;
}

function computedVisible(el){
  if(!el||el.hidden)return false;
  try{var cs=window.getComputedStyle&&window.getComputedStyle(el);if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false;}catch(e){}
  return !(el.style&&el.style.display==='none');
}
function isFinanceActive(){
  var p=document.getElementById('page-finance');
  return !!(p&&p.classList.contains('active')&&computedVisible(p));
}
function financeSurfaceReady(){
  var p=document.getElementById('page-finance'),hub=document.getElementById('fin-hub'),grid=document.getElementById('fin-hub-grid');
  return !!(p&&p.classList.contains('active')&&computedVisible(p)&&computedVisible(hub)&&grid&&grid.children&&grid.children.length>0);
}
function clearForcedPageDisplay(){
  var p=document.getElementById('page-finance');
  if(!p||!forcedPageDisplay)return;
  p.style.removeProperty('display');
  forcedPageDisplay=false;
}
function activateExistingFinance(){
  var p=document.getElementById('page-finance');
  if(!p)return false;
  document.querySelectorAll('.page').forEach(function(page){
    if(page===p)return;
    page.classList.remove('active');
    page.style.display='none';
  });
  p.hidden=false;
  p.removeAttribute('hidden');
  p.classList.add('active');
  p.style.display='block';
  try{
    var cs=window.getComputedStyle&&window.getComputedStyle(p);
    if(cs&&cs.display==='none'){
      p.style.setProperty('display','block','important');
      forcedPageDisplay=true;
    }
  }catch(e){}
  installSwitch();
  installHub();
  installInvoiceDocumentTheme();
  polish();
  if(typeof window.finShowHub==='function'){
    try{window.finShowHub();}catch(e){}
  }
  try{
    var D=window.PSTFinanceDailyV1;
    if(D&&typeof D.apply==='function')D.apply(true);
  }catch(e){}
  return financeSurfaceReady()||isFinanceActive();
}
function ensureFinanceCore(){
  if(typeof window.finShowHub==='function')return Promise.resolve(true);
  var old=document.querySelector('script[data-pst-finance-core-recovery]');
  if(old)return new Promise(function(resolve){old.addEventListener('load',function(){resolve(typeof window.finShowHub==='function');},{once:true});old.addEventListener('error',function(){resolve(false);},{once:true});});
  return new Promise(function(resolve){
    var s=document.createElement('script');
    s.src='pristeel-finance.js?v=20260904-finance-recovery1';
    s.defer=true;
    s.setAttribute('data-pst-finance-core-recovery','1');
    s.onload=function(){installSwitch();installHub();resolve(typeof window.finShowHub==='function');};
    s.onerror=function(){resolve(false);};
    document.head.appendChild(s);
  });
}
function recoverFinance(){
  if(activateExistingFinance()&&financeSurfaceReady())return Promise.resolve(true);
  return ensureFinanceCore().then(function(){
    var ok=activateExistingFinance();
    setTimeout(function(){if(isFinanceActive()&&!financeSurfaceReady())activateExistingFinance();},80);
    return ok;
  });
}
function installWorkspaceFinanceRoute(){
  var current=window.pstWorkspaceGo;
  if(typeof current!=='function'||current.__pstFinanceRouteRecoveryV1)return false;
  var wrapped=function(key){
    if(String(key||'').toLowerCase()==='finance'){
      recoverFinance();
      return true;
    }
    clearForcedPageDisplay();
    return current.apply(this,arguments);
  };
  wrapped.__pstFinanceRouteRecoveryV1=true;
  wrapped.__pstFinanceRouteBase=current;
  window.pstWorkspaceGo=wrapped;
  return true;
}
function syncActivation(){
  var p=document.getElementById('page-finance');
  var active=!!(p&&p.classList.contains('active'));
  if(!active){
    clearForcedPageDisplay();
    lastActive=false;
    return;
  }
  if(active&&!lastActive){
    setTimeout(function(){
      var page=document.getElementById('page-finance');
      if(!page||!page.classList.contains('active'))return;
      recoverFinance();
    },60);
  }else if(active&&!financeSurfaceReady()){
    setTimeout(function(){if(document.getElementById('page-finance')&&document.getElementById('page-finance').classList.contains('active'))recoverFinance();},60);
  }
  lastActive=active;
}
function watchFinancePage(){
  var p=document.getElementById('page-finance');
  if(!p||p.__pstFinanceStabilityObserved)return false;
  p.__pstFinanceStabilityObserved=true;
  if(typeof MutationObserver==='function'){
    var o=new MutationObserver(syncActivation);
    o.observe(p,{attributes:true,attributeFilter:['class','style','hidden']});
    p.__pstFinanceStabilityObserver=o;
  }
  syncActivation();
  return true;
}

function install(){
  installStyle();
  installSwitch();
  installHub();
  installInvoiceDocumentTheme();
  installWorkspaceFinanceRoute();
  watchFinancePage();
  polish();
}

install();
[120,500,1200,2500].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',install,{once:true});
window.PSTFinanceStabilityV2={install:install,guard:guard,polish:polish,syncActivation:syncActivation,recoverFinance:recoverFinance,financeSurfaceReady:financeSurfaceReady,activateExistingFinance:activateExistingFinance,applyInvoiceDocumentTheme:applyInvoiceDocumentTheme,installInvoiceDocumentTheme:installInvoiceDocumentTheme,invoiceDocumentPalette:INVOICE_DOC_PALETTE};
})();