const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-state-contract-v1.js','utf8');
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const pid='6e0d2d19-3a51-4079-882f-b73f81cbe95e';
  const links=Array.from({length:6},(_,i)=>({id:i+1,project_id:pid,gmail_message_id:'m'+(i+1)}));
  const mails=Array.from({length:6},(_,i)=>({id:i+10,project_id:pid,gmail_message_id:'m'+(i+1),subject:'Mail '+(i+1),sent_at:'2026-08-'+String(10+i).padStart(2,'0')+'T09:00:00Z'}));

  w.PSTProjectDataIntegrity={load:async()=>({
    project:{id:pid,name:'Dukley'},emails:[],emailLinks:[],contacts:[],bom:[],rfqs:[],offers:[],ourOffers:[{doc_nr:'024'}],supplierOffers:[],docs:[],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],guarantees:[],deals:[],mailAttachments:[],files:[],integration:{gmailLinked:false}
  })};
  w.supaFetch=async path=>{
    if(path.startsWith('project_email_links?'))return links;
    if(path.startsWith('project_emails?project_id='))return mails;
    if(path.startsWith('project_emails?gmail_message_id='))return mails;
    return[];
  };
  w.eval(source);

  const full=await w.PSTProjectDataIntegrity.load(pid);
  assert.strictEqual(full.emails.length,6,'Canonical load must reconcile all six linked Dukley emails');
  assert.strictEqual(full.emailLinks.length,6,'Canonical load must preserve all six project_email_links');
  assert.strictEqual(full.__pstEmailRelationsComplete,true,'Email relation invariant must be complete');
  assert.strictEqual(w.__pstIntegrityLastData.emails.length,6,'Canonical snapshot must be published globally');

  w.__pstIntegrityLastData={project:{id:pid,name:'Dukley'},emails:[],emailLinks:[],ourOffers:[]};
  assert.strictEqual(w.__pstIntegrityLastData.emails.length,6,'A late partial writer must not erase verified emails');
  assert.strictEqual(w.__pstIntegrityLastData.ourOffers.length,1,'A late partial writer must not erase verified offer data');
  assert.strictEqual(w.__pstIntegrityLastData.__pstProtectedFromRegression,true,'Protected regression should be diagnosable');

  const canonicalShrink={project:{id:pid,name:'Dukley'},emails:mails.slice(0,5),emailLinks:links.slice(0,5),ourOffers:[{doc_nr:'024'}],__pstCanonicalSnapshot:true};
  w.__pstIntegrityLastData=canonicalShrink;
  assert.strictEqual(w.__pstIntegrityLastData.emails.length,5,'An explicit canonical reload may reflect a real authoritative deletion');

  w.__pstIntegrityLastData={project:{id:'other-project'},emails:[],emailLinks:[]};
  assert.strictEqual(w.__pstIntegrityLastData.project.id,'other-project','Changing projects must not retain the previous project snapshot');

  dom.window.close();
  console.log('Project state contract smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
