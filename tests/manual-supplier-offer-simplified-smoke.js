'use strict';
const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-manual-supplier-offer-v1.js','utf8');
  const workflowSource=fs.readFileSync('pristeel-project-workflow-canonical-v1.js','utf8');
  assert(workflowSource.includes("if(!t||t.id==='page-workspace-project')return;"),'Canonical project workflow must not treat the workspace state root as a clickable workflow control');
  assert.doesNotThrow(()=>new Function(source),'Manual supplier offer bridge must remain valid JavaScript');
  assert(source.includes(".pst-csf-suppliers"),'Manual supplier bridge must recognize the current simplified commercial supplier card');
  assert(source.includes('header h2'),'Manual supplier bridge must recognize the current supplier-card title');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="page active pf2-on" data-pwf-area="procurement" data-pwf-stage="offers">
      <div id="pst-pi-body">
        <div class="pst-csf" data-pst-csf="1">
          <section class="pst-csf-suppliers">
            <header><div><span>HAPI 1</span><h2>Ofertat e furnitorëve</h2></div><b>0 oferta</b></header>
            <div class="pst-csf-supplier-grid"><div>Ende nuk ka oferta furnitorësh.</div></div>
          </section>
        </div>
      </div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const calls=[];
  w.__pstCurrentProjectId='fc96208d-356c-410a-a356-96ce9e9b4d2f';
  w._curProjId=w.__pstCurrentProjectId;
  w.__pstIntegrityLastData={project:{id:w.__pstCurrentProjectId,name:'Evosys Laser GmbH - ANF-9203'}};
  w.supaFetch=async(path,method,body)=>{calls.push({path,method,body});return[];};

  w.eval(source);
  assert(w.PSTManualSupplierOfferV1,'Manual supplier bridge must install');
  assert.strictEqual(w.PSTManualSupplierOfferV1.inject(),true,'Manual supplier bridge must attach to current simplified supplier card');
  await new Promise(r=>setTimeout(r,10));

  const card=w.document.querySelector('.pst-csf-suppliers');
  const btn=card.querySelector('[data-mso-open]');
  assert(btn,'Current simplified supplier card must expose the manual-offer action');
  btn.click();
  assert(w.document.getElementById('pst-mso-modal'),'Manual-offer action must open the entry modal');
  assert.strictEqual(w.document.querySelector('#pst-mso-title').textContent.trim(),'Shto ofertë furnitori');
  assert(!calls.some(x=>String(x.path).includes('pppp_record_supplier_decision_v1')),'Opening the manual-offer card must never select a supplier');
  assert(!calls.some(x=>String(x.path).includes('pppp_create_manual_supplier_offer_v1')),'Opening the manual-offer card must never create an offer before explicit save');

  dom.window.close();
  console.log('Manual supplier offer simplified-card smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
