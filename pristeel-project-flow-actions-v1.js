/* PRISTEEL project workflow actions v1
 * Makes the nine project stages actionable without background observers or polling.
 */
(function(){
'use strict';
if(window.__pstProjectFlowActionsV1)return;
window.__pstProjectFlowActionsV1=true;

var BLUE=(window.PRISTEEL_BRAND&&window.PRISTEEL_BRAND.primary)||'#5B9BB3';
var BLUE_DARK=(window.PRISTEEL_BRAND&&window.PRISTEEL_BRAND.primaryDark)||'#3F7F98';
var STAGES=[
  {id:'rfq_in',label:'Kërkesa e klientit',tab:'communication',help:'Hap komunikimin hyrës, kërkesën e klientit dhe dokumentet fillestare.'},
  {id:'technical_review',label:'Verifikimi teknik',tab:'technical',help:'Hap BOM-in, dokumentet teknike dhe kontrollin e kërkesave.'},
  {id:'supplier_selection',label:'Zgjedhja e prodhuesit',tab:'technical',help:'Hap RFQ-të, ofertat e furnitorëve dhe krahasimin teknik.'},
  {id:'pricing',label:'Përcaktimi i çmimit',tab:'commercial',help:'Hap të dhënat komerciale, kostot dhe llogaritjen e çmimit.'},
  {id:'client_offer',label:'Oferta & konfirmimi',tab:'commercial',help:'Hap ofertat tona dhe dokumentet që i dërgohen klientit.'},
  {id:'commercial',label:'Përpunimi komercial',tab:'commercial',help:'Hap kontratat, faturat, korrigjimet dhe përpunimin komercial.'},
  {id:'production_control',label:'Koordinimi i prodhimit',tab:'overview',help:'Hap përmbledhjen, detyrat dhe koordinimin e prodhimit.'},
  {id:'factory_audit',label:'Auditimi i uzinës',tab:'files',help:'Hap skedarët, raportet e auditimit dhe dokumentet e cilësisë.'},
  {id:'transport',label:'Transporti & dërgesa',tab:'files',help:'Hap dokumentet e transportit, dërgesës dhe skedarët përfundimtarë.'}
];

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function arr(v){return Array.isArray(v)?v:[];}
function projectId(){return String(window.__pstCurrentProjectId||window._curProjId||'');}
function closedStatus(v){var s=String(v||'').toLowerCase().trim();if(s==='fituar'||s==='won'||s==='closedwon')return false;return /humb|lost|closed|mbyll|arkiv|cancel|realizuar/i.test(s);}
function toast(text,error){
  if(typeof window.toast==='function'){window.toast(text,error);return;}
  var old=document.getElementById('pst-flow-toast');if(old)old.remove();
  var el=document.createElement('div');el.id='pst-flow-toast';el.className=error?'error':'';el.textContent=text;
  document.body.appendChild(el);setTimeout(function(){if(el.parentNode)el.remove();},4200);
}
async function db(path,method,body){
  if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');
  return window.supaFetch(path,method,body);
}
async function getProject(id){
  var rows=await db('projects?id=eq.'+enc(id)+'&select=id,name,status,pipeline_stage&limit=1');
  return arr(rows)[0]||null;
}
function closeModal(){var bg=document.getElementById('pst-flow-stage-bg');if(bg)bg.remove();}
function openTab(stage){
  closeModal();
  if(typeof window.pstWsProjectTab==='function'){window.pstWsProjectTab(stage.tab);return;}
  toast('Moduli i kësaj faze nuk është gati në këtë pamje.',true);
}
function stageIndex(node){
  var pipeline=node&&node.closest?node.closest('.pst-ws-pipeline'):null;if(!pipeline)return-1;
  return Array.prototype.indexOf.call(pipeline.querySelectorAll('.pst-ws-stage'),node);
}
function modalHtml(stage,project){
  var current=String(project.pipeline_stage||'rfq_in')===stage.id;
  var locked=closedStatus(project.status);
  return '<div class="pst-flow-stage-bg" id="pst-flow-stage-bg"><section class="pst-flow-stage-modal" role="dialog" aria-modal="true" aria-labelledby="pst-flow-stage-title">'
    +'<header><div><small>Rrjedha e projektit</small><h3 id="pst-flow-stage-title">'+esc(stage.label)+'</h3></div><button type="button" class="pst-flow-stage-x" aria-label="Mbyll">×</button></header>'
    +'<div class="pst-flow-stage-body"><div class="pst-flow-stage-project">'+esc(project.name||'Projekti aktual')+'</div><p>'+esc(stage.help)+'</p>'
    +(current?'<div class="pst-flow-stage-note current">Kjo është faza aktuale e projektit.</div>':'')
    +(locked?'<div class="pst-flow-stage-note locked">Projekti është i mbyllur ose i përfunduar. Faza mund të hapet, por nuk mund të ndryshohet.</div>':'')
    +'</div><footer><button type="button" class="pst-flow-stage-cancel">Anulo</button><button type="button" class="pst-flow-stage-open">Hape fazën</button>'
    +(!current&&!locked?'<button type="button" class="pst-flow-stage-set">Shëno si fazë aktuale</button>':'')+'</footer></section></div>';
}
async function openStage(index){
  var stage=STAGES[index],id=projectId();if(!stage)return;
  if(!id){toast('Nuk u gjet projekti aktiv.',true);return;}
  var project;
  try{project=await getProject(id);}catch(e){toast('Faza nuk u hap: '+(e.message||e),true);return;}
  if(!project){toast('Projekti nuk u gjet në databazë.',true);return;}
  closeModal();document.body.insertAdjacentHTML('beforeend',modalHtml(stage,project));
  var bg=document.getElementById('pst-flow-stage-bg');
  bg.querySelector('.pst-flow-stage-x').onclick=closeModal;
  bg.querySelector('.pst-flow-stage-cancel').onclick=closeModal;
  bg.querySelector('.pst-flow-stage-open').onclick=function(){openTab(stage);};
  var set=bg.querySelector('.pst-flow-stage-set');if(set)set.onclick=function(){setCurrent(stage,project,set);};
  bg.onclick=function(e){if(e.target===bg)closeModal();};
  var first=bg.querySelector('.pst-flow-stage-open');if(first)first.focus();
}
async function setCurrent(stage,project,button){
  if(closedStatus(project.status)){toast('Projekti është i mbyllur dhe faza nuk mund të ndryshohet.',true);return;}
  if(button){button.disabled=true;button.textContent='Duke ruajtur…';}
  try{
    await db('projects?id=eq.'+enc(project.id),'PATCH',{pipeline_stage:stage.id,updated_at:new Date().toISOString()});
    closeModal();toast('Faza aktuale u ndryshua në “'+stage.label+'”.');
    if(typeof window.pstOpenProjectWorkspace==='function'){
      await window.pstOpenProjectWorkspace(project.id);
      if(typeof window.pstWsProjectTab==='function')window.pstWsProjectTab(stage.tab);
    }else{paint(stage.id);openTab(stage);}
  }catch(e){
    if(button){button.disabled=false;button.textContent='Shëno si fazë aktuale';}
    toast('Faza nuk u ruajt: '+(e.message||e),true);
  }
}
function paint(currentId){
  var idx=Math.max(0,STAGES.map(function(x){return x.id;}).indexOf(currentId));
  document.querySelectorAll('.pst-ws-pipeline .pst-ws-stage').forEach(function(node,i){
    node.classList.toggle('done',i<idx);node.classList.toggle('current',i===idx);
    var dot=node.querySelector('.pst-ws-stage-dot');if(dot)dot.textContent=i<idx?'✓':String(i+1);
  });
}
function decorate(){
  document.querySelectorAll('.pst-ws-pipeline .pst-ws-stage').forEach(function(node,i){
    node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('data-flow-stage',STAGES[i]?STAGES[i].id:'');
    node.setAttribute('title','Kliko për të hapur '+(STAGES[i]?STAGES[i].label:'fazën'));
  });
  var pipeline=document.querySelector('.pst-ws-pipeline');
  if(pipeline&&pipeline.parentNode&&!pipeline.parentNode.querySelector('.pst-flow-stage-hint')){
    var hint=document.createElement('div');hint.className='pst-flow-stage-hint';hint.textContent='Kliko një fazë për ta hapur ose për ta shënuar si fazën aktuale.';pipeline.parentNode.insertBefore(hint,pipeline.nextSibling);
  }
}
function wrap(){
  if(typeof window.pstOpenProjectWorkspace==='function'&&!window.pstOpenProjectWorkspace.__pstFlowWrapped){
    var open=window.pstOpenProjectWorkspace;
    var wrapped=async function(){var value=await open.apply(this,arguments);setTimeout(decorate,0);return value;};
    wrapped.__pstFlowWrapped=true;window.pstOpenProjectWorkspace=wrapped;
  }
  if(typeof window.pstWsProjectTab==='function'&&!window.pstWsProjectTab.__pstFlowWrapped){
    var tab=window.pstWsProjectTab;
    var wrappedTab=function(){var value=tab.apply(this,arguments);setTimeout(decorate,0);return value;};
    wrappedTab.__pstFlowWrapped=true;window.pstWsProjectTab=wrappedTab;
  }
  setTimeout(decorate,0);
}

document.addEventListener('click',function(e){
  var node=e.target&&e.target.closest?e.target.closest('.pst-ws-pipeline .pst-ws-stage'):null;if(!node)return;
  e.preventDefault();e.stopPropagation();openStage(stageIndex(node));
},true);
document.addEventListener('keydown',function(e){
  if(e.key!=='Enter'&&e.key!==' ')return;
  var node=e.target&&e.target.closest?e.target.closest('.pst-ws-pipeline .pst-ws-stage'):null;if(!node)return;
  e.preventDefault();openStage(stageIndex(node));
},true);
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&document.getElementById('pst-flow-stage-bg'))closeModal();});

var style=document.createElement('style');style.id='pst-project-flow-actions-v1-style';style.textContent=`
.pst-ws-pipeline .pst-ws-stage{cursor:pointer;border-radius:12px;padding:8px 5px;transition:background .14s ease,transform .14s ease,box-shadow .14s ease}.pst-ws-pipeline .pst-ws-stage:hover{background:rgba(91,155,179,.08);transform:translateY(-1px)}.pst-ws-pipeline .pst-ws-stage:focus-visible{outline:2px solid ${BLUE};outline-offset:3px;background:rgba(91,155,179,.08)}.pst-ws-pipeline .pst-ws-stage.current{background:rgba(91,155,179,.07)}.pst-flow-stage-hint{text-align:center;color:#87949A;font-size:9.5px;margin-top:10px}.pst-flow-stage-bg{position:fixed;inset:0;z-index:7200;background:rgba(22,36,43,.44);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:18px}.pst-flow-stage-modal{width:min(520px,96vw);background:#fff;border:1px solid #DDE7EA;border-radius:18px;box-shadow:0 25px 75px rgba(25,43,51,.24);overflow:hidden}.pst-flow-stage-modal header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;padding:19px 21px;border-bottom:1px solid #E6ECEF;background:linear-gradient(180deg,#fff,#F8FBFC)}.pst-flow-stage-modal header small{display:block;color:${BLUE_DARK};font-size:9px;font-weight:780;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px}.pst-flow-stage-modal h3{margin:0;font-size:18px;color:#20282C}.pst-flow-stage-x{border:0;background:none;color:#7B898F;font-size:25px;line-height:1;cursor:pointer}.pst-flow-stage-body{padding:20px 21px}.pst-flow-stage-project{font-size:11px;font-weight:760;color:#39454B;margin-bottom:9px}.pst-flow-stage-body p{font-size:11.5px;line-height:1.55;color:#65737A;margin:0}.pst-flow-stage-note{margin-top:13px;padding:10px 11px;border-radius:10px;font-size:10px;line-height:1.4}.pst-flow-stage-note.current{background:#EAF5EF;color:#2F7657}.pst-flow-stage-note.locked{background:#F9ECEA;color:#93423A}.pst-flow-stage-modal footer{display:flex;justify-content:flex-end;gap:8px;padding:13px 21px;border-top:1px solid #E6ECEF;background:#FAFCFD}.pst-flow-stage-modal footer button{height:36px;border:1px solid #D8E3E7;border-radius:9px;background:#fff;color:#56646B;padding:0 13px;font-size:10px;font-weight:730;cursor:pointer}.pst-flow-stage-modal footer button:hover{border-color:#BFD4DC}.pst-flow-stage-modal footer .pst-flow-stage-open{color:${BLUE_DARK};border-color:#BCD5DF}.pst-flow-stage-modal footer .pst-flow-stage-set{background:${BLUE};border-color:${BLUE};color:#fff}.pst-flow-stage-modal footer .pst-flow-stage-set:hover{background:${BLUE_DARK};border-color:${BLUE_DARK}}#pst-flow-toast{position:fixed;right:18px;bottom:18px;z-index:7300;max-width:420px;padding:11px 14px;border-radius:10px;background:#2F7657;color:#fff;font-size:10.5px;font-weight:680;box-shadow:0 12px 32px rgba(25,43,51,.20)}#pst-flow-toast.error{background:#A64B42}@media(max-width:620px){.pst-flow-stage-modal footer{flex-wrap:wrap}.pst-flow-stage-modal footer button{flex:1;min-width:125px}}
`;
document.head.appendChild(style);
wrap();
window.PSTProjectFlowActions={stages:STAGES,openStage:openStage,setCurrent:setCurrent,decorate:decorate,paint:paint,closedStatus:closedStatus};
})();
