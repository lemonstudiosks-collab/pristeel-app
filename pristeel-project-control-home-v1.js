/* PRISTEEL Project Control Home v2
 * Control-room Home: real project state, confirmed context and live activity.
 * No heuristic overdue/blocker wall. No outbound communication or commercial decisions.
 */
(function(){
'use strict';
if(window.__pstProjectControlHomeV2){
  try{if(window.PSTProjectControlHomeV1&&typeof window.PSTProjectControlHomeV1.apply==='function')window.PSTProjectControlHomeV1.apply(true);}catch(e){}
  return;
}
window.__pstProjectControlHomeV2=true;

var state={busy:false,loading:false,projects:[],emails:[],facts:[],files:[],docs:[],offers:[],activities:[],last:null,loadedAt:0};
function S(v){return String(v==null?'':v);}
function A(v){return Array.isArray(v)?v:[];}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function activeHome(){var p=document.getElementById('page-workspace-home');return p&&p.classList.contains('active')&&p.style.display!=='none'?p:null;}
function db(path){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path);}
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
function iso(d){return new Date(d).toISOString();}
function ts(v){var n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
function terminal(p){return /humb|lost|cancel|refuz|arkiv|archiv|realizuar|mbyllur|closed/.test(N(p&&p.status));}
function clamp(v,n){v=S(v).replace(/\s+/g,' ').trim();return v.length>n?v.slice(0,n-1)+'…':v;}
function factText(f){var v=f&&f.value;if(v&&typeof v==='object')return S(v.summary||v.text||v.note||v.value);return S(v);}
function projectMap(){var m={};state.projects.forEach(function(p){m[S(p.id)]=p;});return m;}
function identityValues(p){return [p.name,p.business_ref,p.ref].concat(A(p.identity_aliases)).map(N).filter(function(x){return x.length>=6;});}
function shortDate(v){
  var d=new Date(v);if(isNaN(d.getTime()))return'';
  var now=new Date(),same=d.toDateString()===now.toDateString(),yd=new Date(now);yd.setDate(now.getDate()-1);
  var hm=d.toLocaleTimeString('sq-AL',{hour:'2-digit',minute:'2-digit'});
  if(same)return'Sot · '+hm;if(d.toDateString()===yd.toDateString())return'Dje · '+hm;
  return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short'})+' · '+hm;
}
function todayLabel(){return new Date().toLocaleDateString('sq-AL',{weekday:'long',day:'2-digit',month:'long'});}
function sameLocalDay(t){if(!t)return false;var a=new Date(t),b=new Date();return a.toDateString()===b.toDateString();}
function stageLabel(p){
  var s=N(p&&p.pipeline_stage);
  if(s==='client_offer')return'Oferta klientit';if(s==='supplier_selection')return'Furnitorët';if(s==='technical_review')return'Rishikim teknik';
  if(s==='production_control')return'Prodhim';if(s==='factory_audit')return'Audit';if(s==='transport')return'Transport';
  if(s==='commercial_review')return'Komerciale';if(s==='tender')return'Tender';return S(p&&p.pipeline_stage||'Aktiv').replace(/_/g,' ');
}
function latestOperatorFact(projectId){return state.facts.filter(function(f){return S(f.project_id)===S(projectId)&&N(f.category)==='operator update';}).sort(function(a,b){return ts(b.updated_at||b.created_at)-ts(a.updated_at||a.created_at);})[0]||null;}
function noActionFact(p){var f=latestOperatorFact(p.id),t=N(factText(f));return !!(t&&/(nuk ka veprim|nuk ka asgje per t u ndjekur|pa veprim|no action)/.test(t));}
function statusInfo(p){
  if(noActionFact(p))return{key:'quiet',label:'Pa veprim tani'};
  var op=N(p&&p.operational_state),stage=N(p&&p.pipeline_stage),status=N(p&&p.status);
  if(op==='execution'||stage==='production_control'||stage==='factory_audit'||stage==='transport'||/fituar|won/.test(status))return{key:'execution',label:'Ekzekutim'};
  if(op==='wait_for_client')return{key:'waiting',label:'Pret klientin'};
  if(op==='wait_for_supplier')return{key:'waiting',label:'Pret furnitorin'};
  if(op==='wait_internal')return{key:'waiting',label:'Pret internisht'};
  if(op==='active_work')return{key:'active',label:'Në punë'};
  if(op==='action_required')return{key:'active',label:'Kërkon vëmendje'};
  return{key:'active',label:'Aktiv'};
}
function addresses(row){return [row.from_email].concat(A(row.to_emails)).map(function(x){return N(x).replace(/\s/g,'');}).filter(function(x){return x.indexOf('@')>0;});}
function inferFromIdentity(row,projects){
  var corpus=N([row.subject,row.snippet].join(' ')),hits=[];
  projects.forEach(function(p){var best=0;identityValues(p).forEach(function(x){if(corpus.indexOf(x)>-1)best=Math.max(best,x.length);});if(best)hits.push({p:p,score:best});});
  hits.sort(function(a,b){return b.score-a.score;});return hits.length&&(!hits[1]||hits[0].score>hits[1].score+2)?hits[0].p:null;
}
function buildEmailResolver(emails,projects){
  var thread={},addrSets={},pmap={};projects.forEach(function(p){pmap[S(p.id)]=p;});
  emails.forEach(function(r){if(r.project_id&&r.gmail_thread_id)thread[S(r.gmail_thread_id)]=S(r.project_id);if(r.project_id)addresses(r).forEach(function(a){if(!addrSets[a])addrSets[a]={};addrSets[a][S(r.project_id)]=1;});});
  var addr={};Object.keys(addrSets).forEach(function(k){var ids=Object.keys(addrSets[k]);if(ids.length===1)addr[k]=ids[0];});
  return function(r){if(r.project_id&&pmap[S(r.project_id)])return pmap[S(r.project_id)];var tid=thread[S(r.gmail_thread_id)];if(tid&&pmap[tid])return pmap[tid];var p=inferFromIdentity(r,projects);if(p)return p;var ids={};addresses(r).forEach(function(a){if(addr[a])ids[addr[a]]=1;});var u=Object.keys(ids);return u.length===1?pmap[u[0]]||null:null;};
}
function usefulEmail(r,p){if(!p)return false;var from=N(r.from_email);return !/dmarc|mailer daemon|noreply|no reply|ted-no-reply|bieter@dtvp|microsoft.com/.test(from);}
function dedupeActivities(rows){
  var out=[],seen={};rows.sort(function(a,b){return b.time-a.time;});rows.forEach(function(x){var k=[x.type,x.project_id||'',N(x.title),x.direction||''].join('|'),prev=seen[k]||0;if(prev&&Math.abs(prev-x.time)<5*60*1000)return;seen[k]=x.time;out.push(x);});return out;
}
function buildActivities(){
  var pmap=projectMap(),resolver=buildEmailResolver(state.emails,state.projects),rows=[];
  state.emails.forEach(function(r){var p=resolver(r);if(!usefulEmail(r,p))return;rows.push({type:'email',project_id:p.id,project:p.name,time:ts(r.sent_at),title:r.subject||'(pa subjekt)',detail:clamp(r.snippet,180),direction:r.direction==='outgoing'?'outgoing':'incoming'});});
  state.facts.forEach(function(f){var p=pmap[S(f.project_id)],t=factText(f);if(!p||!t)return;rows.push({type:'context',project_id:p.id,project:p.name,time:ts(f.updated_at||f.created_at),title:'Update i konfirmuar',detail:clamp(t,210),direction:'operator'});});
  state.files.forEach(function(f){var p=pmap[S(f.project_id)];if(!p)return;rows.push({type:'file',project_id:p.id,project:p.name,time:ts(f.created_at),title:S(f.file_name||'Dokument'),detail:clamp(f.page_context||f.file_type||'',150)});});
  state.docs.forEach(function(d){var p=pmap[S(d.project_id)];if(!p)return;rows.push({type:'document',project_id:p.id,project:p.name,time:ts(d.created_at),title:d.doc_nr?'Dokument '+d.doc_nr:'Dokument komercial',detail:clamp([d.followup_status,d.total_amount?S(d.total_amount)+' '+S(d.currency||'EUR'):''].filter(Boolean).join(' · '),150)});});
  state.offers.forEach(function(o){var p=pmap[S(o.project_id)];if(!p)return;rows.push({type:'offer',project_id:p.id,project:p.name,time:ts(o.created_at),title:'Ofertë'+(o.supplier?' · '+o.supplier:''),detail:clamp([o.offer_ref,(o.total_amount||o.total_eur)?S(o.total_amount||o.total_eur)+' '+S(o.currency||'EUR'):''].filter(Boolean).join(' · '),150)});});
  state.activities=dedupeActivities(rows.filter(function(x){return x.time>0&&pmap[S(x.project_id)];}));
}
function latestByProject(){var m={};state.activities.forEach(function(a){if(!m[a.project_id])m[a.project_id]=a;});return m;}
function contextSummary(p){var f=latestOperatorFact(p.id);return f?clamp(factText(f),150):'';}
function nextStep(p,latest){
  if(noActionFact(p))return'Asgjë për t’u ndjekur tani.';
  var op=N(p&&p.operational_state),ctx=N(contextSummary(p));
  if(op==='wait_for_client')return'Prit përgjigjen e klientit.';
  if(op==='wait_for_supplier')return'Prit përgjigjen e furnitorit.';
  if(op==='wait_internal')return'Prit konfirmimin intern.';
  if(op==='execution'&&/audit/.test(ctx))return'Vazhdo koordinimin e auditimit.';
  if(op==='execution')return'Vazhdo ekzekutimin sipas aktivitetit të fundit.';
  if(latest&&latest.direction==='incoming')return'Shqyrto komunikimin e fundit dhe vendos hapin tjetër.';
  if(latest&&latest.direction==='outgoing')return'Vazhdo punën pas komunikimit të fundit.';
  return'Vazhdo punën aktive të projektit.';
}
function projectRows(){
  var latest=latestByProject();
  return state.projects.filter(function(p){return !terminal(p);}).map(function(p){var a=latest[p.id],s=statusInfo(p),t=Math.max(a&&a.time||0,ts(p.last_activity_at),ts(p.last_email_at),ts(p.updated_at));var rank=s.key==='execution'?4:s.key==='active'?3:s.key==='waiting'?2:1;return{p:p,a:a,s:s,time:t,rank:rank};}).sort(function(a,b){return b.rank-a.rank||b.time-a.time;});
}
function activityIcon(a){if(a.type==='email')return a.direction==='outgoing'?'↗':'↙';if(a.type==='file')return'▧';if(a.type==='offer')return'€';if(a.type==='document')return'≡';if(a.type==='context')return'✓';return'•';}
function activityLabel(a){if(a.type==='email')return a.direction==='outgoing'?'Email dërguar':'Email pranuar';if(a.type==='file')return'Skedar';if(a.type==='offer')return'Ofertë';if(a.type==='document')return'Dokument';if(a.type==='context')return'Update';return'Aktivitet';}
function metrics(rows){
  var active=rows.filter(function(x){return x.s.key!=='quiet';}).length;
  var execution=rows.filter(function(x){return x.s.key==='execution';}).length;
  var waiting=rows.filter(function(x){return x.s.key==='waiting';}).length;
  var today=state.activities.filter(function(a){return sameLocalDay(a.time);}).length;
  return{active:active,execution:execution,waiting:waiting,today:today};
}
function renderResult(root){
  var r=root.querySelector('.pst-cr-result');if(!r)return;
  if(!state.last){r.hidden=true;r.innerHTML='';return;}r.hidden=false;
  if(state.last.kind==='error'){r.innerHTML='<div class="pst-cr-msg err">'+E(state.last.text)+'</div>';return;}
  if(state.last.kind==='update'){r.innerHTML='<div class="pst-cr-msg ok"><b>'+E(state.last.project||'Projekti')+'</b><span>'+E(state.last.text||'Update-i u ruajt.')+'</span></div>';return;}
  var x=state.last.data||{},html='<div class="pst-cr-answer">'+E(x.answer||state.last.text||'').replace(/\n/g,'<br>')+'</div>';
  if(x.suggested_next_step)html+='<div class="pst-cr-suggest"><b>Hapi i sugjeruar</b><span>'+E(x.suggested_next_step)+'</span></div>';
  if(x.navigation&&x.navigation.project_id)html+='<button type="button" class="pst-cr-open-answer" data-cr-open="'+E(x.navigation.project_id)+'">Hap '+E(x.navigation.project_name||'projektin')+' →</button>';
  r.innerHTML=html;
}
function render(){
  var page=activeHome();if(!page)return false;var root=ensureRoot(page),rows=projectRows(),m=metrics(rows),focus=rows.slice(0,9),feed=state.activities.slice(0,13);
  root.querySelector('.pst-cr-date').textContent=todayLabel();
  root.querySelector('[data-cr-metric="active"]').textContent=m.active;
  root.querySelector('[data-cr-metric="execution"]').textContent=m.execution;
  root.querySelector('[data-cr-metric="waiting"]').textContent=m.waiting;
  root.querySelector('[data-cr-metric="today"]').textContent=m.today;
  root.querySelector('.pst-cr-radar-count').textContent=focus.length+' në radar';
  root.querySelector('.pst-cr-projects').innerHTML=focus.length?focus.map(function(x,i){var p=x.p,a=x.a,ctx=contextSummary(p);return '<article class="pst-cr-project" role="button" tabindex="0" data-cr-project="'+E(p.id)+'">'
    +'<div class="pst-cr-num">'+String(i+1).padStart(2,'0')+'</div>'
    +'<div class="pst-cr-project-main"><div class="pst-cr-project-top"><b>'+E(p.name)+'</b><span class="pst-cr-status '+E(x.s.key)+'">'+E(x.s.label)+'</span></div>'
    +'<div class="pst-cr-project-meta"><span>'+E(p.client||stageLabel(p))+'</span><i>•</i><span>'+E(stageLabel(p))+'</span>'+(x.time?'<i>•</i><time>'+E(shortDate(x.time))+'</time>':'')+'</div>'
    +(ctx?'<p class="pst-cr-context">'+E(ctx)+'</p>':'')
    +'<div class="pst-cr-next"><span>HAPI TJETËR</span><strong>'+E(nextStep(p,a))+'</strong></div></div><div class="pst-cr-arrow">→</div></article>';}).join(''):'<div class="pst-cr-empty">Nuk ka projekte aktive.</div>';
  root.querySelector('.pst-cr-feed').innerHTML=feed.length?feed.map(function(a){return '<article class="pst-cr-feed-row" data-cr-activity="'+E(a.project_id)+'"><div class="pst-cr-feed-icon '+E(a.type)+'">'+activityIcon(a)+'</div><div class="pst-cr-feed-copy"><div><b>'+E(a.project)+'</b><time>'+E(shortDate(a.time))+'</time></div><span>'+E(activityLabel(a))+' · '+E(clamp(a.title,88))+'</span>'+(a.detail?'<p>'+E(clamp(a.detail,120))+'</p>':'')+'</div></article>';}).join(''):'<div class="pst-cr-empty">Ende pa aktivitet të lidhur.</div>';
  var st=root.querySelector('.pst-cr-state');st.textContent=state.loading?'Po sinkronizoj gjendjen live…':'';
  var btn=root.querySelector('.pst-cr-send'),input=root.querySelector('.pst-cr-input');if(btn){btn.disabled=state.busy;btn.textContent=state.busy?'…':'↑';}if(input)input.disabled=state.busy;
  renderResult(root);return true;
}
function ensureRoot(page){
  var root=document.getElementById('pst-project-control-home-v2');if(root)return root;
  var old=document.getElementById('pst-project-control-home-v1');if(old)old.remove();
  root=document.createElement('section');root.id='pst-project-control-home-v2';root.innerHTML=''
    +'<section class="pst-cr-hero"><div class="pst-cr-orbit one"></div><div class="pst-cr-orbit two"></div><div class="pst-cr-hero-top"><div><span class="pst-cr-kicker"><i></i> PPPP CONTROL ROOM</span><h1>Pamja e punës, jo e sistemit.</h1><p>Një vend për të parë çfarë po ndodh, çfarë pret dhe ku duhet të lëvizësh më pas.</p></div><div class="pst-cr-live"><span>LIVE</span><b class="pst-cr-date"></b></div></div>'
    +'<form class="pst-cr-command"><div class="pst-cr-command-mark">P</div><textarea rows="1" class="pst-cr-input" placeholder="Pyet PPPP, ose jep një update: ‘STACON konfirmoi auditimin për të premten’"></textarea><button class="pst-cr-send" type="submit" aria-label="Dërgo">↑</button></form><div class="pst-cr-state"></div><div class="pst-cr-result" hidden></div>'
    +'<div class="pst-cr-metrics"><div><span>PROJEKTE AKTIVE</span><b data-cr-metric="active">0</b><small>Në punë reale</small></div><div><span>NË EKZEKUTIM</span><b data-cr-metric="execution">0</b><small>Fitim / prodhim / audit</small></div><div><span>NË PRITJE</span><b data-cr-metric="waiting">0</b><small>Klient, furnitor ose intern</small></div><div><span>AKTIVITET SOT</span><b data-cr-metric="today">0</b><small>Email, skedar, ofertë, update</small></div></div></section>'
    +'<section class="pst-cr-grid"><div class="pst-cr-radar"><header><div><span>RADARI I PROJEKTEVE</span><h2>Ku është puna tani</h2></div><small class="pst-cr-radar-count"></small></header><div class="pst-cr-projects"></div></div>'
    +'<aside class="pst-cr-stream"><header><div><span>LIVE STREAM</span><h2>Çfarë sapo ndryshoi</h2></div><i></i></header><div class="pst-cr-feed"></div></aside></section>';
  page.appendChild(root);bind(root);return root;
}
function isQuestion(q){return /\?|^(cka|çka|cfare|çfarë|kush|ku|kur|pse|si|a ka|a kemi|me trego|trego|cil|what|which|who|where|when|why|how)\b/i.test(S(q).trim());}
function resolveLocal(q){var n=N(q),hits=[];state.projects.filter(function(p){return !terminal(p);}).forEach(function(p){var score=0;identityValues(p).forEach(function(x){if(n.indexOf(x)>-1)score=Math.max(score,x.length);});var words=N(p.name).split(' ').filter(function(x){return x.length>=5&&!/projekt|steel|style/.test(x);});var c=words.filter(function(x){return n.indexOf(x)>-1;}).length;if(c>=2)score=Math.max(score,8+c);if(score)hits.push({p:p,score:score});});hits.sort(function(a,b){return b.score-a.score;});return hits.length&&(!hits[1]||hits[0].score>hits[1].score+1)?hits[0].p:null;}
async function askAI(q){var AI=window.PSTOpenAIAssistantV1;if(!AI||typeof AI.ask!=='function')throw new Error('PPPP AI nuk është gati.');return AI.ask(q,{scope:'global'});}
async function edgeOperator(projectId,update){
  var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase nuk është gati.');var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
  async function run(t){return fetch(base+'/functions/v1/pppp-project-operator-update',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({project_id:projectId,update:update})});}
  var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,700));return data;
}
async function submit(q){state.busy=true;render();try{if(isQuestion(q)){state.last={kind:'answer',data:await askAI(q)};return;}var p=resolveLocal(q),probe=null;if(!p){probe=await askAI('Identifiko vetëm projektin PPPP që i përket këtij update-i operativ. Mos hamendëso nëse nuk është unik. Update: '+q);var pid=probe&&probe.navigation&&probe.navigation.project_id;p=state.projects.find(function(x){return S(x.id)===S(pid);})||null;}if(!p)throw new Error('Nuk e lidha dot me një projekt unik. Përmend emrin e projektit në update.');var out=await edgeOperator(p.id,q);state.last={kind:'update',project:p.name,text:out.summary||'Update-i u ruajt.'};await load(true);}catch(e){state.last={kind:'error',text:S(e&&e.message||e)};}finally{state.busy=false;render();}}
function bind(root){
  if(root.dataset.bound==='1')return;root.dataset.bound='1';var form=root.querySelector('.pst-cr-command'),input=root.querySelector('.pst-cr-input');
  form.addEventListener('submit',function(e){e.preventDefault();var q=S(input.value).trim();if(!q||state.busy)return;input.value='';submit(q);});
  input.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  root.addEventListener('click',function(e){var t=e.target.closest('[data-cr-project],[data-cr-activity],[data-cr-open]');if(!t)return;var id=t.getAttribute('data-cr-project')||t.getAttribute('data-cr-activity')||t.getAttribute('data-cr-open');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);});
  root.addEventListener('keydown',function(e){var t=e.target.closest('[data-cr-project]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();var id=t.getAttribute('data-cr-project');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);}});
}
async function load(force){
  if(!activeHome())return false;if(state.loading)return false;if(!force&&state.loadedAt&&Date.now()-state.loadedAt<30000){render();return true;}state.loading=true;render();
  try{
    var now=new Date(),since=new Date(now.getTime()-21*86400000),anchorSince=new Date(now.getTime()-180*86400000),lte=new Date(now.getTime()+10*60000);
    var out=await Promise.all([
      db('projects?select=id,name,client,status,pipeline_stage,operational_state,deadline,last_activity_at,last_email_at,updated_at,business_ref,ref,identity_aliases&order=last_activity_at.desc.nullslast&limit=500'),
      db('project_emails?select=id,project_id,gmail_message_id,gmail_thread_id,from_email,from_name,to_emails,subject,snippet,sent_at,direction,has_attachments,gmail_url&sent_at=gte.'+encodeURIComponent(iso(since))+'&sent_at=lte.'+encodeURIComponent(iso(lte))+'&order=sent_at.desc&limit=700'),
      db('project_emails?project_id=not.is.null&select=project_id,gmail_thread_id,from_email,to_emails,sent_at,subject,snippet,direction&sent_at=gte.'+encodeURIComponent(iso(anchorSince))+'&sent_at=lte.'+encodeURIComponent(iso(lte))+'&order=sent_at.desc&limit=1800'),
      db('pppp_project_context_current_v?select=id,project_id,category,subject,fact_key,value,source_type,evidence_status,fact_status,created_at,updated_at&fact_status=eq.observed&order=updated_at.desc&limit=700').catch(function(){return[];}),
      db('files?select=id,project_id,file_name,file_type,created_at,page_context&created_at=gte.'+encodeURIComponent(iso(since))+'&order=created_at.desc&limit=300').catch(function(){return[];}),
      db('documents_registry?select=id,project_id,doc_nr,project,client,created_at,followup_status,total_amount,currency&created_at=gte.'+encodeURIComponent(iso(since))+'&order=created_at.desc&limit=300').catch(function(){return[];}),
      db('offers?select=id,project_id,supplier,created_at,total_amount,total_eur,currency,offer_ref,notes&created_at=gte.'+encodeURIComponent(iso(since))+'&order=created_at.desc&limit=300').catch(function(){return[];})
    ]);
    state.projects=A(out[0]);state.emails=A(out[1]).concat(A(out[2]));var seen={};state.emails=state.emails.filter(function(r){var k=S(r.gmail_message_id||[r.sent_at,r.subject,r.direction].join('|'));if(seen[k])return false;seen[k]=1;return true;});state.facts=A(out[3]);state.files=A(out[4]);state.docs=A(out[5]);state.offers=A(out[6]);buildActivities();state.loadedAt=Date.now();return true;
  }catch(e){console.warn('PPPP Control Room:',e);state.last={kind:'error',text:'Home nuk arriti të lexojë aktivitetin live: '+S(e&&e.message||e)};return false;}finally{state.loading=false;render();}
}
function css(){
  var old=document.getElementById('pst-project-control-home-v1-css');if(old)old.remove();if(document.getElementById('pst-project-control-home-v2-css'))return;
  var s=document.createElement('style');s.id='pst-project-control-home-v2-css';s.textContent=`
#page-workspace-home>*:not(#pst-project-control-home-v2){display:none!important}
#page-workspace-home{background:#F3F7F8!important;min-height:100vh!important}
#pst-project-control-home-v2{display:block!important;max-width:1240px;margin:0 auto;padding:30px 22px 58px;color:#20323A;font-family:Inter,system-ui,-apple-system,sans-serif}
.pst-cr-hero{position:relative;overflow:hidden;border-radius:24px;padding:28px 30px 0;background:radial-gradient(circle at 88% 12%,rgba(101,192,212,.22),transparent 28%),linear-gradient(135deg,#18343F 0%,#214A59 55%,#2B6678 100%);box-shadow:0 18px 48px rgba(29,68,81,.18);color:#fff}
.pst-cr-orbit{position:absolute;border:1px solid rgba(255,255,255,.08);border-radius:50%;pointer-events:none}.pst-cr-orbit.one{width:370px;height:370px;right:-155px;top:-195px}.pst-cr-orbit.two{width:240px;height:240px;right:-60px;top:-120px}
.pst-cr-hero-top{position:relative;z-index:1;display:flex;justify-content:space-between;gap:30px;align-items:flex-start}.pst-cr-kicker{display:inline-flex;align-items:center;gap:8px;font-size:9px;font-weight:850;letter-spacing:1.8px;color:#C9E7EE}.pst-cr-kicker i,.pst-cr-stream header i{width:7px;height:7px;border-radius:50%;background:#76D59E;box-shadow:0 0 0 5px rgba(118,213,158,.12)}.pst-cr-hero h1{font-size:31px;line-height:1.08;letter-spacing:-1.1px;margin:8px 0 7px;color:#fff}.pst-cr-hero p{max-width:680px;font-size:12px;line-height:1.55;color:#C9DCE2}.pst-cr-live{position:relative;z-index:1;text-align:right;display:grid;gap:5px}.pst-cr-live span{justify-self:end;font-size:8px;letter-spacing:1.4px;font-weight:850;border:1px solid rgba(174,231,198,.35);background:rgba(88,181,126,.12);color:#B9E8CC;padding:4px 8px;border-radius:999px}.pst-cr-live b{font-size:10px;font-weight:600;color:#BFD2D8;text-transform:capitalize;white-space:nowrap}
.pst-cr-command{position:relative;z-index:1;margin-top:24px;display:flex;align-items:center;gap:10px;background:#fff;border-radius:15px;padding:7px 8px 7px 10px;box-shadow:0 10px 24px rgba(6,29,38,.18)}.pst-cr-command-mark{width:35px;height:35px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:850;background:#E7F3F6;color:#326C7E;flex:0 0 35px}.pst-cr-input{flex:1;min-height:39px;max-height:115px;resize:vertical;border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;color:#233942!important;padding:9px 4px!important;font-size:12.5px!important}.pst-cr-input::placeholder{color:#8CA0A8}.pst-cr-send{width:39px;height:39px;border:0;border-radius:11px;background:#2C7188;color:#fff;font-size:18px;cursor:pointer}.pst-cr-send:hover{background:#245F73}.pst-cr-send:disabled{opacity:.5}.pst-cr-state{position:relative;z-index:1;min-height:18px;padding:5px 4px 0;font-size:9px;color:#BFD2D8}.pst-cr-result{position:relative;z-index:1;margin:3px 0 15px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.12)}.pst-cr-answer{font-size:11.5px;line-height:1.6;color:#F3FAFC}.pst-cr-suggest{display:flex;gap:9px;margin-top:8px;font-size:10px}.pst-cr-suggest b{color:#9ED2E0}.pst-cr-suggest span{color:#D9E7EB}.pst-cr-msg{display:flex;gap:10px;align-items:baseline;font-size:10.5px;color:#F3FAFC}.pst-cr-msg.ok b{color:#AEE5C4}.pst-cr-msg.err{color:#FFD6CB}.pst-cr-open-answer{margin-top:8px;border:0;background:transparent;color:#BDE7F1;font-size:10px;font-weight:800;padding:0;cursor:pointer}
.pst-cr-metrics{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);margin:3px -30px 0;background:rgba(5,25,33,.18);border-top:1px solid rgba(255,255,255,.08)}.pst-cr-metrics>div{padding:17px 20px 18px;border-right:1px solid rgba(255,255,255,.08)}.pst-cr-metrics>div:last-child{border-right:0}.pst-cr-metrics span{display:block;font-size:8px;font-weight:800;letter-spacing:1.05px;color:#A9C3CB}.pst-cr-metrics b{display:block;font-size:25px;line-height:1.05;margin:5px 0 3px;color:#fff;letter-spacing:-.6px}.pst-cr-metrics small{display:block;font-size:8.5px;color:#9EB6BE}
.pst-cr-grid{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(310px,.72fr);gap:18px;margin-top:20px;align-items:start}.pst-cr-radar,.pst-cr-stream{background:#fff;border:1px solid #DDE7EA;border-radius:19px;box-shadow:0 5px 20px rgba(34,64,76,.055);overflow:hidden}.pst-cr-radar>header,.pst-cr-stream>header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 15px;border-bottom:1px solid #E7EEF0}.pst-cr-radar header span,.pst-cr-stream header span{font-size:8px;letter-spacing:1.35px;font-weight:850;color:#7B919A}.pst-cr-radar h2,.pst-cr-stream h2{font-size:17px;letter-spacing:-.35px;margin-top:2px;color:#253A43}.pst-cr-radar header small{font-size:9px;font-weight:700;color:#507786;background:#EEF5F7;padding:5px 8px;border-radius:999px}
.pst-cr-project{display:grid;grid-template-columns:31px minmax(0,1fr) 28px;gap:12px;align-items:start;padding:15px 18px;border-bottom:1px solid #EEF2F3;cursor:pointer;transition:background .14s,transform .14s}.pst-cr-project:last-child{border-bottom:0}.pst-cr-project:hover{background:#F6FAFB}.pst-cr-project:focus-visible{outline:2px solid #6AA6B8;outline-offset:-2px}.pst-cr-num{font-size:9px;font-weight:800;letter-spacing:.5px;color:#9AAAB0;padding-top:3px}.pst-cr-project-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.pst-cr-project-top>b{font-size:13px;line-height:1.35;color:#263B44}.pst-cr-status{white-space:nowrap;font-size:8px;font-weight:800;padding:4px 7px;border-radius:999px}.pst-cr-status.execution{background:#E8F5EE;color:#387055}.pst-cr-status.active{background:#EAF4F7;color:#316C7F}.pst-cr-status.waiting{background:#F4F1E8;color:#7D6D43}.pst-cr-status.quiet{background:#F0F2F3;color:#7A878C}.pst-cr-project-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:9px;color:#809198}.pst-cr-project-meta i{font-style:normal;color:#C0CBCD}.pst-cr-context{font-size:10px;line-height:1.48;color:#596F78;margin:8px 0 0}.pst-cr-next{display:flex;gap:8px;align-items:baseline;margin-top:8px}.pst-cr-next span{font-size:7.5px;font-weight:850;letter-spacing:1px;color:#9BAAAF;white-space:nowrap}.pst-cr-next strong{font-size:9.5px;font-weight:650;color:#395B68}.pst-cr-arrow{font-size:18px;color:#6A9CAC;padding-top:1px;transition:transform .14s}.pst-cr-project:hover .pst-cr-arrow{transform:translateX(3px)}
.pst-cr-stream{position:sticky;top:18px}.pst-cr-stream header i{margin-right:5px}.pst-cr-feed-row{display:grid;grid-template-columns:28px minmax(0,1fr);gap:10px;padding:12px 15px;border-bottom:1px solid #EEF2F3;cursor:pointer;transition:background .14s}.pst-cr-feed-row:last-child{border-bottom:0}.pst-cr-feed-row:hover{background:#F7FAFB}.pst-cr-feed-icon{width:27px;height:27px;border-radius:9px;background:#EEF5F7;display:flex;align-items:center;justify-content:center;color:#47798A;font-size:11px;font-weight:800}.pst-cr-feed-icon.context{background:#EDF7F1;color:#4B7B60}.pst-cr-feed-icon.offer{background:#F6F1E8;color:#876E3B}.pst-cr-feed-copy>div{display:flex;justify-content:space-between;gap:8px}.pst-cr-feed-copy b{font-size:9.5px;color:#324A54;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-cr-feed-copy time{font-size:8px;color:#9AA9AE;white-space:nowrap}.pst-cr-feed-copy>span{display:block;margin-top:2px;font-size:9px;color:#667C85;line-height:1.35}.pst-cr-feed-copy p{margin-top:4px;font-size:8.5px;color:#93A1A6;line-height:1.35}.pst-cr-empty{padding:28px 20px;font-size:10px;color:#89999F;text-align:center}
@media(max-width:1050px){.pst-cr-grid{grid-template-columns:1fr}.pst-cr-stream{position:static}.pst-cr-metrics{grid-template-columns:repeat(2,1fr)}.pst-cr-metrics>div:nth-child(2){border-right:0}.pst-cr-metrics>div:nth-child(-n+2){border-bottom:1px solid rgba(255,255,255,.08)}}
@media(max-width:720px){#pst-project-control-home-v2{padding:18px 10px 40px}.pst-cr-hero{padding:22px 18px 0;border-radius:18px}.pst-cr-hero-top{display:block}.pst-cr-live{display:none}.pst-cr-hero h1{font-size:25px}.pst-cr-metrics{margin-left:-18px;margin-right:-18px}.pst-cr-project{grid-template-columns:24px minmax(0,1fr) 20px;padding:14px 12px}.pst-cr-project-top{display:block}.pst-cr-status{display:inline-block;margin-top:5px}.pst-cr-next{display:block}.pst-cr-next span{display:block;margin-bottom:2px}}
`;
  document.head.appendChild(s);
}
function apply(force){css();var page=activeHome();if(!page)return false;ensureRoot(page);render();load(!!force);return true;}
function schedule(){[0,80,260,700,1500,2600].forEach(function(ms){setTimeout(function(){apply(false);},ms);});}
document.addEventListener('pst:modules-ready',function(){[0,80,240,700,1500].forEach(function(ms){setTimeout(function(){apply(true);},ms);});},{once:true});
document.addEventListener('click',function(e){var nav=e.target&&e.target.closest&&e.target.closest('.pst-ws-navbtn,[onclick*="pstWorkspaceGo"],[onclick*="showPage"]');if(nav)setTimeout(function(){apply(false);},120);},true);
window.addEventListener('pageshow',function(){setTimeout(function(){apply(false);},80);},{once:true});
if(document.readyState!=='loading')schedule();else document.addEventListener('DOMContentLoaded',schedule,{once:true});
window.PSTProjectControlHomeV1={apply:apply,load:load,render:render,_state:state};
})();
