/* PRISTEEL project intake continuity v1
 * Repairs confirmed Gmail-thread continuity after the explicit Gmail+Drive auth gate.
 * A thread is normalized only when all existing project relations point to one project.
 * Also removes non-file offers_inbox rows from the project Files view.
 * No outbound mail, no automatic cross-project reassignment, no interactive OAuth, no polling.
 */
(function(){
'use strict';
if(window.__pstProjectIntakeContinuityV1)return;
window.__pstProjectIntakeContinuityV1=true;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function uniq(v){var seen={};return arr(v).map(function(x){return String(x||'');}).filter(function(x){if(!x||seen[x])return false;seen[x]=1;return true;});}
function hdr(payload,name){var hs=payload&&payload.headers||[],q=String(name||'').toLowerCase();for(var i=0;i<hs.length;i++)if(String(hs[i].name||'').toLowerCase()===q)return hs[i].value||'';return'';}
function hasAttachment(part){if(!part)return false;if(String(part.filename||'').trim()&&part.body&&(part.body.attachmentId||part.body.data))return true;return arr(part.parts).some(hasAttachment);}
function key(row){return String(row&&(row.id||row.gmail_message_id||row.document_id||row.doc_nr||row.document_nr||row.file_id||row.drive_file_id||row.file_name||row.filename||row.name)||'');}
function fileBearing(row){
  if(!row||typeof row!=='object')return false;
  return !!String(row.file_name||row.filename||row.name||row.document_name||row.drive_file_id||row.file_id||row.document_id||row.file_url||row.drive_url||row.webViewLink||row.web_view_link||'').trim()||
    !!(row.file_base64&&String(row.file_base64).length>20);
}
function currentGmailToken(){
  var G=window.PSTGoogleWorkspaceAuth;
  try{
    if(G){var scopes=[G.gmailScope].filter(Boolean);if(typeof G.cachedToken==='function')return G.cachedToken(scopes)||'';if(typeof G.currentToken==='function')return G.currentToken(scopes)||'';}
  }catch(e){}
  var P=window.PSTEmail;if(P&&P.token&&Date.now()<Number(P.tokenExp||0))return P.token;
  return'';
}
async function safe(path){try{return arr(await window.supaFetch(path));}catch(e){return[];}}
async function db(path,method,body){return window.supaFetch(path,method,body);}
function fullMeta(message){
  var P=window.PSTEmail||{},payload=message&&message.payload||{},from=hdr(payload,'From'),fromEmail=typeof P.norm==='function'?P.norm(from):'',to=typeof P.emails==='function'?P.emails(hdr(payload,'To')):[],cc=typeof P.emails==='function'?P.emails(hdr(payload,'Cc')):[];
  var rawDate=hdr(payload,'Date'),parsed=rawDate?Date.parse(rawDate):NaN,sent=!isNaN(parsed)?new Date(parsed).toISOString():(message.internalDate?new Date(parseInt(message.internalDate,10)).toISOString():new Date().toISOString());
  var internal=typeof P.isInternal==='function'?P.isInternal(fromEmail):false;
  return{
    gmail_message_id:message.id,
    gmail_thread_id:message.threadId,
    rfc822_message_id:hdr(payload,'Message-ID')||null,
    from_email:fromEmail||null,
    from_name:from&&fromEmail?from.replace(new RegExp('<'+fromEmail.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'>','i'),'').replace(/["<>]/g,'').trim():from,
    to_emails:to,
    cc_emails:cc,
    subject:hdr(payload,'Subject')||'(pa subjekt)',
    snippet:message.snippet||'',
    sent_at:sent,
    direction:internal?'outgoing':'incoming',
    has_attachments:hasAttachment(payload),
    gmail_url:typeof P.gmailUrl==='function'?P.gmailUrl(message.threadId):('https://mail.google.com/mail/u/0/#all/'+enc(message.threadId||message.id))
  };
}
async function threadOwners(threadId){
  var a=await safe('project_email_links?gmail_thread_id=eq.'+enc(threadId)+'&select=project_id&limit=5000');
  var b=await safe('project_emails?gmail_thread_id=eq.'+enc(threadId)+'&project_id=not.is.null&select=project_id&limit=5000');
  return uniq(a.concat(b).map(function(x){return x.project_id;}));
}
async function normalizeThread(projectId,threadId,token){
  var owners=await threadOwners(threadId);
  if(owners.length!==1||String(owners[0])!==String(projectId))return{threadId:threadId,blocked:true,added:0,updated:0,attachments:0};
  var P=window.PSTEmail;if(!P||typeof P.gmail!=='function')throw new Error('Gmail core nuk është gati.');
  if(!token)return{threadId:threadId,blocked:false,added:0,updated:0,attachments:0,skipped:'auth-required'};
  var thread=await P.gmail('/threads/'+enc(threadId)+'?format=full',token),messages=arr(thread&&thread.messages),existing=await safe('project_emails?gmail_thread_id=eq.'+enc(threadId)+'&select=id,gmail_message_id,project_id,match_method,has_attachments&limit=5000'),by={};
  existing.forEach(function(x){if(x.gmail_message_id)by[String(x.gmail_message_id)]=x;});
  var result={threadId:threadId,blocked:false,added:0,updated:0,attachments:0};
  for(var i=0;i<messages.length;i++){
    var meta=fullMeta(messages[i]),old=by[String(meta.gmail_message_id)]||null,now=new Date().toISOString();
    if(meta.has_attachments)result.attachments++;
    if(old&&old.project_id&&String(old.project_id)!==String(projectId)){result.blocked=true;continue;}
    if(!old){
      await db('project_emails','POST',[Object.assign({},meta,{project_id:projectId,suggested_project_id:projectId,match_method:'confirmed-thread-recovery',match_confidence:100,needs_review:false,review_reason:null,updated_at:now})]);
      result.added++;
    }else{
      var patch={has_attachments:!!meta.has_attachments,gmail_url:meta.gmail_url,updated_at:now};
      if(!old.project_id){patch.project_id=projectId;patch.suggested_project_id=projectId;patch.match_method='confirmed-thread-recovery';patch.match_confidence=100;patch.needs_review=false;patch.review_reason=null;}
      await db('project_emails?id=eq.'+enc(old.id),'PATCH',patch);result.updated++;
    }
    var links=await safe('project_email_links?project_id=eq.'+enc(projectId)+'&gmail_message_id=eq.'+enc(meta.gmail_message_id)+'&select=id&limit=1');
    if(!links.length)try{await db('project_email_links','POST',{project_id:projectId,gmail_message_id:meta.gmail_message_id,gmail_thread_id:meta.gmail_thread_id,link_method:'confirmed-thread-recovery',confidence:100,created_at:now});}catch(e){console.warn('PRISTEEL continuity relation:',e);}
  }
  return result;
}
async function normalizeProjectThreads(projectId,token){
  projectId=String(projectId||'');if(!projectId)return{threads:0,added:0,updated:0,blocked:0,attachments:0};
  var P=window.PSTEmail;if(!P||typeof P.gmail!=='function')return{threads:0,added:0,updated:0,blocked:0,attachments:0,skipped:'gmail-not-ready'};
  token=token||currentGmailToken();if(!token)return{threads:0,added:0,updated:0,blocked:0,attachments:0,skipped:'auth-required'};
  var rel=await safe('project_email_links?project_id=eq.'+enc(projectId)+'&select=gmail_thread_id&limit=5000'),direct=await safe('project_emails?project_id=eq.'+enc(projectId)+'&select=gmail_thread_id&limit=5000'),threads=uniq(rel.concat(direct).map(function(x){return x.gmail_thread_id;}));
  if(!threads.length)return{threads:0,added:0,updated:0,blocked:0,attachments:0};
  var sum={threads:threads.length,added:0,updated:0,blocked:0,attachments:0};
  for(var i=0;i<threads.length;i++){
    var r=await normalizeThread(projectId,threads[i],token);sum.added+=r.added;sum.updated+=r.updated;sum.attachments+=r.attachments;if(r.blocked)sum.blocked++;
  }
  if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(projectId);}catch(e){console.warn('PRISTEEL continuity contacts:',e);}
  return sum;
}
function wrapIntegrity(){
  var I=window.PSTProjectDataIntegrity;if(!I||typeof I.load!=='function'||I.load.__pstIntakeContinuity)return false;
  var base=I.load;
  async function load(){
    var data=await base.apply(this,arguments),inbox=arr(data&&data.inboxDocs),phantom={};
    inbox.filter(function(x){return!fileBearing(x);}).forEach(function(x){var k=key(x);if(k)phantom[k]=1;});
    if(data){data.inboxDocs=inbox.filter(fileBearing);data.files=arr(data.files).filter(function(x){var k=key(x);return !(k&&phantom[k]&&!fileBearing(x));});}
    return data;
  }
  load.__pstIntakeContinuity=true;load.__base=base;I.load=load;return true;
}
function install(){wrapIntegrity();}
install();
document.addEventListener('pst:modules-ready',install,{once:true});
setTimeout(install,250);setTimeout(install,1200);
window.PSTProjectIntakeContinuityV1={install:install,normalizeProjectThreads:normalizeProjectThreads,_test:{hasAttachment:hasAttachment,fileBearing:fileBearing,currentGmailToken:currentGmailToken,fullMeta:fullMeta,threadOwners:threadOwners,normalizeThread:normalizeThread}};
})();