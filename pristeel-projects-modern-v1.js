/* PRISTEEL Projects Operator Desk v2
 * Single presentation owner for the central Projects register.
 * One bounded read on open, automatic operational grouping and full-row navigation.
 * No direct business writes, no status mutation menu, no duplicate Board/Mindmap owner.
 */
(function(){
'use strict';
if(window.__pstProjectsModernV2)return;
window.__pstProjectsModernV2=true;
window.__pstProjectsModernV1=true;

var state={rows:[],search:'',focus:'open',loading:false};
var baseGo=window.pstWorkspaceGo;

function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();}
function ts(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.getTime():0;}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function daysSince(v){var t=ts(v);if(!t)return null;return Math.max(0,Math.floor((Date.now()-t)/86400000));}
function activityText(r){var n=daysSince(r.last_activity_at||r.last_email_at||r.updated_at||r.created_at);return n===null?'Pa aktivitet':n===0?'Sot':n===1?'Dje':'Para '+n+' ditësh';}
function setNav(){document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='projects');});}
function ensurePage(){
  var p=document.getElementById('page-workspace-projects');
  if(!p){var c=document.querySelector('.content');if(!c)return null;p=document.createElement('div');p.id='page-workspace-projects';p.className='page';c.appendChild(p);}
  document.querySelectorAll('.page').forEach(function(x){if(x!==p){x.classList.remove('active');x.style.display='none';}});
  p.classList.add('active');p.style.display='block';setNav();window.scrollTo({top:0,behavior:'auto'});return p;
}
function closed(r){var s=N([r&&r.operational_state,r&&r.status].join(' '));return /closed|mbyllur|humbur|lost|realizuar|arkiv|archiv|cancel|refuz/.test(s);}
function bucket(r){
  if(closed(r))return'closed';
  var op=N(r&&r.operational_state);
  if(op==='action_required'||/action|required|attention|urgent/.test(op))return'action';
  if(op==='execution'||/execution/.test(op))return'execution';
  if(op==='active_work'||/active_work|active work/.test(op))return'work';
  if(/^wait_/.test(op)||/waiting|pending/.test(op))return'waiting';
  var st=N(r&&r.status),ps=N(r&&r.pipeline_stage);
  if(/fituar|won|production|transport|factory_audit/.test(st+' '+ps))return'execution';
  if(/pritje|waiting|pending/.test(st))return'waiting';
  return'work';
}
function bucketInfo(k){
  return ({
    action:{label:'Kërkon veprim',hint:'Duhet vendim ose punë nga PriSteel',rank:0},
    work:{label:'Në punë',hint:'Po punohet aktualisht',rank:1},
    execution:{label:'Në realizim',hint:'Projekt i fituar / ekzekutim',rank:2},
    waiting:{label:'Në pritje',hint:'Hapi tjetër është te pala tjetër',rank:3},
    closed:{label:'Të mbyllura',hint:'Historik / arkiv',rank:4}
  })[k]||{label:'Projekt',hint:'',rank:9};
}
function stageLabel(r){
  var map={rfq_in:'Kërkesë / RFQ',technical_review:'Analizë teknike',supplier_selection:'Burimet',pricing:'Kosto / çmim',client_offer:'Oferta jonë',commercial:'Te klienti',production_control:'Prodhim',factory_audit:'Auditim',transport:'Dorëzim'};
  return map[S(r&&r.pipeline_stage)]||S(r&&r.pipeline_stage)||'—';
}
function typeLabel(r){var x=N(r&&r.business_type);if(/trading|trade|furniz/.test(x))return'Furnizim';if(/fabric|prodh|manufact/.test(x))return'Fabrikim';if(/hybrid|hibrid/.test(x))return'Hybrid';return'';}
function counts(){
  var c={open:0,action:0,work:0,execution:0,waiting:0,closed:0};
  state.rows.forEach(function(r){var k=bucket(r);c[k]++;if(k!=='closed')c.open++;});
  return c;
}
function priority(r){return bucketInfo(bucket(r)).rank*1e16-ts(r.last_activity_at||r.last_email_at||r.updated_at||r.created_at);}
function visible(){
  var q=N(state.search);
  return state.rows.filter(function(r){
    var k=bucket(r);
    if(state.focus==='open'&&k==='closed')return false;
    if(state.focus!=='open'&&state.focus!==k)return false;
    if(!q)return true;
    return N([r.name,r.client,r.ref,r.reference,r.pipeline_stage,r.operational_state,r.status,r.business_type].join(' ')).indexOf(q)>-1;
  }).sort(function(a,b){return priority(a)-priority(b);});
}
function groupRows(rows){
  var out={action:[],work:[],execution:[],waiting:[],closed:[]};
  rows.forEach(function(r){out[bucket(r)].push(r);});
  return out;
}
function goBack(){
  if(window.PSTPrimaryNavResilienceV10&&typeof window.PSTPrimaryNavResilienceV10.openHome==='function')return window.PSTPrimaryNavResilienceV10.openHome();
  if(typeof baseGo==='function')return baseGo.call(window,'home');
  if(typeof window.goHome==='function')return window.goHome();
}
function openProject(id){
  id=S(id).trim();if(!id)return false;
  window.__pstCurrentProjectId=id;window._curProjId=id;
  try{localStorage.setItem('pristeel_cur_proj',id);}catch(e){}
  if(typeof window.pstOpenProjectWorkspace==='function')return window.pstOpenProjectWorkspace(id);
  if(typeof window.loadProject==='function')return window.loadProject(id);
  return false;
}
function newProject(){
  if(typeof window.pstWsCreate==='function')return window.pstWsCreate('project');
  if(typeof window.newProject==='function')return window.newProject();
  return false;
}
function focusButton(k,label,count,sub){
  return '<button type="button" class="ppd-focus'+(state.focus===k?' on':'')+'" data-ppd-focus="'+E(k)+'"><span>'+E(label)+'</span><b>'+Number(count||0)+'</b><small>'+E(sub)+'</small></button>';
}
function card(r){
  var k=bucket(r),bi=bucketInfo(k),type=typeLabel(r),deadline=r.deadline?dateText(r.deadline):'Pa afat';
  return '<button type="button" class="ppd-row" data-ppd-open="'+E(r.id)+'" data-state="'+E(k)+'">'+
    '<span class="ppd-state-dot"></span>'+
    '<span class="ppd-main"><b>'+E(r.name||'Pa emër')+'</b><small>'+E([r.client,r.ref||r.reference].filter(Boolean).join(' · ')||'Pa klient / referencë')+'</small></span>'+
    '<span class="ppd-meta"><small>Faza</small><b>'+E(stageLabel(r))+'</b></span>'+
    '<span class="ppd-meta"><small>Gjendja</small><b>'+E(bi.label)+'</b></span>'+
    (type?'<span class="ppd-type">'+E(type)+'</span>':'<span></span>')+
    '<span class="ppd-time"><small>'+E(deadline)+'</small><b>'+E(activityText(r))+'</b></span>'+
    '<i>›</i></button>';
}
function section(k,rows){
  if(!rows.length)return'';
  var bi=bucketInfo(k);
  return '<section class="ppd-section"><header><div><b>'+E(bi.label)+'</b><small>'+E(bi.hint)+'</small></div><span>'+rows.length+'</span></header><div class="ppd-list">'+rows.map(card).join('')+'</div></section>';
}
function render(){
  var p=ensurePage();if(!p)return;
  var c=counts(),rows=visible(),g=groupRows(rows);
  p.innerHTML='<div class="ppd-page">'+
    '<header class="ppd-head"><button type="button" class="ppd-back" data-ppd-back>← Kthehu</button><div><span>PPPP</span><h1>Projektet</h1><p>Puna renditet automatikisht sipas gjendjes reale të projektit. Hape projektin për “TANI” dhe hapin e radhës.</p></div><button type="button" class="ppd-new" data-ppd-new>+ Projekt i ri</button></header>'+
    '<div class="ppd-toolbar"><label><span>⌕</span><input data-ppd-search value="'+E(state.search)+'" placeholder="Kërko projekt, klient ose referencë"></label><div class="ppd-open-count"><b>'+c.open+'</b><span>projekte aktive</span></div></div>'+
    '<div class="ppd-focusbar">'+
      focusButton('action','Kërkon veprim',c.action,'PriSteel')+
      focusButton('work','Në punë',c.work,'aktive')+
      focusButton('waiting','Në pritje',c.waiting,'jashtë PriSteel')+
      focusButton('execution','Në realizim',c.execution,'pas fitimit')+
      focusButton('closed','Të mbyllura',c.closed,'historik')+
    '</div>'+
    '<div class="ppd-reset">'+(state.focus!=='open'?'<button type="button" data-ppd-focus="open">← Të gjitha aktive</button>':'')+(state.search?'<button type="button" data-ppd-clear>Kërkimi: '+E(state.search)+' ×</button>':'')+'</div>'+
    '<main class="ppd-body">'+
      (rows.length?(state.focus==='open'?
        section('action',g.action)+section('work',g.work)+section('execution',g.execution)+section('waiting',g.waiting):
        section(state.focus,g[state.focus]||[])
      ):'<div class="ppd-empty">Nuk ka projekte që përputhen me këtë pamje.</div>')+
    '</main></div>';
}
async function fetchProjects(){
  if(typeof window.supaFetch!=='function')return A(window.projects||window._projects||window._allProjectsCache||window.PST_PROJECTS);
  var fields='id,name,client,ref,reference,deadline,status,pipeline_stage,operational_state,business_type,last_activity_at,last_email_at,updated_at,created_at';
  return A(await window.supaFetch('projects?select='+fields+'&order=last_activity_at.desc.nullslast&limit=500'));
}
async function load(){
  ensurePage();state.loading=true;
  try{
    state.rows=await fetchProjects();
    window.__pstWorkspaceProjectRows=state.rows;window._allProjectsCache=state.rows;
    state.loading=false;render();
    var b=document.getElementById('pst-ws-b-projects'),c=counts();
    if(b){b.textContent=String(c.open);b.style.display=c.open?'inline-flex':'none';}
  }catch(e){
    state.loading=false;var p=ensurePage();if(p)p.innerHTML='<div class="ppd-page"><div class="ppd-empty">Projektet nuk u ngarkuan: '+E(e&&e.message||e)+'</div></div>';
  }
}
function setContext(ctx){
  var v=typeof ctx==='string'?ctx:S(ctx&&ctx.filter);
  state.search=S(ctx&&ctx.search||'');state.focus='open';
  var map={action:'action',action_required:'action',work:'work',active_work:'work',waiting:'waiting',wait_for_client:'waiting',execution:'execution',closed:'closed',archived:'closed'};
  if(map[v])state.focus=map[v];else if(v&&v!=='open'&&v!=='all')state.search=v;
}
function click(e){
  var t=e.target&&e.target.closest?e.target:null;if(!t)return;
  var o=t.closest('[data-ppd-open]');if(o){e.preventDefault();openProject(o.getAttribute('data-ppd-open'));return;}
  var f=t.closest('[data-ppd-focus]');if(f){e.preventDefault();var k=f.getAttribute('data-ppd-focus');state.focus=state.focus===k?'open':k;render();return;}
  if(t.closest('[data-ppd-back]')){e.preventDefault();goBack();return;}
  if(t.closest('[data-ppd-new]')){e.preventDefault();newProject();return;}
  if(t.closest('[data-ppd-clear]')){e.preventDefault();state.search='';render();return;}
}
function input(e){
  if(e.target&&e.target.hasAttribute('data-ppd-search')){
    state.search=e.target.value;render();
    var x=document.querySelector('[data-ppd-search]');if(x){x.focus();x.setSelectionRange(x.value.length,x.value.length);}
  }
}
function css(){
  if(document.getElementById('ppd-projects-v2-css'))return;
  var s=document.createElement('style');s.id='ppd-projects-v2-css';s.textContent=`
#page-workspace-projects{background:#f5f7f7!important}.ppd-page{max-width:1480px;margin:0 auto;padding:20px 24px 44px;color:#2a383e}
.ppd-head{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:16px;align-items:center;margin-bottom:16px}.ppd-head>div>span{font-size:9px;letter-spacing:.12em;color:#85949a;font-weight:800}.ppd-head h1{font-size:26px;line-height:1.05;margin:3px 0;color:#26363d;font-weight:680}.ppd-head p{font-size:11.5px;color:#7d898e;margin:5px 0 0;max-width:820px}.ppd-back,.ppd-new{height:38px;border-radius:10px;padding:0 13px;font-weight:720;cursor:pointer}.ppd-back{border:1px solid #4F97AF;background:#4F97AF;color:#fff}.ppd-new{border:1px solid #d9e4e8;background:#fff;color:#49636f}.ppd-new:hover{border-color:#aac9d5;color:#397f9b}
.ppd-toolbar{display:flex;gap:10px;align-items:center}.ppd-toolbar label{height:44px;display:flex;align-items:center;gap:8px;flex:1;border:1px solid #dfe8eb;border-radius:12px;background:#fff;padding:0 13px}.ppd-toolbar label span{color:#7e959f;font-size:18px}.ppd-toolbar input{width:100%;border:0;outline:0;background:transparent;font-size:12px;color:#34464e}.ppd-open-count{height:44px;min-width:135px;border:1px solid #dfe8eb;border-radius:12px;background:#fff;display:flex;align-items:baseline;justify-content:center;gap:6px}.ppd-open-count b{font-size:18px}.ppd-open-count span{font-size:9.5px;color:#849198}
.ppd-focusbar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:10px 0 0}.ppd-focus{min-height:70px;border:1px solid #dfe8eb;border-radius:12px;background:#fff;padding:10px 12px;text-align:left;cursor:pointer;display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-rows:auto auto}.ppd-focus:hover,.ppd-focus.on{border-color:#a9cbd7;background:#f8fbfc}.ppd-focus>span{font-size:11px;font-weight:720;color:#41545c}.ppd-focus>b{font-size:20px;color:#344b56}.ppd-focus>small{grid-column:1/-1;font-size:9px;color:#8b969b;margin-top:4px}.ppd-focus.on>span,.ppd-focus.on>b{color:#3d839e}
.ppd-reset{min-height:34px;display:flex;gap:7px;align-items:center}.ppd-reset button{border:1px solid #e1e8eb;background:#fff;border-radius:999px;padding:5px 9px;color:#61727a;font-size:9.5px;cursor:pointer}
.ppd-body{display:grid;gap:14px}.ppd-section{border:1px solid #e0e8eb;border-radius:14px;background:#fff;overflow:hidden}.ppd-section>header{min-height:52px;display:flex;align-items:center;justify-content:space-between;padding:0 14px;border-bottom:1px solid #edf1f2}.ppd-section>header b{display:block;font-size:12.5px}.ppd-section>header small{display:block;font-size:9.5px;color:#8a969b;margin-top:2px}.ppd-section>header>span{min-width:26px;height:26px;border-radius:13px;background:#eef4f6;color:#527b8d;display:grid;place-items:center;font-size:10px;font-weight:800}
.ppd-list{display:grid}.ppd-row{position:relative;width:100%;min-height:66px;border:0;border-bottom:1px solid #edf1f2;background:#fff;display:grid;grid-template-columns:10px minmax(280px,1.8fr) minmax(120px,.65fr) minmax(120px,.65fr) 90px 120px 16px;gap:12px;align-items:center;padding:9px 14px;text-align:left;color:#33464e;cursor:pointer}.ppd-row:last-child{border-bottom:0}.ppd-row:hover{background:#fafcfc}.ppd-state-dot{width:7px;height:7px;border-radius:50%;background:#9ba8ae}.ppd-row[data-state="action"] .ppd-state-dot{background:#b37a37}.ppd-row[data-state="work"] .ppd-state-dot{background:#4f97af}.ppd-row[data-state="waiting"] .ppd-state-dot{background:#9aa7ad}.ppd-row[data-state="execution"] .ppd-state-dot{background:#5f8a70}.ppd-main{min-width:0}.ppd-main>b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ppd-main>small{display:block;font-size:9.5px;color:#879399;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.ppd-meta small,.ppd-time small{display:block;font-size:8px;color:#99a3a7}.ppd-meta b,.ppd-time b{display:block;font-size:9.5px;margin-top:3px;font-weight:650}.ppd-type{display:inline-flex;justify-self:start;border-radius:999px;background:#f0f4f5;padding:4px 7px;font-size:8.5px;color:#65777f}.ppd-time{text-align:right}.ppd-row>i{font-style:normal;color:#80a8b8;font-size:17px}.ppd-empty{border:1px dashed #dce5e8;border-radius:14px;background:#fff;padding:38px;text-align:center;color:#87949a;font-size:11px}
@media(max-width:1050px){.ppd-focusbar{grid-template-columns:repeat(3,1fr)}.ppd-row{grid-template-columns:10px minmax(220px,1.5fr) minmax(110px,.7fr) minmax(110px,.7fr) 95px 16px}.ppd-type{display:none}}@media(max-width:760px){.ppd-page{padding:14px 12px 32px}.ppd-head{grid-template-columns:auto 1fr}.ppd-new{grid-column:1/-1;justify-self:end}.ppd-toolbar{align-items:stretch;flex-direction:column}.ppd-open-count{min-width:0}.ppd-focusbar{grid-template-columns:1fr 1fr}.ppd-row{grid-template-columns:8px minmax(0,1fr) 16px}.ppd-meta,.ppd-time,.ppd-type{display:none}}
`;document.head.appendChild(s);
}
function init(){css();document.addEventListener('click',click,true);document.addEventListener('input',input,true);}
window.pstProjectsModernOpen=function(context){setContext(context||'');return load();};
window.pstProjectsModernRefresh=function(){return load();};
window.pstProjectsModernAction=function(id,action){if(action==='open')return openProject(id);return false;};
window.PSTProjectsModernV2={open:window.pstProjectsModernOpen,refresh:window.pstProjectsModernRefresh,setContext:setContext,state:state,_test:{bucket:bucket,closed:closed,visible:visible,counts:counts}};
window.PSTProjectsModernV1=window.PSTProjectsModernV2;
window.pstWorkspaceGo=function(key){if(key==='projects')return window.pstProjectsModernOpen('');return typeof baseGo==='function'?baseGo.apply(this,arguments):undefined;};
init();
})();