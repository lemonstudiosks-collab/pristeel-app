/* PRISTEEL Dashboard Focus: pamje e qetë pa humbur funksionalitet */
(function(){
'use strict';

if(window.__pstDashboardFocusLoaded)return;
window.__pstDashboardFocusLoaded=true;

var state={view:'today',timer:null,moreSignature:''};
try{state.view=sessionStorage.getItem('pst_dashboard_view')||'today';}catch(e){}
if(['today','week','overview'].indexOf(state.view)<0)state.view='today';

var style=document.createElement('style');
style.id='pst-dashboard-focus-style';
style.textContent=`
#pst-focus-tabs{display:flex;align-items:center;gap:4px;width:max-content;background:#ECEFF1;border:1px solid #E1E4E6;border-radius:10px;padding:3px;margin:0 0 14px}
.pst-focus-tab{border:0;background:transparent;color:#6A7177;border-radius:7px;padding:7px 12px;font-size:10.5px;font-weight:700;cursor:pointer;transition:background .14s,color .14s,box-shadow .14s}
.pst-focus-tab:hover{color:#24282B}.pst-focus-tab.active{background:#fff;color:#A65F2E;box-shadow:0 1px 3px rgba(25,30,35,.08)}
#pst-focus-summary{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:0 0 14px}
.pst-focus-stat{display:flex;align-items:center;gap:7px;border:1px solid #E6E8EA;background:#fff;border-radius:10px;padding:8px 11px;cursor:pointer;min-width:150px}
.pst-focus-stat:hover{background:#FAFBFB;border-color:#DDE1E3}.pst-focus-stat-dot{width:8px;height:8px;border-radius:50%;background:var(--dot);box-shadow:0 0 0 4px var(--dot-bg)}
.pst-focus-stat strong{font-size:14px;color:#24282B;line-height:1}.pst-focus-stat span{font-size:9.5px;color:#777E84}
.pst-focus-total{margin-left:auto;font-size:9.5px;color:#8B9196;padding:0 4px}
.pst-dash[data-focus-view="today"] .pst-kpis{display:none!important}
.pst-dash[data-focus-view="today"] .pst-dash-grid{grid-template-columns:1fr!important}
.pst-dash[data-focus-view="today"] .pst-dash-grid>div:nth-child(2){display:none!important}
.pst-dash[data-focus-view="today"] .pst-focus-panel-projects{display:none!important}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions{margin-bottom:0}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-panel-title{font-size:13px}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-panel-body>.pst-action:nth-of-type(n+4){display:none!important}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-panel-body{padding:8px 10px 12px}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-action{padding:12px 10px}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-action-title{font-size:12px}
.pst-dash[data-focus-view="today"] .pst-focus-panel-actions .pst-action-meta{font-size:10px;margin-top:3px}
.pst-dash[data-focus-view="week"] .pst-kpis{display:none!important}
.pst-dash[data-focus-view="week"] .pst-focus-panel-actions,.pst-dash[data-focus-view="week"] .pst-focus-panel-inbox{display:none!important}
.pst-dash[data-focus-view="week"] .pst-dash-grid{grid-template-columns:minmax(0,1.4fr) minmax(300px,.8fr)!important}
.pst-dash[data-focus-view="week"] .pst-focus-panel-projects .pst-panel-body>.pst-project:nth-of-type(n+5){display:none!important}
.pst-dash[data-focus-view="week"] .pst-focus-panel-deadlines .pst-panel-body>.pst-deadline-row:nth-of-type(n+5){display:none!important}
.pst-dash[data-focus-view="overview"] #pst-focus-summary{display:none!important}
.pst-dash[data-focus-view="overview"] .pst-kpis{display:grid!important}
.pst-focus-more{border-top:1px solid #ECEEEF;padding:10px 12px;text-align:center;color:#A65F2E;font-size:9.5px;font-weight:700;cursor:pointer;background:#FCFCFC}
.pst-focus-more:hover{background:#F7EDE5}
@media(max-width:800px){#pst-focus-summary{display:grid;grid-template-columns:1fr 1fr}.pst-focus-stat{min-width:0}.pst-focus-total{grid-column:1/-1;margin-left:0}.pst-dash[data-focus-view="week"] .pst-dash-grid{grid-template-columns:1fr!important}}
`;
document.head.appendChild(style);

function text(id){var el=document.getElementById(id);return el?String(el.textContent||'0').trim():'0';}
function setView(view){
  if(['today','week','overview'].indexOf(view)<0)view='today';
  if(state.view!==view)state.moreSignature='';
  state.view=view;
  try{sessionStorage.setItem('pst_dashboard_view',view);}catch(e){}
  var dash=document.querySelector('#page-home .pst-dash');
  if(!dash)return;
  dash.setAttribute('data-focus-view',view);
  document.querySelectorAll('#pst-focus-tabs .pst-focus-tab').forEach(function(btn){btn.classList.toggle('active',btn.getAttribute('data-view')===view);});
  updateMoreLinks();
}
window.pstDashboardView=setView;

function addTabs(dash){
  if(document.getElementById('pst-focus-tabs'))return;
  var head=dash.querySelector('.pst-dash-head');
  if(!head)return;
  var tabs=document.createElement('div');
  tabs.id='pst-focus-tabs';
  tabs.setAttribute('role','tablist');
  tabs.innerHTML='<button class="pst-focus-tab" data-view="today" onclick="pstDashboardView(\'today\')">Sot</button>'
    +'<button class="pst-focus-tab" data-view="week" onclick="pstDashboardView(\'week\')">Këtë javë</button>'
    +'<button class="pst-focus-tab" data-view="overview" onclick="pstDashboardView(\'overview\')">Pasqyra</button>';
  head.insertAdjacentElement('afterend',tabs);
  var summary=document.createElement('div');
  summary.id='pst-focus-summary';
  summary.innerHTML='<div class="pst-focus-stat" onclick="pstV2Go(\'import\')"><i class="pst-focus-stat-dot" style="--dot:#2F7657;--dot-bg:#EAF5EF"></i><strong id="pst-focus-projects">0</strong><span>projekte aktive</span></div>'
    +'<div class="pst-focus-stat" onclick="pstV2Go(\'outreach\')"><i class="pst-focus-stat-dot" style="--dot:#9B6A22;--dot-bg:#FAF2E3"></i><strong id="pst-focus-requests">0</strong><span>kërkesa pa projekt</span></div>'
    +'<div class="pst-focus-stat" onclick="pstV2Go(\'rfq\')"><i class="pst-focus-stat-dot" style="--dot:#3D6F8E;--dot-bg:#EAF2F7"></i><strong id="pst-focus-rfq">0</strong><span>RFQ pa përgjigje</span></div>'
    +'<div class="pst-focus-total"><span id="pst-focus-tasks">0</span> veprime gjithsej</div>';
  tabs.insertAdjacentElement('afterend',summary);
}

function tagPanels(){
  var map=[['pst-action-list','actions'],['pst-project-list','projects'],['pst-email-list','inbox'],['pst-deadline-list','deadlines']];
  map.forEach(function(pair){var el=document.getElementById(pair[0]);var panel=el&&el.closest('.pst-panel');if(panel)panel.classList.add('pst-focus-panel-'+pair[1]);});
  var actionPanel=document.querySelector('.pst-focus-panel-actions');
  if(actionPanel){
    var title=actionPanel.querySelector('.pst-panel-title');
    var sub=actionPanel.querySelector('.pst-panel-sub');
    if(title&&title.textContent!=='Çfarë kërkon veprim tani')title.textContent='Çfarë kërkon veprim tani';
    if(sub&&sub.textContent!=='Tre veprimet me përparësinë më të lartë')sub.textContent='Tre veprimet me përparësinë më të lartë';
  }
  var projectPanel=document.querySelector('.pst-focus-panel-projects');
  if(projectPanel){var pt=projectPanel.querySelector('.pst-panel-title');if(pt&&pt.textContent!=='Projektet në fokus')pt.textContent='Projektet në fokus';}
}

function syncSummary(){
  var pairs=[['pst-focus-projects','pst-kpi-projects'],['pst-focus-requests','pst-kpi-unmatched'],['pst-focus-rfq','pst-kpi-rfqs'],['pst-focus-tasks','pst-kpi-tasks']];
  pairs.forEach(function(p){var a=document.getElementById(p[0]),v=text(p[1]);if(a&&a.textContent!==v)a.textContent=v;});
}

function more(host,cls,label,page){
  if(!host)return;
  var old=host.querySelector('.'+cls);if(old)old.remove();
  var el=document.createElement('div');el.className='pst-focus-more '+cls;el.textContent=label;el.addEventListener('click',function(){if(typeof window.pstV2Go==='function')window.pstV2Go(page);});host.appendChild(el);
}
function updateMoreLinks(){
  var ah=document.getElementById('pst-action-list');
  var ph=document.getElementById('pst-project-list');
  var dh=document.getElementById('pst-deadline-list');
  var ac=ah?ah.querySelectorAll(':scope > .pst-action').length:0;
  var pc=ph?ph.querySelectorAll(':scope > .pst-project').length:0;
  var dc=dh?dh.querySelectorAll(':scope > .pst-deadline-row').length:0;
  var signature=[state.view,ac,pc,dc].join('|');
  if(signature===state.moreSignature)return;
  state.moreSignature=signature;
  document.querySelectorAll('.pst-focus-more').forEach(function(x){x.remove();});
  if(state.view==='today'&&ac>3){
    more(ah,'pst-focus-more-actions','Shiko edhe '+(ac-3)+' veprime','qendra');
  }else if(state.view==='week'){
    if(pc>4)more(ph,'pst-focus-more-projects','Shiko të gjitha projektet','import');
    if(dc>4)more(dh,'pst-focus-more-deadlines','Shiko të gjitha afatet','import');
  }
}

function apply(){
  var page=document.getElementById('page-home');
  var dash=page&&page.querySelector('.pst-dash');
  if(!dash)return;
  addTabs(dash);
  tagPanels();
  syncSummary();
  setView(state.view);
}
function start(){
  var page=document.getElementById('page-home');
  if(!page)return false;
  apply();
  setInterval(apply,1000);
  return true;
}
var tries=0,boot=setInterval(function(){if(start()||++tries>160)clearInterval(boot);},250);

})();
