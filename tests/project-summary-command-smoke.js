const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-summary-command-v1.js','utf8');
  const actionsSource=fs.readFileSync('pristeel-project-first-actions-v1.js','utf8');
  const bootstrapSource=fs.readFileSync('pristeel-project-emails.js','utf8');
  const workspaceSource=fs.readFileSync('pristeel-workspace-architecture-v1.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project summary command must not poll or globally observe');
  assert(!/\/send\b|messages\/send|drafts\/send/.test(source),'Project summary command must never send Gmail messages');
  assert(source.includes("var old=actions.querySelector('[data-pst-project-summary]');if(old)old.remove()"),'Project summary engine must remove any stale header summary button');
  assert(source.includes('PSTProjectIntakeContinuityV1'),'Summary command must reconcile confirmed project Gmail before analysis');
  assert(source.includes('pstAnalyzeProject'),'Summary command must reuse existing Project Intelligence');
  assert(source.includes('Vlera e kontratës'),'Summary must prioritize the commercial contract value');
  assert(source.includes('Detaje operative'),'Technical counters must be demoted to collapsible operational details');
  assert(source.includes('Brief i projektit'),'Project Intelligence must present itself as a discussion brief');
  assert(actionsSource.includes('pristeel-project-summary-command-v1.js?v=20260828-headerclean1'),'Current ProjectFirst actions must cache-bust the header-clean summary command');
  assert(bootstrapSource.includes('pristeel-project-first-actions-v1.js?v=20260828-headerclean1'),'ProjectFirst actions bootstrap must use the current header-clean cache key');
  assert(!bootstrapSource.includes('pristeel-project-first-actions-v1.js?v=20260810-offers2'),'Stale pre-summary ProjectFirst actions cache key must not remain in runtime bootstrap');
  assert(bootstrapSource.includes('pristeel-project-integrity-ui-v1.js?v=20260828-cleanowner1'),'Integrity UI must use the clean-owner cache key');
  assert(bootstrapSource.includes('pristeel-project-load-stability-v2.js?v=20260828-fastopen1'),'Project load stability must use the fast-open cache key');
  assert(bootstrapSource.includes('pristeel-project-first-v2.js?v=20260902-prioritycontext1'),'Project-first overview must use the priority-context cache key');
  assert(actionsSource.includes("sub.textContent='Drive pa autorizim'"),'Unauthorized permanent Drive must not be labeled as zero files');
  assert(!workspaceSource.includes('>Pamja e vjetër</button>'),'Legacy project-view button must not remain in the main project header');
  assert(!workspaceSource.includes('>Puno me projektin</button>'),'Generic legacy work button must not remain in the main project header');
  assert(!workspaceSource.includes('Butoni “Puno me projektin”'),'Legacy explanatory note must not remain in the project overview');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on">
      <div class="pst-pi-head"><div class="pst-pi-actions"><button type="button" data-pst-project-summary="1">Përmbledh projektin</button><button type="button">Mbyll projektin</button></div></div>
      <section class="pf2-card"><header><div><b>Skedarët e projektit</b><span>0 skedarë</span></div></header><div><div class="pf2-empty">Nuk ka të dhëna.</div></div></section>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstCurrentProjectId='p1';w._curProjId='p1';
  w.__pstIntegrityLastData={
    project:{id:'p1',name:'Steel Hall Project',client:'Client AG',status:'won',pipeline_stage:'execution',deadline:'2026-08-30',drive_folder_id:'folder1'},
    deal:{amount:123456.78},emails:[{},{}],contacts:[{}],files:[{}],drive:{state:'not-authorized',rows:[]},bom:[{kg:1000}],rfqs:[{},{}],supplierOffers:[{}],ourOffers:[{}],invoicesOut:[{total_eur:5000}],invoicesIn:[{total_eur:2000}],adjustments:[],guarantees:[]
  };
  w.supaFetch=async()=>[{id:'t1',status:'hapur',due_date:'2026-08-25'}];
  w.PSTGoogleWorkspaceAuth={gmailScope:'gmail.readonly',driveScope:'drive.readonly',cachedToken:()=> 'tok'};
  w.eval(source);

  const api=w.PSTProjectSummaryCommandV1;
  assert(api,'Project summary command API missing');
  assert.strictEqual(typeof api.open,'function','Summary open API missing');
  assert.strictEqual(typeof api.syncProject,'function','Summary sync API missing');
  assert.strictEqual(typeof api.decorate,'function','Summary decorate API missing');
  assert.strictEqual(api._test.cachedToken(),'tok','Summary must reuse an existing Google Workspace token');

  api.decorate();
  const actions=w.document.querySelector('.pst-pi-actions');
  const btn=actions.querySelector('[data-pst-project-summary]');
  assert.strictEqual(btn,null,'Project summary must not occupy the main project header');
  assert(actions.textContent.includes('Mbyll projektin'),'Useful project-close action must remain in the header');

  const driveNote=w.document.querySelector('.pst-ps-drive-note');
  assert(driveNote,'Unauthorized Drive state must be explained instead of looking like an empty folder');
  assert(/Dosja e projektit ekziston/.test(driveNote.textContent));

  const cv=api._test.contractValue(w.__pstIntegrityLastData);
  assert(/123\.456,78/.test(cv.text),'Commercial contract value must be prioritized in the project brief');
  assert(/HubSpot/.test(cv.source),'Contract-value provenance must remain visible');
  assert.strictEqual(api._test.isOpenTask({status:'hapur'}),true);
  assert.strictEqual(api._test.isOpenTask({status:'kryer'}),false);

  const snap=await api._test.snapshot('p1',w.__pstIntegrityLastData,{rfqs:1});
  assert(/Vlera e kontratës/.test(snap),'Commercial contract value must be visible in the project snapshot');
  assert(/Detaje operative/.test(snap),'Operational counters must remain available in a collapsed detail block');
  assert(/1 çështje të hapura/.test(snap),'Open project tasks must be reflected in the snapshot');
  assert(/Kërkon autorizim/.test(snap),'Unauthorized Drive state must remain explicit in the snapshot');

  dom.window.close();
  console.log('Project summary command smoke: OK');
})().catch(e=>{console.error(e);process.exit(1)});
