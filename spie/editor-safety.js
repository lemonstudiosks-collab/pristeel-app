/* Visible legacy notice for the frozen PPPP app. Keep this before the SPIE iframe guard. */
(function(){
 'use strict';
 if(window.parent!==window)return;
 function installLegacyNotice(){
  if(document.getElementById('pppp-legacy-banner'))return;
  document.title='PPPP Legacy — Archive / Finance';
  var style=document.createElement('style');
  style.id='pppp-legacy-banner-style';
  style.textContent='#pppp-legacy-banner{position:fixed;top:0;left:0;right:0;z-index:2147483646;min-height:48px;padding:8px 14px;background:#7f1d1d;color:#fff;font:600 13px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.18)}#pppp-legacy-banner strong{font-weight:800;letter-spacing:.02em}#pppp-legacy-banner a{color:#fff;text-decoration:underline;font-weight:750}#pppp-legacy-banner-spacer{height:52px;width:100%}@media(max-width:720px){#pppp-legacy-banner{font-size:11px;min-height:58px;padding:7px 9px;flex-wrap:wrap;gap:4px}#pppp-legacy-banner-spacer{height:62px}}';
  document.head.appendChild(style);
  var banner=document.createElement('div');
  banner.id='pppp-legacy-banner';
  banner.setAttribute('role','status');
  banner.innerHTML='<strong>LEGACY SYSTEM — NOT THE CURRENT PPPP</strong><span>Historical/migrated PriSteel data. For current projects, pipeline, inbound, drafts and operational work use <a href="https://sandbox.prissteel.com" target="_blank" rel="noopener">PPPP at sandbox.prissteel.com</a>.</span>';
  var spacer=document.createElement('div');
  spacer.id='pppp-legacy-banner-spacer';
  if(document.body.firstChild)document.body.insertBefore(spacer,document.body.firstChild);else document.body.appendChild(spacer);
  document.body.insertBefore(banner,spacer);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLegacyNotice,{once:true});else installLegacyNotice();
})();

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