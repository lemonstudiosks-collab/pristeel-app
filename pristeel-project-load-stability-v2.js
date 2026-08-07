/* PRISTEEL Project Load Stability v2
 * Keeps the full integrity loader as first choice, but prevents an indefinite project-open spinner.
 * On timeout/error, returns a bounded project-specific fallback with the same data shape.
 */
(function(){
'use strict';
if(window.__pstProjectLoadStabilityV2)return;
window.__pstProjectLoadStabilityV2=true;
if(!window.PSTProjectDataIntegrity||typeof window.PSTProjectDataIntegrity.load!=='function')return;
var original=window.PSTProjectDataIntegrity.load.bind(window.PSTProjectDataIntegrity);
var FULL_WAIT=8500,READ_WAIT=3200;
function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function bounded(promise,ms,fallback){return new Promise(function(resolve){var done=false,t=setTimeout(function(){if(done)return;done=true;resolve(fallback);},ms);Promise.resolve(promise).then(function(v){if(done)return;done=true;clearTimeout(t);resolve(v);}).catch(function(){if(done)return;done=true;clearTimeout(t);resolve(fallback);});});}
function q(path){if(typeof window.supaFetch!=='function')return Promise.resolve([]);return bounded(window.supaFetch(path),READ_WAIT,[]).then(arr);}
function byId(table,id,order){return q(table+'?project_id=eq.'+enc(id)+'&select=*'+(order?'&'+order:'')+'&limit=1500');}
function pattern(v){return'*'+enc(String(v||'').replace(/[*,()]/g,' ').trim())+'*';}
async function projectNamed(table,id,p){var direct=await byId(table,id,'');if(direct.length)return direct;if(!p||!p.name)return[];return q(table+'?project=ilike.'+pattern(p.name)+'&select=*&limit=1200');}
async function fallback(id){
 var p=(await q('projects?id=eq.'+enc(id)+'&select=*&limit=1'))[0];
 if(!p)throw new Error('Projekti nuk u gjet.');
 var out=await Promise.all([
   byId('project_emails',id,'order=sent_at.desc'),
   byId('project_email_links',id,'order=created_at.desc'),
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
 var contacts=out[2],emails=out[0],offers=out[5],docs=out[6],projectDocs=out[10],attachmentLinks=out[11],inboxDocs=out[12];
 return{
   project:p,emails:emails,emailLinks:out[1],linkedOnly:[],contacts:contacts,bom:out[3],rfqs:out[4],offers:offers,
   ourOffers:docs.filter(function(x){return String(x.series||'').toUpperCase()==='QUO';}),
   supplierOffers:offers.concat(inboxDocs),docs:docs,invoicesOut:out[7],invoicesIn:out[8],adjustments:out[9],
   projectDocs:projectDocs,attachmentLinks:attachmentLinks,inboxDocs:inboxDocs,guarantees:out[13],deals:[],deal:null,
   drive:{rows:[],state:'deferred'},mailAttachments:emails.filter(function(x){return x.has_attachments;}),
   files:docs.concat(projectDocs,attachmentLinks,inboxDocs),
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
