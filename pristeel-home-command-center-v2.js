/* PRISTEEL Home Command Center v4
 * Cosmetic-only simplification of Workspace Home.
 * Keeps canonical data/workflow handlers untouched.
 */
(function(){
'use strict';
if(window.__pstHomeCommandCenterV2)return;
window.__pstHomeCommandCenterV2=true;

var currentView='today';
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function icon(name){
 var p={
  home:'<path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  project:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path d="M9 12h6"/>',
  inbox:'<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3.5 13h4l2 3h5l2-3h4"/>',
  tender:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/>',
  commercial:'<path d="M5 8.5h14v11H5z"/><path d="M8 8.5V6.3A2.3 2.3 0 0 1 10.3 4h3.4A2.3 2.3 0 0 1 16 6.3v2.2"/><path d="M9 13.5h6"/>',
  finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>',
  contacts:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>',
  apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  offer:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/>',
  invoice:'<path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16.5 8"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>',
  refresh:'<path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3.5 9h17M8 13h3M8 17h3"/>',
  certificate:'<path d="M12 3 15 5l3.6-.1.5 3.5 2 2.9-2 2.8-.5 3.6-3.6-.1-3 2-3-2-3.6.1-.5-3.6-2-2.8 2-2.9.5-3.5L9 5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/>',
  follow:'<path d="M5 5h7a7 7 0 0 1 7 7v1"/><path d="m16 10 3 3 3-3"/><circle cx="7" cy="18" r="2"/><path d="M10 18h5"/>',
  mailwarn:'<rect x="3" y="5" width="15" height="13" rx="2.5"/><path d="m4 7 6.5 5 6.5-5"/><circle cx="18.5" cy="17" r="4"/><path d="M18.5 14.8v2.6M18.5 19.1h.01"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"/>'
 }[name]||'';
 return '<svg class="pst-pretty-icon" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function isHome(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function removePulse(){var old=document.getElementById('pst-home-pulse');if(old)old.remove();}
function limits(view){if(view==='week')return{actions:5,projects:4};if(view==='overview')return{actions:7,projects:6};return{actions:3,projects:3};}
function toggleList(hostId,limit,label){
 var host=document.getElementById(hostId);if(!host)return;
 var selector=hostId==='pst-ws-home-actions'?':scope > .pst-ws-action':':scope > .pst-ws-projectcard';
 var items=Array.prototype.slice.call(host.querySelectorAll(selector));
 var old=host.querySelector('.pst-hcc-more');if(old)old.remove();
 items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',i>=limit);});
 if(items.length<=limit)return;
 var more=document.createElement('button');more.type='button';more.className='pst-hcc-more';
 more.innerHTML='<span>'+icon('arrow')+'</span><b>Shiko edhe '+(items.length-limit)+'</b>';
 var open=false;more.onclick=function(){open=!open;items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});more.querySelector('b').textContent=open?'Shfaq më pak':'Shiko edhe '+(items.length-limit);};
 host.appendChild(more);
}
function decorateText(page){
 var titles=page.querySelectorAll('.pst-ws-card-title'),subs=page.querySelectorAll('.pst-ws-card-sub');
 if(titles[0])titles[0].textContent='Prioritetet';
 if(subs[0])subs[0].textContent=currentView==='today'?'Tre veprimet që kërkojnë vëmendje tani.':currentView==='week'?'Veprimet për këtë javë.':'Veprimet aktive.';
 if(titles[1])titles[1].textContent='Projektet në punë';
 if(subs[1])subs[1].textContent=currentView==='today'?'Projektet që duhen mbajtur në sy sot.':currentView==='week'?'Projektet kryesore të javës.':'Projektet aktive.';
 var q=page.querySelector('.pst-hcc-quick-label');if(q)q.remove();
}
function actionIconFor(row){var t=String(row.textContent||'').toLowerCase();if(/plan dinamik|afat/.test(t))return'calendar';if(/iso|certifikat|audit/.test(t))return'certificate';if(/bounce|email/.test(t))return'mailwarn';if(/ted|tender/.test(t))return'globe';if(/follow-up|ndjekje|përgjigje|pergjigje/.test(t))return'follow';return'task';}
function decoratePriorityRows(page){
 page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){var x=row.querySelector('.pst-priority-icon');if(!x){x=document.createElement('span');x.className='pst-priority-icon';row.insertBefore(x,row.firstChild);}x.innerHTML=icon(actionIconFor(row));var tag=String((row.querySelector('.pst-ws-action-tag')||{}).textContent||'').toLowerCase(),text=String(row.textContent||'').toLowerCase();row.classList.toggle('is-urgent',/vepro tani|urgent/.test(tag+' '+text));row.classList.toggle('is-overdue',/vonuar|dit[eë] von[eë]/.test(tag+' '+text));});
}
function decorateProjects(page){page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').forEach(function(row){if(!row.querySelector('.pst-project-icon')){var top=row.querySelector('.pst-ws-projectcard-top');if(top){var x=document.createElement('span');x.className='pst-project-icon';x.innerHTML=icon('project');top.insertBefore(x,top.firstChild);}}});}
function decorateQuickActions(page){
 var map=[{re:/^Projekt$/i,key:'project',sub:'Krijo projekt të ri'},{re:/^Ofert[ëe]$/i,key:'offer',sub:'Përgatit ofertë klienti'},{re:/^Fatur[ëe]$/i,key:'invoice',sub:'Regjistro faturë'},{re:/^Detyr[ëe]$/i,key:'task',sub:'Shto veprim pune'}];
 page.querySelectorAll('.pst-ws-quick button').forEach(function(b){var raw=b.dataset.pstPrettyLabel||String(b.textContent||'').trim(),m=map.find(function(x){return x.re.test(raw);});if(!m)return;b.dataset.pstPretty='1';b.dataset.pstPrettyLabel=raw;b.innerHTML='<span class="pst-quick-icon">'+icon(m.key)+'</span><span class="pst-quick-copy"><b>'+esc(raw)+'</b><small>'+esc(m.sub)+'</small></span>';});
}
function decorateHero(page){
 var head=page.querySelector('.pst-ws-head');if(!head)return;
 var emblem=head.querySelector('.pst-home-hero-emblem');if(emblem)emblem.remove();
 var eyebrow=head.querySelector('.pst-ws-eyebrow');if(eyebrow)eyebrow.textContent='WORKSPACE';
}
function decorateSearch(){var s=document.getElementById('pst-bcc-home-search');if(!s)return;s.classList.add('pst-pretty-search');var first=s.querySelector('svg');if(first&&!first.closest('.pst-search-icon-shell')){var w=document.createElement('span');w.className='pst-search-icon-shell';w.innerHTML=icon('search');first.replaceWith(w);}}
function decorateSidebar(){
 var nav=document.getElementById('pst-ws-sidebar');if(!nav)return;
 var labels={home:'Home',projects:'Projektet',project:'Projektet',inbox:'Gmail / Inbox',gmail:'Gmail / Inbox',tenders:'Tenderat',tender:'Tenderat',commercial:'Komerciale',finance:'Financat',contacts:'Kontaktet',apps:'Modulet',modules:'Modulet'};
 var icons={home:'home',projects:'project',project:'project',inbox:'inbox',gmail:'inbox',tenders:'tender',tender:'tender',commercial:'commercial',finance:'finance',contacts:'contacts',apps:'apps',modules:'apps'};
 nav.querySelectorAll('.pst-ws-navbtn').forEach(function(b){var key=String(b.getAttribute('data-key')||'').toLowerCase(),txt=String(b.textContent||'').toLowerCase();if(!key){if(/home/.test(txt))key='home';else if(/projekt/.test(txt))key='projects';else if(/gmail|inbox/.test(txt))key='inbox';else if(/tender/.test(txt))key='tenders';else if(/komercial/.test(txt))key='commercial';else if(/financ/.test(txt))key='finance';else if(/kontakt/.test(txt))key='contacts';else key='apps';}var badge=b.querySelector('.pst-ws-badge'),badgeHtml=badge?badge.outerHTML:'';b.innerHTML='<span class="pst-nav-icon">'+icon(icons[key]||'apps')+'</span><span class="pst-nav-label">'+esc(labels[key]||'Modulet')+'</span>'+badgeHtml;});
}
function markTopChrome(){
 if(!isHome())return;
 var gp=document.getElementById('global-proj');if(gp){var box=gp.closest('.form-group,.field,.select-wrap,.topbar-project,.flex')||gp;box.classList.add('pst-home-hide-top');}
 var selected='';try{selected=String(gp&&gp.selectedOptions&&gp.selectedOptions[0]&&gp.selectedOptions[0].textContent||'').trim();}catch(e){}
 document.querySelectorAll('button,span,div,label,select').forEach(function(el){var r=el.getBoundingClientRect();if(r.bottom<0||r.top>155)return;var t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!t)return;if(/^ADMINISTRATOR$/i.test(t)||/ZGJIDH NJË MODUL PËR TË FILLUAR/i.test(t)||/^Mbyll projektin$/i.test(t)||/^Ruaj$/i.test(t)||/^Eksporto$/i.test(t)){el.classList.add('pst-home-hide-top');return;}if(selected&&selected.length>8&&t===selected){el.classList.add('pst-home-hide-top');return;}if(/ITALIAN STYLE\s*-\s*DUKLEY/i.test(t)&&t.length<180){el.classList.add('pst-home-hide-top');}});
 var rb=document.getElementById('rl-badge');if(rb)rb.classList.add('pst-home-hide-top');
}
function ensureTabs(page){var search=document.getElementById('pst-bcc-home-search');if(!search)return null;var tabs=document.getElementById('pst-home-view-tabs');if(!tabs){tabs=document.createElement('nav');tabs.id='pst-home-view-tabs';tabs.className='pst-hcc-tabs';tabs.innerHTML='<button type="button" data-view="today">Sot</button><button type="button" data-view="week">Këtë javë</button><button type="button" data-view="overview">Pasqyrë</button>';search.insertAdjacentElement('afterend',tabs);tabs.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button[data-view]');if(!b)return;currentView=b.getAttribute('data-view')||'today';applyView(page);});}return tabs;}
function applyView(page){removePulse();decorateText(page);decorateHero(page);decorateSearch();decorateQuickActions(page);decoratePriorityRows(page);decorateProjects(page);decorateSidebar();markTopChrome();var l=limits(currentView);toggleList('pst-ws-home-actions',l.actions,'');toggleList('pst-ws-home-projects',l.projects,'');page.querySelectorAll('#pst-home-view-tabs button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===currentView);});}
function decorate(){var page=document.getElementById('page-workspace-home');if(!isHome())return false;removePulse();ensureTabs(page);applyView(page);return true;}
function schedule(){[0,80,220,500,1000].forEach(function(ms){setTimeout(decorate,ms);});}
function css(){
 if(document.getElementById('pst-hcc-css'))return;
 var s=document.createElement('style');s.id='pst-hcc-css';s.textContent=`
:root{--pppp-teal:#428FA8;--pppp-teal-dark:#2E6578;--pppp-ink:#25373F;--pppp-muted:#74858C}
#pst-home-pulse{display:none!important}.pst-pretty-icon{width:1em;height:1em;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
body:has(#page-workspace-home.active) .pst-home-hide-top{display:none!important}
body.pst-ui-v2 .content:has(#page-workspace-home.active){background:linear-gradient(180deg,#F8FBFC,#F5F8F9)!important}
#page-workspace-home .pst-ws-page{max-width:1450px;margin:0 auto;padding-bottom:38px}
#page-workspace-home .pst-ws-head{min-height:auto!important;padding:17px 22px!important;border:1px solid #DDE8EB!important;border-radius:16px!important;background:#fff!important;box-shadow:0 7px 24px rgba(40,72,84,.045)!important;margin-bottom:15px!important}
#page-workspace-home .pst-ws-head:before,.pst-home-hero-emblem{display:none!important}
#page-workspace-home .pst-ws-head .pst-ws-actions{display:none!important}
#page-workspace-home .pst-ws-eyebrow{font-size:10px!important;letter-spacing:1px!important;color:#71848C!important;font-weight:800!important}
#page-workspace-home .pst-ws-title{font-size:25px!important;line-height:1.15!important;letter-spacing:-.4px!important;color:#223941!important;margin-top:4px!important}
#page-workspace-home .pst-ws-sub{font-size:12.5px!important;line-height:1.45!important;color:#778990!important;margin-top:4px!important}
#page-workspace-home .pst-pretty-search{min-height:58px!important;border:1px solid #D9E6EA!important;border-radius:14px!important;background:#fff!important;box-shadow:0 5px 18px rgba(40,72,84,.04)!important;font-size:13px!important}.pst-search-icon-shell{width:34px;height:34px;border-radius:10px;background:#428FA8;color:#fff;display:flex;align-items:center;justify-content:center;flex:none}.pst-search-icon-shell svg{width:19px;height:19px}
.pst-hcc-tabs{display:inline-flex;gap:4px;margin:9px 0 15px;padding:4px;background:#EEF3F5;border:1px solid #DFE8EB;border-radius:10px}.pst-hcc-tabs button{height:31px;border:0;border-radius:7px;background:transparent;padding:0 14px;font-size:11px;font-weight:700;color:#6F8188;cursor:pointer}.pst-hcc-tabs button.active{background:#fff;color:#2F6A80;box-shadow:0 2px 7px rgba(43,72,84,.08)}
.pst-hcc-quick-label{display:none!important}
#page-workspace-home .pst-ws-quick{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px!important;margin:0 0 18px!important}#page-workspace-home .pst-ws-quick button{height:62px!important;padding:10px 14px!important;border-radius:12px!important;border:1px solid #DEE7EA!important;background:#fff!important;box-shadow:none!important;display:flex!important;align-items:center!important;text-align:left!important;gap:11px!important;transition:border-color .12s ease,background .12s ease!important}#page-workspace-home .pst-ws-quick button:hover{background:#F9FCFD!important;border-color:#BFD5DD!important}#page-workspace-home .pst-ws-quick button:nth-child(n+5){display:none!important}.pst-quick-icon{width:24px;height:24px;color:#3E839A;display:flex;align-items:center;justify-content:center;flex:none;background:none!important;border:0!important}.pst-quick-icon svg{width:22px!important;height:22px!important}.pst-quick-copy{min-width:0}.pst-quick-copy b{display:block;font-size:13.5px;color:#344A53}.pst-quick-copy small{display:block;margin-top:2px;font-size:10.5px;color:#829197}
#page-workspace-home .pst-ws-card{border:1px solid #DDE7EA!important;border-radius:15px!important;background:#fff!important;box-shadow:0 6px 22px rgba(36,68,81,.04)!important;overflow:hidden}#page-workspace-home .pst-ws-card-hd{padding:15px 18px 13px!important;background:#fff!important;border-bottom:1px solid #E7EEF0!important}#page-workspace-home .pst-ws-card-title{font-size:16px!important;color:#344A53!important}.pst-ws-card-sub{font-size:11.5px!important;color:#819096!important}.pst-ws-link{font-size:11px!important;color:#3D8299!important;font-weight:700!important}
#page-workspace-home .pst-ws-action{display:flex!important;align-items:center!important;gap:12px!important;padding:13px 14px!important;margin:8px 10px!important;border:1px solid #E4EBED!important;border-radius:12px!important;background:#fff!important;box-shadow:none!important}#page-workspace-home .pst-ws-action.is-urgent{border-color:#E6C98E!important;background:#FFF9ED!important}.pst-priority-icon{width:28px;height:28px;color:#4B879C;display:flex;align-items:center;justify-content:center;flex:none;background:none!important}.pst-priority-icon svg{width:22px;height:22px}.pst-ws-action-title{font-size:13.5px!important;font-weight:750!important;color:#374C55!important}.pst-ws-action-meta{font-size:11.5px!important;line-height:1.45!important;color:#76878E!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important}.pst-ws-action-tag{font-size:9px!important}.pst-ws-action-controls button{font-size:10.5px!important;height:29px!important}
#page-workspace-home .pst-ws-projectcard{border:1px solid #E2E9EB!important;border-radius:12px!important;margin:8px 10px!important;background:#fff!important;padding:13px!important}.pst-project-icon{width:26px;height:26px;color:#43849A;display:flex;align-items:center;justify-content:center;flex:none;margin-right:8px;background:none!important}.pst-project-icon svg{width:21px;height:21px}.pst-ws-projectcard-name{font-size:13px!important}.pst-ws-projectcard-client,.pst-ws-projectcard-next{font-size:11px!important}
.pst-hcc-hidden{display:none!important}.pst-hcc-more{width:calc(100% - 20px);margin:8px 10px 12px;border:1px dashed #C8DCE3;border-radius:10px;background:#F8FCFD;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;color:#527587}.pst-hcc-more svg{width:13px;height:13px}.pst-hcc-more b{font-size:10.5px}
#pst-ws-sidebar{background:#fff!important;border-right:1px solid #E2E9EB!important}.pst-ws-navbtn{min-height:42px!important;border-radius:9px!important;gap:10px!important;font-size:13.5px!important;padding:8px 10px!important}.pst-ws-navbtn:hover{background:#F5F8F9!important}.pst-ws-navbtn.active{background:#EAF4F7!important;color:#2F6B80!important}.pst-nav-icon{width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex:none;color:#5A7883;background:none!important}.pst-nav-icon svg{width:19px!important;height:19px!important}.pst-ws-navbtn.active .pst-nav-icon{color:#2F7E97}.pst-nav-label{flex:1;white-space:nowrap}.pst-ws-badge{font-size:9px!important}
@media(max-width:1000px){#page-workspace-home .pst-ws-quick{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:700px){#page-workspace-home .pst-ws-quick{grid-template-columns:1fr!important}#page-workspace-home .pst-ws-head{padding:15px 17px!important}.pst-ws-action-title{font-size:13px!important}}
`;
 document.head.appendChild(s);
}
css();
document.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh'))schedule();},true);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeCommandCenterV2={decorate:decorate,load:function(){return Promise.resolve({});},refresh:schedule,setView:function(view){if(/^(today|week|overview)$/.test(view)){currentView=view;decorate();}},getView:function(){return currentView;}};
})();
