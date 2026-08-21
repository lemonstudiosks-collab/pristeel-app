/* PRISTEEL Home Canonical v3
 * Sole data/state owner for Workspace Home.
 * A project is rendered in exactly one Home lane: action, waiting, or work.
 * Home is read-only for business state; outbound/commercial decisions remain human-gated.
 */
(function(){
'use strict';
if(window.__pstHomeCanonicalV1)return;
window.__pstHomeCanonicalV1=true;

window.__pstHomeLiveFixV1=true;
window.__pstHomeStabilityV2=true;
window.__pstHomeProjectRecoveryV3=true;
window.__pstHomeOperationalPriorityV1=true;

var legacyGo=typeof window.pstWorkspaceGo==='function'?window.pstWorkspaceGo:null;
var cache={rendering:null,actions:[],projects:[],waiting:[],contexts:{},actionStates:{},lastData:null,lastRenderAt:0};

function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function ms(v){var d=safeDate(v);return d?d.getTime():0;}
function localDay(v){var d=safeDate(v);if(!d)return null;d.setHours(0,0,0,0);return d;}
function relDays(v){var d=localDay(v);if(!d)return null;var n=new Date();n.setHours(0,0,0,0);return Math.round((d-n)/86400000);}
function dateText(v){var d=safeDate(v);return d?d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'}):'—';}
function hash(s){s=String(s||'');var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return(h>>>0).toString(36);}
function norm(v){return String(v||'').trim().toLowerCase();}
function flat(v){return norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function one(){for(var i=0;i<arguments.length;i++)if(arguments[i])return arguments[i];return'';}
function money(v){var n=parseFloat(v);return isFinite(n)?n.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' EUR':'';}
function short(v,n){v=String(v||'').replace(/\s+/g,' ').trim();return v.length>(n||220)?v.slice(0,(n||220)-1)+'…':v;}
async function q(path){try{return arr(await window.supaFetch(path));}catch(e){console.warn('PPPP canonical Home query failed:',path,e);return[];}}
async function db(path,method,body){if(typeof window.supaFetch!=='function')throw new Error('Databaza nuk është gati.');return window.supaFetch(path,method,body);}
function toast(text,error){try{var old=document.getElementById('pst-ws-toast');if(old)old.remove();var e=document.createElement('div');e.id='pst-ws-toast';e.className=error?'error':'';e.textContent=text;document.body.appendChild(e);setTimeout(function(){if(e.parentNode)e.remove();},4200);}catch(x){}}

function inactiveProject(p){var s=norm(p&&p.status);return ['mbyllur','humbur','arkivuar','closedlost','cancelled','canceled','realizuar','archived','lost'].indexOf(s)>-1;}
function operationalState(p){return norm(p&&p.operational_state);}
function explicitWaiting(p){return operationalState(p)==='wait_for_client';}
function explicitExecution(p){return operationalState(p)==='execution';}
function explicitWork(p){var s=operationalState(p);return s==='active_work'||s==='work_in_progress';}
function blocksHomeAction(p){return explicitWaiting(p)||explicitExecution(p)||explicitWork(p);}
function stageName(id){return({rfq_in:'Kërkesa e klientit',technical_review:'Verifikimi teknik',supplier_selection:'Zgjedhja e prodhuesit',pricing:'Përcaktimi i çmimit',client_offer:'Oferta & konfirmimi',commercial:'Përpunimi komercial',production_control:'Koordinimi i prodhimit',factory_audit:'Auditimi i uzinës',transport:'Transporti & dërgesa'})[String(id||'')]||'Në punë';}
function statusLabel(p){if(explicitExecution(p))return'Në ekzekutim';if(explicitWork(p))return'Në punë';var s=norm(p&&p.status);if(s==='fituar'||s==='closedwon')return'Fituar';if(s==='aktiv'||s==='ne pune'||s==='në punë')return'Aktiv';if(s==='ofertim'||s==='oferte'||s==='ofertë')return'Ofertim';if(!s||s==='pritje')return'Pritje';return String(p&&p.status||'Pritje');}
function actionStateKey(t){if(norm(t&&t.source)==='email_request_auto'&&t.source_ref)return'op_email_'+String(t.source_ref);return'ws_'+hash([t&&t.id,t&&t.title,t&&t.project_id,t&&t.source_ref].join('|'));}
function derivedKey(kind,pid,ref){return'derived_'+kind+'_'+hash([pid,ref||''].join('|'));}
function grouped(rows){var out={};arr(rows).forEach(function(r){var id=String(r&&r.project_id||'');if(!id)return;(out[id]||(out[id]=[])).push(r);});return out;}
function latest(rows,field){var best=null,bm=0;arr(rows).forEach(function(r){var x=ms(r&&r[field]);if(x>bm){best=r;bm=x;}});if(best)best._when=bm;return best;}
function latestAnalysis(rows){return latest(rows,'created_at');}
function recommendation(analysis){var a=analysis&&analysis.analysis||{};var r=a&&a.recommendation||{};return String(r&&r.label||'').trim();}
function isOutgoing(e){return norm(e&&e.direction)==='outgoing';}
function isIncoming(e){return norm(e&&e.direction)==='incoming';}
function docNr(d){return String(d&&d.doc_nr||'').trim();}
function offerState(d){var x=d&&d.offer_state;return x&&typeof x==='object'?x:{};}
function sentTimeForOffer(ctx,d){
 if(!d)return 0;var nr=flat(docNr(d)),best=0;
 arr(ctx.emails).forEach(function(e){if(!isOutgoing(e))return;var tx=flat((e.subject||'')+' '+(e.snippet||''));if(nr&&tx.indexOf(nr)>-1)best=Math.max(best,ms(e.sent_at));});
 var st=offerState(d).pst_sent_at;if(st)best=Math.max(best,ms(st));
 return best||0;
}
function knownSupplierMap(ctx){var m={};arr(ctx.rfqs).forEach(function(r){var em=norm(r.supplier_email);if(em)m[em]=r.supplier_name||r.supplier_email||'Furnitor';});return m;}
function latestSupplierReply(ctx){
 var sm=knownSupplierMap(ctx),best=null,bm=0;
 arr(ctx.emails).forEach(function(e){if(!isIncoming(e))return;var em=norm(e.from_email);if(!sm[em])return;var when=ms(e.sent_at);if(when>bm){best=e;bm=when;best._supplier=sm[em];}});
 if(best)best._when=bm;return best;
}
function latestClientIncoming(ctx){
 var sm=knownSupplierMap(ctx),best=null,bm=0;
 arr(ctx.emails).forEach(function(e){if(!isIncoming(e))return;if(sm[norm(e.from_email)])return;var when=ms(e.sent_at);if(when>bm){best=e;bm=when;}});
 if(best)best._when=bm;return best;
}
function latestOurOffer(ctx){return latest(ctx.ourOffers,'created_at');}
function latestSupplierOffer(ctx){return latest(ctx.supplierOffers,'created_at');}
function latestOpenTask(ctx){return latest(ctx.tasks,'created_at');}
function latestRelevantEmail(ctx){return latest(ctx.emails,'sent_at');}
function isOfferRelatedTask(t){var x=flat((t&&t.title||'')+' '+(t&&t.detail||''));return /(plan dinamik|dinamik|ponud|ofert|montaz|plastifik|cij|cmim|price|rok realiz|rekapitul)/.test(x);}
function taskIsSuperseded(ctx,t){
 if(norm(t&&t.source)!=='email_request_auto'||!isOfferRelatedTask(t))return false;
 var o=latestOurOffer(ctx);if(!o)return false;var sent=sentTimeForOffer(ctx,o);return sent>ms(t.created_at);
}
function supplierQuoteReady(ctx){
 var reply=latestSupplierReply(ctx);if(!reply)return null;
 var rfqMatch=arr(ctx.rfqs).filter(function(r){return norm(r.supplier_email)===norm(reply.from_email)&&ms(r.sent_at)<=ms(reply.sent_at);}).sort(function(a,b){return ms(b.sent_at)-ms(a.sent_at);})[0];
 if(!rfqMatch)return null;
 var body=flat((reply.subject||'')+' '+(reply.snippet||'')),rfqState=norm(rfqMatch.status);
 var quoteSignal=rfqState==='replied'||/(bashkangjitur.{0,80}ofert|attached.{0,80}(offer|quote)|u prilogu.{0,80}ponud|saljem.{0,80}ponud|nis ofert|ofertene|ponudu)/.test(body);
 if(!quoteSignal)return null;
 var our=latestOurOffer(ctx);if(our&&ms(our.created_at)>ms(reply.sent_at))return null;
 return{email:reply,rfq:rfqMatch,supplier:reply._supplier||rfqMatch.supplier_name||'Furnitori',when:ms(reply.sent_at)};
}
function clientReplyAfterOffer(ctx){
 var o=latestOurOffer(ctx);if(!o)return null;var sent=sentTimeForOffer(ctx,o);if(!sent)return null;
 var e=latestClientIncoming(ctx);if(e&&ms(e.sent_at)>sent)return{email:e,offer:o,sent:sent};return null;
}
function waitingAfterOffer(ctx){
 var o=latestOurOffer(ctx);if(!o)return null;var sent=sentTimeForOffer(ctx,o);if(!sent)return null;
 var client=latestClientIncoming(ctx);if(client&&ms(client.sent_at)>sent)return null;
 return{offer:o,sent:sent};
}
function stateRecord(data,key){var r=data.states[key];if(!r)return null;if(typeof r==='string')return{state:r};return r;}
function hiddenByState(data,key){var r=stateRecord(data,key);if(!r)return false;if(r.state==='completed'||r.state==='dismissed')return true;if(r.state==='snoozed'){var until=ms(r.snooze_until);if(until>Date.now())return true;}return false;}
function buildContexts(data){
 var by={projects:{},emails:grouped(data.projectEmails),tasks:grouped(data.tasks),analyses:grouped(data.analyses),rfqs:grouped(data.rfqs),supplierOffers:grouped(data.supplierOffers),ourOffers:grouped(data.ourOffers),attachments:grouped(data.attachments)};
 arr(data.projects).forEach(function(p){by.projects[String(p.id||'')]=p;});
 var out={};Object.keys(by.projects).forEach(function(id){out[id]={project:by.projects[id],emails:by.emails[id]||[],tasks:by.tasks[id]||[],analyses:by.analyses[id]||[],rfqs:by.rfqs[id]||[],supplierOffers:by.supplierOffers[id]||[],ourOffers:by.ourOffers[id]||[],attachments:by.attachments[id]||[]};});
 return out;
}
function currentState(ctx){
 if(!ctx)return'Në punë';var p=ctx.project||{};
 if(explicitWaiting(p))return'Në pritje të palës tjetër';
 if(explicitExecution(p))return'Në ekzekutim';
 if(explicitWork(p))return stageName(p.pipeline_stage);
 if(clientReplyAfterOffer(ctx))return'Përgjigje e re nga klienti';
 if(waitingAfterOffer(ctx))return'Në pritje të përgjigjes së klientit';
 if(supplierQuoteReady(ctx))return'Oferta e furnitorit është marrë';
 if(relDays(p.deadline)!==null&&relDays(p.deadline)<=3&&norm(p.pipeline_stage)==='technical_review')return'Sqarime teknike para ofertës';
 return stageName(p.pipeline_stage);
}
function taskScore(t){var d=relDays(t&&t.due_date);if(norm(t&&t.source)==='email_request_auto')return 780;if(d===null)return 0;if(d<0)return 700+Math.min(120,Math.abs(d));if(d===0)return 690;if(d<=3)return 650-d;return 0;}
function taskWhy(t){var d=relDays(t&&t.due_date),bits=[];if(norm(t&&t.source)==='email_request_auto')bits.push('Kërkesë e hapur që ende kërkon vendim ose përgjigje');else if(d<0)bits.push(Math.abs(d)+' ditë vonë');else if(d===0)bits.push('Afati është sot');else if(d!==null)bits.push('Afati është pas '+d+' ditësh');if(t&&t.detail)bits.push(short(t.detail,190));return bits.join(' · ');}
function specificTaskTitle(ctx,t){
 var p=flat(ctx&&ctx.project&&ctx.project.name),x=flat((t&&t.title||'')+' '+(t&&t.detail||''));
 if(/tennet|spie/.test(p)&&/(galvan|en 1090|weld|ndt|bolt|toler|technical|teknik|iso)/.test(x))return'Finalizo çështjet teknike për ofertën TenneT / SPIE';
 if(/plan dinamik/.test(x))return'Aprovo planin dinamik';
 return String(t&&t.title||'Veprim i projektit').replace(/^Kërkesë e klientit\s*[—-]\s*/i,'Përpuno kërkesën: ');
}
function actionSourceEmail(ctx,a){if(a&&a.email)return a.email;return latestRelevantEmail(ctx)||null;}
function buildActions(data,contexts){
 var candidates=[];
 Object.keys(contexts).forEach(function(pid){
  var ctx=contexts[pid],p=ctx.project;if(!p||inactiveProject(p)||blocksHomeAction(p))return;
  var reply=clientReplyAfterOffer(ctx);
  if(reply){var k1=derivedKey('client_reply',pid,reply.email.id||reply.email.sent_at);if(!hiddenByState(data,k1))candidates.push({key:k1,score:1000,title:'Shqyrto përgjigjen e klientit',why:'Klienti ka dërguar përgjigje pasi u dërgua oferta jonë. Projekti kërkon vendim të ri.',meta:(p.name||'Projekt')+' · '+short(reply.email.subject||'Email i ri',110),tag:'VEPRIM',kind:'client_reply',project_id:pid,email:reply.email,route:'communication',manual:false});}
  var sq=supplierQuoteReady(ctx);
  if(sq){var k2=derivedKey('supplier_quote',pid,sq.email.id||sq.when);if(!hiddenByState(data,k2))candidates.push({key:k2,score:950,title:'Përgatit ofertën PRISTEEL',why:sq.supplier+' ka kthyer ofertë/përgjigje të furnitorit. Tani kemi bazë për të vazhduar ofertimin ndaj klientit.',meta:(p.name||'Projekt')+' · '+sq.supplier+' · '+dateText(sq.email.sent_at),tag:'VEPRO TANI',kind:'supplier_quote',project_id:pid,email:sq.email,route:'commercial',manual:false});}
  var dd=relDays(p.deadline);
  if(dd!==null&&dd<=3&&dd>=-2&&norm(p.pipeline_stage)==='technical_review'){
   var kt=derivedKey('deadline_technical',pid,p.deadline);if(!hiddenByState(data,kt))candidates.push({key:kt,score:dd<0?990:930-dd,title:'Finalizo çështjet teknike para ofertës',why:'Afati i ofertës është '+dateText(p.deadline)+' dhe projekti ka ende sqarime teknike të hapura.',meta:(p.name||'Projekt')+' · afati '+dateText(p.deadline),tag:dd<0?'VONUAR':'AFAT',kind:'deadline_technical',project_id:pid,email:latestRelevantEmail(ctx),route:'communication',manual:false});
  }
  arr(ctx.tasks).forEach(function(t){if(taskIsSuperseded(ctx,t))return;var score=taskScore(t);if(!score)return;var key=actionStateKey(t);if(hiddenByState(data,key))return;candidates.push({key:key,score:score,title:specificTaskTitle(ctx,t),why:taskWhy(t),meta:(p.name||'Projekt')+' · '+taskWhy(t),tag:relDays(t.due_date)<0?'VONUAR':(norm(t.source)==='email_request_auto'?'VEPRIM':'DETYRË'),kind:'task',id:t.id,project_id:pid,source:t.source||'',source_ref:t.source_ref||'',email:latestRelevantEmail(ctx),route:norm(t.source)==='email_request_auto'?'communication':'project',manual:norm(t.source)!=='email_request_auto'});});
 });
 arr(data.rfqs).forEach(function(r){
  var pid=String(r.project_id||''),ctx=contexts[pid],p=ctx&&ctx.project;if(!p||inactiveProject(p)||blocksHomeAction(p))return;var st=norm(r.status);if(['replied','won','lost','planned'].indexOf(st)>-1)return;
  var last=safeDate(r.last_followup_at||r.sent_at);if(!last)return;var age=Math.floor((Date.now()-last.getTime())/86400000);if(age<5)return;if(pid&&candidates.some(function(x){return x.project_id===pid&&x.score>600;}))return;
  var key='rfq_'+String(r.id||hash((r.supplier_email||'')+(r.sent_at||'')));if(hiddenByState(data,key))return;candidates.push({key:key,score:600+Math.min(age,90),title:'Ndiq furnitorin: '+(r.supplier_name||r.supplier_email||'Furnitor'),why:'RFQ është dërguar dhe nuk ka përgjigje prej '+age+' ditësh.',meta:(r.project_name||'Pa projekt')+' · '+age+' ditë pa përgjigje',tag:'FOLLOW-UP',kind:'rfq',id:r.id,project_id:pid,route:'procurement',manual:false});
 });
 candidates.sort(function(a,b){return b.score-a.score;});var used={},out=[];candidates.forEach(function(a){var k=a.project_id||a.key;if(used[k])return;used[k]=1;out.push(a);});return out.slice(0,5);
}
function waitingDetail(ctx){var p=ctx.project||{},w=waitingAfterOffer(ctx);if(w){var nr=docNr(w.offer)||'Oferta jonë';var dl=p.deadline?(' · afati i projektit '+dateText(p.deadline)):'';return nr+' · dërguar '+dateText(w.sent)+dl;}var at=p.operational_state_at?dateText(p.operational_state_at):'';return at?'Gjendja operative e konfirmuar më '+at:'Gjendja operative e konfirmuar';}
function buildWaiting(contexts){
 var out=[];Object.keys(contexts).forEach(function(pid){var ctx=contexts[pid],p=ctx.project;if(!p||inactiveProject(p)||!explicitWaiting(p))return;out.push({project_id:pid,name:p.name||'Projekt',client:p.client||'palës tjetër',text:waitingDetail(ctx),activity:Math.max(ms(p.operational_state_at),ms(p.last_activity_at),ms(p.updated_at)),kind:'client'});});
 return out.sort(function(a,b){return b.activity-a.activity;});
}
function nextForProject(ctx,actions){
 if(!ctx)return'Në punë';var p=ctx.project||{},pid=String(p.id||'');
 if(explicitExecution(p))return'Projekt në ekzekutim · prodhimi, dokumentacioni dhe dërgesa';
 if(explicitWork(p))return stageName(p.pipeline_stage);
 if(explicitWaiting(p))return'Në pritje të palës tjetër';
 var a=arr(actions).filter(function(x){return x.project_id===pid;})[0];if(a)return a.title;
 var w=waitingAfterOffer(ctx);if(w)return'Në pritje të përgjigjes së klientit';var sq=supplierQuoteReady(ctx);if(sq)return'Përgatit ofertën PRISTEEL';var t=latestOpenTask(ctx);if(t&&!taskIsSuperseded(ctx,t))return specificTaskTitle(ctx,t);var an=latestAnalysis(ctx.analyses);return one(recommendation(an),stageName(p.pipeline_stage));
}
function deriveProjects(data,contexts,actions,waiting){
 var occupied={};arr(actions).forEach(function(a){if(a.project_id)occupied[String(a.project_id)]=1;});arr(waiting).forEach(function(w){if(w.project_id)occupied[String(w.project_id)]=1;});
 return arr(data.projects).filter(function(p){var id=String(p.id||'');return !inactiveProject(p)&&!occupied[id];}).map(function(p){var id=String(p.id||''),ctx=contexts[id]||{project:p,emails:[],tasks:[],analyses:[],rfqs:[],supplierOffers:[],ourOffers:[],attachments:[]};var e=latest(ctx.emails,'sent_at'),t=latest(ctx.tasks,'created_at'),an=latest(ctx.analyses,'created_at'),so=latest(ctx.supplierOffers,'created_at'),oo=latest(ctx.ourOffers,'created_at');var activity=Math.max(ms(p.created_at),ms(p.last_activity_at),ms(p.operational_state_at),e&&e._when||0,t&&t._when||0,an&&an._when||0,so&&so._when||0,oo&&oo._when||0);return{row:p,activity:activity,next:nextForProject(ctx,actions),context:ctx};}).sort(function(a,b){return b.activity-a.activity;});
}
async function loadData(){
 if(typeof window.supaFetch!=='function')return{projects:[],tasks:[],projectEmails:[],analyses:[],rfqs:[],supplierOffers:[],ourOffers:[],attachments:[],states:{}};
 var rows=await Promise.all([
  q('projects?select=id,created_at,updated_at,name,client,ref,location,deadline,notes,status,pipeline_stage,deal_type,business_ref,business_type,last_activity_at,last_email_at,operational_state,operational_state_at,operational_state_source&limit=3000'),
  q('tasks?status=eq.hapur&select=id,created_at,project_id,title,detail,due_date,priority,status,source,contact_email,category,source_ref&order=created_at.desc&limit=5000'),
  q('project_emails?select=id,project_id,subject,snippet,sent_at,direction,gmail_url,from_email,from_name,to_emails,has_attachments&order=sent_at.desc&limit=6000'),
  q('project_analyses?status=eq.complete&select=id,project_id,analysis,created_at&order=created_at.desc&limit=3000'),
  q('rfq_log?select=id,project_id,project_name,supplier_name,supplier_email,status,sent_at,last_followup_at,replied_at,offer_id,subject&order=sent_at.desc&limit=3000'),
  q('offers?select=id,project_id,created_at,supplier,total_eur,currency,offer_ref,notes,raw_text&order=created_at.desc&limit=4000'),
  q('documents_registry?select=id,project_id,created_at,doc_nr,client,total_eur,total_amount,currency,offer_state,followup_status,last_followup_at&order=created_at.desc&limit=4000'),
  q('project_attachment_links?select=id,project_id,attachment_name,analysis_status,created_at&order=created_at.desc&limit=5000'),
  q('dashboard_action_states?select=action_key,state,snooze_until,updated_at&limit=5000')
 ]);
 var states={};arr(rows[8]).forEach(function(s){states[String(s.action_key||'')]=s;});return{projects:rows[0],tasks:rows[1],projectEmails:rows[2],analyses:rows[3],rfqs:rows[4],supplierOffers:rows[5],ourOffers:rows[6],attachments:rows[7],states:states};
}
function actionHtml(a){var manual=a.manual===true;return'<div class="pst-ws-action pst-canonical-action" tabindex="0" role="button" data-ws-action="'+esc(a.key)+'" data-kind="'+esc(a.kind)+'" data-id="'+esc(a.id||'')+'" data-project-id="'+esc(a.project_id||'')+'"><div class="pst-ws-action-main"><div class="pst-ws-action-title">'+esc(a.title)+'</div><div class="pst-ws-action-meta" title="'+esc(a.why||a.meta)+'"><b>Pse tani:</b> '+esc(a.why||a.meta)+'</div></div><div class="pst-ws-action-side"><span class="pst-ws-action-tag">'+esc(a.tag||'VEPRIM')+'</span><div class="pst-ws-action-controls"><button type="button" class="pst-ws-action-open">Vepro</button><button type="button" class="pst-ws-action-snooze">Shtyje</button>'+(manual?'<button type="button" class="pst-ws-action-done">Kryer</button>':'')+'<button type="button" class="pst-ws-action-dismiss" title="Mos ma sugjero më">•••</button></div></div></div>';}
function projectHtml(x){var p=x.row||{};return'<div class="pst-ws-projectcard pst-canonical-project" data-project-id="'+esc(p.id)+'"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(p.name||'Pa emër')+'</div><div class="pst-ws-projectcard-client">'+esc((p.client||'Pa klient')+(p.ref?' · '+p.ref:''))+'</div></div><span class="pst-ws-status">'+esc(statusLabel(p))+'</span></div><div class="pst-ws-projectcard-next"><b>Hapi i radhës:</b> '+esc(x.next||stageName(p.pipeline_stage))+'</div></div>';}
function emptyActions(){return'<div class="pst-ws-empty"><b>Nuk ka veprime që kërkojnë vëmendjen tënde tani.</b><span>PPPP do t’i ngrejë këtu vetëm kur ka një veprim konkret.</span></div>';}
function emptyProjects(){return'<div class="pst-ws-empty"><b>Nuk u gjetën projekte në punë.</b><span>Projektet në pritje dhe ato që kërkojnë veprim shfaqen në seksionet e tyre.</span></div>';}
function waitingHtml(items){if(!items.length)return'';return'<section id="pst-home-waiting"><div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër; nuk kërkohet veprim tani.</span></div></div><div class="pst-home-wait-list">'+items.map(function(w){return'<button type="button" class="pst-home-wait-item" data-project-id="'+esc(w.project_id)+'"><span class="pst-home-wait-dot"></span><span class="pst-home-wait-copy"><b>'+esc(w.name)+'</b><small>Në pritje të '+esc(w.client)+' · '+esc(w.text)+'</small></span><span class="pst-home-wait-arrow">›</span></button>';}).join('')+'</div></section>';}
function ensureWaitingSection(actionsHost,items){var old=document.getElementById('pst-home-waiting');if(old)old.remove();if(!items.length)return;var owner=actionsHost.closest('.pst-ws-card')||actionsHost.parentElement;if(owner)owner.insertAdjacentHTML('afterend',waitingHtml(items));else actionsHost.insertAdjacentHTML('afterend',waitingHtml(items));document.querySelectorAll('#pst-home-waiting .pst-home-wait-item').forEach(function(b){b.onclick=function(){openProjectBriefByProject(b.getAttribute('data-project-id'),'waiting');};});}
function latestEvents(ctx){var ev=[];arr(ctx.emails).forEach(function(e){ev.push({t:ms(e.sent_at),kind:isOutgoing(e)?'Email dërguar':'Email marrë',title:e.subject||'(pa subjekt)',detail:(isOutgoing(e)?'Dërguar':'Nga '+(e.from_name||e.from_email||'kontakt'))+(e.has_attachments?' · me attachment':'')});});arr(ctx.supplierOffers).forEach(function(o){ev.push({t:ms(o.created_at),kind:'Ofertë furnitori',title:o.supplier||'Furnitor',detail:[money(o.total_eur),o.offer_ref].filter(Boolean).join(' · ')});});arr(ctx.ourOffers).forEach(function(o){ev.push({t:ms(o.created_at),kind:'Oferta jonë',title:o.doc_nr||'Ofertë PRISTEEL',detail:money(o.total_eur||o.total_amount)});});return ev.filter(function(x){return x.t;}).sort(function(a,b){return b.t-a.t;}).slice(0,5);}
function briefHave(ctx){var a=[];if(ctx.project&&ctx.project.client)a.push('Klienti: '+ctx.project.client);if(ctx.attachments.length)a.push(ctx.attachments.length+' skedarë/attachment të lidhur');var so=latestSupplierOffer(ctx),sr=latestSupplierReply(ctx),oo=latestOurOffer(ctx);if(so)a.push('Ofertë furnitori: '+(so.supplier||'Furnitor')+(so.total_eur?' · '+money(so.total_eur):''));else if(sr)a.push('Përgjigje/ofertë furnitori nga '+(sr._supplier||sr.from_name||sr.from_email));if(oo)a.push('Oferta jonë: '+(oo.doc_nr||'e ruajtur')+(oo.total_eur?' · '+money(oo.total_eur):''));return a;}
function briefMissing(ctx){var a=[],p=ctx.project||{};if(explicitWaiting(p))a.push('Përgjigjja ose konfirmimi i palës tjetër');else if(explicitExecution(p))a.push('Hapi i radhës i ekzekutimit sipas planit të projektit');else if(!explicitWork(p)){var sq=supplierQuoteReady(ctx),w=waitingAfterOffer(ctx);if(sq)a.push('Oferta PRISTEEL për klientin');if(w)a.push('Përgjigjja ose konfirmimi i klientit');if(norm(p.pipeline_stage)==='technical_review')a.push('Mbyllja e sqarimeve teknike para ofertës');}if(!a.length){var t=latestOpenTask(ctx);if(t&&!taskIsSuperseded(ctx,t))a.push(specificTaskTitle(ctx,t));}return a;}
function actionForProject(pid){return cache.actions.filter(function(a){return a.project_id===pid;})[0]||null;}
function installBrief(){if(document.getElementById('pst-project-brief-modal'))return;var m=document.createElement('div');m.id='pst-project-brief-modal';m.innerHTML='<div class="pst-brief-backdrop"></div><div class="pst-brief-panel" role="dialog" aria-modal="true" aria-labelledby="pst-brief-title"><button type="button" class="pst-brief-close" aria-label="Mbyll">×</button><div id="pst-brief-content"></div></div>';document.body.appendChild(m);m.querySelector('.pst-brief-backdrop').onclick=closeBrief;m.querySelector('.pst-brief-close').onclick=closeBrief;document.addEventListener('keydown',function(e){if(e.key==='Escape'&&m.classList.contains('open'))closeBrief();});}
function closeBrief(){var m=document.getElementById('pst-project-brief-modal');if(m)m.classList.remove('open');}
function routeProject(pid,route){closeBrief();if(!pid)return;if(typeof window.pstOpenProjectWorkspace==='function'){Promise.resolve(window.pstOpenProjectWorkspace(pid)).then(function(){setTimeout(function(){try{if(window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function'){if(route==='commercial')window.PSTProjectFirstV2.render('commercial');else if(route==='communication')window.PSTProjectFirstV2.render('communication');else if(route==='procurement')window.PSTProjectFirstV2.render('procurement');}}catch(e){}},280);});}}
function openProjectBriefByProject(pid,reason){var a=actionForProject(pid)||{project_id:pid,key:'',title:'Përmbledhja e projektit',why:reason==='waiting'?'PPPP po pret përgjigjen e palës tjetër.':'Pamje e gjendjes aktuale.',route:'project'};openBrief(a);}
function openBrief(a){
 installBrief();var ctx=cache.contexts[String(a.project_id||'')];if(!ctx)return routeProject(a.project_id,a.route);var p=ctx.project||{},ev=latestEvents(ctx),have=briefHave(ctx),missing=briefMissing(ctx),email=actionSourceEmail(ctx,a),deadline=p.deadline?dateText(p.deadline):'Pa afat të regjistruar';var next=[a.title];if(email&&email.subject)next.push('Kontrollo burimin: '+short(email.subject,90));next.push('Hap projektin e plotë nëse duhet verifikim më i thellë');next=next.filter(function(x,i,z){return x&&z.indexOf(x)===i;}).slice(0,3);
 var html='<div class="pst-brief-eyebrow">PROJECT BRIEF</div><h2 id="pst-brief-title">'+esc(p.name||'Projekt')+'</h2><div class="pst-brief-state">'+esc(currentState(ctx))+'</div><div class="pst-brief-grid"><section><h3>Ku jemi</h3><p>'+esc(a.why||'PPPP ka përmbledhur gjendjen aktuale nga aktiviteti i projektit.')+'</p></section><section><h3>Afati / rreziku</h3><p>'+esc(deadline)+(relDays(p.deadline)!==null&&relDays(p.deadline)<=3?' · kërkon vëmendje':'')+'</p></section></div><div class="pst-brief-grid"><section><h3>Çfarë kemi</h3><ul>'+(have.length?have.map(function(x){return'<li>'+esc(x)+'</li>';}).join(''):'<li>Nuk u gjet një element i konfirmuar për këtë seksion.</li>')+'</ul></section><section><h3>Çfarë mungon</h3><ul>'+(missing.length?missing.map(function(x){return'<li>'+esc(x)+'</li>';}).join(''):'<li>Nuk ka mungesë të qartë të identifikuar.</li>')+'</ul></section></div><section class="pst-brief-events"><h3>Çfarë ka ndodhur së fundmi</h3>'+(ev.length?ev.map(function(x){return'<div class="pst-brief-event"><span>'+esc(x.kind)+' · '+esc(dateText(x.t))+'</span><b>'+esc(short(x.title,110))+'</b><small>'+esc(short(x.detail,130))+'</small></div>';}).join(''):'<p>Nuk ka aktivitet të fundit të lexueshëm.</p>')+'</section><section><h3>Hapat e rekomanduar</h3><ol>'+next.map(function(x){return'<li>'+esc(x)+'</li>';}).join('')+'</ol></section><div class="pst-brief-why"><b>Pse po ma sugjeron këtë?</b><span>'+esc(a.why||'Bazuar në gjendjen dhe aktivitetin më të fundit të projektit.')+'</span></div><div class="pst-brief-actions"><button type="button" class="primary" data-brief-act="act">Vepro tani</button>'+(email&&email.gmail_url?'<a target="_blank" rel="noopener" href="'+esc(email.gmail_url)+'">Hap emailin</a>':'')+'<button type="button" data-brief-act="project">Hap projektin</button>'+(a.key?'<button type="button" data-brief-act="snooze">Shtyje</button><button type="button" data-brief-act="dismiss">Mos ma sugjero më</button>':'')+'</div>';
 var c=document.getElementById('pst-brief-content');c.innerHTML=html;var m=document.getElementById('pst-project-brief-modal');m.classList.add('open');c.querySelectorAll('[data-brief-act]').forEach(function(b){b.onclick=function(){var what=b.getAttribute('data-brief-act');if(what==='act')routeProject(a.project_id,a.route);else if(what==='project')routeProject(a.project_id,'project');else if(what==='snooze')window.pstWsSnooze(a.key);else if(what==='dismiss'){if(window.confirm('Ta heq PPPP këtë sugjerim nga lista?'))window.pstWsActionState(a.key,'dismissed');}};});
}
function bindActions(host){host.querySelectorAll('.pst-canonical-action').forEach(function(row){var key=row.getAttribute('data-ws-action'),a=cache.actions.filter(function(x){return x.key===key;})[0];if(!a)return;row.onclick=function(e){if(e.target.closest('button,a'))return;openBrief(a);};row.onkeydown=function(e){if((e.key==='Enter'||e.key===' ')&&!e.target.closest('button,a')){e.preventDefault();openBrief(a);}};var open=row.querySelector('.pst-ws-action-open');if(open)open.onclick=function(e){e.stopPropagation();routeProject(a.project_id,a.route);};var snooze=row.querySelector('.pst-ws-action-snooze');if(snooze)snooze.onclick=function(e){e.stopPropagation();window.pstWsSnooze(key);};var done=row.querySelector('.pst-ws-action-done');if(done)done.onclick=function(e){e.stopPropagation();window.pstWsActionState(key,'completed');};var dismiss=row.querySelector('.pst-ws-action-dismiss');if(dismiss)dismiss.onclick=function(e){e.stopPropagation();if(window.confirm('Ta heq PPPP këtë sugjerim nga lista?'))window.pstWsActionState(key,'dismissed');};});}
function bindProjects(host){host.querySelectorAll('.pst-canonical-project').forEach(function(row){row.onclick=function(){var id=row.getAttribute('data-project-id');if(id&&typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});}
function activateHome(){document.querySelectorAll('.page').forEach(function(p){if(p.id!=='page-workspace-home'){p.classList.remove('active');p.style.display='none';}});var page=document.getElementById('page-workspace-home');if(page){page.style.display='block';page.classList.add('active');}document.querySelectorAll('.pst-ws-navbtn').forEach(function(b){b.classList.toggle('active',b.getAttribute('data-key')==='home');});return page;}
function finalHomeText(page){var titles=page.querySelectorAll('.pst-ws-card-title'),subs=page.querySelectorAll('.pst-ws-card-sub');if(titles[0])titles[0].textContent='Për mua tani';if(subs[0])subs[0].textContent='Maksimumi pesë veprime konkrete që kërkojnë vendim ose veprim.';}
function decorate(){try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}try{if(window.PSTDashboardTaskCardsV1&&typeof window.PSTDashboardTaskCardsV1.decorate==='function')window.PSTDashboardTaskCardsV1.decorate();}catch(e){}try{if(window.PSTTaskSourceActionsV1&&typeof window.PSTTaskSourceActionsV1.decorate==='function')window.PSTTaskSourceActionsV1.decorate();}catch(e){}try{if(window.PSTRedesignFinalizerV1&&typeof window.PSTRedesignFinalizerV1.apply==='function')window.PSTRedesignFinalizerV1.apply();}catch(e){}var page=document.getElementById('page-workspace-home');if(page)finalHomeText(page);}
function installCss(){
 if(document.getElementById('pst-home-canonical-v2-css'))return;var s=document.createElement('style');s.id='pst-home-canonical-v2-css';s.textContent=`
#pst-home-waiting{margin:14px 0 18px;padding:13px 15px;background:#fff;border:1px solid #DDE7EA;border-radius:16px;box-shadow:0 6px 18px rgba(42,67,77,.035)}
.pst-home-wait-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.pst-home-wait-head b{font-size:15px;color:#33454D}.pst-home-wait-head span{display:block;font-size:10px;color:#849198;margin-top:2px}.pst-home-wait-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.pst-home-wait-item{width:100%;min-width:0;border:1px solid #E2EAED;background:#FAFCFD;border-radius:11px;padding:10px 12px;display:flex;align-items:center;gap:9px;text-align:left;cursor:pointer;color:#40535C}.pst-home-wait-item:hover{background:#F4F9FA;border-color:#CDE0E6}.pst-home-wait-dot{width:8px;height:8px;border-radius:50%;background:#8EB8C6;flex:0 0 auto}.pst-home-wait-copy{flex:1;min-width:0}.pst-home-wait-copy b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-home-wait-copy small{display:block;font-size:9px;color:#7D8D94;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-home-wait-arrow{font-size:18px;color:#77A4B4}
#pst-project-brief-modal{display:none;position:fixed;inset:0;z-index:10050}#pst-project-brief-modal.open{display:block}.pst-brief-backdrop{position:absolute;inset:0;background:rgba(25,38,45,.38);backdrop-filter:blur(3px)}.pst-brief-panel{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(880px,calc(100vw - 42px));max-height:88vh;overflow:auto;background:#fff;border-radius:22px;box-shadow:0 28px 80px rgba(21,42,52,.24);padding:24px 26px 22px}.pst-brief-close{position:sticky;float:right;top:0;width:36px;height:36px;border:0;border-radius:11px;background:#F1F5F6;color:#64757D;font-size:23px;cursor:pointer;z-index:2}.pst-brief-eyebrow{font-size:9px;font-weight:800;letter-spacing:1.25px;color:#5B9BB3}.pst-brief-panel h2{font-size:23px;color:#263A43;margin:5px 50px 5px 0}.pst-brief-state{display:inline-flex;border-radius:999px;background:#EAF5F8;color:#39768D;font-size:10px;font-weight:750;padding:5px 9px;margin-bottom:17px}.pst-brief-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:11px}.pst-brief-panel section,.pst-brief-why{border:1px solid #E2EAED;background:#FBFCFD;border-radius:13px;padding:13px 14px}.pst-brief-panel h3{font-size:11px;color:#3E5058;margin:0 0 7px}.pst-brief-panel p,.pst-brief-panel li{font-size:10px;line-height:1.55;color:#687980}.pst-brief-panel ul,.pst-brief-panel ol{margin:0;padding-left:18px}.pst-brief-events{margin-bottom:11px}.pst-brief-event{padding:8px 0;border-bottom:1px solid #EDF1F2}.pst-brief-event:last-child{border-bottom:0}.pst-brief-event span,.pst-brief-event small{display:block;font-size:8.5px;color:#87949A}.pst-brief-event b{display:block;font-size:10.5px;color:#3B4C54;margin:2px 0}.pst-brief-why{margin-top:11px;background:#F4FAFB}.pst-brief-why b{display:block;font-size:10px;color:#39768D}.pst-brief-why span{display:block;font-size:9.5px;color:#63767E;margin-top:3px}.pst-brief-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.pst-brief-actions button,.pst-brief-actions a{min-height:36px;padding:0 12px;border:1px solid #D6E3E7;border-radius:9px;background:#fff;color:#456E80;font-size:10px;font-weight:750;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}.pst-brief-actions .primary{background:#5B9BB3;border-color:#5B9BB3;color:#fff}#page-workspace-home .pst-canonical-action{cursor:pointer}#page-workspace-home .pst-canonical-action .pst-ws-action-meta b{font-weight:800;color:#607780}@media(max-width:760px){.pst-home-wait-list,.pst-brief-grid{grid-template-columns:1fr}.pst-brief-panel{padding:20px 16px}.pst-brief-actions>*{flex:1 1 140px}}
`;document.head.appendChild(s);
}
async function render(force){
 if(cache.rendering&&!force)return cache.rendering;
 cache.rendering=(async function(){var page=document.getElementById('page-workspace-home'),actionsHost=document.getElementById('pst-ws-home-actions'),projectsHost=document.getElementById('pst-ws-home-projects');if(!page||!actionsHost||!projectsHost)return false;var data=await loadData(),contexts=buildContexts(data),waiting=buildWaiting(contexts),actions=buildActions(data,contexts),derived=deriveProjects(data,contexts,actions,waiting);cache.lastData=data;cache.contexts=contexts;cache.actions=actions;cache.waiting=waiting;cache.projects=derived;cache.actionStates=data.states;cache.lastRenderAt=Date.now();actionsHost.innerHTML=actions.length?actions.map(actionHtml).join(''):emptyActions();projectsHost.innerHTML=derived.length?derived.map(projectHtml).join(''):emptyProjects();ensureWaitingSection(actionsHost,waiting);bindActions(actionsHost);bindProjects(projectsHost);var hb=document.getElementById('pst-ws-b-home');if(hb){hb.textContent=String(actions.length);hb.style.display=actions.length?'inline-flex':'none';}var pb=document.getElementById('pst-ws-b-projects');if(pb){var activeCount=arr(data.projects).filter(function(p){return !inactiveProject(p);}).length;pb.textContent=String(activeCount);pb.style.display=activeCount?'inline-flex':'none';}page.dataset.pstHomeOwner='canonical-v3';page.dataset.pstHomeRenderedAt=new Date().toISOString();decorate();try{document.dispatchEvent(new CustomEvent('pst:home-canonical-rendered',{detail:{actions:actions.length,projects:derived.length,waiting:waiting.length}}));}catch(e){}return true;})().catch(function(e){console.error('PPPP canonical Home render failed',e);return false;}).finally(function(){cache.rendering=null;});return cache.rendering;
}
async function upsertState(item,state,until){var payload={action_key:item.key,state:state,action_type:item.tag,title:item.title,meta:item.why||item.meta,source_ref:item.source_ref||item.project_id||'',snooze_until:until||null,updated_at:new Date().toISOString()};try{await db('dashboard_action_states','POST',payload);}catch(e){await db('dashboard_action_states?action_key=eq.'+enc(item.key),'PATCH',payload);}cache.actionStates[item.key]=payload;return true;}
window.pstWsActionState=async function(key,state){var item=cache.actions.filter(function(a){return a.key===key;})[0];if(!item)return false;try{await upsertState(item,state,null);}catch(e){toast('Veprimi nuk u ruajt: '+(e.message||e),true);return false;}closeBrief();toast(state==='completed'?'Veprimi u shënua si i kryer.':'Sugjerimi u hoq nga lista.');return render(true);};
window.pstWsSnooze=async function(key,days){var item=cache.actions.filter(function(a){return a.key===key;})[0];if(!item)return false;if(!days){var raw=window.prompt('Për sa ditë ta shtyjë PPPP këtë veprim?','1');if(raw===null)return false;days=parseInt(raw,10);}if(!isFinite(days)||days<1)days=1;if(days>30)days=30;var until=new Date(Date.now()+days*86400000).toISOString();try{await upsertState(item,'snoozed',until);}catch(e){toast('Veprimi nuk u shty: '+(e.message||e),true);return false;}closeBrief();toast('Veprimi u shty për '+days+' ditë.');return render(true);};
function go(key){key=String(key||'home').toLowerCase();if(key==='home'){activateHome();render(true);return true;}return legacyGo?legacyGo.apply(window,arguments):false;}
window.pstWorkspaceGo=go;window.pstWsRefreshHome=function(e){if(e&&e.preventDefault)e.preventDefault();return render(true);};
function classifyProject(ctx,actions,waiting){var p=ctx&&ctx.project||{};var id=String(p.id||'');if(explicitWaiting(p)||arr(waiting).some(function(w){return String(w.project_id)===id;}))return'waiting';if(arr(actions).some(function(a){return String(a.project_id)===id;}))return'action';return'work';}
window.PSTHomeCanonicalV1={version:'20260821-5',render:render,refresh:function(){return render(true);},activateHome:activateHome,openBrief:openProjectBriefByProject,_test:{inactiveProject:inactiveProject,relDays:relDays,actionStateKey:actionStateKey,taskScore:taskScore,deriveProjects:deriveProjects,buildActions:buildActions,buildWaiting:buildWaiting,recommendation:recommendation,supplierQuoteReady:supplierQuoteReady,clientReplyAfterOffer:clientReplyAfterOffer,taskIsSuperseded:taskIsSuperseded,operationalState:operationalState,explicitWaiting:explicitWaiting,explicitExecution:explicitExecution,explicitWork:explicitWork,classifyProject:classifyProject},snapshot:function(){return{actions:cache.actions.slice(),waiting:cache.waiting.slice(),projects:cache.projects.slice()};}};
installCss();installBrief();
document.addEventListener('pst:modules-ready',function(){render(true);},{once:true});
window.addEventListener('pageshow',function(){var p=document.getElementById('page-workspace-home');if(p&&p.classList.contains('active'))render(true);});
document.addEventListener('visibilitychange',function(){var p=document.getElementById('page-workspace-home');if(document.visibilityState==='visible'&&p&&p.classList.contains('active')&&p.style.display!=='none')render(true);});
})();
