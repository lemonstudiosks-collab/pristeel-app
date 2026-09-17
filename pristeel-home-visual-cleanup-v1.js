/* PRISTEEL Home visual cleanup v3
 * Presentation-only Home launchpad, sidebarless primary shell and technical catalog surface.
 * Keeps live PPPP search, canonical navigation and existing create workflows intact.
 * No business-data writes or auth changes.
 */
(function(){
'use strict';
if(window.__pstHomeVisualCleanupV3)return;
window.__pstHomeVisualCleanupV3=true;
window.__pstHomeVisualCleanupV2=true;
window.__pstHomeVisualCleanupV1=true;
var settlePromise=null,visualSignaled=false;

function icon(name){
 var p={
  opportunities:'<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  projects:'<rect x="3" y="6" width="18" height="14" rx="2.5"/><path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h5A1.5 1.5 0 0 1 16 4.5V6"/>',
  partners:'<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.2-4.3 2.2-6.7 5.5-6.7s5.3 2.4 5.5 6.7M16 8h5M18.5 5.5v5"/>',
  finance:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3.5 10h17M7 14h5"/>',
  tasks:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 2.5 2.5L16.5 8"/>',
  catalog:'<path d="M5 4h6a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 1z"/><path d="M19 4h-5a3 3 0 0 0-3 3v13h5a3 3 0 0 1 3 1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="m9 6 6 6-6 6"/>',
  back:'<path d="m15 6-6 6 6 6"/>',
  calc:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2"/>'
 }[name]||'';
 return '<svg viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function homeActive(){var p=document.getElementById('page-workspace-home');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function route(area){
 var P=window.PSTPrimaryNavResilienceV1||{};
 try{
  if(area==='opportunities'){if(typeof P.openOpportunities==='function')return P.openOpportunities();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('tenders');}
  if(area==='projects'){if(typeof P.openProjects==='function')return P.openProjects();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('projects');}
  if(area==='partners'){if(typeof P.openPartners==='function')return P.openPartners();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('contacts');}
  if(area==='finance'){if(typeof P.openFinance==='function')return P.openFinance();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('finance');}
  if(area==='tasks'){
   if(typeof window.pstWsLegacy==='function')return window.pstWsLegacy('qendra');
   var L=window.__pstWorkspaceLegacy;if(L&&typeof L.showPage==='function')return L.showPage('qendra');
   if(typeof window.showPage==='function')return window.showPage('qendra');
  }
 }catch(e){console.warn('PPPP Home route:',area,e);}
 return false;
}
function openHome(){var P=window.PSTPrimaryNavResilienceV1||{};if(typeof P.openHome==='function')return P.openHome();if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('home');return false;}
function createItem(kind){
 try{if(typeof window.pstWsCreate==='function'){window.pstWsCreate(kind);return true;}}catch(e){console.warn('PPPP create:',kind,e);}
 return false;
}
function toggleCreate(force){var menu=document.getElementById('pst-launch-create-menu');if(!menu)return;var open=typeof force==='boolean'?force:menu.hidden;menu.hidden=!open;var btn=document.getElementById('pst-launch-create');if(btn)btn.setAttribute('aria-expanded',open?'true':'false');}

function css(){
  var old=document.getElementById('pst-home-visual-cleanup-v1-css');if(old)old.remove();
  var old2=document.getElementById('pst-home-visual-cleanup-v2-css');if(old2)old2.remove();
  if(document.getElementById('pst-home-visual-cleanup-v3-css'))return;
  var s=document.createElement('style');
  s.id='pst-home-visual-cleanup-v3-css';
  s.textContent=`
/* Match the final sidebarless shell from first paint to avoid a visible rail flash. */
body:has(.page.active) .app-shell{display:flex!important;width:100%!important;min-width:0!important;margin:0!important;padding:0!important}
body:has(.page.active) .app-shell>.sidebar{display:none!important;flex:0 0 0!important;width:0!important;min-width:0!important;max-width:0!important}
body:has(.page.active) .main{flex:1 1 auto!important;min-width:0!important;width:100%!important;margin:0!important;border-left:0!important}
body:has(.page.active) .content{min-width:0!important;width:100%!important;margin-left:0!important}

/* The legacy project/import bars are redundant on the modern primary surfaces. */
body:has(:is(#page-workspace-home,#page-workspace-projects,#page-workspace-inbox,#page-workspace-commercial,#page-workspace-apps,#page-workspace-project,#page-finance,#page-contacts,#page-technical-catalog).active) .topbar,
body:has(:is(#page-workspace-home,#page-workspace-projects,#page-workspace-inbox,#page-workspace-commercial,#page-workspace-apps,#page-workspace-project,#page-finance,#page-contacts,#page-technical-catalog).active) #modbar{display:none!important}

/* Home fills the content area without changing width after startup. */
body:has(#page-workspace-home.active) .main,
body:has(#page-workspace-home.active) .content{width:auto!important;max-width:none!important;padding:0!important;margin:0!important;border:0!important}
body:has(#page-workspace-home.active) #page-workspace-home{width:100%!important;max-width:none!important;margin:0!important;padding:0!important}

body:has(#page-workspace-projects.active) .content,
body:has(#page-workspace-inbox.active) .content,
body:has(#page-workspace-commercial.active) .content,
body:has(#page-workspace-apps.active) .content,
body:has(#page-workspace-project.active) .content,
body:has(#page-finance.active) .content,
body:has(#page-contacts.active) .content,
body:has(#page-technical-catalog.active) .content{padding-top:14px!important}

/* Retire the dense operational dashboard only on Home; its data/services remain mounted. */
#pst-native-home-v4.pst-home-launchpad-ready{max-width:none!important;padding:0!important;margin:0!important}
#pst-native-home-v4.pst-home-launchpad-ready>:not(#pst-home-launchpad-v1){display:none!important}
#pst-home-launchpad-v1{min-height:100vh;padding:34px clamp(24px,4vw,70px) 54px;background:#F7F6F3;color:#2F3437;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
#pst-home-launchpad-v1 *{box-sizing:border-box}
.pst-launch-wrap{width:min(1260px,100%);margin:0 auto}
.pst-launch-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:24px}
.pst-launch-brand{display:flex;align-items:center;gap:12px}.pst-launch-mark{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:#4F97AF;color:#fff;font-weight:800;font-size:12px;letter-spacing:.04em}.pst-launch-brand b{display:block;font-size:15px;font-weight:650;letter-spacing:-.1px}.pst-launch-brand span{display:block;margin-top:2px;font-size:11px;color:#8B9396}
.pst-launch-create-wrap{position:relative}.pst-launch-create{height:42px;display:inline-flex;align-items:center;gap:8px;padding:0 15px;border:1px solid #4F97AF;border-radius:11px;background:#4F97AF;color:#fff;font-size:12px;font-weight:750;cursor:pointer;box-shadow:none}.pst-launch-create:hover{background:#3F7F98;border-color:#3F7F98}.pst-launch-create svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.pst-launch-create-menu{position:absolute;z-index:30;right:0;top:48px;width:210px;padding:6px;border:1px solid #E1E4E3;border-radius:12px;background:#fff;box-shadow:0 18px 46px rgba(38,50,55,.14)}.pst-launch-create-menu[hidden]{display:none}.pst-launch-create-menu button{width:100%;height:38px;border:0;border-radius:8px;background:#fff;color:#4E5B61;display:flex;align-items:center;justify-content:space-between;padding:0 10px;font-size:12px;font-weight:650;cursor:pointer}.pst-launch-create-menu button:hover{background:#F1F6F7;color:#3F7F98}.pst-launch-create-menu button span:last-child{color:#A0A8AB}
.pst-launch-ask-card{padding:22px;border:1px solid #E1E4E3;border-radius:18px;background:#FCFCFA;box-shadow:0 10px 34px rgba(48,58,62,.045);margin-bottom:22px}.pst-launch-ask-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:12px}.pst-launch-ask-head span{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;color:#839096}.pst-launch-ask-head h1{margin:3px 0 0;font-size:25px;line-height:1.15;font-weight:620;letter-spacing:-.45px;color:#2F3A3F}.pst-launch-ask-head p{margin:4px 0 0;font-size:12px;color:#879195}.pst-launch-ask-head small{font-size:10px;color:#99A1A4;white-space:nowrap}
html.pst-native-ui-v4-ready body #pst-native-home-v4 #pst-home-launchpad-v1 .pst-launch-ask-slot{min-height:96px!important;margin:0!important;padding:0!important;overflow:visible!important}
html.pst-native-ui-v4-ready body #pst-native-home-v4 #pst-home-launchpad-v1 .pst-live-command-shell{min-height:96px!important;margin:0!important;border:1px solid #D7E1E4!important;border-radius:15px!important;background:#F5F7F5!important;box-shadow:none!important}
html.pst-native-ui-v4-ready body #pst-native-home-v4 #pst-home-launchpad-v1 .pst-live-command{min-height:94px!important;padding:10px!important;background:#F5F7F5!important;border-radius:14px!important}
html.pst-native-ui-v4-ready body #pst-native-home-v4 #pst-home-launchpad-v1 .pst-live-input{min-height:68px!important;height:68px!important;max-height:150px!important;font-size:16px!important;line-height:1.45!important;padding:14px 10px!important}
html.pst-native-ui-v4-ready body #pst-native-home-v4 #pst-home-launchpad-v1 .pst-live-send{width:50px!important;height:50px!important;min-width:50px!important;border-radius:12px!important}
.pst-launch-ask-wait{min-height:94px;display:flex;align-items:center;padding:0 18px;border:1px solid #D7E1E4;border-radius:15px;background:#F5F7F5;color:#899397;font-size:12px}
.pst-launch-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:13px}.pst-launch-card{position:relative;min-height:154px;padding:18px;border:1px solid #E3E3DF;border-radius:15px;background:#FCFCFA;color:#2F3437;text-align:left;cursor:pointer;box-shadow:none;transition:border-color .16s ease,transform .16s ease,box-shadow .16s ease}.pst-launch-card:hover{transform:translateY(-2px);border-color:#C9DCE2;box-shadow:0 10px 28px rgba(48,70,77,.06)}.pst-launch-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:11px;background:#EEF5F6;color:#4F879A}.pst-launch-icon svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}.pst-launch-card h2{margin:16px 0 4px;font-size:15px;font-weight:650;letter-spacing:-.15px}.pst-launch-card p{margin:0;max-width:90%;font-size:11px;line-height:1.45;color:#8A9397}.pst-launch-arrow{position:absolute;right:17px;top:18px;color:#A1AAAD}.pst-launch-arrow svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}

/* Technical catalog is a separate destination, never a Home table. */
#page-technical-catalog{background:#F7F6F3!important;min-height:100vh;color:#2F3437}.pst-tech-page{max-width:1260px;margin:0 auto;padding:28px 30px 54px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pst-tech-head{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:18px}.pst-tech-head small{display:block;font-size:10px;font-weight:800;letter-spacing:.12em;color:#8B8170}.pst-tech-head h1{margin:4px 0 0;font-size:27px;letter-spacing:-.5px}.pst-tech-head p{margin:4px 0 0;color:#7C8488;font-size:12px}.pst-tech-back{height:38px;display:inline-flex;align-items:center;gap:7px;padding:0 12px;border:1px solid #D9E2E5;border-radius:10px;background:#FCFCFA;color:#59666B;font-size:11px;font-weight:700;cursor:pointer}.pst-tech-back svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pst-tech-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(360px,1.1fr);gap:16px}.pst-tech-card{border:1px solid #E3E3DF;border-radius:16px;background:#FCFCFA;overflow:hidden}.pst-tech-card>header{padding:16px 17px;border-bottom:1px solid #ECEAE6}.pst-tech-card>header span{font-size:9px;font-weight:800;letter-spacing:.12em;color:#8B8170}.pst-tech-card>header h2{font-size:16px;margin:4px 0 0}.pst-tech-card>header p{font-size:11px;line-height:1.45;color:#8A9397;margin:3px 0 0}.pst-tech-materials{display:grid;gap:0;padding:5px 14px 14px}.pst-tech-material{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:13px 3px;border-bottom:1px solid #F0EEEA}.pst-tech-material:last-child{border-bottom:0}.pst-tech-material b{display:block;font-size:12px}.pst-tech-material small{display:block;margin-top:3px;color:#8B9396;font-size:10px;line-height:1.4}.pst-tech-grade{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}.pst-tech-grade i{font-style:normal;padding:4px 7px;border-radius:999px;background:#F0F4F4;color:#62747B;font-size:9px;font-weight:750}.pst-tech-calc{padding:15px 17px 17px}.pst-tech-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.pst-tech-field{display:grid;gap:5px}.pst-tech-field.hidden{display:none}.pst-tech-field label{font-size:10px;font-weight:700;color:#68777D}.pst-tech-field input,.pst-tech-field select{width:100%;height:40px;border:1px solid #D9E2E5;border-radius:9px;background:#fff;color:#344046;padding:0 10px;font-size:12px;outline:none}.pst-tech-field input:focus,.pst-tech-field select:focus{border-color:#7DB3C3;box-shadow:0 0 0 3px rgba(79,151,175,.09)}.pst-tech-result{margin-top:13px;padding:15px;border-radius:12px;background:#EFF5F5;border:1px solid #DDE9EA;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.pst-tech-result span{font-size:10px;color:#708087}.pst-tech-result b{display:block;margin-top:2px;font-size:22px;letter-spacing:-.4px}.pst-tech-result strong{font-size:13px;color:#3F7F98}.pst-tech-note{margin-top:11px;font-size:9.5px;line-height:1.5;color:#8B9396}.pst-tech-calc-title{display:flex;align-items:center;gap:8px;margin-bottom:13px}.pst-tech-calc-title span{width:30px;height:30px;display:grid;place-items:center;border-radius:9px;background:#EEF5F6;color:#4F879A}.pst-tech-calc-title svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pst-tech-calc-title b{font-size:12px}
@media(max-width:900px){.pst-launch-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.pst-tech-grid{grid-template-columns:1fr}}
@media(max-width:620px){#pst-home-launchpad-v1{padding:22px 14px 38px}.pst-launch-top{align-items:flex-start}.pst-launch-brand span{display:none}.pst-launch-ask-card{padding:16px}.pst-launch-ask-head{display:block}.pst-launch-ask-head small{display:block;margin-top:8px}.pst-launch-grid{grid-template-columns:1fr}.pst-launch-card{min-height:126px}.pst-tech-page{padding:20px 14px 38px}.pst-tech-head{align-items:flex-start}.pst-tech-grid{grid-template-columns:1fr}.pst-tech-form{grid-template-columns:1fr}}
@media(max-width:800px){body:has(#page-workspace-projects.active) .content,body:has(#page-workspace-inbox.active) .content,body:has(#page-workspace-commercial.active) .content,body:has(#page-workspace-apps.active) .content,body:has(#page-workspace-project.active) .content,body:has(#page-finance.active) .content,body:has(#page-contacts.active) .content,body:has(#page-technical-catalog.active) .content{padding-top:10px!important}}
`;
  document.head.appendChild(s);
}

function launchCard(area,title,sub,ico){return '<button type="button" class="pst-launch-card" data-pst-launch-area="'+area+'"><span class="pst-launch-icon">'+icon(ico)+'</span><span class="pst-launch-arrow">'+icon('arrow')+'</span><h2>'+title+'</h2><p>'+sub+'</p></button>';}
function ensureLaunchpad(){
 var root=document.getElementById('pst-native-home-v4');if(!root)return false;
 var oldAsk=root.querySelector('#pn-ask');if(oldAsk&&!oldAsk.closest('#pst-home-launchpad-v1'))oldAsk.id='pn-ask-retired';
 var home=document.getElementById('pst-home-launchpad-v1');
 if(!home){
  home=document.createElement('section');home.id='pst-home-launchpad-v1';
  home.innerHTML='<div class="pst-launch-wrap"><div class="pst-launch-top"><div class="pst-launch-brand"><span class="pst-launch-mark">PPPP</span><span><b>PriSteel</b><span>Project & Procurement Platform</span></span></div><div class="pst-launch-create-wrap"><button type="button" id="pst-launch-create" class="pst-launch-create" aria-expanded="false">'+icon('plus')+'<span>Krijo+</span></button><div id="pst-launch-create-menu" class="pst-launch-create-menu" hidden><button type="button" data-pst-create="project"><span>Projekt i ri</span><span>→</span></button><button type="button" data-pst-create="offer"><span>Ofertë</span><span>→</span></button><button type="button" data-pst-create="invoice"><span>Faturë</span><span>→</span></button><button type="button" data-pst-create="task"><span>Detyrë</span><span>→</span></button></div></div></div><section class="pst-launch-ask-card"><div class="pst-launch-ask-head"><div><span>INTELIGJENCA E PLATFORMËS</span><h1>Pyet PPPP</h1><p>Pyet për një projekt, kompani, ofertë, furnitor ose situatë operative.</p></div><small>Përgjigje nga të dhënat aktuale</small></div><div class="pn-ask-slot pst-launch-ask-slot" id="pn-ask"><div class="pst-launch-ask-wait">Pyet PPPP po përgatitet…</div></div></section><section class="pst-launch-grid" aria-label="Zonat kryesore">'+launchCard('opportunities','Mundësitë','Tenderë, lead-e dhe mundësi që kërkojnë vlerësim.','opportunities')+launchCard('projects','Projektet','Projektet aktive, në pritje dhe në realizim.','projects')+launchCard('partners','Partnerët','Klientë, furnitorë, prodhues dhe kontaktet e tyre.','partners')+launchCard('finance','Financat','Fatura, arkëtime, pagesa dhe ekspozimi financiar.','finance')+launchCard('tasks','Detyrat','Veprimet dhe detyrat që kërkojnë vëmendjen tënde.','tasks')+launchCard('catalog','Katalogu teknik','Materiale bazë dhe kalkulator i peshës së çelikut.','catalog')+'</section></div>';
  root.insertBefore(home,root.firstChild);
  home.addEventListener('click',function(e){
   var create=e.target.closest('[data-pst-create]');if(create){e.preventDefault();toggleCreate(false);createItem(create.getAttribute('data-pst-create'));return;}
   var add=e.target.closest('#pst-launch-create');if(add){e.preventDefault();toggleCreate();return;}
   var card=e.target.closest('[data-pst-launch-area]');if(!card)return;var area=card.getAttribute('data-pst-launch-area');if(area==='catalog')openCatalog();else route(area);
  });
 }
 root.classList.add('pst-home-launchpad-ready');
 var slot=home.querySelector('#pn-ask'),shell=root.querySelector('.pst-live-command-shell');
 if(shell&&!home.contains(shell)){slot.innerHTML='';slot.appendChild(shell);shell.style.display='block';shell.style.visibility='visible';}
 return true;
}

function techMaterial(title,desc,grades){return '<div class="pst-tech-material"><span><b>'+title+'</b><small>'+desc+'</small></span><span class="pst-tech-grade">'+grades.map(function(g){return '<i>'+g+'</i>';}).join('')+'</span></div>';}
function ensureCatalogPage(){
 var page=document.getElementById('page-technical-catalog');if(page)return page;
 var host=document.querySelector('.content')||document.getElementById('app-shell-root')||document.body;
 page=document.createElement('div');page.id='page-technical-catalog';page.className='page';page.style.display='none';
 page.innerHTML='<div class="pst-tech-page"><header class="pst-tech-head"><div><small>MJETE TEKNIKE</small><h1>Katalogu teknik</h1><p>Referencë e shpejtë për materialet dhe peshën teorike të çelikut.</p></div><button type="button" class="pst-tech-back" id="pst-tech-back">'+icon('back')+'Ballina</button></header><div class="pst-tech-grid"><section class="pst-tech-card"><header><span>MATERIALET</span><h2>Materialet bazë të punës</h2><p>Grada të zakonshme për konstruksione dhe përpunim. Specifikimi përfundimtar varet nga projekti dhe EN standardi përkatës.</p></header><div class="pst-tech-materials">'+techMaterial('Llamarinë çeliku','Pllaka dhe fletë për prerje, baza, gusset plates dhe elemente të salduara.',['S235JR','S275JR','S355JR','S355J2'])+techMaterial('RHS / SHS','Profile tubulare drejtkëndore dhe katrore për korniza, shtylla dhe trarë sekondarë.',['S235JRH','S355J2H'])+techMaterial('IPE / HEA / HEB / UPN','Profile të nxehta për trarë, shtylla dhe skelete kryesore.',['S235JR','S355JR/J2'])+techMaterial('Flat bar / shufra','Shirita, shufra katrore dhe të rrumbullakëta për detaje dhe lidhje.',['S235JR','S355JR'])+'</div></section><section class="pst-tech-card"><header><span>KALKULATOR</span><h2>Pesha teorike e çelikut</h2><p>Llogaritje e shpejtë me dendësi 7,850 kg/m³.</p></header><div class="pst-tech-calc"><div class="pst-tech-calc-title"><span>'+icon('calc')+'</span><b>Zgjidh formën dhe dimensionet</b></div><div class="pst-tech-form"><div class="pst-tech-field"><label for="pst-tech-shape">Forma</label><select id="pst-tech-shape"><option value="plate">Llamarinë / flat bar</option><option value="round">Shufër e rrumbullakët</option><option value="square">Shufër katrore</option><option value="rhs">RHS / SHS</option></select></div><div class="pst-tech-field"><label for="pst-tech-qty">Sasia</label><input id="pst-tech-qty" type="number" min="1" step="1" value="1"></div><div class="pst-tech-field" id="pst-tech-field-a"><label id="pst-tech-label-a" for="pst-tech-a">Gjerësia (mm)</label><input id="pst-tech-a" type="number" min="0" step="0.1" value="1000"></div><div class="pst-tech-field hidden" id="pst-tech-field-b"><label id="pst-tech-label-b" for="pst-tech-b">Lartësia (mm)</label><input id="pst-tech-b" type="number" min="0" step="0.1" value="100"></div><div class="pst-tech-field" id="pst-tech-field-t"><label for="pst-tech-t">Trashësia (mm)</label><input id="pst-tech-t" type="number" min="0" step="0.1" value="10"></div><div class="pst-tech-field"><label for="pst-tech-l">Gjatësia për copë (m)</label><input id="pst-tech-l" type="number" min="0" step="0.01" value="1"></div></div><div class="pst-tech-result"><span><span>Pesha totale teorike</span><b id="pst-tech-kg">78.50 kg</b></span><strong id="pst-tech-ton">0.079 t</strong></div><div class="pst-tech-note">Për profilet RHS/SHS llogaritja është gjeometrike dhe nuk përfshin rrezet e qosheve apo tolerancat e prodhuesit. Për ofertë finale përdor tabelën EN / certifikatën e prodhuesit.</div></div></section></div></div>';
 host.appendChild(page);
 page.querySelector('#pst-tech-back').addEventListener('click',openHome);
 var ids=['pst-tech-shape','pst-tech-qty','pst-tech-a','pst-tech-b','pst-tech-t','pst-tech-l'];ids.forEach(function(id){var e=page.querySelector('#'+id);e.addEventListener('input',calculateTech);e.addEventListener('change',calculateTech);});
 calculateTech();return page;
}
function n(id){var e=document.getElementById(id),v=e?Number(e.value):0;return isFinite(v)&&v>0?v:0;}
function calculateTech(){
 var page=document.getElementById('page-technical-catalog');if(!page)return;var shape=(page.querySelector('#pst-tech-shape')||{}).value||'plate',a=n('pst-tech-a'),b=n('pst-tech-b'),t=n('pst-tech-t'),l=n('pst-tech-l'),qty=Math.max(1,Math.round(n('pst-tech-qty')||1)),kgm=0;
 var fa=page.querySelector('#pst-tech-field-a'),fb=page.querySelector('#pst-tech-field-b'),ft=page.querySelector('#pst-tech-field-t'),la=page.querySelector('#pst-tech-label-a');
 if(fa)fa.classList.remove('hidden');if(fb)fb.classList.toggle('hidden',shape!=='rhs');if(ft)ft.classList.toggle('hidden',shape==='round'||shape==='square');
 if(la)la.textContent=shape==='round'?'Diametri (mm)':shape==='square'?'Brinja (mm)':'Gjerësia (mm)';
 if(shape==='round')kgm=Math.PI*a*a/4*0.00785;
 else if(shape==='square')kgm=a*a*0.00785;
 else if(shape==='rhs'){var innerW=Math.max(0,a-2*t),innerH=Math.max(0,b-2*t);kgm=Math.max(0,a*b-innerW*innerH)*0.00785;}
 else kgm=a*t*0.00785;
 var kg=kgm*l*qty,kgEl=page.querySelector('#pst-tech-kg'),tonEl=page.querySelector('#pst-tech-ton');if(kgEl)kgEl.textContent=kg.toLocaleString('sq-AL',{minimumFractionDigits:2,maximumFractionDigits:2})+' kg';if(tonEl)tonEl.textContent=(kg/1000).toLocaleString('sq-AL',{minimumFractionDigits:3,maximumFractionDigits:3})+' t';
}
function openCatalog(){
 var page=ensureCatalogPage();document.querySelectorAll('.page').forEach(function(p){if(p!==page){p.classList.remove('active');p.style.display='none';}});page.hidden=false;page.removeAttribute('hidden');page.classList.add('active');page.style.display='block';toggleCreate(false);calculateTech();return true;
}
function apply(){css();ensureLaunchpad();ensureCatalogPage();return true;}
function safePromise(fn){try{return Promise.resolve(fn());}catch(e){return Promise.resolve(false);}}
function signalVisualReady(){
  if(visualSignaled)return;visualSignaled=true;
  if(window.__pstRuntimeRevealFallback){clearTimeout(window.__pstRuntimeRevealFallback);window.__pstRuntimeRevealFallback=null;}
  var reveal=function(){document.documentElement.classList.add('pst-runtime-ready');try{document.dispatchEvent(new CustomEvent('pst:visual-ready'));}catch(e){}};
  if(typeof requestAnimationFrame==='function')requestAnimationFrame(function(){requestAnimationFrame(reveal);});else setTimeout(reveal,0);
}
function revealStableHome(){
  if(settlePromise)return settlePromise;
  apply();
  settlePromise=Promise.resolve().then(function(){
    var H=window.PSTHomeCommandCenterV2;if(H&&typeof H.decorate==='function')H.decorate(false);
    var R=window.PSTHomeProjectRecoveryV3;return R&&typeof R.recover==='function'?safePromise(function(){return R.recover(true);}):true;
  }).then(function(){
    var S=window.PSTHomeStabilityV2;return S&&typeof S.apply==='function'?safePromise(function(){return S.apply(false);}):true;
  }).then(function(){
    var L=window.PSTHomeLiveFixV1;return L&&typeof L.apply==='function'?safePromise(function(){return L.apply();}):true;
  }).then(function(){
    try{var S=window.PSTHomeStabilityV2;if(S&&typeof S.enforce==='function')S.enforce();}catch(e){}
    try{var L=window.PSTHomeLiveFixV1;if(L&&typeof L.enforceLimits==='function')L.enforceLimits();}catch(e){}
    try{var R=window.PSTRedesignFinalizerV1;if(R&&typeof R.apply==='function')R.apply();}catch(e){}
    apply();signalVisualReady();return true;
  }).catch(function(){apply();signalVisualReady();return false;});
  return settlePromise;
}
function schedule(){apply();}
function scheduleFirstPaint(){setTimeout(revealStableHome,80);}
css();
document.addEventListener('pst:native-home-ready',function(){setTimeout(apply,0);setTimeout(apply,180);});
document.addEventListener('pst:home-canonical-rendered',function(){setTimeout(apply,0);});
document.addEventListener('pst:modules-ready',function(){schedule();scheduleFirstPaint();},{once:true});
document.addEventListener('click',function(e){if(!e.target.closest('.pst-launch-create-wrap'))toggleCreate(false);});
window.addEventListener('pageshow',schedule,{once:true});
if(window.__pstModulesReady)scheduleFirstPaint();
window.PSTHomeVisualCleanupV1=window.PSTHomeVisualCleanupV2=window.PSTHomeVisualCleanupV3={apply:apply,schedule:schedule,revealStableHome:revealStableHome,openCatalog:openCatalog,calculateTech:calculateTech,whenReady:function(){return settlePromise||revealStableHome();}};
})();
