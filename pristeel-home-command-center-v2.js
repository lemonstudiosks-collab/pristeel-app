/* PRISTEEL Home Command Center v5
 * Sole visual owner of Workspace Home.
 * Clean, warm command-center presentation over canonical Home data.
 * No project/task/business data writes are introduced here.
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
function limits(view){if(view==='week')return{actions:5,projects:4};if(view==='overview')return{actions:7,projects:6};return{actions:3,projects:4};}
function toggleList(hostId,limit){
 var host=document.getElementById(hostId);if(!host)return;
 var selector=hostId==='pst-ws-home-actions'?':scope > .pst-ws-action':':scope > .pst-ws-projectcard';
 var items=Array.prototype.slice.call(host.querySelectorAll(selector));
 var old=host.querySelector('.pst-hcc-more');if(old)old.remove();
 items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',i>=limit);});
 if(items.length<=limit)return;
 var more=document.createElement('button');more.type='button';more.className='pst-hcc-more';
 more.innerHTML='<span>'+icon('arrow')+'</span><b>Shiko edhe '+(items.length-limit)+'</b>';
 var open=false;more.onclick=function(){open=!open;items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});more.classList.toggle('open',open);more.querySelector('b').textContent=open?'Shfaq më pak':'Shiko edhe '+(items.length-limit);};
 host.appendChild(more);
}
function decorateText(page){
 var titles=page.querySelectorAll('.pst-ws-card-title'),subs=page.querySelectorAll('.pst-ws-card-sub');
 if(titles[0])titles[0].textContent='Prioritetet';
 if(subs[0])subs[0].textContent=currentView==='today'?'Vendimet, përgjigjet dhe afatet që kërkojnë veprim sot.':currentView==='week'?'Veprimet që duhet të ecin përpara këtë javë.':'Pamja e gjerë e veprimeve aktive.';
 if(titles[1])titles[1].textContent='Projektet në punë';
 if(subs[1])subs[1].textContent=currentView==='today'?'Projektet ku ka aktivitet dhe hap të radhës.':currentView==='week'?'Projektet kryesore për këtë javë.':'Pamja e projekteve aktive.';
 var q=page.querySelector('.pst-hcc-quick-label');if(q)q.remove();
}
function priorityKind(row){var t=String(row.textContent||'').toLowerCase();if(/plan dinamik|afat/.test(t))return'calendar';if(/iso|certifikat|audit/.test(t))return'certificate';if(/bounce|email/.test(t))return'mailwarn';if(/ted|tender/.test(t))return'globe';if(/follow-up|ndjekje|përgjigje|pergjigje/.test(t))return'follow';return'task';}
function dedupeControls(row){
 var controls=row.querySelector('.pst-ws-action-controls');if(!controls)return;
 var seen={};Array.prototype.slice.call(controls.querySelectorAll('button')).forEach(function(b){var key=String(b.textContent||'').replace(/\s+/g,' ').trim().toLowerCase()+'|'+String(b.getAttribute('title')||'').trim().toLowerCase();if(seen[key])b.remove();else seen[key]=1;});
}
function decoratePriorityRows(page){
 page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row,index){
   var main=row.querySelector('.pst-ws-action-main'),side=row.querySelector('.pst-ws-action-side');if(!main||!side)return;
   row.classList.add('pst-priority-card');
   var kind=priorityKind(row);row.dataset.pstPriorityKind=kind;
   var ico=row.querySelector('.pst-priority-icon');if(!ico){ico=document.createElement('span');ico.className='pst-priority-icon';row.insertBefore(ico,main);}else if(ico.nextElementSibling!==main){row.insertBefore(ico,main);}
   ico.innerHTML=icon(kind);
   var tag=String((row.querySelector('.pst-ws-action-tag')||{}).textContent||'').toLowerCase(),text=String(row.textContent||'').toLowerCase();
   row.classList.toggle('is-urgent',/vepro tani|urgent/.test(tag+' '+text));
   row.classList.toggle('is-overdue',/vonuar|dit[eë] von[eë]/.test(tag+' '+text));
   Array.prototype.slice.call(row.querySelectorAll('.pst-priority-stripe,.pst-ws-action-dot')).forEach(function(x){x.remove();});
   dedupeControls(row);
 });
}
function decorateProjects(page){
 var tones=['ocean','mint','sand','lavender'];
 page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').forEach(function(card,index){
   card.classList.add('pst-project-card');card.dataset.pstTone=tones[index%tones.length];
   var top=card.querySelector('.pst-ws-projectcard-top');if(!top)return;
   var old=top.querySelector('.pst-project-icon');if(old)old.remove();
   var ico=top.querySelector('.pst-project-line-icon');if(!ico){ico=document.createElement('span');ico.className='pst-project-line-icon';ico.innerHTML=icon('project');top.insertBefore(ico,top.firstChild);}
 });
}
function decorateQuickActions(page){
 var map=[{re:/^Projekt$/i,key:'project',sub:'Krijo projekt të ri'},{re:/^Ofert[ëe]$/i,key:'offer',sub:'Përgatit ofertë klienti'},{re:/^Fatur[ëe]$/i,key:'invoice',sub:'Regjistro faturë'},{re:/^Detyr[ëe]$/i,key:'task',sub:'Shto veprim pune'}];
 page.querySelectorAll('.pst-ws-quick button').forEach(function(b){var raw=b.dataset.pstPrettyLabel||String(b.textContent||'').trim(),m=map.find(function(x){return x.re.test(raw);});if(!m)return;b.dataset.pstPrettyLabel=raw;b.dataset.pstQuickTone=m.key;b.innerHTML='<span class="pst-quick-icon">'+icon(m.key)+'</span><span class="pst-quick-copy"><b>'+esc(raw)+'</b><small>'+esc(m.sub)+'</small></span>';});
}
function decorateHero(page){var head=page.querySelector('.pst-ws-head');if(!head)return;var emblem=head.querySelector('.pst-home-hero-emblem');if(emblem)emblem.remove();var eyebrow=head.querySelector('.pst-ws-eyebrow');if(eyebrow)eyebrow.textContent='WORKSPACE';}
function decorateSearch(){var s=document.getElementById('pst-bcc-home-search');if(!s)return;s.classList.add('pst-pretty-search');var first=s.querySelector('svg');if(first&&!first.closest('.pst-search-icon-shell')){var w=document.createElement('span');w.className='pst-search-icon-shell';w.innerHTML=icon('search');first.replaceWith(w);}}
function decorateSidebar(){
 var nav=document.getElementById('pst-ws-sidebar');if(!nav)return;
 var labels={home:'Home',projects:'Projektet',project:'Projektet',inbox:'Gmail / Inbox',gmail:'Gmail / Inbox',tenders:'Tenderat',tender:'Tenderat',commercial:'Komerciale',finance:'Financat',contacts:'Kontaktet',apps:'Modulet',modules:'Modulet'};
 var icons={home:'home',projects:'project',project:'project',inbox:'inbox',gmail:'inbox',tenders:'tender',tender:'tender',commercial:'commercial',finance:'finance',contacts:'contacts',apps:'apps',modules:'apps'};
 nav.querySelectorAll('.pst-ws-navbtn').forEach(function(b){var key=String(b.getAttribute('data-key')||'').toLowerCase(),txt=String(b.textContent||'').toLowerCase();if(!key){if(/home/.test(txt))key='home';else if(/projekt/.test(txt))key='projects';else if(/gmail|inbox/.test(txt))key='inbox';else if(/tender/.test(txt))key='tenders';else if(/komercial/.test(txt))key='commercial';else if(/financ/.test(txt))key='finance';else if(/kontakt/.test(txt))key='contacts';else key='apps';}var badge=b.querySelector('.pst-ws-badge'),badgeHtml=badge?badge.outerHTML:'';b.innerHTML='<span class="pst-nav-icon">'+icon(icons[key]||'apps')+'</span><span class="pst-nav-label">'+esc(labels[key]||'Modulet')+'</span>'+badgeHtml;});
 decorateCreateMenu(nav);
}
function decorateCreateMenu(nav){
 var root=nav.querySelector('.pst-ws-create');if(!root)return;var menu=root.querySelector('.pst-ws-create-menu');if(!menu)return;
 var map=[{re:/projekt/i,key:'project'},{re:/ofert/i,key:'offer'},{re:/fatur/i,key:'invoice'},{re:/detyr/i,key:'task'}];
 menu.querySelectorAll('.pst-ws-create-item').forEach(function(item){var raw=item.dataset.pstCreateLabel||String(item.textContent||'').replace(/\s+/g,' ').trim(),m=map.find(function(x){return x.re.test(raw);})||{key:'task'};item.dataset.pstCreateLabel=raw;item.dataset.pstCreateKind=m.key;item.innerHTML='<span class="pst-create-icon">'+icon(m.key)+'</span><span>'+esc(raw)+'</span>';});
}
function markTopChrome(){
 if(!isHome())return;
 var gp=document.getElementById('global-proj');if(gp){var box=gp.closest('.form-group,.field,.select-wrap,.topbar-project,.flex')||gp;box.classList.add('pst-home-hide-top');}
 var selected='';try{selected=String(gp&&gp.selectedOptions&&gp.selectedOptions[0]&&gp.selectedOptions[0].textContent||'').trim();}catch(e){}
 document.querySelectorAll('button,span,div,label,select').forEach(function(el){var r=el.getBoundingClientRect();if(r.bottom<0||r.top>155)return;var t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!t)return;if(/^ADMINISTRATOR$/i.test(t)||/ZGJIDH NJË MODUL PËR TË FILLUAR/i.test(t)||/^Mbyll projektin$/i.test(t)||/^Ruaj$/i.test(t)||/^Eksporto$/i.test(t)||/^Projekt i ri$/i.test(t)){el.classList.add('pst-home-hide-top');return;}if(selected&&selected.length>8&&t===selected){el.classList.add('pst-home-hide-top');return;}if(/ITALIAN STYLE\s*-\s*DUKLEY/i.test(t)&&t.length<180)el.classList.add('pst-home-hide-top');});
 var rb=document.getElementById('rl-badge');if(rb)rb.classList.add('pst-home-hide-top');
}
function ensureTabs(page){var search=document.getElementById('pst-bcc-home-search');if(!search)return null;var tabs=document.getElementById('pst-home-view-tabs');if(!tabs){tabs=document.createElement('nav');tabs.id='pst-home-view-tabs';tabs.className='pst-hcc-tabs';tabs.innerHTML='<button type="button" data-view="today">Sot</button><button type="button" data-view="week">Këtë javë</button><button type="button" data-view="overview">Pasqyrë</button>';search.insertAdjacentElement('afterend',tabs);tabs.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('button[data-view]');if(!b)return;currentView=b.getAttribute('data-view')||'today';applyView(page);});}return tabs;}
function applyView(page){removePulse();decorateText(page);decorateHero(page);decorateSearch();decorateQuickActions(page);decoratePriorityRows(page);decorateProjects(page);decorateSidebar();markTopChrome();var l=limits(currentView);toggleList('pst-ws-home-actions',l.actions);toggleList('pst-ws-home-projects',l.projects);page.querySelectorAll('#pst-home-view-tabs button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===currentView);});}
function decorate(){var page=document.getElementById('page-workspace-home');if(!isHome())return false;removePulse();ensureTabs(page);applyView(page);return true;}
function schedule(){[0,80,220,500,1000].forEach(function(ms){setTimeout(decorate,ms);});}
function css(){
 if(document.getElementById('pst-hcc-css'))document.getElementById('pst-hcc-css').remove();
 var s=document.createElement('style');s.id='pst-hcc-css';s.textContent=`
:root{--pppp-teal:#428FA8;--pppp-ink:#25373F;--pppp-muted:#74858C;--pppp-bg:#F5F8F9}
#pst-home-pulse{display:none!important}.pst-pretty-icon{width:1em;height:1em;display:block;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
body:has(#page-workspace-home.active) .pst-home-hide-top{display:none!important}
body.pst-ui-v2 .content:has(#page-workspace-home.active){background:linear-gradient(180deg,#F7FAFB 0%,#F3F7F8 100%)!important}
#page-workspace-home .pst-ws-page{max-width:1450px;margin:0 auto;padding-bottom:42px}
#page-workspace-home .pst-ws-head{min-height:auto!important;padding:16px 22px!important;border:1px solid #DDE8EB!important;border-radius:17px!important;background:linear-gradient(105deg,#fff 0%,#FAFDFE 72%,#F1F8FA 100%)!important;box-shadow:0 8px 25px rgba(37,66,78,.045)!important;margin-bottom:15px!important}
#page-workspace-home .pst-ws-head:before,.pst-home-hero-emblem,#page-workspace-home .pst-ws-head .pst-ws-actions{display:none!important}
#page-workspace-home .pst-ws-eyebrow{font-size:10px!important;letter-spacing:1px!important;color:#66808A!important;font-weight:800!important}
#page-workspace-home .pst-ws-title{font-size:26px!important;line-height:1.15!important;letter-spacing:-.45px!important;color:#223941!important;margin-top:3px!important}
#page-workspace-home .pst-ws-sub{font-size:13px!important;line-height:1.45!important;color:#778990!important;margin-top:4px!important}
#page-workspace-home .pst-pretty-search{min-height:60px!important;border:1px solid #D7E5E9!important;border-radius:15px!important;background:#fff!important;box-shadow:0 5px 18px rgba(40,72,84,.035)!important;font-size:13px!important}.pst-search-icon-shell{width:36px;height:36px;border-radius:11px;background:linear-gradient(145deg,#55A3BA,#397F97);color:#fff;display:flex;align-items:center;justify-content:center;flex:none}.pst-search-icon-shell svg{width:20px;height:20px}
.pst-hcc-tabs{display:inline-flex;gap:3px;margin:9px 0 15px;padding:4px;background:#EAF1F3;border:1px solid #DCE7EA;border-radius:11px}.pst-hcc-tabs button{height:32px;border:0;border-radius:8px;background:transparent;padding:0 15px;font-size:11px;font-weight:720;color:#72838A;cursor:pointer}.pst-hcc-tabs button.active{background:#fff;color:#2E7088;box-shadow:0 2px 8px rgba(43,72,84,.08)}
.pst-hcc-quick-label{display:none!important}
#page-workspace-home .pst-ws-quick{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px!important;margin:0 0 18px!important}#page-workspace-home .pst-ws-quick button{height:64px!important;padding:10px 14px!important;border-radius:14px!important;border:1px solid #DEE7EA!important;background:#fff!important;box-shadow:0 4px 13px rgba(40,68,80,.025)!important;display:flex!important;align-items:center!important;text-align:left!important;gap:12px!important;transition:transform .12s ease,border-color .12s ease,box-shadow .12s ease!important}#page-workspace-home .pst-ws-quick button:hover{transform:translateY(-1px);border-color:#BCD6DF!important;box-shadow:0 8px 18px rgba(40,68,80,.06)!important}#page-workspace-home .pst-ws-quick button:nth-child(n+5){display:none!important}.pst-quick-icon{width:27px;height:27px;display:flex;align-items:center;justify-content:center;flex:none;color:#3F849B}.pst-quick-icon svg{width:23px!important;height:23px!important}.pst-ws-quick button[data-pst-quick-tone="offer"] .pst-quick-icon{color:#AA7236}.pst-ws-quick button[data-pst-quick-tone="invoice"] .pst-quick-icon{color:#4F8067}.pst-ws-quick button[data-pst-quick-tone="task"] .pst-quick-icon{color:#75679D}.pst-quick-copy{min-width:0}.pst-quick-copy b{display:block;font-size:14px;color:#344A53}.pst-quick-copy small{display:block;margin-top:2px;font-size:10.5px;color:#829197}
#page-workspace-home .pst-ws-card{border:0!important;border-radius:18px!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}#page-workspace-home .pst-ws-card-hd{padding:5px 3px 12px!important;background:transparent!important;border:0!important}#page-workspace-home .pst-ws-card-title{font-size:19px!important;color:#30464F!important;letter-spacing:-.2px}.pst-ws-card-sub{font-size:12px!important;color:#819096!important;margin-top:3px!important}.pst-ws-link{font-size:11.5px!important;color:#3D8299!important;font-weight:750!important}
#page-workspace-home #pst-ws-home-actions{padding:0!important;background:transparent!important}
#page-workspace-home .pst-priority-card{position:relative!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) auto!important;grid-template-areas:"icon main side"!important;align-items:center!important;column-gap:15px!important;row-gap:8px!important;width:100%!important;min-width:0!important;margin:0 0 10px!important;padding:15px 16px!important;border:1px solid #DFE8EB!important;border-left:4px solid #6FAFC1!important;border-radius:16px!important;background:linear-gradient(105deg,#FFFFFF 0%,#FBFDFD 78%,#F5FAFB 100%)!important;box-shadow:0 7px 20px rgba(35,64,76,.045)!important;overflow:hidden!important;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease!important}
#page-workspace-home .pst-priority-card:hover{transform:translateY(-1px);box-shadow:0 11px 25px rgba(35,64,76,.075)!important;border-color:#CCDDE3!important;border-left-color:#5097AE!important}
#page-workspace-home .pst-priority-card[data-pst-priority-kind="certificate"]{border-left-color:#65A17F!important;background:linear-gradient(105deg,#FFFFFF,#FBFDFB 78%,#F3F9F5)!important}
#page-workspace-home .pst-priority-card[data-pst-priority-kind="mailwarn"]{border-left-color:#C67D75!important;background:linear-gradient(105deg,#FFFFFF,#FDFBFB 78%,#FBF4F3)!important}
#page-workspace-home .pst-priority-card[data-pst-priority-kind="globe"]{border-left-color:#8075B0!important;background:linear-gradient(105deg,#FFFFFF,#FCFBFE 78%,#F6F4FB)!important}
#page-workspace-home .pst-priority-card.is-urgent{border-left-color:#D39A3C!important;background:linear-gradient(105deg,#FFFFFF,#FEFCF8 75%,#FFF7E9)!important}
#page-workspace-home .pst-priority-card.is-overdue:not(.is-urgent){border-left-color:#C56E65!important}
#page-workspace-home .pst-priority-card .pst-priority-icon{grid-area:icon!important;width:40px!important;height:40px!important;min-width:40px!important;border-radius:50%!important;background:#EBF5F8!important;color:#3D839A!important;display:flex!important;align-items:center!important;justify-content:center!important;align-self:center!important}
#page-workspace-home .pst-priority-card[data-pst-priority-kind="certificate"] .pst-priority-icon{background:#EDF6F0!important;color:#56856B!important}#page-workspace-home .pst-priority-card[data-pst-priority-kind="mailwarn"] .pst-priority-icon{background:#F8EEED!important;color:#A65F57!important}#page-workspace-home .pst-priority-card[data-pst-priority-kind="globe"] .pst-priority-icon{background:#F0EEF8!important;color:#70649A!important}#page-workspace-home .pst-priority-card.is-urgent .pst-priority-icon{background:#FAF1DF!important;color:#A16B29!important}
#page-workspace-home .pst-priority-card .pst-priority-icon svg{width:20px!important;height:20px!important}
#page-workspace-home .pst-priority-card .pst-ws-action-main{grid-area:main!important;width:auto!important;min-width:0!important;max-width:none!important;display:block!important;flex:none!important;margin:0!important;padding:0!important;align-self:center!important}
#page-workspace-home .pst-priority-card .pst-ws-action-title{font-size:14.5px!important;line-height:1.3!important;font-weight:780!important;color:#30464F!important;white-space:normal!important;word-break:normal!important;overflow-wrap:anywhere!important;margin:0 0 4px!important;max-width:none!important}
#page-workspace-home .pst-priority-card .pst-ws-action-meta{font-size:11.5px!important;line-height:1.5!important;color:#74858C!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;max-height:3.1em!important;white-space:normal!important;max-width:none!important}
#page-workspace-home .pst-priority-card .pst-ws-action-side{grid-area:side!important;width:auto!important;min-width:170px!important;max-width:310px!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;justify-content:center!important;gap:8px!important;align-self:center!important}
#page-workspace-home .pst-priority-card .pst-ws-action-tag{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:24px!important;padding:0 9px!important;border-radius:999px!important;font-size:9px!important;font-weight:820!important;letter-spacing:.25px!important;white-space:nowrap!important;background:#EDF4F6!important;color:#546B74!important}
#page-workspace-home .pst-priority-card.is-urgent .pst-ws-action-tag{background:#F6DFAF!important;color:#845819!important}#page-workspace-home .pst-priority-card.is-overdue:not(.is-urgent) .pst-ws-action-tag{background:#F5E3E1!important;color:#95534C!important}
#page-workspace-home .pst-priority-card .pst-ws-action-controls{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;flex-wrap:nowrap!important;width:auto!important;margin:0!important}
#page-workspace-home .pst-priority-card .pst-ws-action-controls button{height:32px!important;min-width:0!important;padding:0 11px!important;border-radius:10px!important;border:1px solid #D9E5E9!important;background:#fff!important;color:#52666F!important;font-size:10px!important;font-weight:700!important;box-shadow:none!important;white-space:nowrap!important}
#page-workspace-home .pst-priority-card .pst-ws-action-controls .pst-ws-action-open{background:#4A94AD!important;border-color:#4A94AD!important;color:#fff!important}.pst-priority-card .pst-ws-action-controls button:hover{border-color:#AFCBD5!important;background:#F6FAFB!important}.pst-priority-card .pst-ws-action-controls .pst-ws-action-open:hover{background:#377F98!important;color:#fff!important}
#page-workspace-home #pst-ws-home-projects{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important;padding:0!important;background:transparent!important}
#page-workspace-home .pst-project-card{position:relative!important;margin:0!important;padding:16px 17px!important;min-height:128px!important;border:1px solid #E0E8EB!important;border-top:3px solid #6FAFC1!important;border-radius:16px!important;background:#fff!important;box-shadow:0 7px 20px rgba(35,64,76,.04)!important;overflow:hidden!important;transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease!important;cursor:pointer!important}.pst-project-card:hover{transform:translateY(-2px)!important;box-shadow:0 12px 26px rgba(35,64,76,.075)!important;border-color:#C9DCE2!important}.pst-project-card[data-pst-tone="mint"]{border-top-color:#70A98A!important}.pst-project-card[data-pst-tone="sand"]{border-top-color:#C39756!important}.pst-project-card[data-pst-tone="lavender"]{border-top-color:#8B7CB8!important}
#page-workspace-home .pst-project-card .pst-ws-projectcard-top{display:grid!important;grid-template-columns:30px minmax(0,1fr) auto!important;align-items:start!important;gap:10px!important}.pst-project-line-icon{width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:#43879D!important;margin-top:1px}.pst-project-line-icon svg{width:22px!important;height:22px!important}.pst-project-card[data-pst-tone="mint"] .pst-project-line-icon{color:#5C8D70!important}.pst-project-card[data-pst-tone="sand"] .pst-project-line-icon{color:#A67A3E!important}.pst-project-card[data-pst-tone="lavender"] .pst-project-line-icon{color:#75679C!important}
#page-workspace-home .pst-project-card .pst-ws-projectcard-name{font-size:14px!important;line-height:1.32!important;color:#30464F!important;font-weight:780!important;white-space:normal!important;word-break:normal!important}.pst-project-card .pst-ws-projectcard-client{font-size:10.5px!important;line-height:1.4!important;color:#819097!important;margin-top:4px!important}.pst-project-card .pst-ws-status{font-size:8.5px!important;line-height:1!important;padding:6px 8px!important;border-radius:999px!important;white-space:nowrap!important}.pst-project-card .pst-ws-projectcard-next{margin-top:13px!important;padding:9px 11px!important;border:0!important;border-radius:10px!important;background:#F4F8F9!important;color:#60747C!important;font-size:10.5px!important;line-height:1.45!important}
.pst-hcc-hidden{display:none!important}.pst-hcc-more{grid-column:1/-1;width:100%;margin:2px 0 8px;border:1px dashed #C6DBE2;border-radius:12px;background:#F8FCFD;padding:9px 12px;display:flex;align-items:center;justify-content:center;gap:7px;cursor:pointer;color:#527587}.pst-hcc-more:hover{background:#F1F8FA}.pst-hcc-more span{display:flex}.pst-hcc-more svg{width:13px;height:13px;transition:transform .12s}.pst-hcc-more.open svg{transform:rotate(90deg)}.pst-hcc-more b{font-size:10.5px}
#pst-ws-sidebar{background:#fff!important;border-right:1px solid #E2E9EB!important}.pst-ws-navbtn{min-height:43px!important;border-radius:10px!important;gap:10px!important;font-size:13.5px!important;padding:8px 10px!important}.pst-ws-navbtn:hover{background:#F5F9FA!important}.pst-ws-navbtn.active{background:#EAF4F7!important;color:#2F6B80!important}.pst-nav-icon{width:22px;height:22px;display:flex;align-items:center;justify-content:center;flex:none;color:#5A7883}.pst-nav-icon svg{width:19px!important;height:19px!important}.pst-ws-navbtn.active .pst-nav-icon{color:#2F7E97}.pst-nav-label{flex:1;white-space:nowrap}.pst-ws-badge{font-size:9px!important;margin-left:auto!important}
#pst-ws-sidebar .pst-ws-create{position:relative!important;z-index:2500!important}#pst-ws-sidebar .pst-ws-create-menu{position:absolute!important;left:0!important;top:54px!important;width:245px!important;padding:7px!important;border:1px solid #DCE7EA!important;border-radius:14px!important;background:#fff!important;box-shadow:0 20px 46px rgba(35,61,73,.19)!important;overflow:hidden!important;z-index:9999!important}#pst-ws-sidebar .pst-ws-create-item{height:47px!important;min-height:47px!important;width:100%!important;margin:0!important;padding:0 10px!important;border:0!important;border-radius:10px!important;background:#fff!important;display:flex!important;align-items:center!important;gap:11px!important;color:#40535C!important;font-size:13px!important;font-weight:710!important;text-align:left!important}.pst-ws-create-item:hover{background:#F2F8FA!important;color:#2F7189!important}.pst-create-icon{width:31px;height:31px;border-radius:9px;background:#EDF6F8;color:#3F839B;display:flex;align-items:center;justify-content:center;flex:none}.pst-create-icon svg{width:17px!important;height:17px!important}.pst-ws-create-item[data-pst-create-kind="offer"] .pst-create-icon{background:#F8F0E6;color:#A66E34}.pst-ws-create-item[data-pst-create-kind="invoice"] .pst-create-icon{background:#ECF5EF;color:#55816A}.pst-ws-create-item[data-pst-create-kind="task"] .pst-create-icon{background:#F0EEF8;color:#71679B}
@media(max-width:1050px){#page-workspace-home .pst-ws-quick{grid-template-columns:repeat(2,minmax(0,1fr))!important}#page-workspace-home #pst-ws-home-projects{grid-template-columns:1fr!important}}
@media(max-width:850px){#page-workspace-home .pst-priority-card{grid-template-columns:42px minmax(0,1fr)!important;grid-template-areas:"icon main" ". side"!important}.pst-priority-card .pst-ws-action-side{grid-area:side!important;align-items:flex-start!important;min-width:0!important;max-width:none!important}.pst-priority-card .pst-ws-action-controls{justify-content:flex-start!important}}
@media(max-width:700px){#page-workspace-home .pst-ws-quick{grid-template-columns:1fr!important}#page-workspace-home .pst-ws-head{padding:15px 17px!important}.pst-project-card .pst-ws-projectcard-top{grid-template-columns:26px minmax(0,1fr)!important}.pst-project-card .pst-ws-status{grid-column:2!important;justify-self:start!important;margin-top:6px!important}}
`;
 document.head.appendChild(s);
}
css();
document.addEventListener('click',function(event){if(event.target.closest&&event.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],#pst-ws-home-refresh,.pst-ws-create-main'))schedule();},true);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
window.PSTHomeCommandCenterV2={decorate:decorate,load:function(){return Promise.resolve({});},refresh:schedule,setView:function(view){if(/^(today|week|overview)$/.test(view)){currentView=view;decorate();}},getView:function(){return currentView;}};
})();
