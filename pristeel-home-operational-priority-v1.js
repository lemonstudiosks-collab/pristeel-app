/* PRISTEEL Home Operational Priority v1
 * Promotes fresh client-request execution events to the approved Home UI.
 * Read-only except explicit user dismissal/completion of the Home action state.
 * Does not mutate projects, offers, tasks, prices or outbound communication.
 */
(function(){
'use strict';
if(window.__pstHomeOperationalPriorityV1)return;
window.__pstHomeOperationalPriorityV1=true;

var RUNNING=null,LAST=0,CACHE_MS=45000,RECENT_DAYS=14;
var RED='#A64B42',RED_SOFT='#F9ECEA';
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function homeVisible(){var p=document.getElementById('page-workspace-home');return !!(p&&p.style.display!=='none'&&p.classList.contains('active'));}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
function recent(v){var d=safeDate(v);return !!(d&&Date.now()-d.getTime()<=RECENT_DAYS*86400000);}
function actionKey(t){return'op_email_'+String(t&&t.source_ref||t&&t.id||'').replace(/[^a-zA-Z0-9_-]/g,'_');}
function openProject(id){if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);}
function emailUrl(e){var id=e&&(e.gmail_thread_id||e.gmail_message_id);return id?'https://mail.google.com/mail/u/0/#all/'+id:'';}
function stateHidden(s){return s==='completed'||s==='dismissed';}
function priorityRank(t){var p=String(t&&t.priority||'').toLowerCase();return /urgjent|critical/.test(p)?3:/larte|lartë|high/.test(p)?2:1;}
function latestAnalysis(rows,projectId,sourceRef){return arr(rows).filter(function(r){return String(r.project_id||'')===String(projectId||'')&&(!sourceRef||String(r.analysis&&r.analysis.event_source_ref||'')===String(sourceRef));}).sort(function(a,b){return String(b.created_at||'').localeCompare(String(a.created_at||''));})[0]||null;}
function projectMap(rows){var m={};arr(rows).forEach(function(p){m[String(p.id||'')]=p;});return m;}
function emailMap(rows){var m={};arr(rows).forEach(function(e){m[String(e.gmail_message_id||'')]=e;});return m;}
function stateMap(rows){var m={};arr(rows).forEach(function(s){m[String(s.action_key||'')]=String(s.state||'');});return m;}
function actionText(task,analysis,project,email){
 var a=analysis&&analysis.analysis||{},next=arr(a.next_actions).filter(function(x){return String(x&&x.status||'open')!=='done';}).slice(0,3).map(function(x){return String(x&&x.text||'').trim();}).filter(Boolean);
 var parts=[];
 parts.push('Kërkesë e re e klientit');
 if(project&&project.name)parts.push(project.name);
 if(a.recommendation&&a.recommendation.label)parts.push(a.recommendation.label);
 next.forEach(function(x,i){parts.push((i+1)+') '+x);});
 var url=emailUrl(email);if(url)parts.push(url);
 return parts.join(' · ');
}
function projectNext(task,analysis){var a=analysis&&analysis.analysis||{};return String(a.recommendation&&a.recommendation.label||task&&task.title||'Veprim i kërkuar');}

async function saveState(key,state,title,meta,projectId,row){
 var payload={action_key:key,state:state,action_type:'Vepro tani',title:title,meta:meta,source_ref:projectId?'project':'',updated_at:new Date().toISOString()};
 if(row)row.style.opacity='.45';
 try{await db('dashboard_action_states','POST',payload);}catch(e){try{await db('dashboard_action_states?action_key=eq.'+enc(key),'PATCH',payload);}catch(e2){if(row)row.style.opacity='1';return false;}}
 if(row)row.remove();return true;
}
function actionRow(item){
 var row=document.createElement('div');
 row.className='pst-ws-action pst-op-priority';
 row.setAttribute('data-ws-action',item.key);
 row.setAttribute('data-pst-operational-source',item.task.source_ref||'');
 row.style.setProperty('--c',RED);row.style.setProperty('--bg',RED_SOFT);
 row.innerHTML='<i class="pst-ws-action-dot"></i><div class="pst-ws-action-main"><div class="pst-ws-action-title">'+esc(item.task.title||'Kërkesë e klientit')+'</div><div class="pst-ws-action-meta">'+esc(item.meta)+'</div></div><span class="pst-ws-action-tag">Vepro tani</span><span class="pst-ws-action-controls"><button type="button">Kryer</button><button type="button">Hiqe</button></span>';
 var main=row.querySelector('.pst-ws-action-main'),buttons=row.querySelectorAll('.pst-ws-action-controls button');
 if(main)main.addEventListener('click',function(){openProject(item.task.project_id);});
 if(buttons[0])buttons[0].addEventListener('click',function(e){e.preventDefault();e.stopPropagation();saveState(item.key,'completed',item.task.title,item.meta,item.task.project_id,row);});
 if(buttons[1])buttons[1].addEventListener('click',function(e){e.preventDefault();e.stopPropagation();saveState(item.key,'dismissed',item.task.title,item.meta,item.task.project_id,row);});
 return row;
}
function projectCard(item){
 var p=item.project||{},card=document.createElement('div');
 card.className='pst-ws-projectcard pst-op-project';card.setAttribute('data-project-id',p.id||'');
 card.innerHTML='<div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-projectcard-client">'+esc(p.client||'Pa klient')+(p.ref?' · '+esc(p.ref):'')+'</div></div><span class="pst-ws-status">Veprim</span></div><div class="pst-ws-projectcard-next"><b>Hapi tjetër:</b> '+esc(projectNext(item.task,item.analysis))+'</div>';
 card.addEventListener('click',function(){openProject(p.id);});return card;
}
function cardForProject(host,id){return arr([].slice.call(host.querySelectorAll('.pst-ws-projectcard'))).filter(function(c){var did=c.getAttribute('data-project-id')||'',oc=c.getAttribute('onclick')||'';return String(did)===String(id)||oc.indexOf(String(id))>-1;})[0]||null;}
function promoteProject(item){
 var host=document.getElementById('pst-ws-home-projects');if(!host||!item.project)return;
 var empty=host.querySelector('.pst-ws-empty');if(empty)empty.remove();
 var card=cardForProject(host,item.project.id);if(!card)card=projectCard(item);
 else{
   var next=card.querySelector('.pst-ws-projectcard-next');if(next)next.innerHTML='<b>Hapi tjetër:</b> '+esc(projectNext(item.task,item.analysis));
 }
 host.insertBefore(card,host.firstChild);
}
function inject(items){
 var host=document.getElementById('pst-ws-home-actions');if(!host)return 0;
 host.querySelectorAll('.pst-op-priority').forEach(function(r){r.remove();});
 var empty=host.querySelector('.pst-ws-empty');if(empty&&items.length)empty.remove();
 for(var i=items.length-1;i>=0;i--)host.insertBefore(actionRow(items[i]),host.firstChild);
 items.slice().reverse().forEach(promoteProject);
 try{if(window.PSTDashboardTaskCardsV1&&window.PSTDashboardTaskCardsV1.decorate)window.PSTDashboardTaskCardsV1.decorate();}catch(e){}
 try{if(window.PSTTaskSourceActionsV1&&window.PSTTaskSourceActionsV1.decorate)window.PSTTaskSourceActionsV1.decorate();}catch(e){}
 try{if(window.PSTHomeCommandCenterV2&&window.PSTHomeCommandCenterV2.decorate)window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 try{if(window.PSTHomeStabilityV2&&window.PSTHomeStabilityV2.enforce)window.PSTHomeStabilityV2.enforce();}catch(e){}
 var badge=document.getElementById('pst-ws-b-home');if(badge){var n=host.querySelectorAll(':scope > .pst-ws-action').length;badge.textContent=String(n);badge.style.display=n?'inline-flex':'none';}
 return items.length;
}
async function load(force){
 if(!homeVisible())return 0;
 if(!force&&Date.now()-LAST<CACHE_MS)return 0;
 if(RUNNING)return RUNNING;LAST=Date.now();
 RUNNING=(async function(){
   var cutoff=new Date(Date.now()-RECENT_DAYS*86400000).toISOString();
   var tasks=arr(await db('tasks?status=eq.hapur&source=eq.email_request_auto&created_at=gte.'+enc(cutoff)+'&select=id,project_id,title,detail,due_date,priority,source,source_ref,created_at&order=created_at.desc&limit=40').catch(function(){return[];}));
   tasks=tasks.filter(function(t){return t.project_id&&t.source_ref&&recent(t.created_at);}).sort(function(a,b){var r=priorityRank(b)-priorityRank(a);return r||String(b.created_at||'').localeCompare(String(a.created_at||''));});
   if(!tasks.length){inject([]);return 0;}
   var ids=Array.from(new Set(tasks.map(function(t){return String(t.project_id);}))),refs=Array.from(new Set(tasks.map(function(t){return String(t.source_ref);}))),keys=tasks.map(actionKey);
   var results=await Promise.all([
     db('projects?select=id,name,client,ref,status,pipeline_stage&id=in.('+ids.join(',')+')').catch(function(){return[];}),
     db('project_analyses?select=id,project_id,analysis,created_at&project_id=in.('+ids.join(',')+')&status=eq.complete&order=created_at.desc&limit=100').catch(function(){return[];}),
     db('project_emails?select=gmail_message_id,gmail_thread_id,subject,sent_at,from_name,from_email&gmail_message_id=in.('+refs.join(',')+')').catch(function(){return[];}),
     db('dashboard_action_states?select=action_key,state&action_key=in.('+keys.join(',')+')').catch(function(){return[];})
   ]);
   var pm=projectMap(results[0]),em=emailMap(results[2]),sm=stateMap(results[3]),seenProject={};
   var items=[];
   tasks.forEach(function(t){var key=actionKey(t);if(stateHidden(sm[key])||seenProject[String(t.project_id)])return;var p=pm[String(t.project_id)];if(!p)return;seenProject[String(t.project_id)]=true;var an=latestAnalysis(results[1],t.project_id,t.source_ref),e=em[String(t.source_ref)]||null;items.push({key:key,task:t,project:p,analysis:an,email:e,meta:actionText(t,an,p,e)});});
   return inject(items.slice(0,5));
 })().catch(function(e){console.warn('PRISTEEL operational priority:',e);return 0;}).finally(function(){RUNNING=null;});
 return RUNNING;
}
function schedule(force){[0,250,900,2200].forEach(function(ms){setTimeout(function(){load(!!force);},ms);});}
function poll(){setTimeout(function(){if(!document.hidden&&homeVisible())load(true);poll();},60000);}

document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.pst-ws-navbtn,#pst-ws-home-refresh,#pst-home-view-tabs button'))setTimeout(function(){load(true);},500);},true);
document.addEventListener('pst:modules-ready',function(){schedule(true);},{once:true});
window.addEventListener('pageshow',function(){schedule(true);},{once:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){schedule(true);},{once:true});else schedule(true);
poll();
window.PSTHomeOperationalPriorityV1={load:load,inject:inject,openProject:openProject,actionKey:actionKey,_test:{recent:recent,priorityRank:priorityRank,latestAnalysis:latestAnalysis,actionText:actionText}};
})();
