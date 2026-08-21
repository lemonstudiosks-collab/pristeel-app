const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const pf2=fs.readFileSync('pristeel-project-first-v2.js','utf8');
  const commercial=fs.readFileSync('pristeel-project-first-commercial-v1.js','utf8');
  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

  assert(/pristeel-supplier-offer-postsave-ui-v1\.js\?v=[^'"\s]+/.test(bootstrap),'Live bootstrap must load a cache-busted supplier offer post-save UI');
  assert(/pristeel-email-offer-draft-editor-bridge-v1\.js\?v=[^'"\s]+/.test(bootstrap),'Live bootstrap must cache-bust the FX-safe supplier editor bridge');
  assert(/pristeel-project-first-commercial-v1\.js\?v=[^'"\s]+/.test(bootstrap),'Live bootstrap must cache-bust the current commercial comparison module');
  assert(/pristeel-project-commercial-prefill-rescue-v1\.js\?v=[^'"\s]+/.test(bootstrap),'Live bootstrap must load the cache-busted project commercial prefill rescue after the builder');
  assert(/pristeel-project-commercial-prefill-v1\.js\?v=[^'"\s]+/.test(commercial),'Commercial workflow must cache-bust the project-aware offer prefill');
  assert(!/MutationObserver|setInterval\s*\(/.test(commercial),'Commercial compare must not poll or globally observe');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" style="display:block">
      <div class="pst-pi-tabs"></div>
      <div id="pst-pi-body"></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const sector={id:'o1',supplier:'Sector Construction',price_kg:1.85,total_amount:1000,total_eur:1000,currency:'EUR',created_at:'2026-08-09T08:00:00Z',transport_eur:100,positions:[
    {key:'base',qty:100,unit:'kg',price_neg:1.85,total_neg:185},
    {key:'zinc',qty:100,unit:'kg',price_neg:0.42,total_neg:42},
    {key:'coat',qty:50,unit:'kg',price_neg:0.56,total_neg:28},
    {key:'transport',qty:1,unit:'kamion',price_neg:100,total_neg:100}
  ],exclusions:'Montimi nuk përfshihet; çmimi mbetet për t’u plotësuar.',notes:'Zinkimi i struktures metalike: 0.42 EUR/kg pa TVSH.\nPowder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH'};
  const our={id:'q1',doc_nr:'PST-OFF-2026-08-024',total_eur:1100,currency:'EUR',status:'draft_review',notes:'Montimi pending'};
  const integrity={
    project:{id:'p1',name:'Dukley',client:'ITALIAN STYLE',status:'aktiv',drive_folder_id:'d1'},
    emails:[],contacts:[],bom:[],rfqs:[],
    supplierOffers:[
      sector,
      {id:'o2',supplier:'USD pa FX',price_kg:1.10,total_amount:1200,total_eur:null,currency:'USD',created_at:'2026-08-09T09:00:00Z',notes:''},
      {id:'o3',supplier:'USD me FX',price_kg:2.00,total_amount:2000,total_eur:1600,currency:'USD',exchange_rate_to_eur:0.80,created_at:'2026-08-09T10:00:00Z',notes:''}
    ],
    currentOurOffer:our,ourOffers:[our],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[]}
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
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coating(sector),0.56,'Coating must read structured component rate');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.coatingQty(sector),50,'Coating scope must read structured component quantity');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.transport(sector),100,'Transport must read structured cost');
  assert.strictEqual(w.PSTProjectFirstCommercialV1._test.saleInstallPending(our),true,'Missing installation must mark margin preliminary');

  const next=w.document.querySelector('[data-pf2-action="tab:commercial"]');
  assert(next,'Overview must expose the commercial comparison next-step action');
  next.click();
  await new Promise(r=>setTimeout(r,30));

  const table=w.document.querySelector('[data-pf2-compare]');
  assert(table,'Commercial comparison must be injected when navigating from the overview action');
  const text=table.textContent.replace(/\s+/g,' ');
  assert(text.includes('Sector Construction'),'Comparison must contain the supplier');
  assert(text.includes('1,85 EUR/kg'),'Comparison must show the stored unit rate instead of zero total');
  assert(text.includes('0,42 EUR/kg'),'Comparison must recover zinc rate');
  assert(text.includes('0,56 EUR/kg'),'Comparison must show coating rate');
  assert(text.includes('50,00 kg'),'Comparison must show coating scope');
  assert(text.includes('100,00 EUR'),'Comparison must show transport');
  assert(text.includes('Pa TVSH'),'Comparison must preserve supplier VAT note');
  assert(text.includes('Pa kurs FX'),'Foreign offer without FX must show a safety warning');
  assert(text.includes('1.200,00 USD'),'Foreign total must remain visible in original currency');
  assert(text.includes('Pa ekuivalent EUR'),'Foreign total without FX must not masquerade as EUR');
  assert(text.includes('≈ 1,60 EUR/kg'),'Foreign offer with FX must show normalized EUR rate');
  assert(text.includes('≈ 1.600,00 EUR'),'Foreign total with FX must show normalized EUR equivalent');

  const margin=w.document.querySelector('[data-pf2-margin]');
  assert(margin,'Commercial view must show gross margin before approval when cost and selling price exist');
  const marginText=margin.textContent.replace(/\s+/g,' ');
  assert(marginText.includes('1.000,00 EUR'),'Margin control must show reference cost');
  assert(marginText.includes('1.100,00 EUR'),'Margin control must show draft selling price');
  assert(marginText.includes('100,00 EUR'),'Margin control must show preliminary gross profit');
  assert(marginText.includes('9,1%'),'Margin control must show gross margin percentage');
  assert(marginText.includes('PARAPRAK · PA MONTIM'),'Missing installation must be explicit in margin control');

  const detailBtn=table.querySelector('[data-pf2-offer-detail="0"]');
  assert(detailBtn,'Structured supplier offer must expose details');
  detailBtn.click();
  const detail=table.querySelector('[data-pf2-offer-detail-row="0"]');
  assert(detail && !detail.hidden,'Supplier detail row must open');
  const detailText=detail.textContent.replace(/\s+/g,' ');
  assert(detailText.includes('Totali i kostos para TVSH'),'Breakdown total must be labeled as pre-VAT cost');
  assert(detailText.includes('Montimi nuk përfshihet'),'Supplier exclusions must remain visible');

  const rows=[...table.querySelectorAll('tbody tr')];
  const noFx=rows.find(r=>r.textContent.includes('USD pa FX'));
  const withFx=rows.find(r=>r.textContent.includes('USD me FX'));
  assert(noFx && !noFx.classList.contains('best'),'Foreign offer without FX must never win raw-number ranking');
  assert(withFx && withFx.classList.contains('best'),'Lowest normalized EUR offer should be marked best');

  dom.window.close();
  console.log('Project-first commercial comparison and margin smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-commercial-prefill-smoke.js');
require('./project-commercial-prefill-rescue-smoke.js');
require('./our-offer-source-smoke.js');
require('./our-offer-history-ui-smoke.js');
require('./supplier-offer-currency-smoke.js');
require('./project-pipeline-consistency-smoke.js');
require('./project-reference-smoke.js');
require('./email-supplier-domain-safety-smoke.js');