const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-gmail-live-inbox-v2.js','utf8');
 const triage=fs.readFileSync('pristeel-gmail-live-triage-v1.js','utf8');
 const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Gmail live v2 must not observe or poll');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(triage),'Gmail triage must stay bounded and event-driven');
 assert(source.includes('LIST_WAIT=4500')&&source.includes('MSG_WAIT=3200'),'Gmail live waits are not bounded');
 assert(source.includes('Krijo / Lidhe projektin'),'Gmail live intake action is missing');
 assert(source.includes('#page-workspace-inbox .pst-ws-card-title{font-size:14px!important'),'Inbox card titles must remain readable');
 assert(source.includes('#page-workspace-inbox .pst-ws-action-title{font-size:13px!important'),'Inbox action titles must remain readable');
 assert(source.includes('#page-workspace-inbox #pst-gli-status{font-size:11.5px!important'),'Gmail live status must remain readable');
 assert(!source.includes('#page-workspace-commercial .pst-ws-card-title'),'Inbox readability must not alter the commercial/document center page');
 assert(bootstrap.includes("'pristeel-gmail-live-triage-v1.js?v=20260813-1'"),'Gmail triage must load from the canonical bootstrap');
 assert(bootstrap.indexOf('pristeel-gmail-live-triage-v1.js')>bootstrap.indexOf('pristeel-gmail-live-inbox-v2.js'),'Gmail triage must load after Gmail live');
 assert(triage.includes("return'bounce'"),'Bounce classification is missing');
 assert(triage.includes("return'outreach_reply'"),'Cold-outreach reply classification is missing');
 assert(triage.includes("status:'Bounced'"),'Bounce must update outreach state');
 assert(triage.includes("status:'Waiting'"),'Human reply must be preservable as waiting follow-up');
 assert(triage.includes('dismissed_items'),'Triaged Gmail rows must use the existing dismissed-items mechanism');
 assert(!/\/trash|TRASH|messages\/delete|batchDelete/.test(triage),'Triage must not delete Gmail messages');
 assert(triage.includes('Data e kthimit nuk u dha'),'Missing return dates must be explicit, not invented');

 const dom=new JSDOM(`<!doctype html><html><body>
   <div id="pst-ws-sidebar"><button class="pst-ws-navbtn" data-key="inbox"><span>Inbox</span></button></div>
   <div id="page-workspace-inbox" class="active" style="display:block"><div class="pst-ws-page">
     <div class="pst-ws-head"></div>
     <div class="pst-ws-two">
       <section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Emaila pa projekt</div><div class="pst-ws-card-sub">Old</div></div></div><div class="pst-ws-card-body" id="pst-ws-inbox-emails"><div class="pst-ofu-toolbar"></div></div></section>
       <section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Kërkesa</div><div class="pst-ws-card-sub">Old</div></div></div><div class="pst-ws-card-body" id="pst-ws-inbox-requests"></div></section>
     </div>
   </div></div>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 if(!w.CSS)w.CSS={};if(!w.CSS.escape)w.CSS.escape=s=>String(s).replace(/["\\]/g,'\\$&');
 w.PSTGoogleWorkspaceAuth={gmailScope:'gmail.readonly',currentToken:()=> 'tok',getGmailToken:async()=> 'tok'};
 const msgs={
   m1:{gmail_message_id:'m1',gmail_thread_id:'t1',subject:'RFQ New Project',from_email:'buyer@example.com',from_name:'Buyer',sent_at:'2026-08-13T06:10:00Z',snippet:'Please quote',gmail_url:'https://mail.google.com/x1'},
   m2:{gmail_message_id:'m2',gmail_thread_id:'t2',subject:'Delivery Status Notification (Failure)',from_email:'mailer-daemon@googlemail.com',from_name:'Mail Delivery Subsystem',sent_at:'2026-08-13T06:20:00Z',snippet:'Address not found. Your message was not delivered to bad@example.com',gmail_url:'https://mail.google.com/x2'},
   m3:{gmail_message_id:'m3',gmail_thread_id:'t3',subject:'RE: Partner za izradu čeličnih konstrukcija za Vaše projekte',from_email:'tihana.gazdek@tehnika.hr',from_name:'Tihana Gazdek',sent_at:'2026-08-13T06:48:00Z',snippet:'Gospodin Štenglin je na godišnjem odmoru. Javit će Vam se kad se vrati.',gmail_url:'https://mail.google.com/x3'}
 };
 w.PSTEmail={
   gmail:async path=>path.startsWith('/messages?')?{messages:[{id:'m1'},{id:'m2'},{id:'m3'}]}:{},
   message:async id=>msgs[id]
 };
 w.PSTEmailFullBodyV1={fullText:()=>''};
 w.supaFetch=async(path,method,body)=>{
   if(path.startsWith('project_emails?'))return [{gmail_message_id:'sent3',gmail_thread_id:'t3',to_emails:['tehnika@tehnika.hr'],subject:'Partner za izradu čeličnih konstrukcija za Vaše projekte',sent_at:'2026-08-13T06:33:00Z',direction:'outgoing',project_id:null}];
   if(path.startsWith('dismissed_items?'))return [];
   if(path.startsWith('outreach_contacts?'))return [];
   if(path==='dismissed_items'&&method==='POST')return [body];
   if(path==='outreach_contacts'&&method==='POST')return [body];
   return [];
 };
 let intakeTarget='';
 w.PSTGmailIntakeV2={open:t=>{intakeTarget=t;}};
 w.PSTOutreachFollowupV1={refresh:()=>{}};
 w.pstWorkspaceGo=()=>{};
 w.open=()=>{};
 w.eval(source);
 w.eval(triage);
 assert(w.document.getElementById('pst-gmail-live-inbox-readable-css'),'Scoped inbox readability CSS was not installed');
 assert(w.document.getElementById('pst-gmail-live-triage-v1-style'),'Gmail triage CSS was not installed');
 w.PSTGmailLiveInboxV2.decorate();
 await new Promise(r=>setTimeout(r,120));
 await w.PSTGmailLiveTriageV1.refresh();
 assert(w.document.body.textContent.includes('RFQ New Project'),'Live Gmail did not render Gmail data');
 assert.strictEqual(w.document.querySelector('#pst-gmail-live-card .pst-ws-card-title').textContent,'Gmail live','Gmail live card title was overwritten by follow-up');
 assert.strictEqual(w.document.querySelector('.pst-ws-two > .pst-ws-card .pst-ws-card-title').textContent,'Follow-up për kontakte','Follow-up title was not restored on the correct card');
 const rows=[...w.document.querySelectorAll('#pst-gli-list .pst-ws-action')];
 const bounceRow=rows.find(r=>r.textContent.includes('Delivery Status Notification'));
 const replyRow=rows.find(r=>r.textContent.includes('Partner za izradu'));
 assert(bounceRow&&bounceRow.textContent.includes('Bounce'),'Bounce row was not classified');
 assert(bounceRow.textContent.includes('Hiqe nga PPPP'),'Bounce row must not offer project intake');
 assert(replyRow&&replyRow.textContent.includes('Përgjigje outreach'),'Cold outreach reply was not classified');
 assert(replyRow.textContent.includes('Ruaj follow-up'),'Cold outreach reply must offer follow-up instead of project intake');
 const normal=rows.find(r=>r.textContent.includes('RFQ New Project'));
 const btn=normal&&normal.querySelector('.pst-gli-intake');
 assert(btn,'Normal new request lost the create/link project action');
 btn.click();
 assert(intakeTarget.includes('gmail_message_id=m1'),'Normal Gmail row did not hand off the message to intake');
 dom.window.close();
 console.log('Gmail live inbox v2 + triage smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});