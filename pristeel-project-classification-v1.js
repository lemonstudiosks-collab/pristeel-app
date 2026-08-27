/* PRISTEEL Project Work Surface v2
 * Final presentation/filter layer for Projects.
 * Keeps origin/work-model classification as hidden data, removes it from daily UI.
 * No business-data writes. No observers or polling.
 */
(function(){
'use strict';
if(window.__pstProjectClassificationV1)return;
window.__pstProjectClassificationV1=true;
var state={work:'all'};
var repair={attempts:0,pending:false};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function rowMap(){var out={};A(window.__pstWorkspaceProjectRows||window._allProjectsCache).forEach(function(r){if(r&&r.id)out[S(r.id)]=r;});return out;}
function originLabel(v){return({tender:'TENDER',client:'KLIENT',outreach:'OUTREACH',gmail:'GMAIL'})[S(v)]||'';}
function modelLabel(v){return({supply:'FURNIZIM',production:'PRODHIM',production_installation:'PRODHIM + MONTAZH'})[S(v)]||'';}
function classification(r){return[originLabel(r&&r.origin_type),modelLabel(r&&r.work_model)].filter(Boolean);}
function terminal(r){var s=N(r&&r.status);return /humb|lost|cancel|refuz|arkiv|archiv|realizuar|mbyllur|closed/.test(s);}
function execution(r){var stage=S(r&&r.pipeline_stage);var op=N(r&&r.operational_state);var s=N(r&&r.status);return !terminal(r)&&(/execution/.test(op)||/fituar|won/.test(s)||['production_control','factory_audit','transport'].indexOf(stage)>-1);}
function waiting(r){if(terminal(r)||execution(r))return false;var op=N(r&&r.operational_state),s=N(r&&r.status);if(/^wait_/.test(op))return true;if(/action_required|active_work|execution/.test(op))return false;return /pritje|waiting|pending/.test(s);}
function workState(r){if(terminal(r))return'closed';if(execution(r))return'execution';if(waiting(r))return'waiting';return'action';}
function stateLabel(r){return({action:'Kërkon veprim',waiting:'Në pritje',execution:'Në realizim',closed:'Mbyllur'})[workState(r)]||'Kërkon veprim';}
function stageAction(r){
  var stage=S(r&&r.pipeline_stage),op=N(r&&r.operational_state);
  if(workState(r)==='closed')return'Projekti është mbyllur';
  if(workState(r)==='waiting'){
    if(/supplier/.test(op))return'Në pritje të furnitorit';
    if(/client/.test(op))return'Në pritje të klientit';
    return'Në pritje të palës tjetër';
  }
  if(workState(r)==='execution'){
    if(stage==='transport')return'Vazhdo dorëzimin';
    if(stage==='factory_audit')return'Vazhdo kontrollin / auditimin';
    return'Vazhdo ekzekutimin';
  }
  return({
    rfq_in:'Përgatit kërkesën / RFQ',
    technical_review:'Përfundo përgatitjen teknike',
    supplier_selection:'Mblidh ose krahaso ofertat',
    pricing:'Vendos çmimin e shitjes',
    client_offer:'Finalizo ofertën për klientin',
    commercial:'Shqyrto komunikimin me klientin'
  })[stage]||'Hap projektin dhe vazhdo punën';
}
function stateStyle(k){
  if(k==='waiting')return{c:'#3F7F98',bg:'#EAF5F8'};
  if(k==='execution')return{c:'#2F7657',bg:'#EAF5EF'};
  if(k==='closed')return{c:'#68747B',bg:'#EEF2F4'};
  return{c:'#9B6A22',bg:'#FAF2E3'};
}
function deadlineText(r){
  var raw=S(r&&r.deadline).trim();if(!raw)return'Pa afat kritik';
  var d=new Date(raw);if(isNaN(d.getTime()))return raw;
  var today=new Date();today.setHours(0,0,0,0);d.setHours(0,0,0,0);var days=Math.ceil((d-today)/86400000);
  if(workState(r)==='closed')return'Përfunduar';
  if(days<0)return'Vonuar '+Math.abs(days)+' ditë';
  if(days===0)return'Afati sot';
  if(days<=7)return'Edhe '+days+' ditë';
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});
}
function workFilterLabel(k){return({all:'Të gjitha',action:'Kërkon veprim',waiting:'Në pritje',execution:'Në realizim',closed:'Të mbyllura'})[k]||k;}
function workCounts(){var c={all:0,action:0,waiting:0,execution:0,closed:0};Object.values(rowMap()).forEach(function(r){var k=workState(r);c.all++;if(c[k]!=null)c[k]++;});return c;}
function ensureWorkFilters(p){
  var controls=p.querySelector('.pst-pm-controls');if(!controls)return null;
  var bar=document.getElementById('pst-pws-filterbar');
  if(!bar){bar=document.createElement('div');bar.id='pst-pws-filterbar';controls.appendChild(bar);bar.addEventListener('click',function(e){var b=e.target.closest('[data-pws-work]');if(!b)return;state.work=b.getAttribute('data-pws-work')||'all';decorate();});}
  var c=workCounts(),keys=['all','action','waiting','execution','closed'];
  bar.innerHTML=keys.map(function(k){return'<button type="button" data-pws-work="'+k+'" class="'+(state.work===k?'on':'')+'"><span>'+E(workFilterLabel(k))+'</span><b>'+Number(c[k]||0)+'</b></button>';}).join('');
  return bar;
}
function forceAllProjects(p){
  var all=p.querySelector('[data-pm-filter="all"]');
  if(all&&!all.classList.contains('on')){all.click();return false;}
  return true;
}
function forceList(p){
  try{localStorage.setItem('pristeel_projects_modern_view','list');}catch(e){}
  var list=p.querySelector('[data-pm-view="list"]'),board=p.querySelector('[data-pm-view="board"]');
  if(board&&board.classList.contains('on')&&list){list.click();return false;}
  return true;
}
function rewriteRow(el,r){
  if(!r)return;
  var k=workState(r),sty=stateStyle(k),meta=el.querySelector('.pst-pm-meta');
  el.setAttribute('data-pws-state',k);
  if(meta){meta.innerHTML='<div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Gjendja</div><span class="pst-pm-badge" style="--c:'+sty.c+';--bg:'+sty.bg+'">'+E(stateLabel(r))+'</span></div><div class="pst-pm-meta-block pst-pws-next"><div class="pst-pm-meta-label">Hapi tjetër</div><div class="pst-pm-meta-value">'+E(stageAction(r))+'</div></div><div class="pst-pm-meta-block"><div class="pst-pm-meta-label">Afati</div><div class="pst-pm-meta-value">'+E(deadlineText(r))+'</div></div>';}
  el.querySelectorAll('.pst-pc-badges').forEach(function(x){x.remove();});
  var desc=el.querySelector('.pst-pm-desc');if(desc)desc.style.display='none';
  el.style.display=state.work==='all'||state.work===k?'':'none';
}
function simplifyHeader(p){
  var dup=p.querySelector('#pst-pdm-btn'),refresh=p.querySelector('#pst-pm-refresh'),toggle=p.querySelector('.pst-pm-toggle'),sort=p.querySelector('#pst-pm-sort'),oldFilters=p.querySelector('#pst-pm-filters'),classFilters=p.querySelector('#pst-pc-filterbar');
  if(dup)dup.style.display='none';if(refresh)refresh.style.display='none';if(toggle)toggle.style.display='none';if(sort)sort.style.display='none';if(oldFilters)oldFilters.style.display='none';if(classFilters)classFilters.style.display='none';
  p.querySelectorAll('.pst-pc-badges').forEach(function(x){x.remove();});
  var sub=p.querySelector('.pst-pm-sub');if(sub)sub.textContent='Projekt → gjendja reale → hapi tjetër → afati kritik.';
}
function repairBlankList(p,map){
  var rows=p.querySelectorAll('.pst-pm-row[data-project-id]');
  if(rows.length){repair.attempts=0;return rows;}
  var known=Object.keys(map).length;
  if(!known||repair.pending||repair.attempts>=2||typeof window.pstProjectsModernRefresh!=='function')return rows;
  repair.pending=true;repair.attempts++;
  try{
    Promise.resolve(window.pstProjectsModernRefresh()).finally(function(){repair.pending=false;schedule();});
  }catch(e){repair.pending=false;}
  return rows;
}
function decorate(){
  var p=document.getElementById('page-workspace-projects');if(!p||!p.classList.contains('active'))return false;
  if(!forceAllProjects(p))return false;
  if(!forceList(p))return false;
  simplifyHeader(p);ensureWorkFilters(p);
  var map=rowMap(),rows=repairBlankList(p,map);
  rows.forEach(function(el){rewriteRow(el,map[S(el.getAttribute('data-project-id'))]);});
  return rows.length>0||Object.keys(map).length===0;
}
function css(){if(document.getElementById('pst-project-classification-css'))return;var s=document.createElement('style');s.id='pst-project-classification-css';s.textContent=`
#page-workspace-projects #pst-pm-sort{display:none!important}
#pst-pws-filterbar{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap;margin-top:11px}
#pst-pws-filterbar button{min-height:48px;border:1px solid #DCE6E9;border-radius:12px;background:#fff;padding:0 13px;color:#61747C;font-size:9.5px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 2px 8px rgba(38,62,72,.025);transition:.15s}
#pst-pws-filterbar button:hover{border-color:#B9D3DC;background:#F8FBFC}
#pst-pws-filterbar button b{min-width:24px;height:24px;border-radius:999px;background:#F0F4F5;color:#6B7B82;display:inline-flex;align-items:center;justify-content:center;font-size:8.5px}
#pst-pws-filterbar button.on{background:#EAF5F8;border-color:#9FC9D7;color:#2F7890;box-shadow:0 5px 15px rgba(63,127,152,.08)}
#pst-pws-filterbar button.on b{background:#fff;color:#2F7890}
#page-workspace-projects .pst-pm-row{grid-template-columns:minmax(260px,1.35fr) minmax(500px,1.65fr) auto}
#page-workspace-projects .pst-pm-meta{grid-template-columns:minmax(100px,.6fr) minmax(240px,1.65fr) minmax(105px,.7fr)}
#page-workspace-projects .pst-pws-next .pst-pm-meta-value{font-weight:730;color:#34444C}
#page-workspace-projects .pst-pc-badges,#page-workspace-projects #pst-pc-filterbar{display:none!important}
@media(max-width:980px){#page-workspace-projects .pst-pm-row{grid-template-columns:1fr auto}#page-workspace-projects .pst-pm-meta{grid-column:1/-1;grid-template-columns:1fr 2fr 1fr}}
@media(max-width:720px){#page-workspace-projects .pst-pm-row{grid-template-columns:1fr}#page-workspace-projects .pst-pm-meta{grid-template-columns:1fr}.pst-pm-actions{justify-content:flex-start}}
`;document.head.appendChild(s);}
function schedule(){[0,80,220,600].forEach(function(ms){setTimeout(decorate,ms);});}
function wrap(){['pstProjectsModernOpen','pstProjectsModernRefresh'].forEach(function(k){var fn=window[k];if(typeof fn!=='function'||fn.__pstClassificationWrapped)return;var w=function(){var out=fn.apply(this,arguments);Promise.resolve(out).finally(schedule);return out;};w.__pstClassificationWrapped=true;w.__base=fn;window[k]=w;});}
var contextCache={};
async function loadContext(projectId,force){
  projectId=S(projectId||window.__pstCurrentProjectId||window._curProjId).trim();if(!projectId||typeof window.supaFetch!=='function')return[];
  if(!force&&contextCache[projectId])return contextCache[projectId];
  try{
    var facts=A(await window.supaFetch('pppp_project_context_current_v?project_id=eq.'+encodeURIComponent(projectId)+'&select=id,project_id,category,subject,fact_key,value,source_type,source_ref,evidence_status,confidence,fact_status,created_at,updated_at&order=updated_at.desc&limit=200'));
    contextCache[projectId]=facts;window.__pstPPPPContextFacts=facts;
    if(window.__pstIntegrityLastData&&S(window.__pstIntegrityLastData.project_id||window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id)===projectId)window.__pstIntegrityLastData.contextFacts=facts;
    try{document.dispatchEvent(new CustomEvent('pst:project-context-ready',{detail:{project_id:projectId,facts:facts}}));}catch(e){}
    return facts;
  }catch(e){console.warn('PPPP project context load:',e);return[];}
}
function scheduleContext(){[60,220,700].forEach(function(ms){setTimeout(function(){loadContext();},ms);});}
css();wrap();[0,300,900,1800].forEach(function(ms){setTimeout(function(){wrap();decorate();},ms);});
document.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('#page-workspace-projects,[data-pm-open],[onclick*="pstOpenProjectWorkspace"]'):null;if(t){setTimeout(decorate,20);scheduleContext();}},true);
document.addEventListener('pst:modules-ready',function(){wrap();schedule();scheduleContext();},{once:true});
window.PSTProjectClassificationV1={decorate:decorate,schedule:schedule,classification:classification,matches:function(r){return state.work==='all'||workState(r)===state.work;},workState:workState,nextAction:stageAction,_state:state,_repair:repair};
window.PSTProjectContextBridge={load:loadContext,get:function(projectId){return contextCache[S(projectId||window.__pstCurrentProjectId||window._curProjId)]||[];},clear:function(projectId){if(projectId)delete contextCache[S(projectId)];else contextCache={};}};
})();