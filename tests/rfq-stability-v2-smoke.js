const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
(async()=>{
 const src=fs.readFileSync('pristeel-rfq-stability-v2.js','utf8');
 assert(!/setInterval\s*\(|MutationObserver\s*\(/.test(src),'RFQ guard must not poll or observe globally');
 const dom=new JSDOM('<!doctype html><html><body><input id="i-projname" value="Project A"></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w._curProjId='p1';w.atob=s=>Buffer.from(s,'base64').toString('binary');
 let rfqPosts=0,offerPosts=0;const now=new Date().toISOString();
 w.supaFetch=async(path,method,body)=>{
   if(method==='POST'&&path==='rfq_log'){rfqPosts++;return[{id:'r1'}];}
   if(method==='POST'&&path==='offers'){offerPosts++;return[{id:'o1'}];}
   if(path.startsWith('rfq_log?'))return rfqPosts?[{id:'r1',project_id:'p1',sent_at:now}]:[];
   if(path.startsWith('offers?'))return offerPosts?[{id:'o1',price_kg:0,total_eur:0,notes:'RFQ dërguar sot'}]:[];
   return[];
 };
 w.eval(src);
 const b64=Buffer.from('body','utf8').toString('base64');
 await w.logRfqSent(encodeURIComponent('Supplier'),encodeURIComponent('a@supplier.com'),'en',encodeURIComponent('RFQ A'),b64);
 await w.logRfqSent(encodeURIComponent('Supplier'),encodeURIComponent('a@supplier.com'),'en',encodeURIComponent('RFQ A'),b64);
 assert.strictEqual(rfqPosts,1,'Repeated click created duplicate RFQ log');
 assert.strictEqual(offerPosts,1,'Repeated click created duplicate placeholder offer');
 dom.window.close();console.log('RFQ stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
