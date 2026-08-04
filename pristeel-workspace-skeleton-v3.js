/* PRISTEEL Workspace Skeleton V3
 * Safe visual and navigation enhancements for workspace-v2.
 * No database writes. Existing operational functions remain the source of truth.
 */
(function(){
'use strict';
if(window.__pstWorkspaceSkeletonV3Loaded)return;
window.__pstWorkspaceSkeletonV3Loaded=true;

var B=(window.PRISTEEL_BRAND||{});
var BLUE=B.primary||'#2B67AD';
var BLUE_DARK=B.primaryDark||'#1F528C';
var BLUE_SOFT=B.primarySoft||'#EAF2FB';
var LINE=B.line||'#E4E9ED';
var projectMetaCache={};

function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function dateText(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function money(v,c){var n=parseFloat(v);return isFinite(n)?n.toLocaleString('de-DE',{maximumFractionDigits:0})+' '+(c||'EUR'):'—';}
function stageLabel(v){var m={rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'};return m[v]||v||'—';}
function statusGroup(text){
  var s=norm(text);
  if(/arkiv|archiv/.test(s))return'archived';
  if(/shtyr|postpon|paused|on hold|pezull/.test(s))return'postponed';
  if(/humb|closedlost|cancel|refuz/.test(s))return'lost';
  if(/fituar|closedwon|realizuar|won/.test(s))return'won';
  return'active';
}

function installCss(){
 if(document.getElementById('pst-workspace-skeleton-v3-css'))return;
 var s=document.createElement('style');s.id='pst-workspace-skeleton-v3-css';s.textContent=`
.pst-v3-statusbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.pst-v3-statusbtn{height:34px;border:1px solid ${LINE};background:#fff;border-radius:9px;padding:0 11px;color:#66717A;font-size:10px;font-weight:720;cursor:pointer;display:inline-flex;align-items:center;gap:7px}
.pst-v3-statusbtn:hover{border-color:#C8DAEC;background:#F8FBFE;color:${BLUE_DARK}}
.pst-v3-statusbtn.active{border-color:#C8DAEC;background:${BLUE_SOFT};color:${BLUE_DARK}}
.pst-v3-statuscount{min-width:18px;height:18px;padding:0 5px;border-radius:10px;background:#EEF2F5;color:#77818A;display:inline-flex;align-items:center;justify-content:center;font-size:8px;font-weight:780}
.pst-v3-statusbtn.active .pst-v3-statuscount{background:#fff;color:${BLUE_DARK}}
#page-workspace-projects #pst-ws-project-filter{display:none!important}
#page-workspace-projects .pst-ws-toolbar{margin-bottom:10px}
#page-workspace-projects .pst-ws-card{border-radius:13px}
#page-workspace-projects .pst-ws-table th{background:#FAFBFC;position:sticky;top:0;z-index:1}
#page-workspace-projects .pst-ws-table tbody tr[hidden]{display:none!important}
.pst-v3-project-meta{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-top:15px;padding-top:14px;border-top:1px solid #EDF1F3}
.pst-v3-meta{min-width:0;padding:9px 10px;border:1px solid ${LINE};border-radius:10px;background:#FBFCFD}
.pst-v3-meta-label{font-size:7.8px;text-transform:uppercase;letter-spacing:.75px;color:#939CA4;font-weight:780}
.pst-v3-meta-value{font-size:10.5px;color:#31383E;font-weight:690;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pst-v3-readonly{font-size:8px;color:#98A0A7;margin-top:2px}
.pst-v3-nav-files svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
.pst-v3-section-title{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#9CA4AA;font-weight:760;margin:0 0 7px}
@media(max-width:1100px){.pst-v3-project-meta{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:760px){.pst-v3-project-meta{grid-template-columns:1fr 1fr}.pst-v3-statusbar{overflow-x:auto;flex-wrap:nowrap;padding-bottom:3px}.pst-v3-statusbtn{flex:0 0 auto}}
`;
 document.head.appendChild(s);
}

function ensureFilesNav(){
 var side=document.getElementById('pst-ws-sidebar');if(!side||side.querySelector('.pst-v3-nav-files'))return;
 var apps=side.querySelector('[data-key="apps"]');if(!apps||!apps.parentNode)return;
 var btn=document.createElement('button');btn.type='button';btn.className='pst-ws-navbtn pst-v3-nav-files';btn.setAttribute('data-key','files');
 btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 6h7l2 2h9v11H3z"/><path d="M3 10h18"/></svg><span>Skedarët</span>';
 btn.onclick=function(){document.querySelectorAll('.pst-ws-navbtn').forEach(function(x){x.classList.remove('active');});btn.classList.add('active');if(window.pstWsLegacy)window.pstWsLegacy('library');};
 apps.parentNode.insertBefore(btn,apps);
}

function ensureProjectStatusBar(){
 var page=document.getElementById('page-workspace-projects');if(!page||page.style.display==='none')return;
 var toolbar=page.querySelector('.pst-ws-toolbar'),select=document.getElementById('pst-ws-project-filter');if(!toolbar||!select)return;
 if(!select.querySelector('option[value="postponed"]')){
   select.innerHTML='<option value="active">Aktive</option><option value="won">Të fituara</option><option value="postponed">Të shtyra</option><option value="lost">Të humbura</option><option value="archived">Të arkivuara</option><option value="all">Të gjitha</option>';
 }
 var bar=page.querySelector('.pst-v3-statusbar');if(!bar){
   bar=document.createElement('div');bar.className='pst-v3-statusbar';bar.innerHTML=[['active','Aktive'],['won','Fituara'],['postponed','Shtyra'],['lost','Humbura'],['archived','Arkivuara'],['all','Të gjitha']].map(function(x){return'<button type="button" class="pst-v3-statusbtn" data-v3-filter="'+x[0]+'"><span>'+x[1]+'</span><i class="pst-v3-statuscount" data-v3-count="'+x[0]+'">0</i></button>';}).join('');
   toolbar.parentNode.insertBefore(bar,toolbar);
   bar.addEventListener('click',function(e){var b=e.target.closest('[data-v3-filter]');if(!b)return;select.value=b.getAttribute('data-v3-filter');if(window.pstWsRenderProjects)window.pstWsRenderProjects();});
 }
}

function classifyAndFilterRows(filter){
 var table=document.querySelector('#pst-ws-project-list table');if(!table)return;
 var counts={active:0,won:0,postponed:0,lost:0,archived:0,all:0};
 table.querySelectorAll('tbody tr').forEach(function(row){
   var cells=row.querySelectorAll('td'),status=cells[2]?cells[2].textContent:'';var group=statusGroup(status);row.setAttribute('data-v3-status',group);counts[group]++;counts.all++;
   row.hidden=filter!=='all'&&group!==filter;
 });
 Object.keys(counts).forEach(function(k){var c=document.querySelector('[data-v3-count="'+k+'"]');if(c)c.textContent=String(counts[k]);});
 document.querySelectorAll('.pst-v3-statusbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-v3-filter')===filter);});
 var visible=table.querySelectorAll('tbody tr:not([hidden])').length;
 var empty=document.getElementById('pst-v3-project-empty');if(empty)empty.remove();
 if(!visible){var h=document.getElementById('pst-ws-project-list');if(h){empty=document.createElement('div');empty.id='pst-v3-project-empty';empty.className='pst-ws-empty';empty.textContent='Nuk u gjet asnjë projekt në këtë status.';h.appendChild(empty);}}
}

function wrapProjectRenderer(){
 if(!window.pstWsRenderProjects||window.pstWsRenderProjects.__pstV3Wrapped)return;
 var original=window.pstWsRenderProjects;
 var wrapped=function(){
   ensureProjectStatusBar();
   var select=document.getElementById('pst-ws-project-filter');if(!select)return original.apply(this,arguments);
   var desired=select.value||'active';select.value='all';original.apply(this,arguments);select.value=desired;classifyAndFilterRows(desired);
 };
 wrapped.__pstV3Wrapped=true;wrapped.__pstV3Original=original;window.pstWsRenderProjects=wrapped;
}

function renameWorkspaceLabels(){
 var page=document.getElementById('page-workspace-project');if(!page||page.style.display==='none')return;
 var labels={overview:'Përmbledhja',communication:'Komunikimi',technical:'Teknika & Prokurimi',commercial:'Komercialja & Financat',files:'Skedarët'};
 page.querySelectorAll('.pst-ws-tab[data-tab]').forEach(function(t){var id=t.getAttribute('data-tab');if(labels[id])t.textContent=labels[id];});
 var old=page.querySelector('.pst-ws-project-sub');if(old&&old.textContent.indexOf(' · ')>-1)old.setAttribute('title',old.textContent);
}

async function loadProjectMeta(id){
 if(!id||projectMetaCache[id])return projectMetaCache[id]||null;
 if(typeof window.supaFetch!=='function')return null;
 try{var rows=await window.supaFetch('projects?id=eq.'+encodeURIComponent(id)+'&select=*&limit=1');projectMetaCache[id]=Array.isArray(rows)?rows[0]:null;return projectMetaCache[id];}catch(e){return null;}
}

async function enhanceProjectHeader(){
 var page=document.getElementById('page-workspace-project');if(!page||page.style.display==='none')return;
 var head=page.querySelector('.pst-ws-project-head');if(!head||head.querySelector('.pst-v3-project-meta'))return;
 var id=String(window.__pstCurrentProjectId||window._curProjId||'');if(!id)return;
 var p=await loadProjectMeta(id);if(!p||!head.isConnected||head.querySelector('.pst-v3-project-meta'))return;
 var responsible=p.owner||p.assigned_to||p.responsible||p.project_manager||'—';
 var next=p.next_action||p.next_step||p.next_task||'—';
 var value=p.value||p.amount||p.total_value||p.estimated_value;
 var bar=document.createElement('div');bar.className='pst-v3-project-meta';
 function item(label,value,sub){return'<div class="pst-v3-meta"><div class="pst-v3-meta-label">'+esc(label)+'</div><div class="pst-v3-meta-value" title="'+esc(value)+'">'+esc(value||'—')+'</div>'+(sub?'<div class="pst-v3-readonly">'+esc(sub)+'</div>':'')+'</div>';}
 bar.innerHTML=item('Klienti',p.client||'—')+item('Faza',stageLabel(p.pipeline_stage))+item('Afati',dateText(p.deadline))+item('Përgjegjësi',responsible)+item('Vlera',value?money(value,p.currency||'EUR'):'—');
 head.appendChild(bar);
 if(next&&next!=='—'){
   var note=document.createElement('div');note.className='pst-ws-legacy-note';note.style.marginTop='10px';note.innerHTML='<strong>Veprimi i ardhshëm:</strong> '+esc(next);head.appendChild(note);
 }
}

function polish(){installCss();ensureFilesNav();wrapProjectRenderer();ensureProjectStatusBar();renameWorkspaceLabels();enhanceProjectHeader();}

polish();
var observer=new MutationObserver(function(){polish();});
function observe(){if(document.body)observer.observe(document.body,{childList:true,subtree:true});}
if(document.body)observe();else document.addEventListener('DOMContentLoaded',observe,{once:true});
var tries=0,t=setInterval(function(){polish();if(++tries>80)clearInterval(t);},300);
})();
