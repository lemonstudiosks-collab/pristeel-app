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
  w.__PST_PF2_EXTRA_TIMEOUT_MS=25;
  const project={id:'p1',name:'Dukley Budva',client:'ITALIAN STYLE',ref:'',status:'aktiv',pipeline_stage:'rfq_in',drive_folder_id:'drive1',drive_folder_url:'https://drive.google.com/drive/folders/drive1'};
  const fileUrl='https://drive.google.com/file/d/f1/view';
  const integrity={
    project,
    emails:[{id:'e1',gmail_message_id:'m1',gmail_thread_id:'t1',subject:'Request for quotation',from_name:'Christina',from_email:'buyer@example.com',sent_at:'2026-08-08T09:00:00Z',snippet:'Please quote the steel structure. Delivery required in October.'}],
    contacts:[{email:'buyer@example.com'}],bom:[],rfqs:[],supplierOffers:[],ourOffers:[],invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[{id:'f1',name:'drawing.pdf',modifiedTime:'2026-08-12T10:00:00Z',webViewLink:fileUrl}]}
  };
  w.PSTProjectDataIntegrity={load:async()=>integrity};
  let stableSearchQueries=[],deepSearchCalls=0;
  w.PSTSearchStableV2={open:q=>{stableSearchQueries.push(String(q||''));return true;}};
  w.PSTBusinessCommandCenterDeepGmail={openForProject:()=>{deepSearchCalls++;return true;}};
  let analysisRows=[];
  w.supaFetch=async path=>path.startsWith('project_analyses?')?analysisRows:[];
  w.pstOpenProjectWorkspace=async id=>{
    w.__pstCurrentProjectId=id;w._curProjId=id;w.__pstIntegrityLastData=integrity;
    return true;
  };
  const priorityContext={id:'a1',project_id:'p1',project_name:'Dukley Budva',client:'ITALIAN STYLE',title:'Analizo përgjigjen e Christina-s',detail:'Christina kërkon konfirmim teknik për shtyllat dhe duhet t’i përgjigjemi.',priority:'high',source:'project_email',captured_at:Date.now()};
  w.sessionStorage.setItem('pst_priority_action_context_v1',JSON.stringify(priorityContext));
  const openedMail=[];
  w.open=(url,name)=>{openedMail.push([String(url),String(name)]);return{focus(){}};};
  w.eval(source);
  await w.pstOpenProjectWorkspace('p1');

  const tabs=[...w.document.querySelectorAll('[data-pf2-tab]')];
  assert.strictEqual(tabs.length,9,'Project-first workspace must expose exactly 9 workflow tabs');
  assert.deepStrictEqual(tabs.map(x=>x.getAttribute('data-pf2-tab')),
    ['overview','communication','files','bom','procurement','commercial','execution','finance','activity']);
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Kërkesa → RFQ'),'No-BOM project must recommend direct RFQ path');
  const overviewBody=w.document.getElementById('pst-pi-body');
  const priorityPanel=overviewBody.querySelector('.pf2-priority-context');
  assert(priorityPanel,'Opening a project from Priority Actions must retain the selected priority context');
  assert(priorityPanel.textContent.includes(priorityContext.title),'Priority context must show the exact selected action');
  assert(priorityPanel.textContent.includes(priorityContext.detail),'Priority context must explain what the user needs to do next');
  const priorityCta=priorityPanel.querySelector('[data-pf2-action="tab:communication"]');
  assert(priorityCta,'An email-derived priority must route directly to project communication');
  assert.strictEqual(priorityCta.getAttribute('data-pwf-area'),'communication','Priority CTA must remain compatible with the canonical project navigation owner');
  priorityCta.click();
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Emailat e projektit'),'Priority CTA must open the promised communication surface');
  w.PSTProjectFirstV2.render('overview');
  assert(!overviewBody.textContent.includes('Workflow'),'Overview must not render the decorative Project-first workflow card');
  assert.strictEqual(overviewBody.querySelectorAll('.pf2-flow').length,0,'Inactive workflow strip must be removed from the project overview');
  const shortcuts=[...overviewBody.querySelectorAll('.pf2-shortcut')];
  assert.strictEqual(shortcuts.length,4,'Project overview must expose exactly four useful active shortcuts');
  assert(shortcuts.every(x=>x.getAttribute('data-pf2-action')),'Every overview shortcut must have a real action');
  assert(shortcuts.some(x=>x.getAttribute('data-pf2-action')==='tab:communication'),'Communication shortcut must open the communication tab');
  assert(shortcuts.some(x=>x.getAttribute('data-pf2-action')==='tab:commercial'),'Offer shortcut must open the commercial tab');
  assert(shortcuts.some(x=>x.getAttribute('data-pf2-action')==='tab:files'),'Files shortcut must open the files tab');
  const commShortcut=shortcuts.find(x=>x.getAttribute('data-pf2-action')==='tab:communication');
  commShortcut.click();
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Emailat e projektit'),'Communication shortcut must actually navigate to project communication');
  w.PSTProjectFirstV2.render('overview');
  const searchBtn=w.document.querySelector('[data-pf2-action="search"]');
  searchBtn.click();
  assert.deepStrictEqual(stableSearchQueries,['Dukley Budva'],'Project search must route directly through stable search with project context');
  assert.strictEqual(deepSearchCalls,0,'Project search must not invoke the old Deep Gmail owner directly');

  w.PSTProjectFirstV2.render('bom');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('RRUGA PA BOM'),'No-BOM gate is missing');
  assert(w.document.querySelector('[data-pf2-action="rfq"]'),'Direct RFQ action missing when BOM is absent');

  w.PSTProjectFirstV2.render('communication');
  const comm=w.document.getElementById('pst-pi-body').textContent;
  assert(comm.includes('Request for quotation'),'Email record must remain visible even without attachment');
  assert(comm.includes('Please quote the steel structure'),'Email content/snippet must be visible as project documentation');
  const mailCard=w.document.querySelector('.pf2-mail-clickable[data-pf2-mail-url]');
  assert(mailCard,'An email with a Gmail message ID must make the complete email card clickable');
  assert.strictEqual(mailCard.getAttribute('data-pf2-mail-url'),'https://mail.google.com/mail/u/0/#all/t1','Gmail URL must be derived from the linked thread ID when gmail_url is absent');
  mailCard.querySelector('b').click();
  assert.deepStrictEqual(openedMail,[['https://mail.google.com/mail/u/0/#all/t1','PRISTEEL_GMAIL']],'Clicking anywhere on the email card must open the exact Gmail thread');
  mailCard.insertAdjacentHTML('beforeend','<button type="button" data-pst-mail-expand>Shfaq emailin e plotë</button>');
  mailCard.querySelector('[data-pst-mail-expand]').click();
  assert.strictEqual(openedMail.length,1,'The inline full-email expansion control must not also open Gmail');

  w.eval(contactDedupeSource);
  const gmailKey=w.PSTProjectContactViewDedupeV1._test.gmailKey;
  assert.strictEqual(gmailKey('sector.construction20@gmail.com'),'sectorconstruction20@gmail.com','Gmail dots must not create duplicate contacts');
  assert.strictEqual(gmailKey('sectorconstruction20+rfq@gmail.com'),'sectorconstruction20@gmail.com','Gmail plus aliases must not create duplicate contacts');

  w.PSTProjectFirstV2.render('files');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('dosje permanente Google Drive'),'Workspace must describe the single permanent Drive-folder model');
  const fileRow=w.document.querySelector('a.pf2-file-line');
  assert(fileRow,'A file with a URL must render as a full-row link');
  assert.strictEqual(fileRow.getAttribute('href'),fileUrl,'Clickable file row must preserve the original file URL');
  assert.strictEqual(fileRow.getAttribute('target'),'_blank','Clickable file row must keep files opening in a new tab');
  assert(fileRow.textContent.includes('drawing.pdf'),'Clickable file row must keep the file name visible');
  assert(fileRow.textContent.includes('Hap'),'Clickable file row should keep a small open affordance');
  const readability=w.document.getElementById('pf2-readability-css');
  assert(readability,'Project workspace readability stylesheet must be loaded');
  assert(readability.textContent.includes('.pst-pi-tab{font-size:12.5px'),'Workspace tabs must use a readable desktop font size');
  assert(readability.textContent.includes('.pf2-line b{font-size:14px'),'Primary file/list labels must use a readable desktop font size');
  assert(readability.textContent.includes('.pf2-btn{min-height:36px'),'Workspace buttons must be easier to read and click');

  /* A created quote is not a sent quote. This is the Dukley regression case. */
  project.status='pritje';
  project.pipeline_stage='client_offer';
  integrity.ourOffers=[{
    doc_nr:'PST-OFF-2026-08-024',
    total_eur:68009.98,
    created_at:'2026-08-17T15:01:32Z',
    followup_status:'draft',
    offer_state:{revision_status:'draft_review',installation_price_pending:true}
  }];
  analysisRows=[{id:12,created_at:'2026-08-17T15:05:00Z',analysis:{next_actions:[
    {text:'Plotëso çmimin e montimit në draftin PST-OFF-2026-08-024.',status:'open',priority:'critical'}
  ]}}];
  await w.PSTProjectFirstV2.mount('p1',true);
  const draftOverview=w.document.getElementById('pst-pi-body').textContent;
  assert(draftOverview.includes('Plotëso çmimin e montimit në draftin PST-OFF-2026-08-024.'),'Draft offer must surface the real open action from Project Intelligence');
  assert(draftOverview.includes('nuk është dërguar te klienti'),'Draft offer must explicitly state that it has not been sent');
  assert(!draftOverview.includes('Oferta te blerësi'),'Creating a quote must never imply that it was sent to the buyer');
  assert(draftOverview.includes('Statusi: Aktiv'),'Open technical status "pritje" must render as compact business status Aktiv');
  assert(draftOverview.includes('FazaPërgatitje oferte'),'Draft client offer must render business phase Përgatitje oferte in the active shortcut');
  assert(draftOverview.includes('OfertaDraft'),'Draft offer badge must be visible in project summary');
  assert(draftOverview.includes('Montimi pending'),'Open installation price must be visible as a blocker badge');

  /* Only explicit sent evidence may move the project to buyer-waiting/follow-up state. */
  integrity.ourOffers[0].followup_status='sent';
  integrity.ourOffers[0].offer_state={revision_status:'approved',installation_price_pending:false,sent_at:'2026-08-18T08:00:00Z'};
  analysisRows=[];
  await w.PSTProjectFirstV2.mount('p1',true);
  const sentOverview=w.document.getElementById('pst-pi-body').textContent;
  assert(sentOverview.includes('Oferta te blerësi'),'Explicit sent evidence must allow the buyer-waiting state');
  assert(sentOverview.includes('regjistruar si e dërguar'),'Sent state must explain the evidence-backed transition');
  assert(sentOverview.includes('FazaOferta te klienti'),'Sent offer must render the buyer-facing phase');
  assert(sentOverview.includes('OfertaDërguar'),'Sent offer badge must be visible');

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

  /* Optional Project-First enrichments must never keep the project workspace waiting forever. */
  const workingFetch=w.supaFetch;
  w.supaFetch=()=>new Promise(()=>{});
  const boundedMount=await Promise.race([
    w.PSTProjectFirstV2.mount('p1',true),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('optional Project-First enrichment blocked workspace open')),250))
  ]);
  assert.strictEqual(boundedMount,true,'Project workspace must still render when every optional enrichment request hangs');
  w.supaFetch=workingFetch;

  dom.window.close();
  console.log('Project-first V2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});

require('./project-duplicate-context-smoke.js');
require('./native-ui-priority-context-smoke.js');
