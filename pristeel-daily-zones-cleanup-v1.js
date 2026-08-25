/* PRISTEEL daily zones cleanup v1
 * Final presentation-only cleanup for business workspaces that already have canonical owners.
 * Keeps legacy providers/functions reachable but removes technical/duplicate chrome from daily use.
 * No database reads/writes, no polling, no MutationObserver, no routing ownership.
 */
(function(){
'use strict';
if(window.__pstDailyZonesCleanupV1)return;
window.__pstDailyZonesCleanupV1=true;

function E(v){return String(v==null?'':v);}
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
function cleanProjectSummary(){
  var p=active('page-workspace-project');if(!p)return false;
  p.querySelectorAll('.pwf-project-kpis').forEach(function(x){x.classList.add('pst-daily-passive-count');});
  return true;
}
function cleanSystemLabels(){
  var p=active('page-workspace-apps');if(!p)return false;
  p.querySelectorAll('[data-system-tool]').forEach(function(x){x.setAttribute('data-pst-system-owned','1');});
  return true;
}
function apply(){cleanPartners();cleanProjectSummary();cleanSystemLabels();}
function css(){if(document.getElementById('pst-daily-zones-cleanup-css'))return;var s=document.createElement('style');s.id='pst-daily-zones-cleanup-css';s.textContent=`
#page-workspace-contacts.active .pst-daily-system-only{display:none!important}
#page-workspace-contacts.active .pst-daily-passive-count{display:none!important}
#page-workspace-contacts.active .pcm-head-actions:empty{display:none!important}
#page-workspace-contacts.active .pcm-business-card{min-width:0!important;padding-left:14px!important;padding-right:14px!important}
#page-workspace-contacts.active .pcm-card-head{padding-bottom:8px!important}
#page-workspace-project.active .pst-daily-passive-count{display:none!important}
`;document.head.appendChild(s);}
function schedule(){[0,80,220,650].forEach(function(ms){setTimeout(apply,ms);});}
css();
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-pcm-business],[data-pcm-refresh],[data-pcm-classic],[data-pwf-area],[data-pwf-stage]'):null;if(t)schedule();},true);
if(document.readyState!=='loading')schedule();
window.PSTDailyZonesCleanupV1={apply:apply,schedule:schedule,cleanPartners:cleanPartners,cleanProjectSummary:cleanProjectSummary};
})();