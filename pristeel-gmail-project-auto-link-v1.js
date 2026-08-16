/* PRISTEEL Gmail project auto-link v1
 * Completes Gmail -> project continuity without creating a second matcher.
 * Reuses PSTGmailProjectIdentityGuardV1 as the authoritative project-identity classifier.
 *
 * Automatic writes are deliberately narrow:
 * - only projectless/unlinked emails may receive a project_id;
 * - strong unique project identity may auto-link;
 * - an already-confirmed single-project thread may continue to that same project;
 * - mixed/unknown identities remain unlinked for review;
 * - an email already linked to any project is never reassigned here.
 *
 * Also reconciles historical projectless project_emails already stored in PPPP.
 * No project creation, no outbound mail, no OAuth popup, no polling, no MutationObserver.
 */
(function(){
'use strict';
if(window.__pstGmailProjectAutoLinkV1)return;
window.__pstGmailProjectAutoLinkV1=true;

var state={busy:false,promise:null,index:null,indexAt:0,guardPromise:null};
function arr(v){return Array.isArray(v)?v:[];}
function str(v){return String(v==null?'':v);}
function enc(v){return encodeURIComponent(str(v));}
function uniq(v){var m={};return arr(v).map(function(x){return str(x).trim();}).filter(function(x){if(!x||m[x])return false;m[x]=1;return true;});}
function safe(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return Promise.resolve(window.supaFetch(path)).then(arr).catch(function(e){if(window.console&&console.warn)console.warn('PRISTEEL Gmail auto-link read:',e&&e.message);return[];});}
function db(path,method,body){return window.supaFetch(path,method,body);}
function inFilter(field,values){values=uniq(values);return field+'=in.('+values.map(function(x){return'"'+str(x).replace(/"/g,'')+'"';}).join(',')+')';}
function systemMail(row){var s=(str(row&&row.subject)+' '+str(row&&row.snippet)).toLowerCase();return /delivery status notification|mail delivery subsystem|mailer-daemon|postmaster|undeliverable|calendar notification|hubspot notification/.test(s);}
function rowCorpus(row,files){return[str(row&&row.subject),str(row&&row.snippet)].concat(arr(files)).join(' ');}
function addOwner(map,threadId,projectId){threadId=str(threadId);projectId=str(projectId);if(!threadId||!projectId)return;if(!map[threadId])map[threadId]=[];if(map[threadId].indexOf(projectId)<0)map[threadId].push(projectId);}
function ownerMap(rows,links){var out={};arr(rows).forEach(function(r){if(r&&r.project_id)addOwner(out,r.gmail_thread_id,r.project_id);});arr(links).forEach(function(r){if(r&&r.project_id)addOwner(out,r.gmail_thread_id,r.project_id);});return out;}
function tools(){var G=window.PSTGmailProjectIdentityGuardV1,T=G&&G._test;return T&&typeof T.buildIndex==='function'&&typeof T.classifyCorpus==='function'?T:null;}
function ensureGuard(){
  if(tools())return Promise.resolve(tools());
  if(state.guardPromise)return state.guardPromise;
  state.guardPromise=new Promise(function(resolve){
    var done=false;
    function finish(){var T=tools();if(T&&!done){done=true;resolve(T);}}
    var s=[].slice.call(document.querySelectorAll('script')).filter(function(x){return /pristeel-gmail-project-identity-guard-v1\.js/.test(str(x.src));})[0];
    if(!s){s=document.createElement('script');s.src='pristeel-gmail-project-identity-guard-v1.js?v=20260816-autolink1';s.defer=true;s.setAttribute('data-pst-gmail-project-identity-guard-autolink','1');document.head.appendChild(s);}
    s.addEventListener('load',finish,{once:true});
    s.addEventListener('error',function(){if(!done){done=true;resolve(null);}},{once:true});
    [0,120,420,900].forEach(function(ms){setTimeout(function(){if(done)return;finish();if(ms===900&&!done){done=true;resolve(null);}},ms);});
  });
  return state.guardPromise;
}
async function identityIndex(force){
  var T=await ensureGuard();if(!T)return null;
  if(!force&&state.index&&Date.now()-state.indexAt<60000)return state.index;
  var projects=await safe('projects?select=id,name,client,ref,business_ref,status&order=created_at.desc&limit=2000');
  state.index=T.buildIndex(projects);state.indexAt=Date.now();return state.index;
}
function classify(row,index,owners,files,allowThread){
  var T=tools();if(!T||!index||!row||systemMail(row))return{target:'',method:'',reason:'skip'};
  var r=T.classifyCorpus(rowCorpus(row,files),index),tid=str(row.gmail_thread_id),threadOwners=arr(owners&&owners[tid]);
  if(!r||r.mixed)return{target:'',method:'',reason:'mixed'};
  if(arr(r.hits).length===1){
    var target=str(r.hits[0]&&r.hits[0].project&&r.hits[0].project.id);
    if(!target)return{target:'',method:'',reason:'no-target'};
    if(threadOwners.length&&!(threadOwners.length===1&&threadOwners[0]===target))return{target:'',method:'',reason:'thread-conflict'};
    return{target:target,method:'identity-auto-link-v1',reason:'strong-identity'};
  }
  if(arr(r.unknownRefs).length)return{target:'',method:'',reason:'unknown-reference'};
  if(allowThread&&threadOwners.length===1)return{target:threadOwners[0],method:'confirmed-thread-auto-link-v1',reason:'single-project-thread'};
  return{target:'',method:'',reason:'insufficient-identity'};
}
async function ensureRelation(row,target,method,knownLinks){
  var mid=str(row&&row.gmail_message_id);if(!mid||!target)return false;
  var k=target+'|'+mid;if(knownLinks&&knownLinks[k])return false;
  if(!knownLinks){var old=await safe('project_email_links?project_id=eq.'+enc(target)+'&gmail_message_id=eq.'+enc(mid)+'&select=id&limit=1');if(old.length)return false;}
  try{await db('project_email_links','POST',{project_id:target,gmail_message_id:mid,gmail_thread_id:row.gmail_thread_id||null,link_method:method,confidence:100,created_at:new Date().toISOString()});if(knownLinks)knownLinks[k]=1;return true;}catch(e){if(window.console&&console.warn)console.warn('PRISTEEL Gmail auto-link relation:',e&&e.message);return false;}
}
async function linkExistingRow(row,decision,owners,knownLinks){
  if(!row||row.project_id||!decision||!decision.target)return false;
  var now=new Date().toISOString();
  await db('project_emails?id=eq.'+enc(row.id),'PATCH',{project_id:decision.target,suggested_project_id:decision.target,match_method:decision.method,match_confidence:100,needs_review:false,review_reason:null,updated_at:now});
  row.project_id=decision.target;row.suggested_project_id=decision.target;row.match_method=decision.method;row.match_confidence=100;
  addOwner(owners,row.gmail_thread_id,decision.target);await ensureRelation(row,decision.target,decision.method,knownLinks);return true;
}
function messageRow(m,target,method){return{
  gmail_message_id:m.gmail_message_id,gmail_thread_id:m.gmail_thread_id||null,rfc822_message_id:m.rfc822_message_id||null,
  from_email:m.from_email||null,from_name:m.from_name||null,to_emails:arr(m.to_emails),cc_emails:arr(m.cc_emails),subject:m.subject||'(pa subjekt)',snippet:m.snippet||'',
  sent_at:m.sent_at||new Date().toISOString(),direction:m.direction||null,has_attachments:!!m.has_attachments,gmail_url:m.gmail_url||null,
  project_id:target,suggested_project_id:target,match_method:method,match_confidence:100,needs_review:false,review_reason:null,updated_at:new Date().toISOString()
};}
async function reconcileMessages(messages){
  messages=arr(messages).filter(function(x){return x&&x.gmail_message_id;});if(!messages.length)return{checked:0,linked:0,strong:0,thread:0,conflicts:0};
  var index=await identityIndex(false);if(!index)return{checked:messages.length,linked:0,skipped:'identity-guard-not-ready'};
  var mids=uniq(messages.map(function(x){return x.gmail_message_id;})),tids=uniq(messages.map(function(x){return x.gmail_thread_id;}).filter(Boolean)),existing=[],ownerRows=[],links=[];
  for(var a=0;a<mids.length;a+=40)existing=existing.concat(await safe('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,match_method,subject,snippet&'+inFilter('gmail_message_id',mids.slice(a,a+40))));
  for(var b=0;b<tids.length;b+=35){ownerRows=ownerRows.concat(await safe('project_emails?select=gmail_thread_id,project_id&project_id=not.is.null&'+inFilter('gmail_thread_id',tids.slice(b,b+35))+'&limit=5000'));links=links.concat(await safe('project_email_links?select=gmail_thread_id,gmail_message_id,project_id&'+inFilter('gmail_thread_id',tids.slice(b,b+35))+'&limit=5000'));}
  var byMid={},owners=ownerMap(ownerRows,links),knownLinks={};existing.forEach(function(x){byMid[str(x.gmail_message_id)]=x;});links.forEach(function(x){if(x.project_id&&x.gmail_message_id)knownLinks[str(x.project_id)+'|'+str(x.gmail_message_id)]=1;});
  var sum={checked:messages.length,linked:0,strong:0,thread:0,conflicts:0};
  for(var i=0;i<messages.length;i++){
    var m=messages[i],old=byMid[str(m.gmail_message_id)];if(old&&old.project_id)continue;
    var d=classify(m,index,owners,[],true);if(!d.target){if(d.reason==='mixed'||d.reason==='thread-conflict')sum.conflicts++;continue;}
    if(old){if(await linkExistingRow(old,d,owners,knownLinks)){sum.linked++;if(d.reason==='strong-identity')sum.strong++;else sum.thread++;}}
    else{
      var made=messageRow(m,d.target,d.method);await db('project_emails','POST',[made]);addOwner(owners,m.gmail_thread_id,d.target);await ensureRelation(m,d.target,d.method,knownLinks);sum.linked++;if(d.reason==='strong-identity')sum.strong++;else sum.thread++;
    }
  }
  return sum;
}
async function reconcileHistorical(){
  if(state.busy)return state.promise||Promise.resolve({skipped:'busy'});
  state.busy=true;state.promise=(async function(){
    var index=await identityIndex(true);if(!index)return{checked:0,linked:0,skipped:'identity-guard-not-ready'};
    var rows=await safe('project_emails?select=id,gmail_message_id,gmail_thread_id,project_id,suggested_project_id,subject,snippet,match_method,match_confidence,needs_review&order=sent_at.asc&limit=5000');
    var links=await safe('project_email_links?select=gmail_thread_id,gmail_message_id,project_id&limit=10000');
    var inbox=await safe('offers_inbox?select=gmail_msg_id,file_name&limit=5000'),filesByMid={};
    inbox.forEach(function(x){var mid=str(x&&x.gmail_msg_id),fn=str(x&&x.file_name);if(mid&&fn){if(!filesByMid[mid])filesByMid[mid]=[];filesByMid[mid].push(fn);}});
    var owners=ownerMap(rows,links),knownLinks={};links.forEach(function(x){if(x.project_id&&x.gmail_message_id)knownLinks[str(x.project_id)+'|'+str(x.gmail_message_id)]=1;});
    var pending=rows.filter(function(x){return x&&!x.project_id;}),sum={checked:pending.length,linked:0,strong:0,thread:0,conflicts:0,remaining:0};
    for(var i=0;i<pending.length;i++){
      var r=pending[i],d=classify(r,index,owners,filesByMid[str(r.gmail_message_id)]||[],false);if(!d.target){if(d.reason==='mixed'||d.reason==='thread-conflict')sum.conflicts++;continue;}
      if(await linkExistingRow(r,d,owners,knownLinks)){sum.linked++;sum.strong++;}
    }
    for(var j=0;j<pending.length;j++){
      var r2=pending[j];if(r2.project_id)continue;var d2=classify(r2,index,owners,filesByMid[str(r2.gmail_message_id)]||[],true);if(!d2.target||d2.reason!=='single-project-thread')continue;
      if(await linkExistingRow(r2,d2,owners,knownLinks)){sum.linked++;sum.thread++;}
    }
    sum.remaining=pending.filter(function(x){return !x.project_id;}).length;return sum;
  })().catch(function(e){if(window.console&&console.warn)console.warn('PRISTEEL historical Gmail auto-link:',e);return{error:str(e&&e.message||e)};}).finally(function(){state.busy=false;state.promise=null;});
  return state.promise;
}
function safeProfiles(profiles){return arr(profiles).map(function(x){var y=Object.assign({},x);y.emails=[];y.tokens=[];return y;});}
function wrapEmailSave(){
  var E=window.PSTEmail;if(!E||typeof E.save!=='function'||E.save.__pstProjectAutoLink)return false;var base=E.save;
  async function wrapped(messages,profiles){var out=await base.call(this,messages,safeProfiles(profiles));try{await reconcileMessages(messages);}catch(e){if(window.console&&console.warn)console.warn('PRISTEEL post-sync project auto-link:',e);}return out;}
  wrapped.__pstProjectAutoLink=true;wrapped.__base=base;E.save=wrapped;return true;
}
function install(){wrapEmailSave();}
install();
[120,500,1400].forEach(function(ms){setTimeout(install,ms);});
document.addEventListener('pst:modules-ready',function(){install();setTimeout(function(){reconcileHistorical();},320);},{once:true});
window.addEventListener('pst:gmail-synced',function(){setTimeout(function(){reconcileHistorical();},80);});
window.PSTGmailProjectAutoLinkV1={install:install,reconcileHistorical:reconcileHistorical,reconcileMessages:reconcileMessages,_test:{classify:classify,ownerMap:ownerMap,safeProfiles:safeProfiles,systemMail:systemMail,rowCorpus:rowCorpus,identityIndex:identityIndex}};
})();