const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-summary-command-v1.js','utf8');
  const actionsSource=fs.readFileSync('pristeel-project-first-actions-v1.js','utf8');
  const bootstrapSource=fs.readFileSync('pristeel-project-emails.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project summary command must not poll or globally observe');
  assert(!/\/send\b|messages\/send|drafts\/send/.test(source),'Project summary command must never send Gmail messages');
  assert(source.includes('Përmbledh projektin'),'Visible project summary command label is missing');
  assert(source.includes('PSTProjectIntakeContinuityV1'),'Summary command must reconcile confirmed project Gmail before analysis');
  assert(source.includes('pstAnalyzeProject'),'Summary command must reuse existing Project Intelligence');
  assert(source.includes('Vlera e kontratës'),'Summary must prioritize the commercial contract value');
  assert(source.includes('Detaje operative'),'Technical counters must be demoted to collapsible operational details');
  assert(source.includes('Brief i projektit'),'Project Intelligence must present itself as a discussion brief');
  assert(actionsSource.includes('pristeel-project-summary-command-v1.js?v=20260815-brief2'),'Current ProjectFirst actions must load the redesigned summary command');
  assert(bootstrapSource.includes('pristeel-project-first-actions-v1.js?v=20260818-reactive2'),'ProjectFirst actions cache-bust must remain on the current audited production bootstrap');
  assert(!bootstrapSource.includes('pristeel-project-first-actions-v1.js?v=20260810-offers2'),'Stale pre-summary ProjectFirst actions cache key must not remain in runtime bootstrap');
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
    emails:[{id:'e1'},{id:'e2'}],contacts:[{id:'c1'}],files:[],drive:{state:'authorized',rows:[{id:'g1',name:'drawing.pdf'}]},bom:[],rfqs:[],supplierOffers:[],ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],guarantees:[]
  };
  w.__pstCurrentProjectId='p1';w._curProjId='p1';w.__pstIntegrityLastData=base;
  w.PSTGoogleWorkspaceAuth={getAccessToken:()=>token,authorize:async()=>{authorizeCalls++;token='tok';return token;}};
  w.PSTProjectIntakeContinuityV1={sync:async()=>{syncCalls++;return{linked:1};}};
  w.PSTProjectDataIntegrity={load:async()=>{integrityLoads++;w.__pstIntegrityLastData=fresh;return fresh;}};
  w.PSTProjectFirstV2={render:async()=>{renders++;}};
  w.PSTProjectAnalysisV1={load:async()=>{analysisLoads++;},render:()=>{},run:async()=>{analysisRuns++;}};
  w.pstAnalyzeProject=async()=>{analysisRuns++;};
  w.PSTProjectIntelligenceV1={};
  w.confirm=()=>true;
  w.alert=()=>{};
  w.console.warn=()=>{};
  w.console.error=()=>{};
  w.eval(source);

  const api=w.PSTProjectSummaryCommandV1;
  assert(api,'Project summary command API missing');
  api.install();
  const btn=[...w.document.querySelectorAll('.pst-pi-actions button')].find(b=>b.textContent.includes('Përmbledh projektin'));
  assert(btn,'Project summary button was not injected');
  assert(![...w.document.querySelectorAll('.pst-pi-actions button')].some(b=>b.textContent==='Pamja e vjetër'),'Legacy project view switch must be removed');

  await api.summarize();
  assert.strictEqual(authorizeCalls,1,'Summary must request Drive authorization when project Drive is known but unauthorized');
  assert.strictEqual(syncCalls,1,'Summary must reconcile confirmed Gmail relations before analysis');
  assert(integrityLoads>=1,'Summary must refresh the full project integrity snapshot');
  assert(renders>=1,'Summary must rerender ProjectFirst after reconciliation');
  assert(analysisRuns>=1,'Summary must run Project Intelligence after refresh');

  const stat=api._test.projectStats({
    project:{name:'X',client:'Y',status:'won',pipeline_stage:'execution',contract_value_eur:123456.78},
    emails:[{},{}],contacts:[{}],files:[{}],drive:{rows:[{},{}]},bom:[{kg:1000}],rfqs:[{},{}],supplierOffers:[{}],ourOffers:[{}],invoicesOut:[{total_eur:5000}],invoicesIn:[{total_eur:2000}],adjustments:[],guarantees:[]
  });
  assert.strictEqual(stat.contractValue,123456.78,'Project stats must expose commercial contract value');
  assert.strictEqual(stat.docs,3,'Project stats must combine registry and Drive documents without losing the operational count');
  assert.strictEqual(stat.kg,1000);

  const html=api._test.briefHtml({project:{name:'X',client:'Y',status:'won',pipeline_stage:'execution',contract_value_eur:123456.78},emails:[],contacts:[],files:[],drive:{rows:[]},bom:[],rfqs:[],supplierOffers:[],ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],guarantees:[]});
  assert(/Vlera e kontratës/.test(html),'Commercial contract value must be visible in the project brief');
  assert(/Detaje operative/.test(html),'Operational counters must remain available in a collapsed detail block');

  const pg=w.document.getElementById('page-workspace-project');
  w.__pstIntegrityLastData={project:{id:'p1'},drive:{state:'not-authorized',rows:[]}};
  api._test.normalizeDriveEmpty(pg);
  assert.strictEqual(pg.querySelector('section header span').textContent,'Drive pa autorizim');
  dom.window.close();
  console.log('Project summary command smoke: OK');
})().catch(e=>{console.error(e);process.exit(1)});