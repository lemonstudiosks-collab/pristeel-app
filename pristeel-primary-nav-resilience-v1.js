/* PRISTEEL Primary Navigation Resilience v6
 * Single owner for the six daily PPPP navigation zones.
 * Stabilizes the visible sidebar atomically and routes through the established
 * application owners. The experimental project overlays are intentionally NOT
 * loaded here because they competed for pstOpenProjectWorkspace ownership.
 *
 * Retired production overlays kept as manifest references only:
 * pristeel-operator-flow-v1.js
 * pristeel-unified-project-flow-v1.js
 */
(function(){
'use strict';
if(window.__pstPrimaryNavResilienceV6)return;
window.__pstPrimaryNavResilienceV6=true;
window.__pstPrimaryNavResilienceV5=true;
window.__pstPrimaryNavResilienceV4=true;
window.__pstPrimaryNavResilienceV3=true;
window.__pstPrimaryNavResilienceV2=true;
window.__pstPrimaryNavResilienceV1=true;

var KEYS={home:1,tenders:1,opportunities:1,projects:1,contacts:1,partners:1,finance:1,apps:1,system:1};
var LABELS={home:'Home',tenders:'Mundësitë',projects:'Projektet',contacts:'Partnerët',finance:'Financat',apps:'Sistemi'};
var ICONS={
 home:'<path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
 tenders:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
 projects:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>',
 contacts:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>',
 finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>',
 apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'
};
var ORDER=['home','tenders','projects','contacts','finance','apps'];
var repairTimer=0;
function S(v){return String(v==null?'':v);}
function canon(key){key=S(key).toLowerCase();if(key==='opportunities')return'tenders';if(key==='partners')return'contacts';if(key==='system')return'apps';return key;}
function svg(key){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICONS[key]||'')+'</svg>';}
function visible(el){return !!(el&&el.classList.contains('active')&&el.style.display!=='none');}
function currentKey(){
 if(visible(document.getElementById('page-workspace-home')))return'home';
 if(visible(document.getElementById('page-kek-tenders')))return'tenders';
 if(visible(document.getElementById('page-workspace-projects'))||visible(document.getElementById('page-workspace-project')))return'projects';
 if(visible(document.getElementById('page-workspace-contacts'))||visible(document.getElementById('page-contacts')))return'contacts';
 if(visible(document.getElementById('page-finance')))return'finance';
 if(visible(document.getElementById('page-workspace-apps'))||visible(document.getElementById('module-hub')))return'apps';
 return 'home';
}
function badgeSnapshot(ws){
 var out={};['home','projects','finance'].forEach(function(k){var id=k==='home'?'pst-ws-b-home':k==='projects'?'pst-ws-b-projects':'pst-ws-b-finance';var e=document.getElementById(id);if(e&&ws.contains(e)){out[k]={text:S(e.textContent),display:e.style.display};}});return out;
}
function repairSidebar(){
 var ws=document.getElementById('pst-ws-sidebar');if(!ws)return false;
 var snap=badgeSnapshot(ws);
 var hosts=Array.prototype.slice.call(ws.querySelectorAll('#pst-ws-canonical-nav'));
 var host=hosts.shift();hosts.forEach(function(x){x.remove();});
 if(!host){host=document.createElement('div');host.id='pst-ws-canonical-nav';var create=ws.querySelector('.pst-ws-create');if(create)create.insertAdjacentElement('afterend',host);else ws.prepend(host);}
 host.innerHTML='<div class="pst-ws-navtitle">PPPP</div><div class="pst-ws-nav pst-canon-work"></div>';
 var work=host.querySelector('.pst-canon-work');
 ORDER.forEach(function(key){
   var b=document.createElement('button');b.type='button';b.className='pst-ws-navbtn pst-canonical-navbtn pst-business-primary';b.dataset.key=key;b.dataset.pstBusinessZone=key==='tenders'?'opportunities':key==='contacts'?'partners':key==='apps'?'system':key;
   b.innerHTML=svg(key)+'<span class="pst-nav-label">'+LABELS[key]+'</span>';
   if(snap[key]){var i=document.createElement('i');i.className='pst-ws-badge';i.id=key==='home'?'pst-ws-b-home':key==='projects'?'pst-ws-b-projects':'pst-ws-b-finance';i.textContent=snap[key].text;if(snap[key].display)i.style.display=snap[key].display;b.appendChild(i);}
   work.appendChild(b);
 });
 Array.prototype.forEach.call(ws.children,function(ch){
   var keep=ch===host||ch.classList.contains('pst-ws-brand')||ch.classList.contains('pst-ws-create')||ch.classList.contains('pst-ws-spacer')||ch.classList.contains('pst-ws-search');
   if(keep)ch.style.removeProperty('display');else ch.style.setProperty('display','none','important');
 });
 mark(currentKey());
 return true;
}
function scheduleRepair(){clearTimeout(repairTimer);repairTimer=setTimeout(repairSidebar,0);[120,420,1450].forEach(function(ms){setTimeout(repairSidebar,ms);});}
function mark(key){key=canon(key);var host=document.getElementById('pst-ws-canonical-nav');if(!host)return;host.querySelectorAll('.pst-ws-navbtn[data-key]').forEach(function(b){b.classList.toggle('active',canon(b.dataset.key)===key);});}
function hidePages(except){document.querySelectorAll('.page').forEach(function(p){if(p===except)return;p.classList.remove('active');p.style.display='none';});}
function activate(id,key){var p=document.getElementById(id);if(!p)return false;hidePages(p);p.classList.add('active');p.style.display='block';mark(key);return p;}
function legacyShow(name){try{var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function'){L.showPage(name);return true;}}catch(e){}try{if(typeof window.showPage==='function'){window.showPage(name);return true;}}catch(e){}return false;}
function openHome(){
 var H=window.PSTHomeCanonicalV1;
 try{if(H&&typeof H.activateHome==='function')H.activateHome();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home');else activate('page-workspace-home','home');}catch(e){activate('page-workspace-home','home');}
 try{if(H&&typeof H.render==='function')Promise.resolve(H.render(true)).catch(function(){});}catch(e){}
 mark('home');scheduleRepair();return true;
}
function openOpportunities(){
 var page=document.getElementById('page-kek-tenders'),X=window.PSTProjectCentricWorkflowV1;
 try{if(page&&X&&typeof X.loadOpportunities==='function'){activate('page-kek-tenders','tenders');Promise.resolve(X.loadOpportunities(true)).catch(function(){});mark('tenders');scheduleRepair();return true;}}catch(e){}
 try{if(typeof window.pstTenderBizOpenMonitor==='function')window.pstTenderBizOpenMonitor();else if(typeof window.pstWsKekTenders==='function')window.pstWsKekTenders();else if(!legacyShow('kek-tenders'))activate('page-kek-tenders','tenders');}catch(e){activate('page-kek-tenders','tenders');}
 mark('tenders');scheduleRepair();return true;
}
function openProjects(filter){
 try{if(typeof window.pstProjectsModernOpen==='function')window.pstProjectsModernOpen();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');else activate('page-workspace-projects','projects');}catch(e){activate('page-workspace-projects','projects');}
 mark('projects');scheduleRepair();
 if(filter)setTimeout(function(){var b=document.querySelector('#page-workspace-projects [data-pm-filter="'+S(filter)+'"]');if(b)b.click();},120);
 return true;
}
function openPartners(){
 try{var C=window.PSTContactMasterV1;if(C&&typeof C.open==='function')C.open();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('contacts');else if(!legacyShow('contacts'))activate('page-contacts','contacts');}catch(e){activate('page-contacts','contacts');}
 mark('contacts');scheduleRepair();return true;
}
function openFinance(){
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('finance');else if(!legacyShow('finance'))activate('page-finance','finance');}catch(e){activate('page-finance','finance');}
 mark('finance');scheduleRepair();return true;
}
function openSystem(){
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('apps');else if(typeof window.openModuleHub==='function')window.openModuleHub();else activate('page-workspace-apps','apps');}catch(e){activate('page-workspace-apps','apps');}
 mark('apps');scheduleRepair();return true;
}
function route(key){key=canon(key);if(key==='home')return openHome();if(key==='tenders')return openOpportunities();if(key==='projects')return openProjects();if(key==='contacts')return openPartners();if(key==='finance')return openFinance();if(key==='apps')return openSystem();return false;}
function intercept(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;if(!b)return;var key=canon(b.dataset.key);if(!KEYS[key])return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();route(key);}
document.addEventListener('click',intercept,true);
function apply(){repairSidebar();}
document.addEventListener('pst:modules-ready',scheduleRepair,{once:true});
document.addEventListener('pst:home-canonical-rendered',scheduleRepair);
document.addEventListener('pst:project-opened',scheduleRepair);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',scheduleRepair,{once:true});else scheduleRepair();
window.PSTPrimaryNavResilienceV1=window.PSTPrimaryNavResilienceV2=window.PSTPrimaryNavResilienceV3=window.PSTPrimaryNavResilienceV4=window.PSTPrimaryNavResilienceV5=window.PSTPrimaryNavResilienceV6={route:route,go:route,openHome:openHome,openOpportunities:openOpportunities,openProjects:openProjects,openPartners:openPartners,openFinance:openFinance,openSystem:openSystem,apply:apply,repairSidebar:repairSidebar,_test:{canon:canon,currentKey:currentKey}};
})();