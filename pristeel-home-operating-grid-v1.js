/* PRISTEEL Home Operating Grid v4.3
 * Legacy compatibility fallback only. Live Home is the production Home owner.
 * Canonical Home remains a backstage data/state source.
 * This module performs no Supabase reads/writes and no outbound actions.
 */
(function(){
'use strict';
if(window.__pstHomeOperatingGridV1)return;
window.__pstHomeOperatingGridV1=true;

var VERSION='20260830-live-home-stability-3';
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function snapshot(){
  try{var H=window.PSTHomeCanonicalV1;return H&&typeof H.snapshot==='function'?H.snapshot():{actions:[],waiting:[],projects:[]};}
  catch(e){return{actions:[],waiting:[],projects:[]};}
}
function page(){return document.getElementById('page-workspace-home');}
function liveHomeRoot(){
  var p=page(),root=document.getElementById('pst-project-control-home-v2');
  return p&&root&&p.contains(root)&&window.__pstLiveHomeV3?root:null;
}
function liveOwnerName(){if(window.__pstLiveHomeV7)return'live-home-v7';if(window.__pstLiveHomeV6)return'live-home-v6';if(window.__pstLiveHomeV5)return'live-home-v5';return'live-home-v3';}
function markAwaitingLive(){
  var p=page();if(!p)return false;
  if(liveHomeRoot())return retireForLiveHome();
  p.classList.add('pst-home-awaiting-live');
  p.setAttribute('data-pst-home-owner','live-home-pending');
  return true;
}
function retireForLiveHome(){
  var p=page(),root=liveHomeRoot();if(!p||!root)return false;
  p.classList.remove('pst-home-action-only','pst-home-grid-final','pst-home-awaiting-live');
  p.setAttribute('data-pst-home-owner',liveOwnerName());
  var h=document.getElementById('pst-home-operating-grid-v1');
  if(h&&h.parentNode)h.parentNode.removeChild(h);
  return true;
}
function scheduleLiveHomeHandoff(){
  [0,50,120,240,400,700,1000,1400,1900,2500,3200,4500,6000].forEach(function(ms){setTimeout(retireForLiveHome,ms);});
}

/* Read-only resilience for the actual Live Home owner. The project-control owner
 * already owns and refreshes the project dataset; this layer only reuses that
 * in-memory state so a broad term such as STACON does not enter the slow unique-
 * project AI/update path. */
function liveProjectState(){var H=window.PSTProjectControlHomeV1,s=H&&H._state;return s&&A(s.projects).length?A(s.projects):[];}
async function ensureLiveProjects(){var rows=liveProjectState(),H=window.PSTProjectControlHomeV1;if(rows.length)return rows;if(H&&typeof H.load==='function'){try{await H.load(true);}catch(e){}}return liveProjectState();}
function identityValues(p){return [p&&p.name,p&&p.client,p&&p.business_ref,p&&p.ref].concat(A(p&&p.identity_aliases)).map(N).filter(function(x){return x.length>=3;});}
function identityScore(q,p){var n=N(q),score=0;identityValues(p).forEach(function(x){if(n.indexOf(x)>-1)score=Math.max(score,100+x.length);x.split(' ').filter(function(w){return w.length>=4;}).forEach(function(w){if(n.indexOf(w)>-1)score=Math.max(score,20+w.length);});});return score;}
function matchingProjects(q,rows){var out=[];A(rows).forEach(function(p){var score=identityScore(q,p);if(score)out.push({p:p,score:score,time:Date.parse(p.last_activity_at||p.last_email_at||p.updated_at||'')||0});});out.sort(function(a,b){return b.score-a.score||b.time-a.time;});return out;}
function lookupIntent(q){var n=N(q),words=n.split(' ').filter(Boolean);if(!n)return false;if(/\?$/.test(S(q).trim())||/^(cka|cfare|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/.test(n))return true;return words.length<=4;}
function stateLabel(p){var o=N(p&&p.operational_state),s=N(p&&p.status);if(o==='execution')return'Në realizim';if(o==='action required')return'Kërkon veprim';if(o==='wait for client')return'Në pritje të klientit';if(o==='wait for supplier')return'Në pritje të furnitorit';if(/humb|lost/.test(s))return'Humbur';if(/fituar|won/.test(s))return'Fituar';if(/pritje|pending|waiting/.test(s))return'Në pritje';return S(p&&p.status||'Aktiv');}
function shortDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'}):'';}
function renderMatches(form,q,hits){var root=form.closest('#pst-project-control-home-v2'),r=root&&root.querySelector('.pst-live-result');if(!r)return false;var count=hits.length;r.hidden=false;r.innerHTML='<div class="pst-live-answer"><b>U gjet'+(count===1?'':'ën')+' '+count+' projekt'+(count===1?'':'e')+' që lidhen me “'+E(S(q).trim())+'”.</b><br>'+(count===1?'Hap projektin:':'Zgjidh projektin që dëshiron:')+'</div><div style="display:grid;gap:7px;margin-top:10px">'+hits.slice(0,8).map(function(h){var p=h.p,d=shortDate(p.last_activity_at||p.last_email_at||p.updated_at);return'<button type="button" data-live-open="'+E(p.id)+'" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;text-align:left;border:1px solid rgba(255,255,255,.22);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;padding:9px 11px;cursor:pointer"><span><b style="display:block;font-size:13px">'+E(p.name||'Projekt')+'</b><small style="display:block;margin-top:2px;color:rgba(255,255,255,.7)">'+E([p.client,stateLabel(p),p.ref||p.business_ref,d?('aktivitet '+d):''].filter(Boolean).join(' · '))+'</small></span><span aria-hidden="true">→</span></button>';}).join('')+'</div>';var input=form.querySelector('.pst-live-input');if(input)input.value='';return true;}
function renderLookupBusy(form,q){var root=form.closest('#pst-project-control-home-v2'),r=root&&root.querySelector('.pst-live-result');if(!r)return false;r.hidden=false;r.innerHTML='<div class="pst-live-thinking"><span class="pst-live-thinking-orb"><i></i><i></i><i></i></span><div><b>PPPP po kërkon projektet</b><span>Po kontrolloj projektet që përputhen me “'+E(S(q).trim())+'”…</span><small>Faqja është aktive; mund të vazhdosh sapo të shfaqen rezultatet.</small></div></div>';return true;}
function nextPaint(){return new Promise(function(resolve){if(typeof window.requestAnimationFrame==='function')window.requestAnimationFrame(function(){setTimeout(resolve,0);});else setTimeout(resolve,0);});}
async function broadLookupSubmit(e){
  var form=e.target;if(!form||!form.matches||!form.matches('#pst-project-control-home-v2 .pst-live-command'))return;
  if(form.dataset.pstLookupBypass==='1'){delete form.dataset.pstLookupBypass;return;}
  var input=form.querySelector('.pst-live-input'),q=S(input&&input.value).trim();if(!lookupIntent(q))return;
  var rows=liveProjectState(),hits=matchingProjects(q,rows);
  if(hits.length>1){e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();renderMatches(form,q,hits);return;}
  if(rows.length)return;
  e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();
  renderLookupBusy(form,q);await nextPaint();
  try{hits=matchingProjects(q,await ensureLiveProjects());}catch(x){hits=[];}
  if(hits.length){renderMatches(form,q,hits);return;}
  form.dataset.pstLookupBypass='1';if(typeof form.requestSubmit==='function')form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
}
function projectPageVisible(){var p=document.getElementById('page-workspace-project');return !!(p&&p.classList.contains('active')&&p.style.display!=='none');}
function setProjectIdentity(id){window.__pstCurrentProjectId=S(id);window._curProjId=S(id);var s=document.getElementById('global-proj');if(s){s.value=S(id);try{s.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}}}
async function openProjectResilient(id){id=S(id).trim();if(!id)return false;setProjectIdentity(id);if(typeof window.pstOpenProjectWorkspace==='function'){try{await Promise.resolve(window.pstOpenProjectWorkspace(id));if(projectPageVisible())return true;}catch(e){console.warn('PPPP project open:',e);}}if(typeof window.loadProject==='function'){try{await Promise.resolve(window.loadProject(id));return true;}catch(e){}}var L=window.__pstWorkspaceLegacy||{},old=L.openOverview||window.openOverview;if(typeof old==='function'){try{await Promise.resolve(old(id));return true;}catch(e){}}if(typeof window.pstWorkspaceGo==='function'){try{window.pstWorkspaceGo('projects');}catch(e){}}return false;}
function projectTarget(t){return t&&t.closest?t.closest('#pst-project-control-home-v2 [data-live-project],#pst-project-control-home-v2 [data-live-open],#page-workspace-projects [data-pm-open],#page-workspace-projects [data-project-id]'):null;}
function captureProjectOpen(e){var t=projectTarget(e.target);if(!t)return;var id=t.getAttribute('data-live-project')||t.getAttribute('data-live-open')||t.getAttribute('data-pm-open')||t.getAttribute('data-project-id');if(!id)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProjectResilient(id);}
function captureProjectKey(e){if(e.key!=='Enter'&&e.key!==' ')return;var t=projectTarget(e.target);if(!t)return;var id=t.getAttribute('data-live-project')||t.getAttribute('data-live-open')||t.getAttribute('data-pm-open')||t.getAttribute('data-project-id');if(!id)return;e.preventDefault();e.stopPropagation();if(typeof e.stopImmediatePropagation==='function')e.stopImmediatePropagation();openProjectResilient(id);}
document.addEventListener('submit',broadLookupSubmit,true);
document.addEventListener('click',captureProjectOpen,true);
document.addEventListener('keydown',captureProjectKey,true);

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
#page-workspace-home.pst-home-awaiting-live> :not(#pst-project-control-home-v2){display:none!important}\
#page-workspace-home.pst-home-awaiting-live{min-height:100vh!important;padding-top:0!important}\
#page-workspace-home.pst-home-awaiting-live:before{content:"PPPP po ngarkohet…";display:block;max-width:1120px;margin:0 auto;padding:54px 28px;font-size:13px;font-weight:750;color:#6f858d}\
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
  var p=page();if(!p)return null;p.classList.remove('pst-home-awaiting-live');p.classList.add('pst-home-action-only','pst-home-grid-final');var h=document.getElementById('pst-home-operating-grid-v1');
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
function schedule(){if(retireForLiveHome())return;installStyle();markAwaitingLive();scheduleLiveHomeHandoff();}
function homeIntent(el){if(!el||!el.closest)return false;var n=el.closest('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"],button');if(!n)return false;var t=S(n.textContent).toLowerCase().trim();return n.matches('[data-ws-go="home"],[data-nav="home"],[data-pst-nav="home"],a[href="#home"]')||t==='home';}
function boot(){installStyle();markAwaitingLive();if(retireForLiveHome())return;scheduleLiveHomeHandoff();}
document.addEventListener('pst:home-canonical-rendered',schedule);document.addEventListener('pst:modules-ready',schedule);document.addEventListener('click',function(e){if(homeIntent(e.target))schedule();},true);window.addEventListener('focus',function(){if(active())schedule();});
markAwaitingLive();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.PSTHomeOperatingGridV1={version:VERSION,render:render,refresh:render,renderLoaded:renderLoaded,snapshot:snapshot,openProjectResilient:openProjectResilient,_test:{proxyAction:proxyAction,nativeRow:nativeRow,openProject:openProject,displayActions:displayActions,actionProject:actionProject,actionTitle:actionTitle,actionWhy:actionWhy,actionTag:actionTag,active:active,homeIntent:homeIntent,liveHomeRoot:liveHomeRoot,retireForLiveHome:retireForLiveHome,scheduleLiveHomeHandoff:scheduleLiveHomeHandoff,matchingProjects:matchingProjects,lookupIntent:lookupIntent,projectTarget:projectTarget,markAwaitingLive:markAwaitingLive}};
})();
