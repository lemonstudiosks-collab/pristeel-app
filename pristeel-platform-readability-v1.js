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
/* Readable desktop floor. Existing larger typography stays untouched. */
.pst-rd-xxs{font-size:11.5px!important;line-height:1.35!important}
.pst-rd-xs{font-size:12.5px!important;line-height:1.4!important}
.pst-rd-sm{font-size:13.5px!important;line-height:1.45!important}
.pst-rd-control{font-size:14px!important;line-height:1.35!important}
.pst-rd-heading{font-size:15px!important;line-height:1.35!important}

/* Everyday controls. */
.btn,.btn-sm{font-size:14px!important;line-height:1.3!important}
.form-label,.lbl{font-size:12.5px!important;line-height:1.4!important}
.seg-btn{font-size:13.5px!important}
.rl-badge{font-size:11.5px!important}.rl-bar{font-size:13px!important}.rl-un{font-size:14px!important}.rl-ue{font-size:12.5px!important}.rl-sel{font-size:13.5px!important}.rl-note{font-size:13px!important}

/* Home / command center. */
.hub-eyebrow,.hub-stat-l,.hub-sec{font-size:12px!important;line-height:1.35!important}
.hub-sub{font-size:13.5px!important}.hub-load,.hub-none{font-size:13px!important}
.src-sub{font-size:13px!important}.ct-name{font-size:14px!important}.ct-co{font-size:13px!important}.ct-meta{font-size:12.5px!important}.ct-tag{font-size:11.5px!important}
.tk-t{font-size:13.5px!important}.tk-s,.tk-p,.tk-d,.tk-act,.tk-legend{font-size:12.5px!important}.tk-auto{font-size:11px!important}
.ov-empty{font-size:13px!important}

/* Project register. */
.pst-pm-eyebrow{font-size:12px!important}
.pst-pm-sub{font-size:13.5px!important}
.pst-pm-btn,.pst-pm-search,.pst-pm-select,.pst-pm-toggle button{font-size:14px!important}
.pst-pm-chip{font-size:12.5px!important}.pst-pm-chip i{font-size:11.5px!important}
.pst-pm-client{font-size:13.5px!important}.pst-pm-desc{font-size:13px!important}
.pst-pm-meta-label{font-size:12px!important}.pst-pm-meta-value{font-size:13.5px!important}
.pst-pm-badge{font-size:11.5px!important}.pst-pm-open{font-size:13.5px!important}.pst-pm-menu button{font-size:13.5px!important}
.pst-pm-phase-head b,.pst-pm-col-head b{font-size:13px!important}.pst-pm-phase-head span,.pst-pm-col-head i{font-size:12px!important}
.pst-pm-board-name{font-size:14px!important}.pst-pm-board-client{font-size:13px!important}.pst-pm-board-date,.pst-pm-col-empty{font-size:12.5px!important}

/* Individual project workspace. */
#page-workspace-project.pf2-on .pst-pi-tab{font-size:14px!important}
#page-workspace-project.pf2-on .pf2-card>header span{font-size:12.5px!important}
#page-workspace-project.pf2-on .pf2-note,#page-workspace-project.pf2-on .pf2-line span,#page-workspace-project.pf2-on .pf2-mail p,#page-workspace-project.pf2-on .pf2-gate p{font-size:13.5px!important;line-height:1.5!important}
#page-workspace-project.pf2-on .pf2-mail span,#page-workspace-project.pf2-on .pf2-flow span,#page-workspace-project.pf2-on .pf2-time small{font-size:12.5px!important;line-height:1.45!important}

/* Project email-offer intake. */
.pst-eoi-card>header{padding:14px 16px!important}
.pst-eoi-card>header b{font-size:15px!important;line-height:1.35!important}
.pst-eoi-card>header span{font-size:12.5px!important;line-height:1.45!important;margin-top:3px!important}
.pst-eoi-btn{height:38px!important;padding:0 13px!important;font-size:13.5px!important}
.pst-eoi-row{gap:14px!important;padding:12px 14px!important}
.pst-eoi-row b{font-size:14px!important;line-height:1.4!important}
.pst-eoi-row span{font-size:12.5px!important;line-height:1.45!important;margin-top:3px!important}
.pst-eoi-row p{font-size:13px!important;line-height:1.55!important;margin-top:6px!important}
.pst-eoi-empty{font-size:13px!important;line-height:1.5!important;padding:17px 14px!important}
.pst-eoi-field span{font-size:12px!important}.pst-eoi-field b{font-size:13.5px!important}
.pst-eoi-source{font-size:13px!important;line-height:1.55!important}
.pst-eoi-modal footer button{font-size:13.5px!important;min-height:38px!important}

/* Commercial margin + normalized supplier comparison.
   Source module used 6.8-9.5px here, which is too small for daily work. */
.pf2-decision>div:first-child b,.pf2-margin-title b{font-size:14px!important}
.pf2-decision>div:first-child span,.pf2-margin-title span{font-size:11.5px!important;line-height:1.35!important;padding:4px 8px!important}
.pf2-decision>p,.pf2-margin>p{font-size:13px!important;line-height:1.5!important}
.pf2-decision-grid b{font-size:13.5px!important}.pf2-decision-grid strong{font-size:16px!important}.pf2-decision-grid small{font-size:12.5px!important}
.pf2-margin-grid span,.pf2-margin-grid small{font-size:12.5px!important;line-height:1.4!important}.pf2-margin-grid b{font-size:17px!important;line-height:1.3!important}
.pf2-compare{font-size:13px!important}
.pf2-compare th{font-size:12px!important;padding:11px 10px!important;line-height:1.4!important}
.pf2-compare td{font-size:13px!important;padding:12px 10px!important;line-height:1.45!important}
.pf2-compare td span{font-size:11.5px!important;line-height:1.35!important;padding:3px 7px!important}
.pf2-compare td em{font-size:12px!important;line-height:1.4!important}
.pf2-detail-btn{font-size:12.5px!important;line-height:1.3!important;padding:5px 9px!important}
.pf2-break-row,.pf2-break-total{padding:11px 12px!important}
.pf2-break-row span{font-size:13px!important;line-height:1.45!important}
.pf2-break-row b{font-size:12.5px!important;line-height:1.45!important}
.pf2-break-row strong,.pf2-break-total strong{font-size:13.5px!important}
.pf2-break-total span{font-size:13px!important}
.pf2-break-terms p{font-size:13px!important;line-height:1.6!important}
.pf2-empty{font-size:13px!important;line-height:1.5!important}

/* Collapsed utility rail stays compact, but must still be legible. */
.rail-lbl{font-size:10.5px!important;line-height:1.05!important}
`;
  document.head.appendChild(s);
}

function skip(el){
  if(!el||!el.closest)return true;
  if(el.closest(SKIP))return true;
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
  if(el.classList.contains('pst-rd-xxs')||el.classList.contains('pst-rd-xs')||el.classList.contains('pst-rd-sm')||el.classList.contains('pst-rd-control')||el.classList.contains('pst-rd-heading'))return;
  var px=parseFloat(window.getComputedStyle(el).fontSize)||0;
  if(!(px>0))return;
  var tag=(el.tagName||'').toLowerCase();
  if(tag==='button'||tag==='input'||tag==='select'||tag==='textarea'){
    if(px<14)el.classList.add('pst-rd-control');
    return;
  }
  if(tag==='h5'||tag==='h6'){
    if(px<15)el.classList.add('pst-rd-heading');
    return;
  }
  if(tag==='th'){
    if(px<12)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='small'){
    if(px<12)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='label'){
    if(px<12.5)el.classList.add('pst-rd-xs');
    return;
  }
  if(tag==='td'||tag==='p'||tag==='li'||tag==='summary'){
    if(px<13)el.classList.add('pst-rd-sm');
    return;
  }
  if(px<9.5)el.classList.add('pst-rd-xxs');
  else if(px<11.5)el.classList.add('pst-rd-xs');
  else if(px<13)el.classList.add('pst-rd-sm');
}

function apply(root){
  root=root&&root.querySelectorAll?root:document;
  Array.prototype.forEach.call(root.querySelectorAll(CANDIDATES),mark);
  return true;
}

function schedule(){
  [0,150,500,1200,3000].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
}

css();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(e){
  var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh,.pst-pi-tab,[data-pf2-tab],.pec-tab,[data-pm-open],button[data-page]'):null;
  if(t)[0,160,520,1200].forEach(function(ms){setTimeout(function(){apply(document);},ms);});
},true);

window.PSTPlatformReadabilityV1={apply:apply,schedule:schedule,_test:{mark:mark,skip:skip}};
})();
