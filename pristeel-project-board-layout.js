/* PRISTEEL: bordi i projekteve pa scroll horizontal */
(function(){
'use strict';
if(window.__pstProjectBoardLayoutLoaded)return;
window.__pstProjectBoardLayoutLoaded=true;

var STYLE_ID='pst-project-board-layout-style';
var installed=false;
var originalRender=null;

function esc(value){
  return String(value==null?'':value)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function js(value){return JSON.stringify(String(value==null?'':value));}
function stages(){return Array.isArray(window.PIPELINE_STAGES)?window.PIPELINE_STAGES:[];}
function projects(){return Array.isArray(window._allProjectsCache)?window._allProjectsCache:[];}
function stageIndex(stageId){
  var list=stages();
  for(var i=0;i<list.length;i++)if(list[i].id===stageId)return i;
  return 0;
}
function statusInfo(project){
  var map=window.PROJ_STATUS||{};
  return map[project.status||'pritje']||{n:project.status||'Në pritje',c:'#6B7280',bg:'#F3F4F6'};
}
function projectCard(project){
  var list=stages();
  var idx=stageIndex(project.pipeline_stage||'rfq_in');
  var st=statusInfo(project);
  var lost=project.status==='humbur';
  var id=js(project.id);
  var client=project.client||'';
  var deadline=project.deadline?new Date(project.deadline+'T12:00:00').toLocaleDateString('sq-AL',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  var prev=idx>0?'<button type="button" class="pst-pb-move" title="Kaloje një hap prapa" onclick=\'event.stopPropagation();pstMoveProjectStage('+id+',-1)\'>&larr;</button>':'';
  var next=idx<list.length-1?'<button type="button" class="pst-pb-move" title="Kaloje në hapin tjetër" onclick=\'event.stopPropagation();pstMoveProjectStage('+id+',1)\'>&rarr;</button>':'';
  return '<article class="pst-pb-card'+(lost?' is-lost':'')+'" onclick=\'if(window.openOverview)openOverview('+id+')\'>'
    +'<div class="pst-pb-card-title">'+esc(project.name||'(pa emër)')+'</div>'
    +(client?'<div class="pst-pb-card-client">'+esc(client)+'</div>':'')
    +'<div class="pst-pb-card-foot">'
      +'<span class="pst-pb-status" style="color:'+esc(st.c)+';background:'+esc(st.bg)+'">'+esc(st.n)+'</span>'
      +(deadline?'<span class="pst-pb-deadline">'+esc(deadline)+'</span>':'')
      +'<span class="pst-pb-moves">'+prev+next+'</span>'
    +'</div>'
  +'</article>';
}
function stageColumn(stage,stageNumber,allProjects){
  var rows=allProjects.filter(function(project){return (project.pipeline_stage||'rfq_in')===stage.id;});
  return '<section class="pst-pb-stage">'
    +'<header class="pst-pb-stage-head">'
      +'<span class="pst-pb-stage-number">'+stageNumber+'</span>'
      +'<span class="pst-pb-stage-name">'+esc(stage.n)+'</span>'
      +'<span class="pst-pb-count">'+rows.length+'</span>'
    +'</header>'
    +'<div class="pst-pb-stage-list">'
      +(rows.length?rows.map(projectCard).join(''):'<div class="pst-pb-empty">Asnjë projekt</div>')
    +'</div>'
  +'</section>';
}
function addStyle(){
  if(document.getElementById(STYLE_ID))return;
  var style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent='\
#project-board{overflow:visible!important;max-width:none!important;padding-bottom:8px}\
.pst-pb-wrap{display:flex;flex-direction:column;gap:20px;width:100%;min-width:0}\
.pst-pb-phase{border:1px solid var(--border,#e5e7eb);border-radius:14px;background:rgba(255,255,255,.76);padding:14px;box-shadow:0 1px 4px rgba(26,26,25,.05)}\
.pst-pb-phase-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:11px;padding:0 2px}\
.pst-pb-phase-title{font-size:12px;font-weight:750;letter-spacing:.45px;text-transform:uppercase;color:var(--text2,#5c5a57)}\
.pst-pb-phase-total{font-size:10.5px;font-weight:700;color:var(--text3,#96948f);background:var(--bg2,#fafaf9);border:1px solid var(--border,#ebeae8);border-radius:999px;padding:3px 9px}\
.pst-pb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;align-items:start}\
.pst-pb-stage{min-width:0;border:1px solid var(--border,#ebeae8);border-radius:11px;background:#fff;overflow:hidden}\
.pst-pb-stage-head{min-height:44px;display:grid;grid-template-columns:24px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 10px;background:var(--bg2,#fafaf9);border-bottom:1px solid var(--border,#ebeae8)}\
.pst-pb-stage-number{width:23px;height:23px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid var(--border2,#dedcd9);font-size:10px;font-weight:800;color:var(--text2,#5c5a57)}\
.pst-pb-stage-name{font-size:11.5px;font-weight:750;line-height:1.25;color:var(--text,#1a1a19);min-width:0}\
.pst-pb-count{font-size:10.5px;font-weight:800;color:var(--bronze,#a65f2e);background:var(--bronze-bg,rgba(166,95,46,.08));border-radius:999px;padding:2px 7px}\
.pst-pb-stage-list{padding:8px;display:flex;flex-direction:column;gap:7px;max-height:330px;min-height:82px;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable}\
.pst-pb-card{border:1px solid var(--border,#ebeae8);border-radius:9px;background:#fff;padding:10px;cursor:pointer;box-shadow:0 1px 2px rgba(26,26,25,.04);transition:box-shadow .14s ease,border-color .14s ease,transform .14s ease}\
.pst-pb-card:hover{border-color:var(--border2,#dedcd9);box-shadow:0 4px 12px rgba(26,26,25,.09);transform:translateY(-1px)}\
.pst-pb-card.is-lost{opacity:.58}\
.pst-pb-card-title{font-size:12.5px;font-weight:720;line-height:1.3;color:var(--text,#1a1a19);overflow-wrap:anywhere}\
.pst-pb-card-client{font-size:10.5px;color:var(--text3,#96948f);line-height:1.35;margin-top:4px;overflow-wrap:anywhere}\
.pst-pb-card-foot{display:flex;align-items:center;gap:6px;margin-top:9px;min-height:24px}\
.pst-pb-status{font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.25px;border-radius:5px;padding:2px 6px;white-space:nowrap}\
.pst-pb-deadline{font-size:9px;color:var(--text3,#96948f);white-space:nowrap}\
.pst-pb-moves{margin-left:auto;display:flex;gap:4px}\
.pst-pb-move{width:24px;height:24px;border:1px solid var(--border2,#dedcd9);border-radius:6px;background:#fff;color:var(--text2,#5c5a57);cursor:pointer;font-size:13px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center}\
.pst-pb-move:hover{background:var(--bronze-bg,rgba(166,95,46,.08));border-color:var(--bronze,#a65f2e);color:var(--bronze,#a65f2e)}\
.pst-pb-empty{min-height:64px;display:flex;align-items:center;justify-content:center;color:var(--text3,#96948f);font-size:10.5px;font-style:italic}\
@media(max-width:1100px){.pst-pb-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}\
@media(max-width:720px){.pst-pb-phase{padding:10px}.pst-pb-grid{grid-template-columns:1fr}.pst-pb-stage-list{max-height:280px}}';
  document.head.appendChild(style);
}
function renderLayout(){
  var board=document.getElementById('project-board');
  var list=stages();
  if(!board||!list.length)return;
  addStyle();
  var all=projects();
  var phases=[
    {title:'1 · Vlerësimi dhe burimi',from:0,to:3},
    {title:'2 · Oferta dhe marrëveshja',from:3,to:6},
    {title:'3 · Realizimi dhe dorëzimi',from:6,to:9}
  ];
  board.innerHTML='<div class="pst-pb-wrap">'+phases.map(function(phase){
    var subset=list.slice(phase.from,phase.to);
    if(!subset.length)return '';
    var ids=subset.map(function(stage){return stage.id;});
    var total=all.filter(function(project){return ids.indexOf(project.pipeline_stage||'rfq_in')>-1;}).length;
    return '<div class="pst-pb-phase">'
      +'<div class="pst-pb-phase-head"><div class="pst-pb-phase-title">'+esc(phase.title)+'</div><div class="pst-pb-phase-total">'+total+' projekte</div></div>'
      +'<div class="pst-pb-grid">'+subset.map(function(stage,index){return stageColumn(stage,phase.from+index+1,all);}).join('')+'</div>'
    +'</div>';
  }).join('')+'</div>';
}
window.pstMoveProjectStage=function(projectId,direction){
  var project=projects().filter(function(row){return String(row.id)===String(projectId);})[0];
  var list=stages();
  if(!project||!list.length)return;
  var current=stageIndex(project.pipeline_stage||'rfq_in');
  var next=Math.max(0,Math.min(list.length-1,current+Number(direction||0)));
  if(next===current)return;
  if(typeof window.projSetPipelineStage==='function')window.projSetPipelineStage(project.id,list[next].id);
};
function install(){
  if(installed||typeof window.renderProjectBoard!=='function')return false;
  installed=true;
  originalRender=window.renderProjectBoard;
  window.renderProjectBoard=function(){
    var result=originalRender.apply(this,arguments);
    setTimeout(renderLayout,0);
    return result;
  };
  if(localStorage.getItem('pristeel_proj_view')==='board')setTimeout(renderLayout,250);
  return true;
}
function init(){
  addStyle();
  if(install())return;
  var tries=0;
  var timer=setInterval(function(){
    if(install()||++tries>60)clearInterval(timer);
  },250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
