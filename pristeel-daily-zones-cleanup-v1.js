/* PRISTEEL daily zones cleanup v2
 * Final presentation-only cleanup for business workspaces that already have canonical owners.
 * Keeps legacy providers/functions reachable but removes technical/duplicate chrome from daily use.
 * No database reads/writes, no polling, no MutationObserver, no routing ownership.
 */
(function(){
'use strict';
if(window.__pstDailyZonesCleanupV2)return;
window.__pstDailyZonesCleanupV2=true;
window.__pstDailyZonesCleanupV1=true;

function active(id){var p=document.getElementById(id);return p&&p.classList.contains('active')?p:null;}
function cleanPartners(){
  var p=active('page-workspace-contacts');if(!p)return false;
  var h=p.querySelector('.pcm-head h1');if(h)h.textContent='Partners';
  var sub=p.querySelector('.pcm-head p');if(sub)sub.textContent='Klientë, furnitorë dhe partnerë, një identitet për Gmail, HubSpot, Bitrix24 dhe projektet.';
  var cardTitle=p.querySelector('.pcm-card-head b');if(cardTitle)cardTitle.textContent='Marrëdhëniet';
  p.querySelectorAll('[data-pcm-refresh],[data-pcm-classic]').forEach(function(x){x.classList.add('pst-daily-system-only');});
  p.querySelectorAll('[data-pcm-business-count],#pcm-count').forEach(function(x){x.classList.add('pst-daily-passive-count');});
  return true;
}
function cleanProjectsList(){
  var p=active('page-workspace-projects');if(!p)return false;
  var title=p.querySelector('.pst-pm-title');if(title)title.textContent='Projektet';
  var sub=p.querySelector('.pst-pm-sub');if(sub)sub.textContent='Projekt → gjendja reale → hapi tjetër → afati kritik.';
  p.querySelectorAll('#pst-pdm-btn,#pst-pm-refresh,#pst-pm-new,#pst-pm-sort,.pst-pm-toggle,#pst-pm-filters,#pst-pc-filterbar').forEach(function(x){x.classList.add('pst-daily-project-tool');});
  return true;
}
function cleanProjectSummary(){
  var p=active('page-workspace-project');if(!p)return false;
  p.querySelectorAll('.pwf-project-kpis').forEach(function(x){x.classList.add('pst-daily-passive-count');});
  return true;
}
function systemHealth(){
  var p=active('page-workspace-apps');if(!p)return false;
  var X=window.PSTAutomationHealthV1;if(X&&typeof X.load==='function'){X.load(false);return true;}
  if(document.querySelector('script[data-pst-automation-health]'))return true;
  var s=document.createElement('script');s.src='pristeel-automation-health-v1.js?v=20260825-system2';s.defer=true;s.setAttribute('data-pst-automation-health','1');s.onload=function(){var H=window.PSTAutomationHealthV1;if(H&&typeof H.load==='function')H.load(false);};document.head.appendChild(s);return true;
}
function ensureSystemTools(p,grid){
  if(!p||!grid)return null;
  var details=p.querySelector('#pst-system-advanced-tools');
  if(!details){
    details=document.createElement('details');details.id='pst-system-advanced-tools';
    details.innerHTML='<summary><div><b>Mjete teknike</b><span>Gmail, diagnostika, integrimet dhe modulet rezervë</span></div><i>Hap vetëm kur duhet</i></summary><div class="pst-system-advanced-body"></div>';
    grid.parentNode.insertBefore(details,grid);details.querySelector('.pst-system-advanced-body').appendChild(grid);
  }else if(!details.contains(grid)){
    var body=details.querySelector('.pst-system-advanced-body');if(body)body.appendChild(grid);
  }
  return details;
}
function cleanSystemLabels(){
  var p=active('page-workspace-apps');if(!p)return false;
  var eyebrow=p.querySelector('.pst-ws-eyebrow'),title=p.querySelector('.pst-ws-title'),sub=p.querySelector('.pst-ws-sub');
  if(eyebrow)eyebrow.textContent='SYSTEM';
  if(title)title.textContent='Sistemi dhe automatizimet';
  if(sub)sub.textContent='Shëndeti i motorëve është i dukshëm; mjetet teknike që nuk duhen çdo ditë qëndrojnë të palosura.';
  var duplicate=p.querySelector('#pst-system-operating-tools');if(duplicate)duplicate.classList.add('pst-daily-system-duplicate');
  var grid=p.querySelector('.pst-ws-appgrid,[data-pst-system-tools="1"]');
  if(grid){grid.setAttribute('data-pst-system-tools','1');var details=ensureSystemTools(p,grid),health=p.querySelector('#pst-auto-health');if(details&&health&&health.parentNode)details.parentNode.insertBefore(health,details);}
  systemHealth();
  return true;
}
function financeDaily(){
  var p=active('page-finance');if(!p)return false;
  var X=window.PSTFinanceDailyV1;if(X&&typeof X.apply==='function'){X.apply(false);return true;}
  if(document.querySelector('script[data-pst-finance-daily]'))return true;
  var s=document.createElement('script');s.src='pristeel-finance-daily-v1.js?v=20260825-1';s.defer=true;s.setAttribute('data-pst-finance-daily','1');s.onload=function(){var F=window.PSTFinanceDailyV1;if(F&&typeof F.apply==='function')F.apply(false);};document.head.appendChild(s);return true;
}
function opportunitiesDaily(){
  var p=active('page-kek-tenders');if(!p)return false;
  var X=window.PSTOpportunitiesDailyV1;if(X&&typeof X.apply==='function'){X.apply(false);return true;}
  if(document.querySelector('script[data-pst-opportunities-daily]'))return true;
  var s=document.createElement('script');s.src='pristeel-opportunities-daily-v1.js?v=20260825-1';s.defer=true;s.setAttribute('data-pst-opportunities-daily','1');s.onload=function(){var O=window.PSTOpportunitiesDailyV1;if(O&&typeof O.apply==='function')O.apply(false);};document.head.appendChild(s);return true;
}
function apply(){cleanPartners();cleanProjectsList();cleanProjectSummary();cleanSystemLabels();financeDaily();opportunitiesDaily();}
function css(){if(document.getElementById('pst-daily-zones-cleanup-css'))return;var s=document.createElement('style');s.id='pst-daily-zones-cleanup-css';s.textContent=`
#page-workspace-contacts.active .pst-daily-system-only{display:none!important}
#page-workspace-contacts.active .pst-daily-passive-count{display:none!important}
#page-workspace-contacts.active .pcm-head-actions:empty{display:none!important}
#page-workspace-contacts.active .pcm-business-card{min-width:0!important;padding-left:14px!important;padding-right:14px!important}
#page-workspace-contacts.active .pcm-card-head{padding-bottom:8px!important}
#page-workspace-projects.active .pst-daily-project-tool{display:none!important}
#page-workspace-projects.active .pst-pm-control-top{gap:0!important}
#page-workspace-projects.active .pst-pm-search{min-width:0!important}
#page-workspace-project.active .pst-daily-passive-count{display:none!important}
#page-workspace-apps.active .pst-daily-system-duplicate{display:none!important}
#page-workspace-apps.active #pst-system-advanced-tools{margin-top:12px;border:1px solid #E1E8EB;border-radius:12px;background:#fff;overflow:hidden}
#page-workspace-apps.active #pst-system-advanced-tools>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 15px}
#page-workspace-apps.active #pst-system-advanced-tools>summary::-webkit-details-marker{display:none}
#page-workspace-apps.active #pst-system-advanced-tools>summary b{display:block;font-size:10px;color:#475D66}
#page-workspace-apps.active #pst-system-advanced-tools>summary span{display:block;margin-top:2px;font-size:8px;color:#88979D}
#page-workspace-apps.active #pst-system-advanced-tools>summary i{font-style:normal;font-size:8px;font-weight:850;color:#4B8195}
#page-workspace-apps.active #pst-system-advanced-tools[open]>summary{border-bottom:1px solid #E5ECEE}
#page-workspace-apps.active .pst-system-advanced-body{padding:12px}
#page-workspace-apps.active [data-pst-system-tools="1"]{margin-top:0!important}
#page-workspace-apps.active [data-pst-system-tools="1"] .pst-ws-app{min-height:92px!important}
`;document.head.appendChild(s);}
function schedule(){[0,80,220,650].forEach(function(ms){setTimeout(apply,ms);});}
css();
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-pm-filter],[data-pws-work],[data-pcm-business],[data-pcm-refresh],[data-pcm-classic],[data-pwf-area],[data-pwf-stage],[onclick*="finSwitchTab"],[onclick*="finShowHub"],.pst-kek-btn,.pst-kek-filter'):null;if(t)schedule();},true);
if(document.readyState!=='loading')schedule();
window.PSTDailyZonesCleanupV1=window.PSTDailyZonesCleanupV2={apply:apply,schedule:schedule,cleanPartners:cleanPartners,cleanProjectsList:cleanProjectsList,cleanProjectSummary:cleanProjectSummary,cleanSystemLabels:cleanSystemLabels,systemHealth:systemHealth,financeDaily:financeDaily,opportunitiesDaily:opportunitiesDaily};
})();