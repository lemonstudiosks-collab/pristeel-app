const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-first-v2.js','utf8');
  const actionsSource=fs.readFileSync('pristeel-project-first-actions-v1.js','utf8');
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Project-first V2 must not globally observe or poll');
  assert(!/ensureProjectFolderById|PSTDriveImport\.ensure/.test(source),'Workspace itself must not create Drive folders');
  assert(!/mail\.google\.com\/mail\/\?view=cm/.test(source),'Workspace must not auto-open outbound Gmail compose');
  assert(!/MutationObserver|setInterval\s*\(/.test(actionsSource),'Project-first actions must not globally observe or poll');
  assert(/pgc-close/.test(actionsSource)&&/pstOpenProjectWorkspace/.test(actionsSource),'Gmail post-link close must refresh the project workspace');

  const syncSource=fs.readFileSync('pristeel-project-email-body-sync-v1.js','utf8');
  new Function(syncSource);
  assert(!/MutationObserver|setInterval\s*\(/.test(syncSource),'Email body sync must not globally observe or poll');
  assert(!/\.auth\s*\(/.test(syncSource),'Email body sync must not launch OAuth authorization');
  assert(!/project_email_links/.test(syncSource),'Email body sync must not change project email relations');
  assert(/format=full/.test(syncSource),'Email body sync must request Gmail full messages');
  assert(/Shfaq emailin e plotë/.test(syncSource),'Communication UI must expose full-email expansion');
  assert(!/state\.done\[id\]/.test(syncSource),'Email body sync must not mark an entire project done');
  assert(/state\.done\[mid\]/.test(syncSource),'Email body sync must track hydration per Gmail message');

  const contactDedupeSource=fs.readFileSync('pristeel-project-contact-view-dedupe-v1.js','utf8');
  new Function(contactDedupeSource);
  assert(!/MutationObserver|setInterval\s*\(/.test(contactDedupeSource),'Contact view dedupe must not globally observe or poll');

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
    emails:[{id:'e1',gmail_message_id:'m1',subject:'Request for quotation',from_email:'buyer@example.com',sent_at:'2026-08-08T09:00:00Z',snippet:'Please quote the steel structure. Delivery required in October.',gmail_url:'https://mail.google.com/mail/u/0/#all/e1'}],
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

  w.eval(contactDedupeSource);
  const gmailKey=w.PSTProjectContactViewDedupeV1._test.gmailKey;
  assert.strictEqual(gmailKey('sector.construction20@gmail.com'),'sectorconstruction20@gmail.com','Gmail dots must not create duplicate contacts');
  assert.strictEqual(gmailKey('sectorconstruction20+rfq@gmail.com'),'sectorconstruction20@gmail.com','Gmail plus aliases must not create duplicate contacts');

  w.PSTProjectFirstV2.render('files');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('dosje permanente Google Drive'),'Workspace must describe the single permanent Drive-folder model');

  let refreshCalls=[];
  const liveOpen=w.pstOpenProjectWorkspace;
  w.pstOpenProjectWorkspace=async function(id){refreshCalls.push(String(id));return liveOpen.apply(this,arguments);};
  w.eval(actionsSource);
  w.document.body.insertAdjacentHTML('beforeend','<div id="pgc-bg"><div id="pgc-status">U lidhën 1 emaila.</div><button id="pgc-close">×</button></div>');
  w.document.getElementById('pgc-close').click();
  await new Promise(r=>setTimeout(r,30));
  assert.deepStrictEqual(refreshCalls,['p1'],'Successful Gmail linking must refresh exactly the same active project');

  refreshCalls=[];
  w.document.getElementById('pgc-bg').remove();
  w.document.body.insertAdjacentHTML('beforeend','<div id="pgc-bg"><div id="pgc-status">Kontrollo listën.</div><button id="pgc-close">×</button></div>');
  w.document.getElementById('pgc-close').click();
  await new Promise(r=>setTimeout(r,30));
  assert.strictEqual(refreshCalls.length,0,'Closing Gmail without a successful link must not reload the workspace');

  dom.window.close();
  console.log('Project-first V2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-duplicate-context-smoke.js');