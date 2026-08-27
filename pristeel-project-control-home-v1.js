/* PRISTEEL Live Home v5
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
window.__pstLiveHomeV5=true;

var state={busy:false,busyStage:0,busyToken:0,pendingQuestion:'',loading:false,projects:[],actions:[],facts:[],updates:[],last:null,loadedAt:0};
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
function updateStateLabel(txt,workflow){
  var w=N(workflow),n=N(txt);
  if(w==='wait for client')return'Në pritje të klientit';
  if(w==='wait for supplier')return'Në pritje të furnitorit';
  if(w==='wait internal')return'Në pritje të brendshme';
  if(w==='action required')return'Kërkon veprim';
  if(w==='execution')return'Në realizim';
  if(/nuk ka.{0,80}(veprim|ndjek)|pa veprim|no action|nothing.{0,50}follow/.test(n))return'Pa veprim';
  if(/ne pritje|pret |presim|waiting|afatin|deri me/.test(n))return'Në pritje';
  if(/aprov|approved|green light|driten e gjelber/.test(n))return'Konfirmuar';
  return'Aktiv';
}
function buildProjectUpdates(){
  var pmap=projectMap(),latest={};
  A(state.facts).forEach(function(f){
    var cat=N(f.category),v=f&&f.value&&typeof f.value==='object'?f.value:{};
    if(N(f.fact_status)!=='observed')return;
    if(cat==='operator update'){
      if(N(f.evidence_status)!=='confirmed')return;
    }else if(cat==='email event ai'){
      if(v.suppressed_by_operator_update===true||v.home_visible!==true||Number(v.confidence||0)<90)return;
    }else return;
    var p=pmap[S(f.project_id)],txt=factText(f),time=ts(v.source_sent_at||f.updated_at||f.created_at);
    if(!p||!txt||!time)return;
    var row={project_id:p.id,project:p.name,client:p.client||'',time:time,detail:clamp(txt,520),state:updateStateLabel(txt,v.workflow_state||'')};
    if(!latest[p.id]||time>latest[p.id].time)latest[p.id]=row;
  });
  state.updates=Object.keys(latest).map(function(k){return latest[k];}).sort(function(a,b){return b.time-a.time;}).slice(0,10);
}
function latestSync(){
  var vals=[state.loadedAt].concat(state.updates.map(function(a){return a.time;})),t=Math.max.apply(null,vals);
  return t?shortDate(t):'';
}
function homeTitle(){
  var h=new Date().getHours();
  if(h<11)return'Mirëmëngjes. Ja çfarë po ndodh.';
  if(h<18)return'Mirëdita. Ja çfarë po ndodh.';
  return'Mirëmbrëma. Ja çfarë po ndodh.';
}
function stateTone(v){
  var n=N(v);
  if(/kerkon veprim|action/.test(n))return'action';
  if(/pritje/.test(n))return'wait';
  if(/realizim|ekzekutim|konfirmuar|aktiv/.test(n))return'active';
  return'neutral';
}
function busyStages(){
  return[
    'Po identifikoj projektin dhe pyetjen…',
    'Po lexoj gjendjen, emailat dhe dokumentet më të fundit…',
    'Po lidh lëvizjet e fundit me gjendjen aktuale…',
    'Po përgatis përgjigjen…',
    'Ende po punoj. Po verifikoj që përgjigjja të mbështetet vetëm në të dhëna reale.'
  ];
}
function startBusy(q){
  state.busy=true;state.pendingQuestion=S(q).trim();state.busyStage=0;
  var token=++state.busyToken,delays=[900,2600,5200,9000];
  delays.forEach(function(ms,i){setTimeout(function(){if(!state.busy||state.busyToken!==token)return;state.busyStage=i+1;render();},ms);});
  render();
}
function stopBusy(){state.busy=false;state.pendingQuestion='';state.busyStage=0;state.busyToken++;}
function renderResult(root){
  var r=root.querySelector('.pst-live-result');if(!r)return;
  if(state.busy){
    var stages=busyStages(),msg=stages[Math.min(state.busyStage,stages.length-1)];
    r.hidden=false;
    r.innerHTML='<div class="pst-live-thinking"><span class="pst-live-thinking-orb"><i></i><i></i><i></i></span><div><b>PPPP po punon</b><span>'+E(msg)+'</span>'+(state.pendingQuestion?'<small>'+E(clamp(state.pendingQuestion,120))+'</small>':'')+'</div></div>';
    return;
  }
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
  var title=root.querySelector('.pst-live-title');if(title)title.textContent=homeTitle();
  var needs=root.querySelector('.pst-live-needs');if(needs)needs.classList.toggle('is-empty',!actions.length);
  root.classList.toggle('is-busy',state.busy);
  root.querySelector('.pst-live-sync').textContent=state.loading?'Po sinkronizohet…':(latestSync()?'Sinkronizuar '+latestSync():'');
  root.querySelector('.pst-live-action-count').textContent=actions.length?actions.length+' projekt'+(actions.length===1?'':'e'):'';
  root.querySelector('.pst-live-actions').innerHTML=actions.length?actions.map(function(x){
    var a=x.top,p=x.project,d=dueLabel(a.due_date);
    return '<article class="pst-live-action" role="button" tabindex="0" data-live-project="'+E(p.id)+'">'
      +'<div class="pst-live-action-main"><div class="pst-live-action-top"><span>'+E(p.name||a.project_name||'Projekt')+'</span>'+(d?'<time>'+E(d)+'</time>':'')+'</div>'
      +'<h3>'+E(clamp(a.title,170))+'</h3>'
      +(a.detail?'<p>'+E(clamp(a.detail,340))+'</p>':'')
      +'<div class="pst-live-action-foot"><span>'+E(p.client||'')+'</span>'+(x.count>1?'<small>+'+(x.count-1)+' veprime të tjera të konfirmuara</small>':'')+'</div></div><div class="pst-live-arrow">→</div></article>';
  }).join(''):'<div class="pst-live-clear"><div>✓</div><span><b>Nuk ka veprime të konfirmuara për ty tani.</b><small>PPPP po vazhdon të monitorojë projektet dhe do ta sjellë këtu vetëm atë që kërkon vërtet veprimin tënd.</small></span></div>';
  root.querySelector('.pst-live-updates').innerHTML=updates.length?updates.map(function(a){
    return '<article class="pst-live-update tone-'+stateTone(a.state)+'" role="button" tabindex="0" data-live-project="'+E(a.project_id)+'">'
      +'<div class="pst-live-update-top"><div><span>'+E(a.client||'PROJEKT')+'</span><h3>'+E(a.project)+'</h3></div><div class="pst-live-update-meta"><b>'+E(a.state)+'</b><time>'+E(shortDate(a.time))+'</time></div></div>'
      +'<p>'+E(a.detail)+'</p><div class="pst-live-update-open">Hap projektin →</div></article>';
  }).join(''):'<div class="pst-live-empty">Nuk ka update të konfirmuara të projekteve për këtë periudhë.</div>';
  var btn=root.querySelector('.pst-live-send'),input=root.querySelector('.pst-live-input');
  if(btn){btn.disabled=state.busy;btn.classList.toggle('is-busy',state.busy);btn.textContent=state.busy?'':'↑';}
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
    +'<header class="pst-live-head"><div><span class="pst-live-kicker"><i></i> PPPP LIVE</span><h1 class="pst-live-title">Ja çfarë po ndodh.</h1><p>Gjendja reale e projekteve, e përmbledhur nga lëvizjet që kanë rëndësi. Pa zhurmë, pa lista teknike.</p></div><small class="pst-live-sync"></small></header>'
    +'<section class="pst-live-command-shell"><div class="pst-live-command-intro"><span>PYET PPPP</span><b>Pyet platformën për çdo projekt</b><small>PPPP lexon gjendjen live dhe të kthen përgjigje nga të dhënat e platformës.</small></div><form class="pst-live-command"><div class="pst-live-command-mark">P</div><textarea rows="1" class="pst-live-input" placeholder="P.sh. Çfarë po ndodh me STACON?"></textarea><button class="pst-live-send" type="submit" aria-label="Dërgo">↑</button></form><div class="pst-live-result" hidden></div></section>'
    +'<section class="pst-live-panel pst-live-needs"><header><div><span>PËR TY TANI</span><h2>Veprime të konfirmuara</h2><p>Vetëm kur PPPP ka evidencë të qartë se duhet të bësh diçka.</p></div><small class="pst-live-action-count"></small></header><div class="pst-live-actions"></div></section>'
    +'<section class="pst-live-panel pst-live-status"><header><div><span>GJENDJA E FUNDIT</span><h2>Projektet që kanë ndryshuar</h2><p>Një përmbledhje aktuale për projekt, jo listë emailash.</p></div></header><div class="pst-live-updates"></div></section>';
  page.appendChild(root);bind(root);return root;
}
function isQuestion(q){return /\?|^(cka|çka|cfare|çfarë|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/i.test(S(q).trim());}
function identityValues(p){return [p.name,p.client,p.business_ref,p.ref].concat(A(p.identity_aliases)).map(N).filter(function(x){return x.length>=3;});}
function identityScore(q,p){
  var n=N(q),score=0;
  identityValues(p).forEach(function(x){
    if(n.indexOf(x)>-1)score=Math.max(score,100+x.length);
    var words=x.split(' ').filter(function(w){return w.length>=4;});
    words.forEach(function(w){if(n.indexOf(w)>-1)score=Math.max(score,20+w.length);});
  });
  return score;
}
function resolveLocal(q){
  var hits=[];
  state.projects.forEach(function(p){var score=identityScore(q,p);if(score)hits.push({p:p,score:score,time:ts(p.last_activity_at||p.last_email_at||p.updated_at)});});
  hits.sort(function(a,b){return b.score-a.score||b.time-a.time;});
  if(!hits.length)return null;
  if(!hits[1]||hits[0].score>hits[1].score+4)return hits[0].p;
  if(hits[0].time&&hits[1].time&&hits[0].time-hits[1].time>3*86400000)return hits[0].p;
  return null;
}
function factsForProject(id){
  return A(state.facts).filter(function(f){return S(f.project_id)===S(id)&&N(f.fact_status)==='observed';}).sort(function(a,b){
    var av=a&&a.value&&typeof a.value==='object'?a.value:{},bv=b&&b.value&&typeof b.value==='object'?b.value:{};
    return ts(bv.source_sent_at||b.updated_at||b.created_at)-ts(av.source_sent_at||a.updated_at||a.created_at);
  });
}
function localAnswer(q){
  var p=resolveLocal(q);
  if(!p)return null;
  var facts=factsForProject(p.id),chosen=[],seen={};
  facts.forEach(function(f){
    var cat=N(f.category),v=f&&f.value&&typeof f.value==='object'?f.value:{},txt=factText(f);
    if(!txt||v.suppressed_by_operator_update===true)return;
    if(cat!=='email event ai'&&cat!=='operator update'&&cat!=='execution schedule')return;
    var k=cat;if(seen[k])return;seen[k]=1;chosen.push({txt:txt,cat:cat,time:v.source_sent_at||f.updated_at||f.created_at,workflow:v.workflow_state||''});
  });
  var first=chosen[0],lines=[];
  lines.push((p.name||'Projekti')+' është '+(N(p.operational_state)==='execution'?'në ekzekutim':N(p.operational_state)==='action required'?'duke kërkuar veprim':'aktiv')+'.');
  chosen.slice(0,2).forEach(function(x){lines.push(clamp(x.txt,650));});
  if(!first&&p.last_email_at)lines.push('Aktiviteti i fundit me email është '+shortDate(p.last_email_at)+'.');
  var next='';
  if(first){
    var w=N(first.workflow);
    if(w==='wait for client')next='Prit konfirmimin e klientit; nuk ka nevojë për follow-up të ri tani.';
    else if(w==='action required')next='Ka një veprim të ri që kërkon shqyrtimin tënd.';
    else if(w==='wait for supplier')next='Prit përgjigjen e furnitorit.';
  }
  return{ok:true,answer:lines.join('\n'),confidence:'high',uncertainty:'',suggested_next_step:next,navigation:{project_id:p.id,project_name:p.name,area:'execution'},evidence:chosen.slice(0,3).map(function(x){return{source:x.cat==='email event ai'?'Email i lidhur me projektin':x.cat==='execution schedule'?'Plan i prodhimit':'Update i konfirmuar',reason:clamp(x.txt,500)};}),provider:{name:'pppp-live-fallback',model:'deterministic-v1'},read_only:true};
}
async function ensureAssistant(){
  var AI=window.PSTOpenAIAssistantV1;if(AI&&typeof AI.ask==='function')return AI;
  var existing=document.querySelector('script[data-pst-openai-assistant-v1],script[data-pst-home-openai-fallback]');
  if(!existing){existing=document.createElement('script');existing.src='pristeel-openai-operating-assistant-v1.js?v=20260827-home1';existing.defer=true;existing.setAttribute('data-pst-home-openai-fallback','1');document.head.appendChild(existing);}
  await new Promise(function(resolve){var n=0;function check(){var x=window.PSTOpenAIAssistantV1;if(x&&typeof x.ask==='function'||++n>=20){resolve();return;}setTimeout(check,50);}check();});
  return window.PSTOpenAIAssistantV1||null;
}
function friendlyAssistantError(e){
  var msg=S(e&&e.message||e),n=N(msg);
  if(/openai api key|provider unconfigured|required secret|provider unavailable/.test(n))return'PPPP AI nuk është konfiguruar ende për pyetje të përgjithshme. Për një projekt, shkruaj emrin e projektit dhe PPPP do të përdorë të dhënat live.';
  return msg||'PPPP AI nuk u përgjigj.';
}
async function askAI(q){
  var local=localAnswer(q);if(local)return local;
  var AI=await ensureAssistant();
  if(AI&&typeof AI.ask==='function'){
    try{return await AI.ask(q,{scope:'global'});}catch(e){throw new Error(friendlyAssistantError(e));}
  }
  throw new Error('PPPP nuk arriti ta lidhë pyetjen me një projekt unik.');
}
async function edgeOperator(projectId,update){
  var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase nuk është gati.');
  var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
  async function run(t){return fetch(base+'/functions/v1/pppp-project-operator-update',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({project_id:projectId,update:update})});}
  var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}
  if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,700));return data;
}
function looksLikeProjectLookup(q){
  var p=resolveLocal(q);if(!p)return false;
  var words=N(q).split(' ').filter(Boolean);
  if(words.length<=4)return true;
  return false;
}
async function submit(q){
  startBusy(q);
  try{
    if(isQuestion(q)||looksLikeProjectLookup(q)){state.last={kind:'answer',data:await askAI(q)};return;}
    var p=resolveLocal(q),probe=null;
    if(!p){
      try{probe=await askAI('Identifiko vetëm projektin PPPP që i përket këtij update-i operativ. Mos hamendëso nëse nuk është unik. Update: '+q);}catch(e){probe=null;}
      var pid=probe&&probe.navigation&&probe.navigation.project_id;p=state.projects.find(function(x){return S(x.id)===S(pid);})||null;
    }
    if(!p)throw new Error('Nuk e lidha dot me një projekt unik. Përmend emrin e projektit në update.');
    var out=await edgeOperator(p.id,q);state.last={kind:'update',project:p.name,text:out.summary||'Update-i u ruajt.'};await load(true);
  }catch(e){state.last={kind:'error',text:friendlyAssistantError(e)};}finally{stopBusy();render();}
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
      db('pppp_project_context_current_v?select=id,project_id,category,subject,fact_key,value,source_type,evidence_status,fact_status,created_at,updated_at&fact_status=eq.observed&updated_at=gte.'+encodeURIComponent(iso(since))+'&order=updated_at.desc&limit=500').catch(function(){return[];})
    ]);
    state.projects=A(out[0]);state.actions=A(out[1]);state.facts=A(out[2]);buildProjectUpdates();state.loadedAt=Date.now();return true;
  }catch(e){console.warn('PPPP Live Home:',e);state.last={kind:'error',text:'Home nuk arriti të lexojë gjendjen live: '+S(e&&e.message||e)};return false;}
  finally{state.loading=false;render();}
}
function css(){
  ['pst-project-control-home-v1-css','pst-project-control-home-v2-css','pst-live-home-v3-css','pst-live-home-v4-css','pst-live-home-v5-css'].forEach(function(id){var x=document.getElementById(id);if(x)x.remove();});
  var s=document.createElement('style');s.id='pst-live-home-v5-css';s.textContent=`
#page-workspace-home{background:
  radial-gradient(circle at 12% 2%,rgba(87,167,183,.14),transparent 30%),
  radial-gradient(circle at 92% 18%,rgba(89,139,202,.08),transparent 27%),
  linear-gradient(180deg,#f8fbfc 0%,#f3f7f8 52%,#f8fafb 100%)!important;min-height:100vh!important}
#pst-project-control-home-v2{display:block!important;max-width:1240px;margin:0 auto;padding:46px 34px 78px;color:#20333b;font-family:Inter,system-ui,-apple-system,sans-serif}
.pst-live-head{display:flex;justify-content:space-between;gap:30px;align-items:flex-end;padding:4px 4px 24px}
.pst-live-kicker{display:inline-flex;align-items:center;gap:9px;padding:7px 11px;border:1px solid rgba(72,135,153,.16);border-radius:999px;background:rgba(255,255,255,.7);backdrop-filter:blur(10px);font-size:11px;font-weight:850;letter-spacing:1.25px;color:#557784}
.pst-live-kicker i{width:8px;height:8px;border-radius:50%;background:#55b97b;box-shadow:0 0 0 5px rgba(85,185,123,.11)}
.pst-live-head h1{margin:13px 0 8px;font-size:38px;line-height:1.06;letter-spacing:-1.25px;color:#1f343d}
.pst-live-head p{max-width:760px;font-size:14px;color:#6e848c;line-height:1.55}
.pst-live-sync{font-size:12px;color:#718990;white-space:nowrap;padding:8px 11px;border-radius:999px;background:rgba(255,255,255,.7);border:1px solid rgba(94,131,143,.12)}
.pst-live-command-shell{position:relative;margin:10px 0 22px;padding:22px;border-radius:24px;background:linear-gradient(135deg,#234c5b 0%,#2f7188 56%,#438ca0 100%);box-shadow:0 18px 42px rgba(31,70,84,.18);overflow:hidden}
.pst-live-command-shell:before{content:'';position:absolute;right:-70px;top:-120px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.08)}
.pst-live-command-intro{position:relative;z-index:1;margin:0 2px 15px;color:#fff}
.pst-live-command-intro span{display:block;font-size:11px;font-weight:850;letter-spacing:1.2px;color:rgba(255,255,255,.68)}
.pst-live-command-intro b{display:block;margin-top:4px;font-size:20px;letter-spacing:-.25px}
.pst-live-command-intro small{display:block;margin-top:4px;font-size:12px;line-height:1.45;color:rgba(255,255,255,.72)}
.pst-live-command{position:relative;z-index:1;display:flex;align-items:center;gap:12px;margin:0;background:#fff;border:1px solid rgba(255,255,255,.28);border-radius:16px;padding:8px 9px 8px 11px;box-shadow:0 8px 22px rgba(18,54,68,.12)}
.pst-live-command:focus-within{box-shadow:0 0 0 4px rgba(213,242,250,.16),0 10px 26px rgba(18,54,68,.16)}
.pst-live-command-mark{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:#e8f3f6;color:#34778d;font-weight:900}
.pst-live-input{flex:1;min-height:42px;max-height:120px;resize:vertical;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;color:#243942!important;padding:10px 4px!important;font-size:15px!important;line-height:1.45!important}
.pst-live-input::placeholder{color:#91a1a7}
.pst-live-send{position:relative;width:44px;height:44px;border:0;border-radius:12px;background:#347f98;color:#fff;font-size:19px;cursor:pointer;box-shadow:0 5px 14px rgba(52,127,152,.22);transition:transform .15s,box-shadow .15s}
.pst-live-send:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 18px rgba(52,127,152,.28)}
.pst-live-send:disabled{opacity:.95;cursor:default}.pst-live-send.is-busy:before{content:'';position:absolute;inset:12px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;border-radius:50%;animation:pst-live-spin .75s linear infinite}
.pst-live-result{position:relative;z-index:1;margin:12px 0 0;padding:14px 16px;border-radius:14px;background:rgba(9,37,48,.18);border:1px solid rgba(255,255,255,.16);color:#fff}
.pst-live-answer{font-size:14px;line-height:1.65;color:#fff}.pst-live-suggest{display:flex;gap:10px;margin-top:11px;padding-top:10px;border-top:1px solid rgba(255,255,255,.14);font-size:13px}.pst-live-suggest b{color:#d5f2fa}.pst-live-msg{display:flex;gap:10px;font-size:14px}.pst-live-msg.ok b{color:#c8f2d7}.pst-live-msg.err{color:#ffd3cb}.pst-live-open-answer{margin-top:11px;border:1px solid rgba(255,255,255,.24);border-radius:9px;background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:800;padding:8px 10px;cursor:pointer}
.pst-live-thinking{display:flex;align-items:center;gap:13px;min-height:48px}.pst-live-thinking>div{display:flex;flex-direction:column;gap:3px}.pst-live-thinking b{font-size:14px;color:#fff}.pst-live-thinking span{font-size:13px;color:rgba(255,255,255,.82)}.pst-live-thinking small{font-size:11px;color:rgba(255,255,255,.56)}
.pst-live-thinking-orb{display:flex!important;align-items:center;gap:4px;min-width:46px}.pst-live-thinking-orb i{display:block;width:8px;height:8px;border-radius:50%;background:#d9f6ff;animation:pst-live-pulse 1.05s ease-in-out infinite}.pst-live-thinking-orb i:nth-child(2){animation-delay:.14s}.pst-live-thinking-orb i:nth-child(3){animation-delay:.28s}
.pst-live-panel{background:rgba(255,255,255,.82);border:1px solid rgba(93,128,139,.14);border-radius:22px;box-shadow:0 10px 30px rgba(32,62,72,.06);overflow:hidden;margin-top:18px;backdrop-filter:blur(12px)}
.pst-live-panel>header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;padding:21px 23px 16px;border-bottom:1px solid rgba(111,143,152,.12)}
.pst-live-panel header span{font-size:11px;letter-spacing:1.15px;font-weight:850;color:#76909a}.pst-live-panel h2{margin:5px 0 3px;font-size:22px;letter-spacing:-.4px;color:#294049}.pst-live-panel header p{font-size:13px;color:#7b8f96;line-height:1.45}.pst-live-panel header small{font-size:12px;color:#66808a;padding-top:5px}
.pst-live-needs.is-empty{background:transparent;border:0;box-shadow:none;backdrop-filter:none;overflow:visible}.pst-live-needs.is-empty>header{display:none}.pst-live-needs.is-empty .pst-live-actions{padding:0}
.pst-live-actions{padding:10px}.pst-live-action{display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:16px;padding:19px 18px;margin:7px 0;border:1px solid rgba(101,139,149,.16);border-radius:16px;background:#fff;cursor:pointer;transition:border-color .14s,box-shadow .14s,transform .14s}
.pst-live-action:hover{border-color:#bdd6de;box-shadow:0 10px 22px rgba(36,67,77,.08);transform:translateY(-2px)}.pst-live-action-top{display:flex;justify-content:space-between;gap:16px;align-items:center}.pst-live-action-top span{font-size:12px;font-weight:800;color:#557987}.pst-live-action-top time{font-size:12px;color:#84989f;white-space:nowrap}.pst-live-action h3{margin:5px 0 0;font-size:17px;line-height:1.35;color:#263c45}.pst-live-action p{margin-top:8px;font-size:14px;line-height:1.52;color:#657b84}.pst-live-action-foot{display:flex;justify-content:space-between;gap:12px;margin-top:11px;padding-top:10px;border-top:1px dashed #e4ebed;font-size:12px;color:#87999f}.pst-live-action-foot small{font-size:12px;color:#758b94}.pst-live-arrow{font-size:20px;color:#70a0af;padding-top:19px}
.pst-live-clear{display:flex;align-items:center;gap:13px;padding:15px 17px;border:1px solid rgba(82,151,112,.16);border-radius:16px;background:linear-gradient(90deg,rgba(235,247,239,.88),rgba(248,252,250,.9));color:#5d7667}.pst-live-clear>div{flex:0 0 auto;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#dff1e6;color:#4e8a67;font-size:17px}.pst-live-clear>span{display:block}.pst-live-clear b{display:block;font-size:14px;color:#486253}.pst-live-clear small{display:block;margin-top:2px;font-size:12px;line-height:1.45;color:#74877a}
.pst-live-status{padding-bottom:10px}.pst-live-updates{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:12px}.pst-live-update{position:relative;display:flex;flex-direction:column;min-height:190px;padding:19px 19px 17px;margin:0;border:1px solid rgba(97,132,142,.15);border-radius:17px;background:linear-gradient(180deg,#fff 0%,#fbfdfd 100%);cursor:pointer;transition:border-color .14s,box-shadow .14s,transform .14s;overflow:hidden}.pst-live-update:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#7aa4b1}.pst-live-update:hover{border-color:#bfd5dc;box-shadow:0 12px 24px rgba(36,67,77,.08);transform:translateY(-2px)}
.pst-live-update.tone-wait:before{background:#78a9c3}.pst-live-update.tone-action:before{background:#d49c56}.pst-live-update.tone-active:before{background:#65a87d}.pst-live-update.tone-neutral:before{background:#99a9ae}
.pst-live-update-top{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.pst-live-update-top span{font-size:11px;font-weight:800;letter-spacing:.45px;color:#789098}.pst-live-update h3{margin:4px 0 0;font-size:17px;line-height:1.3;color:#29414a}.pst-live-update-meta{display:flex;align-items:center;gap:8px;white-space:nowrap}.pst-live-update-meta b{font-size:11px;color:#4e6f5b;background:#eef7f1;border-radius:999px;padding:6px 9px}.tone-wait .pst-live-update-meta b{color:#477087;background:#eaf4f8}.tone-action .pst-live-update-meta b{color:#8a6231;background:#fbf1e4}.tone-neutral .pst-live-update-meta b{color:#687a80;background:#f0f4f5}.pst-live-update-meta time{font-size:12px;color:#8b9da3}.pst-live-update p{margin:12px 0 0;font-size:14.5px;line-height:1.58;color:#596f78}.pst-live-update-open{margin-top:auto;padding-top:14px;font-size:12px;font-weight:800;color:#4f8293}.pst-live-empty{grid-column:1/-1;padding:38px 24px;text-align:center;font-size:14px;color:#7e9299}
.pst-live-action:focus-visible,.pst-live-update:focus-visible,.pst-live-send:focus-visible,.pst-live-open-answer:focus-visible{outline:3px solid rgba(74,145,166,.25);outline-offset:2px}
@keyframes pst-live-spin{to{transform:rotate(360deg)}}@keyframes pst-live-pulse{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}
@media(max-width:900px){.pst-live-updates{grid-template-columns:1fr}.pst-live-update{min-height:0}}
@media(max-width:720px){#pst-project-control-home-v2{padding:26px 13px 52px}.pst-live-head{display:block}.pst-live-sync{display:inline-block;margin-top:11px}.pst-live-head h1{font-size:30px}.pst-live-command-shell{padding:17px;border-radius:20px}.pst-live-command-intro b{font-size:18px}.pst-live-panel>header{display:block;padding:19px 17px 15px}.pst-live-panel header small{display:block;margin-top:6px}.pst-live-action{padding:16px 14px}.pst-live-action-top,.pst-live-update-top{display:block}.pst-live-action-top time,.pst-live-update-meta{display:flex;margin-top:7px}.pst-live-action-foot{display:block}.pst-live-action-foot small{display:block;margin-top:4px}.pst-live-update{padding:16px 15px}.pst-live-clear{align-items:flex-start}}
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
