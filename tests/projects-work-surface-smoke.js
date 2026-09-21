'use strict';
const fs=require('fs');
const {JSDOM}=require('jsdom');

function assert(ok,message){if(!ok)throw new Error(message);}

(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><div class="content"></div></body></html>',{
    url:'https://example.test/pristeel-procurement.html',
    runScripts:'outside-only',
    pretendToBeVisual:true
  });
  const {window}=dom;
  window.console=console;
  window.scrollTo=()=>{};
  const rows=[
    {id:'p1',name:'Action Project',client:'Client A',ref:'A-1',status:'aktiv',pipeline_stage:'pricing',operational_state:'action_required',business_type:'fabrication',deadline:'2099-01-01',last_activity_at:'2026-09-21T06:00:00Z'},
    {id:'p2',name:'Working Project',client:'Client B',ref:'B-1',status:'aktiv',pipeline_stage:'pricing',operational_state:'active_work',business_type:'trading',deadline:null,last_activity_at:'2026-09-20T06:00:00Z'},
    {id:'p3',name:'Waiting Project',client:'Client C',ref:'C-1',status:'pritje',pipeline_stage:'client_offer',operational_state:'wait_for_client',deadline:null,last_activity_at:'2026-09-19T06:00:00Z'},
    {id:'p4',name:'Execution Project',client:'Client D',ref:'D-1',status:'fituar',pipeline_stage:'production_control',operational_state:'execution',deadline:null,last_activity_at:'2026-09-18T06:00:00Z'},
    {id:'p5',name:'Closed Project',client:'Client E',ref:'E-1',status:'mbyllur',pipeline_stage:'transport',operational_state:'closed',deadline:null,last_activity_at:'2026-09-17T06:00:00Z'}
  ];
  let projectReads=0;
  window.supaFetch=async(path)=>{
    if(path.startsWith('projects?')){projectReads++;return rows;}
    if(path.startsWith('pppp_project_context_current_v'))return [{project_id:'p1',fact_key:'supplier.price',value:{amount:1.85}}];
    return[];
  };
  let opened='';
  window.pstOpenProjectWorkspace=id=>{opened=String(id);return true;};
  window.pstWsCreate=()=>true;
  let homeOpens=0;
  window.PSTPrimaryNavResilienceV10={openHome(){homeOpens++;return true;}};

  const desk=fs.readFileSync('pristeel-projects-modern-v1.js','utf8');
  window.eval(desk);
  await window.pstProjectsModernOpen();

  assert(projectReads===1,'Projects Operator Desk must use one bounded Projects read per open');
  assert(window.document.querySelector('.ppd-page'),'Projects Operator Desk v2 did not render');
  assert(window.document.querySelectorAll('.ppd-focus').length===5,'Operator Desk must expose five operational focus groups');
  assert(window.document.querySelectorAll('.ppd-row').length===4,'Default Projects view must show four non-closed projects');
  assert(!window.document.querySelector('.pst-pm-toggle'),'Board/List toggle must not exist');
  assert(!window.document.querySelector('.pst-pm-more'),'Legacy overflow action menu must not exist');
  assert(!window.document.body.textContent.includes('Dublikatat'),'Duplicates button must not remain in daily Projects UI');
  assert(!window.document.body.textContent.includes('Rifresko'),'Manual refresh button must not remain in daily Projects UI');

  const states=[...window.document.querySelectorAll('.ppd-row')].map(x=>x.getAttribute('data-state'));
  assert(states.join(',')==='action,work,execution,waiting','Default order must be action -> work -> execution -> waiting');
  assert(window.document.querySelector('[data-ppd-open="p1"] .ppd-next').textContent.includes('Mbyll koston / çmimin'),'Action pricing project must expose a deterministic TANI action');
  assert(window.document.querySelector('[data-ppd-open="p3"] .ppd-next').textContent.includes('Prit klientin'),'wait_for_client must expose the automatic waiting action');
  assert(window.document.querySelector('[data-ppd-open="p1"] .ppd-type').textContent.includes('Fabrikim'),'Fabrication project must show Fabrikim');
  assert(window.document.querySelector('[data-ppd-open="p2"] .ppd-type').textContent.includes('Furnizim'),'Trading project must show Furnizim');

  const actionRow=window.document.querySelector('[data-ppd-open="p1"]');
  actionRow.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert(opened==='p1','Whole Projects row must open the canonical project workspace');

  const back=window.document.querySelector('[data-ppd-back]');
  assert(back,'Projects Operator Desk must expose Kthehu');
  back.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert(homeOpens===1,'Kthehu must route through the final primary Home owner exactly once');

  window.document.querySelector('[data-ppd-focus="waiting"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert(window.document.querySelectorAll('.ppd-row').length===1,'Waiting focus must filter to waiting projects');
  assert(window.document.querySelector('.ppd-row').getAttribute('data-ppd-open')==='p3','Waiting focus selected the wrong project');

  const classification=fs.readFileSync('pristeel-project-classification-v1.js','utf8');
  window.eval(classification);
  assert(window.PSTProjectClassificationV1.decorate()===true,'Legacy classification layer must yield cleanly to Operator Desk');
  assert(window.document.querySelector('.ppd-page'),'Classification compatibility layer must not replace Operator Desk');

  window.__pstCurrentProjectId='p1';
  const facts=await window.PSTProjectContextBridge.load('p1',true);
  assert(facts.length===1&&facts[0].fact_key==='supplier.price','Project context bridge must remain available for Project Detail');

  const bootstrap=fs.readFileSync('pristeel-project-emails.js','utf8');
  assert(bootstrap.includes('pristeel-projects-modern-v1.js?v=20260921-operator-desk3'),'Operator Desk must be cache-busted in runtime bootstrap');
  assert(bootstrap.includes('pristeel-project-classification-v1.js?v=20260921-projectdesk-yield2'),'Classification compatibility layer must be cache-busted');

  const source=desk;
  assert(!/\b(PATCH|POST|DELETE)\b/.test(source),'Projects UI must not contain direct business write paths');
  assert(!source.includes('select=*'),'Projects UI must not fetch all columns');
  assert(source.includes('limit=500'),'Projects read must remain bounded');

  window.close();
  console.log('projects-work-surface-smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
