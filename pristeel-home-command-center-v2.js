/* PRISTEEL Home Command Center v3
 * Premium visual command center for Workspace Home.
 * Cosmetic only: existing data owners, handlers and workflow actions remain untouched.
 */
(function(){
'use strict';
if(window.__pstHomeCommandCenterV2)return;
window.__pstHomeCommandCenterV2=true;

var currentView='today';
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function icon(name){
 var p={
  home:'<path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/><path class="duo" d="M7 10.8 12 6.7l5 4.1V13H7z"/>',
  project:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/><path class="duo" d="M4.5 10.5h15v7h-15z"/><path d="M9.5 12h5"/>',
  inbox:'<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M3.5 13h4l2 3h5l2-3h4"/><path class="duo" d="M5.5 7h13v4h-13z"/>',
  tender:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/><circle class="duo" cx="17.5" cy="17.5" r="4"/><path d="m20.4 20.4 2.1 2.1"/>',
  commercial:'<path d="M5 8.5h14v11H5z"/><path d="M8 8.5V6.3A2.3 2.3 0 0 1 10.3 4h3.4A2.3 2.3 0 0 1 16 6.3v2.2"/><path class="duo" d="M6.5 12h11v5h-11z"/><path d="M9 13.5h6"/>',
  finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17"/><path class="duo" d="M6 13h6v3H6z"/><path d="M16 14.5h2"/>',
  contacts:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7"/><circle class="duo" cx="17.5" cy="9" r="2.2"/><path d="M15.5 14.5c3.1-.8 5.2 1 5.5 4"/>',
  apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect class="duo" x="14" y="14" width="7" height="7" rx="2"/>',
  plus:'<circle class="duo" cx="12" cy="12" r="8.5"/><path d="M12 7.5v9M7.5 12h9"/>',
  offer:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/><path class="duo" d="M8.5 9h7v2h-7z"/>',
  invoice:'<path d="M6 3h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3L6 21z"/><path d="M9 8h6M9 12h6M9 16h4"/><path class="duo" d="M8 6h8v3H8z"/>',
  task:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16.5 8"/><path class="duo" d="M6 6h12v12H6z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M7 3v4M17 3v4M3.5 9h17"/><path class="duo" d="M6 12h4v4H6z"/><path d="m14 15 1.5 1.5L19 13"/>',
  certificate:'<path d="M12 3 15 5l3.6-.1.5 3.5 2 2.9-2 2.8-.5 3.6-3.6-.1-3 2-3-2-3.6.1-.5-3.6-2-2.8 2-2.9.5-3.5L9 5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/><circle class="duo" cx="12" cy="12" r="6"/>',
  follow:'<path d="M5 5h7a7 7 0 0 1 7 7v1"/><path d="m16 10 3 3 3-3"/><path class="duo" d="M5 4h5v3H5z"/><circle cx="7" cy="18" r="2"/><path d="M10 18h5"/>',
  mailwarn:'<rect x="3" y="5" width="15" height="13" rx="2.5"/><path d="m4 7 6.5 5 6.5-5"/><circle class="duo" cx="18.5" cy="17" r="4"/><path d="M18.5 14.8v2.6M18.5 19.1h.01"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3.5 12h17M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12s1.2 6.5 3.5 9"/><path class="duo" d="M5.5 7h13v3h-13z"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
  refresh:'<path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 1-2-5"/><path class="duo" d="M5.5 8.5A7 7 0 0 1 12 5v3a4 4 0 0 0-3.8 2.7z"/>',
  save:'<path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/><path class="duo" d="M9.5 15.5h5v4h-5z"/>',
  export:'<path d="M5 12v8h14v-8M12 3v12M8 7l4-4 4 4"/><path class="duo" d="M7 16h10v2H7z"/>',
  close:'<circle cx="12" cy="12" r="9"/><path d="m8.5 8.5 7 7M15.5 8.5l-7 7"/><circle class="duo" cx="12" cy="12" r="6"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/><circle class="duo" cx="10.5" cy="10.5" r="4"/>'
 }[name]||'';
 return '<svg class="pst-pretty-icon" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}

function removePulse(){var old=document.getElementById('pst-home-pulse');if(old)old.remove();}
function toggleList(hostId,limit,label){
 var host=document.getElementById(hostId);if(!host)return;
 var selector=hostId==='pst-ws-home-actions'?':scope > .pst-ws-action':':scope > .pst-ws-projectcard';
 var items=Array.prototype.slice.call(host.querySelectorAll(selector));
 var old=host.querySelector('.pst-hcc-more');if(old)old.remove();
 items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',i>=limit);});
 if(items.length<=limit)return;
 var more=document.createElement('button');more.type='button';more.className='pst-hcc-more';
 more.innerHTML='<span class="pst-hcc-more-icon">'+icon('arrow')+'</span><span><b>Shiko edhe '+(items.length-limit)+'</b><small>'+esc(label)+'</small></span>';
 var open=false;
 more.onclick=function(){open=!open;items.forEach(function(x,i){x.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});more.classList.toggle('open',open);more.querySelector('b').textContent=open?'Shfaq më pak':'Shiko edhe '+(items.length-limit);more.querySelector('small').textContent=open?'Mbyll listën e zgjeruar':label;};
 host.appendChild(more);
}
function limits(view){if(view==='week')return{actions:5,projects:4};if(view==='overview')return{actions:7,projects:6};return{actions:3,projects:3};}

function decorateText(page){
 var titles=page.querySelectorAll('.pst-ws-card-title'),subs=page.querySelectorAll('.pst-ws-card-sub');
 if(titles[0])titles[0].textContent='Prioritetet';
 if(subs[0])subs[0].textContent=currentView==='today'?'Tre veprimet që kërkojnë vëmendje tani.':currentView==='week'?'Veprimet për t’u mbyllur ose ndjekur këtë javë.':'Lista më e gjerë e veprimeve aktive.';
 if(titles[1])titles[1].textContent='Projektet në punë';
 if(subs[1])subs[1].textContent=currentView==='today'?'Projektet që duhen mbajtur në sy sot.':currentView==='week'?'Projektet kryesore për javën aktuale.':'Pasqyrë e projekteve aktive.';
 var quick=page.querySelector('.pst-ws-quick');
 if(quick&&!quick.previousElementSibling?.classList.contains('pst-hcc-quick-label')){var l=document.createElement('div');l.className='pst-hcc-quick-label';l.innerHTML='<span class="pst-section-spark">'+icon('plus')+'</span><span><b>Krijo shpejt</b><small>Veprimet që përdor më shpesh</small></span>';quick.insertAdjacentElement('beforebegin',l);}
}
function actionIconFor(row){
 var t=String(row.textContent||'').toLowerCase();
 if(/planin dinamik|plan dinamik|afat|calendar/.test(t))return'calendar';
 if(/iso|certifikat|audit/.test(t))return'certificate';
 if(/bounce|email/.test(t))return'mailwarn';
 if(/ted|tender/.test(t))return'globe';
 if(/follow-up|ndjekje|përgjigje|pergjigje/.test(t))return'follow';
 return'task';
}
function decoratePriorityRows(page){
 page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){
   var old=row.querySelector('.pst-priority-icon');if(!old){old=document.createElement('span');old.className='pst-priority-icon';row.insertBefore(old,row.firstChild);}
   old.innerHTML=icon(actionIconFor(row));
   var tag=String((row.querySelector('.pst-ws-action-tag')||{}).textContent||'').toLowerCase();
   var text=String(row.textContent||'').toLowerCase();
   row.classList.toggle('is-urgent',/vepro tani|urgent/.test(tag+' '+text));
   row.classList.toggle('is-overdue',/vonuar|dit[eë] von[eë]/.test(tag+' '+text));
   var meta=row.querySelector('.pst-ws-action-meta');if(meta){meta.title=meta.textContent||'';}
 });
}
function decorateProjects(page){
 page.querySelectorAll('#pst-ws-home-projects > .pst-ws-projectcard').forEach(function(row){
   if(!row.querySelector('.pst-project-icon')){var top=row.querySelector('.pst-ws-projectcard-top');if(top){var x=document.createElement('span');x.className='pst-project-icon';x.innerHTML=icon('project');top.insertBefore(x,top.firstChild);}}
 });
}
function decorateQuickActions(page){
 var map=[
  {re:/^Projekt$/i,key:'project',sub:'Krijo projekt të ri'},
  {re:/^Ofert[ëe]$/i,key:'offer',sub:'Përgatit ofertë klienti'},
  {re:/^Fatur[ëe]$/i,key:'invoice',sub:'Regjistro faturë'},
  {re:/^Detyr[ëe]$/i,key:'task',sub:'Shto veprim pune'},
  {re:/^Inbox$/i,key:'inbox',sub:'Hap komunikimin'}
 ];
 page.querySelectorAll('.pst-ws-quick button').forEach(function(b){
   if(b.dataset.pstPretty==='1')return;
   var t=String(b.textContent||'').trim(),m=map.find(function(x){return x.re.test(t);});if(!m)return;
   b.dataset.pstPretty='1';b.innerHTML='<span class="pst-quick-icon">'+icon(m.key)+'</span><span class="pst-quick-copy"><b>'+esc(t)+'</b><small>'+esc(m.sub)+'</small></span><span class="pst-quick-arrow">'+icon('arrow')+'</span>';
 });
}
function decorateHero(page){
 var head=page.querySelector('.pst-ws-head');if(!head)return;
 if(!head.querySelector('.pst-home-hero-emblem')){var e=document.createElement('div');e.className='pst-home-hero-emblem';e.innerHTML='<div class="pst-home-truss"><span></span><span></span><span></span><span></span><i></i><i></i><i></i></div><small>PPPP</small>';head.appendChild(e);}
 var eyebrow=head.querySelector('.pst-ws-eyebrow');if(eyebrow)eyebrow.innerHTML='<span class="pst-live-dot"></span> WORKSPACE COMMAND CENTER';
}
function decorateSearch(page){
 var s=document.getElementById('pst-bcc-home-search');if(!s)return;
 s.classList.add('pst-pretty-search');
 var first=s.querySelector('svg');if(first&&!first.closest('.pst-search-icon-shell')){var w=document.createElement('span');w.className='pst-search-icon-shell';w.innerHTML=icon('search');first.replaceWith(w);}
}
function decorateSidebar(){
 var nav=document.getElementById('pst-ws-sidebar');if(!nav)return;
 var names={home:'home',projects:'project',project:'project',inbox:'inbox',gmail:'inbox',tenders:'tender',tender:'tender',commercial:'commercial',finance:'finance',contacts:'contacts',apps:'apps',modules:'apps'};
 nav.querySelectorAll('.pst-ws-navbtn').forEach(function(b){
   if(b.querySelector('.pst-nav-icon-shell'))return;
   var key=String(b.getAttribute('data-key')||'').toLowerCase(),txt=String(b.textContent||'').toLowerCase(),name=names[key];
   if(!name){if(/home/.test(txt))name='home';else if(/projekt/.test(txt))name='project';else if(/gmail|inbox/.test(txt))name='inbox';else if(/tender/.test(txt))name='tender';else if(/komercial/.test(txt))name='commercial';else if(/financ/.test(txt))name='finance';else if(/kontakt/.test(txt))name='contacts';else name='apps';}
   var svg=b.querySelector('svg'),shell=document.createElement('span');shell.className='pst-nav-icon-shell nav-'+name;shell.innerHTML=icon(name);if(svg)svg.replaceWith(shell);else b.insertBefore(shell,b.firstChild);
 });
}
function decorateTopButtons(){
 var M=[{re:/^Mbyll projektin$/i,k:'close'},{re:/^Ruaj$/i,k:'save'},{re:/^Projekt i ri$/i,k:'plus'},{re:/^Eksporto$/i,k:'export'},{re:/^Rifresko$/i,k:'refresh'}];
 document.querySelectorAll('button').forEach(function(b){
   if(b.dataset.pstTopPretty==='1')return;var r=b.getBoundingClientRect();if(r.top>135||r.bottom<0)return;var t=String(b.textContent||'').trim(),m=M.find(function(x){return x.re.test(t);});if(!m)return;b.dataset.pstTopPretty='1';b.insertAdjacentHTML('afterbegin','<span class="pst-top-icon">'+icon(m.k)+'</span>');
 });
}
function ensureTabs(page){
 var search=document.getElementById('pst-bcc-home-search');if(!search)return null;
 var tabs=document.getElementById('pst-home-view-tabs');
 if(!tabs){tabs=document.createElement('nav');tabs.id='pst-home-view-tabs';tabs.className='pst-hcc-tabs';tabs.setAttribute('aria-label','Pamja e dashboard-it');tabs.innerHTML='<button type="button" data-view="today">Sot</button><button type="button" data-view="week">Këtë javë</button><button type="button" data-view="overview">Pasqyrë</button>';search.insertAdjacentElement('afterend',tabs);tabs.addEventListener('click',function(event){var b=event.target.closest&&event.target.closest('button[data-view]');if(!b)return;currentView=b.getAttribute('data-view')||'today';applyView(page);});}
 return tabs;
}
function applyView(page){
 removePulse();var l=limits(currentView);decorateText(page);decorateHero(page);decorateSearch(page);decorateQuickActions(page);decoratePriorityRows(page);decorateProjects(page);decorateSidebar();decorateTopButtons();
 toggleList('pst-ws-home-actions',l.actions,currentView==='today'?'Hap prioritetet e tjera':currentView==='week'?'Hap veprimet e tjera të javës':'Hap listën e plotë');
 toggleList('pst-ws-home-projects',l.projects,currentView==='today'?'Hap projektet e tjera':currentView==='week'?'Hap projektet e tjera të javës':'Hap listën e plotë');
 page.querySelectorAll('#pst-home-view-tabs button').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-view')===currentView);});
}
function decorate(){var page=document.getElementById('page-workspace-home');if(!page||page.style.display==='none')return false;removePulse();ensureTabs(page);applyView(page);return true;}
function schedule(){[0,100,320,800,1500].forEach(function(ms){setTimeout(decorate,ms);});}

function css(){
 if(document.getElementById('pst-hcc-css'))return;
 var s=document.createElement('style');s.id='pst-hcc-css';s.textContent=`
:root{--pppp-teal:#428FA8;--pppp-teal-dark:#2E6578;--pppp-teal-soft:#E9F5F8;--pppp-ink:#25373F;--pppp-muted:#78888F;--pppp-warm:#B97732;--pppp-green:#4E8569;--pppp-red:#A9584F}
#pst-home-pulse{display:none!important}.pst-pretty-icon{width:1em;height:1em;display:block;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.pst-pretty-icon .duo{fill:currentColor;stroke:none;opacity:.12}
body.pst-ui-v2 .content:has(#page-workspace-home.active){background:radial-gradient(circle at 78% 2%,rgba(73,156,184,.09),transparent 32%),linear-gradient(180deg,#F8FBFC 0,#F5F8F9 45%,#F7F9FA 100%)!important}
#page-workspace-home .pst-ws-page{max-width:1450px;margin:0 auto;padding-bottom:42px}
#page-workspace-home .pst-ws-head{position:relative;overflow:hidden;min-height:132px;padding:28px 30px!important;border:1px solid #D8E8ED;border-radius:22px;background:linear-gradient(120deg,#FFFFFF 0%,#F3FAFC 54%,#EAF6F9 100%);box-shadow:0 18px 48px rgba(41,76,90,.08);margin-bottom:18px!important}
#page-workspace-home .pst-ws-head:before{content:"";position:absolute;width:380px;height:380px;right:-115px;top:-220px;border-radius:50%;border:1px solid rgba(66,143,168,.12);box-shadow:0 0 0 38px rgba(66,143,168,.035),0 0 0 76px rgba(66,143,168,.025)}
#page-workspace-home .pst-ws-eyebrow{display:flex;align-items:center;gap:7px;font-size:9px!important;letter-spacing:1.25px!important;color:#55747F!important;font-weight:800!important}.pst-live-dot{width:7px;height:7px;border-radius:50%;background:#4E9BB4;box-shadow:0 0 0 4px rgba(78,155,180,.12)}
#page-workspace-home .pst-ws-title{font-size:29px!important;letter-spacing:-.75px!important;color:#20363F!important;margin-top:7px!important}.pst-home-hero-emblem{position:absolute;right:215px;top:18px;width:108px;height:94px;opacity:.78;pointer-events:none}.pst-home-hero-emblem small{position:absolute;right:5px;bottom:0;font:800 9px/1 Inter,sans-serif;letter-spacing:2px;color:#6895A5}.pst-home-truss{position:absolute;inset:4px 8px 18px;border-left:2px solid #5F9CB0;border-right:2px solid #5F9CB0;transform:perspective(120px) rotateX(-4deg)}.pst-home-truss:before,.pst-home-truss:after{content:"";position:absolute;left:0;right:0;height:2px;background:#5F9CB0}.pst-home-truss:before{top:0}.pst-home-truss:after{bottom:0}.pst-home-truss span{position:absolute;left:-2px;width:calc(100% + 4px);height:2px;background:#7FAFC0}.pst-home-truss span:nth-child(1){top:20%}.pst-home-truss span:nth-child(2){top:40%}.pst-home-truss span:nth-child(3){top:60%}.pst-home-truss span:nth-child(4){top:80%}.pst-home-truss i{position:absolute;left:50%;top:0;width:2px;height:100%;background:#A8C9D4}.pst-home-truss i:nth-of-type(2){transform:rotate(32deg);transform-origin:center}.pst-home-truss i:nth-of-type(3){transform:rotate(-32deg);transform-origin:center}
#page-workspace-home .pst-ws-actions{position:relative;z-index:3}#page-workspace-home .pst-ws-actions .pst-ws-btn{height:38px!important;border-radius:11px!important;background:rgba(255,255,255,.8)!important;border-color:#D6E3E7!important;backdrop-filter:blur(8px)}#page-workspace-home .pst-ws-actions .pst-ws-btn.primary{background:linear-gradient(135deg,#4A9DB7,#397E96)!important;color:#fff!important;border:0!important;box-shadow:0 7px 18px rgba(57,126,150,.22)}
#page-workspace-home .pst-pretty-search{border-radius:17px!important;border:1px solid #D4E5EA!important;background:rgba(255,255,255,.92)!important;box-shadow:0 9px 28px rgba(39,73,86,.055)!important;min-height:64px!important}.pst-search-icon-shell{width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,#5AA7BE,#3C879F);color:#fff;display:flex;align-items:center;justify-content:center;flex:none}.pst-search-icon-shell .pst-pretty-icon{width:20px;height:20px}
.pst-hcc-tabs{display:inline-flex;gap:4px;margin:10px 0 19px;padding:4px;background:#ECF3F5;border:1px solid #DCE8EC;border-radius:12px}.pst-hcc-tabs button{height:31px;border:0;border-radius:8px;background:transparent;padding:0 14px;font-size:9px;font-weight:760;color:#71838A;cursor:pointer}.pst-hcc-tabs button:hover{color:#326E84}.pst-hcc-tabs button.active{background:#fff;color:#2F6A80;box-shadow:0 3px 10px rgba(43,72,84,.09)}
.pst-hcc-quick-label{display:flex;align-items:center;gap:10px;margin:0 0 11px 1px}.pst-hcc-quick-label .pst-section-spark{width:32px;height:32px;border-radius:10px;background:#E9F5F8;color:#3D879E;display:flex;align-items:center;justify-content:center}.pst-hcc-quick-label .pst-section-spark svg{width:17px;height:17px}.pst-hcc-quick-label b{display:block;font-size:11px;letter-spacing:.2px;color:#42565F}.pst-hcc-quick-label small{display:block;font-size:8.5px;color:#8A989E;margin-top:2px}
#page-workspace-home .pst-ws-quick{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px!important;margin-bottom:22px!important}#page-workspace-home .pst-ws-quick button{height:76px!important;padding:11px 13px!important;border-radius:15px!important;border:1px solid #DFE8EB!important;background:#fff!important;box-shadow:0 7px 20px rgba(35,67,79,.045)!important;display:flex!important;align-items:center!important;text-align:left!important;gap:11px!important;transition:transform .14s ease,box-shadow .14s ease,border-color .14s ease!important}#page-workspace-home .pst-ws-quick button:hover{transform:translateY(-2px);border-color:#BED8E1!important;box-shadow:0 12px 28px rgba(35,67,79,.09)!important}#page-workspace-home .pst-ws-quick button:nth-child(n+5){display:none!important}.pst-quick-icon{width:42px;height:42px;border-radius:13px;background:linear-gradient(145deg,#EDF7FA,#DDEFF4);color:#3D879F;display:flex;align-items:center;justify-content:center;flex:none}.pst-quick-icon svg{width:22px!important;height:22px!important}.pst-ws-quick button:nth-child(2) .pst-quick-icon{background:#F6EFE7;color:#A26B34}.pst-ws-quick button:nth-child(3) .pst-quick-icon{background:#EDF5EF;color:#538369}.pst-ws-quick button:nth-child(4) .pst-quick-icon{background:#F1EFF8;color:#71659C}.pst-quick-copy{min-width:0;flex:1}.pst-quick-copy b{display:block;font-size:12px;color:#344A53}.pst-quick-copy small{display:block;margin-top:3px;font-size:8.5px;color:#8A979C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-quick-arrow{color:#A7B4B9}.pst-quick-arrow svg{width:15px!important;height:15px!important}
#page-workspace-home .pst-ws-card{border:1px solid #DDE7EA!important;border-radius:18px!important;background:rgba(255,255,255,.96)!important;box-shadow:0 12px 34px rgba(36,68,81,.055)!important;overflow:hidden}#page-workspace-home .pst-ws-card-hd{padding:16px 18px 14px!important;background:linear-gradient(180deg,#FFF,#FBFDFD)!important;border-bottom:1px solid #E7EEF0!important}#page-workspace-home .pst-ws-card-title{font-size:15px!important;color:#344A53!important;letter-spacing:-.15px}.pst-ws-card-sub{max-width:620px;color:#849298!important}.pst-ws-link{color:#3D8299!important;font-weight:700!important}
#page-workspace-home .pst-ws-action{position:relative;display:flex!important;align-items:center!important;gap:12px!important;padding:12px 13px!important;margin:8px 10px!important;border:1px solid #E4EBED!important;border-radius:14px!important;background:#fff!important;box-shadow:0 4px 14px rgba(43,69,80,.025)!important;transition:all .14s ease!important}#page-workspace-home .pst-ws-action:hover{transform:translateX(2px);border-color:#C9DDE4!important;box-shadow:0 8px 20px rgba(43,69,80,.065)!important}.pst-priority-icon{width:38px;height:38px;border-radius:12px;background:#EAF5F8;color:#41859C;display:flex;align-items:center;justify-content:center;flex:none}.pst-priority-icon svg{width:20px;height:20px}.pst-ws-action.is-urgent{border-color:#E8D3AF!important;background:linear-gradient(90deg,#FFF9ED,#fff 44%)!important}.pst-ws-action.is-urgent .pst-priority-icon{background:#F9EFD9;color:#A16D2C}.pst-ws-action.is-overdue:not(.is-urgent) .pst-priority-icon{background:#F8EDEC;color:#A65B53}.pst-ws-action.is-overdue:not(.is-urgent){border-color:#ECD2CF!important}.pst-ws-action-dot{display:none!important}.pst-ws-action-main{min-width:0!important}.pst-ws-action-title{font-size:11.5px!important;font-weight:760!important;color:#374C55!important}.pst-ws-action-meta{font-size:9px!important;line-height:1.45!important;color:#7E8C91!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden!important;max-height:2.9em!important}.pst-ws-action-side{margin-left:auto!important}.pst-ws-action-tag{border-radius:999px!important;padding:4px 7px!important;font-size:7.5px!important;font-weight:800!important}.pst-ws-action-controls button{border-radius:8px!important;height:27px!important;background:#fff!important;border:1px solid #DDE6E9!important;font-size:8px!important}
#page-workspace-home .pst-ws-projectcard{border:1px solid #E2E9EB!important;border-radius:14px!important;margin:8px 10px!important;background:#fff!important;padding:13px!important;transition:all .14s ease!important}#page-workspace-home .pst-ws-projectcard:hover{transform:translateY(-1px);border-color:#C9DDE4!important;box-shadow:0 8px 20px rgba(43,69,80,.06)!important}.pst-ws-projectcard-top{align-items:center!important}.pst-project-icon{width:36px;height:36px;border-radius:11px;background:#EDF6F8;color:#44879D;display:flex;align-items:center;justify-content:center;flex:none;margin-right:10px}.pst-project-icon svg{width:19px;height:19px}.pst-ws-status{border-radius:999px!important;padding:4px 8px!important}.pst-ws-projectcard-name{font-size:11px!important;color:#344B54!important}.pst-ws-projectcard-next{margin-top:9px!important;background:#F7FAFB;border-radius:9px;padding:7px 9px!important;color:#76858B!important}
.pst-hcc-hidden{display:none!important}.pst-hcc-more{width:calc(100% - 20px);margin:8px 10px 12px;border:1px dashed #C8DCE3;border-radius:12px;background:#F8FCFD;padding:9px 12px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;color:#527587}.pst-hcc-more:hover{background:#F0F8FA;border-color:#AFCBD6}.pst-hcc-more-icon{width:25px;height:25px;border-radius:8px;background:#E6F2F5;display:flex;align-items:center;justify-content:center}.pst-hcc-more-icon svg{width:13px;height:13px;transition:transform .15s ease}.pst-hcc-more.open .pst-hcc-more-icon svg{transform:rotate(90deg)}.pst-hcc-more b{display:block;font-size:9px}.pst-hcc-more small{display:block;font-size:7.5px;color:#89959A;margin-top:1px}
#pst-ws-sidebar{background:linear-gradient(180deg,#FFFFFF,#FBFDFE)!important;border-right:1px solid #E2E9EB}.pst-ws-brand{padding-bottom:19px!important}.pst-ws-mark{background:linear-gradient(145deg,#59A7BE,#377E96)!important;box-shadow:0 7px 16px rgba(55,126,150,.22)!important}.pst-ws-navbtn{min-height:40px!important;border-radius:11px!important;gap:9px!important}.pst-ws-navbtn:hover{background:#F3F8F9!important}.pst-ws-navbtn.active{background:linear-gradient(90deg,#E6F3F6,#EEF8FA)!important;color:#2F6B80!important}.pst-nav-icon-shell{width:29px;height:29px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex:none;background:#EEF4F6;color:#5C7B87}.pst-nav-icon-shell svg{width:16px!important;height:16px!important}.nav-home{background:#E7F4F7;color:#3E8298}.nav-project{background:#EEF1F8;color:#5D6F9B}.nav-inbox{background:#F0EFF8;color:#74679B}.nav-tender{background:#F7F0E6;color:#A06C33}.nav-commercial{background:#EAF5EF;color:#4D8065}.nav-finance{background:#E9F4F3;color:#45827B}.nav-contacts{background:#F6EDEF;color:#9A6269}.nav-apps{background:#EFF2F4;color:#667B84}.pst-ws-navbtn.active .pst-nav-icon-shell{box-shadow:0 4px 11px rgba(57,102,120,.12)}
.pst-top-icon{display:inline-flex;align-items:center;justify-content:center;margin-right:5px}.pst-top-icon svg{width:14px;height:14px}.pst-top-icon .duo{opacity:.16}
@media(max-width:1100px){.pst-home-hero-emblem{display:none}#page-workspace-home .pst-ws-quick{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:800px){#page-workspace-home .pst-ws-head{padding:20px!important;border-radius:17px}.pst-hcc-tabs{display:flex;width:max-content;max-width:100%;overflow-x:auto}#page-workspace-home .pst-ws-quick{grid-template-columns:1fr!important}.pst-quick-copy small{white-space:normal}.pst-priority-icon{width:34px;height:34px}.pst-ws-action-side{align-self:flex-start}}
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
