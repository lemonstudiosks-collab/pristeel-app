/* PRISTEEL Project Intelligence UI: analiza hapet e para pa bllokuar pasqyrën */
(function(){
'use strict';
if(window.__pstProjectIntelligenceUiLoaded)return;
window.__pstProjectIntelligenceUiLoaded=true;

var pendingProjectId=null;
var observer=null;
var mountTimer=null;

var css=document.createElement('style');
css.id='pst-project-intelligence-ui-style';
css.textContent=`
#ov-backdrop.pst-ov-scroll{overflow:hidden!important;padding:16px!important}
#ov-backdrop.pst-ov-scroll .ov-modal{display:flex!important;flex-direction:column!important;min-height:0!important;max-height:calc(100vh - 32px)!important;max-height:calc(100dvh - 32px)!important;overflow:hidden!important}
#ov-backdrop.pst-ov-scroll .ov-head{flex:0 0 auto}
#ov-backdrop.pst-ov-scroll #ov-body{flex:1 1 auto;min-height:0;max-height:none!important;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-gutter:stable}
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
@media(max-width:640px){#ov-backdrop.pst-ov-scroll{padding:8px!important}#ov-backdrop.pst-ov-scroll .ov-modal{max-height:calc(100vh - 16px)!important;max-height:calc(100dvh - 16px)!important}}
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
function baseReady(body){
  if(!body)return false;
  var text=String(body.textContent||'').toLowerCase();
  if(text.indexOf('duke ngarkuar pasqyr')>-1)return false;
  var children=Array.prototype.slice.call(body.children||[]).filter(function(el){return !el.classList.contains('pst-pi-shell')});
  return children.length>0
}
function inferProjectId(body){
  if(pendingProjectId)return pendingProjectId;
  var box=body&&body.querySelector('[id^="pai-"]');
  if(box)return idFrom(box.id.slice(4));
  var contact=body&&body.querySelector('[id^="pct-"]');
  if(contact)return idFrom(contact.id.slice(4));
  var email=body&&body.querySelector('[id^="pem-"]');
  if(email)return idFrom(email.id.slice(4));
  return null
}
function section(pid){
  var p=esc(pid);
  return '<div class="pst-pi-shell" id="pst-pi-shell-'+p+'">'
    +'<div class="pst-pi-anchor"><span class="pst-pi-anchor-label">Pamja kryesore e projektit</span><span class="pst-pi-anchor-note">Analiza, rreziqet dhe veprimet shfaqen të parat</span></div>'
    +'<div class="pai-box" id="pai-'+p+'">'
      +'<div class="pai-hd"><div><div class="pai-kicker">Project Intelligence</div><div class="pai-title">Analiza dhe hapat e ardhshëm</div><div class="pai-sub">Emailat, skedarët, kontaktet, ofertat, afatet dhe detyrat analizohen si një projekt i vetëm.</div></div>'
      +'<div class="pai-actions"><button class="pai-btn" id="pai-history-'+p+'" onclick="pstProjectAnalysisHistory(\''+p+'\')">Historiku</button><button class="pai-btn" id="pai-tasks-'+p+'" onclick="pstProjectAnalysisCreateTasks(\''+p+'\')">Krijo detyrat</button><button class="pai-btn primary" id="pai-analyze-'+p+'" onclick="pstAnalyzeProject(\''+p+'\')">Analizo projektin</button></div></div>'
      +'<div class="pai-state" id="pai-state-'+p+'">Gati për analizën.</div><div class="pai-progress" id="pai-progress-'+p+'"><i id="pai-fill-'+p+'"></i></div><div class="pai-body" id="pai-body-'+p+'"></div>'
    +'</div></div>'
}
function widenOverview(body){
  var backdrop=document.getElementById('ov-backdrop');
  var modal=body.closest('.modal-content,.modal-box,.modal-card,.overview-modal,[role="dialog"]');
  if(!modal&&body.parentElement)modal=body.parentElement;
  if(backdrop)backdrop.classList.add('pst-ov-scroll');
  if(modal){
    modal.style.width='min(1180px,96vw)';
    modal.style.maxWidth='1180px';
    modal.style.maxHeight='calc(100dvh - 32px)';
    modal.style.minHeight='0';
    modal.style.display='flex';
    modal.style.flexDirection='column';
    modal.style.overflow='hidden';
  }
  body.style.flex='1 1 auto';
  body.style.minHeight='0';
  body.style.maxHeight='none';
  body.style.overflowY='auto';
  body.style.overflowX='hidden';
}
function showLoadFallback(pid){
  setTimeout(function(){
    var state=document.getElementById('pai-state-'+pid);
    var host=document.getElementById('pai-body-'+pid);
    if(!state||!host)return;
    if(/ngarkohet/i.test(state.textContent||'')&&!host.children.length){
      state.textContent='Analiza nuk u ngarkua automatikisht. Mund ta nisësh me butonin Analizo projektin.';
      state.style.color='#9B6A22';
      host.innerHTML='<div class="pai-empty"><b>Analiza është gati për t’u nisur</b><p>Pasqyra e projektit u hap normalisht. Kliko butonin më poshtë për të analizuar emailat, dokumentet, ofertat, afatet dhe detyrat.</p><button class="pai-btn primary" onclick="pstAnalyzeProject(\''+esc(pid)+'\')">Analizo të gjithë projektin</button></div>'
    }
  },8000)
}
function mount(pid){
  var body=overviewBody();
  if(!baseReady(body))return false;
  pid=idFrom(pid||inferProjectId(body));
  if(!pid)return false;
  pendingProjectId=pid;
  body.classList.add('pst-pi-overview');
  widenOverview(body);

  var shell=document.getElementById('pst-pi-shell-'+pid);
  var existing=document.getElementById('pai-'+pid);
  if(!shell){
    var holder=document.createElement('div');
    holder.innerHTML=section(pid);
    shell=holder.firstChild;
    if(existing){
      var placeholder=shell.querySelector('.pai-box');
      if(placeholder)placeholder.replaceWith(existing)
    }
  }
  if(body.firstElementChild!==shell)body.insertBefore(shell,body.firstChild);
  body.scrollTop=0;

  if(shell.getAttribute('data-analysis-loaded')!=='1'&&typeof window.pstProjectAnalysisLoad==='function'){
    shell.setAttribute('data-analysis-loaded','1');
    setTimeout(function(){
      try{window.pstProjectAnalysisLoad(String(pid));showLoadFallback(pid)}catch(e){
        var state=document.getElementById('pai-state-'+pid);
        if(state){state.textContent='Analiza nuk u ngarkua: '+e.message;state.style.color='#A64B42'}
      }
    },100)
  }
  return true
}
function schedule(pid){
  pid=idFrom(pid);if(pid)pendingProjectId=pid;
  if(mountTimer)clearTimeout(mountTimer);
  var attempts=0;
  function tryMount(){
    if(mount(pendingProjectId)||++attempts>100)return;
    mountTimer=setTimeout(tryMount,100)
  }
  mountTimer=setTimeout(tryMount,50)
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
    var body=overviewBody();
    if(body&&baseReady(body))schedule(inferProjectId(body))
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',function(e){
    var pid=idFromClick(e.target);
    if(pid){pendingProjectId=pid;schedule(pid)}
  },true)
}
function init(){
  observe();
  var body=overviewBody();
  if(body&&baseReady(body))schedule(inferProjectId(body))
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(init,300)});else setTimeout(init,300)
})();
