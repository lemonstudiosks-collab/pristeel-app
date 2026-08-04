/* PRISTEEL lightweight document ↔ project reconciliation
 * Metadata only, chunked during browser idle time. Never blocks opening a project.
 */
(function(){
'use strict';
if(window.__pstProjectDocumentReconciliationLiteLoaded)return;
window.__pstProjectDocumentReconciliationLiteLoaded=true;

var VERSION='20260804-production8';
var STORE='pst_project_document_reconciliation_'+VERSION;
var RUN_EVERY=6*60*60*1000;
var running=null;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/\b(gmbh|shpk|sh\.p\.k|doo|d\.o\.o|llc|ltd|ag|kg|co)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function compact(v){return norm(v).replace(/\s+/g,'');}
function safe(v){if(v==null)return'';if(typeof v==='string')return v.slice(0,2500);try{return JSON.stringify(v).slice(0,2500);}catch(e){return'';}}
function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
function idle(){return new Promise(function(resolve){if('requestIdleCallback' in window)requestIdleCallback(function(){resolve();},{timeout:350});else setTimeout(resolve,20);});}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
async function q(path){try{return arr(await db(path));}catch(e){console.warn('PRISTEEL lite audit query:',path,e);return[];}}
function readStore(){try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch(e){return null;}}
function writeStore(v){try{localStorage.setItem(STORE,JSON.stringify(v));}catch(e){}}

var SPECS=[
 {name:'documents_registry',label:'oferta',select:'id,project_id,project,client,doc_nr,created_at,offer_state',fields:['project','client','doc_nr','offer_state']},
 {name:'invoices_out',label:'fatura dalëse',select:'id,project_id,project,client,invoice_nr,date,created_at',fields:['project','client','invoice_nr']},
 {name:'commercial_adjustments',label:'nota',select:'id,project_id,project,client,document_nr,original_invoice_nr,created_at',fields:['project','client','document_nr','original_invoice_nr']},
 {name:'invoices_in',label:'fatura hyrëse',select:'id,project_id,project,supplier,supplier_invoice_nr,date,created_at',fields:['project','supplier','supplier_invoice_nr']},
 {name:'contracts',label:'kontrata',select:'id,project_id,title,file_name,created_at',fields:['title','file_name']},
 {name:'files',label:'skedarë',select:'id,project_id,file_name,file_type,size_kb,created_at',fields:['file_name','file_type']}
];

function pAlias(p){return{id:String(p.id),raw:p,name:norm(p.name),nameC:compact(p.name),client:norm(p.client),ref:norm(p.ref),refC:compact(p.ref)};}
function rowText(row,spec){return norm(spec.fields.map(function(k){return safe(row[k]);}).join(' '));}
function directProject(row){return norm(row.project||row.project_name||'');}
function clientCounts(projects){var m={};projects.forEach(function(p){if(p.client)m[p.client]=(m[p.client]||0)+1;});return m;}
function score(row,spec,p,counts){
 var text=rowText(row,spec),tc=compact(text),direct=directProject(row),dc=compact(direct),s=0,reason='';
 if(p.refC&&p.refC.length>=4){
  if(dc===p.refC){s=1250;reason='referencë identike';}
  else if(dc.indexOf(p.refC)>-1||tc.indexOf(p.refC)>-1){s=1120;reason='referencë projekti';}
 }
 if(p.nameC&&p.nameC.length>=8){
  if(dc===p.nameC&&s<1200){s=1200;reason='emër identik';}
  else if(dc&&(dc.indexOf(p.nameC)>-1||p.nameC.indexOf(dc)>-1)&&s<1040){s=1040;reason='emër projekti';}
  else if(p.nameC.length>=12&&tc.indexOf(p.nameC)>-1&&s<900){s=900;reason='emër në dokument';}
 }
 var rc=norm(row.client||row.company||'');
 if(p.client&&rc===p.client&&counts[p.client]===1&&s<760){s=760;reason='klient unik';}
 return{score:s,reason:reason};
}
function bestMatch(row,spec,projects,counts){
 var ranked=projects.map(function(p){var x=score(row,spec,p,counts);return{p:p,score:x.score,reason:x.reason};}).sort(function(a,b){return b.score-a.score;});
 var a=ranked[0],b=ranked[1];
 if(!a||a.score<760)return null;
 if(b&&b.score>=760&&a.score-b.score<160)return null;
 return a;
}
async function patch(table,row,p,reason){
 await db(table+'?id=eq.'+enc(row.id),'PATCH',{project_id:p.id});
 row.project_id=p.id;
 try{await db('dismissed_items','POST',{item_type:'document_project_link',item_ref:table+':'+row.id,project_id:p.id,label:row.doc_nr||row.invoice_nr||row.document_nr||row.supplier_invoice_nr||row.file_name||row.title||table,reason:'Lidhje automatike: '+reason,dismissed_by:'system'});}catch(e){}
}
async function processRows(spec,rows,projects,counts,stats){
 for(var i=0;i<rows.length;i++){
  var row=rows[i];
  if(row.project_id){stats.already++;continue;}
  var match=bestMatch(row,spec,projects,counts);
  if(!match){stats.unmatched++;continue;}
  try{await patch(spec.name,row,match.p,match.reason);stats.linked++;}
  catch(e){stats.errors++;console.warn('PRISTEEL lite audit patch:',spec.name,row.id,e);}
  if(i%8===7)await idle();
 }
}
async function linkAdjustmentsByInvoice(rows,invoices,stats){
 var map={};invoices.forEach(function(x){if(x.invoice_nr&&x.project_id)map[compact(x.invoice_nr)]=String(x.project_id);});
 for(var i=0;i<rows.length;i++){
  var r=rows[i];if(r.project_id)continue;var pid=map[compact(r.original_invoice_nr)];if(!pid)continue;
  try{await db('commercial_adjustments?id=eq.'+enc(r.id),'PATCH',{project_id:pid});r.project_id=pid;stats.linked++;}catch(e){stats.errors++;}
  if(i%8===7)await idle();
 }
}
async function run(force){
 if(running)return running;
 var old=readStore();if(!force&&old&&old.at&&Date.now()-old.at<RUN_EVERY)return old;
 running=(async function(){
  var stats={version:VERSION,at:Date.now(),projects:0,scanned:0,linked:0,already:0,unmatched:0,errors:0,tables:{}};
  var raw=await q('projects?select=id,name,client,ref&order=created_at.desc&limit=500');
  var projects=raw.map(pAlias),counts=clientCounts(projects);stats.projects=projects.length;
  var loaded={};
  for(var i=0;i<SPECS.length;i++){
   var spec=SPECS[i];
   var rows=await q(spec.name+'?project_id=is.null&select='+spec.select+'&order=created_at.desc&limit=500');
   loaded[spec.name]=rows;stats.scanned+=rows.length;stats.tables[spec.name]={scanned:rows.length};
   await processRows(spec,rows,projects,counts,stats);
   await idle();
  }
  var linkedInvoices=await q('invoices_out?project_id=not.is.null&select=id,project_id,invoice_nr&limit=1000');
  await linkAdjustmentsByInvoice(loaded.commercial_adjustments||[],linkedInvoices,stats);
  stats.at=Date.now();writeStore(stats);window.__pstDocumentProjectAudit=stats;
  try{window.dispatchEvent(new CustomEvent('pst:document-project-audit',{detail:stats}));}catch(e){}
  console.info('PRISTEEL lightweight document audit:',stats);
  return stats;
 })().finally(function(){running=null;});
 return running;
}
window.pstReconcileProjectDocuments=run;

function start(){
 var tries=0,t=setInterval(function(){
  if(typeof window.supaFetch==='function'){
   clearInterval(t);
   setTimeout(function(){run(false).catch(function(e){console.warn('PRISTEEL lightweight audit:',e);});},5500);
  }else if(++tries>120)clearInterval(t);
 },250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();