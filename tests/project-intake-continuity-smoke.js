const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-intake-continuity-v1.js','utf8');
  const gateSource=fs.readFileSync('pristeel-linked-gmail-auth-gate-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Intake continuity must not poll or globally observe');
  assert(!/\/send\b|messages\/send|drafts\/send/.test(source),'Intake continuity must never send Gmail messages');
  assert(!/PSTEmail\.auth\s*\(|\bP\.auth\s*\(/.test(source),'Intake continuity must never trigger interactive Gmail OAuth itself');
  assert(source.includes("owners.length!==1||String(owners[0])!==String(projectId)"),'Single-project thread ownership guard is missing');
  assert(gateSource.includes('await C.normalizeProjectThreads(pid,token)'),'OAuth gate must run confirmed-thread continuity after authorization');

  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const emails=[{id:'e1',gmail_message_id:'m1',gmail_thread_id:'t1',project_id:'p1',match_method:'gmail-intake-v3',has_attachments:false}];
  const links=[{id:'l1',project_id:'p1',gmail_message_id:'m1',gmail_thread_id:'t1',link_method:'gmail-intake-v3'}];
  let seq=10,contactSync=0,recoveryCalls=0,gmailThreadReads=0,authorizeCalls=0,workspaceToken='workspace-token';

  w.PSTProjectDataIntegrity={
    load:async()=>({
      inboxDocs:[
        {id:'inbox-email-only',gmail_msg_id:'m1',subject:'RFQ request'},
        {id:'inbox-real-file',gmail_msg_id:'m2',file_name:'supplier-offer.pdf'}
      ],
      files:[
        {id:'inbox-email-only',gmail_msg_id:'m1',subject:'RFQ request'},
        {id:'inbox-real-file',gmail_msg_id:'m2',file_name:'supplier-offer.pdf'},
        {id:'drive-file',name:'drawing.xlsx',webViewLink:'https://drive.test/drawing'}
      ]
    })
  };
  w.PSTGoogleWorkspaceAuth={
    gmailScope:'gmail.readonly',driveScope:'drive',
    cachedToken:()=>workspaceToken,
    authorizeForIntake:async()=>{authorizeCalls++;workspaceToken='workspace-token';return workspaceToken;}
  };
  function ext(v){const m=String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/);return m?m[0]:'';}
  function list(v){return String(v||'').toLowerCase().match(/[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/g)||[];}
  function msg(id,from,to,attachment){
    const parts=attachment?[{mimeType:'application/pdf',filename:'drawing.pdf',body:{attachmentId:'a1',size:1200}}]:[];
    return{id,threadId:'t1',internalDate:String(Date.UTC(2026,7,10,10,0,0)),snippet:'steel hall RFQ',payload:{headers:[
      {name:'From',value:from},{name:'To',value:to},{name:'Subject',value:'Fwd: Request for quotation'},{name:'Date',value:'Mon, 10 Aug 2026 10:00:00 +0000'},{name:'Message-ID',value:'<'+id+'@example.test>'}
    ],parts}};
  }
  const thread={messages:[msg('m1','Buyer <buyer@example.com>','sales@prissteel.com',true),msg('m2','PRISTEEL <sales@prissteel.com>','Supplier <supplier@example.com>',false)]};
  w.PSTEmail={
    norm:ext,emails:list,isInternal:e=>['sales@prissteel.com','arianit.vllahiu@prissteel.com'].includes(String(e||'').toLowerCase()),
    gmailUrl:t=>'https://mail.google.test/'+t,
    gmail:async path=>{if(path.startsWith('/threads/t1?format=full')){gmailThreadReads++;return thread;}throw new Error('Unexpected Gmail path '+path);}
  };
  w.pstSyncProjectContacts=async()=>{contactSync++;};
  const recovery=()=>{recoveryCalls++;};
  w.pstRecoverLinkedProjectGmail=recovery;
  w.pstCollectProjectGmail=recovery;

  w.supaFetch=async (path,method='GET',body)=>{
    if(method==='GET'){
      if(path.startsWith('project_email_links?project_id=eq.p1&select=gmail_thread_id'))return links.filter(x=>x.project_id==='p1').map(x=>({gmail_thread_id:x.gmail_thread_id}));
      if(path.startsWith('project_emails?project_id=eq.p1&select=gmail_thread_id'))return emails.filter(x=>x.project_id==='p1').map(x=>({gmail_thread_id:x.gmail_thread_id}));
      if(path.startsWith('project_email_links?gmail_thread_id=eq.t1&select=project_id'))return links.filter(x=>x.gmail_thread_id==='t1').map(x=>({project_id:x.project_id}));
      if(path.startsWith('project_emails?gmail_thread_id=eq.t1&project_id=not.is.null&select=project_id'))return emails.filter(x=>x.gmail_thread_id==='t1'&&x.project_id).map(x=>({project_id:x.project_id}));
      if(path.startsWith('project_emails?gmail_thread_id=eq.t1&select=id,gmail_message_id'))return emails.filter(x=>x.gmail_thread_id==='t1').map(x=>({...x}));
      let m=path.match(/^project_email_links\?project_id=eq\.p1&gmail_message_id=eq\.([^&]+)/);if(m){const id=decodeURIComponent(m[1]);return links.filter(x=>x.project_id==='p1'&&x.gmail_message_id===id).map(x=>({id:x.id}));}
      return[];
    }
    if(path==='project_emails'&&method==='POST'){
      const rows=Array.isArray(body)?body:[body];rows.forEach(r=>emails.push({id:'e'+(++seq),...r}));return rows;
    }
    let p=path.match(/^project_emails\?id=eq\.([^&]+)/);if(p&&method==='PATCH'){
      const id=decodeURIComponent(p[1]),row=emails.find(x=>String(x.id)===id);if(row)Object.assign(row,body);return row?[row]:[];
    }
    if(path==='project_email_links'&&method==='POST'){
      const row={id:'l'+(++seq),...body};links.push(row);return[row];
    }
    throw new Error('Unexpected DB call '+method+' '+path);
  };

  w.eval(source);
  w.eval(gateSource);

  const clean=await w.PSTProjectDataIntegrity.load('p1');
  assert.deepStrictEqual(Array.from(clean.inboxDocs,x=>x.id),['inbox-real-file'],'Email-only offers_inbox rows must not appear as files');
  assert(!clean.files.some(x=>x.id==='inbox-email-only'),'Phantom generic Dokument row must be removed from files');
  assert(clean.files.some(x=>x.name==='drawing.xlsx'),'Real Drive file must remain visible');

  await w.pstRecoverLinkedProjectGmail('p1');
  assert.strictEqual(recoveryCalls,1,'Original linked-Gmail recovery must still open after continuity repair');
  assert.strictEqual(contactSync,1,'Project contacts must refresh after thread continuity repair');
  assert.strictEqual(gmailThreadReads,1,'Confirmed thread must be read exactly once during authenticated recovery');
  const first=emails.find(x=>x.gmail_message_id==='m1');
  const second=emails.find(x=>x.gmail_message_id==='m2');
  assert.strictEqual(first.has_attachments,true,'Existing linked email must receive the real attachment flag from full Gmail payload');
  assert(second&&second.project_id==='p1','Missing later message in confirmed thread must be linked to the same project');
  assert.strictEqual(second.match_method,'confirmed-thread-recovery');
  assert(links.some(x=>x.gmail_message_id==='m2'&&x.project_id==='p1'),'Recovered message must receive an explicit project_email_link');

  workspaceToken='';
  const beforeAuthReads=gmailThreadReads,beforeAuthRecovery=recoveryCalls;
  const gatedResult=w.pstRecoverLinkedProjectGmail('p1');
  assert.strictEqual(gatedResult,false,'Missing browser token must stop at the explicit OAuth gate');
  assert(w.document.getElementById('pst-linked-gmail-auth-gate'),'OAuth gate must be visible when no cached Gmail+Drive token exists');
  assert.strictEqual(gmailThreadReads,beforeAuthReads,'Continuity must not read Gmail before explicit authorization');
  assert.strictEqual(recoveryCalls,beforeAuthRecovery,'Attachment recovery must not run before explicit authorization');
  w.document.getElementById('pst-linked-gmail-auth-run').click();
  await new Promise(r=>setTimeout(r,30));
  assert.strictEqual(authorizeCalls,1,'Explicit OAuth button must authorize exactly once');
  assert(gmailThreadReads>beforeAuthReads,'Continuity must resume after explicit authorization');
  assert(recoveryCalls>beforeAuthRecovery,'Attachment recovery must resume after explicit authorization');

  links.push({id:'mixed',project_id:'p2',gmail_message_id:'other',gmail_thread_id:'t1',link_method:'manual'});
  const before=emails.length,readsBefore=gmailThreadReads;
  const blocked=await w.PSTProjectIntakeContinuityV1._test.normalizeThread('p1','t1','workspace-token');
  assert.strictEqual(blocked.blocked,true,'Mixed-project thread must be blocked');
  assert.strictEqual(emails.length,before,'Mixed-project thread must not write new email relations');
  assert.strictEqual(gmailThreadReads,readsBefore,'Mixed-project ownership must be checked before Gmail normalization');

  dom.window.close();
  console.log('Project intake continuity smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});