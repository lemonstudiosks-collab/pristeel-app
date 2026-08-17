/* PRISTEEL Home Stability v2
 * Bounded, read-only consistency layer for the redesigned Home.
 * Preserves the approved Home UI and makes its decoration timing-safe.
 */
(function(){
'use strict';
if(window.__pstHomeStabilityV2)return;
window.__pstHomeStabilityV2=true;
var recovery=null,lastRecovery=0,CACHE_MS=120000,WAIT_MS=3200;
var lostSweep=null,lastLostSweep=0,LOST_CACHE_MS=60000,lostActionKeys={},emailFreshActionKeys={};
function arr(v){return Array.isArray(v)?v:[];}
function esc(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function active(p){var s=String(p&&p.status||'').toLowerCase().trim();return !/^(mbyllur|humbur|arkivuar|closedlost|cancelled|realizuar)$/.test(s);}
function lost(p){var s=String(p&&p.status||'').toLowerCase().trim();return /^(humbur|closedlost|cancelled)$/.test(s);}
function one(){for(var i=0;i<arguments.length;i++)if(arguments[i])return arguments[i];return'';}
function stamp(p){var v=p&&one(p.updated_at,p.last_activity_at,p.last_email_at,p.created_at),t=v?new Date(v).getTime():0;return isFinite(t)?t:0;}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function dayStart(){var d=new Date();d.setHours(0,0,0,0);return d;}
function relDays(v){var d=safeDate(v);if(!d)return null;d.setHours(0,0,0,0);return Math.round((d-dayStart())/86400000);}
function since(v){var d=safeDate(v);return d?Math.max(0,Math.floor((Date.now()-d.getTime())/86400000)):null;}
function addDays(v,n){var d=safeDate(v);if(!d)return null;d=new Date(d.getTime());d.setDate(d.getDate()+Number(n||0));return d;}
function hash(s){s=String(s||'');var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24);}return(h>>>0).toString(36);}
function actionKey(title,meta,go){var k=(String(title||'')+'|'+String(meta||'')).toLowerCase().replace(/\s+/g,' ');return'ws_'+hash(k+'|'+String(go||''));}
function normEmail(v){return String(v||'').trim().toLowerCase();}
function effectiveEmailProject(e){
 var direct=String(e&&e.project_id||'');if(direct)return direct;
 if(!e||e.needs_review===true||Number(e.match_confidence||0)<90)return'';
 var method=String(e.match_method||'').toLowerCase();
 if(method.indexOf('email-unique')!==0&&method.indexOf('manual')!==0)return'';
 return String(e.suggested_project_id||'');
}
function automatedIncoming(e){var s=(normEmail(e&&e.from_email)+' '+String(e&&e.subject||'').toLowerCase());return /(mailer-daemon|postmaster|automatic reply|auto reply|autoreply|automatische antwort|abwesen|out of office|vacation reply)/i.test(s);}
function emailMatchesTask(e,t){
 if(!e||!t||!t.project_id||!t.contact_email||effectiveEmailProject(e)!==String(t.project_id))return false;
 var contact=normEmail(t.contact_email),direction=String(e.direction||'').toLowerCase();
 if(direction==='incoming')return !automatedIncoming(e)&&normEmail(e.from_email)===contact;
 if(direction!=='outgoing')return false;
 return arr(e.to_emails).concat(arr(e.cc_emails)).some(function(v){return normEmail(v)===contact;});
}
function followupDays(t){var m=String(t&&t.detail||'').match(/(\d{1,2})\s*dit[eë]\s*pa\s*(?:lajm[eë]rim|p[eë]rgjigje)/i),n=m?parseInt(m[1],10):7;return n>0&&n<=60?n:7;}
function latestTaskEmail(t,emails){
 var created=safeDate(t&&t.created_at),latest=null;
 arr(emails).forEach(function(e){if(!emailMatchesTask(e,t))return;var d=safeDate(e.sent_at);if(!d||(created&&d<=created))return;if(!latest||d>latest.date)latest={row:e,date:d};});
 return latest;
}
function staleEmailAuditTask(t,emails){
 if(String(t&&t.source||'').toLowerCase()!=='email_audit'||!t.project_id||!t.contact_email)return false;
 var latest=latestTaskEmail(t,emails);if(!latest)return false;
 if(String(latest.row.direction||'').toLowerCase()==='incoming')return true;
 var due=safeDate(t.due_date),expected=addDays(latest.date,followupDays(t));if(!due||!expected)return false;
 due.setHours(0,0,0,0);expected.setHours(0,0,0,0);return due<expected;
}
function currentView(){try{return window.PSTHomeCommandCenterV2&&window.PSTHomeCommandCenterV2.getView?window.PSTHomeCommandCenterV2.getView():'today';}catch(e){return'today';}}
function limits(){var v=currentView();return v==='week'?{a:5,p:4}:v==='overview'?{a:7,p:6}:{a:3,p:3};}
function cap(hostId,selector,limit,label){var host=document.getElementById(hostId);if(!host)return;var rows=[].slice.call(host.querySelectorAll(selector)),old=host.querySelector('.pst-hcc-more');if(old)old.remove();rows.forEach(function(r,i){r.classList.toggle('pst-hcc-hidden',i>=limit);});if(rows.length<=limit)return;var b=document.createElement('button');b.type='button';b.className='pst-hcc-more pst-stability-more';b.innerHTML='<b>Shiko edhe '+(rows.length-limit)+'</b><span>'+esc(label)+'</span>';var open=false;b.onclick=function(){open=!open;rows.forEach(function(r,i){r.classList.toggle('pst-hcc-hidden',!open&&i>=limit);});b.innerHTML=open?'<b>Shfaq më pak</b><span>Mbyll listën e zgjeruar</span>':'<b>Shiko edhe '+(rows.length-limit)+'</b><span>'+esc(label)+'</span>';};host.appendChild(b);}
function decorateApprovedHome(){try{if(window.PSTHomeCommandCenterV2&&typeof window.PSTHomeCommandCenterV2.decorate==='function')window.PSTHomeCommandCenterV2.decorate();}catch(e){}}
function enforce(){var page=document.getElementById('page-workspace-home');if(!page||page.style.display==='none')return;decorateApprovedHome();var l=limits();cap('pst-ws-home-actions',':scope > .pst-ws-action',l.a,'Hap prioritetet e tjera');cap('pst-ws-home-projects',':scope > .pst-ws-projectcard',l.p,'Hap projektet e tjera');}
function card(p){var status=String(p.status||'Në pritje'),name=p.name||'Pa emër',meta=(p.client||'Pa klient')+(p.ref?' · '+p.ref:''),next=p.pipeline_stage?('Faza aktuale: '+String(p.pipeline_stage).replace(/_/g,' ')):'Hap workspace-in e projektit';return'<div class="pst-ws-projectcard pst-stability-project" data-project-id="'+esc(p.id)+'"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">'+esc(name)+'</div><div class="pst-ws-projectcard-client">'+esc(meta)+'</div></div><span class="pst-ws-status">'+esc(status)+'</span></div><div class="pst-ws-projectcard-next"><b>Hapi tjetër:</b> '+esc(next)+'</div></div>';}
function timedProjects(){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return new Promise(function(resolve){var done=false,t=setTimeout(function(){if(done)return;done=true;resolve([]);},WAIT_MS);Promise.resolve().then(function(){return window.supaFetch('projects?select=*&limit=2000');}).then(function(rows){if(done)return;done=true;clearTimeout(t);resolve(arr(rows));}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve([]);});});}
function recover(force){var page=document.getElementById('page-workspace-home'),host=document.getElementById('pst-ws-home-projects');if(!page||page.style.display==='none'||!host)return Promise.resolve(false);if(host.querySelector('.pst-ws-projectcard')){enforce();return Promise.resolve(true);}if(!force&&Date.now()-lastRecovery<CACHE_MS)return Promise.resolve(false);if(recovery)return recovery;lastRecovery=Date.now();recovery=timedProjects().then(function(rows){recovery=null;if(!document.getElementById('pst-ws-home-projects'))return false;var activeRows=rows.filter(active).sort(function(a,b){return stamp(b)-stamp(a);});if(!activeRows.length){decorateApprovedHome();return false;}host.innerHTML=activeRows.slice(0,12).map(card).join('');host.querySelectorAll('.pst-stability-project').forEach(function(el){el.onclick=function(){var id=el.getAttribute('data-project-id');if(typeof window.pstOpenProjectWorkspace==='function')window.pstOpenProjectWorkspace(id);};});var badge=document.getElementById('pst-ws-b-projects');if(badge){badge.textContent=String(activeRows.length);badge.style.display='inline-flex';}enforce();return true;}).catch(function(){recovery=null;decorateApprovedHome();return false;});return recovery;}
function removeLostActions(){var page=document.getElementById('page-workspace-home');if(!page||page.style.display==='none')return 0;var removed=0;page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action[data-ws-action]').forEach(function(row){var key=String(row.getAttribute('data-ws-action')||'');if(lostActionKeys[key]||emailFreshActionKeys[key]){row.remove();removed++;}});if(removed){var badge=document.getElementById('pst-ws-b-home'),count=page.querySelectorAll('#pst-ws-home-actions > .pst-ws-action').length;if(badge){badge.textContent=String(count);badge.style.display=count?'inline-flex':'none';}}return removed;}
function taskActionKey(t){var d=relDays(t.due_date);if(d===null||d>3)return'';var meta=d<0?Math.abs(d)+' ditë vonë':d===0?'Afati sot':'Afati pas '+d+' ditësh';meta=meta+(t.detail?' · '+t.detail:'');return actionKey(t.title||'Detyrë',meta,t.project_id?'project':'tasks');}
function loadLostActionKeys(force){if(typeof window.supaFetch!=='function')return Promise.resolve(lostActionKeys);if(!force&&Date.now()-lastLostSweep<LOST_CACHE_MS){removeLostActions();return Promise.resolve(lostActionKeys);}if(lostSweep)return lostSweep;lastLostSweep=Date.now();var cutoff=new Date(Date.now()-60*86400000).toISOString();lostSweep=Promise.all([
 window.supaFetch('projects?select=id,status&limit=3000').catch(function(){return[];}),
 window.supaFetch('tasks?status=eq.hapur&select=id,title,detail,due_date,project_id,source,contact_email,created_at&limit=1000').catch(function(){return[];}),
 window.supaFetch('rfq_log?select=id,project_id,project_name,supplier_name,supplier_email,status,sent_at,last_followup_at&limit=2000').catch(function(){return[];}),
 window.supaFetch('project_emails?sent_at=gte.'+enc(cutoff)+'&select=id,project_id,suggested_project_id,from_email,to_emails,cc_emails,subject,sent_at,direction,match_method,match_confidence,needs_review&order=sent_at.desc&limit=2000').catch(function(){return[];})
]).then(function(data){var projects={},keys={},fresh={};arr(data[0]).forEach(function(p){projects[String(p.id||'')]=p;});arr(data[1]).forEach(function(t){if(!t.project_id||!lost(projects[String(t.project_id)]))return;var key=taskActionKey(t);if(key)keys[key]=true;});arr(data[2]).forEach(function(r){if(!r.project_id||!lost(projects[String(r.project_id)]))return;if(['replied','won','lost','planned'].indexOf(String(r.status||'').toLowerCase())>-1)return;var age=since(r.last_followup_at||r.sent_at);if(age===null||age<5)return;keys[actionKey('Ndjekje: '+(r.supplier_name||r.supplier_email||'Furnitor'),(r.project_name||'Pa projekt')+' · '+age+' ditë pa përgjigje','project')]=true;});arr(data[1]).forEach(function(t){if(!staleEmailAuditTask(t,data[3]))return;var key=taskActionKey(t);if(key)fresh[key]=true;});lostActionKeys=keys;emailFreshActionKeys=fresh;lostSweep=null;removeLostActions();return keys;}).catch(function(){lostSweep=null;return lostActionKeys;});return lostSweep;}
function apply(force){decorateApprovedHome();enforce();return recover(!!force).then(function(){return loadLostActionKeys(!!force);}).then(function(){try{if(window.PSTDashboardTaskCardsV1&&window.PSTDashboardTaskCardsV1.decorate)window.PSTDashboardTaskCardsV1.decorate();}catch(e){}removeLostActions();decorateApprovedHome();enforce();return true;});}
/* One bounded consistency pass per real trigger replaces the old multi-second timer cascade. */
function schedule(){return apply(false);}
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('#pst-home-view-tabs button,.pst-ws-navbtn,#pst-ws-home-refresh'))setTimeout(function(){apply(e.target&&e.target.closest&&!!e.target.closest('#pst-ws-home-refresh'));},80);},true);
document.addEventListener('pst:modules-ready',schedule,{once:true});window.addEventListener('pageshow',schedule,{once:true});
var css=document.createElement('style');css.id='pst-home-stability-v2-css';css.textContent='#page-workspace-home .pst-hcc-hidden{display:none!important}#page-workspace-home .pst-stability-project{cursor:pointer}#page-workspace-home .pst-stability-project .pst-ws-status{background:#F1F5F6;color:#607078;border:1px solid #DCE5E8}';document.head.appendChild(css);
window.PSTHomeStabilityV2={apply:apply,recover:recover,enforce:enforce,loadLostActionKeys:loadLostActionKeys,removeLostActions:removeLostActions,_test:{active:active,lost:lost,actionKey:actionKey,relDays:relDays,effectiveEmailProject:effectiveEmailProject,emailMatchesTask:emailMatchesTask,followupDays:followupDays,staleEmailAuditTask:staleEmailAuditTask,taskActionKey:taskActionKey}};schedule();
})();