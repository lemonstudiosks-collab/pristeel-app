/* PRISTEEL cold outreach follow-up inbox v1
 * Reclassifies projectless outgoing Gmail history as a contact follow-up queue.
 * Keeps project matching read-only here; only confirmed follow-up state is written.
 * Gmail draft creation is human-gated and uses gmail.compose only on explicit click.
 */
(function(){
'use strict';
if(window.__pstOutreachFollowupV1)return;
window.__pstOutreachFollowupV1=true;

var state={generation:0,loading:false,all:[],visible:[],requests:[],removedRequests:0,outreachByEmail:new Map(),composeToken:null,composeTokenExp:0};
var FREE_DOMAINS=new Set(['gmail.com','googlemail.com','outlook.com','hotmail.com','live.com','icloud.com','yahoo.com','yahoo.de','gmx.de','gmx.net','web.de','aol.com','proton.me','protonmail.com']);

function text(v){return String(v==null?'':v).trim();}
function lower(v){return text(v).toLowerCase();}
function esc(v){return text(v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
function email(v){var m=lower(v).match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function isInternal(v){var e=email(v);return !e||/@prissteel\.com$/i.test(e);}
function arr(v){return Array.isArray(v)?v:[];}
function uniq(v){var seen=new Set();return arr(v).filter(function(x){x=text(x);if(!x||seen.has(x))return false;seen.add(x);return true;});}
function safeDate(v){var d=v?new Date(v):null;return d&&!isNaN(d.getTime())?d:null;}
function pad2(v){return String(v).padStart(2,'0');}
function localDay(v){var d=safeDate(v);if(!d)return'';return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}
function isoDay(v){return localDay(v);}
function todayDay(){return localDay(new Date());}
function fmtDay(v){var d=safeDate(v);if(!d)return'—';return d.toLocaleDateString('sq-AL',{day:'2-digit',month:'short',year:'numeric'});}
function addDays(v,n){var d=safeDate(v);if(!d)return null;d=new Date(d.getTime());d.setUTCDate(d.getUTCDate()+Number(n||0));return d;}
function daysBetween(a,b){var x=safeDate(a),y=safeDate(b);if(!x||!y)return 0;x.setHours(0,0,0,0);y.setHours(0,0,0,0);return Math.round((y-x)/86400000);}
function delayForTouches(n){return n<=1?7:n===2?14:30;}
function domainFromEmail(v){var e=email(v);return e?e.split('@')[1]:'';}
function companyFromEmail(v){var d=domainFromEmail(v);if(!d||FREE_DOMAINS.has(d))return'';var labels=d.split('.');var base=labels[0]==='www'?(labels[1]||''):labels[0];if((base==='mail'||base==='email'||base==='office')&&labels[1])base=labels[1];return base.replace(/[-_]+/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();});}
function normalizeSubject(v){var s=lower(v).replace(/\s+/g,' ').trim();var before='';while(s&&s!==before){before=s;s=s.replace(/^\s*(?:(?:re|fw|fwd|aw|wg|sv)\s*:\s*)/i,'').trim();}return s.replace(/[\s\-–—_:;,.]+/g,' ').trim();}
function strongSubject(v){var s=normalizeSubject(v),parts=s.split(/\s+/).filter(Boolean);return s.length>=24&&parts.length>=4?s:'';}
function headerSafe(v){return text(v).replace(/[\r\n]+/g,' ');}
function isAutomatedIncoming(x){var s=lower([x.from_email,x.from_name,x.subject,x.snippet].join(' '));return /(mailer-daemon|postmaster|delivery status|delivery failure|undeliver|unzustell|mail delivery|automatic reply|auto reply|autoreply|automatische antwort|abwesen|out of office|vacation reply)/i.test(s);}
function germanLikely(x){var d=domainFromEmail(x.recipient),s=lower(x.last&&x.last.subject);return /\.(de|at|ch)$/.test(d)||/(fertigung|bauprojekt|stahl|partner|anfrage|angebot|konstruktion|zusammenarbeit|industrie)/.test(s);}
function draftBody(x){
  if(germanLikely(x))return 'Guten Tag,\n\nich wollte kurz auf meine vorherige Nachricht zurückkommen. Wäre eine Zusammenarbeit mit PRISTEEL für aktuelle oder kommende Stahlbauprojekte grundsätzlich interessant?\n\nGerne sende ich Ihnen bei Interesse weitere Informationen zu unseren Fertigungskapazitäten und Referenzen.\n\nMit freundlichen Grüßen\nArianit Vllahiu\nPRISTEEL';
  return 'Hello,\n\nI wanted to briefly follow up on my previous message. Would cooperation with PRISTEEL for current or upcoming steel construction projects be of interest?\n\nI would be happy to send further information on our production capacity and references.\n\nKind regards,\nArianit Vllahiu\nPRISTEEL';
}
function utf8Base64(v){var bytes=new TextEncoder().encode(String(v||'')),bin='',chunk=0x8000;for(var i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));return btoa(bin);}
function headerValue(v){v=headerSafe(v);return /[^\x20-\x7E]/.test(v)?'=?UTF-8?B?'+utf8Base64(v)+'?=':v;}
function base64Url(v){return utf8Base64(v).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}

async function fetchPaged(path,pageSize){
  if(typeof window.supaFetch!=='function')return [];
  pageSize=pageSize||1000;var rows=[],offset=0;
  for(var i=0;i<20;i++){
    var sep=path.indexOf('?')>-1?'&':'?';
    var chunk=await window.supaFetch(path+sep+'limit='+pageSize+'&offset='+offset);chunk=Array.isArray(chunk)?chunk:[];rows=rows.concat(chunk);
    if(chunk.length<pageSize)break;offset+=chunk.length;
  }
  return rows;
}
function contactMap(rows){var m=new Map();arr(rows).forEach(function(c){var e=email(c.email);if(!e)return;var old=m.get(e);if(!old||(!old.person&&c.person)||(!old.company&&c.company))m.set(e,c);});return m;}
function outreachMap(rows){var m=new Map();arr(rows).forEach(function(c){var e=email(c.contact_email);if(e&&!m.has(e))m.set(e,c);});return m;}
function linkedThreadSet(linkedEmails,links){var s=new Set();arr(linkedEmails).forEach(function(x){if(text(x.gmail_thread_id)&&text(x.project_id))s.add(text(x.gmail_thread_id));});arr(links).forEach(function(x){if(text(x.gmail_thread_id)&&text(x.project_id))s.add(text(x.gmail_thread_id));});return s;}

function buildCandidates(outgoing,incoming,contacts,outreach,linkedThreads,now){
  now=now||new Date();var cMap=contactMap(contacts),oMap=outreachMap(outreach),groups=new Map(),future=new Set();
  arr(outgoing).forEach(function(x){
    var sent=safeDate(x.sent_at);if(!sent)return;
    arr(x.to_emails).forEach(function(raw){var e=email(raw);if(!e||isInternal(e))return;if(sent>now){future.add(e);return;}
      if(!groups.has(e))groups.set(e,{recipient:e,rows:[],threads:new Set(),first:null,last:null});var g=groups.get(e);g.rows.push(x);if(text(x.gmail_thread_id))g.threads.add(text(x.gmail_thread_id));if(!g.first||sent<safeDate(g.first.sent_at))g.first=x;if(!g.last||sent>safeDate(g.last.sent_at))g.last=x;
    });
  });
  var humanIncoming=new Map();arr(incoming).forEach(function(x){var e=email(x.from_email);if(!e||isInternal(e)||isAutomatedIncoming(x))return;if(!humanIncoming.has(e))humanIncoming.set(e,[]);humanIncoming.get(e).push(x);});
  var out=[];
  groups.forEach(function(g,e){
    if(future.has(e))return;
    var contact=cMap.get(e)||null;if(contact&&lower(contact.kind)==='supplier')return;
    var firstAt=safeDate(g.first&&g.first.sent_at),replies=(humanIncoming.get(e)||[]).filter(function(r){var d=safeDate(r.sent_at);return d&&firstAt&&d>=firstAt;});
    if(replies.length)return;
    var projectThread=Array.from(g.threads).some(function(t){return linkedThreads.has(t);});if(projectThread)return;
    var existing=oMap.get(e)||null;if(existing&&(existing.replied||existing.meeting||existing.closed||['Replied','Meeting','Bounced','Not Relevant'].indexOf(text(existing.status))>-1))return;
    var n=g.rows.length,lastAt=safeDate(g.last.sent_at),rawDue=addDays(lastAt,delayForTouches(n)),today=safeDate(todayDay()),proposed=rawDue&&rawDue<today?today:rawDue;
    if(existing&&existing.follow_up_date){var stored=safeDate(existing.follow_up_date);if(stored)proposed=stored;}
    var company=text(contact&&contact.company)||companyFromEmail(e),person=text(contact&&contact.person),touches=uniq(g.rows.map(function(r){return isoDay(r.sent_at);})).slice(0,3);
    out.push({recipient:e,company:company,person:person,country:text(contact&&contact.country),count:n,first:g.first,last:g.last,threads:g.threads,rawDue:rawDue,proposed:proposed,overdueDays:rawDue&&rawDue<today?Math.max(0,daysBetween(rawDue,today)):0,existing:existing,touches:touches,scheduled:!!(existing&&text(existing.status)==='Scheduled')});
  });
  out.sort(function(a,b){if(a.scheduled!==b.scheduled)return a.scheduled?1:-1;var ad=a.rawDue?a.rawDue.getTime():Infinity,bd=b.rawDue?b.rawDue.getTime():Infinity;if(ad!==bd)return ad-bd;return String(a.recipient).localeCompare(String(b.recipient));});
  return out;
}

function buildRequestFilter(requests,emails,links){
  var byMsg=new Map(),threadProjects=new Map(),subjectProjects=new Map();
  arr(emails).forEach(function(x){var mid=text(x.gmail_message_id);if(mid)byMsg.set(mid,x);var pid=text(x.project_id),tid=text(x.gmail_thread_id);if(pid&&tid){if(!threadProjects.has(tid))threadProjects.set(tid,new Set());threadProjects.get(tid).add(pid);}if(pid){var ns=strongSubject(x.subject);if(ns){if(!subjectProjects.has(ns))subjectProjects.set(ns,new Set());subjectProjects.get(ns).add(pid);}}});
  arr(links).forEach(function(x){var pid=text(x.project_id),tid=text(x.gmail_thread_id);if(pid&&tid){if(!threadProjects.has(tid))threadProjects.set(tid,new Set());threadProjects.get(tid).add(pid);}var row=byMsg.get(text(x.gmail_message_id)),ns=row?strongSubject(row.subject):'';if(pid&&ns){if(!subjectProjects.has(ns))subjectProjects.set(ns,new Set());subjectProjects.get(ns).add(pid);}});
  var kept=[],removed=0;
  arr(requests).forEach(function(x){var pe=byMsg.get(text(x.gmail_msg_id))||null,linked=!!text(x.project_id)||!!(pe&&text(pe.project_id));var tp=pe&&threadProjects.get(text(pe.gmail_thread_id));if(!linked&&tp&&tp.size===1)linked=true;if(!linked&&pe&&text(pe.suggested_project_id)&&Number(pe.match_confidence||0)>=95&&!pe.needs_review)linked=true;if(!linked){var ss=strongSubject(x.subject),sp=ss?subjectProjects.get(ss):null;if(sp&&sp.size===1)linked=true;}if(linked)removed++;else kept.push(x);});
  kept.sort(function(a,b){return String(b.received_at||b.created_at||'').localeCompare(String(a.received_at||a.created_at||''));});return{kept:kept,removed:removed};
}

function installStyle(){if(document.getElementById('pst-outreach-followup-v1-style'))return;var s=document.createElement('style');s.id='pst-outreach-followup-v1-style';s.textContent=`
#page-workspace-inbox .pst-ofu-toolbar{display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap;margin:0 0 10px}
#page-workspace-inbox .pst-ofu-summary{font-size:10px;color:#78868D}.pst-ofu-summary b{color:#3F7F98}
#page-workspace-inbox .pst-ofu-search{height:30px;min-width:190px;max-width:250px;padding:0 9px;border:1px solid #DDE7EB;border-radius:8px;font-size:10.5px}
#page-workspace-inbox .pst-ofu-row{display:grid;grid-template-columns:8px minmax(0,1fr) auto;gap:10px;align-items:center;padding:10px 2px;border-bottom:1px solid #EDF1F3}
#page-workspace-inbox .pst-ofu-row:last-child{border-bottom:0}.pst-ofu-dot{width:7px;height:7px;border-radius:50%;background:#5B9BB3;box-shadow:0 0 0 4px rgba(91,155,179,.11)}
#page-workspace-inbox .pst-ofu-main{min-width:0;cursor:pointer}.pst-ofu-name{font-size:11.5px;font-weight:760;color:#30383D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-ofu-meta,.pst-ofu-sub{font-size:9.5px;color:#8A969C;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pst-ofu-sub{color:#68767D}
#page-workspace-inbox .pst-ofu-controls{display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end}.pst-ofu-date{height:29px;padding:0 6px;border:1px solid #DDE7EB;border-radius:8px;font-size:9.5px;color:#536067;background:#fff}.pst-ofu-btn{height:29px;padding:0 9px;border:1px solid #C9DCE4;border-radius:8px;background:#fff;color:#3F7F98;font-size:9.5px;font-weight:760;cursor:pointer;white-space:nowrap}.pst-ofu-btn:hover{background:#EAF5F8}.pst-ofu-btn:disabled{opacity:.55;cursor:default}.pst-ofu-overdue{font-size:8.5px;font-weight:760;color:#A33A2E;background:rgba(163,58,46,.07);border-radius:999px;padding:2px 6px;white-space:nowrap}.pst-ofu-scheduled{font-size:8.5px;font-weight:760;color:#3F7A4E;background:rgba(63,122,78,.08);border-radius:999px;padding:2px 6px;white-space:nowrap}
@media(max-width:980px){#page-workspace-inbox .pst-ofu-row{grid-template-columns:8px minmax(0,1fr)}#page-workspace-inbox .pst-ofu-controls{grid-column:2;justify-content:flex-start}.pst-ofu-search{width:100%;max-width:none!important}}
`;(document.head||document.documentElement).appendChild(s);}

function setCardHeadings(){var page=document.getElementById('page-workspace-inbox');if(!page)return;var cards=page.querySelectorAll('.pst-ws-card');if(cards[0]){var t=cards[0].querySelector('.pst-ws-card-title'),s=cards[0].querySelector('.pst-ws-card-sub');if(t)t.textContent='Follow-up për kontakte';if(s)s.textContent='Cold outreach pa përgjigje · kontakti i fundit dhe data e propozuar';}if(cards[1]){var t2=cards[1].querySelector('.pst-ws-card-title'),s2=cards[1].querySelector('.pst-ws-card-sub');if(t2)t2.textContent='Kërkesa pa projekt';if(s2)s2.textContent='Vetëm hyrjet që ende nuk kanë lidhje të provuar me projekt';}}
function updateBadge(n){var b=document.getElementById('pst-ws-b-inbox');if(!b)return;b.textContent=String(n||'');b.style.display=n?'':'none';}
function rowKey(e){return encodeURIComponent(String(e||''));}
function findCandidate(e){e=email(decodeURIComponent(e||''));return state.all.find(function(x){return x.recipient===e;});}

function renderLeft(filter){var root=document.getElementById('pst-ws-inbox-emails');if(!root)return;filter=lower(filter);var list=state.all.filter(function(x){return !filter||[x.person,x.company,x.recipient,x.last&&x.last.subject].join(' ').toLowerCase().indexOf(filter)>-1;});state.visible=list;var due=list.filter(function(x){return !x.scheduled&&x.rawDue&&x.rawDue<=safeDate(todayDay());}).length;var html='<div class="pst-ofu-toolbar"><div class="pst-ofu-summary"><b>'+state.all.length+'</b> pa përgjigje · <b>'+due+'</b> për ndjekje sot/vonë</div><input class="pst-ofu-search" type="search" placeholder="Kërko kompani ose email…" value="'+esc(filter)+'" oninput="PSTOutreachFollowupV1.filter(this.value)"></div>';
  var shown=list.slice(0,60);if(!shown.length){root.innerHTML=html+'<div class="pst-ws-empty" style="color:#3F7A4E">Nuk ka kontakte për follow-up.</div>';return;}
  html+=shown.map(function(x){var label=x.person||x.company||companyFromEmail(x.recipient)||x.recipient,url=text(x.last&&x.last.gmail_url).replace(/'/g,"\\'"),date=isoDay(x.proposed)||todayDay(),status=x.scheduled?'<span class="pst-ofu-scheduled">Draft gati</span>':x.overdueDays?'<span class="pst-ofu-overdue">Vonuar '+x.overdueDays+' ditë</span>':'';return '<div class="pst-ofu-row"><i class="pst-ofu-dot"></i><div class="pst-ofu-main" '+(url?'onclick="window.open(\''+url+'\',\'PRISTEEL_GMAIL\')"':'')+'><div class="pst-ofu-name">'+esc(label)+'</div><div class="pst-ofu-meta">'+esc(x.recipient)+' · Shkruar '+x.count+' herë · E fundit '+fmtDay(x.last&&x.last.sent_at)+'</div><div class="pst-ofu-sub">'+esc(x.last&&x.last.subject||'')+'</div></div><div class="pst-ofu-controls">'+status+'<input class="pst-ofu-date" id="pst-ofu-date-'+rowKey(x.recipient)+'" type="date" min="'+todayDay()+'" value="'+esc(date)+'" '+(x.scheduled?'disabled':'')+'><button class="pst-ofu-btn" '+(x.scheduled?'disabled':'')+' onclick="PSTOutreachFollowupV1.createDraft(\''+rowKey(x.recipient)+'\',this)">'+(x.scheduled?'Draft gati':'Krijo draft')+'</button></div></div>';}).join('');if(list.length>shown.length)html+='<div class="pst-ws-empty">Po shfaqen 60 nga '+list.length+'. Përdor kërkimin për kontaktet e tjera.</div>';root.innerHTML=html;}
function renderRight(){var root=document.getElementById('pst-ws-inbox-requests');if(!root)return;var cards=document.querySelectorAll('#page-workspace-inbox .pst-ws-card');if(cards[1]){var s=cards[1].querySelector('.pst-ws-card-sub');if(s)s.textContent='Vetëm hyrjet pa lidhje të provuar · '+state.removedRequests+' komunikime projekti u filtruan';}var list=state.requests.slice(0,40);root.innerHTML=list.length?list.map(function(x){return'<div class="pst-ws-action"><i class="pst-ws-action-dot" style="--c:#B78324;--bg:rgba(183,131,36,.08)"></i><div class="pst-ws-action-main" onclick="pstWsLegacy(\'outreach\')"><div class="pst-ws-action-title">'+esc(x.subject||x.file_name||'Kërkesë')+'</div><div class="pst-ws-action-meta">'+esc(x.sender||'')+' · '+fmtDay(x.received_at||x.created_at)+'</div></div><button class="pst-ws-rowaction" onclick="pstWsLegacy(\'outreach\')">Analizo</button></div>';}).join(''):'<div class="pst-ws-empty" style="color:#3F7A4E">Nuk ka kërkesa të palidhura me projekt.</div>';}

async function loadData(generation){
  var now=new Date();
  var out=await Promise.all([
    fetchPaged('project_emails?direction=eq.outgoing&project_id=is.null&select=id,gmail_message_id,gmail_thread_id,rfc822_message_id,to_emails,subject,sent_at,gmail_url&order=sent_at.asc',1000),
    fetchPaged('project_emails?direction=eq.incoming&select=id,gmail_thread_id,from_email,from_name,subject,snippet,sent_at,project_id&order=sent_at.asc',1000),
    fetchPaged('project_emails?project_id=not.is.null&select=gmail_message_id,gmail_thread_id,project_id,subject&order=sent_at.desc',1000),
    fetchPaged('project_email_links?select=gmail_message_id,gmail_thread_id,project_id,link_method&order=updated_at.desc',1000),
    fetchPaged('contacts?select=id,kind,company,person,email,country&order=id.asc',1000),
    fetchPaged('outreach_contacts?select=*&order=updated_at.desc',1000),
    fetchPaged('offers_inbox?processed=eq.false&select=*&order=created_at.desc',1000),
    fetchPaged('project_emails?select=gmail_message_id,gmail_thread_id,project_id,suggested_project_id,match_confidence,needs_review,subject&order=sent_at.desc',1000)
  ]);
  if(generation!==state.generation)return null;
  var linked=linkedThreadSet(out[2],out[3]),candidates=buildCandidates(out[0],out[1],out[4],out[5],linked,now),rf=buildRequestFilter(out[6],out[7],out[3]);
  state.outreachByEmail=outreachMap(out[5]);state.all=candidates;state.requests=rf.kept;state.removedRequests=rf.removed;return state;
}
async function enhance(generation){if(state.loading)return;var left=document.getElementById('pst-ws-inbox-emails'),right=document.getElementById('pst-ws-inbox-requests');if(!left||!right)return;state.loading=true;setCardHeadings();left.innerHTML='<div class="pst-ws-empty">Duke analizuar historikun e outreach-it…</div>';right.innerHTML='<div class="pst-ws-empty">Duke kontrolluar lidhjet e projekteve…</div>';try{var data=await loadData(generation);if(!data||generation!==state.generation)return;renderLeft('');renderRight();updateBadge(state.all.filter(function(x){return !x.scheduled&&x.rawDue&&x.rawDue<=safeDate(todayDay());}).length+state.requests.length);}catch(e){console.error('PRISTEEL outreach follow-up:',e);left.innerHTML='<div class="pst-ws-empty" style="color:#A33A2E">Follow-up nuk u ngarkua: '+esc(e.message||e)+'</div>';right.innerHTML='<div class="pst-ws-empty" style="color:#A33A2E">Kërkesat nuk u filtruan.</div>';}finally{state.loading=false;}}
function waitForOriginal(generation,attempt){if(generation!==state.generation)return;var left=document.getElementById('pst-ws-inbox-emails'),right=document.getElementById('pst-ws-inbox-requests');if(!left||!right){if(attempt<5)setTimeout(function(){waitForOriginal(generation,attempt+1);},120+attempt*100);return;}var loading=/Duke ngarkuar/.test(left.textContent||'')||/Duke ngarkuar/.test(right.textContent||'');if(loading&&attempt<5){setTimeout(function(){waitForOriginal(generation,attempt+1);},150+attempt*120);return;}enhance(generation);}
function schedule(){state.generation++;var g=state.generation;setTimeout(function(){waitForOriginal(g,0);},80);}

function authCompose(){return new Promise(function(resolve,reject){if(state.composeToken&&Date.now()<state.composeTokenExp){resolve(state.composeToken);return;}var cid='';try{cid=localStorage.getItem('pristeel_gclient')||'';}catch(e){}if(!cid){reject(new Error('Mungon Google Client ID te Cilësimet.'));return;}if(typeof google==='undefined'||!google.accounts||!google.accounts.oauth2){reject(new Error('Google Identity nuk është ngarkuar.'));return;}try{var client=google.accounts.oauth2.initTokenClient({client_id:cid,scope:'https://www.googleapis.com/auth/gmail.compose',prompt:'consent',callback:function(r){if(r&&r.access_token){state.composeToken=r.access_token;state.composeTokenExp=Date.now()+((r.expires_in||3600)-60)*1000;resolve(state.composeToken);}else reject(new Error(r&&r.error_description||'Autorizimi për Gmail Drafts dështoi.'));}});client.requestAccessToken();}catch(e){reject(e);}});}
async function createGmailDraft(x){var token=await authCompose(),subject=headerSafe(x.last&&x.last.subject||'Follow-up'),msgId=headerSafe(x.last&&x.last.rfc822_message_id||''),headers=['To: '+headerSafe(x.recipient),'Subject: '+headerValue(subject),'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: 8bit'];if(msgId){headers.push('In-Reply-To: '+msgId);headers.push('References: '+msgId);}var raw=base64Url(headers.join('\r\n')+'\r\n\r\n'+draftBody(x)),payload={message:{raw:raw}};if(text(x.last&&x.last.gmail_thread_id)&&msgId)payload.message.threadId=text(x.last.gmail_thread_id);var res=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload)}),body=await res.text();if(!res.ok)throw new Error('Gmail Draft '+res.status+': '+body.slice(0,220));return body?JSON.parse(body):{};}
async function saveFollowup(x,date){var current=state.outreachByEmail.get(x.recipient),patch={company_domain:domainFromEmail(x.recipient),contact_email:x.recipient,country:x.country||null,touch_1:x.touches[0]||null,touch_2:x.touches[1]||null,touch_3:x.touches[2]||null,status:'Scheduled',bounced:false,replied:false,meeting:false,closed:false,follow_up_date:date,updated_at:new Date().toISOString()};if(current&&current.id){await window.supaFetch('outreach_contacts?id=eq.'+encodeURIComponent(current.id),'PATCH',patch);current=Object.assign({},current,patch);state.outreachByEmail.set(x.recipient,current);return current;}var created=await window.supaFetch('outreach_contacts','POST',patch);current=Array.isArray(created)&&created[0]?created[0]:Object.assign({id:null},patch);state.outreachByEmail.set(x.recipient,current);return current;}

window.PSTOutreachFollowupV1={
  filter:function(v){renderLeft(v);},
  refresh:schedule,
  createDraft:async function(key,btn){var x=findCandidate(key);if(!x)return;var inp=document.getElementById('pst-ofu-date-'+rowKey(x.recipient)),date=text(inp&&inp.value);if(!date){alert('Zgjidh datën e follow-up.');return;}if(date<todayDay()){alert('Data e follow-up nuk mund të jetë në të kaluarën.');return;}var old=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent='Duke krijuar…';}try{await createGmailDraft(x);await saveFollowup(x,date);x.scheduled=true;x.proposed=safeDate(date);x.existing=state.outreachByEmail.get(x.recipient);renderLeft('');alert('Drafti u krijua në Gmail. Emaili nuk është dërguar.');}catch(e){alert('Drafti nuk u krijua: '+(e.message||e));if(btn){btn.disabled=false;btn.textContent=old||'Krijo draft';}}},
  openDrafts:function(){window.open('https://mail.google.com/mail/u/0/#drafts','PRISTEEL_GMAIL');},
  get state(){return state;},
  _test:{buildCandidates:buildCandidates,buildRequestFilter:buildRequestFilter,delayForTouches:delayForTouches,normalizeSubject:normalizeSubject,strongSubject:strongSubject,isAutomatedIncoming:isAutomatedIncoming,companyFromEmail:companyFromEmail}
};

installStyle();
if(typeof window.pstWorkspaceGo==='function'&&!window.pstWorkspaceGo.__pstOutreachFollowupV1){var originalGo=window.pstWorkspaceGo;window.pstWorkspaceGo=function(key){var result=originalGo.apply(this,arguments);if(String(key)==='inbox')schedule();return result;};window.pstWorkspaceGo.__pstOutreachFollowupV1=true;}
setTimeout(function(){var page=document.getElementById('page-workspace-inbox');if(page&&page.style.display!=='none')schedule();},500);
})();
