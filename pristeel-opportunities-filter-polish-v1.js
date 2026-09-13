/* PRISTEEL Opportunities Filter Polish v2
 * Compact presentation for the visible Opportunities filters.
 * Click/filter behavior remains owned by Project-Centric Workflow.
 */
(function(){
'use strict';
if(window.__pstOpportunitiesFilterPolishV1)return;
window.__pstOpportunitiesFilterPolishV1=true;

function loadWaitingBridge(){
  if(window.__pstOpportunitiesWaitingBridgeV1||document.querySelector('script[data-pst-opportunities-waiting-bridge]'))return;
  var b=document.createElement('script');
  b.src='pristeel-opportunities-waiting-bridge-v1.js?v=20260913-waiting1';
  b.defer=true;
  b.setAttribute('data-pst-opportunities-waiting-bridge','1');
  b.onerror=function(){console.error('Nuk u ngarkua lifecycle-i i Mundësive.');};
  document.head.appendChild(b);
}

var s=document.createElement('style');
s.id='pst-opportunities-filter-polish-v1-css';
s.textContent=`
#page-kek-tenders #pst-opportunities-focus{padding:25px 26px 28px!important}
#page-kek-tenders #pst-pcw-opportunity-tools{margin:18px 0 14px!important}
#page-kek-tenders #pst-pcw-opportunity-tools label{height:46px!important;padding:0 15px!important;border:1px solid #D9E5EA!important;border-radius:16px!important;background:#FFF!important;box-shadow:0 2px 8px rgba(38,69,82,.025)!important}
#page-kek-tenders #pst-pcw-opportunity-tools label>span{font-size:10px!important;font-weight:800!important;letter-spacing:.09em!important;color:#7A8D96!important}
#page-kek-tenders #pst-pcw-opportunity-search{height:44px!important;font-size:13px!important;color:#2D4651!important}

#page-kek-tenders #pst-pcw-lifecycle-tabs,
#page-kek-tenders #pst-pcw-opportunity-tabs{position:relative;display:flex!important;align-items:center!important;gap:6px!important;min-width:0!important;padding-left:106px!important;flex-wrap:wrap!important;overflow:visible!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs{margin:7px 0 10px!important;padding-top:5px!important;padding-bottom:12px!important;border-bottom:1px solid #E7ECEF!important}
#page-kek-tenders #pst-pcw-opportunity-tabs{margin:0!important;padding-top:5px!important;padding-bottom:5px!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs::before,
#page-kek-tenders #pst-pcw-opportunity-tabs::before{position:absolute;left:0;top:50%;transform:translateY(-50%);width:94px;color:#718692;font-size:10px;font-weight:800;letter-spacing:.01em;white-space:nowrap}
#page-kek-tenders #pst-pcw-lifecycle-tabs::before{content:'Sipas statusit'}
#page-kek-tenders #pst-pcw-opportunity-tabs::before{content:'Sipas burimit'}

/* Only one "Të gjitha" is visible. Draft-ready work belongs to "Në pritje". */
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='draft'],
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='all'],
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='UNDP_KOSOVO']{display:none!important}

#page-kek-tenders #pst-pcw-lifecycle-tabs button,
#page-kek-tenders #pst-pcw-opportunity-tabs button{position:relative;min-height:32px!important;height:32px!important;padding:0 9px 0 6px!important;border:1px solid #DCE6EA!important;border-radius:999px!important;background:#FFF!important;color:#344C57!important;font-size:10.25px!important;font-weight:760!important;letter-spacing:0!important;gap:5px!important;white-space:nowrap!important;box-shadow:0 2px 7px rgba(41,71,82,.025)!important;transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease,transform .16s ease!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button:hover,
#page-kek-tenders #pst-pcw-opportunity-tabs button:hover{border-color:#B9D1DA!important;background:#F8FBFC!important;color:#2E718A!important;box-shadow:0 5px 14px rgba(51,112,136,.07)!important;transform:translateY(-1px)!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button:focus-visible,
#page-kek-tenders #pst-pcw-opportunity-tabs button:focus-visible{outline:2px solid rgba(57,127,152,.28)!important;outline-offset:2px!important}

/* Small pictograms instead of letter badges. */
#page-kek-tenders #pst-pcw-lifecycle-tabs button::before,
#page-kek-tenders #pst-pcw-opportunity-tabs button::before{content:'•';width:21px;height:21px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 21px;border-radius:7px;background:#EEF4F6;color:#477B8D;font-size:11px;font-weight:900;line-height:1}
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='new']::before{content:'✦';background:#EAF3FF;color:#3478E5;font-size:11px}
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='waiting']::before{content:'◷';background:#FFF3DF;color:#D88A2D;font-size:12px}
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='replied']::before{content:'✓';background:#EAF8F0;color:#35A56A;font-size:11px}
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='all']::before{content:'☰';background:#F0F3F6;color:#596F7D;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='TED']::before{content:'★';background:#EAF0FF;color:#315BCB;font-size:10px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='KRPP']::before{content:'▣';background:#ECF2FF;color:#2F65B8;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='APP_AL']::before{content:'▤';background:#F0F3F6;color:#5D7180;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='MCA_KOSOVO']::before{content:'◈';background:#EAF8EE;color:#4C9566;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='KCF']::before{content:'◇';background:#EEF8F0;color:#4B9869;font-size:12px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='RCF']::before{content:'↔';background:#FFF0EF;color:#C76963;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='EBRD_ECEPP']::before{content:'▥';background:#EDF4FB;color:#33729B;font-size:11px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='WORLD_BANK']::before{content:'◎';background:#EAF6FF;color:#2683BF;font-size:12px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='UNGM']::before{content:'◉';background:#EAF6FF;color:#3F8DC3;font-size:10px}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='EU_OFFICE_KOSOVO']::before{content:'✦';background:#EAF0FF;color:#315BCB;font-size:10px}

#page-kek-tenders #pst-pcw-lifecycle-tabs button i,
#page-kek-tenders #pst-pcw-opportunity-tabs button i{min-width:19px!important;height:19px!important;padding:0 4px!important;border-radius:999px!important;background:#F1F4F6!important;color:#6D7D84!important;font-size:9px!important;font-weight:800!important;opacity:1!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button.on,
#page-kek-tenders #pst-pcw-opportunity-tabs button.on{border-color:#397F98!important;background:linear-gradient(135deg,#3E89A3,#32778F)!important;color:#FFF!important;box-shadow:0 7px 16px rgba(50,119,143,.18)!important;transform:none!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button.on::before,
#page-kek-tenders #pst-pcw-opportunity-tabs button.on::before{background:rgba(255,255,255,.17)!important;color:#FFF!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button.on i,
#page-kek-tenders #pst-pcw-opportunity-tabs button.on i{background:#FFF!important;color:#31768E!important}
#page-kek-tenders .pst-pcw-empty{min-height:150px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#85969E!important;font-size:12px!important}

@media(max-width:1100px){
 #page-kek-tenders #pst-pcw-lifecycle-tabs,#page-kek-tenders #pst-pcw-opportunity-tabs{padding-left:0!important;padding-top:27px!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs::before,#page-kek-tenders #pst-pcw-opportunity-tabs::before{top:5px;transform:none;width:auto}
}
@media(max-width:720px){
 #page-kek-tenders #pst-opportunities-focus{padding:18px!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs button,#page-kek-tenders #pst-pcw-opportunity-tabs button{height:31px!important;min-height:31px!important;padding-right:7px!important}
}
@media(prefers-reduced-motion:reduce){
 #page-kek-tenders #pst-pcw-lifecycle-tabs button,#page-kek-tenders #pst-pcw-opportunity-tabs button{transition:none!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs button:hover,#page-kek-tenders #pst-pcw-opportunity-tabs button:hover{transform:none!important}
}
`;
document.head.appendChild(s);
loadWaitingBridge();
window.PSTOpportunitiesFilterPolishV1={version:'20260913-compact2',styleId:s.id};
})();
