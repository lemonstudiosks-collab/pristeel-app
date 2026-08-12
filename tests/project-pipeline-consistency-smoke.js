const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
  const code=fs.readFileSync('pristeel-project-pipeline-consistency-v1.js','utf8');
  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"><div class="pf2-grid"></div></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstIntegrityLastData={
    project:{id:'p1',status:'pritje',pipeline_stage:'supplier_selection'},
    bom:[],rfqs:[],supplierOffers:[{id:'s1'}],ourOffers:[{id:'q1'}],currentOurOffer:{id:'q1'}
  };
  w.eval(code);
  const api=w.PSTProjectPipelineConsistencyV1;
  assert(api,'Pipeline consistency module must install');
  const d=api.drift(w.__pstIntegrityLastData);
  assert(d,'Stage lag must be detected');
  assert.strictEqual(d.current,'supplier_selection');
  assert.strictEqual(d.recommended,'client_offer');
  assert(api.render(),'Advisory must render in project overview');
  const text=w.document.getElementById('pst-pipeline-consistency-card').textContent.replace(/\s+/g,' ');
  assert(text.includes('Zgjedhja e prodhuesit'),'Current stage must be shown');
  assert(text.includes('Oferta & konfirmimi'),'Evidence-based suggested stage must be shown');
  assert(text.includes('nuk e ndryshon fazën automatikisht'),'UI must explicitly remain advisory');

  w.__pstIntegrityLastData.project.pipeline_stage='client_offer';
  assert.strictEqual(api.drift(w.__pstIntegrityLastData),null,'No advisory when current stage already matches evidence');
  api.render();
  assert.strictEqual(w.document.getElementById('pst-pipeline-consistency-card'),null,'Stale advisory must be removed when drift is resolved');

  w.__pstIntegrityLastData={project:{status:'pritje',pipeline_stage:'rfq_in'},bom:[],rfqs:[],supplierOffers:[{id:'s1'}],ourOffers:[]};
  assert.strictEqual(api.recommended(w.__pstIntegrityLastData),'supplier_selection','Supplier evidence should recommend supplier selection, not skip to client offer');

  w.__pstIntegrityLastData={project:{status:'fituar',pipeline_stage:'rfq_in'},supplierOffers:[{id:'s1'}],ourOffers:[{id:'q1'}]};
  assert.strictEqual(api.recommended(w.__pstIntegrityLastData),null,'Closed/won projects must not receive pre-award stage suggestions');

  dom.window.close();
  console.log('Project pipeline consistency smoke test passed.');
})();