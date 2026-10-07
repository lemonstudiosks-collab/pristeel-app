/* Before the shared legacy bootstrap, a SPIE iframe is read-only until an explicit editor save. */
(function(){
 'use strict';
 var kind=new URLSearchParams(location.search).get('spieEditor');
 if(!kind||window.parent===window)return;
 var project='c937aea1-af5e-4807-ae1e-e36864e46794';
 var nativeFetch=window.fetch;
 window.__pstSpieEditorSafety={kind:kind,projectId:project,ticket:null};
 // The shared registry remains untouched. This iframe loads only existing document owners explicitly.
 window.__pstAbortBootstrap=true;
 var documentOwners=new Set(['../pristeel-document-center-stable-v2.js','../pristeel-document-adjustments-v3.js','../pristeel-commercial-document-builder-v1.js','../pristeel-offer-position-preservation-v1.js','../pristeel-offer-number-integrity-v1.js','../pristeel-invoice-identity-v1.js','../pristeel-invoice-project-link-v1.js','../pristeel-document-currency-v1.js','./editor-host.mjs']);
 var append=document.head.appendChild;
 document.head.appendChild=function(node){
  if(node.tagName==='SCRIPT'&&node.src){var src=new URL(node.src,location.href),rel=src.pathname.slice(new URL('.',location.href).pathname.length);
   if(src.origin===location.origin&&!(documentOwners.has('../'+rel)||documentOwners.has('./'+rel.replace(/^spie\//,'')))){queueMicrotask(function(){node.dispatchEvent(new Event('load'));});return node;}
  }
  return append.call(this,node);
 };
 document.addEventListener('DOMContentLoaded',function(){parent.postMessage({channel:'spie-document-editor-v1',type:'request-context',kind:kind},location.origin);},{once:true});
 window.fetch=function(input,init){
  var url=new URL(typeof input==='string'?input:input.url,location.href),method=String(init&&init.method||input&&input.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='HEAD'&&!['http:','https:'].includes(url.protocol))return Promise.reject(new Error('SPIE_WRITE_BLOCKED'));
  if(method!=='GET'&&method!=='HEAD'){
   if(method==='POST'&&url.hostname==='awqfpnzqwfjrjefoktgd.supabase.co'&&url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='refresh_token')return nativeFetch.apply(this,arguments);
   var gate=window.__pstSpieEditorSafety,t=gate.ticket,table=url.pathname.split('/').pop(),body;
   try{body=JSON.parse(init&&init.body||'null');}catch(e){}
   var row=Array.isArray(body)?body[0]:body;
   if(!t||method!=='POST'||url.hostname!=='awqfpnzqwfjrjefoktgd.supabase.co'||!['invoices_out','documents_registry','commercial_adjustments'].includes(table)||table!==t.table||!row||row.project_id!==project||(row.invoice_nr||row.doc_nr||row.document_nr)!==t.nr)return Promise.reject(new Error('SPIE_WRITE_REQUIRES_EXPLICIT_EDITOR_APPROVAL'));
  }
  return nativeFetch.apply(this,arguments);
 };
})();
