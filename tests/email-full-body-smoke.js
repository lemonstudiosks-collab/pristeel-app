const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-email-full-body-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Full email body module must not observe or poll');
 const dom=new JSDOM('<!doctype html><html><body><div id="pgi2-bg"></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 const text='Please use S355 instead of S235. Delivery must be completed before 15 October.';
 const b64=Buffer.from(text,'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 let fallback=0;
 w.PSTEmail={
   gmail:async()=>({id:'m1',threadId:'t1',internalDate:String(Date.now()),payload:{mimeType:'text/plain',headers:[{name:'From',value:'Buyer <buyer@example.com>'},{name:'To',value:'sales@prissteel.com'},{name:'Subject',value:'Technical confirmation'}],body:{data:b64}}}),
   message:async()=>{fallback++;return{gmail_message_id:'m1',snippet:'metadata only'};},
   norm:v=>(String(v).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/i)||[''])[0].toLowerCase(),
   emails:v=>(String(v).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/ig)||[]).map(x=>x.toLowerCase()),
   isInternal:v=>/prissteel\.com$/.test(v||''),gmailUrl:id=>'https://mail.google.com/'+id
 };
 w.eval(source);
 const m=await w.PSTEmail.message('m1','token');
 assert(m.snippet.includes('Please use S355 instead of S235'),'Full email body was not persisted into project email text');
 assert(m.snippet.includes('15 October'),'Important body detail was lost');
 assert.strictEqual(fallback,0,'Project intake should use Gmail full payload');
 w.document.getElementById('pgi2-bg').remove();
 const light=await w.PSTEmail.message('m1','token');
 assert.strictEqual(light.snippet,'metadata only','Bulk/history mode should keep lightweight metadata reader');
 assert.strictEqual(fallback,1,'Metadata fallback was not used outside project intake');
 dom.window.close();console.log('Full project email body smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
