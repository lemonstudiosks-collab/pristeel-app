/* PRISTEEL Home Launcher v4
 * Calm, module-first Home. The existing Home owners remain loaded for compatibility,
 * but this is the final desktop Home presentation.
 */
(function(){
'use strict';
if(window.__pstHomeLauncherV5)return;
window.__pstHomeLauncherV5=true;
window.__pstHomeLauncherV4=true;
/* Final desktop Home is single-owner. Retire later legacy presentation layers
 * before they register render/listener cycles. Canonical Home/data bridge stays active. */
window.__pstHomeCommandCenterV2=true;
window.__pstHomeVisualCleanupV3=true;
window.__pstHomeVisualCleanupV2=true;
window.__pstHomeVisualCleanupV1=true;
window.__pstHomeOperatingGridV1=true;
window.__pstHomeMorningCommandCenterV1=true;
window.__pstHomeOperatorDashboardV1=true;
var V='20261005-home-nav-stable1',clockTimer=0,weatherBusy=false,weatherLoaded=false,homeObserver=null,shellObserver=null,discoveryObserver=null,repairQueued=false,shellQueued=false,mountQueued=false,pendingRoute='';

function S(v){return String(v==null?'':v)}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function A(v){return Array.isArray(v)?v:[]}
function active(){
 var p=document.getElementById('page-workspace-home');if(!p)return false;
 if(p.hidden)return false;
 if(p.style&&p.style.display==='none')return false;
 try{var cs=window.getComputedStyle?window.getComputedStyle(p):null;if(cs&&(cs.display==='none'||cs.visibility==='hidden'))return false}catch(e){}
 return p.classList.contains('active');
}
function nav(){return window.PSTPrimaryNavResilienceV10||window.PSTPrimaryNavResilienceV1||null}
function imp(el,k,v){if(!el)return;if(el.style.getPropertyValue(k)!==v||el.style.getPropertyPriority(k)!=='important')el.style.setProperty(k,v,'important')}
function bodyFlag(k,on){if(document.body.classList.contains(k)!==!!on)document.body.classList.toggle(k,!!on)}
function clearForced(el,props){if(!el||el.getAttribute('data-pst-home-shell-forced')!=='1')return;props.forEach(function(k){el.style.removeProperty(k)});el.removeAttribute('data-pst-home-shell-forced')}
function homeShell(on){
 // The static SPIE shell owns geometry from first paint; retain Home visibility only.
 if(document.documentElement.classList.contains('pst-spie-standard')){
  bodyFlag('pst-home-shell-owned',true);
  bodyFlag('pst-home-launcher-active',on);
  return;
 }

 var shell=document.getElementById('app-shell-root')||document.querySelector('.app-shell');
 var main=shell&&shell.querySelector? shell.querySelector(':scope > .main, :scope > main.main'):document.querySelector('.app-shell>.main');
 var sides=[document.getElementById('app-sidebar'),document.getElementById('pst-v2-sidebar'),document.getElementById('pst-ws-sidebar')];
 document.querySelectorAll('.app-shell>.sidebar,.app-shell>aside.sidebar').forEach(function(x){if(sides.indexOf(x)<0)sides.push(x)});
 var work=!on&&['page-kek-tenders','page-representations','page-eu-companies','page-dach-steel-sales'].some(function(id){var p=document.getElementById(id);return p&&!p.hidden&&p.classList.contains('active')&&p.style.display!=='none'});
 bodyFlag('pst-home-shell-owned',on||work);
 if(work){
  bodyFlag('pst-home-launcher-active',false);
  if(shell){shell.setAttribute('data-pst-home-shell-forced','1');imp(shell,'display','flex');imp(shell,'grid-template-columns','204px minmax(0,1fr)')}
  sides.forEach(function(x){if(!x)return;var outer=x.id==='app-sidebar'||x.parentNode===shell;x.setAttribute('data-pst-home-shell-forced','1');imp(x,'display','flex');imp(x,'visibility','visible');imp(x,'width',outer?'204px':'100%');imp(x,'min-width',outer?'204px':'0px');imp(x,'max-width',outer?'204px':'none');imp(x,'flex-basis',outer?'204px':'auto');imp(x,'border-right-width',outer?'1px':'0px');imp(x,'overflow','hidden')});
  if(main){main.setAttribute('data-pst-home-shell-forced','1');imp(main,'width','auto');imp(main,'max-width','none');imp(main,'min-width','0px');imp(main,'margin-left','0px');imp(main,'padding-left','0px');imp(main,'flex','1 1 auto')}
  return;
 }
  if(on){
  bodyFlag('pst-home-launcher-active',true);
  if(shell){shell.setAttribute('data-pst-home-shell-forced','1');imp(shell,'display','block');imp(shell,'grid-template-columns','minmax(0,1fr)')}
  sides.forEach(function(x){if(!x)return;x.setAttribute('data-pst-home-shell-forced','1');imp(x,'display','none');imp(x,'visibility','hidden');imp(x,'width','0px');imp(x,'min-width','0px');imp(x,'max-width','0px');imp(x,'flex-basis','0px');imp(x,'border-right-width','0px');imp(x,'overflow','hidden')});
  if(main){main.setAttribute('data-pst-home-shell-forced','1');imp(main,'width','100%');imp(main,'max-width','none');imp(main,'min-width','0px');imp(main,'margin-left','0px');imp(main,'padding-left','0px');imp(main,'flex','1 1 auto')}
  var daily=document.getElementById('pst-daily-launch');if(daily){daily.setAttribute('data-pst-home-daily-duplicate','1');imp(daily,'display','none')}
 }else{
  bodyFlag('pst-home-launcher-active',false);
  clearForced(shell,['display','grid-template-columns']);
  sides.forEach(function(x){clearForced(x,['display','visibility','width','min-width','max-width','flex-basis','border-right-width','overflow'])});
  clearForced(main,['width','max-width','min-width','margin-left','padding-left','flex']);
  var daily=document.getElementById('pst-daily-launch');if(daily&&daily.getAttribute('data-pst-home-daily-duplicate')==='1'){daily.style.removeProperty('display');daily.removeAttribute('data-pst-home-daily-duplicate')}
 }
}
function watchShell(page){
 if(shellObserver||!window.MutationObserver||!document.body)return;
 shellObserver=new MutationObserver(function(records){
  if(!document||!document.body)return;
  var relevant=false;
  for(var i=0;i<records.length;i++){var t=records[i].target;if(t===page||t===document.body||t.id==='app-shell-root'||t.id==='app-sidebar'||t.id==='pst-v2-sidebar'||t.id==='pst-ws-sidebar'||(t.classList&&t.classList.contains('sidebar'))){relevant=true;break}}
  if(!relevant)return;
  if(shellQueued)return;shellQueued=true;
  (window.requestAnimationFrame||function(fn){return setTimeout(fn,0)})(function(){shellQueued=false;if(active()){if(!document.getElementById('pst-home-launcher-v4'))mount();else homeShell(true)}else homeShell(false)});
 });
 shellObserver.observe(document.body,{subtree:true,attributes:true,attributeFilter:['class','style','hidden']});
}
function svg(p){return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>'}
var I={
 search:svg('<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 4.4 4.4"/>'),
 news:svg('<rect x="4" y="3.5" width="14" height="17" rx="2"/><path d="M7 7h8M7 10.5h8M7 14h5"/><path d="M18 7h2v11a2 2 0 0 1-2 2"/>'),
 calc:svg('<rect x="5" y="2.5" width="14" height="19" rx="2"/><rect x="8" y="5.5" width="8" height="3"/><path d="M8 12h1m3 0h1m3 0h1M8 15.5h1m3 0h1m3 0h1M8 19h1m3 0h1m3 0h1"/>'),
 clock:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3.2 2"/>'),
 weather:svg('<path d="M7.5 17.5h9.2a3.3 3.3 0 0 0 .2-6.6A5.1 5.1 0 0 0 7.4 9a4.3 4.3 0 0 0 .1 8.5Z"/><path d="M16.4 4.3v-2M20.1 5.9l1.4-1.4M21.6 9.5h2"/>'),
 opportunities:svg('<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>'),
 representations:svg('<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 20c.2-4.1 2-6.4 5.2-6.4 2.1 0 3.7 1 4.5 2.8M13.5 14.5c1-.8 2.1-1.2 3.5-1.2 2.7 0 4.2 2.1 4.4 5.7"/>'),
 direct:svg('<path d="M5 21V5h9v16M14 9h5v12"/><path d="M8 8h3M8 12h3M8 16h3M16 12h1M16 16h1"/>'),
 buyers:svg('<path d="M4 21V9l5 3V8l5 3V4h6v17z"/><path d="M8 17h2m4 0h2"/>'),
 projects:svg('<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>'),
 partners:svg('<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>'),
 finance:svg('<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>'),
 currency:svg('<path d="M7 8.5h7M7 15.5h7"/><path d="M17.5 6.5c-1-1-2.2-1.5-3.8-1.5-3.4 0-5.7 2.7-5.7 7s2.3 7 5.7 7c1.6 0 2.8-.5 3.8-1.5"/>'),
 steel:svg('<path d="M4 7h16l-3 4H7zM4 13h16l-3 4H7z"/>'),
 events:svg('<rect x="4" y="5" width="16" height="15" rx="2.3"/><path d="M8 3v4M16 3v4M4 9h16"/><path d="M8 13h3M13 13h3M8 17h3"/>'),
 arrow:svg('<path d="m9 6 6 6-6 6"/>'),
 close:svg('<path d="M6 6l12 12M18 6 6 18"/>')
};
function gmail(){return '<svg class="phl-gmail" viewBox="0 0 32 24"><path fill="#4285F4" d="M2 5.3 6 8.2V22H2z"/><path fill="#34A853" d="M26 8.2 30 5.3V22h-4z"/><path fill="#EA4335" d="M2 5.3 5.2 2.8 16 10.8 26.8 2.8 30 5.3 16 15.7z"/><path fill="#C5221F" d="M26.8 2.8 30 5.3 16 15.7 13.8 14.1z"/></svg>'}
function icon(k,top){return '<span class="'+(top?'phl-top-icon':'phl-card-icon')+'">'+(k==='gmail'?gmail():(I[k]||(k==='spie'?I.projects:'')))+'</span>'}

function clearHomeRouteState(){
 var p=document.getElementById('page-workspace-home');
 if(p){p.classList.remove('active');p.style.display='none'}
 document.querySelectorAll('#pst-ws-canonical-nav [data-key="home"],#pst-ws-sidebar [data-key="home"],#side-nav [data-key="home"],[data-page="home"]').forEach(function(x){x.classList.remove('active');x.classList.remove('on')});
 homeShell(false);
}
function keepWorkShell(){
 (window.requestAnimationFrame||function(fn){return setTimeout(fn,0)})(function(){if(!active())homeShell(false)});
}
function openDaily(){
 homeShell(true);
 try{if(window.PSTDailySafeV2&&typeof window.PSTDailySafeV2.open==='function')return window.PSTDailySafeV2.open()}catch(e){}
 var old=document.querySelector('script[data-pst-home-daily]');
 if(!old){var s=document.createElement('script');s.src='pristeel-daily-safe-v2.js?v=20261003-home-launcher1';s.defer=true;s.setAttribute('data-pst-home-daily','1');document.head.appendChild(s)}
 var tries=0,t=setInterval(function(){tries++;try{if(window.PSTDailySafeV2&&typeof window.PSTDailySafeV2.open==='function'){clearInterval(t);window.PSTDailySafeV2.open();return}}catch(e){}if(tries>30)clearInterval(t)},100);
 return true;
}
function route(k){
 k=S(k).toLowerCase();
 if(k==='spie'){location.assign(new URL('spie/',location.href).href);return true;}
 if(k==='daily')return openDaily();
 // Early Home is usable while the ordered module owners are still loading.
 // Keep the requested route and dispatch once; never hide Home into an empty page.
 if(window.__pstBootstrapDiagnostics&&!window.__pstModulesReady){pendingRoute=k;return true;}
 pendingRoute='';
 clearHomeRouteState();
 var n=nav(),ok=false;
 try{if(n&&typeof n.syncSidebar==='function')n.syncSidebar(k)}catch(e){}
 try{
  if(k==='opportunities'){
   if(n&&typeof n.openOpportunities==='function')ok=n.openOpportunities();
   else if(typeof window.pstTenderBizOpenMonitor==='function'){window.pstTenderBizOpenMonitor();ok=true}
   else if(typeof window.pstWsKekTenders==='function'){window.pstWsKekTenders();ok=true}
  }else if(k==='representations'){
   if(n&&typeof n.openRepresentations==='function')ok=n.openRepresentations();
   else if(window.PSTRepresentationsV1&&typeof window.PSTRepresentationsV1.open==='function')ok=window.PSTRepresentationsV1.open();
   else{location.hash='#perfaqesime';ok=true}
  }else if(k==='direct'){
   if(window.PSTEUCompaniesV1&&typeof window.PSTEUCompaniesV1.open==='function')ok=window.PSTEUCompaniesV1.open();
   else{location.hash='#kompanite-eu';ok=true}
  }else if(k==='buyers'){
   if(window.PSTDachSteelSalesV3&&typeof window.PSTDachSteelSalesV3.open==='function')ok=window.PSTDachSteelSalesV3.open();
  }else if(k==='events'){
   ok=eventsPage();
  }else if(k==='projects'){
   if(n&&typeof n.openProjects==='function')ok=n.openProjects();
   else if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('projects');ok=true}
  }else if(k==='partners'){
   if(n&&typeof n.openPartners==='function')ok=n.openPartners();
   else if(typeof window.pstWorkspaceGo==='function'){window.pstWorkspaceGo('contacts');ok=true}
  }else if(k==='finance'){
   if(n&&typeof n.openFinance==='function')ok=n.openFinance();
   else if(typeof window.finShowHub==='function'){window.finShowHub();ok=true}
  }
 }catch(e){console.warn('PRISTEEL Home route',k,e);ok=false}
 keepWorkShell();
 if(ok===false){
  setTimeout(function(){
   var work=[].slice.call(document.querySelectorAll('.page.active')).some(function(p){return p.id!=='page-workspace-home'&&p.style.display!=='none'});
   if(!work){try{var H=nav();if(H&&typeof H.openHome==='function')H.openHome();else{var p=document.getElementById('page-workspace-home');if(p){p.style.display='block';p.classList.add('active')}mount()}}catch(e){mount()}}
  },160);
 }
 return ok!==false;
}
function search(q){
 q=S(q).trim();
 try{if(window.PSTSearchStableV2&&window.PSTSearchStableV2.open){window.PSTSearchStableV2.open(q);return true}}catch(e){}
 try{if(typeof window.pstOpenSearch==='function'){window.pstOpenSearch(q);return true}}catch(e){}
 try{if(typeof window.openCmdK==='function'){window.openCmdK(q);return true}}catch(e){}
 return false;
}
function openGmail(){try{window.open('https://mail.google.com/mail/u/0/#inbox','PRISTEEL_GMAIL','noopener');return true}catch(e){return false}}
var EVENT_REGISTRY=[{
 id:'d7c23392-f7e2-4f87-8205-e7ff637ac3aa',
 title:'German-Kosovar Economic Forum 2026',
 dates:'28–29 tetor 2026',
 location:'Prishtinë, Kosovë',
 status:'Në përgatitje'
}];
var EVENT_COMPANIES=[
 {id:'spie',name:'SPIE',contact:'Laura Ihl',contact_role:'Kontakt projekti / Procurement',participation:'Për t’u verifikuar',participation_code:'verify',meeting:'Pa kërkesë',meeting_code:'none',priority:'A',strategic:true,relation:'Marrëdhënie aktive PriSteel / TenneT BUNT',why:'SPIE është kontakt real dhe klient/projekt aktiv për PriSteel. Forumi mund të përdoret për ta zgjeruar bashkëpunimin për fabrication dhe external manufacturing capacity.',objective:'Verifiko pjesëmarrjen në Forum. Nëse merr pjesë, kërko takim të fokusuar te bashkëpunimi afatgjatë dhe projektet e ardhshme.',discussed:'PriSteel ka avancuar në sourcing shortlist të SPIE dhe më 2 tetor janë kërkuar dy mostra. Paralelisht vazhdon puna për TenneT BUNT.',decision:'Mos e shfaq SPIE si pjesëmarrës të konfirmuar pa verifikim në B2Match. Mbaje si target strategjik A.',plan:'Verifiko pjesëmarrjen; nëse po, kërko takim dhe përgatit briefing të shkurtër për kapacitetin e prodhimit dhe projektet e reja.',next:'Verifiko pjesëmarrjen'},
 {id:'bilfinger',name:'Bilfinger',contact:'Ata Safak / Armin Gabriel',contact_role:'Group Procurement / Category Management',participation:'Për t’u verifikuar',participation_code:'verify',meeting:'Pa kërkesë',meeting_code:'none',priority:'A',strategic:true,relation:'Target strategjik me proces aktiv supplier qualification',why:'Bilfinger është target i rëndësishëm industrial për PriSteel dhe ekziston tashmë histori reale e supplier qualification.',objective:'Nëse Bilfinger është pjesëmarrës, përdore Forumin për takim të drejtpërdrejtë dhe për ta hapur rrugën e bashkëpunimit.',discussed:'Supplier qualification / LSA është punuar dhe ka mbetur çështja e komenteve dhe modelit ISO 9001.',decision:'Mbaje si target strategjik A; pjesëmarrja në Forum nuk konsiderohet e konfirmuar pa provë.',plan:'Verifiko listën e pjesëmarrësve; nëse Bilfinger figuron, kërko takim dhe përgatit statusin e qualification si briefing.',next:'Verifiko pjesëmarrjen'},
 {id:'goldbeck',name:'GOLDBECK',contact:'—',contact_role:'Kontakt relevant për t’u identifikuar',participation:'Për t’u verifikuar',participation_code:'verify',meeting:'Pa kërkesë',meeting_code:'none',priority:'A',strategic:true,relation:'Target strategjik për industrial cooperation / market entry',why:'GOLDBECK është target i madh potencial për kapacitet prodhues, subcontracting dhe bashkëpunim industrial.',objective:'Të identifikohet personi relevant dhe të verifikohet pjesëmarrja përpara kërkesës për takim.',discussed:'Është përmendur si target strategjik i Forumit; nuk kemi evidencë të konfirmuar të pjesëmarrjes ose takim të kërkuar.',decision:'Mos e përziej me pjesëmarrësit e konfirmuar. Mbaje në targetet A deri në verifikim.',plan:'Kontrollo B2Match, identifiko kontaktin relevant dhe kërko takim vetëm nëse pjesëmarrja konfirmohet.',next:'Verifiko dhe gjej kontaktin'},
 {id:'steelcobelimed',name:'SteelcoBelimed',contact:'Jochen Schlag',contact_role:'Kontakt i Forumit',participation:'I verifikuar në B2Match',participation_code:'confirmed',meeting:'Refuzuar',meeting_code:'declined',priority:'C',strategic:false,relation:'Kontakt i Forumit; portfolio mismatch i identifikuar',why:'Takimi u kërkua për të testuar përshtatshmërinë komerciale.',objective:'Nuk ka objektiv aktiv pas refuzimit dhe sqarimit të nevojës teknike.',discussed:'Jochen Schlag refuzoi kërkesën për takim më 1 tetor 2026. SteelcoBelimed kërkon tuba/fletë inox shumë të lustruara dhe rezistente, me certifikata 3.1 për makina farmaceutike; u identifikua mospërputhje me portofolin.',decision:'Mos harxho kohë me follow-up për këtë Forum, përveç nëse del një scope i ri relevant.',plan:'Mbaje vetëm si evidencë të Forumit dhe mësim për qualification të targeteve.',next:'Asnjë veprim'}
];
var EVENT_SESSIONS=[
 {when:'28 tetor · 12:15',title:'Manufacturing supply chains'},
 {when:'28 tetor · 12:30',title:'German–Kosovar industrial partnerships'},
 {when:'28 tetor · 14:30',title:'Industrial 1:1'},
 {when:'29 tetor · 10:30–13:20',title:'B2B meetings'}
];
var EVENT_OPPORTUNITIES=[
 'Managed Steel Production Network & External Manufacturing Capacity',
 'German–Kosovar Industrial Partnerships, Representation & Market Entry'
];
var EVENT_ACTIVITY_CACHE={};
function eventById(id){id=S(id);for(var i=0;i<EVENT_REGISTRY.length;i++)if(S(EVENT_REGISTRY[i].id)===id)return EVENT_REGISTRY[i];return null}
function eventCompanyById(id){id=S(id);for(var i=0;i<EVENT_COMPANIES.length;i++)if(S(EVENT_COMPANIES[i].id)===id)return EVENT_COMPANIES[i];return null}
function eventsSurface(){
 var p=document.getElementById('page-workspace-events-forums');
 if(!p){var host=document.querySelector('.content');if(!host)return null;p=document.createElement('section');p.id='page-workspace-events-forums';p.className='page';host.appendChild(p)}
 document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none'}});
 p.classList.add('active');p.style.display='block';return p;
}
function eventActivityKind(subject){
 var s=S(subject).toLowerCase();
 if(/declined.*meeting|meeting.*declined|refuz/.test(s))return'Takim i refuzuar';
 if(/accepted.*meeting|meeting.*accepted|pranuar/.test(s))return'Takim i pranuar';
 if(/unread conversation|new message|message/.test(s))return'Mesazh';
 if(/opportunity is validated|validated/.test(s))return'Opportunity e validuar';
 if(/registration|regjistr/.test(s))return'Regjistrim';
 return'Aktivitet';
}
function eventActivityDate(v){try{return new Date(v).toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'})}catch(e){return''}}
function cleanEventActivity(rows){
 rows=A(rows);var seen={},clean=[];
 rows.forEach(function(r){
  var day=S(r.sent_at).slice(0,10),key=(S(r.subject)+'|'+day).toLowerCase().replace(/\s+/g,' ').trim();if(!key||seen[key])return;seen[key]=true;clean.push(r);
 });
 return clean;
}
function activityRowsHtml(rows,limit){
 rows=cleanEventActivity(rows);if(limit)rows=rows.slice(0,limit);
 if(!rows.length)return'<div class="pef-empty">Ende nuk ka aktivitet të lidhur me këtë event.</div>';
 return rows.map(function(r){
  var open=r.gmail_url?' data-event-mail="'+E(r.gmail_url)+'" tabindex="0" role="button"':'';
  return'<div class="pef-activity-row"'+open+'><span class="pef-activity-dot"></span><span class="pef-activity-copy"><small>'+E(eventActivityKind(r.subject))+'</small><b>'+E(r.subject||'Aktivitet i Forumit')+'</b><em>'+E(eventActivityDate(r.sent_at))+'</em></span></div>';
 }).join('');
}
function renderEventActivity(p,rows){
 if(!p)return;EVENT_ACTIVITY_CACHE['d7c23392-f7e2-4f87-8205-e7ff637ac3aa']=A(rows);
 p.querySelectorAll('[data-event-activity]').forEach(function(box){box.innerHTML=activityRowsHtml(rows,0)});
 p.querySelectorAll('[data-event-activity-mini]').forEach(function(box){box.innerHTML=activityRowsHtml(rows,4)});
 bindEventMailLinks(p);
}
function bindEventMailLinks(p){
 p.querySelectorAll('[data-event-mail]').forEach(function(x){x.onclick=function(){try{window.open(x.getAttribute('data-event-mail'),'_blank','noopener')}catch(e){}}});
}
function loadEventActivity(ev,p){
 var cached=EVENT_ACTIVITY_CACHE[ev.id];if(cached){renderEventActivity(p,cached);return}
 var boxes=p?p.querySelectorAll('[data-event-activity],[data-event-activity-mini]'):[];
 boxes.forEach(function(box){box.innerHTML='<div class="pef-empty">Duke ngarkuar aktivitetin…</div>'});
 if(typeof window.supaFetch!=='function'){boxes.forEach(function(box){box.innerHTML='<div class="pef-empty">Aktiviteti nuk mund të ngarkohet tani.</div>'});return}
 var path='project_emails?select=id,sent_at,subject,direction,snippet,gmail_url&project_id=eq.'+encodeURIComponent(ev.id)+'&order=sent_at.desc&limit=20';
 window.supaFetch(path).then(function(rows){renderEventActivity(p,rows)}).catch(function(){boxes.forEach(function(box){box.innerHTML='<div class="pef-empty">Aktiviteti nuk mund të ngarkohet tani.</div>'})});
}
function eventStats(){
 return{
  participants:EVENT_COMPANIES.filter(function(x){return x.participation_code==='confirmed'}).length,
  strategic:EVENT_COMPANIES.filter(function(x){return x.strategic}).length,
  requested:EVENT_COMPANIES.filter(function(x){return x.meeting_code!=='none'}).length,
  confirmed:EVENT_COMPANIES.filter(function(x){return x.meeting_code==='accepted'}).length,
  declined:EVENT_COMPANIES.filter(function(x){return x.meeting_code==='declined'}).length
 };
}
function badgeClass(code){return code==='confirmed'||code==='accepted'?'is-good':code==='declined'?'is-bad':code==='verify'||code==='pending'?'is-warn':'is-neutral'}
function eventTabsHtml(active){
 var tabs=[['overview','Përmbledhje'],['companies','Kompanitë & Takimet'],['docs','Dokumentet'],['activity','Aktiviteti'],['after','Pas Forumit']];
 return'<nav class="pef-tabs">'+tabs.map(function(t){return'<button type="button" data-event-tab="'+t[0]+'" class="'+(active===t[0]?'active':'')+'">'+t[1]+'</button>'}).join('')+'</nav>';
}
function eventOverviewHtml(ev){
 var s=eventStats();
 var actions=[
  ['Kontrollo listën e pjesëmarrësve të rinj','B2Match · mos i përziej me targetet e paverifikuara'],
  ['Verifiko SPIE, Bilfinger dhe GOLDBECK','3 targete strategjike A presin verifikim të pjesëmarrjes'],
  ['Kërko takim vetëm pas verifikimit','Nëse targeti figuron në B2Match, atëherë dërgo kërkesën'],
  ['Përgatit briefing për targetet A','SPIE · Bilfinger · GOLDBECK']
 ];
 return'<section data-event-panel="overview" class="pef-panel active">'
  +'<div class="pef-kpis">'
   +'<div class="pef-kpi is-blue"><small>Pjesëmarrës të verifikuar</small><b>'+s.participants+'</b><em>evidencë B2Match</em></div>'
   +'<div class="pef-kpi is-green"><small>Targete strategjike</small><b>'+s.strategic+'</b><em>prioritet A</em></div>'
   +'<div class="pef-kpi is-purple"><small>Kërkesa takimi</small><b>'+s.requested+'</b><em>të njohura</em></div>'
   +'<div class="pef-kpi is-amber"><small>Takime të konfirmuara</small><b>'+s.confirmed+'</b><em>deri tani</em></div>'
   +'<div class="pef-kpi is-red"><small>Takime të refuzuara</small><b>'+s.declined+'</b><em>deri tani</em></div>'
  +'</div>'
  +'<div class="pef-overview-grid">'
   +'<section class="pef-box"><h2>Tani — çfarë duhet të bëjmë</h2><div class="pef-action-list">'+actions.map(function(a,i){return'<div class="pef-action"><span class="pef-check">'+(i===0?'!':'')+'</span><span><b>'+E(a[0])+'</b><small>'+E(a[1])+'</small></span></div>'}).join('')+'</div></section>'
   +'<section class="pef-box"><h2>Agjenda jonë</h2><div class="pef-session-list">'+EVENT_SESSIONS.map(function(x){return'<div><small>'+E(x.when)+'</small><b>'+E(x.title)+'</b></div>'}).join('')+'</div></section>'
  +'</div>'
  +'<div class="pef-overview-grid pef-overview-lower">'
   +'<section class="pef-box"><h2>Opportunity-t tona</h2><div class="pef-opps">'+EVENT_OPPORTUNITIES.map(function(x){return'<div>'+E(x)+'</div>'}).join('')+'</div></section>'
   +'<section class="pef-box"><h2>Aktiviteti i fundit</h2><div data-event-activity-mini></div></section>'
  +'</div>'
 +'</section>';
}
function companyRowHtml(x){
 return'<button type="button" class="pef-company-row" data-event-company="'+E(x.id)+'">'
  +'<span><b>'+E(x.name)+'</b><small>'+E(x.contact)+'</small></span>'
  +'<span class="pef-badge '+badgeClass(x.participation_code)+'">'+E(x.participation)+'</span>'
  +'<span class="pef-badge '+badgeClass(x.meeting_code)+'">'+E(x.meeting)+'</span>'
  +'<span class="pef-priority '+(x.priority==='A'?'is-a':x.priority==='B'?'is-b':'is-c')+'">'+E(x.priority)+'</span>'
  +'<span>'+E(x.next)+'</span>'
  +'<i>›</i>'
 +'</button>';
}
function companyDetailHtml(x){
 if(!x)return'<div class="pef-company-empty">Zgjidh një kompani.</div>';
 return'<div class="pef-company-detail-head"><small>DETAJET E KOMPANISË</small><h3>'+E(x.name)+'</h3><div><span class="pef-badge '+badgeClass(x.participation_code)+'">'+E(x.participation)+'</span>'+(x.strategic?'<span class="pef-badge is-purple">Target strategjik</span>':'')+'</div></div>'
  +'<dl class="pef-company-dl">'
   +'<dt>Personi kryesor</dt><dd><b>'+E(x.contact)+'</b><small>'+E(x.contact_role)+'</small></dd>'
   +'<dt>Statusi i takimit</dt><dd><span class="pef-badge '+badgeClass(x.meeting_code)+'">'+E(x.meeting)+'</span></dd>'
   +'<dt>Prioriteti</dt><dd><span class="pef-priority '+(x.priority==='A'?'is-a':x.priority==='B'?'is-b':'is-c')+'">'+E(x.priority)+'</span></dd>'
   +'<dt>Marrëdhënia</dt><dd>'+E(x.relation)+'</dd>'
   +'<dt>Pse na intereson</dt><dd>'+E(x.why)+'</dd>'
   +'<dt>Objektivi në Forum</dt><dd>'+E(x.objective)+'</dd>'
  +'</dl>'
  +'<div class="pef-company-notes"><div><small>Çfarë kemi biseduar</small><p>'+E(x.discussed)+'</p></div><div><small>Çfarë kemi vendosur</small><p>'+E(x.decision)+'</p></div><div><small>Çfarë planifikojmë</small><p>'+E(x.plan)+'</p></div><div class="is-next"><small>Hapi i radhës</small><p>'+E(x.next)+'</p></div></div>';
}
function filterEventCompanies(p){
 var q=S(p.querySelector('[data-company-search]')&&p.querySelector('[data-company-search]').value).toLowerCase().trim();
 var part=S(p.querySelector('[data-company-participation]')&&p.querySelector('[data-company-participation]').value);
 var meet=S(p.querySelector('[data-company-meeting]')&&p.querySelector('[data-company-meeting]').value);
 return EVENT_COMPANIES.filter(function(x){
  if(q&&[x.name,x.contact,x.relation,x.why].join(' ').toLowerCase().indexOf(q)<0)return false;
  if(part&&x.participation_code!==part)return false;
  if(meet&&x.meeting_code!==meet)return false;
  return true;
 });
}
function renderEventCompanies(p){
 var list=p.querySelector('[data-company-list]');if(!list)return;
 var rows=filterEventCompanies(p);
 list.innerHTML=rows.length?rows.map(companyRowHtml).join(''):'<div class="pef-empty">Nuk ka kompani me këta filtra.</div>';
 list.querySelectorAll('[data-event-company]').forEach(function(x){x.onclick=function(){p.dataset.eventCompany=x.getAttribute('data-event-company');renderEventCompanyDetail(p)}});
}
function renderEventCompanyDetail(p){
 var box=p.querySelector('[data-company-detail]');if(!box)return;
 var id=p.dataset.eventCompany||'spie',x=eventCompanyById(id);box.innerHTML=companyDetailHtml(x);
}
function eventCompaniesHtml(){
 return'<section data-event-panel="companies" class="pef-panel">'
  +'<div class="pef-company-toolbar"><input type="search" data-company-search placeholder="Kërko kompani ose person…"><select data-company-participation><option value="">Pjesëmarrja: të gjitha</option><option value="confirmed">Të verifikuar</option><option value="verify">Për t’u verifikuar</option></select><select data-company-meeting><option value="">Takimet: të gjitha</option><option value="none">Pa kërkesë</option><option value="accepted">Konfirmuar</option><option value="declined">Refuzuar</option></select></div>'
  +'<div class="pef-company-grid"><div class="pef-company-table"><div class="pef-company-head"><span>Kompania / personi</span><span>Pjesëmarrja</span><span>Takimi</span><span>Prioriteti</span><span>Hapi tjetër</span><span></span></div><div data-company-list></div></div><aside class="pef-company-side" data-company-detail></aside></div>'
 +'</section>';
}
function eventDocsHtml(){
 return'<section data-event-panel="docs" class="pef-panel"><div class="pef-doc-grid">'
  +'<section class="pef-box"><h2>Dokumentet & linket</h2><a class="pef-doc-link" href="https://www.b2match.com/e/german-kosovar-economic-forum" target="_blank" rel="noopener"><b>Faqja e eventit (B2Match)</b><small>Hap faqen zyrtare të Forumit</small></a><div class="pef-doc-link is-static"><b>PRISTEEL_GK_Economic_Forum_2026_Short_Deck_EN.pdf</b><small>Short deck i përgatitur për Forum</small></div><div class="pef-doc-link is-static"><b>Profili PriSteel</b><small>Aktivizuar dhe i dukshëm për pjesëmarrësit</small></div></section>'
  +'<section class="pef-box"><h2>Agjenda e zgjedhur</h2><div class="pef-session-list">'+EVENT_SESSIONS.map(function(x){return'<div><small>'+E(x.when)+'</small><b>'+E(x.title)+'</b></div>'}).join('')+'</div></section>'
  +'<section class="pef-box pef-doc-wide"><h2>Opportunity-t tona në Forum</h2><div class="pef-opps">'+EVENT_OPPORTUNITIES.map(function(x){return'<div>'+E(x)+'</div>'}).join('')+'</div></section>'
 +'</div></section>';
}
function eventActivityHtml(){return'<section data-event-panel="activity" class="pef-panel"><section class="pef-box"><h2>Aktiviteti i Forumit</h2><p class="pef-box-intro">Komunikimet e lidhura me Forumin. Kliko një rresht kur ka link Gmail.</p><div data-event-activity></div></section></section>'}
function eventAfterHtml(){
 return'<section data-event-panel="after" class="pef-panel"><div class="pef-after-grid"><div class="pef-box"><h2>Pas Forumit</h2><p class="pef-box-intro">Kjo pjesë përdoret pas 29 tetorit për follow-up, lead-et e reja dhe opportunity-t që dalin nga takimet.</p><div class="pef-after-items"><div><b>Follow-up me kompanitë</b><small>Do të mblidhen këtu sipas takimeve të zhvilluara.</small></div><div><b>Opportunity të reja</b><small>Vetëm ato që kanë evidencë reale nga takimet.</small></div><div><b>Vendime dhe next steps</b><small>Për secilën kompani veçmas.</small></div></div></div></div></section>';
}
function activateEventTab(p,key){
 p.dataset.eventTab=key;
 p.querySelectorAll('[data-event-tab]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-event-tab')===key)});
 p.querySelectorAll('[data-event-panel]').forEach(function(x){x.classList.toggle('active',x.getAttribute('data-event-panel')===key)});
}
function bindEventWorkspace(p,ev){
 p.querySelectorAll('[data-event-tab]').forEach(function(x){x.onclick=function(){activateEventTab(p,x.getAttribute('data-event-tab'))}});
 var q=p.querySelector('[data-company-search]'),a=p.querySelector('[data-company-participation]'),m=p.querySelector('[data-company-meeting]');
 if(q)q.oninput=function(){renderEventCompanies(p)};if(a)a.onchange=function(){renderEventCompanies(p)};if(m)m.onchange=function(){renderEventCompanies(p)};
 renderEventCompanies(p);renderEventCompanyDetail(p);
 loadEventActivity(ev,p);
}
function eventDetail(id){
 var ev=eventById(id),p=eventsSurface();if(!ev||!p)return false;
 var s=eventStats();
 p.dataset.eventCompany='spie';
 p.innerHTML='<div class="pef-page pef-command"><header class="pef-head pef-command-head"><button type="button" class="pef-back" data-event-detail-back>← Kthehu</button><div><span>EVENTE DHE FORUME</span><h1>'+E(ev.title)+'</h1><p>'+E(ev.dates)+' · '+E(ev.location)+'</p></div><span class="pef-status-pill">'+E(ev.status)+'</span></header>'
  +eventTabsHtml('overview')
  +'<main class="pef-detail">'+eventOverviewHtml(ev)+eventCompaniesHtml()+eventDocsHtml()+eventActivityHtml()+eventAfterHtml()+'</main></div>';
 var back=p.querySelector('[data-event-detail-back]');if(back)back.onclick=function(){return eventsPage()};
 bindEventWorkspace(p,ev);window.scrollTo({top:0,behavior:'auto'});return true;
}
function eventsPage(){
 var p=eventsSurface();if(!p)return false;
 var cards=EVENT_REGISTRY.map(function(ev){return '<button type="button" class="pef-event-card" data-event-open="'+E(ev.id)+'">'+icon('events',false)+'<span class="pef-event-copy"><small>'+E(ev.status)+'</small><b>'+E(ev.title)+'</b><em>'+E(ev.dates)+' · '+E(ev.location)+'</em></span><span class="pef-event-open">Hap eventin ›</span></button>'}).join('');
 p.innerHTML='<div class="pef-page"><header class="pef-head"><button type="button" class="pef-back" data-events-back>← Kthehu</button><div><span>PPPP</span><h1>Evente dhe Forume</h1><p>Eventet aktive dhe historiku i tyre në një vend.</p></div></header><section class="pef-list"><h2>Eventet aktive</h2>'+cards+'</section></div>';
 p.querySelectorAll('[data-event-open]').forEach(function(x){x.onclick=function(){return eventDetail(x.getAttribute('data-event-open'))}});
 var back=p.querySelector('[data-events-back]');if(back)back.onclick=function(){try{var n=nav();if(n&&typeof n.openHome==='function')return n.openHome()}catch(e){}var h=document.getElementById('page-workspace-home');if(h){h.style.display='block';h.classList.add('active')}mount();return true};
 window.scrollTo({top:0,behavior:'auto'});return true;
}
function dateText(d){try{return d.toLocaleDateString('sq-AL',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}catch(e){return''}}
function clock(){
 var r=document.getElementById('pst-home-launcher-v4'),d=new Date();
 if(r){var t=r.querySelector('[data-time]'),x=r.querySelector('[data-date]');if(t)t.textContent=d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit',hour12:false});if(x)x.textContent=dateText(d)}
 clearTimeout(clockTimer);clockTimer=setTimeout(clock,(60-d.getSeconds())*1000-d.getMilliseconds()+100);
}
function weatherLabel(c){c=Number(c);if(c===0)return'Diell';if(c<=3)return'Vranësira';if(c===45||c===48)return'Mjegull';if((c>=51&&c<=67)||(c>=80&&c<=82))return'Shi';if(c>=71&&c<=77)return'Borë';if(c>=95)return'Stuhí';return'Moti'}
function weather(force){
 if(weatherBusy||(!force&&weatherLoaded))return;weatherBusy=true;
 fetch('https://api.open-meteo.com/v1/forecast?latitude=42.6629&longitude=21.1655&current=temperature_2m,weather_code&timezone=Europe%2FBelgrade',{cache:force?'no-store':'default'})
 .then(function(r){if(!r.ok)throw new Error(r.status);return r.json()})
 .then(function(j){var r=document.getElementById('pst-home-launcher-v4'),c=j&&j.current||{};if(!r)return;weatherLoaded=true;var t=r.querySelector('[data-temp]'),d=r.querySelector('[data-weather]');if(t&&isFinite(Number(c.temperature_2m)))t.textContent=Math.round(Number(c.temperature_2m))+'°C';if(d)d.textContent=weatherLabel(c.weather_code)+' · Prishtinë'})
 .catch(function(){var r=document.getElementById('pst-home-launcher-v4'),d=r&&r.querySelector('[data-weather]');if(d)d.textContent='Prishtinë'})
 .finally(function(){weatherBusy=false});
}

function modal(title,sub,body){
 var old=document.getElementById('phl-modal');if(old)old.remove();
 var m=document.createElement('div');m.id='phl-modal';m.className='phl-modal-bg';
 m.innerHTML='<section class="phl-modal"><header><div><h2>'+E(title)+'</h2>'+(sub?'<p>'+E(sub)+'</p>':'')+'</div><button type="button" data-close>'+I.close+'</button></header><div class="phl-modal-body">'+body+'</div></section>';
 document.body.appendChild(m);m.onclick=function(e){if(e.target===m||e.target.closest('[data-close]'))m.remove()};return m;
}
function calcValue(input){
 var s=S(input).replace(/\s+/g,''),nums=[],ops=[],i=0,expectNum=true;
 function prec(o){return o==='+'||o==='-'?1:o==='*'||o==='/'?2:0}
 function apply(){var o=ops.pop(),b=nums.pop(),a=nums.pop();if(a==null||b==null)throw 0;nums.push(o==='+'?a+b:o==='-'?a-b:o==='*'?a*b:a/b)}
 while(i<s.length){
  var ch=s[i];
  if((ch>='0'&&ch<='9')||ch==='.'||(ch==='-'&&expectNum)){
   var j=i+1;while(j<s.length&&((s[j]>='0'&&s[j]<='9')||s[j]==='.'))j++;
   var n=Number(s.slice(i,j));if(!isFinite(n))throw 0;nums.push(n);i=j;expectNum=false;continue;
  }
  if(ch==='('){ops.push(ch);i++;expectNum=true;continue}
  if(ch===')'){while(ops.length&&ops[ops.length-1]!=='(')apply();if(ops.pop()!=='(')throw 0;i++;expectNum=false;continue}
  if('+-*/'.indexOf(ch)>-1){while(ops.length&&ops[ops.length-1]!=='('&&prec(ops[ops.length-1])>=prec(ch))apply();ops.push(ch);i++;expectNum=true;continue}
  throw 0;
 }
 while(ops.length){if(ops[ops.length-1]==='(')throw 0;apply()}
 if(nums.length!==1||!isFinite(nums[0]))throw 0;return nums[0];
}
function calculator(){
 var keys=['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='];
 var m=modal('Kalkulatori','Llogaritje të shpejta pa dalë nga PRISTEEL.','<div class="phl-calc"><input data-display value="0" readonly><div>'+keys.map(function(k){return'<button type="button" data-key="'+E(k)+'">'+E(k)+'</button>'}).join('')+'</div></div>'),expr='',display=m.querySelector('[data-display]');
 function show(){display.value=expr||'0'}
 m.addEventListener('click',function(e){var b=e.target.closest('[data-key]');if(!b)return;var k=b.dataset.key;if(k==='C'){expr='';return show()}if(k==='⌫'){expr=expr.slice(0,-1);return show()}if(k==='±'){if(expr)expr=expr[0]==='-'?expr.slice(1):'-'+expr;return show()}if(k==='%'){if(expr)expr='('+expr+')/100';return show()}if(k==='='){try{var x=expr.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-');var v=calcValue(x);expr=String(Math.round(v*100000000)/100000000)}catch(_){expr=''}return show()}expr+=k;show()});
}
function currency(){
 var m=modal('Kursi i valutave','Kurs aktual me bazë EUR. Burimi: Frankfurter / ECB.','<div class="phl-state">Duke marrë kursin aktual…</div>');
 fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF,TRY',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json()}).then(function(j){
  var b=m.querySelector('.phl-modal-body'),rs=j&&j.rates||{},codes=['USD','GBP','CHF','TRY'];
  b.innerHTML='<div class="phl-rate-top"><b>1 EUR</b><span>'+E(j.date||'')+'</span></div><div class="phl-rates">'+codes.map(function(c){return'<div><span>'+c+'</span><b>'+E(rs[c]==null?'—':Number(rs[c]).toFixed(4))+'</b></div>'}).join('')+'</div>';
 }).catch(function(){var b=m.querySelector('.phl-modal-body');if(b)b.innerHTML='<div class="phl-state">Kursi nuk mund të merret tani.</div>'});
}
function steel(){
 var m=modal('Çmimet e çelikut','Referenca të brendshme PPPP nga ofertat e fundit; jo kuotime bursiere live.','<div class="phl-state">Duke ngarkuar referencat…</div>');
 if(typeof window.supaFetch!=='function'){m.querySelector('.phl-modal-body').innerHTML='<div class="phl-state">PPPP nuk është ende gati.</div>';return}
 window.supaFetch('price_history?select=work_type,our_price_kg,project_name,country,quoted_at&our_price_kg=not.is.null&order=quoted_at.desc&limit=10').then(function(rows){
  rows=A(rows);var b=m.querySelector('.phl-modal-body');if(!rows.length){b.innerHTML='<div class="phl-state">Nuk ka referenca të regjistruara.</div>';return}
  b.innerHTML='<div class="phl-prices">'+rows.map(function(r){return'<div><span><b>'+E(r.work_type||'Çelik')+'</b><small>'+E(r.project_name||'')+(r.country?' · '+E(r.country):'')+'</small></span><strong>'+E(Number(r.our_price_kg).toFixed(3))+' €/kg</strong><em>'+E(r.quoted_at||'')+'</em></div>'}).join('')+'</div>';
 }).catch(function(){var b=m.querySelector('.phl-modal-body');if(b)b.innerHTML='<div class="phl-state">Referencat nuk mund të ngarkohen tani.</div>'});
}
function mainCard(k,t,s){return'<button type="button" class="phl-main-card" data-open="'+k+'">'+icon(k,false)+'<span class="phl-main-copy"><b>'+E(t)+'</b><small>'+E(s)+'</small></span><i>'+I.arrow+'</i></button>'}
function smallCard(k,t,s){return'<button type="button" class="phl-small-card" data-open="'+k+'">'+icon(k,false)+'<span><b>'+E(t)+'</b><small>'+E(s)+'</small></span><i>'+I.arrow+'</i></button>'}
function html(){
 return'<div class="phl-shell"><header class="phl-top">'
  +'<div class="phl-brand"><span class="phl-mark">P</span><span><b>PRISTEEL</b><small>PPPP</small></span></div>'
  +'<nav>'
   +'<button type="button" data-gmail>'+icon('gmail',true)+'<b>Gmail</b></button>'
   +'<button type="button" data-open="daily">'+icon('news',true)+'<b>Gazeta PPPP</b></button>'
   +'<button type="button" data-tool="calc">'+icon('calc',true)+'<b>Kalkulatori</b></button>'
   +'<div class="phl-meta">'+icon('clock',true)+'<span><b data-time>--:--</b><small data-date>—</small></span></div>'
   +'<button type="button" class="phl-meta" data-weather-refresh>'+icon('weather',true)+'<span><b data-temp>—°C</b><small data-weather>Prishtinë</small></span></button>'
  +'</nav></header>'
  +'<main><section class="phl-intro"><h1>Mirësevini në PRISTEEL</h1><p>Zgjidh modulin ose kërko në platformë.</p></section>'
  +'<form class="phl-search" data-search-form>'+I.search+'<input data-search placeholder="Kërko projekt, kompani, tender, ofertë, furnitor…"><kbd>Ctrl K</kbd><button>'+I.arrow+'</button></form>'
  +'<section class="phl-main-grid">'
   +mainCard('opportunities','Mundësitë','Tenderë dhe lead-e për shqyrtim.')
   +mainCard('representations','Përfaqësime','Zhvillim tregu, kontakte dhe përfaqësime.')
   +mainCard('direct','Klientë të drejtpërdrejtë','Fabrication, kapacitet prodhues dhe nënkontraktim.')
   +mainCard('buyers','Blerësit e çelikut','Blerës materiali, RFQ dhe furnizim çeliku.')
  +'</section>'
  +'<section class="phl-secondary"><h2>Module dhe mjete tjera</h2><div>'
   +smallCard('spie','SPIE Workspace','TenneT, dokumente dhe komunikimi.')
   +smallCard('projects','Projektet','Projektet dhe gjendja e tyre.')
   +smallCard('partners','Partnerët','Partnerë, furnitorë dhe kontakte.')
   +smallCard('finance','Financa','Fatura, pagesa dhe raportim.')
   +smallCard('currency','Kursi','Kursi aktual i valutave.')
   +smallCard('steel','Çmimet e çelikut','Referenca çmimesh PPPP.')
   +smallCard('events','Evente dhe Forume','Evente, forume dhe takime biznesi.')
  +'</div></section></main></div>';
}
function css(){
 if(document.getElementById('pst-home-launcher-v4-css'))return;
 var s=document.createElement('style');s.id='pst-home-launcher-v4-css';s.textContent=[
'body.pst-home-launcher-active .app-shell,body.pst-home-launcher-active #app-shell-root{display:block!important;grid-template-columns:minmax(0,1fr)!important}',
'body.pst-home-launcher-active .app-shell>.sidebar,body.pst-home-launcher-active .app-shell>aside.sidebar,body.pst-home-launcher-active #app-sidebar,body.pst-home-launcher-active #pst-v2-sidebar,body.pst-home-launcher-active #pst-ws-sidebar,body.pst-home-launcher-active .topbar,body.pst-home-launcher-active #pst-global-page-backbar{display:none!important;width:0!important;min-width:0!important;max-width:0!important}',
'body.pst-home-launcher-active #app-shell-root>.main,body.pst-home-launcher-active .app-shell>.main,body.pst-home-launcher-active .content{width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important}',
'body.pst-home-launcher-active #page-workspace-home{display:block!important;visibility:visible!important;opacity:1!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}',
'body.pst-home-launcher-active #page-workspace-home>#pst-native-home-v4,body.pst-home-launcher-active #page-workspace-home>.pst-ws-home,body.pst-home-launcher-active #page-workspace-home>#pst-home-launchpad-v1{display:none!important}',
'body.pst-home-launcher-active #page-workspace-home>:not(#pst-home-launcher-v4){display:none!important}',
'body.pst-home-launcher-active #page-workspace-home>#pst-home-launcher-v4{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:20!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}',
'@media(min-width:901px){body.pst-home-launcher-active #page-workspace-home>#pst-home-launcher-v4{position:fixed!important;inset:0!important;z-index:1000!important;overflow:auto!important;width:100vw!important;max-width:none!important;height:100vh!important;margin:0!important;padding:0!important}}',
'body:not(.pst-home-launcher-active) .app-shell>.sidebar,body:not(.pst-home-launcher-active) .app-shell>aside.sidebar{padding-top:12px!important;box-sizing:border-box!important}',
'#pst-home-launcher-v4{display:none!important;min-height:100vh;background:#f7f6f2;color:#172436;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}',
'body.pst-home-launcher-active #pst-daily-launch{display:none!important}',
'#pst-home-launcher-v4 *{box-sizing:border-box}',
'.phl-top{min-height:92px;display:flex;align-items:center;justify-content:space-between;gap:26px;padding:14px clamp(28px,4vw,66px);background:#fff;border-bottom:1px solid #dedfdc}',
'.phl-brand{display:flex;align-items:center;gap:12px}.phl-mark{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:#4e9db5;color:#fff;font-size:19px;font-weight:850}.phl-brand b{display:block;font-size:21px;letter-spacing:-.4px}.phl-brand small{display:block;margin-top:1px;color:#7e898e;font-size:10px;font-weight:800;letter-spacing:.16em}',
'.phl-top nav{display:flex;align-items:center}.phl-top nav>button,.phl-meta{min-height:58px;display:flex;align-items:center;gap:10px;padding:0 16px;border:0;border-left:1px solid #e2e3e0;background:transparent;color:#263b49;text-align:left}.phl-top nav>button{cursor:pointer}.phl-top nav>button:hover,.phl-top nav>button:focus-visible{background:#f3f4f2;outline:0}.phl-top nav>*:first-child{border-left:0}.phl-top nav b{font-size:13px;white-space:nowrap}.phl-top nav small{display:block;margin-top:2px;font-size:10px;color:#78858a;white-space:nowrap}',
'.phl-top-icon{width:36px;height:36px;min-width:36px;display:grid;place-items:center}.phl-top-icon>svg:not(.phl-gmail){width:25px;height:25px;fill:none;stroke:#315e72;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.phl-gmail{width:27px;height:21px}.phl-meta{min-width:178px}.phl-meta b{font-size:19px!important}.phl-meta:last-child{min-width:158px}',
'.phl-shell main{width:min(1500px,calc(100% - 72px));margin:0 auto;padding:54px 0 48px}.phl-intro{text-align:center;margin-bottom:25px}.phl-intro h1{margin:0;font-size:44px;line-height:1.08;letter-spacing:-1.5px}.phl-intro p{margin:10px 0 0;font-size:15px;color:#6f7b80}',
'.phl-search{width:min(960px,100%);height:64px;margin:0 auto 38px;display:grid;grid-template-columns:28px minmax(0,1fr) auto 44px;align-items:center;gap:12px;padding:0 10px 0 20px;border:1px solid #d9dcda;border-radius:18px;background:#fff;box-shadow:0 5px 18px rgba(37,51,61,.035)}.phl-search>svg{width:24px;height:24px;fill:none;stroke:#376f86;stroke-width:1.8}.phl-search input{height:100%;min-width:0;border:0;outline:0;background:transparent;font-size:16px;color:#213541}.phl-search input::placeholder{color:#9ba3a6}.phl-search kbd{border:1px solid #e1e3e1;border-radius:8px;background:#f6f7f5;padding:5px 7px;font:11px/1 sans-serif;color:#7b858a}.phl-search button{width:40px;height:40px;border:0;border-radius:12px;background:#f0f3f3;color:#315f75;display:grid;place-items:center;cursor:pointer}.phl-search button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:2}',
'.phl-main-grid{width:min(1180px,100%);margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.phl-main-card{min-height:158px;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto 1fr;gap:14px;padding:20px;border:1px solid #d9dcda;border-radius:18px;background:#fff;color:#1e3140;text-align:left;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}.phl-main-card:hover,.phl-main-card:focus-visible{transform:translateY(-2px);border-color:#a9c7d1;box-shadow:0 10px 24px rgba(35,54,65,.065);outline:0}',
'.phl-card-icon{width:46px;height:46px;display:grid;place-items:center;border:1px solid #e1e4e2;border-radius:13px;background:#f8f9f7;color:#367991}.phl-card-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.phl-main-copy{align-self:end}.phl-main-copy b{display:block;font-size:19px;line-height:1.18;letter-spacing:-.35px}.phl-main-copy small{display:block;margin-top:6px;color:#6f7d82;font-size:11.5px;line-height:1.4}.phl-main-card>i{align-self:start;width:32px;height:32px;display:grid;place-items:center;border:1px solid #e0e3e1;border-radius:50%;color:#315e72}.phl-main-card>i svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}',
'.phl-secondary{width:min(1180px,100%);margin:24px auto 0;padding-top:15px;border-top:1px solid #d9dcda}.phl-secondary h2{margin:0 0 9px;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:#7d898e}.phl-secondary>div{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.phl-small-card{min-height:64px;display:grid;grid-template-columns:34px minmax(0,1fr) 14px;align-items:center;gap:8px;padding:9px 10px;border:1px solid #dfe1df;border-radius:13px;background:#fff;color:#263a48;text-align:left;cursor:pointer;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.phl-small-card:hover,.phl-small-card:focus-visible{transform:translateY(-2px);border-color:#aec8d0;box-shadow:0 9px 19px rgba(35,54,65,.065);outline:0}.phl-small-card .phl-card-icon{width:34px;height:34px;border-radius:10px}.phl-small-card .phl-card-icon svg{width:18px;height:18px}.phl-small-card b{display:block;font-size:12px;line-height:1.18}.phl-small-card small{display:none}.phl-small-card>i{color:#6f858e}.phl-small-card>i svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2}.phl-small-card[data-open="projects"] .phl-card-icon{background:#edf4fa;border-color:#d2e1eb;color:#477a9a}.phl-small-card[data-open="partners"] .phl-card-icon{background:#eef7f4;border-color:#d4e6df;color:#4f8277}.phl-small-card[data-open="finance"] .phl-card-icon{background:#f1f7ee;border-color:#dbe8d6;color:#66835d}.phl-small-card[data-open="currency"] .phl-card-icon{background:#fbf6e9;border-color:#ece0bc;color:#987a3c}.phl-small-card[data-open="steel"] .phl-card-icon{background:#f0f3f6;border-color:#dbe0e6;color:#697b8d}.phl-small-card[data-open="events"] .phl-card-icon{background:#f4f0f7;border-color:#e1d7e8;color:#78678b}',
'.pef-page{min-height:100vh;background:#f5f7f7;padding:20px 24px 44px;color:#2a383e}.pef-head{max-width:1380px;margin:0 auto 16px;display:grid;grid-template-columns:auto minmax(0,1fr);gap:16px;align-items:center}.pef-command-head{grid-template-columns:auto minmax(0,1fr) auto}.pef-back{height:38px;border:1px solid #4f97af;border-radius:10px;background:#4f97af;color:#fff;padding:0 14px;font-weight:750;cursor:pointer}.pef-head>div>span{font-size:9px;letter-spacing:.12em;color:#85949a;font-weight:800}.pef-head h1{margin:3px 0 0;font-size:27px;color:#26363d;letter-spacing:-.3px}.pef-head p{margin:5px 0 0;color:#7d898e;font-size:11.5px}.pef-status-pill{padding:7px 11px;border-radius:999px;background:#f1ecfa;color:#735f8d;font-size:10px;font-weight:800;white-space:nowrap}.pef-list,.pef-detail,.pef-tabs{max-width:1380px;margin-left:auto;margin-right:auto}.pef-list h2,.pef-box h2{margin:0 0 10px;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:#617680}.pef-event-card{width:min(560px,100%);min-height:96px;display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:12px;align-items:center;padding:15px 16px;border:1px solid #d9e1e4;border-radius:14px;background:#fff;color:#2a383e;text-align:left;cursor:pointer;box-shadow:0 7px 18px rgba(39,60,71,.04);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}.pef-event-card:hover,.pef-event-card:focus-visible{transform:translateY(-2px);border-color:#9fbfc9;box-shadow:0 10px 24px rgba(39,60,71,.08);outline:0}.pef-event-card .phl-card-icon{width:42px;height:42px;border-radius:11px;background:#f4f0f7;border-color:#e1d7e8;color:#78678b}.pef-event-copy small{display:block;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6f8d78}.pef-event-copy b{display:block;margin-top:5px;font-size:15px;color:#31536a}.pef-event-copy em{display:block;margin-top:5px;font-style:normal;font-size:10.5px;color:#7b8a90}.pef-event-open{font-size:10px;font-weight:800;color:#4f879d;white-space:nowrap}.pef-tabs{display:flex;gap:7px;margin-bottom:14px;overflow:auto;padding-bottom:2px}.pef-tabs button{height:38px;padding:0 14px;border:1px solid #d9e1e4;border-radius:10px;background:#fff;color:#385364;font-size:10.5px;font-weight:750;white-space:nowrap;cursor:pointer}.pef-tabs button.active{border-color:#8cc4d6;background:#eaf7fb;color:#217493}.pef-panel{display:none}.pef-panel.active{display:block}.pef-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-bottom:12px}.pef-kpi{min-height:88px;border:1px solid #dce4e7;border-radius:14px;background:#fff;padding:14px 15px;box-shadow:0 5px 14px rgba(39,60,71,.035)}.pef-kpi small{display:block;font-size:9px;font-weight:800;color:#536c78}.pef-kpi b{display:block;margin-top:7px;font-size:25px;line-height:1;color:#243b49}.pef-kpi em{display:block;margin-top:6px;font-style:normal;font-size:9.5px;color:#84939a}.pef-kpi.is-blue{background:#f4f9fc}.pef-kpi.is-green{background:#f3faf6}.pef-kpi.is-purple{background:#f8f5fb}.pef-kpi.is-amber{background:#fcf8ef}.pef-kpi.is-red{background:#fcf5f5}.pef-overview-grid{display:grid;grid-template-columns:1.08fr .92fr;gap:12px}.pef-overview-lower{margin-top:12px}.pef-box{border:1px solid #dce4e7;border-radius:14px;background:#fff;padding:16px;box-shadow:0 5px 14px rgba(39,60,71,.025)}.pef-box-intro{margin:-2px 0 10px;color:#7b8c93;font-size:10.5px;line-height:1.45}.pef-action-list{display:grid}.pef-action{display:grid;grid-template-columns:22px minmax(0,1fr);gap:10px;align-items:start;padding:10px 0;border-bottom:1px solid #edf0f1}.pef-action:last-child{border-bottom:0}.pef-check{width:18px;height:18px;border:1px solid #cddadd;border-radius:5px;display:grid;place-items:center;color:#c18328;font-size:10px;font-weight:900;background:#fafcfc}.pef-action b{display:block;font-size:11.5px;color:#294453}.pef-action small{display:block;margin-top:3px;font-size:9.5px;color:#819096}.pef-session-list>div{display:grid;grid-template-columns:126px minmax(0,1fr);gap:10px;padding:9px 0;border-bottom:1px solid #edf0f1}.pef-session-list>div:last-child{border-bottom:0}.pef-session-list small{font-size:9.5px;color:#78909b}.pef-session-list b{font-size:10.5px;color:#304d5d}.pef-opps{display:grid;gap:8px}.pef-opps>div{padding:10px 12px;border-radius:10px;background:#f7fafb;border:1px solid #e2e8ea;font-size:10.5px;font-weight:700;color:#355667}.pef-company-toolbar{display:grid;grid-template-columns:minmax(240px,1fr) 190px 180px;gap:8px;margin-bottom:10px}.pef-company-toolbar input,.pef-company-toolbar select{height:38px;border:1px solid #d9e2e5;border-radius:10px;background:#fff;color:#385363;padding:0 11px;font-size:10.5px;outline:none}.pef-company-toolbar input:focus,.pef-company-toolbar select:focus{border-color:#78aec0;box-shadow:0 0 0 2px rgba(79,151,175,.08)}.pef-company-grid{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:12px;align-items:start}.pef-company-table,.pef-company-side{border:1px solid #dce4e7;border-radius:14px;background:#fff;overflow:hidden}.pef-company-head,.pef-company-row{display:grid;grid-template-columns:minmax(180px,1.25fr) minmax(130px,.85fr) minmax(110px,.7fr) 70px minmax(150px,1fr) 20px;gap:8px;align-items:center}.pef-company-head{padding:10px 12px;background:#f7f9fa;border-bottom:1px solid #e5eaec;color:#7b8e97;font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.pef-company-row{width:100%;padding:11px 12px;border:0;border-bottom:1px solid #edf0f1;background:#fff;color:#334e5d;text-align:left;cursor:pointer}.pef-company-row:last-child{border-bottom:0}.pef-company-row:hover,.pef-company-row:focus-visible{background:#f8fbfc;outline:0}.pef-company-row>span:first-child b{display:block;font-size:11px;color:#2b4655}.pef-company-row>span:first-child small{display:block;margin-top:2px;font-size:9px;color:#87959a}.pef-company-row>span:nth-child(5){font-size:9.5px}.pef-company-row i{font-style:normal;font-size:18px;color:#70a1b2}.pef-badge{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:5px 7px;border-radius:999px;font-size:8.5px;font-weight:800;line-height:1.1}.pef-badge.is-good{background:#e9f7ee;color:#3f7e58}.pef-badge.is-bad{background:#fceaea;color:#ad4a4a}.pef-badge.is-warn{background:#fbf3df;color:#9a7328}.pef-badge.is-purple{background:#f0ebf8;color:#735f8e}.pef-badge.is-neutral{background:#eef2f4;color:#74858c}.pef-priority{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:9px;font-weight:900}.pef-priority.is-a{background:#fde7e7;color:#c84d4d}.pef-priority.is-b{background:#fcf1dc;color:#a77425}.pef-priority.is-c{background:#eef2f4;color:#71838c}.pef-company-side{position:sticky;top:12px;padding:15px}.pef-company-detail-head>small{font-size:8.5px;letter-spacing:.08em;color:#7e9098;font-weight:800}.pef-company-detail-head h3{margin:5px 0 8px;font-size:18px;color:#294756}.pef-company-detail-head>div{display:flex;gap:5px;flex-wrap:wrap}.pef-company-dl{display:grid;grid-template-columns:105px minmax(0,1fr);gap:8px 10px;margin:15px 0 0;padding-top:14px;border-top:1px solid #edf0f1}.pef-company-dl dt{font-size:8.5px;font-weight:800;color:#6f828b}.pef-company-dl dd{margin:0;font-size:9.5px;line-height:1.42;color:#3c5663}.pef-company-dl dd b{display:block}.pef-company-dl dd small{display:block;margin-top:2px;color:#86949a}.pef-company-notes{margin-top:14px;display:grid;gap:8px}.pef-company-notes>div{padding:10px 11px;border-radius:10px;background:#f7f9fa}.pef-company-notes>div.is-next{background:#edf7fa;border:1px solid #d5e7ed}.pef-company-notes small{font-size:8px;font-weight:850;letter-spacing:.06em;text-transform:uppercase;color:#71858e}.pef-company-notes p{margin:4px 0 0;font-size:9.5px;line-height:1.48;color:#3d5967}.pef-doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.pef-doc-wide{grid-column:1/-1}.pef-doc-link{display:block;padding:11px 0;border-bottom:1px solid #edf0f1;text-decoration:none;color:#335364}.pef-doc-link:last-child{border-bottom:0}.pef-doc-link b{display:block;font-size:11px}.pef-doc-link small{display:block;margin-top:3px;font-size:9.5px;color:#86949a}.pef-doc-link:not(.is-static):hover b{text-decoration:underline}.pef-activity-row{display:grid;grid-template-columns:10px minmax(0,1fr);gap:10px;padding:10px 0;border-bottom:1px solid #edf0f1}.pef-activity-row:last-child{border-bottom:0}.pef-activity-row[role=button]{cursor:pointer}.pef-activity-row[role=button]:hover{background:#f8fbfc}.pef-activity-dot{width:8px;height:8px;margin-top:5px;border-radius:50%;background:#5ca0b7}.pef-activity-copy small{display:block;font-size:8px;letter-spacing:.08em;text-transform:uppercase;color:#7b9099}.pef-activity-copy b{display:block;margin-top:3px;font-size:10.5px;color:#314c58}.pef-activity-copy em{display:block;margin-top:3px;font-style:normal;font-size:9px;color:#8a969a}.pef-empty{padding:18px 4px;color:#819096;font-size:10.5px}.pef-after-grid{display:grid;grid-template-columns:minmax(0,780px);gap:12px}.pef-after-items{display:grid;gap:8px}.pef-after-items>div{padding:11px 12px;border:1px solid #e3e8ea;border-radius:10px;background:#f8fafb}.pef-after-items b{display:block;font-size:10.5px;color:#344f5e}.pef-after-items small{display:block;margin-top:3px;font-size:9.5px;color:#819096}',
'.phl-modal-bg{position:fixed;inset:0;z-index:2147482000;display:grid;place-items:center;padding:24px;background:rgba(18,29,36,.24);backdrop-filter:blur(8px)}.phl-modal{width:min(640px,96vw);max-height:86vh;overflow:auto;border:1px solid #d9dcda;border-radius:22px;background:#fff;box-shadow:0 28px 80px rgba(22,37,47,.2)}.phl-modal>header{display:flex;justify-content:space-between;gap:20px;padding:22px 24px;border-bottom:1px solid #e5e6e4}.phl-modal h2{margin:0;font-size:23px}.phl-modal p{margin:5px 0 0;color:#79858a;font-size:11px;line-height:1.45}.phl-modal header button{width:36px;height:36px;border:1px solid #e1e3e1;border-radius:50%;background:#fff;color:#53676f;cursor:pointer}.phl-modal header button svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8}.phl-modal-body{padding:22px 24px}.phl-state{padding:26px;text-align:center;color:#7b878b;font-size:12px}',
'.phl-calc{max-width:360px;margin:auto}.phl-calc input{width:100%;height:64px;border:1px solid #dde0de;border-radius:14px;padding:0 16px;text-align:right;font-size:28px;background:#fafaf8}.phl-calc>div{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.phl-calc button{height:50px;border:1px solid #e0e2df;border-radius:12px;background:#fff;font-size:16px;color:#2d4552;cursor:pointer}.phl-calc button:hover{background:#f4f6f5}',
'.phl-rate-top{display:flex;justify-content:space-between;margin-bottom:12px}.phl-rate-top b{font-size:18px}.phl-rate-top span{font-size:10px;color:#859095}.phl-rates{display:grid;grid-template-columns:repeat(2,1fr);border:1px solid #e0e3e1;border-radius:14px;overflow:hidden}.phl-rates>div{padding:16px;border-right:1px solid #e7e8e6;border-bottom:1px solid #e7e8e6}.phl-rates>div:nth-child(2n){border-right:0}.phl-rates>div:nth-last-child(-n+2){border-bottom:0}.phl-rates span{font-size:10px;color:#7f8b90}.phl-rates b{display:block;margin-top:4px;font-size:20px}.phl-prices{border:1px solid #e1e3e1;border-radius:14px;overflow:hidden}.phl-prices>div{display:grid;grid-template-columns:minmax(0,1fr) auto 88px;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #e8e9e7}.phl-prices>div:last-child{border-bottom:0}.phl-prices b{font-size:12px}.phl-prices small{display:block;margin-top:3px;color:#849095;font-size:9.5px}.phl-prices strong{font-size:13px;color:#2f667b}.phl-prices em{font-style:normal;font-size:9.5px;color:#8a9498;text-align:right}',
'@media(max-width:1260px){.phl-top{align-items:flex-start}.phl-top nav{flex-wrap:wrap;justify-content:flex-end}.phl-top nav>button,.phl-meta{min-height:52px;padding:0 12px}.phl-main-grid{grid-template-columns:repeat(2,1fr)}}',
'@media(max-width:760px){.phl-top{display:block;padding:14px 16px}.phl-top nav{margin-top:12px;display:grid;grid-template-columns:repeat(2,1fr)}.phl-top nav>*{border-left:0!important;border-top:1px solid #e4e5e3!important}.phl-shell main{width:calc(100% - 24px);padding:30px 0 90px}.phl-intro h1{font-size:32px}.phl-search{height:58px;grid-template-columns:24px 1fr 40px}.phl-search kbd{display:none}.phl-main-grid,.phl-secondary>div{grid-template-columns:1fr}.phl-main-card{min-height:142px}.phl-small-card{min-height:82px}.pef-page{padding:18px 14px 36px}.pef-head,.pef-command-head{grid-template-columns:1fr}.pef-back{width:max-content}.pef-status-pill{width:max-content}.pef-event-card{grid-template-columns:40px minmax(0,1fr)}.pef-event-open{grid-column:2}.pef-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.pef-overview-grid,.pef-company-grid,.pef-doc-grid{grid-template-columns:1fr}.pef-company-toolbar{grid-template-columns:1fr}.pef-company-head{display:none}.pef-company-row{grid-template-columns:1fr auto}.pef-company-row>span:nth-child(3),.pef-company-row>span:nth-child(4),.pef-company-row>span:nth-child(5){display:none}.pef-company-side{position:static}.pef-session-list>div{grid-template-columns:1fr}.pef-doc-wide{grid-column:auto}}'
 ].join('');
 document.head.appendChild(s);
}
function bind(r){
 if(r.dataset.bound==='1')return;r.dataset.bound='1';
 r.addEventListener('click',function(e){
  if(e.target.closest('[data-gmail]'))return void openGmail();
  var t=e.target.closest('[data-tool]');if(t&&t.dataset.tool==='calc')return void calculator();
  if(e.target.closest('[data-weather-refresh]'))return void weather(true);
  var o=e.target.closest('[data-open]');if(!o)return;var k=o.dataset.open;if(k==='currency')currency();else if(k==='steel')steel();else route(k);
 });
 var f=r.querySelector('[data-search-form]');if(f)f.onsubmit=function(e){e.preventDefault();var i=r.querySelector('[data-search]');search(i&&i.value||'')};
}
function watchHome(page){
 if(homeObserver||!window.MutationObserver||!page)return;
 homeObserver=new MutationObserver(function(){
  if(!active())return;
  var r=document.getElementById('pst-home-launcher-v4');
  if(r&&r.parentNode===page){
   if(page.firstChild!==r)page.insertBefore(r,page.firstChild||null);
   return;
  }
  if(repairQueued)return;repairQueued=true;
  (window.requestAnimationFrame||function(fn){return setTimeout(fn,0)})(function(){repairQueued=false;mount()});
 });
 homeObserver.observe(page,{childList:true});
}
function mount(){
 css();
 var page=document.getElementById('page-workspace-home');
 if(!page){
  if(!discoveryObserver&&window.MutationObserver&&document.body){
   discoveryObserver=new MutationObserver(function(){if(document.getElementById('page-workspace-home'))mount()});
   discoveryObserver.observe(document.body,{subtree:true,childList:true});
  }
  return false;
 }
 if(discoveryObserver){discoveryObserver.disconnect();discoveryObserver=null;}
 watchHome(page);watchShell(page);
 if(!active()){homeShell(false);return false}
 homeShell(true);
 try{var n=nav();if(n&&typeof n.syncSidebar==='function')n.syncSidebar('home')}catch(e){}
 homeShell(true);
 var r=document.getElementById('pst-home-launcher-v4');
 if(!r){r=document.createElement('section');r.id='pst-home-launcher-v4';page.insertBefore(r,page.firstChild||null)}
 else if(r.parentNode!==page)page.insertBefore(r,page.firstChild||null);
 if(r.dataset.v!==V){r.dataset.v=V;r.innerHTML=html()}
 if(r.hidden)r.hidden=false;
 if(r.hasAttribute('aria-hidden'))r.removeAttribute('aria-hidden');
 if(r.hasAttribute('data-pst-retired-home-owner'))r.removeAttribute('data-pst-retired-home-owner');
 if(r.style.display==='none')r.style.removeProperty('display');
 page.dataset.pstHomeVisualOwner='launcher-v4';
 bind(r);clock();weather(false);return true;
}
function schedule(){if(mountQueued)return;mountQueued=true;(window.requestAnimationFrame||function(f){return setTimeout(f,0)})(function(){mountQueued=false;mount()})}
document.addEventListener('pst:home-canonical-rendered',schedule);
document.addEventListener('pst:native-home-ready',schedule);
document.addEventListener('pst:page-opened',schedule);
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('pst:modules-ready',function(){if(pendingRoute){var k=pendingRoute;pendingRoute='';route(k);}}, {once:true});
window.addEventListener('pageshow',schedule);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
window.PSTHomeLauncherV5=window.PSTHomeLauncherV4={version:V,render:mount,openModule:route,openSearch:search};
})();
