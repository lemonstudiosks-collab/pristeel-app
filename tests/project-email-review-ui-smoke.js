const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const code=fs.readFileSync('pristeel-project-email-review-ui-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"><section class="pf2-card"><header><div><b>Emailat e projektit</b></div></header><div></div></section></div></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const writes=[];const alerts=[];
  w.alert=t=>alerts.push(String(t));w.confirm=()=>true;
  w.__pstIntegrityLastData={
    project:{id:'p1',name:'Project One'},
    emails:[
      {id:1,gmail_message_id:'g1',project_id:'p1',needs_review:true,subject:'Review one',from_email:'supplier@example.com',match_method:'email-unique',review_reason:'Historical supplier-domain-only auto-match;',sent_at:'2026-08-01T10:00:00Z'},
      {id:2,gmail_message_id:'g2',project_id:'p1',needs_review:true,subject:'Review two',from_email:'supplier@example.com',match_method:'email-shared',review_reason:'Check this.',sent_at:'2026-08-02T10:00:00Z'},
      {id:3,gmail_message_id:'g3',project_id:'p1',needs_review:true,subject:'Manual protected',from_email:'supplier@example.com',match_method:'email-unique',review_reason:'Check manual link.',sent_at:'2026-08-03T10:00:00Z'},
      {id:4,gmail_message_id:'g4',project_id:'p2',needs_review:true,subject:'Linked from other project',from_email:'other@example.com',match_method:'email-unique'},
      {id:5,gmail_message_id:'g5',project_id:'p1',needs_review:false,subject:'Already fine',from_email:'ok@example.com'}
    ]
  };
  w.supaFetch=async(path,method,body)=>{
    if(path.startsWith('project_email_links?project_id=eq.p1&gmail_message_id=eq.g2'))return[{id:20,link_method:'email'}];
    if(path.startsWith('project_email_links?project_id=eq.p1&gmail_message_id=eq.g3'))return[{id:30,link_method:'manual'}];
    if(method==='PATCH'||method==='DELETE')writes.push({path,method,body});
    return[];
  };

  w.eval(code);
  const api=w.PSTProjectEmailReviewUiV1;
  assert(api,'Email review UI must install');
  assert.strictEqual(api.flagged(w.__pstIntegrityLastData).length,3,'Only direct current-project review rows should be included');
  assert(api.render(),'Review card must render when review rows exist');
  const card=w.document.getElementById('pst-email-review-card');
  assert(card,'Review card missing');
  assert.strictEqual(card.querySelectorAll('.pst-er-row').length,3,'Review card must show three direct review rows');
  assert(!card.textContent.includes('Linked from other project'),'linkedOnly/other-project review email must not be shown');
  assert(!card.textContent.includes('Already fine'),'non-review email must not be shown');

  writes.length=0;
  await api.keep('1');
  assert(writes.some(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.1'&&x.body.needs_review===false),'Keep action must only clear review flag');
  assert.strictEqual(w.__pstIntegrityLastData.emails[0].project_id,'p1','Keep action must preserve project assignment');

  writes.length=0;
  await api.unlink('2');
  assert(writes.some(x=>x.method==='DELETE'&&x.path==='project_email_links?id=eq.20'),'Auto project link must be removed');
  const unlinkPatch=writes.find(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.2');
  assert(unlinkPatch,'Unlink action must patch the email');
  assert.strictEqual(unlinkPatch.body.project_id,null,'Unlink must clear only current project assignment');
  assert.strictEqual(unlinkPatch.body.needs_review,true,'Unlinked email must remain reviewable in the system');

  writes.length=0;alerts.length=0;
  await api.unlink('3');
  assert.strictEqual(writes.length,0,'Manual project link must block all unlink writes');
  assert(alerts.some(x=>/manuale|Gmail-panel/i.test(x)),'Manual-link block must be explained');

  dom.window.close();
  console.log('Project email review UI smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});