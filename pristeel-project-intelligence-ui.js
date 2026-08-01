/* PRISTEEL Project Intelligence UI: analiza hapet e para sa here hapet projekti */
(function(){
'use strict';
if(window.__pstProjectIntelligenceUiLoaded)return;
window.__pstProjectIntelligenceUiLoaded=true;

var pendingProjectId=null;
var mountedProjectId=null;
var observer=null;

var css=document.createElement('style');
css.id='pst-project-intelligence-ui-style';
css.textContent=`
#ov-body.pst-pi-overview{scroll-behavior:smooth}
#ov-body .pst-pi-shell{margin:0 0 16px;position:relative}
#ov-body .pst-pi-shell:before{content:"";display:block;height:3px;background:linear-gradient(90deg,#A65F2E,#D39A70 55%,transparent);border-radius:12px 12px 0 0;position:absolute;inset:0 0 auto;z-index:2;pointer-events:none}
#ov-body .pst-pi-shell>.pai-box{border-color:#DEC9B8;box-shadow:0 8px 28px rgba(43,35,29,.07);margin-bottom:0}
#ov-body .pst-pi-shell .pai-hd{padding-top:18px;background:linear-gradient(180deg,#FFFCFA 0,#FFF 100%)}
#ov-body .pst-pi-shell .pai-title{font-size:16px}
#ov-body .pst-pi-shell .pai-sub{font-size:10.5px;max-width:720px}
#ov-body .pst-pi-shell .pai-top{grid-template-columns:minmax(0,1.45fr) minmax(260px,.7fr)}
#ov-body .pst-pi-shell .pai-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
#ov-body .pst-pi-shell .pai-sec:first-child{border-color:#DEC9B8;box-shadow:0 3px 12px rgba(43,35,29,.04)}
#ov-body .pst-pi-anchor{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 8px;padding:0 2px}
#ov-body .pst-pi-anchor-label{font-size:9px;font-weight:800;letter-spacing:1.1px;text-transform:uppercase;color:#8A4E24}
#ov-body .pst-pi-anchor-note{font-size:9px;color:var(--text3,#7A8086)}
@media(max-width:900px){#ov-body .pst-pi-shell .pai-top,#ov-body .pst-pi-shell .pai-grid{grid-template-columns:1fr}}
`;
document.head.appendChild(css);

function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function idFrom(v){
  if(v==null)return null;
  if(typeof v==='object')v=v.id||v.project_id||v.projectId;
  v=String(v||'').trim();
  return v?v:null
}
function overviewBody(){
  return document.getElementById('ov-body')||document.querySelector('[data-project-overview-body],.ov-body')
}
function section(pid){
  var p=esc(pid);
  return '<div class="pst-pi-shell" id="pst-pi-shell-'+p+'">'
    +'<div class="pst-pi-anchor"><span class="pst-pi-anchor-label">Pamja kryesore e projektit</span><span class="pst-pi-anchor-note">Analiza, rreziqet dhe veprimet shfaqen të parat</span></div>'
    +'<div class="pai-box" id="pai-'+p+'">'
      +'<div class="pai-hd"><div><div class="pai-kicker">Project Intelligence</div><div class="pai-title">Analiza dhe hapat e ardhshëm</div><div class="pai-sub">Emailat, skedarët, kontaktet, ofertat, afatet dhe detyrat analizohen si një projekt i vetëm.</div></div>'
      +'<div class="pai-actions"><button class="pai-btn" id="pai-history-'+p+'" onclick="pstProjectAnalysisHistory(\''+p+'\')">Historiku</button><button class="pai-btn" id="pai-tasks-'+p+'" onclick="pstProjectAnalysisCreateTasks(\''+p+'\')">Krijo detyrat</button><button class="pai-btn primary" id="pai-analyze-'+p+'" onclick="pstAnalyzeProject(\''+p+'\')">Analizo projektin</button></div></div>'
      +'<div class="pai-state" id="pai-state-'+p+'">Duke ngarkuar…</div><div class="pai-progress" id="pai-progress-'+p+'"><i id="pai-fill-'+p+'"></i></div><div class="pai-body" id="pai-body-'+p+'"></div>'
    +'</div></div>'
}
function widenOverview(body){
  var modal=body.closest('.modal-content,.modal-box,.modal-card,.overview-modal,[role="dialog"]');
  if(!modal&&body.parentElement)modal=body.parentElement;
  if(modal){modal.style.width='min(1180px,96vw)';modal.style.maxWidth='1180px';modal.style.maxHeight='92vh'}
}
function autoAnalyzeOnce(pid){
  var key='pst_pi_auto_'+pid;
  if(sessionStorage.getItem(key))return;
  setTimeout(function(){
    var host=document.getElementById('pai-body-'+pid);
    if(!host||!host.querySelector('.pai-empty')||typeof window.pstAnalyzeProject!=='function')return;
    sessionStorage.setItem(key,'1');
    window.pstAnalyzeProject(String(pid))
  },1100)
}
function mount(pid){
  pid=idFrom(pid||pendingProjectId);if(!pid)return false;
  var body=overviewBody();if(!body)return false;
  pendingProjectId=pid;
  body.classList.add('pst-pi-overview');
  widenOverview(body);

  var shell=document.getElementById('pst-pi-shell-'+pid);
  var existing=document.getElementById('pai-'+pid);
  if(!shell){
    shell=document.createElement('div');
    shell.innerHTML=section(pid);
    shell=shell.firstChild;
    if(existing){
      var box=shell.querySelector('.pai-box');
      if(box)box.replaceWith(existing);
    }
  }
  if(body.firstElementChild!==shell)body.insertBefore(shell,body.firstChild);
  body.scrollTop=0;
  mountedProjectId=pid;

  if(typeof window.pstProjectAnalysisLoad==='function'){
    setTimeout(function(){
      window.pstProjectAnalysisLoad(String(pid));
      autoAnalyzeOnce(pid)
    },80)
  }
  return true
}
function schedule(pid){
  pid=idFrom(pid);if(pid)pendingProjectId=pid;
  var attempts=0;
  function tryMount(){
    if(mount(pendingProjectId)||++attempts>30)return;
    setTimeout(tryMount,100)
  }
  setTimeout(tryMount,0)
}
function wrap(name){
  var fn=window[name];
  if(typeof fn!=='function'||fn.__pstProjectIntelligenceUi)return false;
  var wrapped=function(){
    var pid=idFrom(arguments[0]);
    if(pid)pendingProjectId=pid;
    var result=fn.apply(this,arguments);
    schedule(pid);
    return result
  };
  wrapped.__pstProjectIntelligenceUi=true;
  wrapped.__pstProjectIntelligenceOriginal=fn;
  window[name]=wrapped;
  return true
}
function hookFunctions(){
  wrap('openOverview');
  wrap('renderOverviewModal');
  wrap('pstV2OpenProject')
}
function idFromClick(target){
  var el=target&&target.closest?target.closest('[data-project-id],[data-project],[onclick]'):null;
  if(!el)return null;
  var id=el.getAttribute('data-project-id')||el.getAttribute('data-project');
  if(id)return idFrom(id);
  var code=el.getAttribute('onclick')||'';
  var m=code.match(/(?:openOverview|pstV2OpenProject)\s*\(\s*['"]([^'"]+)['"]/);
  return m?idFrom(m[1]):null
}
function observe(){
  if(observer)return;
  observer=new MutationObserver(function(){
    hookFunctions();
    if(pendingProjectId&&overviewBody())mount(pendingProjectId)
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(e){var pid=idFromClick(e.target);if(pid){pendingProjectId=pid;schedule(pid)}},true)
}
function init(){
  hookFunctions();
  observe();
  var tries=0,t=setInterval(function(){
    hookFunctions();
    if(pendingProjectId&&overviewBody())mount(pendingProjectId);
    if(++tries>120)clearInterval(t)
  },500)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,300)});else setTimeout(init,300)
})();
