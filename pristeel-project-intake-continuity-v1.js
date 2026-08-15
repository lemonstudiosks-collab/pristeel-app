/* PRISTEEL project intake continuity v1
 * Repairs confirmed Gmail-thread continuity after the explicit Gmail+Drive auth gate.
 * A thread is normalized only when all existing project relations point to one project.
 * Reconstructs missing RFQ history only from confirmed single-project outgoing RFQ messages
 * sent to a recipient already evidenced as a supplier/RFQ recipient in PPPP.
 * Also removes non-file offers_inbox rows from the project Files view.
 * No outbound mail, no automatic cross-project reassignment, no interactive OAuth, no polling.
 */
(function(){
'use strict';
if(window.__pstProjectIntakeContinuityV1)return;
window.__pstProjectIntakeContinuityV1=true;

var autoRuns={};
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
function activeProjectId(id){return String(id||window.__pstCurrentProjectId||window._curProjId||(window.__pstIntegrityLastData&&window.__pstIntegrityLastData.project&&window.__pstIntegrityLastData.project.id)||'');}
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
function rfqLike(meta){
  if(!meta||meta.direction!=='outgoing')return false;
  var subject=String(meta.subject||'').trim();
  if(/^(re|aw)\s*:/i.test(subject))return false;
  return /^(fwd?|wg)\s*:/i.test(subject)&&/(zahtev|zahtjev|ponud|quotation|quote|rfq|anfrage|upit|ofert)/i.test(subject)||/\b(rfq|request for quotation|request for quote|anfrage|upit za ponudu|zahtev za ponudu|zahtjev za ponudu|kerkese per oferte|kërkesë për ofertë)\b/i.test(subject);
}
function supplierRole(v){return /supplier|vendor|furnitor|prodhues|manufacturer|fabricator/i.test(String(v||''));}
async function supplierIdentity(projectId,email){
  var old=await safe('rfq_log?supplier_email=eq.'+enc(email)+'&supplier_name=not.is.null&select=supplier_name&order=sent_at.desc&limit=1');
  if(old[0]&&old[0].supplier_name)return{trusted:true,name:String(old[0].supplier_name),source:'rfq-history'};
  var c=await safe('contacts?email=eq.'+enc(email)+'&select=person,company,kind,role&limit=1');
  if(c[0]&&supplierRole([c[0].kind,c[0].role].join(' ')))return{trusted:true,name:String(c[0].company||c[0].person||email),source:'supplier-contact'};
  var pc=await safe('project_contacts?project_id=eq.'+enc(projectId)+'&email=eq.'+enc(email)+'&select=name,company,role&limit=1');
  if(pc[0]&&supplierRole(pc[0].role))return{trusted:true,name:String(pc[0].company||pc[0].name||email),source:'project-supplier-contact'};
  return{trusted:false,name:'',source:'none'};
}
async function recoverRfqs(projectId,projectName,meta){
  if(!rfqLike(meta))return 0;
  var P=window.PSTEmail||{},targets=uniq(arr(meta.to_emails).filter(function(e){return !(typeof P.isInternal==='function'&&P.isInternal(e));})),added=0;
  for(var i=0;i<targets.length;i++){
    var email=targets[i],dupe=await safe('rfq_log?project_id=eq.'+enc(projectId)+'&supplier_email=eq.'+enc(email)+'&sent_at=eq.'+enc(meta.sent_at)+'&select=id&limit=1');
    if(dupe.length)continue;
    var identity=await supplierIdentity(projectId,email);if(!identity.trusted)continue;
    try{
      await db('rfq_log','POST',{project_id:projectId,project_name:projectName||null,supplier_name:identity.name,supplier_email:email,subject:meta.subject||null,body:meta.snippet||null,sent_at:meta.sent_at||new Date().toISOString(),status:'sent',followup_count:0,notes:'Recovered from confirmed Gmail thread '+String(meta.gmail_thread_id||'')+'; supplier evidence: '+identity.source});
      added++;
    }catch(e){console.warn('PRISTEEL continuity RFQ:',e);}
  }
  return added;
}
async function normalizeThread(projectId,threadId,token,projectName){
  var owners=await threadOwners(threadId);
  if(owners.length!==1||String(owners[0])!==String(projectId))return{threadId:threadId,blocked:true,added:0,updated:0,attachments:0,rfqs:0};
  var P=window.PSTEmail;if(!P||typeof P.gmail!=='function')throw new Error('Gmail core nuk është gati.');
  if(!token)return{threadId:threadId,blocked:false,added:0,updated:0,attachments:0,rfqs:0,skipped:'auth-required'};
  var thread=await P.gmail('/threads/'+enc(threadId)+'?format=full',token),messages=arr(thread&&thread.messages),existing=await safe('project_emails?gmail_thread_id=eq.'+enc(threadId)+'&select=id,gmail_message_id,project_id,match_method,has_attachments&limit=5000'),by={};
  existing.forEach(function(x){if(x.gmail_message_id)by[String(x.gmail_message_id)]=x;});
  var result={threadId:threadId,blocked:false,added:0,updated:0,attachments:0,rfqs:0};
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
    result.rfqs+=await recoverRfqs(projectId,projectName,meta);
  }
  return result;
}
async function normalizeProjectThreads(projectId,token){
  projectId=String(projectId||'');if(!projectId)return{threads:0,added:0,updated:0,blocked:0,attachments:0,rfqs:0};
  var P=window.PSTEmail;if(!P||typeof P.gmail!=='function')return{threads:0,added:0,updated:0,blocked:0,attachments:0,rfqs:0,skipped:'gmail-not-ready'};
  token=token||currentGmailToken();if(!token)return{threads:0,added:0,updated:0,blocked:0,attachments:0,rfqs:0,skipped:'auth-required'};
  var rel=await safe('project_email_links?project_id=eq.'+enc(projectId)+'&select=gmail_thread_id&limit=5000'),direct=await safe('project_emails?project_id=eq.'+enc(projectId)+'&select=gmail_thread_id&limit=5000'),threads=uniq(rel.concat(direct).map(function(x){return x.gmail_thread_id;}));
  if(!threads.length)return{threads:0,added:0,updated:0,blocked:0,attachments:0,rfqs:0};
  var project=await safe('projects?id=eq.'+enc(projectId)+'&select=name&limit=1'),projectName=project[0]&&project[0].name||'',sum={threads:threads.length,added:0,updated:0,blocked:0,attachments:0,rfqs:0};
  for(var i=0;i<threads.length;i++){
    var r=await normalizeThread(projectId,threads[i],token,projectName);sum.added+=r.added;sum.updated+=r.updated;sum.attachments+=r.attachments;sum.rfqs+=r.rfqs||0;if(r.blocked)sum.blocked++;
  }
  if(typeof window.pstSyncProjectContacts==='function')try{await window.pstSyncProjectContacts(projectId);}catch(e){console.warn('PRISTEEL continuity contacts:',e);}
  return sum;
}
async function autoReconcile(projectId){
  var id=activeProjectId(projectId),token=currentGmailToken();if(!id||!token)return{skipped:'auth-required'};
  var now=Date.now(),cached=autoRuns[id];if(cached&&now-cached.at<12000)return cached.promise;
  var promise=(async function(){
    var result=await normalizeProjectThreads(id,token),I=window.PSTProjectDataIntegrity;
    if(I&&typeof I.load==='function'){
      try{var fresh=await I.load(id);if(fresh){window.__pstIntegrityLastData=fresh;if(activeProjectId()===id&&window.PSTProjectFirstV2&&typeof window.PSTProjectFirstV2.render==='function')window.PSTProjectFirstV2.render();}}
      catch(e){console.warn('PRISTEEL continuity refresh:',e);}
    }
    return result;
  })().catch(function(e){console.warn('PRISTEEL project auto reconcile:',e);return{error:String(e&&e.message||e)};});
  autoRuns[id]={at:now,promise:promise};return promise;
}
function wrapWorkspaceOpen(){
  var base=window.pstOpenProjectWorkspace;if(typeof base!=='function'||base.__pstIntakeContinuityAuto)return false;
  function wrapped(id){var pid=activeProjectId(id),out=base.apply(this,arguments);setTimeout(function(){autoReconcile(pid);},180);return out;}
  wrapped.__pstIntakeContinuityAuto=true;wrapped.__base=base;window.pstOpenProjectWorkspace=wrapped;return true;
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
function install(){wrapIntegrity();wrapWorkspaceOpen();}
install();
document.addEventListener('pst:modules-ready',function(){install();setTimeout(function(){autoReconcile(activeProjectId());},350);},{once:true});
setTimeout(install,250);setTimeout(install,1200);setTimeout(function(){install();autoReconcile(activeProjectId());},2200);
window.PSTProjectIntakeContinuityV1={install:install,normalizeProjectThreads:normalizeProjectThreads,autoReconcile:autoReconcile,_test:{hasAttachment:hasAttachment,fileBearing:fileBearing,currentGmailToken:currentGmailToken,fullMeta:fullMeta,threadOwners:threadOwners,rfqLike:rfqLike,supplierIdentity:supplierIdentity,recoverRfqs:recoverRfqs,normalizeThread:normalizeThread}};
})();