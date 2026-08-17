const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-live-intelligence-v1.js','utf8');
  assert(!/supaFetch\([^\)]*['"](?:POST|PATCH|DELETE)/.test(source),'Live intelligence UI layer must remain read-only');
  assert(source.includes('AI JSON dështoi; u përdor përgjigjja deterministike'),'Conversation must expose deterministic fallback instead of raw provider failure');
  assert(source.includes('installation_price_pending'),'Fallback must understand installation price pending state');

  const dom=new JSDOM('<!doctype html><html><head></head><body><div id="pai-body-p1"><div class="pai-top">OLD</div><div class="pai-grid">OLDGRID</div><div class="pai-meta">OLDMETA</div></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;w.__pstCurrentProjectId='p1';
  const project={id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',status:'pritje',pipeline_stage:'client_offer'};
  const task={id:'t1',project_id:'p1',title:'Urgjent: Drafti PST-OFF-2026-08-024 gati — plotëso montazhin',detail:'Drafti u krijua. Montimi duhet plotësuar.',status:'hapur',source:'email_request_auto',source_ref:'m1',created_at:'2026-08-17T14:10:00Z'};
  const email={gmail_message_id:'m1',subject:'Dukley Seafront Restaurant-Mejl od Investitora',sent_at:'2026-08-17T13:13:35Z',direction:'incoming',from_name:'Aleksandar'};
  const doc={id:'q1',doc_nr:'PST-OFF-2026-08-024',total_amount:68009.98,followup_status:'draft',created_at:'2026-08-17T14:11:00Z',offer_state:{revision_status:'draft_review',subtotal_before_installation:68009.98,installation_price_pending:true}};
  const old={id:8,created_at:'2026-08-15T18:32:00Z',engine:'rules_rate_limit',model:'deterministic-v1',analysis:{current_stage:'arkivuar'}};
  w.supaFetch=async(path)=>{
    if(path.startsWith('projects?'))return[project];
    if(path.startsWith('tasks?'))return[task];
    if(path.startsWith('project_emails?'))return[email];
    if(path.startsWith('documents_registry?'))return[doc];
    if(path.startsWith('project_analyses?'))return[old];
    return[];
  };
  w.pstAnalyzeProject=()=>{};
  w.eval(source);
  const api=w.PSTProjectLiveIntelligenceV1;assert(api,'Live intelligence API missing');
  const snap=await api.liveSnapshot('p1');
  assert.strictEqual(snap.request.id,'t1','Latest client request task must be available');
  assert.strictEqual(snap.revision.doc_nr,'PST-OFF-2026-08-024','Revision draft must be available');
  assert.strictEqual(api._test.newerThanAnalysis(snap),true,'New email/task/revision must supersede stale terminal analysis');
  const fb=await api.fallback('p1','me jep nje permbledhje');
  assert(/PST-OFF-2026-08-024/.test(fb.answer),'Fallback must name the current revision draft');
  assert(/68\.009,98 EUR/.test(fb.answer),'Fallback must report current subtotal');
  assert(/montimit/.test(fb.answer),'Fallback must report installation as pending');
  await api.decorate('p1');
  assert(w.document.getElementById('pst-live-intel-p1'),'Stale analysis must receive a current-state replacement card');
  assert.strictEqual(w.document.querySelector('.pai-top').style.display,'none','Stale top recommendation must not remain authoritative');
  dom.window.close();
  console.log('Project live intelligence smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});