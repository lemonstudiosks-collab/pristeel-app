/* PRISTEEL project list rescue
 * Bounded requests, direct REST fallback and last-good cache.
 */
(function(){
'use strict';
if(window.__pstProjectListRescueLoaded)return;
window.__pstProjectListRescueLoaded=true;

var CACHE_KEY='pst_projects_last_good_v1';
var rows=[];
var loading=null;
var requestNo=0;
var BLUE='#5B9BB3',BLUE_DEEP='#3E7E96',GREEN='#2F7657',RED='#A64B42',AMBER='#9B6A22';

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function activeProject(p){var s=String((p&&p.status)||'').toLowerCase();return ['mbyllur','fituar','humbur','arkivuar','closedwon','closedlost','cancelled','realizuar'].indexOf(s)<0;}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[id]||'Në pritje';}
function statusInfo(s){s=String(s||'').toLowerCase();if(['aktiv','ne pune','në punë'].indexOf(s)>-1)return{label:'Aktiv',c:GREEN,bg:'#EAF5EF'};if(['fituar','closedwon','realizuar'].indexOf(s)>-1)return{label:s==='realizuar'?'Realizuar':'Fituar',c:GREEN,bg:'#EAF5EF'};if(['humbur','closedlost','cancelled'].indexOf(s)>-1)return{label:'Humbur',c:RED,bg:'#F9ECEA'};if(['shtyre','shtyrë'].indexOf(s)>-1)return{label:'Shtyrë',c:AMBER,bg:'#FAF2E3'};if(['arkivuar'].indexOf(s)>-1)return{label:'Arkivuar',c:'#6D7378',bg:'#EEF2F4'};if(['ofertim','oferte','ofertë','negociata'].indexOf(s)>-1)return{label:'Ofertim',c:AMBER,bg:'#FAF2E3'};return{label:s?s.charAt(0).toUpperCase()+s.slice(1):'Në pritje',c:BLUE_DEEP,bg:'#EAF5F8'};}
function timeout(promise,ms,label){return new Promise(function(resolve,reject){var done=false,t=setTimeout(function(){if(done)return;done=true;reject(new Error((label||'Kërkesa')+' kaloi kufirin prej '+Math.round(ms/1000)+' sekondash.'));},ms);Promise.resolve(promise).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(v);},function(e){if(done)return;done=true;clearTimeout(t);reject(e);});});}
function session(){try{return JSON.parse(localStorage.getItem('pristeel_session')||'null');}catch(e){return null;}}
function saveCache(list){try{localStorage.setItem(CACHE_KEY,JSON.stringify({at:Date.now(),rows:list}));}catch(e){}}
function readCache(){try{var x=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');return x&&Array.isArray(x.rows)?x:null;}catch(e){return null;}}
function globals(){var out=[];[window.projects,window._projects,window.PST_PROJECTS].some(function(x){if(Array.isArray(x)&&x.length){out=x;return true;}return false;});return out;}

async function viaSupa(){if(typeof window.supaFetch!=='function')throw new Error('Lidhja e platformës me databazën nuk është gati.');return arr(await timeout(window.supaFetch('projects?select=*&order=created_at.desc&limit=500'),5500,'Lista e projekteve'));}
async function refreshToken(){if(typeof window.authRefreshIfNeeded!=='function')return false;try{await timeout(window.authRefreshIfNeeded(),4500,'Rifreskimi i sesionit');return true;}catch(e){return false;}}
async function viaRest(){
 var base=window._SB_URL||'https://isymxqfqzkchbsrbhucf.supabase.co';
 var key=window._SB_KEY||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzeW14cWZxemtjaGJzcmJodWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NDU1NzYsImV4cCI6MjA5ODIyMTU3Nn0.H25Z7TSVv0OD0X1QPqlowAr0uLSo88_Bu7R_cW6KAIM';
 async function once(){
  var s=session(),ctrl=new AbortController(),timer=setTimeout(function(){ctrl.abort();},6000);
  try{
   var r=await fetch(base+'/rest/v1/projects?select=*&order=created_at.desc&limit=500',{method:'GET',cache:'no-store',signal:ctrl.signal,headers:{apikey:key,Authorization:'Bearer '+((s&&s.access_token)||key),Accept:'application/json'}});
   var text=await r.text(),data=null;try{data=text?JSON.parse(text):[];}catch(e){data=[];}
   if(!r.ok){var er=new Error((data&&data.message)||('Supabase '+r.status));er.status=r.status;throw er;}
   return arr(data);
  }finally{clearTimeout(timer);}
 }
 try{return await once();}catch(e){if(e&&[401,403].indexOf(e.status)>-1&&await refreshToken())return await once();throw e;}
}
async function obtain(){
 var errors=[];
 try{var a=await viaSupa();if(a.length)return{rows:a,source:'database'};}catch(e){errors.push(e.message||String(e));}
 try{var b=await viaRest();if(b.length)return{rows:b,source:'database-direct'};if(Array.isArray(b))return{rows:b,source:'database-direct'};}catch(e){errors.push(e.message||String(e));}
 var g=globals();if(g.length)return{rows:g,source:'memory'};
 var c=readCache();if(c&&c.rows.length)return{rows:c.rows,source:'cache',cacheAt:c.at};
 throw new Error(errors.filter(Boolean).join(' | ')||'Projektet nuk u kthyen nga databaza.');
}

function page(){var p=document.getElementById('page-workspace-projects');if(!p){var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id='page-workspace-projects';p.className='page';c.appendChild(p);}document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});p.classList.add('active');p.style.display='block';document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='projects');});return p;}
function shell(){var p=page();if(!p)return null;p.innerHTML='<div class="pst-ws-page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Projektet</div><div class="pst-ws-title">Të gjitha projektet</div><div class="pst-ws-sub">Komunikimi, dokumentet, prokurimi dhe financat në të njëjtin kontekst</div></div><div class="pst-ws-actions"><button class="pst-ws-btn" onclick="pstWsLegacy(\'import\')">Pamja klasike</button><button class="pst-ws-btn primary" onclick="pstWsCreate(\'project\')">+ Projekt i ri</button></div></div><div class="pst-ws-toolbar"><input class="pst-ws-input" id="pst-release-project-search" placeholder="Kërko projekt, klient ose referencë" oninput="pstReleaseRenderProjects()"><select class="pst-ws-select" id="pst-release-project-filter" onchange="pstReleaseRenderProjects()"><option value="active">Aktive</option><option value="all">Të gjitha</option><option value="won">Të fituara</option><option value="lost">Të humbura</option><option value="delayed">Të shtyra</option><option value="archived">Të arkivuara</option></select></div><section class="pst-ws-card"><div class="pst-ws-card-body" id="pst-release-project-list"><div class="pst-ws-empty">Duke ngarkuar projektet…</div></div></section></div>';window.scrollTo({top:0,behavior:'auto'});return p;}
function errorView(message){var h=document.getElementById('pst-release-project-list');if(!h)return;h.innerHTML='<div class="pst-ws-empty" style="padding:36px 18px"><div style="font-weight:760;color:#A64B42;margin-bottom:7px">Projektet nuk u ngarkuan</div><div style="max-width:680px;margin:0 auto 14px;line-height:1.55">'+esc(message)+'</div><button class="pst-ws-btn primary" type="button" onclick="pstRescueLoadProjects(true)">Provo përsëri</button></div>';}

window.pstReleaseRenderProjects=function(){
 var h=document.getElementById('pst-release-project-list');if(!h)return;var text=String((document.getElementById('pst-release-project-search')||{}).value||'').toLowerCase().trim(),f=String((document.getElementById('pst-release-project-filter')||{}).value||'active');
 var list=rows.filter(function(p){var s=String(p.status||'').toLowerCase(),ok=f==='all'||(f==='active'&&activeProject(p))||(f==='won'&&['fituar','closedwon','realizuar'].indexOf(s)>-1)||(f==='lost'&&['humbur','closedlost','cancelled'].indexOf(s)>-1)||(f==='delayed'&&['shtyre','shtyrë'].indexOf(s)>-1)||(f==='archived'&&s==='arkivuar');return ok&&(!text||[p.name,p.client,p.ref,p.pipeline_stage].join(' ').toLowerCase().indexOf(text)>-1);});
 h.innerHTML=list.length?'<table class="pst-ws-table"><thead><tr><th>Projekti</th><th>Faza</th><th>Statusi</th><th>Afati</th><th>Aktiviteti</th><th>Veprime</th></tr></thead><tbody>'+list.map(function(p){var st=statusInfo(p.status),a=since(p.last_activity_at||p.last_email_at||p.updated_at||p.created_at);return'<tr onclick="pstReleaseOpenProject(\''+esc(p.id)+'\')" style="cursor:pointer"><td><div class="pst-ws-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-meta">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></td><td>'+esc(stageName(p.pipeline_stage))+'</td><td><span class="pst-ws-status" style="--c:'+st.c+';--bg:'+st.bg+'">'+esc(st.label)+'</span></td><td>'+dateText(p.deadline)+'</td><td>'+(a===null?'—':a===0?'Sot':'Para '+a+' ditësh')+'</td><td><button class="pst-ws-rowaction" onclick="event.stopPropagation();pstReleaseOpenProject(\''+esc(p.id)+'\')">Hap</button></td></tr>';}).join('')+'</tbody></table>':'<div class="pst-ws-empty">'+(rows.length?'Nuk ka projekte që përputhen me filtrin.':'Nuk ka projekte në databazë.')+'</div>';
};
window.pstRescueLoadProjects=async function(force){
 if(loading&&!force)return loading;var my=++requestNo,h=document.getElementById('pst-release-project-list');if(h)h.innerHTML='<div class="pst-ws-empty">Duke ngarkuar projektet…</div>';
 loading=(async function(){try{var result=await obtain();if(my!==requestNo)return;rows=result.rows||[];if(result.source.indexOf('database')===0)saveCache(rows);var badge=document.getElementById('pst-ws-b-projects');if(badge){var n=rows.filter(activeProject).length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}window.pstReleaseRenderProjects();if(result.source==='cache'){var host=document.getElementById('pst-release-project-list');if(host)host.insertAdjacentHTML('afterbegin','<div style="padding:8px 12px;background:#FAF2E3;color:#79521D;font-size:10px;border-radius:8px;margin-bottom:8px">Po shfaqet kopja e fundit e ruajtur. Databaza nuk u përgjigj.</div>');}}catch(e){if(my===requestNo)errorView(e.message||String(e));}finally{if(my===requestNo)loading=null;}})();return loading;
};

var baseGo=window.pstWorkspaceGo;
window.pstWorkspaceGo=function(key){if(key==='projects'){shell();window.pstRescueLoadProjects(false);return;}return typeof baseGo==='function'?baseGo.apply(this,arguments):undefined;};

function start(){
 var tries=0,t=setInterval(function(){
  if(typeof window.pstWorkspaceGo==='function'){
   clearInterval(t);
   var active=document.getElementById('page-workspace-projects');
   if(active&&active.classList.contains('active')){shell();window.pstRescueLoadProjects(false);}
  }else if(++tries>160)clearInterval(t);
 },100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();