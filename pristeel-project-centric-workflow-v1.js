/* PRISTEEL Project-Centric Workflow v1
 * Bounded final UX layer for the 2026-08-26 operator review.
 * Projects remain the daily center. Tender discovery stays backstage until it needs a decision.
 * Adds no parallel project/tender stores and never sends external communication.
 */
(function(){
'use strict';
if(window.__pstProjectCentricWorkflowV1)return;
window.__pstProjectCentricWorkflowV1=true;

var tenderState={rows:[],mode:'all',busy:false,last:0,partners:null};
var contactBusy={};
function A(v){return Array.isArray(v)?v:[];}
function S(v){return String(v==null?'':v);}
function N(v){return S(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();}
function E(v){return S(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function safeUrl(v){v=S(v).trim();return /^https?:\/\//i.test(v)?v:'';}
function activePage(id){var p=document.getElementById(id);return p&&p.classList.contains('active')&&p.style.display!=='none'?p:null;}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}

/* ---------- Home: project-first, full-card action ---------- */
function home(){
 var p=activePage('page-workspace-home');if(!p)return false;
 var h=document.getElementById('pst-home-operating-grid-v1');if(!h)return false;
 h.querySelectorAll('.pst-hao-go').forEach(function(b){b.remove();});
 h.querySelectorAll('.pst-hao-card').forEach(function(c){c.setAttribute('role','button');c.setAttribute('tabindex','0');c.title='Hap projektin / veprimin';});
 var title=h.querySelector('.pst-hao-head h1');if(title)title.textContent='Projektet që kërkojnë veprimin tënd';
 var copy=h.querySelector('.pst-hao-head p');if(copy)copy.textContent='PPPP vendos projektet përpara: çfarë po ndodh, pse kërkon vëmendje dhe cili është hapi i radhës.';
 return true;
}

/* ---------- Projects: complete register + whole-row open ---------- */
function projects(){
 var p=activePage('page-workspace-projects');if(!p)return false;
 try{var C=window.PSTProjectClassificationV1;if(C&&C._state)C._state.work='all';}catch(e){}
 p.querySelectorAll('.pst-pm-row[data-project-id]').forEach(function(row){
   row.setAttribute('role','button');row.setAttribute('tabindex','0');row.title='Hap projektin';
   if(row.dataset.pstWholeRow==='1')return;row.dataset.pstWholeRow='1';
   row.addEventListener('click',function(e){
     if(e.target&&e.target.closest&&e.target.closest('button,a,input,select,textarea,[data-pm-more],[data-pm-open]'))return;
     var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);
   });
   row.addEventListener('keydown',function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a,input,select,textarea')){e.preventDefault();var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);}});
 });
 var title=p.querySelector('.pst-pm-title');if(title)title.textContent='Projektet';
 return true;
}

/* ---------- Opportunities: local bids + TED awards only ---------- */
function tenderApi(){return window.PSTTenderPriorityActionsV2||window.PSTTenderPriorityActionsV1||null;}
function tenderPayload(r){return r&&r.payload&&typeof r.payload==='object'?r.payload:{};}
function tenderSource(r){var x=S(tenderPayload(r).source||'KRPP').toUpperCase();return x==='TED'?'TED':(x==='APP'||x==='APP_AL')?'APP_AL':'KRPP';}
function tenderPhase(r){return tenderPayload(r).notice_phase==='award'?'award':'opportunity';}
function tenderVisible(r){
 var src=tenderSource(r),phase=tenderPhase(r),st=S(r&&r.status);
 if(src==='TED')return phase==='award'&&['new','review','watch'].indexOf(st)>-1&&!!S(tenderPayload(r).winner&&tenderPayload(r).winner.name).trim();
 return phase==='opportunity'&&['new','review'].indexOf(st)>-1;
}
function tenderMode(r){return tenderSource(r)==='TED'?'award':'local';}
function tenderScore(r){var n=Number(r&&r.relevance_score);return isFinite(n)&&n>0?Math.round(n):0;}
function winnerName(r){var w=tenderPayload(r).winner;return S(w&&w.name);}
function sourceLabel(r){return tenderSource(r)==='TED'?'EU · TED':tenderSource(r)==='APP_AL'?'Shqipëri · APP':'Kosovë · KRPP';}
function tenderDate(v){var d=v?new Date(v+'T00:00:00'):null;return d&&!isNaN(d.getTime())?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function tenderReason(r){var P=tenderApi();return P&&typeof P.reason==='function'?P.reason(r):A(r&&r.match_reasons).slice(0,2).join(' · ');}
function opportunityRows(){
 var rows=tenderState.rows.filter(tenderVisible);
 if(tenderState.mode==='local')rows=rows.filter(function(r){return tenderMode(r)==='local';});
 if(tenderState.mode==='award')rows=rows.filter(function(r){return tenderMode(r)==='award';});
 rows.sort(function(a,b){return tenderScore(b)-tenderScore(a)||S(b.published_date).localeCompare(S(a.published_date));});
 return rows.slice(0,40);
}
function opportunityCard(r){
 var award=tenderMode(r)==='award',winner=winnerName(r),status=award?'FITUES TED':'PËR OFERTIM';
 return '<article class="pst-pcw-tender" role="button" tabindex="0" data-pcw-tender="'+E(r.id)+'">'
   +'<div class="pst-pcw-tender-copy"><div class="pst-pcw-tender-meta"><span class="kind">'+status+'</span><span>'+E(sourceLabel(r))+'</span><span>'+tenderScore(r)+'% relevance</span></div>'
   +'<h3>'+E(r.title||'Tender')+'</h3>'
   +'<p>'+E(tenderReason(r)||'Kliko për analizën operative të PPPP.')+'</p>'
   +'<small>'+(award?(winner?'Fituesi: '+E(winner):'Fituesi duhet verifikuar'):'Afati: '+E(tenderDate(r.deadline)))+(r.authority?' · '+E(r.authority):'')+'</small></div>'
   +'<div class="pst-pcw-tender-open"><b>'+ (award?'Analizo fituesin':'Analizo dosjen') +'</b><span>→</span></div>'
 +'</article>';
}
function renderOpportunities(){
 var p=activePage('page-kek-tenders');if(!p)return false;
 var focus=p.querySelector('#pst-opportunities-focus');if(!focus)return false;
 var list=focus.querySelector('#pst-opportunities-list');if(!list)return false;
 var all=tenderState.rows.filter(tenderVisible),local=all.filter(function(r){return tenderMode(r)==='local';}).length,award=all.filter(function(r){return tenderMode(r)==='award';}).length,rows=opportunityRows();
 var header=focus.querySelector('header');if(header)header.innerHTML='<div><span>OPPORTUNITIES</span><h2>Tenderat që mund të kthehen në projekt</h2><p>KRPP dhe APP për ofertim. TED vetëm për kontratat e fituara dhe kompanitë që mund t’i kontaktojmë.</p></div>';
 var tabs=focus.querySelector('#pst-pcw-opportunity-tabs');if(!tabs){tabs=document.createElement('div');tabs.id='pst-pcw-opportunity-tabs';focus.insertBefore(tabs,list);}
 tabs.innerHTML='<button data-pcw-mode="all" class="'+(tenderState.mode==='all'?'on':'')+'">Të gjitha <i>'+(local+award)+'</i></button><button data-pcw-mode="local" class="'+(tenderState.mode==='local'?'on':'')+'">KRPP / APP <i>'+local+'</i></button><button data-pcw-mode="award" class="'+(tenderState.mode==='award'?'on':'')+'">Fitues TED <i>'+award+'</i></button>';
 list.innerHTML=rows.length?rows.map(opportunityCard).join(''):'<div class="pst-pcw-empty">Nuk ka mundësi në këtë filtër.</div>';
 var legacy=p.querySelector('#pst-opportunities-all');if(legacy)legacy.classList.add('pst-pcw-backstage');
 return true;
}
async function loadOpportunities(force){
 if(!activePage('page-kek-tenders')||tenderState.busy)return false;
 if(!force&&tenderState.last&&Date.now()-tenderState.last<30000){renderOpportunities();return true;}
 tenderState.busy=true;
 try{tenderState.rows=A(await db('kek_tender_watch?select=*&status=in.(new,review,watch)&order=published_date.desc,relevance_score.desc&limit=2000'));tenderState.last=Date.now();renderOpportunities();return true;}
 catch(e){console.warn('PPPP opportunities project-centric:',e);return false;}finally{tenderState.busy=false;}
}
async function partnerContext(){
 if(tenderState.partners)return tenderState.partners;
 try{var rows=A(await db('partners?select=name,country,business_type,relation,categories,certifications,importance_reason,notes&limit=500'));tenderState.partners=rows.filter(function(r){var rel=A(r.relation).map(N),cat=A(r.categories).map(N);return rel.indexOf('manufacturer')>-1||rel.indexOf('subcontractor')>-1||rel.indexOf('supplier')>-1||cat.indexOf('fabrication')>-1;}).slice(0,80);}catch(e){tenderState.partners=[];}
 return tenderState.partners;
}
function tenderById(id){return tenderState.rows.find(function(r){return S(r.id)===S(id);})||null;}
async function serverTenderAnalysis(r){
 var AI=window.PSTOpenAIAssistantV1;if(!AI||typeof AI.ask!=='function')return null;
 var partners=await partnerContext();
 var q=tenderMode(r)==='award'?'Analizo këtë kontratë të fituar. Shpjego çfarë pakete mund të ofrojë PRISTEEL te kompania fituese dhe cilët partnerë/prodhues të regjistruar në PPPP janë potencialisht relevantë. Mos sugjero ofertim në tenderin e mbyllur.':'Analizo këtë tender për PRISTEEL. Vlerëso scope-in e mundshëm, çfarë duhet verifikuar në dosje dhe cilët partnerë/prodhues të regjistruar në PPPP mund të jenë relevantë për realizim. Nëse Eurosteel është realisht i përshtatshëm sipas të dhënave, thuaje; mos e favorizo pa bazë.';
 try{return await AI.ask(q,{scope:'global',context:{tender:r,candidate_partners:partners}});}catch(e){return null;}
}
function modalActionBar(r){
 var id=E(r.id),award=tenderMode(r)==='award';
 return '<div id="pst-pcw-ti-actions"><button data-pcw-ti="source" data-id="'+id+'">Burimi zyrtar</button>'+(award?'<button class="primary" data-pcw-ti="draft" data-id="'+id+'">Përgatit outreach draft</button>':'<button class="primary" data-pcw-ti="go" data-id="'+id+'">GO · ktheje në projekt</button>')+'<button data-pcw-ti="nogo" data-id="'+id+'">NO-GO</button></div>';
}
async function openTender(id){
 var r=tenderById(id);if(!r)return false;
 if(typeof window.pstTenderIntelligence==='function')try{await window.pstTenderIntelligence(id);}catch(e){}
 var b=document.getElementById('pst-ti-body');if(!b)return false;
 var old=b.querySelector('#pst-pcw-server-analysis');if(old)old.remove();
 var sec=document.createElement('section');sec.id='pst-pcw-server-analysis';sec.innerHTML='<div class="pst-pcw-ai-loading">PPPP AI po e lidh tenderin me projektet dhe partnerët tanë…</div>';b.appendChild(sec);
 var out=await serverTenderAnalysis(r);
 sec.innerHTML=out?'<div class="pst-pcw-ai"><span>PPPP AI</span><p>'+E(out.answer||'').replace(/\n/g,'<br>')+'</p>'+(out.suggested_next_step?'<small><b>Hapi i radhës:</b> '+E(out.suggested_next_step)+'</small>':'')+'</div>':'<div class="pst-pcw-ai-loading">Analiza bazë e Tender Intelligence mbetet e vlefshme. Server AI nuk u përgjigj në këtë hap.</div>';
 b.insertAdjacentHTML('beforeend',modalActionBar(r));
 return true;
}
async function exactSource(r){
 var P=tenderApi(),src=tenderSource(r);
 if(src==='APP_AL'){
   var ref=S(r.procurement_no||r.publication_no||tenderPayload(r).reference);
   if(ref&&navigator.clipboard&&navigator.clipboard.writeText)try{await navigator.clipboard.writeText(ref);}catch(e){}
   window.open('https://www.app.gov.al/njoftimi-i-kontrat%C3%ABs-s%C3%AB-shpallur/','_blank','noopener');
   if(ref)alert('APP nuk publikon deep-link unik për këtë rekord. Numri '+ref+' u kopjua; kërkoje te “Numri i Referencës”.');
   return true;
 }
 if(P&&typeof P.openSource==='function'){P.openSource(r.id);return true;}
 var u=safeUrl(r.detail_url)||safeUrl(r.source_url);if(u){window.open(u,'_blank','noopener');return true;}return false;
}
async function tenderAction(kind,id,btn){
 var P=tenderApi(),r=tenderById(id);if(!P||!r)return false;
 if(btn)btn.disabled=true;
 try{
   if(kind==='source')return await exactSource(r);
   if(kind==='go')await P.go(id);
   else if(kind==='draft')await P.prepareDraft(id);
   else if(kind==='nogo')await P.noGo(id);
   else return false;
   tenderState.last=0;await loadOpportunities(true);if(kind==='nogo'&&window.pstTenderIntelligenceClose)window.pstTenderIntelligenceClose();return true;
 }catch(e){alert(e&&e.message||e);return false;}finally{if(btn)btn.disabled=false;}
}

/* ---------- Contact brief: hydrate live relations instead of empty shell ---------- */
function contactMasterRows(){var M=window.PSTContactMasterV3||window.PSTContactMasterV2||window.PSTContactMasterV1;return M&&M.state&&Array.isArray(M.state.rows)?M.state.rows:[];}
async function hydrateContact(id){
 id=S(id);if(!id||contactBusy[id])return;contactBusy[id]=true;
 try{
   var row=contactMasterRows().find(function(r){return S(r.contact_id||r.id)===id;});
   if(!row){var rr=A(await db('pppp_contact_master_v1?contact_id=eq.'+encodeURIComponent(id)+'&select=*&limit=1'));row=rr[0];}
   if(!row)return;
   var email=S(row.email).trim();
   var sources1=A(await db('contact_sources?contact_id=eq.'+encodeURIComponent(id)+'&select=source,external_id,external_url,last_seen,metadata&order=last_seen.desc&limit=40').catch(function(){return[];}));
   var sources2=email?A(await db('contact_sources?email=eq.'+encodeURIComponent(email)+'&select=source,external_id,external_url,last_seen,metadata&order=last_seen.desc&limit=40').catch(function(){return[];})):[];
   var pcs=email?A(await db('project_contacts?email=eq.'+encodeURIComponent(email)+'&select=project_id,name,company,role,source,first_seen,last_seen,email_count,direct_count,cc_count,is_primary,status&order=last_seen.desc.nullslast&limit=100').catch(function(){return[];})):[];
   var allProjects=A(await db('projects?select=id,name,client,status,pipeline_stage&limit=3000').catch(function(){return[];})),by={};allProjects.forEach(function(p){by[S(p.id)]=p;});
   var projectRows=pcs.map(function(pc){var p=by[S(pc.project_id)]||{};return{id:S(pc.project_id),name:p.name||'Projekt',client:p.client||'',role:pc.role||'',email_count:Number(pc.email_count||0),last_seen:pc.last_seen||null};}).filter(function(x){return x.id;});
   var recent=email?A(await db('project_emails?from_email=eq.'+encodeURIComponent(email)+'&select=project_id,subject,snippet,sent_at,direction,gmail_url&order=sent_at.desc.nullslast&limit=8').catch(function(){return[];})):[];
   var host=document.getElementById('pcm-detail');if(!host)return;
   var old=host.querySelector('#pst-contact-live-context');if(old)old.remove();
   var srcSeen={},sources=sources1.concat(sources2).filter(function(s){var k=N(S(s.source)+'|'+S(s.external_id)+'|'+S(s.external_url));if(!k||srcSeen[k])return false;srcSeen[k]=1;return true;});
   var sec=document.createElement('section');sec.id='pst-contact-live-context';sec.className='pcm-detail-section';
   sec.innerHTML='<h3>Aktiviteti real në PPPP</h3><div class="pst-contact-live-grid"><div><span>Burime</span><b>'+sources.length+'</b></div><div><span>Projekte</span><b>'+projectRows.length+'</b></div><div><span>Emaila projekti</span><b>'+projectRows.reduce(function(a,x){return a+x.email_count;},0)+'</b></div></div>'
    +(projectRows.length?'<div class="pst-contact-live-projects">'+projectRows.slice(0,12).map(function(x){return'<button type="button" data-pcw-contact-project="'+E(x.id)+'"><b>'+E(x.name)+'</b><span>'+E([x.client,x.role,x.email_count?x.email_count+' emaila':''].filter(Boolean).join(' · '))+'</span></button>';}).join('')+'</div>':'<p class="pst-contact-live-none">Nuk ka projekt të lidhur me këtë email.</p>')
    +(recent.length?'<div class="pst-contact-live-mails"><h4>Emailat e fundit</h4>'+recent.map(function(m){return'<div><b>'+E(m.subject||'Pa subject')+'</b><span>'+E((m.snippet||'').slice(0,180))+'</span><small>'+E(m.sent_at?new Date(m.sent_at).toLocaleDateString('sq-AL'):'')+'</small></div>';}).join('')+'</div>':'');
   var actions=host.querySelector('.pcm-detail-actions');if(actions)host.insertBefore(sec,actions);else host.appendChild(sec);
 }catch(e){console.warn('PPPP contact hydration:',e);}finally{delete contactBusy[id];}
}

/* ---------- Project operator update: human text -> context + safe internal action ---------- */
function sessionNow(){try{return typeof window.authGetSession==='function'?window.authGetSession():null;}catch(e){return null;}}
async function refreshSession(){try{return typeof window.authRefreshIfNeeded==='function'?await window.authRefreshIfNeeded():sessionNow();}catch(e){return sessionNow();}}
async function edge(slug,payload){
 var base=S(window._SB_URL).replace(/\/$/,''),key=S(window._SB_KEY);if(!base||!key)throw new Error('Supabase runtime nuk është gati.');
 var s=sessionNow();if(s&&s.refresh_token&&s.expires_at&&Date.now()>=Number(s.expires_at))s=await refreshSession();var token=s&&s.access_token?s.access_token:'';if(!token)throw new Error('Sesioni ka skaduar.');
 async function run(t){return fetch(base+'/functions/v1/'+slug,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify(payload)});}
 var res=await run(token);if(res.status===401){s=await refreshSession();if(s&&s.access_token)res=await run(s.access_token);}var raw=await res.text(),data=null;try{data=raw?JSON.parse(raw):null;}catch(e){}if(!res.ok||!data||data.ok===false)throw new Error(S(data&&(data.message||data.error)||('HTTP '+res.status)).slice(0,800));return data;
}
function currentProjectId(){var d=window.__pstIntegrityLastData,p=d&&d.project;return S(window.__pstCurrentProjectId||window._curProjId||p&&p.id).trim();}
function ensureProjectUpdate(){
 var p=activePage('page-workspace-project');if(!p)return false;var pid=currentProjectId();if(!pid)return false;
 var box=document.getElementById('pst-project-operator-update');if(box){box.setAttribute('data-project-id',pid);return true;}
 box=document.createElement('section');box.id='pst-project-operator-update';box.setAttribute('data-project-id',pid);box.innerHTML='<div class="pst-pou-copy"><span>PROJECT UPDATE</span><b>Çfarë po ndodh me këtë projekt?</b><small>Shkruaj vendimin ose gjendjen reale. PPPP e ruan si kontekst dhe organizon vetëm veprimet e sigurta të brendshme.</small></div><form><textarea rows="2" placeholder="P.sh. Oferta është dërguar dhe tani presim përgjigjen e klientit. Bëj follow-up të premten."></textarea><button type="submit">Përditëso projektin</button></form><div class="pst-pou-result" hidden></div>';
 var anchor=p.querySelector('.pwf-project-context')||p.querySelector('.pf2-project-context')||p.firstElementChild;if(anchor&&anchor.parentNode)anchor.insertAdjacentElement('afterend',box);else p.prepend(box);
 var form=box.querySelector('form'),ta=box.querySelector('textarea'),result=box.querySelector('.pst-pou-result');form.onsubmit=async function(e){e.preventDefault();var update=S(ta.value).trim(),id=S(box.getAttribute('data-project-id'));if(!update||!id)return;var btn=form.querySelector('button');btn.disabled=true;btn.textContent='Duke përditësuar…';result.hidden=false;result.innerHTML='PPPP po e lexon vendimin dhe po rifreskon kontekstin…';try{var out=await edge('pppp-project-operator-update',{project_id:id,update:update});var acts=A(out.actions_applied),labels=acts.map(function(a){if(a.type==='task_created')return'Task i ri: '+S(a.task&&a.task.title);if(a.type==='project_update')return'Gjendja e projektit u përditësua';return a.type;});result.innerHTML='<b>'+E(out.summary||'Përditësimi u ruajt.')+'</b>'+(labels.length?'<span>'+E(labels.join(' · '))+'</span>':'<span>Konteksti u ruajt; nuk u bë ndryshim i panevojshëm në workflow.</span>');ta.value='';try{var B=window.PSTProjectContextBridge;if(B&&typeof B.clear==='function')B.clear(id);if(B&&typeof B.load==='function')B.load(id,true);}catch(x){}try{var H=window.PSTHomeCanonicalV1;if(H&&typeof H.refresh==='function')H.refresh();}catch(x){}try{var C=window.PSTProjectClassificationV1;if(C&&typeof C.schedule==='function')C.schedule();}catch(x){}try{document.dispatchEvent(new CustomEvent('pst:project-operator-updated',{detail:{project_id:id,result:out}}));}catch(x){}}catch(err){result.innerHTML='<b>Nuk u ruajt.</b><span>'+E(err&&err.message||err)+'</span>';}finally{btn.disabled=false;btn.textContent='Përditëso projektin';}};
 return true;
}

function click(e){
 var tab=e.target&&e.target.closest?e.target.closest('[data-pcw-mode]'):null;if(tab){tenderState.mode=tab.getAttribute('data-pcw-mode')||'all';renderOpportunities();return;}
 var ti=e.target&&e.target.closest?e.target.closest('[data-pcw-ti]'):null;if(ti){e.preventDefault();e.stopPropagation();tenderAction(ti.getAttribute('data-pcw-ti'),ti.getAttribute('data-id'),ti);return;}
 var tender=e.target&&e.target.closest?e.target.closest('[data-pcw-tender]'):null;if(tender){e.preventDefault();openTender(tender.getAttribute('data-pcw-tender'));return;}
 var cp=e.target&&e.target.closest?e.target.closest('[data-pcw-contact-project]'):null;if(cp){var id=cp.getAttribute('data-pcw-contact-project');if(id&&window.pstOpenProjectWorkspace)window.pstOpenProjectWorkspace(id);return;}
 var contact=e.target&&e.target.closest?e.target.closest('[data-pcm-id]'):null;if(contact)setTimeout(function(){hydrateContact(contact.getAttribute('data-pcm-id'));},40);
}
function keydown(e){var t=e.target&&e.target.closest?e.target.closest('[data-pcw-tender]'):null;if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();openTender(t.getAttribute('data-pcw-tender'));}}
function css(){if(document.getElementById('pst-project-centric-workflow-css'))return;var s=document.createElement('style');s.id='pst-project-centric-workflow-css';s.textContent=`
/* Home */
#page-workspace-home.active .pst-hao-go{display:none!important}
#page-workspace-home.active .pst-hao-card{padding:19px 22px!important;border-left:4px solid #6F9EAF!important;background:#fff!important}
#page-workspace-home.active .pst-hao-card:hover{border-color:#9AB8C3!important;border-left-color:#397F98!important;background:#F8FBFC!important}
#page-workspace-home.active .pst-hao-project{font-size:12px!important;color:#3E6675!important;font-weight:800!important}
#page-workspace-home.active .pst-hao-tag{background:#EDF5F7!important;color:#527E8F!important}
#page-workspace-home.active .pst-hao-head h1{color:#273F49!important}
/* Projects */
#page-workspace-projects.active .pst-pm-row{cursor:pointer}
#page-workspace-projects.active .pst-pm-row:focus-visible{outline:2px solid #6B9FAF;outline-offset:2px}
/* Opportunities */
#page-kek-tenders.active #pst-opportunities-all.pst-pcw-backstage{display:none!important}
#pst-pcw-opportunity-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0 10px}
#pst-pcw-opportunity-tabs button{height:31px;border:1px solid #DDE6E9;border-radius:999px;background:#fff;color:#66777E;padding:0 11px;font-size:8.5px;font-weight:800;cursor:pointer}
#pst-pcw-opportunity-tabs button.on{background:#EAF4F7;border-color:#B8D6DF;color:#397F98}#pst-pcw-opportunity-tabs i{font-style:normal;margin-left:4px;opacity:.65}
#pst-opportunities-list{display:grid!important;gap:9px!important}
.pst-pcw-tender{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:18px;align-items:center;padding:15px 16px;border:1px solid #DFE7EA;border-left:4px solid #6D9BAA;border-radius:12px;background:#fff;cursor:pointer;transition:.15s}
.pst-pcw-tender:hover,.pst-pcw-tender:focus-visible{border-color:#B9D0D8;border-left-color:#397F98;background:#F8FBFC;box-shadow:0 7px 20px rgba(43,75,86,.07);transform:translateY(-1px);outline:none}
.pst-pcw-tender-meta{display:flex;gap:8px;flex-wrap:wrap;font-size:7.5px;font-weight:850;color:#849197;letter-spacing:.05em}.pst-pcw-tender-meta .kind{color:#397F98}.pst-pcw-tender h3{margin:5px 0 0;font-size:12.5px;color:#31464F}.pst-pcw-tender p{margin:5px 0 0;font-size:9.5px;color:#6F8087;line-height:1.45}.pst-pcw-tender small{display:block;margin-top:6px;font-size:8.5px;color:#8A979C}.pst-pcw-tender-open{display:flex;align-items:center;gap:10px;color:#397F98;white-space:nowrap}.pst-pcw-tender-open b{font-size:9px}.pst-pcw-tender-open span{font-size:19px}.pst-pcw-empty{padding:24px;color:#819096;text-align:center}
#pst-pcw-server-analysis{margin-top:16px;padding-top:14px;border-top:1px solid #E5ECEE}.pst-pcw-ai>span{font-size:8px;font-weight:900;letter-spacing:.12em;color:#397F98}.pst-pcw-ai p{font-size:11.5px;line-height:1.62;color:#354B54;margin:7px 0}.pst-pcw-ai small{display:block;color:#657A83}.pst-pcw-ai-loading{font-size:9.5px;color:#7F8E94}
#pst-pcw-ti-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px;padding-top:12px;border-top:1px solid #E5ECEE}#pst-pcw-ti-actions button{height:36px;border:1px solid #D9E3E6;border-radius:9px;background:#fff;color:#5D7078;padding:0 11px;font-size:8.5px;font-weight:850;cursor:pointer}#pst-pcw-ti-actions button.primary{background:#397F98;border-color:#397F98;color:#fff}
/* Project operator update */
#pst-project-operator-update{display:grid;grid-template-columns:minmax(260px,.75fr) minmax(360px,1.25fr);gap:18px;align-items:center;margin:12px 0 16px;padding:16px 17px;border:1px solid #DCE7EA;border-left:4px solid #397F98;border-radius:13px;background:#F9FBFC}.pst-pou-copy>span{font-size:8px;font-weight:900;letter-spacing:.12em;color:#397F98}.pst-pou-copy>b{display:block;margin-top:3px;font-size:14px;color:#30464F}.pst-pou-copy>small{display:block;margin-top:4px;font-size:9px;line-height:1.45;color:#76868D}#pst-project-operator-update form{display:flex;gap:8px;align-items:stretch}#pst-project-operator-update textarea{flex:1;min-height:66px;border:1px solid #CADADF;border-radius:10px;padding:9px 10px;font-size:11px;line-height:1.45;resize:vertical;background:#fff}#pst-project-operator-update form button{width:126px;border:0;border-radius:10px;background:#397F98;color:#fff;font-size:9px;font-weight:850;cursor:pointer;padding:0 10px}#pst-project-operator-update form button:disabled{opacity:.55}.pst-pou-result{grid-column:1/-1;padding:10px 12px;border-radius:9px;background:#EFF6F8;color:#4C626B;font-size:9.5px}.pst-pou-result b{display:block;color:#30464F}.pst-pou-result span{display:block;margin-top:3px}
/* Contact hydration */
#pst-contact-live-context{margin-top:14px!important}.pst-contact-live-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.pst-contact-live-grid>div{padding:9px;border:1px solid #E1E8EA;border-radius:9px;background:#FAFBFC}.pst-contact-live-grid span{display:block;font-size:8px;color:#85939A}.pst-contact-live-grid b{display:block;font-size:14px;color:#3C525B;margin-top:2px}.pst-contact-live-projects{display:grid;gap:6px;margin-top:10px}.pst-contact-live-projects button{border:1px solid #E0E7EA;border-radius:9px;background:#fff;text-align:left;padding:8px 10px;cursor:pointer}.pst-contact-live-projects button b,.pst-contact-live-projects button span{display:block}.pst-contact-live-projects button b{font-size:10px;color:#354A52}.pst-contact-live-projects button span{font-size:8px;color:#829096;margin-top:2px}.pst-contact-live-mails{margin-top:12px}.pst-contact-live-mails h4{font-size:9px;color:#51666F;margin-bottom:6px}.pst-contact-live-mails>div{padding:7px 0;border-top:1px solid #EDF0F1}.pst-contact-live-mails b,.pst-contact-live-mails span,.pst-contact-live-mails small{display:block}.pst-contact-live-mails b{font-size:9px;color:#445A63}.pst-contact-live-mails span{font-size:8px;color:#7E8D93;margin-top:2px}.pst-contact-live-mails small{font-size:7.5px;color:#9AA4A8;margin-top:2px}.pst-contact-live-none{font-size:9px;color:#89969B;margin-top:9px}
@media(max-width:800px){.pst-pcw-tender{grid-template-columns:1fr}.pst-pcw-tender-open{justify-content:flex-end}#pst-project-operator-update{grid-template-columns:1fr}#pst-project-operator-update form{flex-direction:column}#pst-project-operator-update form button{width:100%;height:40px}.pst-contact-live-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s);}
function apply(force){css();home();projects();ensureProjectUpdate();if(activePage('page-kek-tenders'))loadOpportunities(!!force);return true;}
function schedule(force){[0,90,260,700].forEach(function(ms){setTimeout(function(){apply(!!force);},ms);});}
document.addEventListener('click',click,true);document.addEventListener('keydown',keydown,true);document.addEventListener('pst:modules-ready',function(){schedule(false);},{once:true});document.addEventListener('pst:project-operator-updated',function(){schedule(true);});window.addEventListener('pageshow',function(){schedule(false);},{once:true});
document.addEventListener('click',function(e){var n=e.target&&e.target.closest?e.target.closest('.pst-ws-navbtn,[data-pm-open],[data-pwf-area],[data-pwf-stage],[data-pcm-id]'):null;if(n)schedule(false);},true);
if(document.readyState!=='loading')schedule(false);else document.addEventListener('DOMContentLoaded',function(){schedule(false);},{once:true});
window.PSTProjectCentricWorkflowV1={apply:apply,schedule:schedule,home:home,projects:projects,loadOpportunities:loadOpportunities,renderOpportunities:renderOpportunities,openTender:openTender,hydrateContact:hydrateContact,ensureProjectUpdate:ensureProjectUpdate,_test:{tenderVisible:tenderVisible,tenderSource:tenderSource,tenderPhase:tenderPhase,opportunityRows:opportunityRows}};
})();
