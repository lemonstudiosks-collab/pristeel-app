/* PRISTEEL Workspace release fix v3
 * Restores authentic brand colors, reliable project loading and deterministic module routes.
 * No database writes are added here.
 */
(function(){
'use strict';
if(window.__pstWorkspaceReleaseFixV3Loaded)return;
window.__pstWorkspaceReleaseFixV3Loaded=true;

var BLUE='#5B9BB3',BLUE_DEEP='#3E7E96',BLUE_DARK='#326F87',BLUE_PALE='#EAF5F8';
var GREEN='#2F7657',GREEN_BG='#EAF5EF',RED='#A64B42',RED_BG='#F9ECEA',AMBER='#9B6A22',AMBER_BG='#FAF2E3';
var projectRows=[];
var originalGo=window.pstWorkspaceGo;
var originalDocOpen=window.pstOpenDocumentCenter;
var originalDocSelect=window.pstSelectDocumentType;
var originalCreate=window.pstWsCreate;

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function groupStatus(v){
 var s=norm(v);
 if(/arkiv|archiv/.test(s))return'archived';
 if(/shtyr|postpon|paused|on hold|pezull/.test(s))return'postponed';
 if(/humb|closedlost|cancel|refuz/.test(s))return'lost';
 if(/fituar|closedwon|realizuar|won/.test(s))return'won';
 return'active';
}
function activeProject(p){return groupStatus(p&&p.status)==='active'||groupStatus(p&&p.status)==='postponed';}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[id]||'Në pritje';}
function statusInfo(s){
 var g=groupStatus(s);
 if(g==='won')return{label:/realizuar/.test(norm(s))?'Realizuar':'Fituar',c:GREEN,bg:GREEN_BG};
 if(g==='lost')return{label:'Humbur',c:RED,bg:RED_BG};
 if(g==='postponed')return{label:'Shtyrë',c:AMBER,bg:AMBER_BG};
 if(g==='archived')return{label:'Arkivuar',c:'#66717A',bg:'#EEF2F5'};
 var n=norm(s);
 if(/ofert|negoci/.test(n))return{label:'Ofertim',c:AMBER,bg:AMBER_BG};
 return{label:n?n.charAt(0).toUpperCase()+n.slice(1):'Aktiv',c:BLUE_DEEP,bg:BLUE_PALE};
}

function addCss(){
 if(document.getElementById('pst-workspace-release-v3-css'))return;
 var s=document.createElement('style');s.id='pst-workspace-release-v3-css';s.textContent=`
:root{
 --pst-brand:${BLUE}!important;--pst-brand-dark:${BLUE_DARK}!important;--pst-brand-hover:${BLUE_DEEP}!important;--pst-brand-soft:${BLUE_PALE}!important;
 --bronze:${BLUE}!important;--bronze-light:#78B3C8!important;--bronze-dark:${BLUE_DARK}!important;--bronze-bg:${BLUE_PALE}!important;--bronze-text:${BLUE_DARK}!important;
 --copper:${BLUE}!important;--copper-bg:${BLUE_PALE}!important;--accent:${BLUE}!important;--accent-bg:${BLUE_PALE}!important
}
.pst-ws-mark,.pst-v2-brandmark,.pst-ws-create-main,.pst-ws-btn.primary,.pst-dc-new,.pst-dc-type.active,.btn-primary{
 background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 8px 20px rgba(62,126,150,.16)!important
}
.pst-ws-create-main:hover,.pst-ws-btn.primary:hover,.pst-dc-new:hover,.btn-primary:hover{
 background:linear-gradient(135deg,#5F9FB7,#36758E)!important
}
.pst-ws-navbtn.active,.pst-v2-navitem.active{background:${BLUE_PALE}!important;color:${BLUE_DARK}!important}
.pst-ws-app-icon{background:${BLUE_PALE}!important;color:${BLUE_DEEP}!important}
.pst-ws-link,.pst-panel-link{color:${BLUE_DEEP}!important}
.pst-ws-tab.active{color:${BLUE_DARK}!important;border-bottom-color:${BLUE}!important}
.pst-ws-quick button:hover,.pst-ws-app:hover,.pst-ws-rowaction:hover,.pst-ws-smart button:hover,.pst-ws-create-item:hover{
 background:${BLUE_PALE}!important;border-color:#BFDDE8!important;color:${BLUE_DARK}!important
}
.pst-ws-stage.done .pst-ws-stage-dot,.pst-ws-stage.current .pst-ws-stage-dot,.pst-ws-timeitem:before{
 background:${BLUE}!important;border-color:${BLUE}!important
}
.pst-ws-stage.done:after{background:${BLUE}!important}
.pst-ws-stage.current .pst-ws-stage-label{color:${BLUE_DARK}!important}
.pst-release-statusbar{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.pst-release-statusbtn{height:34px;border:1px solid #DDE7EB;background:#fff;border-radius:9px;padding:0 11px;color:#66717A;font-size:10px;font-weight:720;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.pst-release-statusbtn:hover,.pst-release-statusbtn.active{border-color:#BFDDE8;background:${BLUE_PALE};color:${BLUE_DARK}}
.pst-release-statuscount{min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:#EEF2F5;color:#77818A;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:780}
.pst-release-statusbtn.active .pst-release-statuscount{background:#fff;color:${BLUE_DARK}}
.pst-release-disabled{opacity:.52;cursor:not-allowed!important}
.pst-release-disabled:hover{transform:none!important;box-shadow:none!important}
`;
 document.head.appendChild(s);
 var mark=document.querySelector('.pst-ws-mark');
 if(mark)mark.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5c.9 6.4 4.1 9.6 10.5 10.5-6.4.9-9.6 4.1-10.5 10.5C11.1 16.1 7.9 12.9 1.5 12 7.9 11.1 11.1 7.9 12 1.5Z" fill="currentColor"/></svg>';
}

function setNav(key){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});}
function hideOtherPages(keep){document.querySelectorAll('.page').forEach(function(p){if(p!==keep){p.classList.remove('active');p.style.display='none';}});}
function showLegacy(page,navKey){
 var legacy=window.__pstWorkspaceLegacy||{};
 var fn=legacy.pstV2Go||legacy.showPage||window.pstV2Go||window.showPage;
 try{if(typeof fn==='function')fn.call(window,page);}catch(e){console.error('PRISTEEL route:',page,e);}
 var el=document.getElementById('page-'+page);
 if(!el){console.error('PRISTEEL page missing:',page);return false;}
 hideOtherPages(el);el.classList.add('active');el.style.display='block';
 if(typeof window.applyModuleChrome==='function'){try{window.applyModuleChrome(page);}catch(e){}}
 setNav(navKey||(page==='finance'?'finance':page==='contacts'?'contacts':'apps'));
 window.scrollTo({top:0,behavior:'auto'});return true;
}
window.pstWsLegacy=function(page){return showLegacy(page,page==='finance'?'finance':page==='contacts'?'contacts':'apps');};

async function fetchProjects(){
 var rows=[];
 if(typeof window.supaFetch==='function'){
  var paths=['projects?order=created_at.desc&limit=3000','projects?select=*&order=created_at.desc&limit=3000','projects?select=*&limit=3000'];
  for(var i=0;i<paths.length&&!rows.length;i++){
   try{rows=arr(await window.supaFetch(paths[i]));}
   catch(e){if(i===paths.length-1)console.error('PRISTEEL projects:',e);}
  }
 }
 if(!rows.length){
  [window.projects,window._projects,window.PST_PROJECTS].some(function(x){if(Array.isArray(x)&&x.length){rows=x;return true;}return false;});
 }
 return rows;
}
function ensurePage(id){var p=document.getElementById(id);if(p)return p;var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id=id;p.className='page';p.style.display='none';c.appendChild(p);return p;}
function activate(id){var p=ensurePage(id);if(!p)return null;hideOtherPages(p);p.classList.add('active');p.style.display='block';window.scrollTo({top:0,behavior:'auto'});return p;}

function counts(){
 var out={active:0,won:0,postponed:0,lost:0,archived:0,all:projectRows.length};
 projectRows.forEach(function(p){out[groupStatus(p.status)]++;});
 return out;
}
function projectStatusBar(selected){
 var labels={active:'Aktive',won:'Fituara',postponed:'Shtyra',lost:'Humbura',archived:'Arkivuara',all:'Të gjitha'},c=counts();
 return'<div class="pst-release-statusbar">'+['active','won','postponed','lost','archived','all'].map(function(k){
  return'<button type="button" class="pst-release-statusbtn'+(selected===k?' active':'')+'" data-release-filter="'+k+'">'+labels[k]+' <i class="pst-release-statuscount">'+c[k]+'</i></button>';
 }).join('')+'</div>';
}
async function renderProjects(){
 setNav('projects');var p=activate('page-workspace-projects');if(!p)return;
 p.innerHTML='<div class="pst-ws-page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Projektet</div><div class="pst-ws-title">Të gjitha projektet</div><div class="pst-ws-sub">Komunikimi, dokumentet, prokurimi dhe financat në të njëjtin kontekst</div></div><div class="pst-ws-actions"><button class="pst-ws-btn" onclick="pstWsLegacy(\'import\')">Pamja klasike</button><button class="pst-ws-btn primary" onclick="pstWsCreate(\'project\')">+ Projekt i ri</button></div></div><div id="pst-release-status-host"></div><div class="pst-ws-toolbar"><input class="pst-ws-input" id="pst-release-project-search" placeholder="Kërko projekt, klient ose referencë" oninput="pstReleaseRenderProjects()"></div><section class="pst-ws-card"><div class="pst-ws-card-body" id="pst-release-project-list"><div class="pst-ws-empty">Duke ngarkuar projektet…</div></div></section></div>';
 projectRows=await fetchProjects();
 window.__pstWorkspaceProjectRows=projectRows;
 var badge=document.getElementById('pst-ws-b-projects');
 if(badge){var n=projectRows.filter(activeProject).length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}
 window.__pstReleaseFilter='active';
 var host=document.getElementById('pst-release-status-host');
 if(host){host.innerHTML=projectStatusBar('active');host.addEventListener('click',function(e){var b=e.target.closest('[data-release-filter]');if(!b)return;window.__pstReleaseFilter=b.getAttribute('data-release-filter');window.pstReleaseRenderProjects();});}
 window.pstReleaseRenderProjects();
}
window.pstReleaseRenderProjects=function(){
 var h=document.getElementById('pst-release-project-list');if(!h)return;
 var text=String((document.getElementById('pst-release-project-search')||{}).value||'').toLowerCase().trim();
 var f=window.__pstReleaseFilter||'active';
 var list=projectRows.filter(function(p){var g=groupStatus(p.status),ok=f==='all'||g===f;return ok&&(!text||[p.name,p.client,p.ref,p.pipeline_stage].join(' ').toLowerCase().indexOf(text)>-1);});
 var host=document.getElementById('pst-release-status-host');if(host)host.innerHTML=projectStatusBar(f);
 h.innerHTML=list.length?'<table class="pst-ws-table"><thead><tr><th>Projekti</th><th>Faza</th><th>Statusi</th><th>Afati</th><th>Aktiviteti</th><th></th></tr></thead><tbody>'+list.map(function(p){
  var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);
  return'<tr onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><td><div class="pst-ws-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></td><td>'+esc(stageName(p.pipeline_stage))+'</td><td><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></td><td>'+dateText(p.deadline)+'</td><td>'+(a===null?'—':a===0?'Sot':'Para '+a+' ditësh')+'</td><td><button class="pst-ws-rowaction" onclick="event.stopPropagation();pstReleaseOpenProject(\''+esc(p.id)+'\')">Hap</button></td></tr>';
 }).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+(projectRows.length?'Nuk ka projekte që përputhen me filtrin.':'Projektet nuk u ngarkuan.')+'</div>';
};
window.pstReleaseOpenProject=function(id){
 if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);
 else if(typeof window.loadProject==='function')window.loadProject(id);
 else{var l=window.__pstWorkspaceLegacy||{};if(typeof l.openOverview==='function')l.openOverview(id);}
};

async function patchHomeProjects(){
 /* Home Canonical is the sole data owner. This compatibility layer may ask it
  * to refresh, but must never write #pst-ws-home-projects itself. */
 var owner=window.PSTHomeRuntimeOwnerGuardV6||window.PSTHomeRuntimeOwnerGuardV5||window.PSTHomeRuntimeOwnerGuardV4||window.PSTHomeRuntimeOwnerGuardV3||window.PSTHomeRuntimeOwnerGuardV2||window.PSTHomeRuntimeOwnerGuardV1;
 if(owner&&typeof owner.renderCanonical==='function')return owner.renderCanonical();
 if(window.PSTHomeCanonicalV1&&typeof window.PSTHomeCanonicalV1.render==='function')return window.PSTHomeCanonicalV1.render(true);
 return false;
}

function syncDocumentType(type){
 var D=window.PST_DOC_CENTER;if(!D||!D.labels||!D.labels[type])return;
 D.selectedType=type;
 document.querySelectorAll('.pst-dc-type').forEach(function(btn){var name=String(D.labels[type].name||'').trim().toLowerCase();btn.classList.toggle('active',btn.textContent.trim().toLowerCase()===name);});
 var f=document.getElementById('pst-dc-filter');if(f){f.value=type;if(typeof window.pstRenderDocumentList==='function')window.pstRenderDocumentList();}
 var title=document.querySelector('.pst-dc-toolbar-title');if(title)title.textContent=type==='offer'?'Ofertat':type==='invoice'?'Faturat':type==='credit_note'?'Notat kreditore':'Notat debitore';
}
window.pstSelectDocumentType=function(type){if(typeof originalDocSelect==='function')originalDocSelect(type);syncDocumentType(type);};
window.pstOpenDocumentCenter=function(type){var r=typeof originalDocOpen==='function'?originalDocOpen(type):undefined;setTimeout(function(){var D=window.PST_DOC_CENTER;syncDocumentType(type||(D&&D.selectedType)||'invoice');},120);return r;};
window.pstCloseDocumentCenter=function(){if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('commercial');else showLegacy('invoices','apps');};

function renameModules(){
 var btn=document.querySelector('.pst-ws-navbtn[data-key="apps"] span');if(btn&&btn.textContent.trim()!=='Modulet')btn.textContent='Modulet';
 var page=document.getElementById('page-workspace-apps');if(page&&page.classList.contains('active')){var eye=page.querySelector('.pst-ws-eyebrow'),title=page.querySelector('.pst-ws-title');if(eye)eye.textContent='Sistemi';if(title)title.textContent='Modulet & Integrimet';}
}
function patchModuleCards(){
 var map={
  'Prokurimi':function(){showLegacy('bom','apps');},
  'Detyrat':function(){showLegacy('qendra','apps');},
  'Outreach':function(){showLegacy('outreach','apps');},
  'Dokumentet':function(){window.pstOpenDocumentCenter('invoice');},
  'Project Discovery':function(){if(typeof window.pstProjectDiscoveryOpen==='function')window.pstProjectDiscoveryOpen();else if(typeof window.pstProjectDiscovery==='function')window.pstProjectDiscovery();else showLegacy('outreach','apps');},
  'Auditimi Gmail':function(){if(typeof window.pstGmailAuditRun==='function')window.pstGmailAuditRun();else showLegacy('outreach','apps');},
  'Kalkulatori':function(){showLegacy('kalkulator','apps');},
  'Cilësimet':function(){showLegacy('settings','apps');},
  'Kontratat':function(){showLegacy('contracts','apps');},
  'Skedarët':function(){showLegacy('library','apps');},
  'Pamja klasike':function(){showLegacy('qendra','apps');}
 };
 document.querySelectorAll('.pst-ws-app').forEach(function(card){
  var node=card.querySelector('.pst-ws-app-name'),name=node&&node.textContent&&node.textContent.trim();
  if(!name||card.__pstReleaseBound)return;
  if(map[name]){card.__pstReleaseBound=true;card.removeAttribute('onclick');card.addEventListener('click',map[name]);}
 });
}

window.pstWsCreate=function(type){
 var menu=document.getElementById('pst-ws-create');if(menu)menu.classList.remove('open');
 if(type==='project'){if(typeof window.newProject==='function')window.newProject();else showLegacy('newproject','projects');return;}
 if(type==='offer'||type==='invoice'){if(typeof window.pstOpenDocumentCenter==='function'){window.pstOpenDocumentCenter(type);setTimeout(function(){if(typeof window.pstCreateSelectedDocument==='function')window.pstCreateSelectedDocument();},80);}return;}
 if(type==='task'){showLegacy('qendra','apps');return;}
 if(typeof originalCreate==='function')originalCreate(type);
};
window.pstWsRefreshHome=function(e){if(e){e.preventDefault();e.stopPropagation();}if(typeof window.pstWorkspaceGo==='function')return window.pstWorkspaceGo('home');return patchHomeProjects();};
window.pstWorkspaceGo=function(key){
 if(key==='projects')return renderProjects();
 if(key==='finance')return showLegacy('finance','finance');
 if(key==='contacts')return showLegacy('contacts','contacts');
 if(key==='files')return showLegacy('library','files');
 var r=typeof originalGo==='function'?originalGo(key):undefined;
 if(key==='apps')setTimeout(function(){renameModules();patchModuleCards();},100);
 return r;
};

function start(){
 addCss();renameModules();
 setTimeout(function(){window.__pstWorkspaceReleaseStatus={ok:typeof window.pstWorkspaceGo==='function'&&typeof window.pstOpenDocumentCenter==='function',projects:projectRows.length,checkedAt:new Date().toISOString()};},1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();