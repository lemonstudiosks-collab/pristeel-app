/* PRISTEEL Home Canonical v1
 * Single data owner for Workspace Home.
 * Owns Prioritetet + Projektet ne pune and derives project activity from real sources.
 * Retires legacy Home data writers before their scripts execute.
 */
(function(){
'use strict';
if(window.__pstHomeCanonicalV1)return;
window.__pstHomeCanonicalV1=true;

/* These legacy modules remain in the bootstrap temporarily for compatibility,
 * but they must never register competing Home writers. */
window.__pstHomeLiveFixV1=true;
window.__pstHomeStabilityV2=true;
window.__pstHomeProjectRecoveryV3=true;
window.__pstHomeOperationalPriorityV1=true;

var legacyGo=typeof window.pstWorkspaceGo==='function'?window.pstWorkspaceGo:null;
var cache={rendering:null,actions:[],projects:[],actionStates:{},lastData:null};

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function ms(v){var d=safeDate(v);return d?d.getTime():0;}
function localDay(v){var d=safeDate(v);if(!d)return null;d.setHours(0,0,0,0);return d;}
function relDays(v){var d=localDay(v);if(!d)return null;var n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/86400000);}
function hash(s){s=String(s||'');var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return(h>>>0).toString(36);}
function norm(v){return String(v||'').trim().toLowerCase();}
function one(){for(var i=0;i<arguments.length;i++)if(arguments[i])return arguments[i];return'';}
async function q(path){try{return arr(await window.supaFetch(path));}catch(e){console.warn('PPPP canonical Home query failed:',path,e);return[];}}
async function db(path,method,body){if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk eshte gati.');return window.supaFetch(path,method,body);}
function toast(text,error){try{var old=document.getElementById('pst-ws-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-ws-toast';e.className=error?'error':'';e.textContent=text;document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4200);}catch(x){}}

function inactiveProject(p){
 var s=norm(p&&p.status);
 return ['mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost'].indexOf(s)>-1;
}
function stageName(id){return({rfq_in:'Kerkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Percaktimi i cmimit',client_offer:'Oferta & konfirmimi',commercial:'Perpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzines',transport:'Transporti & dergesa'})[String(id||'')]||'Ne pritje';}
function statusLabel(v){var s=norm(v);if(s==='fituar'||s==='closedwon')return'Fituar';if(s==='aktiv'||s==='ne pune'||s==='në punë')return'Aktiv';if(s==='ofertim'||s==='oferte'||s==='ofertë')return'Ofertim';if(!s||s==='pritje')return'Pritje';return String(v||'Pritje');}
function actionStateKey(t){if(norm(t&&t.source)==='email_request_auto'&&t.source_ref)return'op_email_'+String(t.source_ref);return'ws_'+hash([t&&t.id,t&&t.title,t&&t.project_id,t&&t.source_ref].join('|'));}
function latestByProject(rows,dateField){
 var out={};arr(rows).forEach(function(r){var id=String(r&&r.project_id||'');if(!id)return;var when=ms(r&&r[dateField]);if(!out[id]||when>out[id]._when){out[id]=r;out[id]._when=when;}});return out;
}
function latestAnalysis(rows){
 var out={};arr(rows).forEach(function(r){var id=String(r&&r.project_id||'');if(!id)return;var when=ms(r&&r.created_at);if(!out[id]||when>out[id]._when){out[id]=r;out[id]._when=when;}});return out;
}
function latestTask(rows){
 var out={};arr(rows).forEach(function(r){var id=String(r&&r.project_id||'');if(!id)return;var when=ms(r&&r.created_at);if(!out[id]||when>out[id]._when){out[id]=r;out[id]._when=when;}});return out;
}
function recommendation(analysis){
 var a=analysis&&analysis.analysis||{};var r=a&&a.recommendation||{};
 return String(r&&r.label||'').trim();
}
function taskNext(t){return String(t&&t.title||'').trim();}
function deriveProjects(data){
 var emailMap=latestByProject(data.projectEmails,'sent_at'),taskMap=latestTask(data.tasks),analysisMap=latestAnalysis(data.analyses);
 return arr(data.projects).filter(function(p){return !inactiveProject(p);}).map(function(p){
   var id=String(p.id||''),e=emailMap[id],t=taskMap[id],a=analysisMap[id];
   var activity=Math.max(ms(p.created_at),e&&e._when||0,t&&t._when||0,a&&a._when||0);
   var next=one(recommendation(a),taskNext(t),stageName(p.pipeline_stage));
   return{row:p,activity:activity,next:next,email:e,task:t,analysis:a};
 }).sort(function(a,b){return b.activity-a.activity;});
}
function taskScore(t){
 if(norm(t&&t.source)==='email_request_auto')return 10000+ms(t.created_at)/1e13;
 var d=relDays(t&&t.due_date);if(d===null)return 0;
 if(d<0)return 700+Math.min(120,Math.abs(d));
 if(d===0)return 680;
 if(d<=3)return 640-d;
 return 0;
}
function taskMeta(t){
 var d=relDays(t&&t.due_date),bits=[];
 if(norm(t&&t.source)==='email_request_auto')bits.push('Kerkese e re e klientit');
 else if(d<0)bits.push(Math.abs(d)+' dite vone');else if(d===0)bits.push('Afati sot');else if(d!==null)bits.push('Afati pas '+d+' ditesh');
 if(t&&t.detail)bits.push(String(t.detail));return bits.join(' · ');
}
function buildActions(data){
 var projectMap={};arr(data.projects).forEach(function(p){projectMap[String(p.id||'')]=p;});
 var items=[];
 arr(data.tasks).forEach(function(t){
   if(t.project_id&&inactiveProject(projectMap[String(t.project_id)]))return;
   var score=taskScore(t);if(!score)return;
   var clientRequest=norm(t.source)==='email_request_auto';
   var key=actionStateKey(t);if(['completed','dismissed'].indexOf(String(data.states[key]||''))>-1)return;
   items.push({key:key,score:score,title:t.title||'Detyre',meta:taskMeta(t),tag:clientRequest?'Vepro tani':(relDays(t.due_date)<0?'Vonuar':'Detyre'),kind:'task',id:t.id,project_id:t.project_id||'',source:t.source||'',source_ref:t.source_ref||''});
 });
 arr(data.rfqs).forEach(function(r){
   var st=norm(r.status);if(['replied','won','lost','planned'].indexOf(st)>-1)return;
   var last=safeDate(r.last_followup_at||r.sent_at);if(!last)return;var age=Math.floor((Date.now()-last.getTime())/86400000);if(age<5)return;
   var key='rfq_'+String(r.id||hash((r.supplier_email||'')+(r.sent_at||'')));if(['completed','dismissed'].indexOf(String(data.states[key]||''))>-1)return;
   items.push({key:key,score:500+Math.min(age,90),title:'Ndjekje: '+(r.supplier_name||r.supplier_email||'Furnitor'),meta:(r.project_name||'Pa projekt')+' · '+age+' dite pa pergjigje',tag:'RFQ',kind:'rfq',id:r.id,project_id:r.project_id||''});
 });
 return items.sort(function(a,b){return b.score-a.score;});
}
async function loadData(){
 if(typeof window.supaFetch!=='function')return{projects:[],tasks:[],projectEmails:[],analyses:[],rfqs:[],states:{}};
 var rows=await Promise.all([
   q('projects?select=id,created_at,name,client,ref,location,deadline,notes,status,pipeline_stage,deal_type,business_ref,business_type&limit=3000'),
   q('tasks?status=eq.hapur&select=id,created_at,project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref&order=created_at.desc&limit=5000'),
   q('project_emails?select=id,project_id,subject,sent_at,direction,gmail_url&order=sent_at.desc&limit=5000'),
   q('project_analyses?status=eq.complete&select=id,project_id,analysis,created_at&order=created_at.desc&limit=3000'),
   q('rfq_log?select=id,project_id,project_name,supplier_name,supplier_email,status,sent_at,last_followup_at&order=sent_at.desc&limit=3000'),
   q('dashboard_action_states?select=action_key,state&limit=5000')
 ]);
 var states={};arr(rows[5]).forEach(function(s){states[String(s.action_key||'')]=s.state;});
 return{projects:rows[0],tasks:rows[1],projectEmails:rows[2],analyses:rows[3],rfqs:rows[4],states:states};
}
function actionHtml(a){
 var tag=a.tag||'Detyre';
 return'<div class="pst-ws-action pst-canonical-action" data-ws-action="'+esc(a.key)+'" data-kind="'+esc(a.kind)+'" data-id="'+esc(a.id||'')+'" data-project-id="'+esc(a.project_id||'')+'">'+
 '<div class="pst-ws-action-main"><div class="pst-ws-action-title">'+esc(a.title)+'</div><div class="pst-ws-action-meta" title="'+esc(a.meta)+'">'+esc(a.meta)+'</div></div>'+
 '<div class="pst-ws-action-side"><span class="pst-ws-action-tag">'+esc(tag)+'</span><div class="pst-ws-action-controls"><button type="button" class="pst-ws-action-open">Hap</button><button type="button" class="pst-ws-action-done">Kryer</button><button type="button" class="pst-ws-action-dismiss" title="Hiqe">•••</button></div></div></div>';
}
function projectHtml(x){var p=x.row||{};return'<div class="pst-ws-projectcard pst-canonical-project" data-project-id="'+esc(p.id)+'"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emer')+'</div><div class="pst-ws-projectcard-client">'+esc((p.client||'Pa klient')+(p.ref?' · '+p.ref:''))+'</div></div><span class="pst-ws-status">'+esc(statusLabel(p.status))+'</span></div><div class="pst-ws-projectcard-next"><b>Hapi i radhes:</b> '+esc(x.next||stageName(p.pipeline_stage))+'</div></div>';}
function emptyActions(){return'<div class="pst-ws-empty"><b>Nuk ka prioritete qe kerkojne veprim.</b><span>Detyrat dhe kerkesat e reja do te shfaqen ketu.</span></div>';}
function emptyProjects(){return'<div class="pst-ws-empty"><b>Nuk u gjeten projekte aktive.</b><span>Kontrollo regjistrin e projekteve.</span></div>';}
function bindActions(host){
 host.querySelectorAll('.pst-canonical-action').forEach(function(row){
   var key=row.getAttribute('data-ws-action'),id=row.getAttribute('data-id'),pid=row.getAttribute('data-project-id'),kind=row.getAttribute('data-kind');
   var open=row.querySelector('.pst-ws-action-open');if(open)open.onclick=function(e){e.stopPropagation();if(pid&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(pid);else if(kind==='task'&&typeof window.pstWorkspaceGo==='function')window.pstWorkspaceGo('tasks');};
   var done=row.querySelector('.pst-ws-action-done');if(done)done.onclick=function(e){e.stopPropagation();window.pstWsActionState(key,'completed');};
   var dismiss=row.querySelector('.pst-ws-action-dismiss');if(dismiss)dismiss.onclick=function(e){e.stopPropagation();window.pstWsActionState(key,'dismissed');};
 });
}
function bindProjects(host){host.querySelectorAll('.pst-canonical-project').forEach(function(row){row.onclick=function(){var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});}
function activateHome(){
 document.querySelectorAll('.page').forEach(function(p){if(p.id!=='page-workspace-home'){p.classList.remove('active');p.style.display='none';}});
 var page=document.getElementById('page-workspace-home');if(page){page.style.display='block';page.classList.add('active');}
 document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='home');});
 return page;
}
function decorate(){
 try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}
 try{if(window.PSTDashboardTaskCardsV1&&typeof window.PSTDashboardTaskCardsV1.decorate==='function')window.PSTDashboardTaskCardsV1.decorate();}catch(e){}
 try{if(window.PSTTaskSourceActionsV1&&typeof window.PSTTaskSourceActionsV1.decorate==='function')window.PSTTaskSourceActionsV1.decorate();}catch(e){}
 try{if(window.PSTRedesignFinalizerV1&&typeof window.PSTRedesignFinalizerV1.apply==='function')window.PSTRedesignFinalizerV1.apply();}catch(e){}
}
async function render(force){
 if(cache.rendering&&!force)return cache.rendering;
 cache.rendering=(async function(){
   var page=document.getElementById('page-workspace-home');
   var actionsHost=document.getElementById('pst-ws-home-actions'),projectsHost=document.getElementById('pst-ws-home-projects');
   if(!page||!actionsHost||!projectsHost)return false;
   var data=await loadData();var derived=deriveProjects(data),actions=buildActions(data);
   cache.lastData=data;cache.actions=actions;cache.projects=derived;cache.actionStates=data.states;
   actionsHost.innerHTML=actions.length?actions.slice(0,12).map(actionHtml).join(''):emptyActions();
   projectsHost.innerHTML=derived.length?derived.slice(0,12).map(projectHtml).join(''):emptyProjects();
   bindActions(actionsHost);bindProjects(projectsHost);
   var hb=document.getElementById('pst-ws-b-home');if(hb){hb.textContent=String(actions.length);hb.style.display=actions.length?'inline-flex':'none';}
   var pb=document.getElementById('pst-ws-b-projects');if(pb){pb.textContent=String(derived.length);pb.style.display=derived.length?'inline-flex':'none';}
   page.dataset.pstHomeOwner='canonical-v1';
   page.dataset.pstHomeRenderedAt=new Date().toISOString();
   decorate();
   try{document.dispatchEvent(new CustomEvent('pst:home-canonical-rendered',{detail:{actions:actions.length,projects:derived.length}}));}catch(e){}
   return true;
 })().catch(function(e){console.error('PPPP canonical Home render failed',e);return false;}).finally(function(){cache.rendering=null;});
 return cache.rendering;
}
window.pstWsActionState=async function(key,state){
 var item=cache.actions.filter(function(a){return a.key===key;})[0];if(!item)return false;
 var payload={action_key:key,state:state,action_type:item.tag,title:item.title,meta:item.meta,source_ref:item.source_ref||item.project_id||'',updated_at:new Date().toISOString()};
 try{await db('dashboard_action_states','POST',payload);}catch(e){try{await db('dashboard_action_states?action_key=eq.'+enc(key),'PATCH',payload);}catch(e2){toast('Veprimi nuk u ruajt: '+(e2.message||e2),true);return false;}}
 cache.actionStates[key]=state;var row=document.querySelector('[data-ws-action="'+key.replace(/"/g,'')+'"]');if(row)row.remove();toast(state==='completed'?'Veprimi u shenua si i kryer.':'Veprimi u hoq nga lista.');return true;
};
function go(key){
 key=String(key||'home').toLowerCase();
 if(key==='home'){activateHome();render(true);return true;}
 return legacyGo?legacyGo.apply(window,arguments):false;
}
window.pstWorkspaceGo=go;
window.pstWsRefreshHome=function(e){if(e&&e.preventDefault)e.preventDefault();return render(true);};
window.PSTHomeCanonicalV1={render:render,refresh:function(){return render(true);},activateHome:activateHome,_test:{inactiveProject:inactiveProject,relDays:relDays,actionStateKey:actionStateKey,taskScore:taskScore,deriveProjects:deriveProjects,buildActions:buildActions,recommendation:recommendation},snapshot:function(){return{actions:cache.actions.slice(),projects:cache.projects.slice()};}};

/* Home shell is already created by Workspace Architecture at this point. */
setTimeout(function(){render(true);},0);
document.addEventListener('pst:modules-ready',function(){render(true);},{once:true});
window.addEventListener('pageshow',function(){if(document.getElementById('page-workspace-home'))render(true);},{once:true});
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&document.getElementById('page-workspace-home')&&document.getElementById('page-workspace-home').classList.contains('active'))render(false);});
})();
