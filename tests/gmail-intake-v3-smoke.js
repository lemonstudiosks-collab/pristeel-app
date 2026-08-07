const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-gmail-intake-v3.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Gmail intake v3 must not observe or poll');
 assert(source.includes('allowCreate=state.linkedIds.length===0'),'Create-project option must depend on real links, not suggestions');
 assert(source.includes("window.PSTGmailIntakeV3=api;window.PSTGmailIntakeV2=api"),'Compatibility alias is missing');
 assert(source.includes("if(el.id!=='pgi2-close')el.disabled=!!on"),'Busy state must keep close available');
 assert(!/db\([^\n]*['\"](?:POST|PATCH|DELETE)[^\n]*setTimeout/i.test(source),'Writes must not be automatically retried');

 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.File=class File{constructor(parts,name,opt){this.parts=parts;this.name=name;this.type=opt&&opt.type;}};
 w.PSTDriveImport={importFiles:async()=>({uploaded:0,skipped:0})};
 w.PSTEmail={
   auth:async()=> 'token',
   message:async id=>({gmail_message_id:id,gmail_thread_id:'t1',subject:'New Steel Project',from_email:'buyer@example.com'}),
   gmail:async path=>({messages:[{id:'m1',threadId:'t1',internalDate:String(Date.now()),snippet:'new RFQ',payload:{headers:[{name:'Subject',value:'New Steel Project'},{name:'From',value:'Buyer <buyer@example.com>'}],parts:[]}}]})
 };
 let posts=[];
 w.supaFetch=async (path,method,body)=>{
   if(path.startsWith('projects?select='))return[];
   if(path.startsWith('project_emails?'))return[];
   if(path.startsWith('project_email_links?'))return[];
   if(path.startsWith('project_contacts?'))return[];
   if(path==='projects'&&method==='POST'){posts.push(body);return[{id:'p-new',...body}];}
   if(path==='project_emails'&&method==='POST')return body;
   if(path==='project_email_links'&&method==='POST')return[body];
   return[];
 };
 w.eval(source);
 await w.PSTGmailIntakeV3.open('https://example.test/?gmail_intake=1&gmail_message_id=m1&gmail_thread_id=t1&subject=New%20Steel%20Project&from=buyer%40example.com');
 assert(w.document.getElementById('pgi2-toggle-create'),'Unmatched Gmail thread did not expose Create Project');
 w.document.getElementById('pgi2-toggle-create').click();
 const name=w.document.getElementById('pgi2-name');
 assert(name&&!name.hidden,'Create form did not open');
 w.document.getElementById('pgi2-create').click();
 await new Promise(r=>setTimeout(r,80));
 assert(posts.length===1,'Project creation did not execute exactly once');
 assert(w.document.body.textContent.includes('U ruajt te:')||w.document.body.textContent.includes('ruajtja përfundoi'),'Intake did not reach successful result');
 assert.strictEqual(w.PSTGmailIntakeV2,w.PSTGmailIntakeV3,'Compatibility alias does not point to v3');
 dom.window.close();
 console.log('Gmail intake v3 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
