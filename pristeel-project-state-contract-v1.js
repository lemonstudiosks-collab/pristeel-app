/* PRISTEEL Project State Contract v1
 * Canonicalizes project workspace snapshots and prevents late/partial modules
 * from shrinking already verified project data during the same browser session.
 * Also reconciles Gmail relations against project_email_links + project_emails
 * before a project snapshot is published.
 */
(function(){
'use strict';
if(window.PSTProjectStateContractV1)return;
if(!window.PSTProjectDataIntegrity||typeof window.PSTProjectDataIntegrity.load!=='function')return;

var baseLoad=window.PSTProjectDataIntegrity.load.bind(window.PSTProjectDataIntegrity);
var critical=['emails','emailLinks','contacts','bom','rfqs','offers','ourOffers','supplierOffers','docs','invoicesOut','invoicesIn','adjustments','projectDocs','attachmentLinks','inboxDocs','guarantees','deals','mailAttachments','files'];
var current=window.__pstIntegrityLastData||null;
var generation=0;

function A(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function pid(d){return String(d&&d.project&&d.project.id||'');}
function rowKey(r){return String(r&&(r.gmail_message_id||r.id||r.document_id||r.doc_nr||r.document_nr||r.invoice_nr||r.file_id||r.drive_file_id||r.file_name||r.filename||r.name)||'');}
function uniq(rows){var m={},out=[];A(rows).forEach(function(r){var k=rowKey(r)||JSON.stringify(r||{});if(m[k])return;m[k]=1;out.push(r);});return out;}
function mergeRows(oldRows,newRows){var newer=uniq(newRows),map={};newer.forEach(function(r){map[rowKey(r)||JSON.stringify(r||{})]=1;});A(oldRows).forEach(function(r){var k=rowKey(r)||JSON.stringify(r||{});if(!map[k]){map[k]=1;newer.push(r);}});return newer;}
function cloneShallow(x){var y={};Object.keys(x||{}).forEach(function(k){y[k]=x[k];});return y;}

function protect(prev,next){
 if(!next||typeof next!=='object')return prev;
 if(!prev||pid(prev)!==pid(next))return next;
 if(next.__pstCanonicalSnapshot===true)return next;
 var out=cloneShallow(next);
 critical.forEach(function(k){var a=A(prev[k]),b=A(next[k]);if(a.length>b.length)out[k]=mergeRows(a,b);});
 out.integration=Object.assign({},prev.integration||{},next.integration||{});
 if(A(out.emails).length)out.integration.gmailLinked=true;
 out.__pstProtectedFromRegression=true;
 return out;
}

function installGlobalGuard(){
 try{
  var d=Object.getOwnPropertyDescriptor(window,'__pstIntegrityLastData');
  if(d&&d.configurable===false)return false;
  Object.defineProperty(window,'__pstIntegrityLastData',{
   configurable:true,enumerable:true,
   get:function(){return current;},
   set:function(v){current=protect(current,v);}
  });
  return true;
 }catch(e){return false;}
}

function bounded(path,ms){
 return new Promise(function(resolve){
  if(typeof window.supaFetch!=='function')return resolve(null);
  var done=false,t=setTimeout(function(){if(done)return;done=true;resolve(null);},ms||4500);
  Promise.resolve(window.supaFetch(path)).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(A(v));}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve(null);});
 });
}
async function retry(path){var r=await bounded(path,4500);if(r!==null)return r;return bounded(path,4500);}

async function reconcileEmails(id,data){
 data=data||{};
 var links=await retry('project_email_links?project_id=eq.'+enc(id)+'&select=*&order=created_at.desc&limit=5000');
 var direct=await retry('project_emails?project_id=eq.'+enc(id)+'&select=*&order=sent_at.desc&limit=3000');
 var linked=[];
 if(links&&links.length){
  var ids=uniq(links).map(function(x){return x.gmail_message_id;}).filter(Boolean);
  for(var i=0;i<ids.length;i+=30){
   var part=ids.slice(i,i+30).map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',');
   var rows=await retry('project_emails?gmail_message_id=in.('+part+')&select=*&order=sent_at.desc&limit=3000');
   if(rows)linked=linked.concat(rows);
  }
 }
 var existing=A(data.emails),emailRows=uniq(existing.concat(direct||[],linked));
 if(links!==null)data.emailLinks=uniq(A(data.emailLinks).concat(links));
 data.emails=emailRows.sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
 data.linkedOnly=data.emails.filter(function(x){return String(x.project_id||'')!==String(id);});
 data.mailAttachments=data.emails.filter(function(x){return x.has_attachments||A(x.attachments).length;});
 data.integration=Object.assign({},data.integration||{},{gmailLinked:data.emails.length>0});
 data.__pstEmailRelationCount=Math.max(A(data.emailLinks).length,data.emails.length);
 data.__pstEmailRelationsComplete=data.emails.length>=A(data.emailLinks).length;
 return data;
}

async function load(id){
 var my=++generation,data=await baseLoad(id);
 data=await reconcileEmails(id,data);
 data.__pstCanonicalSnapshot=true;
 data.__pstSnapshotGeneration=my;
 data.__pstSnapshotAt=new Date().toISOString();
 if(my===generation){current=data;try{window.__pstIntegrityLastData=data;}catch(e){current=data;}}
 return data;
}

installGlobalGuard();
window.PSTProjectDataIntegrity.load=load;
window.PSTProjectStateContractV1={
 load:load,
 get:function(id){return !id||pid(current)===String(id)?current:null;},
 publish:function(data){window.__pstIntegrityLastData=data;return current;},
 reconcileEmails:reconcileEmails,
 protect:protect
};
})();
