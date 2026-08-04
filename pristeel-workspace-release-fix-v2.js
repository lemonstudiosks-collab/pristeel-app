/* PRISTEEL Workspace release fix v2
 * Deterministic routing, bounded project loading, document filtering and authentic colors.
 */
(function(){
'use strict';
if(window.__pstWorkspaceReleaseFixV2Loaded)return;
window.__pstWorkspaceReleaseFixV2Loaded=true;

var BLUE='#5B9BB3',BLUE_DEEP='#3E7E96',BLUE_DARK='#326F87',BLUE_PALE='#EAF5F8';
var GREEN='#2F7657',RED='#A64B42',AMBER='#9B6A22';
var PROJECT_CACHE='pst_projects_last_good_v2';
var projectRows=[];
var projectLoading=false;
var projectRequest=0;
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
function statusInfo(s){s=String(s||'').toLowerCase();if(['aktiv','ne pune','në punë'].indexOf(s)>-1)return{label:'Aktiv',c:GREEN,bg:'#EAF5EF'};if(['fituar','closedwon','realizuar'].indexOf(s)>-1)return{label:s==='realizuar'?'Realizuar':'Fituar',c:GREEN,bg:'#EAF5EF'};if(['humbur','closedlost','cancelled'].indexOf(s)>-1)return{label:'Humbur',c:RED,bg:'#F9ECEA'};if(['shtyre','shtyrë'].indexOf(s)>-1)return{label:'Shtyrë',c:AMBER,bg:'#FAF2E3'};if(s==='arkivuar')return{label:'Arkivuar',c:'#6D7378',bg:'#EEF2F4'};if(['ofertim','oferte','ofertë','negociata'].indexOf(s)>-1)return{label:'Ofertim',c:AMBER,bg:'#FAF2E3'};return{label:s?s.charAt(0).toUpperCase()+s.slice(1):'Në pritje',c:BLUE_DEEP,bg:BLUE_PALE};}
function session(){try{return JSON.parse(localStorage.getItem('pristeel_session')||'null');}catch(e){return null;}}
function saveProjects(list){try{localStorage.setItem(PROJECT_CACHE,JSON.stringify({at:Date.now(),rows:list}));}catch(e){}}
function cachedProjects(){try{var x=JSON.parse(localStorage.getItem(PROJECT_CACHE)||'null');return x&&Array.isArray(x.rows)?x:null;}catch(e){return null;}}
function timeout(p,ms,label){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(done)return;done=true;reject(new Error((label||'Kërkesa')+' nuk u përgjigj brenda '+Math.round(ms/1000)+' sekondash.'));},ms);Promise.resolve(p).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(v);},function(e){if(done)return;done=true;clearTimeout(t);reject(e);});});}

function addCss(){
 if(document.getElementById('pst-workspace-release-v2-css'))return;
 var s=document.createElement('style');s.id='pst-workspace-release-v2-css';s.textContent=`
:root{--bronze:${BLUE}!important;--bronze-light:#78B3C8!important;--bronze-dark:${BLUE_DARK}!important;--bronze-bg:${BLUE_PALE}!important;--bronze-text:${BLUE_DARK}!important;--copper:${BLUE}!important;--copper-bg:${BLUE_PALE}!important;--accent:${BLUE}!important;--accent-bg:${BLUE_PALE}!important}
.pst-ws-mark,.pst-ws-create-main,.pst-ws-btn.primary,.pst-dc-new,.pst-dc-type.active{background:linear-gradient(135deg,#67A8C0,#3F7F98)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 8px 20px rgba(62,126,150,.16)!important}.pst-ws-create-main:hover,.pst-ws-btn.primary:hover,.pst-dc-new:hover{background:linear-gradient(135deg,#5F9FB7,#36758E)!important}.pst-ws-navbtn.active{background:${BLUE_PALE}!important;color:${BLUE_DARK}!important}.pst-ws-app-icon{background:${BLUE_PALE}!important;color:${BLUE_DEEP}!important}.pst-ws-link{color:${BLUE_DEEP}!important}.pst-ws-tab.active{color:${BLUE_DARK}!important;border-bottom-color:${BLUE}!important}.pst-ws-quick button:hover,.pst-ws-app:hover,.pst-ws-rowaction:hover{background:${BLUE_PALE}!important;border-color:#BFDDE8!important;color:${BLUE_DARK}!important}
#page-document-center{max-width:1380px!important}.pst-dc-create{padding:15px 17px!important;margin-bottom:14px!important;border-radius:13px!important}.pst-dc-label{margin-bottom:9px!important}.pst-dc-types{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important}.pst-dc-type{height:38px!important;border-radius:9px!important;font-size:11px!important;font-weight:690!important}.pst-dc-new{height:38px!important;margin-top:9px!important;border-radius:9px!important;font-size:11.5px!important}.pst-dc-list-card{border-radius:13px!important}.pst-dc-toolbar{padding:12px 14px!important}.pst-dc-row{padding:9px 10px!important}
@media(max-width:900px){.pst-dc-types{grid-template-columns:repeat(2,minmax(0,1fr))!important}}@media(max-width:560px){.pst-dc-types{grid-template-columns:1fr!important}}
`;
 document.head.appendChild(s);
}

function setNav(key){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')===key);});}
function hideOtherPages(keep){document.querySelectorAll('.page').forEach(function(p){if(p!==keep){p.classList.remove('active');p.style.display='none';}});}
function showLegacy(page,navKey){
 var legacy=window.__pstWorkspaceLegacy||{};
 var fn=legacy.pstV2Go||legacy.showPage||window.pstV2Go||window.showPage;
 try{if(typeof fn==='function')fn.call(window,page);}catch(e){console.error('PRISTEEL route:',page,e);}
 var el=document.getElementById('page-'+page);if(!el){console.error('PRISTEEL page missing:',page);return false;}
 hideOtherPages(el);el.classList.add('active');el.style.display='block';
 if(typeof window.applyModuleChrome==='function'){try{window.applyModuleChrome(page);}catch(e){}}
 setNav(navKey||(page==='finance'?'finance':page==='contacts'?'contacts':'apps'));
 window.scrollTo({top:0,behavior:'auto'});return true;
}
window.pstWsLegacy=function(page){return showLegacy(page,page==='finance'?'finance':page==='contacts'?'contacts':'apps');};

async function refreshSessionOnce(){if(typeof window.authRefreshIfNeeded!=='function')return false;try{await timeout(window.authRefreshIfNeeded(),4500,'Rifreskimi i sesionit');return true;}catch(e){return false;}}
async function directProjects(){
 var base=(typeof _SB_URL!=='undefined'&&_SB_URL)||window._SB_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
 var key=(typeof _SB_KEY!=='undefined'&&_SB_KEY)||window._SB_KEY||'';
 async function once(){
  var s=session(),ctrl=new AbortController(),timer=setTimeout(function(){ctrl.abort();},6500);
  try{
   var r=await fetch(base+'/rest/v1/projects?select=*&order=created_at.desc&limit=500',{cache:'no-store',signal:ctrl.signal,headers:{apikey:key,Authorization:'Bearer '+((s&&s.access_token)||key),Accept:'application/json'}});
   var text=await r.text(),data=[];try{data=text?JSON.parse(text):[];}catch(_e){}
   if(!r.ok){var er=new Error((data&&data.message)||('Supabase '+r.status));er.status=r.status;throw er;}
   return arr(data);
  }finally{clearTimeout(timer);}
 }
 try{return await once();}catch(e){if(e&&[401,403].indexOf(e.status)>-1&&await refreshSessionOnce())return once();throw e;}
}
async function fetchProjects(){
 var errors=[];
 try{var direct=await directProjects();saveProjects(direct);return{rows:direct,source:'database'};}catch(e){errors.push(e.name==='AbortError'?'Databaza nuk u përgjigj brenda 6 sekondash.':(e.message||String(e)));}
 var globals=[];[window.projects,window._projects,window.PST_PROJECTS].some(function(x){if(Array.isArray(x)&&x.length){globals=x;return true;}return false;});
 if(globals.length)return{rows:globals,source:'memory'};
 var cache=cachedProjects();if(cache&&cache.rows.length)return{rows:cache.rows,source:'cache',at:cache.at};
 throw new Error(errors.join(' | ')||'Projektet nuk u kthyen nga databaza.');
}
function ensurePage(id){var p=document.getElementById(id);if(p)return p;var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id=id;p.className='page';p.style.display='none';c.appendChild(p);return p;}
function activate(id){var p=ensurePage(id);if(!p)return null;hideOtherPages(p);p.classList.add('active');p.style.display='block';window.scrollTo({top:0,behavior:'auto'});return p;}
function projectShell(){
 setNav('projects');var p=activate('page-workspace-projects');if(!p)return null;
 p.innerHTML='<div class="pst-ws-page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Projektet</div><div class="pst-ws-title">Të gjitha projektet</div><div class="pst-ws-sub">Komunikimi, dokumentet, prokurimi dhe financat në të njëjtin kontekst</div></div><div class="pst-ws-actions"><button class="pst-ws-btn" onclick="pstWsLegacy(\'import\')">Pamja klasike</button><button class="pst-ws-btn primary" onclick="pstWsCreate(\'project\')">+ Projekt i ri</button></div></div><div class="pst-ws-toolbar"><input class="pst-ws-input" id="pst-release-project-search" placeholder="Kërko projekt, klient ose referencë" oninput="pstReleaseRenderProjects()"><select class="pst-ws-select" id="pst-release-project-filter" onchange="pstReleaseRenderProjects()"><option value="active">Aktive</option><option value="all">Të gjitha</option><option value="won">Të fituara</option><option value="lost">Të humbura</option><option value="delayed">Të shtyra</option><option value="archived">Të arkivuara</option></select></div><section class="pst-ws-card"><div class="pst-ws-card-body" id="pst-release-project-list"><div class="pst-ws-empty">Duke ngarkuar projektet…</div></div></section></div>';
 return p;
}
function projectError(message){var h=document.getElementById('pst-release-project-list');if(!h)return;h.innerHTML='<div class="pst-ws-empty" style="padding:34px 18px"><div style="font-weight:760;color:#A64B42;margin-bottom:7px">Projektet nuk u ngarkuan</div><div style="max-width:720px;margin:0 auto 14px;line-height:1.55">'+esc(message)+'</div><button type="button" class="pst-ws-btn primary" onclick="pstReleaseReloadProjects()">Provo përsëri</button></div>';}

async function renderProjects(){
 projectShell();
 if(projectLoading)return;
 projectLoading=true;var request=++projectRequest;
 try{
  var result=await fetchProjects();if(request!==projectRequest)return;
  projectRows=result.rows||[];
  var badge=document.getElementById('pst-ws-b-projects');if(badge){var n=projectRows.filter(activeProject).length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}
  window.pstReleaseRenderProjects();
  if(result.source==='cache'){var h=document.getElementById('pst-release-project-list');if(h)h.insertAdjacentHTML('afterbegin','<div style="padding:8px 12px;background:#FAF2E3;color:#79521D;font-size:10px;border-radius:8px;margin-bottom:8px">Po shfaqet lista e fundit e ruajtur. Databaza nuk u përgjigj.</div>');}
 }catch(e){if(request===projectRequest)projectError(e.message||String(e));}
 finally{if(request===projectRequest)projectLoading=false;}
}
window.pstReleaseReloadProjects=function(){projectLoading=false;projectRequest++;return renderProjects();};
window.pstReleaseRenderProjects=function(){
 var h=document.getElementById('pst-release-project-list');if(!h)return;var text=String((document.getElementById('pst-release-project-search')||{}).value||'').toLowerCase().trim(),f=String((document.getElementById('pst-release-project-filter')||{}).value||'active');
 var list=projectRows.filter(function(p){var s=String(p.status||'').toLowerCase(),ok=f==='all'||(f==='active'&&activeProject(p))||(f==='won'&&['fituar','closedwon','realizuar'].indexOf(s)>-1)||(f==='lost'&&['humbur','closedlost','cancelled'].indexOf(s)>-1)||(f==='delayed'&&['shtyre','shtyrë'].indexOf(s)>-1)||(f==='archived'&&s==='arkivuar');return ok&&(!text||[p.name,p.client,p.ref,p.pipeline_stage].join(' ').toLowerCase().indexOf(text)>-1);});
 h.innerHTML=list.length?'<table class="pst-ws-table"><thead><tr><th>Projekti</th><th>Faza</th><th>Statusi</th><th>Afati</th><th>Aktiviteti</th><th>Veprime</th></tr></thead><tbody>'+list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<tr onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><td><div class="pst-ws-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></td><td>'+esc(stageName(p.pipeline_stage))+'</td><td><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></td><td>'+dateText(p.deadline)+'</td><td>'+(a===null?'—':a===0?'Sot':'Para '+a+' ditësh')+'</td><td><button class="pst-ws-rowaction" onclick="event.stopPropagation();pstReleaseOpenProject(\''+esc(p.id)+'\')">Hap</button></td></tr>';}).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+(projectRows.length?'Nuk ka projekte që përputhen me filtrin.':'Nuk ka projekte në databazë.')+'</div>';
};
window.pstReleaseOpenProject=function(id){if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);else if(typeof window.loadProject==='function')window.loadProject(id);else{var l=window.__pstWorkspaceLegacy||{};if(typeof l.openOverview==='function')l.openOverview(id);}};

async function patchHomeProjects(){
 var host=document.getElementById('pst-ws-home-projects');if(!host)return;
 try{var result=await fetchProjects(),list=result.rows.filter(activeProject).sort(function(a,b){return String(b.updated_at||b.created_at||'').localeCompare(String(a.updated_at||a.created_at||''));}).slice(0,4);host.innerHTML=list.length?list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<div class="pst-ws-projectcard" onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-projectcard-client">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></div><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></div><div class="pst-ws-projectcard-next"><b>'+esc(stageName(p.pipeline_stage))+':</b> '+(a===null?'pa datë aktiviteti':a===0?'aktiv sot':'aktiv para '+a+' ditësh')+'</div></div>';}).join(''):'<div class="pst-ws-empty">Nuk ka projekte aktive.</div>';}catch(e){host.innerHTML='<div class="pst-ws-empty">Projektet nuk u ngarkuan.</div>';}
}

function syncDocumentType(type){var D=window.PST_DOC_CENTER;if(!D||!D.labels||!D.labels[type])return;D.selectedType=type;document.querySelectorAll('.pst-dc-type').forEach(function(btn){var name=String(D.labels[type].name||'').trim().toLowerCase();btn.classList.toggle('active',btn.textContent.trim().toLowerCase()===name);});var f=document.getElementById('pst-dc-filter');if(f){f.value=type;if(typeof window.pstRenderDocumentList==='function')window.pstRenderDocumentList();}var title=document.querySelector('.pst-dc-toolbar-title');if(title)title.textContent=type==='offer'?'Ofertat':type==='invoice'?'Faturat':type==='credit_note'?'Notat kreditore':'Notat debitore';}
window.pstSelectDocumentType=function(type){if(typeof originalDocSelect==='function')originalDocSelect(type);syncDocumentType(type);};
window.pstOpenDocumentCenter=function(type){var r=typeof originalDocOpen==='function'?originalDocOpen(type):undefined;setTimeout(function(){var D=window.PST_DOC_CENTER;syncDocumentType(type||(D&&D.selectedType)||'invoice');},120);return r;};
window.pstCloseDocumentCenter=function(){if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('commercial');else showLegacy('invoices','apps');};

function renameModules(){var btn=document.querySelector('.pst-ws-navbtn[data-key="apps"] span');if(btn&&btn.textContent.trim()!=='Modulet')btn.textContent='Modulet';var page=document.getElementById('page-workspace-apps');if(page&&page.classList.contains('active')){var eye=page.querySelector('.pst-ws-eyebrow'),title=page.querySelector('.pst-ws-title');if(eye&&eye.textContent.trim()!=='Sistemi')eye.textContent='Sistemi';if(title&&title.textContent.trim()!=='Modulet & Integrimet')title.textContent='Modulet & Integrimet';}}
function patchModuleCards(){
 var map={'Prokurimi':function(){showLegacy('bom','apps');},'Detyrat':function(){showLegacy('qendra','apps');},'Outreach':function(){showLegacy('outreach','apps');},'Dokumentet':function(){window.pstOpenDocumentCenter('invoice');},'Kalkulatori':function(){showLegacy('kalkulator','apps');},'Cilësimet':function(){showLegacy('settings','apps');},'Kontratat':function(){showLegacy('contracts','apps');},'Skedarët':function(){showLegacy('library','apps');},'Pamja klasike':function(){showLegacy('qendra','apps');}};
 document.querySelectorAll('.pst-ws-app').forEach(function(card){var name=(card.querySelector('.pst-ws-app-name')||{}).textContent;if(!name||!map[name.trim()]||card.__pstReleaseBound)return;card.__pstReleaseBound=true;card.removeAttribute('onclick');card.addEventListener('click',map[name.trim()]);});
}
window.pstWsCreate=function(type){var menu=document.getElementById('pst-ws-create');if(menu)menu.classList.remove('open');if(type==='project'){if(typeof window.newProject==='function')window.newProject();else showLegacy('newproject','projects');return;}if(type==='offer'||type==='invoice'){if(typeof window.pstOpenDocumentCenter==='function'){window.pstOpenDocumentCenter(type);setTimeout(function(){if(typeof window.pstCreateSelectedDocument==='function')window.pstCreateSelectedDocument();},80);}return;}if(type==='task'){showLegacy('qendra','apps');return;}if(typeof originalCreate==='function')originalCreate(type);};
window.pstWsRefreshHome=function(e){if(e){e.preventDefault();e.stopPropagation();}if(typeof originalGo==='function'){originalGo('home');setTimeout(patchHomeProjects,180);}};
window.pstWorkspaceGo=function(key){if(key==='projects')return renderProjects();if(key==='finance')return showLegacy('finance','finance');if(key==='contacts')return showLegacy('contacts','contacts');var r=typeof originalGo==='function'?originalGo(key):undefined;if(key==='home')setTimeout(patchHomeProjects,180);if(key==='apps')setTimeout(function(){renameModules();patchModuleCards();},100);return r;};

function start(){addCss();renameModules();if(document.getElementById('page-workspace-home')&&document.getElementById('page-workspace-home').classList.contains('active'))setTimeout(patchHomeProjects,150);setTimeout(function(){window.__pstWorkspaceReleaseStatus={ok:typeof window.pstWorkspaceGo==='function'&&typeof window.pstOpenDocumentCenter==='function',checkedAt:new Date().toISOString()};},1200);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();