/* PRISTEEL document ↔ project reconciliation
 * Links high-confidence historical documents to the correct project_id.
 * Existing valid links are never overwritten.
 */
(function(){
'use strict';
if(window.__pstProjectDocumentReconciliationLoaded)return;
window.__pstProjectDocumentReconciliationLoaded=true;

var VERSION='20260804-production7';
var STORE='pst_project_document_reconciliation_'+VERSION;
var RUN_EVERY=6*60*60*1000;
var running=null,openWrapped=false;

function arr(v){return Array.isArray(v)?v:[];}
function enc(v){return encodeURIComponent(String(v==null?'':v));}
function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/\b(gmbh|shpk|sh\.p\.k|doo|d\.o\.o|llc|ltd|ag|kg|co)\b/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
function compact(v){return norm(v).replace(/\s+/g,'');}
function uniq(a){var o={};return arr(a).filter(function(x){x=String(x||'').trim();if(!x||o[x])return false;o[x]=1;return true;});}
function json(v){if(typeof v!=='string')return v;try{return JSON.parse(v);}catch(e){return v;}}
function safeString(v){if(v==null)return'';if(typeof v==='string')return v.length>3000?v.slice(0,3000):v;if(typeof v==='number'||typeof v==='boolean')return String(v);try{return JSON.stringify(v).slice(0,5000);}catch(e){return'';}}
function rowText(r){var keys=['project','project_name','project_ref','ref','reference','offer_ref','invoice_ref','source_ref','doc_nr','invoice_nr','supplier_invoice_nr','original_invoice_nr','client','supplier','company','contact','description','title','notes','subject','offer_state','invoice_state','items','metadata','data'];return norm(keys.map(function(k){return safeString(r&&r[k]);}).join(' '));}
function directProjectText(r){return norm((r&&r.project)|| (r&&r.project_name)|| (r&&r.project_ref)||'');}
function currentUser(){try{var s=JSON.parse(localStorage.getItem('pristeel_session')||'{}');return s.email||'admin';}catch(e){return'admin';}}
function readStore(){try{return JSON.parse(localStorage.getItem(STORE)||'null');}catch(e){return null;}}
function writeStore(v){try{localStorage.setItem(STORE,JSON.stringify(v));}catch(e){}}
function db(path,method,body){if(typeof window.supaFetch!=='function')return Promise.reject(new Error('Databaza nuk është gati.'));return window.supaFetch(path,method,body);}
async function query(path){try{return arr(await db(path));}catch(e){console.warn('PRISTEEL reconciliation query:',path,e);return[];}}

var TABLES=[
 {name:'documents_registry',label:'oferta/dokumente',date:'created_at'},
 {name:'invoices_out',label:'fatura dalëse',date:'created_at'},
 {name:'invoices_in',label:'fatura hyrëse',date:'created_at'},
 {name:'commercial_adjustments',label:'nota kreditore/debitore',date:'created_at'},
 {name:'contracts',label:'kontrata',date:'created_at'},
 {name:'files',label:'skedarë',date:'created_at'}
];

function projectAliases(p){
 var refs=uniq([p.ref,p.reference,p.project_ref]).map(norm).filter(function(x){return x.length>=3;});
 var names=uniq([p.name,p.project,p.title]).map(norm).filter(function(x){return x.length>=5;});
 return{id:String(p.id),p:p,refs:refs,names:names,client:norm(p.client||p.company||''),rich:norm([p.name,p.client,p.ref,p.location].join(' '))};
}
function uniqueClientMap(projects){var m={};projects.forEach(function(p){if(!p.client)return;(m[p.client]||(m[p.client]=[])).push(p);});return m;}
function buildRelated(rows,keyFields){var byId={},byNr={};arr(rows).forEach(function(r){if(r.id)byId[String(r.id)]=r;keyFields.forEach(function(k){var x=compact(r[k]);if(x)byNr[x]=r;});});return{byId:byId,byNr:byNr};}
function relationProject(row,table,relations,validIds){
 var ids=[],nrs=[];
 if(table==='commercial_adjustments'){
  ids=[row.original_invoice_id,row.invoice_id,row.source_invoice_id];nrs=[row.original_invoice_nr,row.invoice_nr];
  for(var i=0;i<ids.length;i++){var inv=relations.invoices.byId[String(ids[i]||'')];if(inv&&validIds[String(inv.project_id||'')])return String(inv.project_id);}
  for(var j=0;j<nrs.length;j++){var inv2=relations.invoices.byNr[compact(nrs[j])];if(inv2&&validIds[String(inv2.project_id||'')])return String(inv2.project_id);}
 }
 if(table==='invoices_out'){
  ids=[row.offer_id,row.quote_id,row.source_offer_id,row.original_offer_id,row.document_id];nrs=[row.offer_nr,row.quote_nr,row.reference,row.ref];
  for(var k=0;k<ids.length;k++){var q=relations.offers.byId[String(ids[k]||'')];if(q&&validIds[String(q.project_id||'')])return String(q.project_id);}
  for(var l=0;l<nrs.length;l++){var q2=relations.offers.byNr[compact(nrs[l])];if(q2&&validIds[String(q2.project_id||'')])return String(q2.project_id);}
 }
 return'';
}
function scoreProject(row,px,clientMap){
 var text=rowText(row),direct=directProjectText(row),dc=compact(direct),score=0,reasons=[];
 px.refs.forEach(function(ref){var rc=compact(ref);if(!rc)return;if(dc===rc){score=Math.max(score,1200);reasons.push('referencë identike');}else if(dc.indexOf(rc)>-1){score=Math.max(score,1080);reasons.push('referencë në projekt');}else if(compact(text).indexOf(rc)>-1){score=Math.max(score,930);reasons.push('referencë në dokument');}});
 px.names.forEach(function(name){var nc=compact(name);if(!nc)return;if(dc===nc){score=Math.max(score,1150);reasons.push('emër identik');}else if(dc&&nc.length>=8&&(dc.indexOf(nc)>-1||nc.indexOf(dc)>-1)){score=Math.max(score,980);reasons.push('emër projekti');}else if(nc.length>=12&&compact(text).indexOf(nc)>-1){score=Math.max(score,820);reasons.push('emër në dokument');}});
 var rcpt=compact(px.p.ref||'');if(rcpt&&rcpt.length>=4&&compact(text).indexOf(rcpt)>-1){score=Math.max(score,960);reasons.push('kod projekti');}
 var rowClient=norm(row.client||row.company||'');if(px.client&&rowClient===px.client){var candidates=clientMap[px.client]||[];if(candidates.length===1){score=Math.max(score,720);reasons.push('klient unik');}else score+=70;}
 return{score:score,reason:uniq(reasons).join(', ')};
}
function matchProject(row,projects,clientMap){
 var ranked=projects.map(function(px){var s=scoreProject(row,px,clientMap);return{px:px,score:s.score,reason:s.reason};}).sort(function(a,b){return b.score-a.score;});
 var a=ranked[0],b=ranked[1];if(!a||a.score<720)return null;if(b&&b.score>=720&&a.score-b.score<140)return{ambiguous:true,first:a,second:b};return{ambiguous:false,first:a};
}
async function patch(table,id,pid){return db(table+'?id=eq.'+enc(id),'PATCH',{project_id:pid});}
async function auditLog(table,row,project,reason){try{await db('dismissed_items','POST',{item_type:'document_project_link',item_ref:table+':'+row.id,project_id:project.id,label:(row.doc_nr||row.invoice_nr||row.supplier_invoice_nr||row.document_nr||row.file_name||row.title||table),reason:'Lidhje automatike e verifikuar: '+reason,dismissed_by:currentUser()});}catch(e){}}

async function run(force){
 if(running)return running;
 var old=readStore();if(!force&&old&&old.at&&Date.now()-old.at<RUN_EVERY)return old;
 running=(async function(){
  var stats={version:VERSION,at:Date.now(),projects:0,scanned:0,linked:0,already:0,ambiguous:0,unmatched:0,errors:0,tables:{},examples:[]};
  var rawProjects=await query('projects?select=*&order=created_at.desc&limit=5000');
  var projects=rawProjects.map(projectAliases),validIds={};projects.forEach(function(x){validIds[x.id]=true;});stats.projects=projects.length;
  var clientMap=uniqueClientMap(projects);
  var loaded={};for(var i=0;i<TABLES.length;i++){var t=TABLES[i];loaded[t.name]=await query(t.name+'?select=*&order='+(t.date||'created_at')+'.desc&limit=5000');}
  var relations={offers:buildRelated(loaded.documents_registry,['doc_nr','reference','ref']),invoices:buildRelated(loaded.invoices_out,['invoice_nr','reference','ref'])};
  for(var ti=0;ti<TABLES.length;ti++){
   var table=TABLES[ti].name,rows=loaded[table],ts={scanned:rows.length,linked:0,already:0,ambiguous:0,unmatched:0,errors:0};stats.tables[table]=ts;
   for(var ri=0;ri<rows.length;ri++){
    var row=rows[ri];stats.scanned++;
    if(row.project_id&&validIds[String(row.project_id)]){stats.already++;ts.already++;continue;}
    var rel=relationProject(row,table,relations,validIds),match=null,reason='';
    if(rel){match={id:rel,p:rawProjects.filter(function(p){return String(p.id)===rel;})[0]};reason='dokumenti burimor';}
    else{var m=matchProject(row,projects,clientMap);if(m&&m.ambiguous){stats.ambiguous++;ts.ambiguous++;if(stats.examples.length<20)stats.examples.push({table:table,id:row.id,label:row.doc_nr||row.invoice_nr||row.file_name||'',issue:'ambiguous'});continue;}if(m&&m.first){match=m.first.px;reason=m.first.reason;}}
    if(!match){stats.unmatched++;ts.unmatched++;continue;}
    try{await patch(table,row.id,match.id);row.project_id=match.id;stats.linked++;ts.linked++;await auditLog(table,row,match.p||match,reason);}
    catch(e){stats.errors++;ts.errors++;console.warn('PRISTEEL reconciliation patch:',table,row.id,e);}
   }
  }
  stats.at=Date.now();writeStore(stats);window.__pstDocumentProjectAudit=stats;
  try{window.dispatchEvent(new CustomEvent('pst:document-project-audit',{detail:stats}));}catch(e){}
  return stats;
 })().finally(function(){running=null;});
 return running;
}
window.pstReconcileProjectDocuments=run;

function wrapOpen(){
 var base=window.pstOpenProjectWorkspace;if(typeof base!=='function'||base.__pstDocumentAuditWrapped)return false;
 window.pstOpenProjectWorkspace=async function(id){try{await run(false);}catch(e){console.warn('PRISTEEL audit before project:',e);}return base.apply(this,arguments);};
 window.pstOpenProjectWorkspace.__pstDocumentAuditWrapped=true;openWrapped=true;return true;
}
function start(){
 var tries=0,t=setInterval(function(){if(wrapOpen()||++tries>240)clearInterval(t);},100);
 var wait=0,auto=setInterval(function(){if(typeof window.supaFetch==='function'){clearInterval(auto);setTimeout(function(){run(false).then(function(s){console.info('PRISTEEL document audit:',s);}).catch(function(e){console.warn(e);});},1200);}else if(++wait>180)clearInterval(auto);},200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();