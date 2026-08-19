/* PRISTEEL task source actions v16
 * Stable Workspace shell + safe source shortcut.
 * Daily navigation: Home, Projects, Tenders, Contacts.
 * Back-office tools: Gmail, Commercial, Finance, Modules.
 * Home cleanup removes legacy workflow chrome and presentation-only counters.
 * No project/task/business data writes.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

function sourceUrl(value){
  var text=String(value||''),match=text.match(/https:\/\/[^\s<>"']+/i);if(!match)return'';
  var candidate=String(match[0]||'').replace(/[\]\)}>.,;]+$/g,'');
  try{var parsed=new URL(candidate,window.location&&window.location.href||undefined);return parsed.protocol==='https:'?parsed.href:'';}catch(e){return'';}
}
function metadataText(row){
  if(!row)return'';var original=String(row.dataset&&row.dataset.pstOriginalMeta||'').trim();if(original)return original;
  var meta=row.querySelector('.pst-ws-action-meta');return meta?String(meta.getAttribute('title')||meta.textContent||'').trim():'';
}
function sourceButton(url){
  var btn=document.createElement('button');btn.type='button';btn.className='pst-task-source-open';btn.textContent='Burimi';btn.title='Hap burimin zyrtar në tab të ri';
  btn.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();window.open(url,'_blank','noopener,noreferrer');});return btn;
}
function enhanceRow(row){
  if(!row)return false;var controls=row.querySelector('.pst-ws-action-controls');if(!controls||controls.querySelector('.pst-task-source-open'))return false;
  var url=sourceUrl(metadataText(row));if(!url)return false;var btn=sourceButton(url),menu=controls.querySelector('.pst-dash-task-menu');if(menu)controls.insertBefore(btn,menu);else controls.appendChild(btn);row.dataset.pstTaskSourceUrl=url;return true;
}
function workspacePage(){return document.querySelector('#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active');}
function homeActive(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function setHidden(el,hidden){if(!el||!el.style)return;if(hidden)el.style.setProperty('display','none','important');else el.style.removeProperty('display');}
function icon(key){
  var p={
    home:'<path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
    projects:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>',
    tenders:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="m15.5 15.5 3.5 3.5M19 15.5l-3.5 3.5"/>',
    contacts:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>',
    inbox:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    commercial:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/>',
    finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>',
    apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'
  }[key]||'';return'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function openTenders(event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(typeof window.pstTenderBizOpenMonitor==='function'){window.pstTenderBizOpenMonitor();return;}
  if(typeof window.pstWsKekTenders==='function'){window.pstWsKekTenders();return;}
  if(typeof window.showPage==='function')window.showPage('kek-tenders');
}
function ensureContactMaster(){
  if(window.PSTContactMasterV1||document.querySelector('script[data-pst-contact-master]'))return;
  var s=document.createElement('script');s.src='pristeel-contact-master-v1.js?v='+Date.now();s.defer=true;s.setAttribute('data-pst-contact-master','1');s.onerror=function(){console.error('Nuk u ngarkua PPPP Contact Master.');};document.head.appendChild(s);
}
function go(key,event){
  if(event){event.preventDefault();event.stopPropagation();}
  if(key==='tenders'){openTenders(event);return;}
  if(key==='contacts'){
    ensureContactMaster();
    if(window.PSTContactMasterV1&&typeof window.PSTContactMasterV1.open==='function'){window.PSTContactMasterV1.open();return;}
    var n=0,t=setInterval(function(){if(window.PSTContactMasterV1&&typeof window.PSTContactMasterV1.open==='function'){clearInterval(t);window.PSTContactMasterV1.open();}else if(++n>20){clearInterval(t);if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('contacts');}},50);return;
  }
  if(key==='inbox'){
    if(typeof window.pstWsGmail==='function'){window.pstWsGmail('inbox');return;}
    if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('inbox');return;}
  }
  if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo(key);return;}
}
function badgeElement(ws,id){
  var e=document.getElementById(id);if(e&&ws.contains(e))return e;
  e=document.createElement('i');e.id=id;e.className='pst-ws-badge';return e;
}
function navButton(ws,key,label,badgeId){
  var b=document.createElement('button');b.type='button';b.className='pst-ws-navbtn pst-canonical-navbtn';b.setAttribute('data-key',key);b.innerHTML=icon(key)+'<span>'+label+'</span>';
  if(badgeId)b.appendChild(badgeElement(ws,badgeId));
  b.addEventListener('click',function(e){go(key,e);});return b;
}
function buildCanonicalSidebar(){
  if(!workspacePage())return false;var ws=document.getElementById('pst-ws-sidebar');if(!ws)return false;
  var host=ws.querySelector('#pst-ws-canonical-nav');
  if(!host){
    host=document.createElement('div');host.id='pst-ws-canonical-nav';host.innerHTML='<div class="pst-ws-navtitle">Puna</div><div class="pst-ws-nav pst-canon-work"></div><div class="pst-ws-navtitle pst-canon-tools-title">Mjetet</div><div class="pst-ws-nav pst-canon-tools"></div>';
    var create=ws.querySelector('.pst-ws-create');if(create)create.insertAdjacentElement('afterend',host);else ws.insertBefore(host,ws.firstChild);
    var work=host.querySelector('.pst-canon-work'),tools=host.querySelector('.pst-canon-tools');
    work.appendChild(navButton(ws,'home','Home','pst-ws-b-home'));
    work.appendChild(navButton(ws,'projects','Projektet','pst-ws-b-projects'));
    work.appendChild(navButton(ws,'tenders','Tenderat',null));
    work.appendChild(navButton(ws,'contacts','Kontaktet',null));
    tools.appendChild(navButton(ws,'inbox','Gmail','pst-ws-b-inbox'));
    tools.appendChild(navButton(ws,'commercial','Komerciale','pst-ws-b-commercial'));
    tools.appendChild(navButton(ws,'finance','Financa','pst-ws-b-finance'));
    tools.appendChild(navButton(ws,'apps','Modulet',null));
  }
  Array.prototype.forEach.call(ws.children,function(child){
    if(child===host||child.classList.contains('pst-ws-brand')||child.classList.contains('pst-ws-create')||child.classList.contains('pst-ws-spacer')||child.classList.contains('pst-ws-search'))setHidden(child,false);
    else setHidden(child,true);
  });
  updateCanonicalActive();return true;
}
function updateCanonicalActive(){
  var host=document.getElementById('pst-ws-canonical-nav');if(!host)return;var key='';
  if(document.querySelector('#page-workspace-home.active'))key='home';else if(document.querySelector('#page-workspace-projects.active,#page-workspace-project.active'))key='projects';else if(document.querySelector('#page-workspace-contacts.active'))key='contacts';else if(document.querySelector('#page-workspace-commercial.active'))key='commercial';else if(document.querySelector('#page-workspace-apps.active'))key='apps';else if(document.querySelector('#page-workspace-inbox.active'))key='inbox';
  host.querySelectorAll('.pst-canonical-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});
}
function hideLegacyBottomSearch(){
  if(!workspacePage())return;var ws=document.getElementById('pst-ws-sidebar');
  Array.prototype.forEach.call(document.querySelectorAll('button,div'),function(el){
    if(!el||el===ws||(ws&&ws.contains(el)))return;var text=String(el.textContent||'').replace(/\s+/g,' ').trim();if(!/^(Kërko|Kerko)(\s*[⌘⌃]?\s*K)?$/i.test(text))return;
    var r=el.getBoundingClientRect();if(r.left<285&&r.bottom>window.innerHeight-135&&r.width<220&&r.height<80)el.classList.add('pst-ws-legacy-floating-hide');
  });
}
function compactProjectSort(){
  if(!workspacePage())return false;var select=document.getElementById('pst-pm-sort');if(!select)return false;select.setAttribute('aria-label','Rendit projektet sipas');select.title='Rendit projektet sipas aktivitetit, afatit ose klientit';
  var wrap=select.parentElement;if(wrap&&!wrap.querySelector('.pst-pm-sort-label')){var label=document.createElement('span');label.className='pst-pm-sort-label';label.textContent='Rendit sipas';wrap.insertBefore(label,select);}return true;
}
function hideHomeCounters(page){
  if(!page)return;var re=/(?:^|\s)\d+\s+(?:prioritete?\s+aktive|projekte?\s+n[eë]\s+pun[eë]|follow-?up\s+aktiv(?:e)?)(?:\s|$)/i;
  Array.prototype.forEach.call(page.querySelectorAll('span,div,button'),function(el){var t=String(el.textContent||'').replace(/\s+/g,' ').trim();if(t&&t.length<55&&re.test(t))setHidden(el,true);});
}
function stabilizeHome(){
  if(!homeActive())return false;var page=document.getElementById('page-workspace-home');
  var flow=document.getElementById('flow-bar');if(flow)setHidden(flow,true);
  var actions=document.getElementById('pst-ws-home-actions'),card=actions&&actions.closest('.pst-ws-card');
  if(card){var title=card.querySelector('.pst-ws-card-title'),sub=card.querySelector('.pst-ws-card-sub');if(title&&title.textContent!=='Për mua tani')title.textContent='Për mua tani';if(sub&&sub.textContent!=='Maksimumi pesë veprime konkrete që kërkojnë vendim ose veprim.')sub.textContent='Maksimumi pesë veprime konkrete që kërkojnë vendim ose veprim.';}
  page.querySelectorAll('.pst-ws-action-tag').forEach(function(tag){var t=String(tag.textContent||'').trim().toUpperCase();if(t==='VEPRO TANI'||t==='VEPRIM')tag.textContent='KËRKON VEPRIM';});
  hideHomeCounters(page);return true;
}
function stabilizeWorkspaceShell(){
  if(!workspacePage())return false;var sidebar=document.getElementById('app-sidebar'),v2=document.getElementById('pst-v2-sidebar'),ws=document.getElementById('pst-ws-sidebar');
  if(sidebar)sidebar.classList.remove('open');if(v2&&ws&&ws.parentElement!==v2)v2.appendChild(ws);if(sidebar&&v2)Array.prototype.forEach.call(sidebar.children,function(child){if(child!==v2)setHidden(child,true);});if(v2&&ws)Array.prototype.forEach.call(v2.children,function(child){if(child!==ws)setHidden(child,true);});
  Array.prototype.forEach.call(document.querySelectorAll('.rail'),function(rail){setHidden(rail,true);rail.classList.remove('open');});buildCanonicalSidebar();hideLegacyBottomSearch();compactProjectSort();stabilizeHome();return !!(sidebar&&v2&&ws);
}
function decorate(){
  stabilizeWorkspaceShell();var page=document.getElementById('page-workspace-home');if(!page||!homeActive())return 0;var count=0;page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(row){if(enhanceRow(row))count++;});stabilizeHome();return count;
}
function schedule(){[0,40,100,220,500,900,1500].forEach(function(ms){setTimeout(decorate,ms);});}
function installObservers(){
  function watch(){
    var page=document.getElementById('page-workspace-home');if(page&&!page.__pstHomeStableObserver){var queued=false,o=new MutationObserver(function(){if(queued)return;queued=true;queueMicrotask(function(){queued=false;stabilizeHome();});});o.observe(page,{childList:true,subtree:true,characterData:true});page.__pstHomeStableObserver=o;}
  }
  watch();setTimeout(watch,400);setTimeout(watch,1200);
}
function installStyle(){
  ['pst-task-source-actions-v10-css','pst-task-source-actions-v11-css','pst-task-source-actions-v12-css','pst-task-source-actions-v13-css','pst-task-source-actions-v14-css','pst-task-source-actions-v15-css'].forEach(function(id){var old=document.getElementById(id);if(old)old.remove();});
  if(document.getElementById('pst-task-source-actions-v16-css'))return;var style=document.createElement('style');style.id='pst-task-source-actions-v16-css';style.textContent=`
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;line-height:1;cursor:pointer;white-space:nowrap}#page-workspace-home .pst-task-source-open:hover{background:#EDF6F9;border-color:#B8D4DF;color:#2F6E86}
body:has(#page-workspace-home.active) #flow-bar{display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) .topbar,body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) .rail{display:none!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #app-sidebar,body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #app-sidebar.open{width:268px!important;min-width:268px!important;max-width:268px!important;height:100vh!important;position:sticky!important;top:0!important;overflow:hidden!important;transition:none!important;background:#fff!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #app-sidebar>*:not(#pst-v2-sidebar){display:none!important}body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #pst-v2-sidebar{display:block!important;width:100%!important;height:100%!important;min-height:100vh!important;padding:0!important;overflow:hidden!important}body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #pst-v2-sidebar>*:not(#pst-ws-sidebar){display:none!important}body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #pst-ws-sidebar{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important;min-height:100vh!important;overflow-y:auto!important;overflow-x:hidden!important;background:#fff!important}
#pst-ws-sidebar>#pst-ws-canonical-nav{display:block!important}#pst-ws-sidebar>#pst-ws-canonical-nav .pst-ws-navbtn{display:grid!important;grid-template-columns:20px minmax(0,1fr) auto!important;align-items:center!important;column-gap:11px!important;min-height:42px!important;width:100%!important}#pst-ws-sidebar>#pst-ws-canonical-nav .pst-ws-navbtn svg{width:18px!important;height:18px!important;justify-self:center!important;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}#pst-ws-sidebar>#pst-ws-canonical-nav .pst-ws-navbtn span{min-width:0!important;line-height:1.2!important}#pst-ws-sidebar>#pst-ws-canonical-nav .pst-canon-tools-title{margin-top:8px!important}
body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) .sidebar-footer,body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #side-nav,body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) #side-quick,body:has(#page-workspace-home.active,#page-workspace-projects.active,#page-workspace-inbox.active,#page-workspace-commercial.active,#page-workspace-apps.active,#page-workspace-project.active,#page-workspace-contacts.active) .pst-ws-mailbar,.pst-ws-legacy-floating-hide{display:none!important}
body.pst-ui-v2 #page-workspace-home #pst-ws-home-actions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important}body.pst-ui-v2 #page-workspace-home .pst-priority-card.pst-happy-priority,body.pst-ui-v2 #page-workspace-home .pst-priority-card.pst-happy-priority[data-pst-priority-kind],body.pst-ui-v2 #page-workspace-home .pst-priority-card.pst-happy-priority.is-urgent,body.pst-ui-v2 #page-workspace-home .pst-priority-card.pst-happy-priority.is-overdue{min-height:210px!important;background:linear-gradient(145deg,#FFFFFF 0%,#FAFCFD 100%)!important;border:1px solid #DDE8EC!important;border-left:0!important;border-radius:21px!important;box-shadow:0 9px 25px rgba(37,65,77,.055)!important}body.pst-ui-v2 #page-workspace-home .pst-priority-card.pst-happy-priority:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,#A9C8D2,#C5D9DF);z-index:2}body.pst-ui-v2 #page-workspace-home .pst-happy-priority-art{opacity:.055!important;color:#315766!important}
#page-workspace-projects .pst-pm-control-top{display:flex!important;align-items:center!important;gap:10px!important;flex-wrap:wrap!important}#page-workspace-projects .pst-pm-search{flex:1 1 420px!important;min-width:260px!important}#page-workspace-projects #pst-pm-sort,#page-workspace-projects .pst-pm-sortwrap .pst-pm-select{width:170px!important;min-width:170px!important;max-width:170px!important;flex:0 0 170px!important}#page-workspace-projects .pst-pm-sort-label{font-size:9px!important;font-weight:700!important;color:#77838A!important;white-space:nowrap!important;margin-left:auto!important}
@media(max-width:980px){body.pst-ui-v2 #page-workspace-home #pst-ws-home-actions{grid-template-columns:1fr!important}}
`;
  document.head.appendChild(style);
}
installStyle();ensureContactMaster();installObservers();
window.addEventListener('pst-dashboard-rendered',schedule);document.addEventListener('pst:home-canonical-rendered',schedule);document.addEventListener('pst:modules-ready',schedule,{once:true});window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(event){var trigger=event.target&&event.target.closest?event.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="pstOpenProjectWorkspace"],#pst-ws-home-projects button'):null;if(trigger)schedule();},true);
if(window.__pstModulesReady)schedule();else schedule();
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadataText,enhanceRow:enhanceRow,decorate:decorate,stabilizeWorkspaceShell:stabilizeWorkspaceShell,normalizeSidebar:buildCanonicalSidebar,compactProjectSort:compactProjectSort,stabilizeHome:stabilizeHome};
})();
