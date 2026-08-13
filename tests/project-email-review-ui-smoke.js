const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('pristeel-project-email-review-ui-v1.js','utf8');

async function testProjectLocal(){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"><section class="pf2-card"><header><div><b>Emailat e projektit</b></div></header><div></div></section></div></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window,writes=[],alerts=[];
  w.alert=t=>alerts.push(String(t));w.confirm=()=>true;
  w.__pstIntegrityLastData={project:{id:'p1',name:'Project One'},emails:[
    {id:1,gmail_message_id:'g1',project_id:'p1',needs_review:true,subject:'Review one',from_email:'supplier@example.com',match_method:'email-unique',review_reason:'Historical auto-match',sent_at:'2026-08-01T10:00:00Z'},
    {id:2,gmail_message_id:'g2',project_id:'p1',needs_review:true,subject:'Review two',from_email:'supplier@example.com',match_method:'email-shared',review_reason:'Check this.',sent_at:'2026-08-02T10:00:00Z'},
    {id:3,gmail_message_id:'g3',project_id:'p1',needs_review:true,subject:'Manual protected',from_email:'supplier@example.com',match_method:'email-unique',review_reason:'Check manual link.',sent_at:'2026-08-03T10:00:00Z'},
    {id:4,gmail_message_id:'g4',project_id:'p2',needs_review:true,subject:'Other project'},
    {id:5,gmail_message_id:'g5',project_id:'p1',needs_review:false,subject:'Already fine'}
  ]};
  w.supaFetch=async(path,method,body)=>{
    if(path.startsWith('project_email_links?project_id=eq.p1&gmail_message_id=eq.g2'))return[{id:20,link_method:'email'}];
    if(path.startsWith('project_email_links?project_id=eq.p1&gmail_message_id=eq.g3'))return[{id:30,link_method:'manual'}];
    if(method==='PATCH'||method==='DELETE'||method==='POST')writes.push({path,method,body});
    return[];
  };
  w.eval(code);const api=w.PSTProjectEmailReviewUiV1;
  assert(api,'Email review UI must install');
  assert.strictEqual(api.flagged(w.__pstIntegrityLastData).length,3,'Project-local queue must include only direct current-project review rows');
  assert(api.render(),'Project-local review card must render');
  assert.strictEqual(w.document.querySelectorAll('#pst-email-review-card .pst-er-row').length,3);
  writes.length=0;await api.keep('1');
  assert(writes.some(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.1'&&x.body.needs_review===false),'Keep must only clear review');
  writes.length=0;await api.unlink('2');
  assert(writes.some(x=>x.method==='DELETE'&&x.path==='project_email_links?id=eq.20'),'Auto link must be removable');
  const patch=writes.find(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.2');
  assert(patch&&patch.body.project_id===null&&patch.body.needs_review===true,'Unlinked email must remain reviewable');
  writes.length=0;alerts.length=0;await api.unlink('3');
  assert.strictEqual(writes.length,0,'Manual link must block unlink writes');
  assert(alerts.some(x=>/manuale|Gmail-panel/i.test(x)),'Manual-link block must be explained');
  dom.window.close();
}

async function testGlobalQueue(){
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-inbox" class="page active" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div><section id="pst-gmail-live-card"></section></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window,writes=[],alerts=[];
  w.alert=t=>alerts.push(String(t));w.confirm=()=>true;
  const queue=[
    {id:10,gmail_message_id:'gm10',gmail_thread_id:'gt10',from_email:'natasa@aktiva.com.mk',from_name:'Natasa',subject:'RE: Zahtev za sertifikate',sent_at:'2026-07-23T06:30:00Z',direction:'incoming',has_attachments:true,suggested_project_id:'p2',match_method:'email-shared+email-unique',match_confidence:100,review_reason:'Historical supplier-domain-only auto-match; review project assignment.'},
    {id:11,gmail_message_id:'gm11',gmail_thread_id:'gt11',from_email:'sales@prissteel.com',from_name:'Arianit',subject:'Mixed ANF-8910 / ANF-8915',sent_at:'2026-07-01T06:00:00Z',direction:'outgoing',has_attachments:false,suggested_project_id:null,match_method:'mixed-project-review',match_confidence:0,review_reason:'Mixed project thread.'},
    {id:12,gmail_message_id:'gm12',gmail_thread_id:'gt12',from_email:'x@example.com',subject:'Conflict',sent_at:'2026-06-01T06:00:00Z',direction:'incoming',suggested_project_id:'p2',needs_review:true}
  ];
  const projects=[{id:'p1',name:'EVOSYS ANF-8915',client:'EVOSYS',ref:'ANF 8915'},{id:'p2',name:'PROJEKT TENNET · SPIE',client:'SPIE',ref:'PROJEKT TENNET'}];
  w.supaFetch=async(path,method,body)=>{
    if(!method&&path.startsWith('project_emails?needs_review=eq.true'))return queue.slice();
    if(!method&&path.startsWith('projects?select='))return projects.slice();
    if(!method&&path.startsWith('project_emails?id=eq.10'))return[{id:10,project_id:null,needs_review:true,gmail_message_id:'gm10',gmail_thread_id:'gt10'}];
    if(!method&&path.startsWith('project_emails?id=eq.11'))return[{id:11,project_id:null,needs_review:true,gmail_message_id:'gm11',gmail_thread_id:'gt11'}];
    if(!method&&path.startsWith('project_emails?id=eq.12'))return[{id:12,project_id:null,needs_review:true,gmail_message_id:'gm12',gmail_thread_id:'gt12'}];
    if(!method&&path.startsWith('project_email_links?gmail_message_id=eq.gm10'))return[];
    if(!method&&path.startsWith('project_email_links?gmail_message_id=eq.gm12'))return[{id:90,project_id:'p1',link_method:'manual'}];
    if(method==='PATCH'||method==='POST'||method==='DELETE')writes.push({path,method,body});
    return[];
  };
  w.eval(code);const api=w.PSTProjectEmailReviewUiV1;
  assert(api&&api.globalLoad,'Global queue API must install');
  await api.globalLoad(true);
  const card=w.document.getElementById('pst-email-review-queue');
  assert(card,'Global review card must render in Inbox');
  assert.strictEqual(card.querySelectorAll('.pst-erq-row').length,3,'All projectless needs_review rows must render');
  assert(card.textContent.includes('PROJEKT TENNET · SPIE'),'Suggested project must be visible');
  assert(card.textContent.includes('Mixed ANF-8910 / ANF-8915'),'Mixed-project review must stay visibly unresolved');

  writes.length=0;await api.assignGlobal('10');
  assert(writes.some(x=>x.method==='POST'&&x.path==='project_email_links'&&x.body.link_method==='manual-review'&&x.body.project_id==='p2'),'Verified assignment must create explicit manual-review link');
  const assignPatch=writes.find(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.10');
  assert(assignPatch&&assignPatch.body.project_id==='p2'&&assignPatch.body.needs_review===false&&assignPatch.body.match_confidence===100,'Verified assignment must patch only the chosen email');

  writes.length=0;alerts.length=0;await api.assignGlobal('12');
  assert(!writes.some(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.12'),'Conflicting existing link must block reassignment');
  assert(alerts.some(x=>/STOP|lidhje tjetër/i.test(x)),'Conflict must be surfaced to the user');

  writes.length=0;await api.ignoreGlobal('11');
  const ignorePatch=writes.find(x=>x.method==='PATCH'&&x.path==='project_emails?id=eq.11');
  assert(ignorePatch&&ignorePatch.body.needs_review===false&&ignorePatch.body.project_id===undefined,'Not relevant must close review without assigning a project');
  assert(!writes.some(x=>x.method==='DELETE'),'Global review actions must not delete Gmail/data rows');
  dom.window.close();
}

(async()=>{await testProjectLocal();await testGlobalQueue();console.log('Project email review UI + global queue smoke test passed.');})().catch(e=>{console.error(e);process.exit(1);});