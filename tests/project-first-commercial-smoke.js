const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const pf2=fs.readFileSync('pristeel-project-first-v2.js','utf8');
  const commercial=fs.readFileSync('pristeel-project-first-commercial-v1.js','utf8');
  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

  assert(bootstrap.includes("pristeel-supplier-offer-postsave-ui-v1.js?v=20260809-1"),'Live bootstrap must load supplier offer post-save UI');
  assert(bootstrap.includes("pristeel-email-offer-draft-editor-bridge-v1.js?v=20260812-currency1"),'Live bootstrap must cache-bust the FX-safe supplier editor bridge');
  assert(bootstrap.includes("pristeel-project-first-commercial-v1.js?v=20260812-fx2"),'Live bootstrap must cache-bust the FX-safe commercial comparison module');
  assert(bootstrap.includes("pristeel-project-commercial-prefill-rescue-v1.js?v=20260809-2"),'Live bootstrap must load the project commercial prefill rescue after the builder');
  assert(commercial.includes("pristeel-project-commercial-prefill-v1.js?v=20260809-3"),'Commercial workflow must cache-bust the project-aware offer prefill');
  assert(!/MutationObserver|setInterval\s*\(/.test(commercial),'Commercial compare must not poll or globally observe');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" style="display:block">
      <div class="pst-pi-tabs"></div>
      <div id="pst-pi-body"></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const integrity={
    project:{id:'p1',name:'Dukley',client:'ITALIAN STYLE',status:'aktiv',drive_folder_id:'d1'},
    emails:[],contacts:[],bom:[],rfqs:[],
    supplierOffers:[
      {id:'o1',supplier:'Sector Construction',price_kg:1.85,total_amount:1000,total_eur:1000,currency:'EUR',created_at:'2026-08-09T08:00:00Z',notes:'Zinkimi i struktures metalike: 0.42 EUR/kg pa TVSH.\nPowder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH'},
      {id:'o2',supplier:'USD pa FX',price_kg:1.10,total_amount:1200,total_eur:null,currency:'USD',created_at:'2026-08-09T09:00:00Z',notes:''},
      {id:'o3',supplier:'USD me FX',price_kg:2.00,total_amount:2000,total_eur:1600,currency:'USD',exchange_rate_to_eur:0.80,created_at:'2026-08-09T10:00:00Z',notes:''}
    ],
    ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[]}
  };
  w.PSTProjectDataIntegrity={load:async()=>integrity};
  w.supaFetch=async()=>[];
  w.pstOpenProjectWorkspace=async id=>{w.__pstCurrentProjectId=id;w._curProjId=id;w.__pstIntegrityLastData=integrity;return true;};

  w.eval(pf2);
  w.eval(commercial);
  await w.pstOpenProjectWorkspace('p1');

  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.eurPrice(integrity.supplierOffers[0]),1.85,'EUR offer must normalize 1:1');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.eurPrice(integrity.supplierOffers[1]),null,'Foreign offer without FX must be excluded from EUR ranking');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.eurPrice(integrity.supplierOffers[2]),1.6,'Foreign offer with explicit FX must normalize to EUR');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.eurTotal(integrity.supplierOffers[2]),1600,'Original foreign total must normalize using explicit FX');

  const next=w.document.querySelector('[data-pf2-action="tab:commercial"]');
  assert(next,'Overview must expose the commercial comparison next-step action');
  next.click();
  await new Promise(r=>setTimeout(r,30));

  const table=w.document.querySelector('[data-pf2-compare]');
  assert(table,'Commercial comparison must be injected when navigating from the overview action');
  const text=table.textContent.replace(/\s+/g,' ');
  assert(text.includes('Sector Construction'),'Comparison must contain the supplier');
  assert(text.includes('1,85 EUR/kg'),'Comparison must show the stored unit rate instead of zero total');
  assert(text.includes('0,42 EUR/kg'),'Comparison must recover zinc rate from EUR/kg notes');
  assert(text.includes('0,56 EUR/kg'),'Comparison must recover coating rate from EUR/kg notes');
  assert(text.includes('Pa TVSH'),'Comparison must preserve supplier VAT note');
  assert(text.includes('Pa kurs FX'),'Foreign offer without FX must show a safety warning');
  assert(text.includes('1.200,00 USD'),'Foreign total must remain visible in original currency');
  assert(text.includes('Pa ekuivalent EUR'),'Foreign total without FX must not masquerade as EUR');
  assert(text.includes('≈ 1,60 EUR/kg'),'Foreign offer with FX must show normalized EUR rate');
  assert(text.includes('≈ 1.600,00 EUR'),'Foreign total with FX must show normalized EUR equivalent');

  const rows=[...table.querySelectorAll('tbody tr')];
  const noFx=rows.find(r=>r.textContent.includes('USD pa FX'));
  const withFx=rows.find(r=>r.textContent.includes('USD me FX'));
  assert(noFx && !noFx.classList.contains('best'),'Foreign offer without FX must never win raw-number ranking');
  assert(withFx && withFx.classList.contains('best'),'Lowest normalized EUR offer should be marked best');

  dom.window.close();
  console.log('Project-first commercial comparison smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-commercial-prefill-smoke.js');
require('./project-commercial-prefill-rescue-smoke.js');
require('./our-offer-source-smoke.js');
require('./our-offer-history-ui-smoke.js');
require('./supplier-offer-currency-smoke.js');
require('./project-pipeline-consistency-smoke.js');
require('./project-reference-smoke.js');