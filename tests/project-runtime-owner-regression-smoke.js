const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const dom=new JSDOM('<!doctype html><html><body><div class="content"><div id="page-workspace-project" class="page"></div></div><select id="global-proj"><option value="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa">A</option><option value="bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb">B</option></select></body></html>',{runScripts:'outside-only',url:'https://example.test/pristeel-procurement.html'});
  const w=dom.window,requests={};
  const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  w.PSTProjectDataIntegrity={enc:encodeURIComponent};
  const navCalls=[];
  w.PSTPrimaryNavResilienceV10={openProjects:function(){navCalls.push('projects');return true;},openOpportunities:function(ctx){navCalls.push(['opportunities',ctx]);return true;}};
  function dossier(id,name){return{
    project:{id,name,client:name+' Client',ref:id,business_ref:id===B?'TED:645196-2026':id,status:id===B?'pritje':'Aktiv',pipeline_stage:id===B?'rfq_in':'rfq_in',workflow_type:id===B?'eu_award_sales':'',origin_type:id===B?'tender_award':''},
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
  assert(typeof w.pstPiBack==='function'&&typeof w.pstPiProjects==='function','Project header navigation helpers must be installed');
  const projectPage=w.document.getElementById('page-workspace-project');
  assert(projectPage.querySelector('[data-pst-project-back]'),'Project header must expose one delegated Back control');
  assert(projectPage.querySelector('[data-pst-projects]'),'Project header must expose the Projects control');
  assert.strictEqual(projectPage.querySelectorAll('[data-pst-project-back]').length,1,'Project header must expose only one canonical Back control');
  w.pstPiBack();
  assert(Array.isArray(navCalls[0])&&navCalls[0][0]==='opportunities'&&navCalls[0][1].source==='TED','TED award Back must return to TED Opportunities');
  w.pstPiProjects();
  assert(navCalls[1]==='projects','Projektet must use the resilient Projects owner');
  assert(!new URL(w.location.href).searchParams.has('project_id'),'Leaving a project must clear the project_id URL lock');
  assert.strictEqual(w.localStorage.getItem('pst_exact_project_id_v1'),null,'Leaving a project must clear the exact-project localStorage lock');
  assert.strictEqual(w.sessionStorage.getItem('pst_exact_project_id_v1'),null,'Leaving a project must clear the exact-project session lock');

  const failed=w.pstOpenProjectWorkspace(A);
  requests[A].reject(new Error('network unavailable'));
  assert.strictEqual(await failed,false,'Failed loads return false');
  assert(w.document.getElementById('page-workspace-project').textContent.includes('Projekti nuk u ngarkua.'),'Failed loads must render a visible error state');

  dom.window.close();
  console.log('Project runtime owner regression smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});