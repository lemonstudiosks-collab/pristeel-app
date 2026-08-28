/* PRISTEEL Project Load Stability v2
 * Keeps the full integrity loader as first choice, but prevents an indefinite project-open spinner.
 * On timeout/error, returns a bounded project-specific fallback with the same data shape.
 * Fallback also resolves linked Gmail messages and supplier-offer sources so refreshes do not hide project data.
 */
(function(){
'use strict';
if(window.__pstProjectLoadStabilityV2)return;
window.__pstProjectLoadStabilityV2=true;
if(!window.PSTProjectDataIntegrity||typeof window.PSTProjectDataIntegrity.load!=='function')return;
var original=window.PSTProjectDataIntegrity.load.bind(window.PSTProjectDataIntegrity);
var FULL_WAIT=Number(window.__pstProjectFullWait||3500),READ_WAIT=Number(window.__pstProjectReadWait||1800);
var INTERNAL=['sales@prissteel.com','arianit.vllahiu@prissteel.com','oltian.vllahiu@prissteel.com'];
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function bounded(promise,ms,fallback){return new Promise(function(resolve){var done=false,t=setTimeout(function(){if(done)return;done=true;resolve(fallback);},ms);Promise.resolve(promise).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(v);}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve(fallback);});});}
function q(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return bounded(window.supaFetch(path),READ_WAIT,[]).then(arr);}
function byId(table,id,order){return q(table+'?project_id=eq.'+enc(id)+'&select=*'+(order?'&'+order:'')+'&limit=1500');}
function pattern(v){return'*'+enc(String(v||'').replace(/[*,()]/g,' ').trim())+'*';}
function rowKey(row){return row&&(row.id||row.gmail_message_id||row.document_id||row.doc_nr||row.document_nr||row.invoice_nr||row.file_id||row.drive_file_id||row.file_name||row.filename||row.name||JSON.stringify(row));}
function uniq(rows,key){var seen={};return arr(rows).filter(function(x){var k=String((key||rowKey)(x)||'');if(!k||seen[k])return false;seen[k]=1;return true;});}
function norm(v){return String(v||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9@._+\-]+/g,' ').replace(/\s+/g,' ').trim();}
function flatText(row){if(!row||typeof row!=='object')return norm(row);var fields=['project_id','source_project_id','linked_project_id','project','project_name','project_ref','ref','reference','rfq_ref','request_ref','name','title','subject','description','desc','notes','snippet','file_name','filename','document_name','doc_nr','document_nr','invoice_nr','supplier','supplier_name','origin','source','client','customer','company'];return norm(fields.map(function(k){var v=row[k];return Array.isArray(v)?v.join(' '):(v==null?'':String(v));}).join(' '));}
function email(v){var m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
function external(v){var e=email(v);return e&&INTERNAL.indexOf(e)<0&&!/(no-?reply|mailer-daemon|postmaster|dmarc|calendar-notification)@/i.test(e);}
function ourOffer(row){return String(row&&row.series||'').toUpperCase()==='QUO'||/oferta jone|our offer|pristeel/i.test(String(row&&(row.supplier||row.origin||row.source)||''));}
function supplierOffer(row){if(!row||ourOffer(row))return false;var text=flatText(row),supplier=String(row.supplier||row.supplier_name||row.company||'').trim();return !!supplier||/offer|ofert|angebot|quotation|quote|rfq response|price proposal/i.test(text);}
async function projectNamed(table,id,p){var named=p&&p.name?q(table+'?project=ilike.'+pattern(p.name)+'&select=*&limit=1200'):Promise.resolve([]);var both=await Promise.all([byId(table,id,''),named]);return uniq(both[0].concat(both[1]),rowKey);}
async function linkedEmails(id){
 var pair=await Promise.all([byId('project_emails',id,'order=sent_at.desc'),byId('project_email_links',id,'order=created_at.desc')]);
 var direct=pair[0],links=pair[1],ids=uniq(links,function(x){return x.gmail_message_id;}).map(function(x){return x.gmail_message_id;}).filter(Boolean),jobs=[];
 for(var i=0;i<ids.length;i+=30){var part=ids.slice(i,i+30).map(function(x){return'"'+String(x).replace(/"/g,'')+'"';}).join(',');jobs.push(q('project_emails?gmail_message_id=in.('+part+')&select=*&order=sent_at.desc&limit=1500'));}
 var chunks=await Promise.all(jobs),linked=[].concat.apply([],chunks);
 var rows=uniq(direct.concat(linked),function(x){return x.gmail_message_id||x.id;}).sort(function(a,b){return String(b.sent_at||'').localeCompare(String(a.sent_at||''));});
 return{rows:rows,links:links,linkedOnly:rows.filter(function(x){return String(x.project_id||'')!==String(id);})};
}
function fallbackContacts(saved,mails){
 var map={};
 function add(addr,name,date,role){var e=email(addr);if(!external(e))return;if(!map[e])map[e]={email:e,name:'',company:'',role:'',count:0,last_seen:'',source:'email'};var c=map[e];c.count++;if(name&&!c.name)c.name=String(name).replace(/["<>]/g,'').trim();if(date&&date>c.last_seen)c.last_seen=date;if(role==='cc'&&!c.role)c.role='CC';}
 arr(mails).forEach(function(m){add(m.from_email,m.from_name,m.sent_at,'from');arr(m.to_emails).forEach(function(e){add(e,'',m.sent_at,'to');});arr(m.cc_emails).forEach(function(e){add(e,'',m.sent_at,'cc');});});
 arr(saved).forEach(function(x){var e=email(x.email);if(e)map[e]=Object.assign(map[e]||{email:e,count:0},x,{source:'project_contacts'});});
 Object.keys(map).forEach(function(e){var c=map[e];if(!c.name)c.name=e.split('@')[0].replace(/[._-]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});if(!c.company)c.company=(e.split('@')[1]||'').split('.')[0].replace(/[-_]+/g,' ').replace(/\b\w/g,function(x){return x.toUpperCase();});});
 return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return Number(!!b.is_primary)-Number(!!a.is_primary)||Number(b.count||b.email_count||0)-Number(a.count||a.email_count||0);});
}
async function fallback(id){
 var p=(await q('projects?id=eq.'+enc(id)+'&select=*&limit=1'))[0];
 if(!p)throw new Error('Projekti nuk u gjet.');
 var emP=linkedEmails(id);
 var outP=Promise.all([
   byId('project_contacts',id,''),
   projectNamed('bom_items',id,p),
   projectNamed('rfq_log',id,p),
   projectNamed('offers',id,p),
   projectNamed('documents_registry',id,p),
   projectNamed('invoices_out',id,p),
   projectNamed('invoices_in',id,p),
   projectNamed('commercial_adjustments',id,p),
   projectNamed('project_docs',id,p),
   projectNamed('project_attachment_links',id,p),
   projectNamed('offers_inbox',id,p),
   p.name?q('bank_guarantees?project=ilike.'+pattern(p.name)+'&select=*&limit=500'):Promise.resolve([])
 ]);
 var both=await Promise.all([emP,outP]),em=both[0],out=both[1];
 var emails=em.rows,contacts=fallbackContacts(out[0],emails),offers=out[3],docs=out[4],projectDocs=out[8],attachmentLinks=out[9],inboxDocs=out[10];
 var ours=uniq(docs.filter(ourOffer).concat(offers.filter(ourOffer)),rowKey);
 var suppliers=uniq(offers.concat(inboxDocs,projectDocs,attachmentLinks,docs).filter(supplierOffer),rowKey);
 return{
   project:p,emails:emails,emailLinks:em.links,linkedOnly:em.linkedOnly,contacts:contacts,bom:out[1],rfqs:out[2],offers:offers,
   ourOffers:ours,supplierOffers:suppliers,docs:docs,invoicesOut:out[5],invoicesIn:out[6],adjustments:out[7],
   projectDocs:projectDocs,attachmentLinks:attachmentLinks,inboxDocs:inboxDocs,guarantees:out[11],deals:[],deal:null,
   drive:{rows:[],state:'deferred'},mailAttachments:emails.filter(function(x){return x.has_attachments||arr(x.attachments).length;}),
   files:uniq(docs.concat(projectDocs,attachmentLinks,inboxDocs,emails.filter(function(x){return x.has_attachments||arr(x.attachments).length;})),rowKey),
   integration:{gmailModule:!!(window.PSTEmail&&window.PSTGoogleWorkspaceAuth),gmailLinked:emails.length>0,driveFolder:!!p.drive_folder_id,driveState:'deferred',hubspotCached:false,hubspotBcc:false},
   __stabilityFallback:true
 };
}
async function load(id){
 var timeout;
 var full=new Promise(function(resolve){timeout=setTimeout(function(){resolve({kind:'timeout'});},FULL_WAIT);original(id).then(function(data){clearTimeout(timeout);resolve({kind:'full',data:data});}).catch(function(error){clearTimeout(timeout);resolve({kind:'error',error:error});});});
 var result=await full;
 if(result.kind==='full')return result.data;
 try{return await fallback(id);}catch(e){if(result.error)throw result.error;throw e;}
}
window.PSTProjectDataIntegrity.load=load;
window.PSTProjectLoadStabilityV2={load:load,fallback:fallback};
})();
