/* PRISTEEL Projects Daily Worklist v1
 * Final presentation layer for the Projects register.
 * Keeps the canonical project engine and business writes untouched.
 * No observers, no polling, no Supabase writes.
 */
(function(){
'use strict';
if(window.__pstProjectsDailyWorklistV1)return;
window.__pstProjectsDailyWorklistV1=true;

var PAGE_ID='page-workspace-projects';
var dailyFilter='all';
var forcingBaseAll=false;

function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function rows(){return Array.isArray(window.__pstWorkspaceProjectRows)?window.__pstWorkspaceProjectRows:(Array.isArray(window._allProjectsCache)?window._allProjectsCache:[]);}
function mapRows(){var out={};rows().forEach(function(p){if(p&&p.id)out[S(p.id)]=p;});return out;}
function lower(v){return S(v).trim().toLowerCase();}
function isTerminal(p){var status=lower(p&&p.status),stage=lower(p&&p.pipeline_stage),op=lower(p&&p.operational_state);return op==='closed'||['closed','archived','lost','closed_lost','closed_won','cancelled','canceled'].indexOf(status)>=0||['closed','closed_lost','closed_won','archived','cancelled','canceled'].indexOf(stage)>=0;}
function stateOf(p){
  if(isTerminal(p))return 'closed';
  var op=lower(p&&p.operational_state),stage=lower(p&&p.pipeline_stage),status=lower(p&&p.status);
  if(op==='wait_for_client'||op==='waiting'||op==='wait_for_supplier'||op==='wait_for_external')return 'waiting';
  if(status==='won'||['production_control','factory_audit','transport','execution','installation','delivery'].indexOf(stage)>=0)return 'execution';
  return 'action';
}
function stateLabel(state){return({action:'Veprim',waiting:'Në pritje',execution:'Ekzekutim',closed:'Mbyllur'})[state]||'Veprim';}
function nextAction(p,state){
  var stage=lower(p&&p.pipeline_stage),op=lower(p&&p.operational_state);
  if(state==='closed')return 'Asnjë veprim';
  if(state==='waiting'){
    if(op==='wait_for_supplier')return 'Në pritje të furnitorit';
    if(op==='wait_for_external')return 'Në pritje të palës së jashtme';
    return 'Në pritje të klientit';
  }
  if(state==='execution'){
    if(stage==='production_control')return 'Vazhdo prodhimin';
    if(stage==='factory_audit')return 'Kontrollo auditimin';
    if(stage==='transport'||stage==='delivery')return 'Vazhdo dorëzimin';
    if(stage==='installation')return 'Vazhdo montimin';
    return 'Vazhdo ekzekutimin';
  }
  if(stage==='technical_review')return 'Përfundo përgatitjen teknike';
  if(stage==='rfq_in')return 'Përgatit ose kontrollo RFQ';
  if(stage==='supplier_selection')return 'Shqyrto furnitorët dhe ofertat';
  if(stage==='pricing')return 'Vendos çmimin e shitjes';
  if(stage==='client_offer')return 'Kontrollo dhe finalizo ofertën';
  if(stage==='commercial')return 'Shqyrto komunikimin me klientin';
  return 'Hap projektin dhe vazhdo punën';
}
function deadlineValue(p,state){
  if(state==='closed')return 'Përfunduar';
  var raw=p&&(p.deadline||p.due_date||p.execution_deadline||p.offer_deadline);
  if(!raw)return '—';
  var d=new Date(raw);if(Number.isNaN(d.getTime()))return S(raw);
  return new Intl.DateTimeFormat('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
}
function deadlineTone(p,state){
  if(state==='closed')return '';
  var raw=p&&(p.deadline||p.due_date||p.execution_deadline||p.offer_deadline);if(!raw)return '';
  var d=new Date(raw);if(Number.isNaN(d.getTime()))return '';
  var days=(d.getTime()-Date.now())/86400000;
  if(days<0)return 'overdue';
  if(days<=3)return 'soon';
  return '';
}
function installStyle(){
  if(document.getElementById('pst-projects-daily-worklist-css'))return;
  var s=document.createElement('style');s.id='pst-projects-daily-worklist-css';s.textContent=`
#${PAGE_ID} #pst-pdm-btn,
#${PAGE_ID} #pst-pm-refresh,
#${PAGE_ID} #pst-pm-sort,
#${PAGE_ID} [data-pm-view],
#${PAGE_ID} #pst-pm-filters,
#${PAGE_ID} #pst-pc-filterbar,
#${PAGE_ID} .pst-pc-badges,
#${PAGE_ID} .pst-pm-desc{display:none!important}
#${PAGE_ID} .pst-pdw-hidden{display:none!important}
#${PAGE_ID} #pst-pdw-filters{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:10px 0 12px}
#${PAGE_ID} #pst-pdw-filters button{height:31px;padding:0 12px;border:1px solid #DCE5E9;border-radius:999px;background:#fff;color:#66757C;font-size:11px;font-weight:760;cursor:pointer}
#${PAGE_ID} #pst-pdw-filters button.on{background:#173D5E;border-color:#173D5E;color:#fff}
#${PAGE_ID} .pst-pm-meta{grid-template-columns:minmax(88px,.7fr) minmax(210px,1.65fr) minmax(105px,.8fr)!important;gap:9px!important}
#${PAGE_ID} .pst-pdw-state{display:inline-flex;align-items:center;width:max-content;max-width:100%;padding:4px 8px;border-radius:999px;font-size:9px;font-weight:850;letter-spacing:.02em}
#${PAGE_ID} .pst-pdw-state.action{background:#FCEFC8;color:#785A00}
#${PAGE_ID} .pst-pdw-state.waiting{background:#E9EEF2;color:#53636C}
#${PAGE_ID} .pst-pdw-state.execution{background:#DCEFE5;color:#286145}
#${PAGE_ID} .pst-pdw-state.closed{background:#EEF1F2;color:#758087}
#${PAGE_ID} .pst-pdw-next{font-weight:760;color:#263940}
#${PAGE_ID} .pst-pdw-deadline.overdue{color:#A43A30;font-weight:850}
#${PAGE_ID} .pst-pdw-deadline.soon{color:#8A6410;font-weight:850}
@media(max-width:860px){#${PAGE_ID} .pst-pm-meta{grid-template-columns:1fr!important}#${PAGE_ID} .pst-pdw-kv{display:grid;grid-template-columns:86px 1fr;align-items:center}}
`;document.head.appendChild(s);
}
function resetHiddenClassification(){
  try{var C=window.PSTProjectClassificationV1;if(C&&C._state){C._state.origin='all';C._state.model='all';if(typeof C.decorate==='function')C.decorate();}}catch(e){console.warn('PPPP Projects daily classification reset:',e);}
}
function forceBaseAll(){
  if(forcingBaseAll)return false;
  var page=document.getElementById(PAGE_ID);if(!page||!page.classList.contains('active'))return false;
  var all=page.querySelector('[data-pm-filter="all"]');
  if(!all||all.classList.contains('active')||all.classList.contains('on'))return false;
  forcingBaseAll=true;
  try{all.click();}finally{setTimeout(function(){forcingBaseAll=false;decorate();},40);}
  return true;
}
function ensureFilters(){
  var page=document.getElementById(PAGE_ID);if(!page)return null;
  var bar=document.getElementById('pst-pdw-filters');if(bar)return bar;
  bar=document.createElement('div');bar.id='pst-pdw-filters';bar.setAttribute('aria-label','Filtri i punës');
  bar.innerHTML='<button data-pdw-filter="all">Të gjitha</button><button data-pdw-filter="action">Veprim</button><button data-pdw-filter="waiting">Në pritje</button><button data-pdw-filter="execution">Ekzekutim</button><button data-pdw-filter="closed">Mbyllur</button>';
  var search=page.querySelector('#pst-pm-search');var anchor=search&&search.closest('.pst-pm-toolbar,.pst-pm-tools,.pst-pm-controls');
  if(anchor)anchor.insertAdjacentElement('afterend',bar);else{var list=page.querySelector('#pst-pm-list,.pst-pm-list');if(list)list.insertAdjacentElement('beforebegin',bar);else page.prepend(bar);}
  return bar;
}
function renderMeta(row,p){
  var meta=row.querySelector('.pst-pm-meta');if(!meta)return;
  var state=stateOf(p),tone=deadlineTone(p,state);
  meta.innerHTML='<div class="pst-pdw-kv"><span class="pst-pm-label">Gjendja</span><span class="pst-pdw-state '+E(state)+'">'+E(stateLabel(state))+'</span></div>'+
    '<div class="pst-pdw-kv"><span class="pst-pm-label">Hapi tjetër</span><span class="pst-pdw-next">'+E(nextAction(p,state))+'</span></div>'+
    '<div class="pst-pdw-kv"><span class="pst-pm-label">Afati</span><span class="pst-pdw-deadline '+E(tone)+'">'+E(deadlineValue(p,state))+'</span></div>';
  row.setAttribute('data-pdw-state',state);
  row.classList.toggle('pst-pdw-hidden',dailyFilter!=='all'&&dailyFilter!==state);
}
function decorate(){
  var page=document.getElementById(PAGE_ID);if(!page||!page.classList.contains('active'))return false;
  installStyle();resetHiddenClassification();
  if(forceBaseAll())return true;
  var bar=ensureFilters();if(bar)bar.querySelectorAll('[data-pdw-filter]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-pdw-filter')===dailyFilter);});
  var map=mapRows();
  page.querySelectorAll('.pst-pm-row[data-project-id]').forEach(function(row){var p=map[S(row.getAttribute('data-project-id'))];if(p)renderMeta(row,p);});
  return true;
}
function schedule(){[0,70,180,420].forEach(function(ms){setTimeout(decorate,ms);});}
function canonicalOpen(target,event){
  if(!target||typeof window.pstOpenProjectWorkspace!=='function')return false;
  var row=target.closest('.pst-pm-row[data-project-id]');var id=row&&row.getAttribute('data-project-id');if(!id)return false;
  event.preventDefault();event.stopPropagation();if(typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation();
  window.pstOpenProjectWorkspace(id);return true;
}
document.addEventListener('click',function(e){
  var page=e.target&&e.target.closest?e.target.closest('#'+PAGE_ID):null;if(!page)return;
  var f=e.target.closest('[data-pdw-filter]');if(f){e.preventDefault();dailyFilter=f.getAttribute('data-pdw-filter')||'all';decorate();return;}
  var open=e.target.closest('[data-pm-open="1"]');if(open&&canonicalOpen(open,e))return;
  if(e.target.closest('#pst-pm-search,#pst-pm-new,[data-pm-filter],[data-pm-more]'))schedule();
},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});
document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.addEventListener('pageshow',schedule,{once:true});
if(document.readyState!=='loading')schedule();
window.PSTProjectsDailyWorklistV1={apply:decorate,schedule:schedule,stateOf:stateOf,nextAction:nextAction,_filter:function(){return dailyFilter;}};
})();
