const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><div class="content"><div id="page-workspace-project" class="page"></div></div><select id="global-proj"><option value="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa">A</option><option value="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb">B</option></select></body></html>',{runScripts:'outside-only',url:'https://example.test/pristeel-procurement.html'});
  const w=dom.window,requests={};
  const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  w.PSTProjectDataIntegrity={enc:encodeURIComponent};
  function dossier(id,name){return{
    project:{id,name,client:name+' Client',ref:id,status:id===B?'Fituar':'Aktiv',pipeline_stage:id===B?'production_control':'rfq_in'},
    client:{name:name+' Client'},supplier_offers:[],guarantees:[],
    evidence:{contacts:[],bom:[],rfqs:[],offers:[],supplierOffers:[],ourOffers:[],docs:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],files:[],emails:[],emailLinks:[],linkedOnly:[],emailConflicts:[],mailAttachments:[],invoicesOut:[],invoicesIn:[],adjustments:[],guarantees:[],drive:{state:'none',rows:[]},integration:{}}
  };}
  w.PSTProjectEngineV1={loadProjectDossier:id=>new Promise((resolve,reject)=>{requests[id]={resolve,reject};})};
  w.eval(fs.readFileSync('pristeel-project-integrity-ui-v1.js','utf8'));
  assert.strictEqual(w.pstOpenProjectWorkspace.__pstCanonicalOwner,'pristeel-project-integrity-ui-v1');

  const first=w.pstOpenProjectWorkspace(A),second=w.pstOpenProjectWorkspace(B);
  requests[B].resolve(dossier(B,'STACON'));
  assert.strictEqual(await second,true,'Latest project request must render successfully');
  requests[A].resolve(dossier(A,'STALE'));
  assert.strictEqual(await first,false,'A stale earlier request must not replace the current workspace');
  assert.strictEqual(w.__pstCurrentProjectId,B,'Latest UUID must remain canonical');
  assert.strictEqual(new URL(w.location.href).searchParams.get('project_id'),B,'Latest UUID must remain reloadable in the URL');
  assert(w.document.getElementById('page-workspace-project').textContent.includes('STACON'),'Final DOM must contain the latest project data');
  assert(!w.document.getElementById('page-workspace-project').textContent.includes('STALE'),'Stale data must never replace the latest project');

  const failed=w.pstOpenProjectWorkspace(A);
  requests[A].reject(new Error('network unavailable'));
  assert.strictEqual(await failed,false,'Failed loads return false');
  assert(w.document.getElementById('page-workspace-project').textContent.includes('Projekti nuk u ngarkua.'),'Failed loads must render a visible error state');

  dom.window.close();
  console.log('Project runtime owner regression smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});