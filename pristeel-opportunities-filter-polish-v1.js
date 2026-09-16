/* PRISTEEL Opportunities Filter Polish v3
 * Final presentation owner for the visible Opportunities lifecycle mindmap and source filters.
 * Also owns the Projects "Kthehu" click at window-capture level so older document-level
 * navigation handlers cannot reclaim the route after the final navigation owner runs.
 * No business-data writes or outbound actions are added here.
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

function openCanonicalHome(){
  var P=window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV9||window.PSTPrimaryNavResilienceV8||window.PSTPrimaryNavResilienceV7||window.PSTPrimaryNavResilienceV6||window.PSTPrimaryNavResilienceV5||window.PSTPrimaryNavResilienceV4||window.PSTPrimaryNavResilienceV3||window.PSTPrimaryNavResilienceV2||window.PSTPrimaryNavResilienceV1;
  try{if(P&&typeof P.openHome==='function')return P.openHome()!==false;}catch(e){console.warn('PPPP final Home route:',e);}
  var H=window.PSTHomeCanonicalV1;
  try{
    if(H&&typeof H.activateHome==='function'){
      H.activateHome();
      if(typeof H.render==='function')Promise.resolve(H.render(true)).catch(function(){});
      return true;
    }
  }catch(e){console.warn('PPPP canonical Home fallback:',e);}
  try{if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('home');return true;}}catch(e){}
  try{if(typeof window.goHome==='function'){window.goHome();return true;}}catch(e){}
  return false;
}

function installProjectsBackBridge(){
  if(window.__pstProjectsBackFinalOwnerBridgeV1)return;
  window.__pstProjectsBackFinalOwnerBridgeV1=true;
  window.addEventListener('click',function(e){
    var back=e.target&&e.target.closest?e.target.closest('[data-pmm-back]'):null;
    if(!back)return;
    e.preventDefault();
    e.stopPropagation();
    if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
    openCanonicalHome();
  },true);
}

var s=document.createElement('style');
s.id='pst-opportunities-filter-polish-v1-css';
s.textContent=`
#page-kek-tenders #pst-opportunities-focus{padding:25px 26px 28px!important}
#page-kek-tenders #pst-pcw-opportunity-tools{margin:18px 0 14px!important}
#page-kek-tenders #pst-pcw-opportunity-tools label{height:46px!important;padding:0 15px!important;border:1px solid #D9E5EA!important;border-radius:16px!important;background:#FFF!important;box-shadow:0 2px 8px rgba(38,69,82,.025)!important}
#page-kek-tenders #pst-pcw-opportunity-tools label>span{font-size:10px!important;font-weight:800!important;letter-spacing:.09em!important;color:#7A8D96!important}
#page-kek-tenders #pst-pcw-opportunity-search{height:44px!important;font-size:13px!important;color:#2D4651!important}

/* Final lifecycle mindmap owner. Draft-ready work is intentionally folded into "Në pritje"
   by the existing waiting bridge, so the visible map has four operational branches. */
#page-kek-tenders #pst-pcw-lifecycle-tabs{position:relative;display:grid!important;grid-template-columns:minmax(190px,1fr) 176px minmax(190px,1fr)!important;grid-template-areas:"new center waiting" "replied center all"!important;grid-template-rows:minmax(86px,auto) minmax(86px,auto)!important;gap:20px clamp(42px,5vw,78px)!important;min-width:0!important;margin:14px 0 12px!important;padding:34px clamp(30px,6vw,92px) 30px!important;border:1px solid #E3ECEF!important;border-radius:22px!important;background:radial-gradient(circle at center,transparent 0 77px,#E6F0F3 78px 79px,transparent 80px 142px,#EAF1F3 143px 144px,transparent 145px),linear-gradient(135deg,#FBFDFE,#F7FAFB)!important;overflow:hidden!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs::before{content:""!important;position:absolute!important;inset:17% 20%!important;pointer-events:none!important;background:linear-gradient(31deg,transparent 49.86%,#DCEAEF 50%,transparent 50.14%),linear-gradient(-31deg,transparent 49.86%,#DCEAEF 50%,transparent 50.14%)!important;opacity:.82!important;width:auto!important;transform:none!important;top:17%!important;left:20%!important;color:transparent!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs::after{content:'Sipas statusit';position:absolute;left:16px;top:12px;color:#8799A1;font-size:10px;font-weight:800;letter-spacing:.01em}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-center{position:relative!important;left:auto!important;top:auto!important;transform:none!important;grid-area:center!important;align-self:center!important;justify-self:center!important;width:160px!important;min-height:124px!important;height:auto!important;border-radius:24px!important;background:#FFF!important;border:1px solid #B9D8E2!important;box-shadow:0 14px 35px rgba(43,91,108,.10)!important;padding:12px!important;z-index:2!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:min(220px,100%)!important;min-height:66px!important;height:auto!important;border:1px solid #D6E6EB!important;border-radius:16px!important;background:rgba(255,255,255,.97)!important;color:#385762!important;padding:9px 11px!important;box-shadow:0 5px 17px rgba(48,85,98,.05)!important;display:flex!important;align-items:center!important;gap:10px!important;text-align:left!important;white-space:normal!important;z-index:3!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node:hover{transform:translateY(-2px)!important;border-color:#79AFC1!important;background:#FFF!important;box-shadow:0 10px 23px rgba(48,85,98,.12)!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node.on{background:#EAF6FA!important;border-color:#4F97AF!important;color:#285E72!important;box-shadow:0 9px 22px rgba(79,151,175,.16)!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-new{grid-area:new!important;justify-self:end!important;align-self:end!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-waiting{grid-area:waiting!important;justify-self:start!important;align-self:end!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-replied{grid-area:replied!important;justify-self:end!important;align-self:start!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-all{grid-area:all!important;justify-self:start!important;align-self:start!important;width:min(220px,100%)!important;min-height:66px!important}
#page-kek-tenders #pst-pcw-lifecycle-tabs button[data-pcw-lifecycle='draft']{display:none!important}

/* Source filters stay compact pills below the mindmap. */
#page-kek-tenders #pst-pcw-opportunity-tabs{position:relative;display:flex!important;align-items:center!important;gap:6px!important;min-width:0!important;margin:0!important;padding:5px 0 5px 106px!important;flex-wrap:wrap!important;overflow:visible!important;border-bottom:1px solid #E7ECEF!important}
#page-kek-tenders #pst-pcw-opportunity-tabs::before{content:'Sipas burimit';position:absolute;left:0;top:50%;transform:translateY(-50%);width:94px;color:#718692;font-size:10px;font-weight:800;letter-spacing:.01em;white-space:nowrap}
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='all'],
#page-kek-tenders #pst-pcw-opportunity-tabs button[data-pcw-source='UNDP_KOSOVO']{display:none!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button{position:relative;min-height:32px!important;height:32px!important;padding:0 9px 0 6px!important;border:1px solid #DCE6EA!important;border-radius:999px!important;background:#FFF!important;color:#344C57!important;font-size:10.25px!important;font-weight:760!important;letter-spacing:0!important;gap:5px!important;white-space:nowrap!important;box-shadow:0 2px 7px rgba(41,71,82,.025)!important;transition:background .16s ease,border-color .16s ease,color .16s ease,box-shadow .16s ease,transform .16s ease!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button:hover{border-color:#B9D1DA!important;background:#F8FBFC!important;color:#2E718A!important;box-shadow:0 5px 14px rgba(51,112,136,.07)!important;transform:translateY(-1px)!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button:focus-visible{outline:2px solid rgba(57,127,152,.28)!important;outline-offset:2px!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button::before{content:'•';width:21px;height:21px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 21px;border-radius:7px;background:#EEF4F6;color:#477B8D;font-size:11px;font-weight:900;line-height:1}
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
#page-kek-tenders #pst-pcw-opportunity-tabs button i{min-width:19px!important;height:19px!important;padding:0 4px!important;border-radius:999px!important;background:#F1F4F6!important;color:#6D7D84!important;font-size:9px!important;font-weight:800!important;opacity:1!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button.on{border-color:#397F98!important;background:linear-gradient(135deg,#3E89A3,#32778F)!important;color:#FFF!important;box-shadow:0 7px 16px rgba(50,119,143,.18)!important;transform:none!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button.on::before{background:rgba(255,255,255,.17)!important;color:#FFF!important}
#page-kek-tenders #pst-pcw-opportunity-tabs button.on i{background:#FFF!important;color:#31768E!important}
#page-kek-tenders .pst-pcw-empty{min-height:150px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#85969E!important;font-size:12px!important}

@media(max-width:1050px) and (min-width:721px){
 #page-kek-tenders #pst-pcw-lifecycle-tabs{grid-template-columns:minmax(165px,1fr) 158px minmax(165px,1fr)!important;gap:16px 28px!important;padding:30px 24px 26px!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node{width:100%!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-center{width:150px!important}
}
@media(max-width:720px){
 #page-kek-tenders #pst-opportunities-focus{padding:18px!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important;grid-template-areas:"center center" "new waiting" "replied all"!important;grid-template-rows:auto!important;gap:9px!important;padding:36px 15px 15px!important;background:#F8FBFC!important;overflow:visible!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs::before{display:none!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs::after{left:15px;top:11px}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-center{grid-area:center!important;width:100%!important;min-height:76px!important;border-radius:16px!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-center span{display:none!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node{width:100%!important;min-height:60px!important;justify-self:stretch!important;align-self:stretch!important;transform:none!important}
 #page-kek-tenders #pst-pcw-opportunity-tabs{padding-left:0!important;padding-top:27px!important}
 #page-kek-tenders #pst-pcw-opportunity-tabs::before{top:5px;transform:none;width:auto}
 #page-kek-tenders #pst-pcw-opportunity-tabs button{height:31px!important;min-height:31px!important;padding-right:7px!important}
}
@media(prefers-reduced-motion:reduce){
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node,#page-kek-tenders #pst-pcw-opportunity-tabs button{transition:none!important}
 #page-kek-tenders #pst-pcw-lifecycle-tabs .pst-pcw-map-node:hover,#page-kek-tenders #pst-pcw-opportunity-tabs button:hover{transform:none!important}
}
`;
document.head.appendChild(s);
installProjectsBackBridge();
loadWaitingBridge();
window.PSTOpportunitiesFilterPolishV1={version:'20260916-final-owner1',styleId:s.id,openCanonicalHome:openCanonicalHome};
})();