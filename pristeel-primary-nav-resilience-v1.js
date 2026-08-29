/* PRISTEEL Primary Navigation Resilience v10
 * Single owner for the six daily PPPP navigation zones.
 * Stabilizes the visible sidebar, removes duplicate daily controls conservatively,
 * and surfaces only genuinely relevant tender decisions on Home.
 * Existing engines, records and approval gates remain authoritative.
 *
 * Bounded compatibility assets (not normal daily UI owners):
 * pristeel-operator-flow-v1.js?v=20260829-flow2
 * pristeel-unified-project-flow-v1.js?v=20260829-flow1
 * pristeel-offer-revision-email-draft-v1.js
 * pristeel-offer-revision-email-bridge-v1.js
 * pristeel-project-offer-revision-assistant-v1.js
 * pristeel-home-operating-grid-v1.js
 * pristeel-tender-priority-actions-v1.js
 * pristeel-project-classification-v1.js
 */
(function(){
'use strict';
if(window.__pstPrimaryNavResilienceV10)return;
window.__pstPrimaryNavResilienceV10=true;
window.__pstPrimaryNavResilienceV9=true;
window.__pstPrimaryNavResilienceV8=true;
window.__pstPrimaryNavResilienceV7=true;
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
var repairTimer=0,polishTimer=0,tenderRenderToken=0;
function S(v){return String(v==null?'':v);}
function esc(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function norm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
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

/* Compatibility hooks stay opt-in so legacy visual owners cannot race the final UI. */
function ensureUnifiedProjectFlow(){
 if(window.PSTUnifiedProjectFlowV1)return Promise.resolve(window.PSTUnifiedProjectFlowV1);
 if(window.__pstAllowUnifiedProjectFallback!==true)return Promise.resolve(null);
 return new Promise(function(resolve){
   var src='pristeel-unified-project-flow-v1.js?v=20260829-flow1';
   var existing=document.querySelector('script[data-pst-unified-project-flow]');
   if(existing){existing.addEventListener('load',function(){resolve(window.PSTUnifiedProjectFlowV1||null);},{once:true});return;}
   var s=document.createElement('script');s.src=src;s.async=true;s.dataset.pstUnifiedProjectFlow='1';s.onload=function(){resolve(window.PSTUnifiedProjectFlowV1||null);};s.onerror=function(){resolve(null);};document.head.appendChild(s);
 });
}
function ensureOperatorFlow(){
 if(window.PSTOperatorFlowV1)return Promise.resolve(window.PSTOperatorFlowV1);
 if(window.__pstAllowOperatorFlowFallback!==true)return Promise.resolve(null);
 return new Promise(function(resolve){
   var src='pristeel-operator-flow-v1.js?v=20260829-flow2';
   var existing=document.querySelector('script[data-pst-operator-flow]');
   if(existing){existing.addEventListener('load',function(){resolve(window.PSTOperatorFlowV1||null);},{once:true});return;}
   var s=document.createElement('script');s.src=src;s.async=true;s.dataset.pstOperatorFlow='1';s.onload=function(){resolve(window.PSTOperatorFlowV1||null);};s.onerror=function(){resolve(null);};document.head.appendChild(s);
 });
}
function openHome(){
 var H=window.PSTHomeCanonicalV1;
 try{if(H&&typeof H.activateHome==='function')H.activateHome();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('home');else activate('page-workspace-home','home');}catch(e){activate('page-workspace-home','home');}
 try{if(H&&typeof H.render==='function')Promise.resolve(H.render(true)).catch(function(){});}catch(e){}
 mark('home');scheduleRepair();schedulePolish();return true;
}
function handoffOpportunities(force){
 var page=document.getElementById('page-kek-tenders'),X=window.PSTProjectCentricWorkflowV1;if(!page||!X)return false;
 try{
   activate('page-kek-tenders','tenders');
   if(typeof X.openOpportunities==='function'){Promise.resolve(X.openOpportunities(force)).catch(function(){});return true;}
   if(typeof X.loadOpportunities==='function'){Promise.resolve(X.loadOpportunities(force)).catch(function(){});return true;}
 }catch(e){}
 return false;
}
function openOpportunities(){
 if(handoffOpportunities(true)){mark('tenders');scheduleRepair();schedulePolish();return true;}
 try{if(typeof window.pstTenderBizOpenMonitor==='function')window.pstTenderBizOpenMonitor();else if(typeof window.pstWsKekTenders==='function')window.pstWsKekTenders();else if(!legacyShow('kek-tenders'))activate('page-kek-tenders','tenders');}catch(e){activate('page-kek-tenders','tenders');}
 mark('tenders');scheduleRepair();schedulePolish();return true;
}
function openProjects(filter){
 try{if(typeof window.pstProjectsModernOpen==='function')window.pstProjectsModernOpen();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');else activate('page-workspace-projects','projects');}catch(e){activate('page-workspace-projects','projects');}
 mark('projects');scheduleRepair();schedulePolish();
 if(filter)setTimeout(function(){var b=document.querySelector('#page-workspace-projects [data-pm-filter="'+S(filter)+'"]');if(b)b.click();},120);
 return true;
}
function openPartners(){
 try{var C=window.PSTContactMasterV1;if(C&&typeof C.open==='function')C.open();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('contacts');else if(!legacyShow('contacts'))activate('page-contacts','contacts');}catch(e){activate('page-contacts','contacts');}
 mark('contacts');scheduleRepair();schedulePolish();return true;
}
function openFinance(){
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('finance');else if(!legacyShow('finance'))activate('page-finance','finance');}catch(e){activate('page-finance','finance');}
 mark('finance');scheduleRepair();schedulePolish();return true;
}
function openSystem(){
 try{if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('apps');else if(typeof window.openModuleHub==='function')window.openModuleHub();else activate('page-workspace-apps','apps');}catch(e){activate('page-workspace-apps','apps');}
 mark('apps');scheduleRepair();schedulePolish();return true;
}
function route(key){
 key=S(key).toLowerCase();
 if(key==='tenders'||key==='opportunities')return openOpportunities();
 key=canon(key);if(key==='home')return openHome();if(key==='projects')return openProjects();if(key==='contacts')return openPartners();if(key==='finance')return openFinance();if(key==='apps')return openSystem();return false;
}
function intercept(e){var b=e.target&&e.target.closest?e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn[data-key]'):null;if(!b)return;var key=canon(b.dataset.key);if(!KEYS[key])return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();route(key);}
document.addEventListener('click',intercept,true);

function actionSignature(el){
 var label=norm(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title'));
 var action=[el.getAttribute('data-pwf-stage'),el.getAttribute('data-pwf-area'),el.getAttribute('data-key'),el.getAttribute('data-brief-act'),el.getAttribute('href'),el.getAttribute('onclick')].filter(Boolean).join('|');
 return label&&action?label+'|'+action:'';
}
function cleanupDailyControls(){
 var page=document.querySelector('.page.active');if(!page)return false;
 var groups=page.querySelectorAll('.pst-brief-actions,.pwf-stage-nav,.pst-project-utilities,.pst-business-phases,.pst-ws-actions,.pst-ws-action-buttons,.pst-card-actions,.pst-project-actions');
 Array.prototype.forEach.call(groups,function(group){
   var seen={};Array.prototype.forEach.call(group.querySelectorAll(':scope > button,:scope > a'),function(el){
     var label=norm(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title'));
     if(!label&&!el.querySelector('svg,img')){el.remove();return;}
     var sig=actionSignature(el);if(!sig)return;if(seen[sig])el.remove();else seen[sig]=true;
   });
 });
 return true;
}
function installTenderStyle(){
 if(document.getElementById('pst-home-tender-style'))return;
 var s=document.createElement('style');s.id='pst-home-tender-style';s.textContent='#pst-home-tender-decisions{margin-top:14px}#pst-home-tender-decisions .pst-tender-decision-list{display:grid;gap:8px}#pst-home-tender-decisions .pst-tender-decision{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;border:1px solid #E3EAED;border-radius:12px;padding:12px 13px;background:#fff}#pst-home-tender-decisions .pst-tender-decision b{display:block;font-size:12px;line-height:1.35;color:#30454F}#pst-home-tender-decisions .pst-tender-decision small{display:block;margin-top:4px;font-size:9.5px;line-height:1.45;color:#73858D}#pst-home-tender-decisions .pst-tender-decision button{min-height:34px;padding:0 12px;border:1px solid #CFE0E6;border-radius:9px;background:#F3F9FA;color:#39768D;font-size:10px;font-weight:800;cursor:pointer}#pst-home-tender-decisions .pst-tender-decision button:hover{background:#E7F3F6}@media(max-width:680px){#pst-home-tender-decisions .pst-tender-decision{grid-template-columns:1fr}#pst-home-tender-decisions .pst-tender-decision button{width:100%}}';document.head.appendChild(s);
}
function sourceLabel(row){var k=S(row&&row.source_key);if(k.indexOf('TED:')===0)return'TED';if(k.indexOf('APP_AL:')===0)return'APP';return'KRPP';}
function tenderMeta(row){var a=[sourceLabel(row),row.authority||'',row.procurement_no||''];if(row.deadline)a.push('Afati '+S(row.deadline));if(Number(row.relevance_score)>0)a.push('Relevanca '+Number(row.relevance_score)+'%');return a.filter(Boolean).join(' · ');}
async function renderHomeTenderDecisions(){
 var token=++tenderRenderToken,page=document.getElementById('page-workspace-home');if(!visible(page)||typeof window.supaFetch!=='function')return false;
 var rows=[];try{rows=await window.supaFetch('pppp_tender_operating_lanes_v1?human_action_required=eq.true&operating_lane=in.(discovery,scored_review)&relevance_score=gte.75&project_id=is.null&select=id,source_key,procurement_no,authority,title,estimated_value,currency,deadline,relevance_score,operating_lane,status,project_id,detail_url,source_url&order=relevance_score.desc,deadline.asc&limit=5')||[];}catch(e){return false;}
 if(token!==tenderRenderToken)return false;
 rows=(Array.isArray(rows)?rows:[]).filter(function(r){return ['rejected','no_go','closed'].indexOf(norm(r&&r.status))<0;}).slice(0,5);
 var old=document.getElementById('pst-home-tender-decisions');if(old)old.remove();if(!rows.length)return true;
 var actions=document.getElementById('pst-ws-home-actions'),anchor=document.getElementById('pst-home-waiting');if(!anchor&&actions)anchor=actions.closest('.pst-ws-card')||actions.parentElement;if(!anchor)return false;
 installTenderStyle();
 var card=document.createElement('section');card.id='pst-home-tender-decisions';card.className='pst-ws-card';
 card.innerHTML='<div class="pst-ws-card-head"><div><div class="pst-ws-card-kicker">MUNDËSI</div><div class="pst-ws-card-title">Tenderë që kërkojnë vendim</div><div class="pst-ws-card-sub">Vetëm tenderët relevantë pa projekt aktiv, ku duhet vendosur GO / NO-GO.</div></div></div><div class="pst-tender-decision-list">'+rows.map(function(r){return'<div class="pst-tender-decision"><div><b>'+esc(r.title||r.procurement_no||'Tender relevant')+'</b><small>'+esc(tenderMeta(r))+'</small></div><button type="button" data-pst-open-opportunities="1">Shqyrto</button></div>';}).join('')+'</div>';
 anchor.insertAdjacentElement('afterend',card);
 Array.prototype.forEach.call(card.querySelectorAll('[data-pst-open-opportunities]'),function(b){b.addEventListener('click',function(){openOpportunities();});});
 return true;
}
function polish(){cleanupDailyControls();if(currentKey()==='home')renderHomeTenderDecisions();}
function schedulePolish(){clearTimeout(polishTimer);polishTimer=setTimeout(polish,30);[260,900].forEach(function(ms){setTimeout(polish,ms);});}
function apply(){repairSidebar();schedulePolish();}
document.addEventListener('pst:modules-ready',function(){scheduleRepair();schedulePolish();},{once:true});
document.addEventListener('pst:home-canonical-rendered',function(){scheduleRepair();schedulePolish();});
document.addEventListener('pst:project-opened',function(){scheduleRepair();schedulePolish();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){scheduleRepair();schedulePolish();},{once:true});else{scheduleRepair();schedulePolish();}
var API={route:route,go:route,openHome:openHome,openOpportunities:openOpportunities,openProjects:openProjects,openPartners:openPartners,openFinance:openFinance,openSystem:openSystem,apply:apply,repairSidebar:repairSidebar,renderHomeTenderDecisions:renderHomeTenderDecisions,cleanupDailyControls:cleanupDailyControls,ensureUnifiedProjectFlow:ensureUnifiedProjectFlow,ensureOperatorFlow:ensureOperatorFlow,_test:{canon:canon,currentKey:currentKey,actionSignature:actionSignature}};
window.PSTPrimaryNavResilienceV1=window.PSTPrimaryNavResilienceV2=window.PSTPrimaryNavResilienceV3=window.PSTPrimaryNavResilienceV4=window.PSTPrimaryNavResilienceV5=window.PSTPrimaryNavResilienceV6=window.PSTPrimaryNavResilienceV7=window.PSTPrimaryNavResilienceV8=window.PSTPrimaryNavResilienceV9=window.PSTPrimaryNavResilienceV10=API;
})();