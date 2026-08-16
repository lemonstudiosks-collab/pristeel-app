const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-analysis-run-guard-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><body>
    <button type="button" data-pst-project-summary="1">Përmbledh projektin</button>
    <div id="pst-project-summary-bg"></div>
    <div id="pst-ps-sync-state">Përmbledhja po vazhdon me të dhënat e platformës. Google Workspace: popup blocked</div>
    <div id="pai-state-p1"></div>
    <div id="pai-progress-p1"><i id="pai-fill-p1"></i></div>
    <button type="button" id="pai-analyze-p1">Rifresko analizën</button>
    <div id="pai-body-p1"></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';
  w.__pstIntegrityLastData={project:{id:'p1'}};

  const records=[{id:'old',created_at:'2026-08-16T18:45:00Z',engine:'groq'}];
  w.supaFetch=async path=>path.startsWith('project_analyses?')?[records[records.length-1]]:[];
  w.PSTAI={hasApiKey:()=>false};

  let calls=0;
  w.pstAnalyzeProject=async pid=>{
    calls++;
    assert.strictEqual(pid,'p1');
    const rec={id:'new-'+calls,created_at:'2026-08-16T19:00:0'+calls+'Z',engine:'rules'};
    records.push(rec);
    return rec;
  };

  // Make bounded re-checks deterministic and fast in the smoke test.
  w.setTimeout=fn=>{Promise.resolve().then(fn);return 1;};
  w.clearTimeout=()=>{};

  w.eval(source);
  assert(w.PSTProjectAnalysisRunGuardV1,'Run guard must install');
  assert.strictEqual(w.PSTProjectAnalysisRunGuardV1.version,'20260816-5','Run guard v5 must be active');
  assert.strictEqual(typeof w.PSTProjectAnalysisRunGuardV1.run,'function','Run guard must expose one explicit run path');

  w.document.getElementById('pai-analyze-p1').click();
  await new Promise(r=>setImmediate(r));
  await new Promise(r=>setImmediate(r));
  assert.strictEqual(calls,1,'Manual refresh button must invoke exactly one guarded analysis run');

  w.document.querySelector('[data-pst-project-summary]').click();
  for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));
  assert.strictEqual(calls,2,'A settled Project Summary with no fresh record must self-heal by starting one guarded analysis run');

  dom.window.close();
  console.log('Project Analysis run guard smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
