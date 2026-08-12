/* PRISTEEL Platform Readability v1
 * UI-only typography normalization for comfortable daily use.
 * No polling, no MutationObserver, no business-data writes.
 * Generated document/PDF preview areas are explicitly excluded.
 */
(function(){
'use strict';
if(window.__pstPlatformReadabilityV1)return;
window.__pstPlatformReadabilityV1=true;

var SKIP='svg,canvas,pre,code,#of-pre,#inv-pre,#in-pre,#oc-pre,#rfq-pre,#doc-preview,.pst-doc-preview,.pst-document-preview,.document-preview,[data-document-preview],[data-pst-document-preview],[data-pst-font-lock]';
var CANDIDATES='button,a,label,small,p,td,th,input,select,textarea,b,strong,span,h5,h6,li,summary';

function css(){
  if(document.getElementById('pst-platform-readability-v1-css'))return;
  var s=document.createElement('style');
  s.id='pst-platform-readability-v1-css';
  s.textContent=`
/* Minimum UI typography. Larger existing typography is left untouched. */
.pst-rd-xxs{font-size:10.5px!important}
.pst-rd-xs{font-size:11.5px!important}
.pst-rd-sm{font-size:12.5px!important}
.pst-rd-control{font-size:12.5px!important}

/* Project email-offer intake: previously 7.8-10.5px. */
.pst-eoi-card>header{padding:14px 16px!important}
.pst-eoi-card>header b{font-size:14px!important;line-height:1.3!important}
.pst-eoi-card>header span{font-size:11.5px!important;line-height:1.4!important;margin-top:3px!important}
.pst-eoi-btn{height:36px!important;padding:0 12px!important;font-size:12px!important}
.pst-eoi-row{gap:14px!important;padding:12px 14px!important}
.pst-eoi-row b{font-size:13px!important;line-height:1.35!important}
.pst-eoi-row span{font-size:11px!important;line-height:1.4!important;margin-top:3px!important}
.pst-eoi-row p{font-size:11.5px!important;line-height:1.5!important;margin-top:6px!important}
.pst-eoi-empty{font-size:11.5px!important;line-height:1.5!important;padding:17px 14px!important}
.pst-eoi-field span{font-size:10px!important}.pst-eoi-field b{font-size:12px!important}
.pst-eoi-source{font-size:11.5px!important;line-height:1.55!important}
.pst-eoi-modal footer button{font-size:12px!important;min-height:36px!important}

/* Normalized supplier comparison: previously 7-8.5px. */
.pf2-compare{font-size:11.5px!important}
.pf2-compare th{font-size:10.5px!important;padding:10px 10px!important;line-height:1.3!important}
.pf2-compare td{font-size:11.5px!important;padding:11px 10px!important;line-height:1.4!important}
.pf2-compare td span{font-size:9.5px!important;padding:3px 6px!important}
.pf2-compare td em{font-size:9.5px!important;line-height:1.35!important}

/* Common everyday controls from the legacy shell. */
.btn,.btn-sm{font-size:12.5px!important}
.lbl{font-size:11.5px!important}
.hub-eyebrow,.hub-stat-l,.hub-sec{font-size:10.5px!important}
.ct-meta{font-size:11.5px!important}.ct-tag{font-size:10.5px!important}
.tk-s,.tk-p,.tk-d,.tk-act,.tk-legend{font-size:11.5px!important}
.ov-empty{font-size:12px!important}

/* Keep the collapsed utility rail compact. */
.rail-lbl{font-size:7.5px!important}
`;
  document.head.appendChild(s);
}

function skip(el){
  if(!el||!el.closest)return true;
  if(el.closest(SKIP))return true;
  if(el.classList&&el.classList.contains('rail-lbl'))return true;
  if(el.getAttribute&&el.getAttribute('aria-hidden')==='true')return true;
  return false;
}

function hasReadableContent(el){
  var tag=(el.tagName||'').toLowerCase();
  if(tag==='input'||tag==='select'||tag==='textarea')return true;
  return !!String(el.textContent||'').trim();
}

function mark(el){
  if(skip(el)||!hasReadableContent(el))return;
  if(el.classList.contains('pst-rd-xxs')||el.classList.contains('pst-rd-xs')||el.classList.contains('pst-rd-sm')||el.classList.contains('pst-rd-control'))return;
  var px=parseFloat(window.getComputedStyle(el).fontSize)||0;
  var tag=(el.tagName||'').toLowerCase();
  if(tag==='button'||tag==='input'||tag==='select'||tag==='textarea'){
    if(px>0&&px<12.5)el.classList.add('pst-rd-control');
    return;
  }
  if(!(px>0))return;
  if(px<8.5)el.classList.add('pst-rd-xxs');
  else if(px<10)el.classList.add('pst-rd-xs');
  else if(px<11.5)el.classList.add('pst-rd-sm');
}

function apply(root){
  root=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(root.querySelectorAll(CANDIDATES),mark);
  return true;
}

function schedule(){
  [0,120,380,900,1800].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
}

css();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh,.pst-pi-tab,[data-pf2-tab],.pec-tab,[data-pm-open],button[data-page]'):null;
  if(t)[0,120,420,900].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
},true);

window.PSTPlatformReadabilityV1={apply:apply,schedule:schedule,_test:{mark:mark,skip:skip}};
})();
