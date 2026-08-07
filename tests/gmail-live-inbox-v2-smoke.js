const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-gmail-live-inbox-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Gmail live v2 must not observe or poll');
 assert(source.includes('LIST_WAIT=4500')&&source.includes('MSG_WAIT=3200'),'Gmail live waits are not bounded');
 assert(source.includes('Krijo / Lidhe projektin'),'Gmail live intake action is missing');
 const dom=new JSDOM(`<!doctype html><html><body>
   <div id="pst-ws-sidebar"><button class="pst-ws-navbtn" data-key="inbox"><span>Inbox</span></button></div>
   <div id="page-workspace-inbox" class="active" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div></div></div>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.PSTGoogleWorkspaceAuth={gmailScope:'gmail.readonly',currentToken:()=> 'tok',getGmailToken:async()=> 'tok'};
 w.PSTEmail={
   gmail:async()=>({messages:[{id:'m1'}]}),
   message:async()=>({gmail_message_id:'m1',gmail_thread_id:'t1',subject:'RFQ New Project',from_email:'buyer@example.com',from_name:'Buyer',sent_at:'2026-08-07T12:00:00Z',snippet:'Please quote',gmail_url:'https://mail.google.com/x'})
 };
 let intakeTarget='';
 w.PSTGmailIntakeV2={open:t=>{intakeTarget=t;}};
 w.pstWorkspaceGo=()=>{};
 w.open=()=>{};
 w.eval(source);
 w.PSTGmailLiveInboxV2.decorate();
 await new Promise(r=>setTimeout(r,80));
 assert(w.document.body.textContent.includes('RFQ New Project'),'Live Gmail did not render Gmail data');
 const btn=w.document.querySelector('.pst-gli-intake');
 assert(btn,'Create/link project action not rendered');
 btn.click();
 assert(intakeTarget.includes('gmail_message_id=m1'),'Gmail row did not hand off the message to intake');
 dom.window.close();
 console.log('Gmail live inbox v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
