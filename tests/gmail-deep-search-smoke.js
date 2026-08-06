const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-gmail-deep-search-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(|window\.close\s*\(/.test(source),'Deep search must not observe, poll or close tabs');
 assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source),'Deep search must remain read-only');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.TextDecoder=TextDecoder;
 w.PSTGoogleWorkspaceAuth={gmailScope:'https://www.googleapis.com/auth/gmail.readonly',currentToken:()=> 'token',getGmailToken:async()=> 'token'};
 w.PSTBusinessCommandCenterV1={tokenGroups:q=>String(q).toLowerCase().includes('kerkese')?[['rfq','request for quotation','kerkese per oferte','angebotsanfrage']]:[[q]]};
 w.supaFetch=async path=>{
   if(path.startsWith('project_emails?'))return[{gmail_message_id:'m1',gmail_thread_id:'t1',project_id:'p1'}];
   return[];
 };
 const body=Buffer.from('Please send us your request for quotation for the steel structure. Freight must be priced separately.','utf8').toString('base64url');
 w.fetch=async url=>{
   const s=String(url);
   if(s.includes('/messages?'))return{ok:true,text:async()=>JSON.stringify({messages:[{id:'m1',threadId:'t1'}]})};
   if(s.includes('/messages/m1?'))return{ok:true,text:async()=>JSON.stringify({id:'m1',threadId:'t1',internalDate:String(Date.now()),snippet:'Request for quotation',payload:{headers:[{name:'Subject',value:'RFQ steel structure'},{name:'From',value:'Buyer <buyer@example.com>'},{name:'Date',value:'Thu, 6 Aug 2026 10:00:00 +0200'}],mimeType:'text/plain',body:{data:body}}})};
   throw new Error('Unexpected URL '+s);
 };
 w.eval(source);
 assert(w.PSTGmailDeepSearch,'Deep search API missing');
 const rows=await w.PSTGmailDeepSearch.search('kerkese per oferte',{interactive:false});
 assert.strictEqual(rows.length,1,'Full-body search did not return the matching email');
 assert.strictEqual(rows[0].projectId,'p1','Project relation was not preserved');
 assert(rows[0].excerpt.includes('request for quotation'),'Email body was not decoded');
 assert(rows[0].url.includes('mail.google.com'),'Original Gmail link is missing');
 dom.window.close();
 console.log('Gmail deep search smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
