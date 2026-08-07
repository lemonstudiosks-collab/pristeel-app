const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
(async()=>{
 const src=fs.readFileSync('pristeel-document-center-stable-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(src),'Document center must not use global observer or polling');
 const dom=new JSDOM('<!doctype html><html><head></head><body><div class="content"></div><div class="page" id="page-home"></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.scrollTo=()=>{};w.supaFetch=async(path)=>{
   if(path.startsWith('documents_registry?'))return[{id:'q1',doc_nr:'Q-1',project:'P1',client:'C1',total_eur:100,created_at:'2026-08-07'}];
   if(path.startsWith('invoices_out?'))return[{id:'i1',invoice_nr:'I-1',project:'P1',client:'C1',gross_amount:120,date:'2026-08-07'}];
   return[];
 };
 w.eval(src);
 assert(w.PSTDocumentCenterStableV2,'Stable document center API missing');
 assert.strictEqual(w.pstOpenDocumentCenter('offer'),true,'Document center did not open');
 await w.PSTDocumentCenterStableV2.load();
 assert(w.PSTDocumentCenterStableV2.state.all.length>=2,'Document center did not combine offers and invoices');
 assert(w.document.getElementById('pst-dc-list').textContent.includes('Q-1'),'Offer missing from stable register');
 dom.window.close();console.log('Document center stable v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
