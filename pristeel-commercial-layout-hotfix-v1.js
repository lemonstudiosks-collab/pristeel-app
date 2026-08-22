/* PRISTEEL commercial layout hotfix v1
 * Visual-only fix for the normalized supplier comparison.
 * Loaded after the canonical commercial module so source CSS cannot override it.
 * No data access, calculations, polling, routing or business logic.
 */
(function(){
'use strict';
if(window.__pstCommercialLayoutHotfixV1)return;
window.__pstCommercialLayoutHotfixV1=true;

var s=document.createElement('style');
s.id='pst-commercial-layout-hotfix-v1-css';
s.textContent=`
/* Keep the entire commercial card inside the available viewport. */
#page-workspace-project.pf2-on [data-pf2-compare]{min-width:0!important;max-width:100%!important;overflow:hidden!important}
#page-workspace-project.pf2-on .pf2-compare-wrap{width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important}

/* The source table used nowrap + a very wide fixed minimum. Allow natural wrapping. */
#page-workspace-project.pf2-on .pf2-compare{
  width:100%!important;
  min-width:0!important;
  table-layout:fixed!important;
  font-size:14px!important;
}
#page-workspace-project.pf2-on .pf2-compare th{
  font-size:12.5px!important;
  line-height:1.35!important;
  padding:11px 7px!important;
  white-space:normal!important;
  overflow-wrap:anywhere!important;
  word-break:normal!important;
  vertical-align:bottom!important;
}
#page-workspace-project.pf2-on .pf2-compare td{
  font-size:13.5px!important;
  line-height:1.42!important;
  padding:12px 7px!important;
  white-space:normal!important;
  overflow-wrap:anywhere!important;
  word-break:normal!important;
  vertical-align:middle!important;
}
#page-workspace-project.pf2-on .pf2-compare td span{font-size:12px!important;line-height:1.35!important}
#page-workspace-project.pf2-on .pf2-compare td em{font-size:12.5px!important;line-height:1.4!important}
#page-workspace-project.pf2-on .pf2-detail-btn{font-size:12.5px!important;padding:5px 8px!important}

/* Allocate more width to descriptive columns, less to short numeric/status columns. */
#page-workspace-project.pf2-on .pf2-compare th:nth-child(1),#page-workspace-project.pf2-on .pf2-compare td:nth-child(1){width:12%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(2),#page-workspace-project.pf2-on .pf2-compare td:nth-child(2){width:9%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(3),#page-workspace-project.pf2-on .pf2-compare td:nth-child(3){width:7%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(4),#page-workspace-project.pf2-on .pf2-compare td:nth-child(4){width:8%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(5),#page-workspace-project.pf2-on .pf2-compare td:nth-child(5){width:8%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(6),#page-workspace-project.pf2-on .pf2-compare td:nth-child(6){width:7%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(7),#page-workspace-project.pf2-on .pf2-compare td:nth-child(7){width:12%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(8),#page-workspace-project.pf2-on .pf2-compare td:nth-child(8){width:7%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(9),#page-workspace-project.pf2-on .pf2-compare td:nth-child(9){width:8%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(10),#page-workspace-project.pf2-on .pf2-compare td:nth-child(10){width:6%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(11),#page-workspace-project.pf2-on .pf2-compare td:nth-child(11){width:6%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(12),#page-workspace-project.pf2-on .pf2-compare td:nth-child(12){width:6%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(13),#page-workspace-project.pf2-on .pf2-compare td:nth-child(13){width:6%!important}
#page-workspace-project.pf2-on .pf2-compare th:nth-child(14),#page-workspace-project.pf2-on .pf2-compare td:nth-child(14){width:6%!important}

/* Critical fix: the terms/source panel must be BELOW the price breakdown, never clipped at right. */
#page-workspace-project.pf2-on .pf2-break{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  padding:16px!important;
  box-sizing:border-box!important;
}
#page-workspace-project.pf2-on .pf2-break-list,
#page-workspace-project.pf2-on .pf2-break-terms{
  display:block!important;
  width:100%!important;
  max-width:100%!important;
  min-width:0!important;
  box-sizing:border-box!important;
}
#page-workspace-project.pf2-on .pf2-break-terms{margin-top:12px!important}
#page-workspace-project.pf2-on .pf2-break-row,
#page-workspace-project.pf2-on .pf2-break-total{
  grid-template-columns:minmax(280px,1.55fr) minmax(240px,1fr) minmax(150px,.55fr)!important;
  gap:14px!important;
  padding:12px 14px!important;
}
#page-workspace-project.pf2-on .pf2-break-row span,
#page-workspace-project.pf2-on .pf2-break-row b,
#page-workspace-project.pf2-on .pf2-break-total span,
#page-workspace-project.pf2-on .pf2-break-terms p{font-size:14px!important;line-height:1.5!important}
#page-workspace-project.pf2-on .pf2-break-row strong,
#page-workspace-project.pf2-on .pf2-break-total strong{font-size:15px!important}

/* Only use the extra room on genuinely wide desktops. */
@media(min-width:1700px){
  #page-workspace-project.pf2-on .pf2-compare td{font-size:14px!important;padding-top:13px!important;padding-bottom:13px!important}
  #page-workspace-project.pf2-on .pf2-compare th{font-size:13px!important}
  #page-workspace-project.pf2-on .pf2-break-row span,
  #page-workspace-project.pf2-on .pf2-break-row b,
  #page-workspace-project.pf2-on .pf2-break-total span,
  #page-workspace-project.pf2-on .pf2-break-terms p{font-size:14.5px!important}
  #page-workspace-project.pf2-on .pf2-break-row strong,
  #page-workspace-project.pf2-on .pf2-break-total strong{font-size:15.5px!important}
}
@media(max-width:1250px){
  #page-workspace-project.pf2-on .pf2-compare{min-width:1380px!important}
}
@media(max-width:760px){
  #page-workspace-project.pf2-on .pf2-break-row,
  #page-workspace-project.pf2-on .pf2-break-total{grid-template-columns:1fr!important;gap:4px!important}
  #page-workspace-project.pf2-on .pf2-break-row strong,
  #page-workspace-project.pf2-on .pf2-break-total strong{text-align:left!important}
}
`;
document.head.appendChild(s);
window.PSTCommercialLayoutHotfixV1={styleId:s.id};
})();
