/* PRISTEEL Live Home v4
 * Home is an operator surface, not a task/event dump.
 * It shows only explicit verified actions plus one current confirmed state per project.
 * Raw Gmail, supplier, document and system queues remain evidence backstage.
 */
(function(){
'use strict';
if(window.__pstProjectControlHomeV2){
  try{if(window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.apply==='function')window.PSTProjectControlHomeV1.apply(true);}catch(e){}
  return;
}
window.__pstProjectControlHomeV2=true;
window.__pstLiveHomeV3=true; // compatibility marker used by the retired Home renderer
window.__pstLiveHomeV4=true;

var state={busy:false,loading:false,projects:[],actions:[],facts:[],updates:[],last:null,loadedAt:0};
function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function ts(v){var n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
function clamp(v,n){v=S(v).replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v;}
function iso(d){return new Date(d).toISOString();}
function activeHome(){
  var p=document.getElementById('page-workspace-home');
  if(!p)return null;
  if(p.style&&p.style.display==='none')return null;
  try{var cs=window.getComputedStyle?window.getComputedStyle(p):null;if(cs&&cs.display==='none')return null;}catch(e){}
  return p;
}
function db(path){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
function shortDate(v){
  var d=new Date(v);if(isNaN(d.getTime()))return'';
  var now=new Date(),y=new Date(now);y.setDate(now.getDate()-1);
  var hm=d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  if(d.toDateString()===now.toDateString())return'Sot · '+hm;
  if(d.toDateString()===y.toDateString())return'Dje · '+hm;
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'})+' · '+hm;
}
function dueLabel(v){
  if(!v)return'';
  var d=new Date(v+'T12:00:00'),now=new Date();if(isNaN(d.getTime()))return'';
  var days=Math.round((d-new Date(now.getFullYear(),now.getMonth(),now.getDate(),12))/86400000);
  if(days===0)return'Sot';if(days===1)return'Nesër';
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'});
}
function projectMap(){var m={};state.projects.forEach(function(p){m[S(p.id)]=p;});return m;}
function priorityScore(a){
  var p=N(a.priority),s=10;
  if(/urgjent|critical/.test(p))s=40;else if(/e larte|larte|high/.test(p))s=30;else if(/mesatare|medium/.test(p))s=20;
  var d=ts(a.due_date?String(a.due_date)+'T12:00:00':'');if(d&&d<Date.now()+86400000)s+=8;
  var source=N(a.source);if(source==='email request auto')s+=7;if(source==='manual')s+=6;
  return s;
}
function groupedActions(){
  var by={},out=[];
  A(state.actions).forEach(function(a){var id=S(a.project_id);if(!id)return;(by[id]||(by[id]=[])).push(a);});
  Object.keys(by).forEach(function(id){
    var rows=by[id].sort(function(a,b){return priorityScore(b)-priorityScore(a)||ts(b.created_at)-ts(a.created_at);});
    var top=rows[0],p=state.projects.find(function(x){return S(x.id)===id;});
    out.push({project:p||{id:id,name:top.project_name,client:top.client},top:top,count:rows.length,score:priorityScore(top),time:ts(top.created_at)});
  });
  return out.sort(function(a,b){return b.score-a.score||b.time-a.time;}).slice(0,8);
}
function factText(f){
  var v=f&&f.value;
  if(v&&typeof v==='object')return S(v.summary||v.text||v.current_state||v.next_action||'');
  return S(v);
}
function updateStateLabel(txt){
  var n=N(txt);
  if(/nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow/.test(n))return'Pa veprim';
  if(/ne pritje|pret |presim|waiting|afatin|deri me|deri më/.test(n))return'Në pritje';
  if(/aprov|approved|green light|driten e gjelber|dritën e gjelbër/.test(n))return'Konfirmuar';
  return'Aktiv';
}
function buildProjectUpdates(){
  var pmap=projectMap(),latest={};
  A(state.facts).forEach(function(f){
    if(N(f.category)!=='operator update')return;
    if(N(f.evidence_status)!=='confirmed'||N(f.fact_status)!=='observed')return;
    var p=pmap[S(f.project_id)],txt=factText(f),time=ts(f.updated_at||f.created_at);
    if(!p||!txt||!time)return;
    var row={project_id:p.id,project:p.name,client:p.client||'',time:time,detail:clamp(txt,420),state:updateStateLabel(txt)};
    if(!latest[p.id]||time>latest[p.id].time)latest[p.id]=row;
  });
  state.updates=Object.keys(latest).map(function(k){return latest[k];}).sort(function(a,b){return b.time-a.time;}).slice(0,10);
}
function latestSync(){
  var vals=[state.loadedAt].concat(state.updates.map(function(a){return a.time;})),t=Math.max.apply(null,vals);
  return t?shortDate(t):'';
}
function renderResult(root){
  var r=root.querySelector('.pst-live-result');if(!r)return;
  if(!state.last){r.hidden=true;r.innerHTML='';return;}r.hidden=false;
  if(state.last.kind==='error'){r.innerHTML='<div class="pst-live-msg err">'+E(state.last.text)+'</div>';return;}
  if(state.last.kind==='update'){r.innerHTML='<div class="pst-live-msg ok"><b>'+E(state.last.project||'Projekti')+'</b><span>'+E(state.last.text||'Update-i u ruajt.')+'</span></div>';return;}
  var x=state.last.data||{},html='<div class="pst-live-answer">'+E(x.answer||state.last.text||'').replace(/\n/g,'<br>')+'</div>';
  if(x.suggested_next_step)html+='<div class="pst-live-suggest"><b>Hapi i sugjeruar</b><span>'+E(x.suggested_next_step)+'</span></div>';
  if(x.navigation&&x.navigation.project_id)html+='<button type="button" class="pst-live-open-answer" data-live-open="'+E(x.navigation.project_id)+'">Hap '+E(x.navigation.project_name||'projektin')+' →</button>';
  r.innerHTML=html;
}
function render(){
  var page=activeHome();if(!page)return false;
  var root=ensureRoot(page),actions=groupedActions(),updates=state.updates;
  if(!root)return false;
  root.querySelector('.pst-live-sync').textContent=state.loading?'Po sinkronizohet…':(latestSync()?'Sinkronizuar '+latestSync():'');
  root.querySelector('.pst-live-action-count').textContent=actions.length?actions.length+' projekt'+(actions.length===1?'':'e'):'';
  root.querySelector('.pst-live-actions').innerHTML=actions.length?actions.map(function(x){
    var a=x.top,p=x.project,d=dueLabel(a.due_date);
    return '<article class="pst-live-action" role="button" tabindex="0" data-live-project="'+E(p.id)+'">'
      +'<div class="pst-live-action-main"><div class="pst-live-action-top"><span>'+E(p.name||a.project_name||'Projekt')+'</span>'+(d?'<time>'+E(d)+'</time>':'')+'</div>'
      +'<h3>'+E(clamp(a.title,170))+'</h3>'
      +(a.detail?'<p>'+E(clamp(a.detail,340))+'</p>':'')
      +'<div class="pst-live-action-foot"><span>'+E(p.client||'')+'</span>'+(x.count>1?'<small>+'+(x.count-1)+' veprime të tjera të konfirmuara</small>':'')+'</div></div><div class="pst-live-arrow">→</div></article>';
  }).join(''):'<div class="pst-live-clear"><div>✓</div><b>Nuk ka asgjë të konfirmuar që kërkon veprimin tënd tani.</b><span>Kjo është normale. Home nuk shfaq review queues, certifikata, follow-up automatik ose draft-e vetëm sepse ekzistojnë në sistem.</span></div>';
  root.querySelector('.pst-live-updates').innerHTML=updates.length?updates.map(function(a){
    return '<article class="pst-live-update" role="button" tabindex="0" data-live-project="'+E(a.project_id)+'">'
      +'<div class="pst-live-update-top"><div><span>'+E(a.client||'PROJEKT')+'</span><h3>'+E(a.project)+'</h3></div><div class="pst-live-update-meta"><b>'+E(a.state)+'</b><time>'+E(shortDate(a.time))+'</time></div></div>'
      +'<p>'+E(a.detail)+'</p><div class="pst-live-update-open">Hap projektin →</div></article>';
  }).join(''):'<div class="pst-live-empty">Nuk ka update të konfirmuara të projekteve për këtë periudhë.</div>';
  var btn=root.querySelector('.pst-live-send'),input=root.querySelector('.pst-live-input');
  if(btn){btn.disabled=state.busy;btn.textContent=state.busy?'…':'↑';}
  if(input)input.disabled=state.busy;
  renderResult(root);return true;
}
function ensureRoot(page){
  if(!page)return null;
  var root=document.getElementById('pst-project-control-home-v2');
  if(root){if(!page.contains(root))page.appendChild(root);return root;}
  var old=document.getElementById('pst-project-control-home-v1');if(old)old.remove();
  root=document.createElement('section');root.id='pst-project-control-home-v2';
  root.innerHTML=''
    +'<header class="pst-live-head"><div><span class="pst-live-kicker"><i></i> PPPP LIVE</span><h1>Çfarë duhet të dish tani</h1><p>Home tregon vetëm veprimet e konfirmuara dhe gjendjen më të fundit të projekteve. Gjithçka tjetër mbetet backstage.</p></div><small class="pst-live-sync"></small></header>'
    +'<form class="pst-live-command"><div class="pst-live-command-mark">P</div><textarea rows="1" class="pst-live-input" placeholder="Pyet PPPP, ose jep një update për një projekt"></textarea><button class="pst-live-send" type="submit" aria-label="Dërgo">↑</button></form><div class="pst-live-result" hidden></div>'
    +'<section class="pst-live-panel pst-live-needs"><header><div><span>PËR TY TANI</span><h2>Veprime të konfirmuara</h2><p>Vetëm kur PPPP ka evidencë të qartë se duhet të bësh diçka.</p></div><small class="pst-live-action-count"></small></header><div class="pst-live-actions"></div></section>'
    +'<section class="pst-live-panel pst-live-status"><header><div><span>GJENDJA E FUNDIT</span><h2>Projektet që kanë ndryshuar</h2><p>Një përmbledhje aktuale për projekt, jo listë emailash.</p></div></header><div class="pst-live-updates"></div></section>';
  page.appendChild(root);bind(root);return root;
}
function isQuestion(q){return /\?|^(cka|çka|cfare|çfarë|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/i.test(S(q).trim());}
function identityValues(p){return [p.name,p.business_ref,p.ref].concat(A(p.identity_aliases)).map(N).filter(function(x){return x.length>=5;});}
function resolveLocal(q){
  var n=N(q),hits=[];
  state.projects.forEach(function(p){var score=0;identityValues(p).forEach(function(x){if(n.indexOf(x)>-1)score=Math.max(score,x.length);});if(score)hits.push({p:p,score:score});});
  hits.sort(function(a,b){return b.score-a.score;});return hits.length&&(!hits[1]||hits[0].score>hits[1].score+1)?hits[0].p:null;
}
async function askAI(q){var AI=window.PSTOpenAIAssistantV1;if(!AI||typeof AI.ask!=='function')throw new Error('PPPP AI nuk është gati.');return AI.ask(q,{scope:'global'});}
async function edgeOperator(projectId,update){
  var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase nuk është gati.');
  var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
  async function run(t){return fetch(base+'/functions/v1/pppp-project-operator-update',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({project_id:projectId,update:update})});}
  var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}
  if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,700));return data;
}
async function submit(q){
  state.busy=true;render();
  try{
    if(isQuestion(q)){state.last={kind:'answer',data:await askAI(q)};return;}
    var p=resolveLocal(q),probe=null;
    if(!p){probe=await askAI('Identifiko vetëm projektin PPPP që i përket këtij update-i operativ. Mos hamendëso nëse nuk është unik. Update: '+q);var pid=probe&&probe.navigation&&probe.navigation.project_id;p=state.projects.find(function(x){return S(x.id)===S(pid);})||null;}
    if(!p)throw new Error('Nuk e lidha dot me një projekt unik. Përmend emrin e projektit në update.');
    var out=await edgeOperator(p.id,q);state.last={kind:'update',project:p.name,text:out.summary||'Update-i u ruajt.'};await load(true);
  }catch(e){state.last={kind:'error',text:S(e&&e.message||e)};}finally{state.busy=false;render();}
}
function openProject(id){if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);}
function bind(root){
  if(root.dataset.bound==='1')return;root.dataset.bound='1';
  var form=root.querySelector('.pst-live-command'),input=root.querySelector('.pst-live-input');
  form.addEventListener('submit',function(e){e.preventDefault();var q=S(input.value).trim();if(!q||state.busy)return;input.value='';submit(q);});
  input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  root.addEventListener('click',function(e){var t=e.target.closest('[data-live-project],[data-live-open]');if(t)openProject(t.getAttribute('data-live-project')||t.getAttribute('data-live-open'));});
  root.addEventListener('keydown',function(e){var t=e.target.closest('[data-live-project]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openProject(t.getAttribute('data-live-project'));}});
}
async function load(force){
  if(!activeHome())return false;if(state.loading)return false;if(!force&&state.loadedAt&&Date.now()-state.loadedAt<15000){render();return true;}
  state.loading=true;render();
  try{
    var since=new Date(Date.now()-30*86400000);
    var out=await Promise.all([
      db('projects?select=id,name,client,status,pipeline_stage,operational_state,last_activity_at,last_email_at,updated_at,business_ref,ref,identity_aliases&order=last_activity_at.desc.nullslast&limit=500'),
      db('pppp_home_current_actions_v1?select=id,project_id,project_name,client,title,detail,due_date,priority,status,source,source_ref,category,created_at,operational_state,operational_state_at,pipeline_stage,last_activity_at,last_email_at&order=created_at.desc&limit=100').catch(function(){return[];}),
      db('pppp_project_context_current_v?select=id,project_id,category,subject,fact_key,value,source_type,evidence_status,fact_status,created_at,updated_at&category=eq.operator_update&evidence_status=eq.confirmed&fact_status=eq.observed&updated_at=gte.'+encodeURIComponent(iso(since))+'&order=updated_at.desc&limit=300').catch(function(){return[];})
    ]);
    state.projects=A(out[0]);state.actions=A(out[1]);state.facts=A(out[2]);buildProjectUpdates();state.loadedAt=Date.now();return true;
  }catch(e){console.warn('PPPP Live Home:',e);state.last={kind:'error',text:'Home nuk arriti të lexojë gjendjen live: '+S(e&&e.message||e)};return false;}
  finally{state.loading=false;render();}
}
function css(){
  ['pst-project-control-home-v1-css','pst-project-control-home-v2-css','pst-live-home-v3-css','pst-live-home-v4-css'].forEach(function(id){var x=document.getElementById(id);if(x)x.remove();});
  var s=document.createElement('style');s.id='pst-live-home-v4-css';s.textContent=`
#page-workspace-home{background:#f5f8f9!important;min-height:100vh!important}
#pst-project-control-home-v2{display:block!important;max-width:1180px;margin:0 auto;padding:40px 28px 70px;color:#20333b;font-family:Inter,system-ui,-apple-system,sans-serif}
.pst-live-head{display:flex;justify-content:space-between;gap:28px;align-items:flex-end;padding:0 2px 24px;border-bottom:1px solid #dfe8ea}
.pst-live-kicker{display:inline-flex;align-items:center;gap:9px;font-size:11px;font-weight:850;letter-spacing:1.3px;color:#617d87}
.pst-live-kicker i{width:8px;height:8px;border-radius:50%;background:#54b77c;box-shadow:0 0 0 4px rgba(84,183,124,.11)}
.pst-live-head h1{margin:8px 0 7px;font-size:32px;line-height:1.1;letter-spacing:-.9px;color:#20343c}
.pst-live-head p{max-width:760px;font-size:14px;color:#6f858d;line-height:1.55}
.pst-live-sync{font-size:12px;color:#87999f;white-space:nowrap}
.pst-live-command{display:flex;align-items:center;gap:12px;margin:22px 0;background:#fff;border:1px solid #dce7ea;border-radius:16px;padding:9px 10px 9px 12px;box-shadow:0 5px 18px rgba(35,67,77,.05)}
.pst-live-command-mark{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:#e7f2f5;color:#377286;font-weight:850}
.pst-live-input{flex:1;min-height:42px;max-height:120px;resize:vertical;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;color:#243942!important;padding:10px 4px!important;font-size:15px!important;line-height:1.45!important}
.pst-live-input::placeholder{color:#8ea0a6}.pst-live-send{width:42px;height:42px;border:0;border-radius:11px;background:#3c8298;color:#fff;font-size:19px;cursor:pointer}.pst-live-send:disabled{opacity:.5}
.pst-live-result{margin:-8px 0 22px;padding:16px 18px;border-radius:14px;background:#eef5f7;border:1px solid #d9e8ec}.pst-live-answer{font-size:14px;line-height:1.65;color:#314b55}.pst-live-suggest{display:flex;gap:10px;margin-top:10px;font-size:13px}.pst-live-suggest b{color:#39778a}.pst-live-msg{display:flex;gap:10px;font-size:14px}.pst-live-msg.ok b{color:#387256}.pst-live-msg.err{color:#9c4b3c}.pst-live-open-answer{margin-top:10px;border:0;background:transparent;color:#39798c;font-size:13px;font-weight:800;padding:0;cursor:pointer}
.pst-live-panel{background:#fff;border:1px solid #dce6e9;border-radius:18px;box-shadow:0 5px 18px rgba(32,62,72,.045);overflow:hidden;margin-top:18px}
.pst-live-panel>header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:22px 24px 18px;border-bottom:1px solid #e7eef0}
.pst-live-panel header span{font-size:11px;letter-spacing:1.15px;font-weight:850;color:#789098}.pst-live-panel h2{margin:4px 0 3px;font-size:21px;letter-spacing:-.35px;color:#2a4048}.pst-live-panel header p{font-size:13px;color:#7b8f96;line-height:1.45}.pst-live-panel header small{font-size:12px;color:#66808a;padding-top:5px}
.pst-live-actions{padding:10px}.pst-live-action{display:grid;grid-template-columns:minmax(0,1fr) 28px;gap:16px;padding:19px 18px;margin:7px 0;border:1px solid #e2eaec;border-radius:14px;background:#fff;cursor:pointer;transition:border-color .14s,box-shadow .14s,transform .14s}
.pst-live-action:hover{border-color:#c8dade;box-shadow:0 7px 18px rgba(36,67,77,.06);transform:translateY(-1px)}.pst-live-action-top{display:flex;justify-content:space-between;gap:16px;align-items:center}.pst-live-action-top span{font-size:12px;font-weight:800;color:#557987}.pst-live-action-top time{font-size:12px;color:#84989f;white-space:nowrap}.pst-live-action h3{margin:5px 0 0;font-size:17px;line-height:1.35;color:#263c45}.pst-live-action p{margin-top:8px;font-size:14px;line-height:1.52;color:#657b84}.pst-live-action-foot{display:flex;justify-content:space-between;gap:12px;margin-top:11px;padding-top:10px;border-top:1px dashed #e4ebed;font-size:12px;color:#87999f}.pst-live-action-foot small{font-size:12px;color:#758b94}.pst-live-arrow{font-size:20px;color:#70a0af;padding-top:19px}
.pst-live-clear{padding:44px 28px;text-align:center;color:#72868d}.pst-live-clear div{margin:0 auto 11px;width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#e9f5ee;color:#4e8a67;font-size:18px}.pst-live-clear b{display:block;font-size:16px;color:#4d6670}.pst-live-clear span{display:block;max-width:720px;margin:7px auto 0;font-size:13px;line-height:1.5}
.pst-live-updates{padding:10px}.pst-live-update{padding:19px 20px;margin:7px 0;border:1px solid #e2eaec;border-radius:14px;background:#fff;cursor:pointer;transition:border-color .14s,box-shadow .14s}.pst-live-update:hover{border-color:#c8dade;box-shadow:0 7px 18px rgba(36,67,77,.055)}
.pst-live-update-top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.pst-live-update-top span{font-size:11px;font-weight:800;letter-spacing:.4px;color:#789098}.pst-live-update h3{margin:3px 0 0;font-size:17px;color:#29414a}.pst-live-update-meta{display:flex;align-items:center;gap:10px;white-space:nowrap}.pst-live-update-meta b{font-size:11px;color:#4f7660;background:#edf7f1;border-radius:999px;padding:5px 8px}.pst-live-update-meta time{font-size:12px;color:#8b9da3}.pst-live-update p{margin:10px 0 0;font-size:14.5px;line-height:1.58;color:#596f78}.pst-live-update-open{margin-top:11px;font-size:12px;font-weight:800;color:#4f8293}.pst-live-empty{padding:38px 24px;text-align:center;font-size:14px;color:#7e9299}
.pst-live-action:focus-visible,.pst-live-update:focus-visible,.pst-live-send:focus-visible{outline:3px solid rgba(74,145,166,.25);outline-offset:2px}
@media(max-width:720px){#pst-project-control-home-v2{padding:24px 12px 46px}.pst-live-head{display:block}.pst-live-sync{display:block;margin-top:10px}.pst-live-head h1{font-size:27px}.pst-live-panel>header{display:block;padding:19px 17px 15px}.pst-live-panel header small{display:block;margin-top:6px}.pst-live-action{padding:16px 14px}.pst-live-action-top,.pst-live-update-top{display:block}.pst-live-action-top time,.pst-live-update-meta{display:flex;margin-top:6px}.pst-live-action-foot{display:block}.pst-live-action-foot small{display:block;margin-top:4px}.pst-live-update{padding:16px 15px}}
`;
  document.head.appendChild(s);
}
function apply(force){
  var page=activeHome();if(!page)return false;
  css();
  var root=ensureRoot(page);if(!root)return false;
  render();load(!!force);return true;
}
function schedule(){[0,90,320,900,1800].forEach(function(ms){setTimeout(function(){apply(false);},ms);});}
document.addEventListener('pst:modules-ready',function(){[0,100,400,1000].forEach(function(ms){setTimeout(function(){apply(true);},ms);});},{once:true});
document.addEventListener('click',function(e){var nav=e.target&&e.target.closest&&e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="showPage"]');if(nav)setTimeout(function(){apply(false);},120);},true);
window.addEventListener('pageshow',function(){setTimeout(function(){apply(true);},100);},{once:true});
document.addEventListener('visibilitychange',function(){if(!document.hidden)setTimeout(function(){apply(true);},100);});
if(document.readyState!=='loading')schedule();else document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.PSTProjectControlHomeV1={apply:apply,load:load,render:render,_state:state};
})();
