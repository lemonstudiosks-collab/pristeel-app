const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-intelligence-resilience-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Resilience layer must not poll or globally observe');
  assert(!/messages\/send|drafts\/send|\/send\b/.test(source),'Resilience layer must never send Gmail messages');

  const dom=new JSDOM(`<!doctype html><html><body>
    <div id="pai-state-p1"></div>
    <div id="pst-project-summary-bg"><div class="pst-ps-metric"><span>Detyra hapur</span><b>10</b></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';w._curProjId='p1';

  let aiAvailable=true,analysisCalls=0,patchPayload=null;
  const tasks=[
    {id:'t1',status:'hapur'},
    {id:'t2',status:'kryer'},
    {id:'t3',status:'arkivuar'}
  ];
  const latest={id:77,analysis:{
    executive_summary:'Ky është vlerësim operativ me rregulla; analiza semantike kërkon Groq API Key.',
    health:{score:50,label:'në rrezik',reason:'Rezultat operativ.'},
    recommendation:{decision:'prit',label:'Prit',reason:'x'},
    risks:[{text:'Afati i projektit ka kaluar.',severity:'critical'}],
    next_actions:[{title:'Konfirmo statusin e afatit me klientin'}],
    deadlines:[{text:'Afati i regjistruar i projektit',status:'confirmed'}]
  }};
  w.PSTAI={hasApiKey:()=>aiAvailable};
  w.supaFetch=async (path,method,body)=>{
    if(path.startsWith('tasks?'))return tasks;
    if(path.startsWith('projects?'))return[{id:'p1',status:'realizuar',pipeline_stage:'transport',deadline:'2026-07-24'}];
    if(path.startsWith('project_analyses?')&&method==='PATCH'){patchPayload=body;return[Object.assign({},latest,body)];}
    if(path.startsWith('project_analyses?'))return[latest];
    return[];
  };
  const taskCounts=[];
  w.pstAnalyzeProject=async pid=>{
    analysisCalls++;
    const rows=await w.supaFetch('tasks?project_id=eq.'+encodeURIComponent(pid)+'&select=*');
    taskCounts.push(rows.length);
    if(w.PSTAI.hasApiKey())w.document.getElementById('pai-state-'+pid).textContent='Analiza dështoi: Rate limit reached; TPM limit 8000; try again in 46s.';
    else w.document.getElementById('pai-state-'+pid).textContent='Analiza operative u krijua.';
  };
  w.pstProjectAnalysisLoad=async()=>{};
  w.eval(source);

  const T=w.PSTProjectIntelligenceResilienceV1._test;
  assert.strictEqual(T.isOpenTask({status:'hapur'}),true);
  assert.strictEqual(T.isOpenTask({status:'kryer'}),false);
  assert.strictEqual(T.isOpenTask({status:'arkivuar'}),false);
  assert.strictEqual(T.isRateLimitText('Rate limit reached for TPM 8000'),true);
  assert.strictEqual(T.isRateLimitText('Invalid API key'),false);
  assert.strictEqual(T.terminalStatus('realizuar'),true);

  await w.pstAnalyzeProject('p1');
  assert.strictEqual(analysisCalls,2,'Rate-limit must retry exactly once through the existing local rules engine');
  assert.deepStrictEqual(taskCounts,[1,1],'Project Intelligence must receive only currently open tasks');
  assert.strictEqual(w.PSTAI.hasApiKey(),true,'AI availability function must be restored after scoped fallback');
  assert(patchPayload,'Terminal fallback analysis must be post-processed');
  assert.strictEqual(patchPayload.engine,'rules_rate_limit');
  assert.strictEqual(patchPayload.analysis.risks.length,0,'Completed project must not retain the local active-overdue risk');
  assert.strictEqual(patchPayload.analysis.next_actions.length,0,'Completed project must not ask to reconfirm the obsolete deadline');
  assert.strictEqual(patchPayload.analysis.deadlines[0].status,'completed');
  assert(/shërbimi AI është i disponueshëm/.test(patchPayload.analysis.executive_summary),'Fallback summary must explain semantic analysis can be refreshed later');
  assert.strictEqual(w.document.querySelector('.pst-ps-metric b').textContent,'1','Summary modal must show the live open-task count');
  assert(/Analiza operative u krijua/.test(w.document.getElementById('pai-state-p1').textContent),'Rate-limit must end with a usable operational analysis state');

  dom.window.close();
  console.log('Project Intelligence resilience smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
