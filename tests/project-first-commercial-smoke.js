const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const pf2=fs.readFileSync('pristeel-project-first-v2.js','utf8');
  const commercial=fs.readFileSync('pristeel-project-first-commercial-v1.js','utf8');
  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');

  assert(bootstrap.includes("pristeel-supplier-offer-postsave-ui-v1.js?v=20260809-1"),'Live bootstrap must load supplier offer post-save UI');
  assert(bootstrap.includes("pristeel-project-first-commercial-v1.js?v=20260809-3"),'Live bootstrap must load commercial comparison module');
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
    supplierOffers:[{id:'o1',supplier:'Sector Construction',price_kg:1.85,total_eur:0,currency:'EUR',created_at:'2026-08-09T08:00:00Z',notes:'Zinkimi i struktures metalike: 0.42 EUR/kg pa TVSH.\nPowder Coating pas zinkimit: 0.56 EUR/kg · Pa TVSH'}],
    ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[]}
  };
  w.PSTProjectDataIntegrity={load:async()=>integrity};
  w.supaFetch=async()=>[];
  w.pstOpenProjectWorkspace=async id=>{w.__pstCurrentProjectId=id;w._curProjId=id;w.__pstIntegrityLastData=integrity;return true;};

  w.eval(pf2);
  w.eval(commercial);
  await w.pstOpenProjectWorkspace('p1');

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

  dom.window.close();
  console.log('Project-first commercial comparison smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-commercial-prefill-smoke.js');
require('./project-commercial-prefill-rescue-smoke.js');
