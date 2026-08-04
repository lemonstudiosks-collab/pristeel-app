/* PRISTEEL Workspace hotfix v1
 * Repairs legacy-page visibility, project loading, document filtering,
 * module naming and the authentic PRISTEEL blue palette.
 */
(function(){
'use strict';
if(window.__pstWorkspaceHotfixV1Loaded)return;
window.__pstWorkspaceHotfixV1Loaded=true;

var BLUE='#5B9BB3';
var BLUE_DEEP='#3E7E96';
var BLUE_DARK='#326F87';
var BLUE_PALE='#EAF5F8';
var GREEN='#2F7657';
var RED='#A64B42';
var AMBER='#9B6A22';
var projectRows=[];

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function arr(v){return Array.isArray(v)?v:[];}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled','realizuar'].indexOf(s)<0;}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[id]||'Në pritje';}
function statusInfo(s){s=String(s||'').toLowerCase();if(['aktiv','ne pune','në punë'].indexOf(s)>-1)return{label:'Aktiv',c:GREEN,bg:'#EAF5EF'};if(['fituar','closedwon','realizuar'].indexOf(s)>-1)return{label:s==='realizuar'?'Realizuar':'Fituar',c:GREEN,bg:'#EAF5EF'};if(['humbur','closedlost','cancelled'].indexOf(s)>-1)return{label:'Humbur',c:RED,bg:'#F9ECEA'};if(['ofertim','oferte','ofertë','negociata'].indexOf(s)>-1)return{label:'Ofertim',c:AMBER,bg:'#FAF2E3'};return{label:s?s.charAt(0).toUpperCase()+s.slice(1):'Në pritje',c:BLUE_DEEP,bg:BLUE_PALE};}

function addStyle(){
 if(document.getElementById('pst-workspace-hotfix-v1-css'))return;
 var s=document.createElement('style');s.id='pst-workspace-hotfix-v1-css';s.textContent=`
:root{--bronze:${BLUE}!important;--bronze-light:#CFE7EF!important;--bronze-dark:${BLUE_DARK}!important;--bronze-bg:${BLUE_PALE}!important;--bronze-text:${BLUE_DARK}!important;--copper:${BLUE}!important;--copper-bg:${BLUE_PALE}!important;--accent:${BLUE}!important;--accent-bg:${BLUE_PALE}!important}
body.pst-alive .pst-ws-mark,body.pst-alive .pst-ws-create-main,body.pst-alive .pst-ws-btn.primary,body.pst-alive .pst-dc-new,body.pst-alive .pst-dc-type.active{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 8px 20px rgba(62,126,150,.18)!important}
body.pst-alive .pst-ws-create-main:hover,body.pst-alive .pst-ws-btn.primary:hover,body.pst-alive .pst-dc-new:hover{background:linear-gradient(135deg,#5F9FB7,#36758E)!important}
body.pst-alive .pst-ws-navbtn.active{background:${BLUE_PALE}!important;color:${BLUE_DARK}!important}
body.pst-alive .pst-ws-app-icon{background:${BLUE_PALE}!important;color:${BLUE_DEEP}!important}
body.pst-alive .pst-ws-link{color:${BLUE_DEEP}!important}
body.pst-alive .pst-ws-tab.active{color:${BLUE_DARK}!important;border-bottom-color:${BLUE}!important}
body.pst-alive .pst-ws-quick button:hover,body.pst-alive .pst-ws-app:hover,body.pst-alive .pst-ws-rowaction:hover{background:${BLUE_PALE}!important;border-color:#BFDDE8!important;color:${BLUE_DARK}!important}
body.pst-alive .pst-ws-stage.done .pst-ws-stage-dot,body.pst-alive .pst-ws-stage.current .pst-ws-stage-dot{background:${BLUE}!important;border-color:${BLUE}!important}
body.pst-alive .pst-ws-stage.done:after{background:${BLUE}!important}
body.pst-alive .pst-ws-timeitem:before{background:${BLUE}!important;box-shadow:0 0 0 4px ${BLUE_PALE}!important}
body.pst-alive #page-document-center{max-width:1380px!important}
body.pst-alive .pst-dc-create{padding:15px 17px!important;margin-bottom:14px!important;border-radius:13px!important}
body.pst-alive .pst-dc-label{margin-bottom:9px!important}
body.pst-alive .pst-dc-types{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}
body.pst-alive .pst-dc-type{height:38px!important;border-radius:9px!important;font-size:11px!important;font-weight:690!important}
body.pst-alive .pst-dc-new{height:38px!important;margin-top:9px!important;border-radius:9px!important;font-size:11.5px!important}
body.pst-alive .pst-dc-list-card{border-radius:13px!important}
body.pst-alive .pst-dc-toolbar{padding:12px 14px!important}
body.pst-alive .pst-dc-row{padding:9px 10px!important}
@media(max-width:900px){body.pst-alive .pst-dc-types{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
@media(max-width:560px){body.pst-alive .pst-dc-types{grid-template-columns:1fr!important}}
`;
 document.head.appendChild(s);
}

function setNav(key){
 document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});
}
function hideAllPages(){document.querySelectorAll('.page').forEach(function(p){p.classList.remove('active');p.style.display='none';});}
function showPageElement(id){var p=document.getElementById(id);if(!p)return null;hideAllPages();p.style.display='block';p.classList.add('active');window.scrollTo({top:0,behavior:'auto'});return p;}

function openLegacy(page,navKey){
 var legacy=window.__pstWorkspaceLegacy||{};
 var fn=legacy.showPage||window.showPage;
 try{if(typeof fn==='function')fn.call(window,page);}catch(e){console.error('PRISTEEL legacy page:',page,e);}
 var el=document.getElementById('page-'+page);
 if(el){
  document.querySelectorAll('.page').forEach(function(p){if(p!==el){p.classList.remove('active');p.style.display='none';}});
  el.style.display='block';el.classList.add('active');
 }
 setNav(navKey||(page==='finance'?'finance':page==='contacts'?'contacts':'apps'));
 window.scrollTo({top:0,behavior:'auto'});
 return !!el;
}
window.pstWsLegacy=function(page){return openLegacy(page,page==='finance'?'finance':page==='contacts'?'contacts':'apps');};

async function fetchProjects(){
 if(typeof window.supaFetch!=='function')return [];
 var rows=[];
 try{rows=arr(await window.supaFetch('projects?select=*&order=created_at.desc&limit=3000'));}catch(e1){
  try{rows=arr(await window.supaFetch('projects?select=*&limit=3000'));}catch(e2){console.error('PRISTEEL projects:',e2);}
 }
 if(!rows.length){
  var candidates=[window.projects,window._projects,window.PST_PROJECTS];
  for(var i=0;i<candidates.length;i++){if(Array.isArray(candidates[i])&&candidates[i].length){rows=candidates[i];break;}}
 }
 return rows;
}
function ensureWorkspacePage(id){var p=document.getElementById(id);if(p)return p;var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id=id;p.className='page';p.style.display='none';c.appendChild(p);return p;}

async function renderProjectsFixed(){
 setNav('projects');
 var p=ensureWorkspacePage('page-workspace-projects');if(!p)return;
 showPageElement('page-workspace-projects');
 p.innerHTML='<div class="pst-ws-page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Projektet</div><div class="pst-ws-title">Të gjitha projektet</div><div class="pst-ws-sub">Komunikimi, dokumentet, prokurimi dhe financat në të njëjtin kontekst</div></div><div class="pst-ws-actions"><button class="pst-ws-btn" onclick="pstWsLegacy(\'import\')">Pamja klasike</button><button class="pst-ws-btn primary" onclick="pstWsCreate(\'project\')">+ Projekt i ri</button></div></div><div class="pst-ws-toolbar"><input class="pst-ws-input" id="pst-hotfix-project-search" placeholder="Kërko projekt, klient ose referencë" oninput="pstHotfixRenderProjects()"><select class="pst-ws-select" id="pst-hotfix-project-filter" onchange="pstHotfixRenderProjects()"><option value="active">Aktive</option><option value="all">Të gjitha</option><option value="won">Të fituara</option><option value="lost">Të humbura</option></select></div><section class="pst-ws-card"><div class="pst-ws-card-body" id="pst-hotfix-project-list"><div class="pst-ws-empty">Duke ngarkuar projektet…</div></div></section></div>';
 projectRows=await fetchProjects();
 var badge=document.getElementById('pst-ws-b-projects');if(badge){var n=projectRows.filter(activeProject).length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}
 window.pstHotfixRenderProjects();
}
window.pstHotfixRenderProjects=function(){
 var h=document.getElementById('pst-hotfix-project-list');if(!h)return;
 var text=String((document.getElementById('pst-hotfix-project-search')||{}).value||'').toLowerCase().trim();
 var f=String((document.getElementById('pst-hotfix-project-filter')||{}).value||'active');
 var list=projectRows.filter(function(p){
  var s=String(p.status||'').toLowerCase();
  var ok=f==='all'||(f==='active'&&activeProject(p))||(f==='won'&&['fituar','closedwon','realizuar'].indexOf(s)>-1)||(f==='lost'&&['humbur','closedlost','cancelled'].indexOf(s)>-1);
  return ok&&(!text||[p.name,p.client,p.ref,p.pipeline_stage].join(' ').toLowerCase().indexOf(text)>-1);
 });
 h.innerHTML=list.length?'<table class="pst-ws-table"><thead><tr><th>Projekti</th><th>Faza</th><th>Statusi</th><th>Afati</th><th>Aktiviteti</th><th></th></tr></thead><tbody>'+list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<tr onclick="pstHotfixOpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><td><div class="pst-ws-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></td><td>'+esc(stageName(p.pipeline_stage))+'</td><td><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></td><td>'+dateText(p.deadline)+'</td><td>'+(a===null?'—':a===0?'Sot':'Para '+a+' ditësh')+'</td><td><button class="pst-ws-rowaction" onclick="event.stopPropagation();pstHotfixOpenProject(\''+esc(p.id)+'\')">Hap</button></td></tr>';}).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+(projectRows.length?'Nuk ka projekte që përputhen me filtrin.':'Projektet nuk u ngarkuan. Provo përsëri pas pak.')+'</div>';
};
window.pstHotfixOpenProject=function(id){if(window.pstOpenProjectWorkspace)window.pstOpenProjectWorkspace(id);else if(window.loadProject)window.loadProject(id);else if(window.__pstWorkspaceLegacy&&window.__pstWorkspaceLegacy.openOverview)window.__pstWorkspaceLegacy.openOverview(id);};

async function patchHomeProjects(){
 var host=document.getElementById('pst-ws-home-projects');if(!host)return;
 var rows=await fetchProjects();
 var list=rows.filter(activeProject).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));}).slice(0,4);
 host.innerHTML=list.length?list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<div class="pst-ws-projectcard" onclick="pstHotfixOpenProject(\''+esc(p.id)+'\')"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-projectcard-client">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></div><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></div><div class="pst-ws-projectcard-next"><b>'+esc(stageName(p.pipeline_stage))+':</b> '+(a===null?'pa datë aktiviteti':a===0?'aktiv sot':'aktiv para '+a+' ditësh')+'</div></div>';}).join(''):'<div class="pst-ws-empty">Projektet nuk u ngarkuan.</div>';
 var b=document.getElementById('pst-ws-b-projects');if(b){var n=rows.filter(activeProject).length;b.textContent=String(n);b.style.display=n?'inline-flex':'none';}
}

function syncDocumentType(type){
 var D=window.PST_DOC_CENTER;if(!D||!D.labels||!D.labels[type])return;
 D.selectedType=type;
 document.querySelectorAll('.pst-dc-type').forEach(function(btn){var txt=btn.textContent.trim().toLowerCase(),name=String(D.labels[type].name||'').trim().toLowerCase();btn.classList.toggle('active',txt===name);});
 var f=document.getElementById('pst-dc-filter');if(f){f.value=type;if(window.pstRenderDocumentList)window.pstRenderDocumentList();}
 var title=document.querySelector('.pst-dc-toolbar-title');if(title)title.textContent=type==='offer'?'Ofertat':type==='invoice'?'Faturat':type==='credit_note'?'Notat kreditore':'Notat debitore';
}
var oldSelect=window.pstSelectDocumentType;
window.pstSelectDocumentType=function(type){if(typeof oldSelect==='function')oldSelect(type);syncDocumentType(type);};
var oldDocOpen=window.pstOpenDocumentCenter;
window.pstOpenDocumentCenter=function(type){var r=typeof oldDocOpen==='function'?oldDocOpen(type):undefined;setTimeout(function(){var D=window.PST_DOC_CENTER;syncDocumentType(type||(D&&D.selectedType)||'invoice');},80);return r;};
window.pstCloseDocumentCenter=function(){if(window.pstWorkspaceGo)window.pstWorkspaceGo('commercial');else openLegacy('offers','apps');};

function renameModules(){
 var btn=document.querySelector('.pst-ws-navbtn[data-key="apps"] span');if(btn)btn.textContent='Modulet';
 var page=document.getElementById('page-workspace-apps');if(page&&page.classList.contains('active')){
  var eye=page.querySelector('.pst-ws-eyebrow');if(eye)eye.textContent='Sistemi';
  var title=page.querySelector('.pst-ws-title');if(title)title.textContent='Modulet & Integrimet';
 }
}

var originalGo=window.pstWorkspaceGo;
window.pstWorkspaceGo=function(key){
 if(key==='finance')return openLegacy('finance','finance');
 if(key==='contacts')return openLegacy('contacts','contacts');
 if(key==='projects')return renderProjectsFixed();
 var result=typeof originalGo==='function'?originalGo(key):undefined;
 if(key==='home')setTimeout(patchHomeProjects,180);
 if(key==='apps')setTimeout(renameModules,80);
 return result;
};

function repair(){addStyle();renameModules();var D=window.PST_DOC_CENTER;if(D&&D.labels){D.labels.offer.tone=BLUE_DEEP;D.labels.offer.bg=BLUE_PALE;D.labels.invoice.tone=BLUE_DEEP;D.labels.invoice.bg=BLUE_PALE;D.labels.debit_note.tone=BLUE_DEEP;D.labels.debit_note.bg=BLUE_PALE;}}
addStyle();repair();
var obs=new MutationObserver(function(){repair();});
obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(function(){if(document.getElementById('page-workspace-home')&&document.getElementById('page-workspace-home').classList.contains('active'))patchHomeProjects();},500);
})();