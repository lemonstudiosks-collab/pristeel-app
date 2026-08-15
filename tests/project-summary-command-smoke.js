const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-summary-command-v1.js','utf8');
  const actionsSource=fs.readFileSync('pristeel-project-first-actions-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project summary command must not poll or globally observe');
  assert(!/\/send\b|messages\/send|drafts\/send/.test(source),'Project summary command must never send Gmail messages');
  assert(source.includes('Përmbledh projektin'),'Visible project summary command label is missing');
  assert(source.includes('PSTProjectIntakeContinuityV1'),'Summary command must reconcile confirmed project Gmail before analysis');
  assert(source.includes('pstAnalyzeProject'),'Summary command must reuse existing Project Intelligence');
  assert(actionsSource.includes('pristeel-project-summary-command-v1.js'),'Current ProjectFirst actions must load the summary command');
  assert(actionsSource.includes("sub.textContent='Drive pa autorizim'"),'Unauthorized permanent Drive must not be labeled as zero files');

  const dom=new JSDOM(`<!doctype html><html><body>
    <div id="page-workspace-project" class="pf2-on">
      <div class="pst-pi-head"><div class="pst-pi-actions"><button type="button">Pamja e vjetër</button><button type="button">Puno me projektin</button></div></div>
      <section class="pf2-card"><header><div><b>Skedarët e projektit</b><span>0 skedarë</span></div></header><div><div class="pf2-empty">Nuk ka të dhëna.</div></div></section>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  let token='',authorizeCalls=0,syncCalls=0,integrityLoads=0,renders=0,analysisLoads=0,analysisRuns=0;
  const base={
    project:{id:'p1',name:'Steel Hall Project',client:'Client AG',status:'pritje',pipeline_stage:'supplier_selection',deadline:'2026-08-30',drive_folder_id:'folder1'},
    emails:[{id:'e1'}],contacts:[{id:'c1'}],files:[],drive:{state:'not-authorized',rows:[]},bom:[],rfqs:[],supplierOffers:[],ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],guarantees:[]
  };
  const fresh={
    project:base.project,
    emails:[{id:'e1'},{id:'e2'},{id:'e3'},{id:'e4'}],contacts:[{id:'c1'},{id:'c2'},{id:'c3'},{id:'c4'}],
    files:[{id:'f1'},{id:'f2'}],drive:{state:'ok',rows:[{id:'f1',name:'drawing.xlsx'},{id:'f2',name:'project.zip'}]},bom:[],
    rfqs:[{id:'r1'},{id:'r2'}],supplierOffers:[],ourOffers:[],invoicesOut:[{gross_amount:1200,currency:'EUR'}],invoicesIn:[],adjustments:[],guarantees:[]
  };
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';
  w.__pstIntegrityLastData=base;
  w.PSTGoogleWorkspaceAuth={
    gmailScope:'gmail.readonly',driveScope:'drive',
    cachedToken:()=>token,
    authorizeForIntake:async()=>{authorizeCalls++;token='workspace-token';return token;}
  };
  w.PSTProjectIntakeContinuityV1={normalizeProjectThreads:async(pid,t)=>{syncCalls++;assert.strictEqual(pid,'p1');assert.strictEqual(t,'workspace-token');return{threads:1,added:1,updated:3,attachments:2,rfqs:2};}};
  w.PSTProjectDataIntegrity={load:async pid=>{integrityLoads++;assert.strictEqual(pid,'p1');return token?fresh:base;}};
  w.PSTProjectFirstV2={render:()=>{renders++;}};
  w.supaFetch=async path=>path.startsWith('tasks?project_id=eq.p1')?[{id:'t1',status:'open'},{id:'t2',status:'done'}]:[];
  w.pstProjectAnalysisLoad=async pid=>{analysisLoads++;const host=w.document.getElementById('pai-body-'+pid);if(host)host.textContent='Analiza e fundit';};
  w.pstAnalyzeProject=async pid=>{analysisRuns++;const host=w.document.getElementById('pai-body-'+pid);if(host)host.textContent='Përmbledhja ekzekutive e freskët';};
  w.pstProjectAnalysisHistory=()=>{};
  w.pstProjectAnalysisCreateTasks=()=>{};
  w.pstOpenProjectWorkspace=()=>true;

  w.eval(source);
  w.PSTProjectSummaryCommandV1.decorate();

  const button=w.document.querySelector('[data-pst-project-summary]');
  assert(button,'Every modern project must receive a visible summary button');
  assert.strictEqual(button.textContent,'Përmbledh projektin');
  const actions=Array.from(w.document.querySelectorAll('.pst-pi-actions button'));
  assert(actions.indexOf(button)<actions.findIndex(x=>x.textContent==='Puno me projektin'),'Summary command should be visible beside the main project action');

  const driveNote=w.document.querySelector('.pst-ps-drive-note');
  assert(driveNote,'Unauthorized permanent Drive folder must show an explicit authorization state');
  assert(driveNote.textContent.includes('nuk është autorizuar'),'Files UX must explain why Drive rows are unavailable');
  assert(driveNote.querySelector('button')&&driveNote.querySelector('button').textContent.includes('Autorizo'),'Unauthorized Drive must expose an explicit authorization action');

  button.click();
  await new Promise(r=>setTimeout(r,80));

  assert(w.document.getElementById('pst-project-summary-bg'),'Summary modal must open from one click');
  assert.strictEqual(authorizeCalls,1,'Summary click must authorize Google Workspace at most once when required');
  assert.strictEqual(syncCalls,1,'Summary click must reconcile the confirmed project thread before analysis');
  assert(integrityLoads>=1,'Summary click must reload project integrity');
  assert(renders>=1,'Summary sync must refresh ProjectFirst after data changes');
  assert(analysisLoads>=1,'Summary must load existing Project Intelligence history');
  assert.strictEqual(analysisRuns,1,'Summary click must run one fresh Project Intelligence analysis');
  const snap=w.document.getElementById('pst-ps-snapshot').textContent;
  assert(snap.includes('4'),'Fresh snapshot must reflect reconciled project data');
  assert(snap.includes('2 në Drive'),'Fresh snapshot must reflect real Drive rows');
  assert(snap.includes('RFQ të rikuperuara tani')&&snap.includes('2'),'Snapshot must expose RFQ recovery from the confirmed Gmail thread');
  assert(w.document.getElementById('pai-body-p1').textContent.includes('Përmbledhja ekzekutive'),'Existing Project Intelligence output must render in the new project summary modal');

  dom.window.close();
  console.log('Project summary command smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});