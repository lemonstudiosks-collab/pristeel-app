/* PRISTEEL Workspace production repair layer
 * Uses the stable platform router and keeps the new project-centred workspace.
 */
(function(){
'use strict';
if(window.__pstWorkspaceReleaseFixLoaded)return;
window.__pstWorkspaceReleaseFixLoaded=true;

var BLUE='#5B9BB3';
var BLUE_DEEP='#3E7E96';
var BLUE_DARK='#326F87';
var BLUE_PALE='#EAF5F8';
var GREEN='#2F7657';
var RED='#A64B42';
var AMBER='#9B6A22';
var projects=[];
var originalGo=window.pstWorkspaceGo;
var originalDocOpen=window.pstOpenDocumentCenter;
var originalDocSelect=window.pstSelectDocumentType;
var originalCreate=window.pstWsCreate;

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled','realizuar'].indexOf(s)<0;}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[id]||'Në pritje';}
function statusInfo(s){s=String(s||'').toLowerCase();if(['aktiv','ne pune','në punë'].indexOf(s)>-1)return{label:'Aktiv',c:GREEN,bg:'#EAF5EF'};if(['fituar','closedwon','realizuar'].indexOf(s)>-1)return{label:s==='realizuar'?'Realizuar':'Fituar',c:GREEN,bg:'#EAF5EF'};if(['humbur','closedlost','cancelled'].indexOf(s)>-1)return{label:'Humbur',c:RED,bg:'#F9ECEA'};if(['ofertim','oferte','ofertë','negociata'].indexOf(s)>-1)return{label:'Ofertim',c:AMBER,bg:'#FAF2E3'};return{label:s?s.charAt(0).toUpperCase()+s.slice(1):'Në pritje',c:BLUE_DEEP,bg:BLUE_PALE};}

function addCss(){
 if(document.getElementById('pst-workspace-release-css'))return;
 var s=document.createElement('style');
 s.id='pst-workspace-release-css';
 s.textContent=`
:root{--bronze:${BLUE}!important;--bronze-light:#78B3C8!important;--bronze-dark:${BLUE_DARK}!important;--bronze-bg:${BLUE_PALE}!important;--bronze-text:${BLUE_DARK}!important;--copper:${BLUE}!important;--copper-bg:${BLUE_PALE}!important;--accent:${BLUE}!important;--accent-bg:${BLUE_PALE}!important}
.pst-ws-mark,.pst-ws-create-main,.pst-ws-btn.primary,.pst-dc-new,.pst-dc-type.active{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 8px 20px rgba(62,126,150,.16)!important}
.pst-ws-create-main:hover,.pst-ws-btn.primary:hover,.pst-dc-new:hover{background:linear-gradient(135deg,#5F9FB7,#36758E)!important}
.pst-ws-navbtn.active{background:${BLUE_PALE}!important;color:${BLUE_DARK}!important}
.pst-ws-app-icon{background:${BLUE_PALE}!important;color:${BLUE_DEEP}!important}
.pst-ws-link{color:${BLUE_DEEP}!important}.pst-ws-tab.active{color:${BLUE_DARK}!important;border-bottom-color:${BLUE}!important}
.pst-ws-quick button:hover,.pst-ws-app:hover,.pst-ws-rowaction:hover{background:${BLUE_PALE}!important;border-color:#BFDDE8!important;color:${BLUE_DARK}!important}
.pst-ws-stage.done .pst-ws-stage-dot,.pst-ws-stage.current .pst-ws-stage-dot{background:${BLUE}!important;border-color:${BLUE}!important}.pst-ws-stage.done:after{background:${BLUE}!important}.pst-ws-timeitem:before{background:${BLUE}!important;box-shadow:0 0 0 4px ${BLUE_PALE}!important}
#page-document-center{max-width:1380px!important}.pst-dc-create{padding:15px 17px!important;margin-bottom:14px!important;border-radius:13px!important}.pst-dc-label{margin-bottom:9px!important}.pst-dc-types{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.pst-dc-type{height:38px!important;border-radius:9px!important;font-size:11px!important;font-weight:690!important}.pst-dc-new{height:38px!important;margin-top:9px!important;border-radius:9px!important;font-size:11.5px!important}.pst-dc-list-card{border-radius:13px!important}.pst-dc-toolbar{padding:12px 14px!important}.pst-dc-row{padding:9px 10px!important}
@media(max-width:900px){.pst-dc-types{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:560px){.pst-dc-types{grid-template-columns:1fr!important}}
`;
 document.head.appendChild(s);
}

function setNav(key){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});}
function hidePages(except){document.querySelectorAll('.page').forEach(function(p){if(p!==except){p.classList.remove('active');p.style.display='none';}});}
function showLegacy(page,navKey){
 var legacy=window.__pstWorkspaceLegacy||{};
 var fn=legacy.pstV2Go||legacy.showPage||window.pstV2Go||window.showPage;
 try{if(typeof fn==='function')fn.call(window,page);}catch(e){console.error('PRISTEEL legacy route failed:',page,e);}
 var el=document.getElementById('page-'+page);
 if(!el){console.error('PRISTEEL page not found:',page);return false;}
 hidePages(el);el.style.display='block';el.classList.add('active');
 if(typeof window.applyModuleChrome==='function'){try{window.applyModuleChrome(page);}catch(e){}}
 setNav(navKey||(page==='finance'?'finance':page==='contacts'?'contacts':'apps'));
 window.scrollTo({top:0,behavior:'auto'});
 return true;
}
window.pstWsLegacy=function(page){return showLegacy(page,page==='finance'?'finance':page==='contacts'?'contacts':'apps');};

async function fetchProjects(){
 if(typeof window.supaFetch!=='function')return [];
 var rows=[];
 var paths=['projects?order=created_at.desc&limit=3000','projects?select=*&order=created_at.desc&limit=3000','projects?select=*&limit=3000'];
 for(var i=0;i<paths.length&&!rows.length;i++){
  try{rows=arr(await window.supaFetch(paths[i]));}catch(e){if(i===paths.length-1)console.error('PRISTEEL projects:',e);}
 }
 if(!rows.length){
  [window.projects,window._projects,window.PST_PROJECTS].some(function(x){if(Array.isArray(x)&&x.length){rows=x;return true;}return false;});
 }
 return rows;
}
function workspacePage(id){var p=document.getElementById(id);if(p)return p;var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id=id;p.className='page';p.style.display='none';c.appendChild(p);return p;}
function activate(id){var p=workspacePage(id);if(!p)return null;hidePages(p);p.style.display='block';p.classList.add('active');window.scrollTo({top:0,behavior:'auto'});return p;}

async function renderProjects(){
 setNav('projects');var p=activate('page-workspace-projects');if(!p)return;
 p.innerHTML='<div class="pst-ws-page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Projektet</div><div class="pst-ws-title">Të gjitha projektet</div><div class="pst-ws-sub">Komunikimi, dokumentet, prokurimi dhe financat në të njëjtin kontekst</div></div><div class="pst-ws-actions"><button class="pst-ws-btn" onclick="pstWsLegacy(\'import\')">Pamja klasike</button><button class="pst-ws-btn primary" onclick="pstWsCreate(\'project\')">+ Projekt i ri</button></div></div><div class="pst-ws-toolbar"><input class="pst-ws-input" id="pst-release-project-search" placeholder="Kërko projekt, klient ose referencë" oninput="pstReleaseRenderProjects()"><select class="pst-ws-select" id="pst-release-project-filter" onchange="pstReleaseRenderProjects()"><option value="active">Aktive</option><option value="all">Të gjitha</option><option value="won">Të fituara</option><option value="lost">Të humbura</option></select></div><section class="pst-ws-card"><div class="pst-ws-card-body" id="pst-release-project-list"><div class="pst-ws-empty">Duke ngarkuar projektet…</div></div></section></div>';
 projects=await fetchProjects();
 var badge=document.getElementById('pst-ws-b-projects');if(badge){var n=projects.filter(activeProject).length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}
 window.pstReleaseRenderProjects();
}
window.pstReleaseRenderProjects=function(){
 var h=document.getElementById('pst-release-project-list');if(!h)return;
 var text=String((document.getElementById('pst-release-project-search')||{}).value||'').toLowerCase().trim();
 var f=String((document.getElementById('pst-release-project-filter')||{}).value||'active');
 var list=projects.filter(function(p){var s=String(p.status||'').toLowerCase();var ok=f==='all'||(f==='active'&&activeProject(p))||(f==='won'&&['fituar','closedwon','realizuar'].indexOf(s)>-1)||(f==='lost'&&['humbur','closedlost','cancelled'].indexOf(s)>-1);return ok&&(!text||[p.name,p.client,p.ref,p.pipeline_stage].join(' ').toLowerCase().indexOf(text)>-1);});
 h.innerHTML=list.length?'<table class="pst-ws-table"><thead><tr><th>Projekti</th><th>Faza</th><th>Statusi</th><th>Afati</th><th>Aktiviteti</th><th></th></tr></thead><tbody>'+list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<tr onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><td><div class="pst-ws-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></td><td>'+esc(stageName(p.pipeline_stage))+'</td><td><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></td><td>'+dateText(p.deadline)+'</td><td>'+(a===null?'—':a===0?'Sot':'Para '+a+' ditësh')+'</td><td><button class="pst-ws-rowaction" onclick="event.stopPropagation();pstReleaseOpenProject(\''+esc(p.id)+'\')">Hap</button></td></tr>';}).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+(projects.length?'Nuk ka projekte që përputhen me filtrin.':'Projektet nuk u ngarkuan.')+'</div>';
};
window.pstReleaseOpenProject=function(id){if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);else if(typeof window.loadProject==='function')window.loadProject(id);else{var legacy=window.__pstWorkspaceLegacy||{};if(typeof legacy.openOverview==='function')legacy.openOverview(id);}};

async function patchHomeProjects(){
 var host=document.getElementById('pst-ws-home-projects');if(!host)return;
 var rows=await fetchProjects(),list=rows.filter(activeProject).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));}).slice(0,4);
 host.innerHTML=list.length?list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<div class="pst-ws-projectcard" onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-projectcard-client">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></div><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></div><div class="pst-ws-projectcard-next"><b>'+esc(stageName(p.pipeline_stage))+':</b> '+(a===null?'pa datë aktiviteti':a===0?'aktiv sot':'aktiv para '+a+' ditësh')+'</div></div>';}).join(''):'<div class="pst-ws-empty">Projektet nuk u ngarkuan.</div>';
 var b=document.getElementById('pst-ws-b-projects');if(b){var n=rows.filter(activeProject).length;b.textContent=String(n);b.style.display=n?'inline-flex':'none';}
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
 var btn=document.querySelector('.pst-ws-navbtn[data-key="apps"] span');if(btn)btn.textContent='Modulet';
 var page=document.getElementById('page-workspace-apps');if(page&&page.classList.contains('active')){var eye=page.querySelector('.pst-ws-eyebrow');if(eye)eye.textContent='Sistemi';var title=page.querySelector('.pst-ws-title');if(title)title.textContent='Modulet & Integrimet';}
}
function patchModuleCards(){
 var map={
  'Prokurimi':function(){showLegacy('bom','apps');},
  'Detyrat':function(){showLegacy('qendra','apps');},
  'Outreach':function(){showLegacy('outreach','apps');},
  'Dokumentet':function(){window.pstOpenDocumentCenter('invoice');},
  'Kalkulatori':function(){showLegacy('kalkulator','apps');},
  'Cilësimet':function(){showLegacy('settings','apps');},
  'Kontratat':function(){showLegacy('contracts','apps');},
  'Skedarët':function(){showLegacy('library','apps');},
  'Pamja klasike':function(){showLegacy('qendra','apps');}
 };
 document.querySelectorAll('.pst-ws-app').forEach(function(card){var n=card.querySelector('.pst-ws-app-name'),name=n?n.textContent.trim():'';if(!map[name]||card.__pstReleaseBound)return;card.__pstReleaseBound=true;card.removeAttribute('onclick');card.addEventListener('click',map[name]);});
}

window.pstWsCreate=function(type){
 var menu=document.getElementById('pst-ws-create');if(menu)menu.classList.remove('open');
 if(type==='project'){if(typeof window.newProject==='function')window.newProject();else showLegacy('newproject','projects');return;}
 if(type==='offer'){if(typeof window.pstOpenDocumentCenter==='function'){window.pstOpenDocumentCenter('offer');setTimeout(function(){if(typeof window.pstCreateSelectedDocument==='function')window.pstCreateSelectedDocument();},80);}return;}
 if(type==='invoice'){if(typeof window.pstOpenDocumentCenter==='function'){window.pstOpenDocumentCenter('invoice');setTimeout(function(){if(typeof window.pstCreateSelectedDocument==='function')window.pstCreateSelectedDocument();},80);}return;}
 if(type==='task'){showLegacy('qendra','apps');return;}
 if(typeof originalCreate==='function')originalCreate(type);
};
window.pstWsRefreshHome=function(e){if(e){e.preventDefault();e.stopPropagation();}if(typeof originalGo==='function'){originalGo('home');setTimeout(patchHomeProjects,180);}};

window.pstWorkspaceGo=function(key){
 if(key==='projects')return renderProjects();
 if(key==='finance')return showLegacy('finance','finance');
 if(key==='contacts')return showLegacy('contacts','contacts');
 var r=typeof originalGo==='function'?originalGo(key):undefined;
 if(key==='home')setTimeout(patchHomeProjects,180);
 if(key==='apps')setTimeout(function(){renameModules();patchModuleCards();},100);
 return r;
};

function selfTest(){
 var pages=['qendra','import','bom','outreach','finance','contacts','kalkulator','settings','contracts','library'];
 var missingPages=pages.filter(function(p){return !document.getElementById('page-'+p);});
 var funcs=['supaFetch','pstWorkspaceGo','pstOpenDocumentCenter','pstWsCreate'].filter(function(f){return typeof window[f]!=='function';});
 window.__pstWorkspaceReleaseStatus={ok:!missingPages.length&&!funcs.length,missingPages:missingPages,missingFunctions:funcs,checkedAt:new Date().toISOString()};
 if(missingPages.length||funcs.length)console.warn('PRISTEEL workspace self-test:',window.__pstWorkspaceReleaseStatus);
}
function start(){addCss();renameModules();patchModuleCards();setTimeout(function(){if(document.getElementById('page-workspace-home')&&document.getElementById('page-workspace-home').classList.contains('active'))patchHomeProjects();},350);var observer=new MutationObserver(function(){renameModules();patchModuleCards();});observer.observe(document.documentElement,{childList:true,subtree:true});setTimeout(selfTest,3500);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
