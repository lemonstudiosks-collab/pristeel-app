const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-execution-guard-v1.js','utf8');
  new Function(source);
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Execution guard must not globally observe or poll');
  assert(!/supaFetch\s*\([^)]*(?:POST|PATCH|DELETE)/.test(source),'Execution guard must remain read-only');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <select id="global-proj"><option value="38bdf772-d73e-47b2-9d0f-6020e105aa62" selected>STACON - LAGERHALLE - HAMBURG</option></select>
    <div id="flow-bar"><button class="flow-step" onclick="flowGoto('bom')">BOM</button><button class="flow-step" onclick="flowGoto('rfq')">RFQ</button></div>
    <div id="page-workspace-project" class="page active pf2-on pwf-canonical" data-pwf-area="overview" style="display:block">
      <div class="pst-pi-tabs"><button data-pwf-area="overview">Përmbledhja</button><button data-pwf-area="procurement">Prokurimi</button><button data-pwf-area="execution">Ekzekutimi</button><button data-pwf-area="finance">Financat</button></div>
      <div id="pst-pi-body"><section class="pwf-project-context"><button class="pwf-next" data-pwf-stage="bom"><b>BOM</b><small>Vazhdo</small></button></section></div>
    </div>
    <div id="page-bom" class="page"></div><div id="page-rfq" class="page"></div><div id="page-kalkulator" class="page"></div><div id="page-oferta" class="page"></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;

  const project={
    id:'38bdf772-d73e-47b2-9d0f-6020e105aa62',
    name:'STACON - LAGERHALLE - HAMBURG',ref:'D-22/26',status:'Fituar',
    pipeline_stage:'production_control',operational_state:'execution',
    execution_bootstrapped_at:'2026-08-11T20:10:30Z',work_model:'production',deal_type:'full'
  };
  const integrity={
    project,
    ourOffers:[{id:'q1',series:'QUO',doc_nr:'D-22/26',total_eur:87375,currency:'EUR',followup_status:'won',created_at:'2026-06-01T10:00:00Z'}],
    docs:[
      {id:'q1',series:'QUO',doc_nr:'D-22/26',total_eur:87375,currency:'EUR',followup_status:'won',created_at:'2026-06-01T10:00:00Z'},
      {id:'i1',series:'INV',doc_nr:'PST-INV-2026-001',total_eur:26212.50,currency:'EUR',created_at:'2026-07-11T03:55:04Z'}
    ],
    offers:[{id:'s1',supplier:'Eurosteel Shpk — NENKONTRATE E NENSHKRUAR',total_eur:84608.40,notes:'Kontrate e nenshkruar 01.06.2026'}],
    supplierOffers:[],invoicesOut:[],
    invoicesIn:[{id:'ii1',supplier_invoice_nr:'ES017-26/2026',net_amount:25382.52,currency:'EUR',paid:true}],
    emails:[],contacts:[],bom:[],rfqs:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],mailAttachments:[],drive:{rows:[]}
  };
  w.__pstIntegrityLastData=integrity;
  w.__pstCurrentProjectId=project.id;w._curProjId=project.id;
  w.supaFetch=async path=>path.startsWith('other_costs?')?[]:[project];

  const canonicalCalls=[];
  w.PSTCanonicalProjectWorkflowV1={render(area,stage){canonicalCalls.push([area,stage]);const p=w.document.getElementById('page-workspace-project');p.setAttribute('data-pwf-area',area||'overview');return true;}};
  const pfCalls=[];
  w.PSTProjectFirstV2={render(tab){pfCalls.push(tab);return true;}};
  const legacyCalls=[];
  w.flowGoto=function(page){legacyCalls.push(['flow',page]);return true;};
  w.showPage=function(page){legacyCalls.push(['show',page]);return true;};
  const newCalls=[];
  w.pstPiNew=function(type){newCalls.push(type);return true;};
  w.pstPiLegacy=function(page){legacyCalls.push(['pi',page]);return true;};
  w.pstOpenProjectWorkspace=async()=>true;

  w.eval(source);
  const G=w.PSTProjectExecutionGuardV1;
  assert(G,'Execution guard must export its API');
  assert.strictEqual(G.isPostAward(project),true,'STACON execution state must be locked post-award');
  assert.strictEqual(G._test.preAwardPage('bom'),true);
  assert.strictEqual(G._test.preAwardPage('kalkulator'),true);
  assert.strictEqual(G._test.preAwardPage('invoices'),false);

  w.flowGoto('bom');
  assert(!legacyCalls.some(x=>x[0]==='flow'&&x[1]==='bom'),'Legacy BOM navigation must be blocked for won projects');
  assert(canonicalCalls.some(x=>x[0]==='execution'),'Blocked BOM navigation must route to execution');

  const before=canonicalCalls.length;
  w.showPage('kalkulator');
  assert(!legacyCalls.some(x=>x[0]==='show'&&x[1]==='kalkulator'),'Direct calculator page must be blocked for won projects');
  assert(canonicalCalls.length>before&&canonicalCalls[canonicalCalls.length-1][0]==='execution','Direct calculator entry must route to execution');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','pricing');
  assert.strictEqual(canonicalCalls[canonicalCalls.length-1][0],'execution','Canonical procurement render must be redirected to execution');
  w.PSTProjectFirstV2.render('commercial');
  assert.strictEqual(pfCalls[pfCalls.length-1],'execution','Project-first commercial tab must be redirected to execution');

  w.pstPiNew('offer');
  assert.strictEqual(newCalls.includes('offer'),false,'New client offer must be blocked after award');
  w.pstPiNew('invoice');
  assert.strictEqual(newCalls.includes('invoice'),true,'Invoice creation must remain allowed after award');

  G.decorate();
  assert(!w.document.querySelector('[data-pwf-area="procurement"]'),'Procurement top-level area must disappear for execution projects');
  assert(w.document.getElementById('pxg-execution-lock'),'Execution-lock explanation must be visible');

  const m=G.financeModel(integrity,[]);
  assert.strictEqual(m.contract,87375,'Won quote must be contract baseline');
  assert(Math.abs(m.committed-84608.40)<0.001,'Signed subcontract must be committed-cost baseline');
  assert(Math.abs(m.base-2766.60)<0.001,'Baseline project margin must equal contract minus committed cost');
  assert(Math.abs(m.revenue-26212.50)<0.001,'Registry invoice must be used as billed revenue when invoices_out is empty');
  assert(Math.abs(m.cost-25382.52)<0.001,'Linked incoming invoice must count as actual registered cost');
  assert(Math.abs(m.actual-829.98)<0.001,'Registered-to-date result must use billed revenue minus registered costs');

  const pre={id:'p2',name:'Normal RFQ project',status:'pritje',pipeline_stage:'rfq_in',operational_state:'active_work'};
  w.__pstIntegrityLastData={project:pre,ourOffers:[],docs:[],offers:[],invoicesOut:[],invoicesIn:[]};
  w.__pstCurrentProjectId='p2';w._curProjId='p2';
  assert.strictEqual(G.isPostAward(pre),false,'Normal pre-award project must stay editable in procurement flow');
  w.flowGoto('bom');
  assert(legacyCalls.some(x=>x[0]==='flow'&&x[1]==='bom'),'Pre-award BOM navigation must remain available');

  await new Promise(resolve=>setTimeout(resolve,1550));
  dom.window.close();
  console.log('Project execution guard smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
