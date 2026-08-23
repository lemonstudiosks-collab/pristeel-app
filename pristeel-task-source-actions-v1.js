/* PRISTEEL task source actions v20
 * Final Workspace shell + safe source shortcut.
 * Presentation-only. No project/task/business data writes.
 * Event-driven and bounded: no observers or polling loops.
 * The final shell now shares one navigation/Home contract with Operating Experience.
 */
(function(){
'use strict';
if(window.__pstTaskSourceActionsV1)return;
window.__pstTaskSourceActionsV1=true;

function S(v){return String(v==null?'':v);}
function hidden(el,on){if(!el||!el.style)return;if(on)el.style.setProperty('display','none','important');else el.style.removeProperty('display');}
var SURFACE_SEL=[
 '#page-workspace-home.active','#page-workspace-projects.active','#page-workspace-project.active',
 '#page-kek-tenders.active','#page-workspace-contacts.active','#page-contacts.active',
 '#page-workspace-inbox.active','#page-workspace-commercial.active','#page-document-center.active',
 '#page-oferta.active','#page-invoices.active','#page-finance.active',
 '#page-workspace-apps.active','#module-hub.active','#page-home.active'
].join(',');
var PRIMARY=[
 {key:'home',label:'Home',badge:'pst-ws-b-home'},
 {key:'tenders',label:'Opportunities'},
 {key:'projects',label:'Projects',badge:'pst-ws-b-projects'},
 {key:'contacts',label:'Partners'},
 {key:'finance',label:'Finance',badge:'pst-ws-b-finance'},
 {key:'apps',label:'System'}
];
var SECONDARY=[
 {key:'inbox',label:'Gmail',badge:'pst-ws-b-inbox'},
 {key:'commercial',label:'Komerciale',badge:'pst-ws-b-commercial'}
];
function workspace(){return document.querySelector(SURFACE_SEL);}
function home(){var p=document.getElementById('page-workspace-home');return p&&p.classList.contains('active')&&p.style.display!=='none'?p:null;}
function icon(k){var p={
 home:'<path d="M3.5 11 12 4l8.5 7v8.5a1.5 1.5 0 0 1-1.5 1.5h-4.5v-6h-5v6H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
 projects:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>',
 tenders:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="m15.5 15.5 3.5 3.5M19 15.5l-3.5 3.5"/>',
 contacts:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>',
 inbox:'<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
 commercial:'<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v5h4M9 12h7M9 16h5"/>',
 finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>',
 apps:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'
 }[k]||'';return'<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';}

function sourceUrl(v){var m=S(v).match(/https:\/\/[^\s<>"']+/i);if(!m)return'';try{var u=new URL(S(m[0]).replace(/[\]\)}>.,;]+$/g,''));return u.protocol==='https:'?u.href:'';}catch(e){return'';}}
function metadata(row){var original=S(row&&row.dataset&&row.dataset.pstOriginalMeta).trim();if(original)return original;var m=row&&row.querySelector('.pst-ws-action-meta');return m?S(m.getAttribute('title')||m.textContent).trim():'';}
function enhanceRow(row){if(!row)return false;var c=row.querySelector('.pst-ws-action-controls');if(!c||c.querySelector('.pst-task-source-open'))return false;var url=sourceUrl(metadata(row));if(!url)return false;var b=document.createElement('button');b.type='button';b.className='pst-task-source-open';b.textContent='Burimi';b.title='Hap burimin zyrtar në tab të ri';b.onclick=function(e){e.preventDefault();e.stopPropagation();window.open(url,'_blank','noopener,noreferrer');};var menu=c.querySelector('.pst-dash-task-menu');if(menu)c.insertBefore(b,menu);else c.appendChild(b);return true;}

function openTenders(e){if(e){e.preventDefault();e.stopPropagation();}if(typeof window.pstTenderBizOpenMonitor==='function')return window.pstTenderBizOpenMonitor();if(typeof window.pstWsKekTenders==='function')return window.pstWsKekTenders();if(typeof window.showPage==='function')return window.showPage('kek-tenders');}
function ensureContacts(onReady){
 if(window.PSTContactMasterV1){if(typeof onReady==='function')onReady();return true;}
 var existing=document.querySelector('script[data-pst-contact-master]');
 if(existing){if(typeof onReady==='function')existing.addEventListener('load',onReady,{once:true});return false;}
 var s=document.createElement('script');s.src='pristeel-contact-master-v1.js?v='+Date.now();s.defer=true;s.dataset.pstContactMaster='1';if(typeof onReady==='function')s.addEventListener('load',onReady,{once:true});document.head.appendChild(s);return false;
}
function ensureTheme(){
 if(window.__pstSectionThemeV2)return true;
 if(document.querySelector('script[data-pst-section-theme-v2-live]'))return false;
 var s=document.createElement('script');s.src='pristeel-section-theme-v1.js?v='+Date.now();s.defer=true;s.setAttribute('data-pst-section-theme-v2-live','1');document.head.appendChild(s);return false;
}
function ensureOperatingExperience(onReady){
 if(window.PSTOperatingExperienceV1){if(typeof onReady==='function')onReady();return true;}
 var existing=document.querySelector('script[data-pst-operating-experience]');
 if(existing){if(typeof onReady==='function')existing.addEventListener('load',onReady,{once:true});return false;}
 var s=document.createElement('script');s.src='pristeel-operating-experience-v1.js?v=20260823-2';s.defer=true;s.setAttribute('data-pst-operating-experience','1');if(typeof onReady==='function')s.addEventListener('load',onReady,{once:true});document.head.appendChild(s);return false;
}
function handoffOperatingExperience(){try{var X=window.PSTOperatingExperienceV1;if(X&&typeof X.apply==='function')X.apply();}catch(e){console.warn('PPPP shell operating handoff:',e);}}
function setTheme(k){try{var T=window.PSTSectionThemeV1;if(T&&typeof T.setSection==='function')T.setSection(k);}catch(e){}}
function go(k,e){
 if(e){e.preventDefault();e.stopPropagation();}
 setTheme(k);
 if(k==='tenders')return openTenders(e);
 if(k==='contacts'){
   var openContacts=function(){if(window.PSTContactMasterV1&&typeof window.PSTContactMasterV1.open==='function')return window.PSTContactMasterV1.open();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('contacts');};
   if(window.PSTContactMasterV1&&typeof window.PSTContactMasterV1.open==='function')return window.PSTContactMasterV1.open();
   return ensureContacts(openContacts);
 }
 if(k==='inbox'&&typeof window.pstWsGmail==='function')return window.pstWsGmail('inbox');
 if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo(k);
}
function badge(ws,id){var e=document.getElementById(id);if(e&&ws.contains(e))return e;e=document.createElement('i');e.id=id;e.className='pst-ws-badge';return e;}
function nav(ws,k,label,badgeId){var b=document.createElement('button');b.type='button';b.className='pst-ws-navbtn pst-canonical-navbtn';b.dataset.key=k;b.innerHTML=icon(k)+'<span class="pst-nav-label">'+label+'</span>';if(badgeId)b.appendChild(badge(ws,badgeId));b.onclick=function(e){go(k,e);};return b;}
function ensureNav(ws,host,item){var b=host.querySelector('.pst-ws-navbtn[data-key="'+item.key+'"]');if(!b)b=nav(ws,item.key,item.label,item.badge);b.classList.add('pst-canonical-navbtn');var l=b.querySelector('.pst-nav-label');if(!l){l=document.createElement('span');l.className='pst-nav-label';b.appendChild(l);}l.textContent=item.label;return b;}
function currentKey(){
 if(document.querySelector('#page-workspace-home.active'))return'home';
 if(document.querySelector('#page-workspace-projects.active,#page-workspace-project.active'))return'projects';
 if(document.querySelector('#page-kek-tenders.active'))return'tenders';
 if(document.querySelector('#page-workspace-contacts.active,#page-contacts.active'))return'contacts';
 if(document.querySelector('#page-finance.active'))return'finance';
 if(document.querySelector('#page-workspace-inbox.active,#page-workspace-commercial.active,#page-document-center.active,#page-oferta.active,#page-invoices.active,#page-workspace-apps.active,#module-hub.active,#page-home.active'))return'apps';
 return'';
}
function activeNav(host){var k=currentKey();if(k)setTheme(k);host.querySelectorAll('.pst-canonical-navbtn').forEach(function(b){b.classList.toggle('active',b.dataset.key===k);});return k;}
function stabilizeLabels(host){
 var title=host.querySelector('.pst-ws-navtitle');if(title)title.textContent='PPPP';
 PRIMARY.concat(SECONDARY).forEach(function(item){var b=host.querySelector('.pst-ws-navbtn[data-key="'+item.key+'"]'),l=b&&b.querySelector('.pst-nav-label');if(l)l.textContent=item.label;});
}
function sidebar(){
 if(!workspace())return false;
 var ws=document.getElementById('pst-ws-sidebar');if(!ws)return false;
 var host=ws.querySelector('#pst-ws-canonical-nav');
 if(!host){host=document.createElement('div');host.id='pst-ws-canonical-nav';host.innerHTML='<div class="pst-ws-navtitle">PPPP</div><div class="pst-ws-nav pst-canon-work"></div><div class="pst-ws-navtitle pst-canon-tools-title">Mjetet</div><div class="pst-ws-nav pst-canon-tools"></div>';var create=ws.querySelector('.pst-ws-create');if(create)create.insertAdjacentElement('afterend',host);else ws.prepend(host);}
 var work=host.querySelector('.pst-canon-work'),tools=host.querySelector('.pst-canon-tools');
 if(!work){work=document.createElement('div');work.className='pst-ws-nav pst-canon-work';host.appendChild(work);}
 if(!tools){tools=document.createElement('div');tools.className='pst-ws-nav pst-canon-tools';host.appendChild(tools);}
 PRIMARY.forEach(function(item){work.appendChild(ensureNav(ws,host,item));});
 SECONDARY.forEach(function(item){tools.appendChild(ensureNav(ws,host,item));});
 var toolsTitle=host.querySelector('.pst-canon-tools-title');hidden(toolsTitle,true);hidden(tools,true);
 Array.prototype.forEach.call(ws.children,function(ch){hidden(ch,!(ch===host||ch.classList.contains('pst-ws-brand')||ch.classList.contains('pst-ws-create')||ch.classList.contains('pst-ws-spacer')||ch.classList.contains('pst-ws-search')));});
 stabilizeLabels(host);activeNav(host);return true;
}
function hideBottomSearch(){if(!workspace())return;var ws=document.getElementById('pst-ws-sidebar');document.querySelectorAll('button,div').forEach(function(el){if(!el||el===ws||(ws&&ws.contains(el)))return;var txt=S(el.textContent).replace(/\s+/g,' ').trim();if(!/^(Kërko|Kerko)(\s*[⌘⌃]?\s*K)?$/i.test(txt))return;var r=el.getBoundingClientRect();if(r.left<285&&r.bottom>window.innerHeight-135&&r.width<220&&r.height<80)el.classList.add('pst-ws-legacy-floating-hide');});}
function compactSort(){var s=document.getElementById('pst-pm-sort');if(!s)return false;s.setAttribute('aria-label','Rendit projektet sipas');s.title='Rendit projektet sipas aktivitetit, afatit ose klientit';var w=s.parentElement;if(w&&!w.querySelector('.pst-pm-sort-label')){var l=document.createElement('span');l.className='pst-pm-sort-label';l.textContent='Rendit sipas';w.insertBefore(l,s);}return true;}
function hideCounters(p){var re=/^\s*\d+\s+(prioritete?\s+aktive|projekte?\s+n[eë]\s+pun[eë]|follow-?up\s+aktiv(?:e)?)\s*$/i;p.querySelectorAll('span,div,button').forEach(function(el){var txt=S(el.textContent).replace(/\s+/g,' ').trim();if(txt.length<60&&re.test(txt))hidden(el,true);});}
function stabilizeHome(){var p=home();if(!p)return false;var flow=document.getElementById('flow-bar');if(flow)hidden(flow,true);var a=document.getElementById('pst-ws-home-actions'),card=a&&a.closest('.pst-ws-card');if(card){var title=card.querySelector('.pst-ws-card-title'),sub=card.querySelector('.pst-ws-card-sub');if(title)title.textContent='Duhet veprimi yt';if(sub)sub.textContent='PPPP shfaq vetëm vendimet dhe veprimet që kërkojnë ndërhyrjen tënde.';}p.querySelectorAll('.pst-ws-action-tag').forEach(function(tag){var t=S(tag.textContent).trim().toUpperCase();if(t==='VEPRO TANI'||t==='VEPRIM')tag.textContent='KËRKON VEPRIM';});hideCounters(p);return true;}
function shell(){
 if(!workspace())return false;
 var app=document.getElementById('app-sidebar'),v2=document.getElementById('pst-v2-sidebar'),ws=document.getElementById('pst-ws-sidebar');
 if(app)app.classList.remove('open');
 if(v2&&ws&&ws.parentElement!==v2)v2.appendChild(ws);
 if(app&&v2)Array.prototype.forEach.call(app.children,function(ch){if(ch!==v2)hidden(ch,true);});
 if(v2&&ws)Array.prototype.forEach.call(v2.children,function(ch){if(ch!==ws)hidden(ch,true);});
 document.querySelectorAll('.rail').forEach(function(r){hidden(r,true);r.classList.remove('open');});
 sidebar();hideBottomSearch();compactSort();stabilizeHome();return true;
}
function decorate(){shell();var p=home(),n=0;if(p)p.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').forEach(function(r){if(enhanceRow(r))n++;});if(p)stabilizeHome();handoffOperatingExperience();return n;}
function schedule(){[0,40,120,280,650,1200].forEach(function(ms){setTimeout(decorate,ms);});}
function css(){
 ['pst-task-source-actions-v10-css','pst-task-source-actions-v11-css','pst-task-source-actions-v12-css','pst-task-source-actions-v13-css','pst-task-source-actions-v14-css','pst-task-source-actions-v15-css','pst-task-source-actions-v16-css','pst-task-source-actions-v17-css','pst-task-source-actions-v18-css','pst-task-source-actions-v19-css'].forEach(function(id){var x=document.getElementById(id);if(x)x.remove();});
 if(document.getElementById('pst-task-source-actions-v20-css'))return;
 var s=document.createElement('style');s.id='pst-task-source-actions-v20-css';
 var top=[
 '#page-workspace-home.active','#page-workspace-projects.active','#page-workspace-inbox.active',
 '#page-workspace-commercial.active','#page-workspace-apps.active','#page-workspace-project.active',
 '#page-workspace-contacts.active','#page-contacts.active','#page-kek-tenders.active',
 '#page-document-center.active','#page-oferta.active','#page-invoices.active','#page-finance.active',
 '#module-hub.active','#page-home.active'
 ].join(',');
 s.textContent=`
body:has(#page-workspace-home.active) #flow-bar{display:none!important}
.pst-ws-legacy-floating-hide{display:none!important}
#pst-ws-sidebar>#pst-ws-canonical-nav{display:block!important}
#pst-ws-canonical-nav .pst-ws-navbtn{display:grid!important;grid-template-columns:20px minmax(0,1fr) auto!important;align-items:center!important;column-gap:11px!important;min-height:42px!important;width:100%!important}
#pst-ws-canonical-nav .pst-ws-navbtn svg{width:18px!important;height:18px!important;justify-self:center!important;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
#pst-ws-canonical-nav .pst-canon-tools-title,#pst-ws-canonical-nav .pst-canon-tools{display:none!important}
#page-workspace-home .pst-task-source-open{height:32px;border:1px solid #CFE0E7;border-radius:10px;padding:0 11px;background:#F8FBFC;color:#3F7F98;font-size:10px;font-weight:760;cursor:pointer}
body:has(${top}) .topbar,
body:has(${top}) #modbar,
body:has(${top}) .rail{display:none!important}
body:has(${top}) #app-sidebar{display:block!important;width:268px!important;min-width:268px!important;max-width:268px!important;height:100vh!important;position:sticky!important;top:0!important;overflow:hidden!important;background:#fff!important}
body:has(${top}) #app-sidebar>*:not(#pst-v2-sidebar){display:none!important}
body:has(${top}) #pst-v2-sidebar{display:block!important;width:100%!important;height:100%!important;min-height:100vh!important;padding:0!important;overflow:hidden!important}
body:has(${top}) #pst-v2-sidebar>*:not(#pst-ws-sidebar){display:none!important}
body:has(${top}) #pst-ws-sidebar{display:flex!important;flex-direction:column!important;width:100%!important;height:100%!important;min-height:100vh!important;overflow-y:auto!important;overflow-x:hidden!important;background:#fff!important}
#page-workspace-projects .pst-pm-sort-label{font-size:9px!important;font-weight:700!important;color:#77838A!important;white-space:nowrap!important;margin-left:auto!important}
`;
 document.head.appendChild(s);
}
css();ensureTheme();ensureContacts();ensureOperatingExperience(schedule);schedule();
window.addEventListener('pst-dashboard-rendered',schedule);
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
document.addEventListener('click',function(e){if(e.target&&e.target.closest&&e.target.closest('#pst-ws-canonical-nav .pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="pstOpenProjectWorkspace"],[onclick*="showPage"],[onclick*="openModuleHub"]'))schedule();},true);
window.PSTTaskSourceActionsV1={sourceUrl:sourceUrl,metadataText:metadata,enhanceRow:enhanceRow,decorate:decorate,stabilizeWorkspaceShell:shell,normalizeSidebar:sidebar,compactProjectSort:compactSort,stabilizeHome:stabilizeHome,currentKey:currentKey,handoffOperatingExperience:handoffOperatingExperience};
})();