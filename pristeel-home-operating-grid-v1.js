/* PRISTEEL Home Operating Grid v4.2
 * Legacy compatibility fallback only. Live Home v3/v6 is the production Home owner.
 * Canonical Home remains a backstage data/state source.
 * This module performs no business-state writes and no outbound actions.
 * It also provides bounded read-only runtime resilience for broad project lookup
 * and project-card navigation so current final owners cannot dead-end the operator.
 */
(function(){
'use strict';
if(window.__pstHomeOperatingGridV1)return;
window.__pstHomeOperatingGridV1=true;

var VERSION='20260830-live-home-lookup-nav-resilience-1';
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function snapshot(){
  try{var H=window.PSTHomeCanonicalV1;return H&&typeof H.snapshot==='function'?H.snapshot():{actions:[],waiting:[],projects:[]};}
  catch(e){return{actions:[],waiting:[],projects:[]};}
}
function page(){return document.getElementById('page-workspace-home');}
function liveHomeRoot(){
  var p=page(),root=document.getElementById('pst-project-control-home-v2');
  return p&&root&&p.contains(root)&&window.__pstLiveHomeV3?root:null;
}
function retireForLiveHome(){
  var p=page(),root=liveHomeRoot();if(!p||!root)return false;
  p.classList.remove('pst-home-action-only','pst-home-grid-final');
  p.setAttribute('data-pst-home-owner','live-home-v3');
  var h=document.getElementById('pst-home-operating-grid-v1');
  if(h&&h.parentNode)h.parentNode.removeChild(h);
  return true;
}
function scheduleLiveHomeHandoff(){
  [0,100,350,900,1800,3000].forEach(function(ms){setTimeout(retireForLiveHome,ms);});
}

/* --------------------------------------------------------------------------
 * Current-runtime bug resilience
 * --------------------------------------------------------------------------
 * The visible Live Home owner intentionally requires a unique project for
 * mutation/update commands. A broad read-only lookup (for example "STACON")
 * must not be forced through that uniqueness gate. Resolve those lookups
 * locally from project records before any remote AI path is allowed to run.
 *
 * Project cards are also intercepted at capture phase. Several generations
 * can own list presentation, but all of them must converge on the canonical
 * pstOpenProjectWorkspace flow instead of silently doing nothing.
 */
var lookupCache={rows:[],at:0,pending:null};
function lookupNorm(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function lookupDate(v){var d=v?new Date(v):null;if(!d||isNaN(d.getTime()))return'';return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});}
function lookupState(p){
  var o=lookupNorm(p&&p.operational_state),s=lookupNorm(p&&p.status);
  if(o==='execution')return'Në realizim';
  if(o==='action required'||o==='action_required')return'Kërkon veprim';
  if(o==='wait for client'||o==='wait_for_client')return'Në pritje të klientit';
  if(o==='wait for supplier'||o==='wait_for_supplier')return'Në pritje të furnitorit';
  if(/humb|lost/.test(s))return'Humbur';
  if(/fituar|won/.test(s))return'Fituar';
  if(/pritje|waiting|pending/.test(s))return'Në pritje';
  return S(p&&p.status||'Aktiv');
}
function lookupIdentity(p){return [p&&p.name,p&&p.client,p&&p.business_ref,p&&p.ref].concat(A(p&&p.identity_aliases)).map(lookupNorm).filter(function(x){return x.length>=3;});}
function lookupScore(q,p){
  var n=lookupNorm(q),score=0;
  lookupIdentity(p).forEach(function(x){
    if(n.indexOf(x)>-1)score=Math.max(score,100+x.length);
    var words=x.split(' ').filter(function(w){return w.length>=4;});
    words.forEach(function(w){if(n.indexOf(w)>-1)score=Math.max(score,20+w.length);});
  });
  return score;
}
function lookupRows(){
  if(lookupCache.rows.length&&Date.now()-lookupCache.at<15000)return Promise.resolve(lookupCache.rows);
  if(lookupCache.pending)return lookupCache.pending;
  var fromWindow=A(window.__pstWorkspaceProjectRows||window._allProjectsCache);
  if(fromWindow.length){lookupCache.rows=fromWindow.slice();lookupCache.at=Date.now();return Promise.resolve(lookupCache.rows);}
  if(typeof window.supaFetch!=='function')return Promise.resolve(A(snapshot().projects));
  lookupCache.pending=Promise.resolve(window.supaFetch('projects?select=id,name,client,status,pipeline_stage,operational_state,last_activity_at,last_email_at,updated_at,business_ref,ref,identity_aliases&order=last_activity_at.desc.nullslast&limit=500'))
    .then(function(rows){lookupCache.rows=A(rows);lookupCache.at=Date.now();return lookupCache.rows;})
    .catch(function(){var rows=A(snapshot().projects);lookupCache.rows=rows;lookupCache.at=Date.now();return rows;})
    .finally(function(){lookupCache.pending=null;});
  return lookupCache.pending;
}
function lookupHits(q,rows){
  var hits=[];A(rows).forEach(function(p){var score=lookupScore(q,p);if(score)hits.push({p:p,score:score,time:Date.parse(p.last_activity_at||p.last_email_at||p.updated_at||'')||0});});
  hits.sort(function(a,b){return b.score-a.score||b.time-a.time;});
  return hits;
}
function isBroadLookup(q){
  var raw=S(q).trim(),n=lookupNorm(raw),words=n.split(' ').filter(Boolean);
  if(!raw)return false;
  if(/[?]$/.test(raw)||/^(cka|cfare|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/.test(n))return true;
  if(words.length<=4&&!/^(ruaj|sheno|ndrysho|shto|hiq|mbyll|dergo|krijo|update|save|mark|change|add|remove|close|send|create)\b/.test(n))return true;
  return false;
}
function renderMultiLookup(form,q,hits){
  var root=form.closest('#pst-project-control-home-v2')||liveHomeRoot(),box=root&&root.querySelector('.pst-live-result');if(!box)return false;
  var shown=hits.slice(0,8),label=S(q).trim();
  box.hidden=false;box.setAttribute('data-pst-multi-project-result','1');
  box.innerHTML='<div class="pst-live-answer"><b>U gjetën '+hits.length+' projekte që lidhen me “'+E(label)+'”.</b><br>Zgjidh projektin që dëshiron të hapësh:</div>'
    +'<div style="display:grid;gap:7px;margin-top:10px">'+shown.map(function(h){var p=h.p,last=lookupDate(p.last_activity_at||p.last_email_at||p.updated_at);return'<button type="button" data-live-open="'+E(p.id)+'" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;padding:9px 11px;cursor:pointer"><span><b style="display:block;font-size:13px">'+E(p.name||'Projekt')+'</b><small style="display:block;margin-top:2px;color:rgba(255,255,255,.7)">'+E([p.client,lookupState(p),last?('aktivitet '+last):''].filter(Boolean).join(' · '))+'</small></span><span aria-hidden="true">→</span></button>';}).join('')+'</div>';
  var input=form.querySelector('.pst-live-input'),send=form.querySelector('.pst-live-send');if(input){input.value='';input.disabled=false;}if(send){send.disabled=false;send.classList.remove('is-busy');send.textContent='↑';}
  return true;
}
async function broadLookupSubmit(e){
  var form=e.target;if(!form||!form.matches||!form.matches('#pst-project-control-home-v2 .pst-live-command'))return;
  if(form.dataset.pstLookupBypass==='1'){delete form.dataset.pstLookupBypass;return;}
  var input=form.querySelector('.pst-live-input'),q=S(input&&input.value).trim();if(!isBroadLookup(q))return;
  e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  try{
    var hits=lookupHits(q,await lookupRows());
    if(hits.length>1){renderMultiLookup(form,q,hits);return;}
  }catch(x){}
  form.dataset.pstLookupBypass='1';
  if(typeof form.requestSubmit==='function')form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
}
function projectPageVisible(){var p=document.getElementById('page-workspace-project');if(!p)return false;try{return p.classList.contains('active')&&(!window.getComputedStyle||window.getComputedStyle(p).display!=='none');}catch(e){return p.classList.contains('active')&&p.style.display!=='none';}}
function setProjectIdentity(id){
  window.__pstCurrentProjectId=S(id);window._curProjId=S(id);
  var s=document.getElementById('global-proj');if(s){s.value=S(id);try{s.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}
}
async function openProjectResilient(id){
  id=S(id).trim();if(!id)return false;setProjectIdentity(id);
  var primary=window.pstOpenProjectWorkspace;
  if(typeof primary==='function'){
    try{await Promise.resolve(primary.call(window,id));if(projectPageVisible())return true;}catch(e){console.warn('PPPP canonical project open failed',e);}
  }
  if(typeof window.loadProject==='function'){
    try{await Promise.resolve(window.loadProject(id));return true;}catch(e){console.warn('PPPP loadProject fallback failed',e);}
  }
  var legacy=window.__pstWorkspaceLegacy||{},old=legacy.openOverview||window.openOverview;
  if(typeof old==='function'){
    try{await Promise.resolve(old.call(window,id));return true;}catch(e){console.warn('PPPP overview fallback failed',e);}
  }
  try{if(window.PSTPrimaryNavResilienceV10&&typeof window.PSTPrimaryNavResilienceV10.openProjects==='function')window.PSTPrimaryNavResilienceV10.openProjects();else if(typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('projects');}catch(e){}
  return false;
}
function projectClickTarget(target){
  if(!target||!target.closest)return null;
  return target.closest('#pst-project-control-home-v2 [data-live-project],#pst-project-control-home-v2 [data-live-open],#page-workspace-projects [data-pm-open]');
}
function interceptProjectOpen(e){
  var t=projectClickTarget(e.target);if(!t)return;var id=t.getAttribute('data-live-project')||t.getAttribute('data-live-open')||t.getAttribute('data-pm-open');if(!id)return;
  e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProjectResilient(id);
}
function interceptProjectKey(e){var t=projectClickTarget(e.target);if(!t||(e.key!=='Enter'&&e.key!==' '))return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();var id=t.getAttribute('data-live-project')||t.getAttribute('data-live-open')||t.getAttribute('data-pm-open');openProjectResilient(id);}
document.addEventListener('submit',broadLookupSubmit,true);
document.addEventListener('click',interceptProjectOpen,true);
document.addEventListener('keydown',interceptProjectKey,true);

function active(){var p=page();return !!(p&&p.classList.contains('active'));}
function nativeRow(key){
  var rows=document.querySelectorAll('#pst-ws-home-actions .pst-canonical-action[data-ws-action]');
  for(var i=0;i<rows.length;i++)if(S(rows[i].getAttribute('data-ws-action'))===S(key))return rows[i];
  return null;
}
function openProject(id){return openProjectResilient(id);}
function proxyAction(key){
  key=S(key);if(key.indexOf('project:')===0)return openProject(key.slice(8));
  var row=nativeRow(key);if(!row)return false;
  var b=row.querySelector('.pst-ws-action-open,[data-pst-action="open"],[data-action="open"]');
  if(b){b.click();return true;}row.click();return true;
}
function actionProject(a){return S(a&&((a.project_name||a.name||a.project_title||a.project)||''));}
function actionTitle(a){return S(a&&((a.title||a.text||a.action)||'Hap veprimin'));}
function actionWhy(a){return S(a&&((a.why||a.reason||a.meta)||''));}
function actionTag(a){return S(a&&((a.tag||a.label)||'VEPRIM'));}
function projectId(p){return S(p&&((p.id||p.project_id)||''));}
function projectName(p){return S(p&&((p.name||p.project_name||p.title)||'Projekt'));}
function projectClient(p){return S(p&&((p.client||p.client_name)||''));}
function projectStage(p){return S(p&&((p.next_action||p.next_step||p.stage_label||p.pipeline_stage)||''));}
function fallbackProjectAction(p){
  var id=projectId(p);return{key:'project:'+id,title:projectStage(p)||'Vazhdo punën në projekt',project_name:projectName(p),why:projectClient(p)?'Klienti: '+projectClient(p):'Projekt pa veprim të veçantë të krijuar.',tag:'PROJEKT'};
}
function displayActions(snap){
  snap=snap||{actions:[],projects:[]};var actions=A(snap.actions).slice(0,5).filter(function(a){return a&&S(a.key).trim();});
  if(actions.length)return actions;return A(snap.projects).filter(function(p){return projectId(p);}).slice(0,5).map(fallbackProjectAction);
}
function card(a){
  var project=actionProject(a),why=actionWhy(a),key=S(a&&a.key);
  return '<article class="pst-hao-card" role="button" tabindex="0" data-pst-home-action="'+E(key)+'" aria-label="'+E(actionTitle(a))+'">'
    +'<div class="pst-hao-copy"><div class="pst-hao-top"><span class="pst-hao-tag">'+E(actionTag(a))+'</span>'+(project?'<span class="pst-hao-project">'+E(project)+'</span>':'')+'</div>'
    +'<h2>'+E(actionTitle(a))+'</h2>'+(why?'<p><b>Pse tani?</b> '+E(why)+'</p>':'')+'</div><span class="pst-hao-arrow" aria-hidden="true">→</span></article>';
}
function installStyle(){
  if(document.getElementById('pst-home-action-only-css'))return;var s=document.createElement('style');s.id='pst-home-action-only-css';s.textContent='\
#page-workspace-home.pst-home-action-only> :not(#pst-home-operating-grid-v1){display:none!important}\
#page-workspace-home.pst-home-action-only>#pst-openai-assistant-v1{display:block!important}\
#page-workspace-home.pst-home-action-only{padding-top:0!important}\
#pst-home-operating-grid-v1{display:block!important;max-width:1120px;margin:0 auto;padding:34px 28px 24px}\
#page-workspace-home.pst-home-action-only>#pst-openai-assistant-v1{max-width:1120px;margin:0 auto 64px!important}\
.pst-hao-head{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid #e5e8ea}\
.pst-hao-head span{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#7a838b;margin-bottom:6px}\
.pst-hao-head h1{font-size:28px;line-height:1.15;letter-spacing:-.025em;color:#273f49;margin:0}\
.pst-hao-head p{max-width:610px;margin:7px 0 0;color:#65747a;font-size:13px;line-height:1.5}\
.pst-hao-count{flex:0 0 auto;font-size:12px;font-weight:800;color:#49616f;background:#eef3f5;border:1px solid #d8e0e4;border-radius:999px;padding:7px 11px}\
.pst-hao-list{display:grid;grid-template-columns:1fr;gap:12px}\
.pst-hao-card{display:flex;align-items:center;justify-content:space-between;gap:22px;background:#fff;border:1px solid #dfe7ea;border-left:4px solid #6f9eaf;border-radius:14px;padding:19px 20px 19px 21px;box-shadow:0 1px 2px rgba(23,38,61,.035);cursor:pointer;transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease,background .15s ease}\
.pst-hao-card:hover,.pst-hao-card:focus-visible{border-color:#9ab8c3;border-left-color:#397f98;background:#f8fbfc;box-shadow:0 8px 22px rgba(23,55,67,.075);transform:translateY(-1px);outline:none}\
.pst-hao-copy{min-width:0;flex:1}.pst-hao-top{display:flex;align-items:center;gap:9px;min-width:0;margin-bottom:7px}\
.pst-hao-tag{font-size:9.5px;font-weight:850;letter-spacing:.075em;text-transform:uppercase;color:#527e8f;background:#edf5f7;border-radius:999px;padding:4px 7px;white-space:nowrap}\
.pst-hao-project{font-size:12px;font-weight:800;color:#3e6675;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\
.pst-hao-card h2{font-size:16px;line-height:1.3;color:#273f49;margin:0;font-weight:750}.pst-hao-card p{font-size:12px;line-height:1.5;color:#6a747c;margin:7px 0 0}.pst-hao-card p b{color:#49545d}\
.pst-hao-arrow{flex:0 0 auto;font-size:22px!important;line-height:1;color:#548396!important;margin:0!important;letter-spacing:0!important}\
.pst-hao-empty{background:#fff;border:1px solid #dfe4e7;border-radius:14px;padding:34px 24px;text-align:center;color:#65707a}.pst-hao-empty b{display:block;color:#273f49;font-size:17px;margin-bottom:5px}.pst-hao-empty span{font-size:12px}\
@media(max-width:720px){#pst-home-operating-grid-v1{padding:24px 16px 20px}.pst-hao-head{align-items:flex-start;flex-direction:column}.pst-hao-card{align-items:flex-start}.pst-hao-arrow{align-self:center}#page-workspace-home.pst-home-action-only>#pst-openai-assistant-v1{margin-bottom:48px!important}}\
';document.head.appendChild(s);
}
function host(){
  if(retireForLiveHome())return null;
  var p=page();if(!p)return null;p.classList.add('pst-home-action-only','pst-home-grid-final');var h=document.getElementById('pst-home-operating-grid-v1');
  if(!h){h=document.createElement('main');h.id='pst-home-operating-grid-v1';h.setAttribute('data-pst-home-final-presentation','action-only');p.appendChild(h);}return h;
}
function runAction(key){if(!proxyAction(key))console.warn('PPPP Home: canonical action target missing',key);}
function bind(h){h.querySelectorAll('[data-pst-home-action]').forEach(function(c){c.onclick=function(){runAction(c.getAttribute('data-pst-home-action'));};c.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();runAction(c.getAttribute('data-pst-home-action'));}};});}
function renderLoaded(data){
  if(retireForLiveHome())return false;
  var p=page();if(!p||!p.classList.contains('active'))return false;installStyle();var h=host();if(!h)return false;var snap=data&&data.snap?data.snap:snapshot();var actions=displayActions(snap);
  h.innerHTML='<header class="pst-hao-head"><div><span>HOME</span><h1>Projektet që kërkojnë veprimin tënd</h1><p>PPPP vendos projektet përpara: çfarë po ndodh, pse kërkon vëmendje dhe cili është hapi i radhës.</p></div>'+(actions.length?'<div class="pst-hao-count">'+actions.length+' për tani</div>':'')+'</header>'
    +(actions.length?'<section class="pst-hao-list">'+actions.map(card).join('')+'</section>':'<section class="pst-hao-empty"><b>Asnjë projekt nuk kërkon ndërhyrjen tënde tani.</b><span>PPPP vazhdon të monitorojë projektet dhe do ta nxjerrë këtu veprimin e radhës kur nevojitet.</span></section>');bind(h);scheduleLiveHomeHandoff();return true;
}
function render(){if(retireForLiveHome())return false;if(!active())return false;return renderLoaded({snap:snapshot()});}
function schedule(){if(retireForLiveHome())return;if(typeof queueMicrotask==='function')queueMicrotask(render);else Promise.resolve().then(render);}
function homeIntent(el){if(!el||!el.closest)return false;var n=el.closest('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"],button');if(!n)return false;var t=S(n.textContent).toLowerCase().trim();return n.matches('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"]')||t==='home';}
function boot(){installStyle();if(retireForLiveHome())return;scheduleLiveHomeHandoff();if(active())render();}
document.addEventListener('pst:home-canonical-rendered',schedule);document.addEventListener('pst:modules-ready',schedule);document.addEventListener('click',function(e){if(homeIntent(e.target))schedule();},true);window.addEventListener('focus',function(){if(active())schedule();});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTHomeOperatingGridV1={version:VERSION,render:render,refresh:render,renderLoaded:renderLoaded,snapshot:snapshot,openProjectResilient:openProjectResilient,lookupHits:lookupHits,_test:{proxyAction:proxyAction,nativeRow:nativeRow,openProject:openProject,displayActions:displayActions,actionProject:actionProject,actionTitle:actionTitle,actionWhy:actionWhy,actionTag:actionTag,active:active,homeIntent:homeIntent,liveHomeRoot:liveHomeRoot,retireForLiveHome:retireForLiveHome,scheduleLiveHomeHandoff:scheduleLiveHomeHandoff,lookupScore:lookupScore,isBroadLookup:isBroadLookup,lookupState:lookupState,projectClickTarget:projectClickTarget}};
})();