const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-first-v2.js','utf8');
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Project-first V2 must not globally observe or poll');
  assert(!/ensureProjectFolderById|PSTDriveImport\.ensure/.test(source),'Workspace itself must not create Drive folders');
  assert(!/mail\.google\.com\/mail\/\?view=cm/.test(source),'Workspace must not auto-open outbound Gmail compose');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-project" class="page" style="display:block">
      <div class="pst-pi-head"><div class="pst-pi-actions"></div></div>
      <div class="pst-pi-tabs"></div><div id="pst-pi-body"></div>
    </div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const project={id:'p1',name:'Dukley Budva',client:'ITALIAN STYLE',ref:'',status:'aktiv',pipeline_stage:'rfq_in',drive_folder_id:'drive1',drive_folder_url:'https://drive.google.com/drive/folders/drive1'};
  const integrity={
    project,
    emails:[{id:'e1',subject:'Request for quotation',from_email:'buyer@example.com',sent_at:'2026-08-08T09:00:00Z',snippet:'Please quote the steel structure. Delivery required in October.',gmail_url:'https://mail.google.com/mail/u/0/#all/e1'}],
    contacts:[{email:'buyer@example.com'}],bom:[],rfqs:[],supplierOffers:[],ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[]}
  };
  w.PSTProjectDataIntegrity={load:async()=>integrity};
  w.supaFetch=async path=>path.startsWith('suppliers?')?[]:[];
  w.pstOpenProjectWorkspace=async id=>{
    w.__pstCurrentProjectId=id;w._curProjId=id;w.__pstIntegrityLastData=integrity;
    return true;
  };
  w.eval(source);
  await w.pstOpenProjectWorkspace('p1');

  const tabs=[...w.document.querySelectorAll('[data-pf2-tab]')];
  assert.strictEqual(tabs.length,9,'Project-first workspace must expose exactly 9 workflow tabs');
  assert.deepStrictEqual(tabs.map(x=>x.getAttribute('data-pf2-tab')),
    ['overview','communication','files','bom','procurement','commercial','execution','finance','activity']);
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Kërkesa → RFQ'),'No-BOM project must recommend direct RFQ path');

  w.PSTProjectFirstV2.render('bom');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('RRUGA PA BOM'),'No-BOM gate is missing');
  assert(w.document.querySelector('[data-pf2-action="rfq"]'),'Direct RFQ action missing when BOM is absent');

  w.PSTProjectFirstV2.render('communication');
  const comm=w.document.getElementById('pst-pi-body').textContent;
  assert(comm.includes('Request for quotation'),'Email record must remain visible even without attachment');
  assert(comm.includes('Please quote the steel structure'),'Email content/snippet must be visible as project documentation');

  w.PSTProjectFirstV2.render('files');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('dosje permanente Google Drive'),'Workspace must describe the single permanent Drive-folder model');

  dom.window.close();
  console.log('Project-first V2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-duplicate-context-smoke.js');
