'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');

function assert(ok,msg){if(!ok)throw new Error(msg);}
function nextTick(ms=20){return new Promise(r=>setTimeout(r,ms));}
function click(win,el,msg){assert(el,msg||'missing clickable element');el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));}
function last(a){return a[a.length-1];}

(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project" class="active"><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></section></body></html>',{
    url:'https://example.test/pristeel-procurement.html',runScripts:'outside-only',pretendToBeVisual:true
  });
  const {window}=dom,doc=window.document;
  const calls=[];
  let revisions=0;
  window.__pstCurrentProjectId='p1';window._curProjId='p1';
  window.__pstIntegrityLastData={
    project:{id:'p1',name:'Audit project',client:'Client A',ref:'REF-1',status:'Aktiv',pipeline_stage:'client_offer',business_type:'hybrid',deadline:'2026-09-30'},
    rfqs:[{id:'r1'}],
    supplierOffers:[{id:'s1',supplier:'Supplier 1',total_eur:10000,currency:'EUR',created_at:'2026-09-10'}],
    ourOffers:[{id:'o1',doc_nr:'PS-1',total_eur:15000,currency:'EUR',sent_at:'2026-09-15T09:00:00Z',status:'sent'}],
    emails:[
      {id:'e1',direction:'outgoing',subject:'Oferta PriSteel',sent_at:'2026-09-15T09:00:00Z',gmail_thread_id:'thread-out'},
      {id:'e2',direction:'incoming',subject:'Re: Oferta PriSteel',sent_at:'2026-09-16T10:00:00Z',from_email:'client@example.com',gmail_thread_id:'thread-in',snippet:'Please revise the calculation.'}
    ],
    projectDocs:[{id:'d1',name:'drawing.pdf',web_view_link:'https://drive.google.com/file/d/test/view',created_at:'2026-09-12'}],
    invoicesOut:[]
  };
  window.PSTCanonicalProjectWorkflowV1={render:function(area,stage){calls.push(['canonical',area,stage]);return true;}};
  window.PSTProjectOfferRevisionAssistantV2={open:function(){revisions++;return true;}};

  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
  window.eval(src);
  doc.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  await nextTick();
  assert(window.PSTProjectWorkbenchV3,'Workbench v3 API missing');
  assert(window.PSTProjectWorkbenchV3.sync()===true,'Workbench did not mount');

  assert(doc.querySelectorAll('.pwb3-phase').length===4,'Expected four compact workflow phases');
  assert(doc.querySelectorAll('.pwb3-phase button').length===0,'Workflow phases must be informative, not duplicate navigation buttons');
  assert(doc.querySelectorAll('.pwb3-nav-btn').length===6,'Expected six unique work navigation areas');
  assert(!doc.querySelector('.pwb3-quick'),'Duplicate quick-actions panel must be removed');
  assert(!doc.querySelector('.pwb3-step'),'Legacy 9-step button strip must be removed');

  const continueBtn=doc.querySelector('.pwb3-now>button');
  const activeNav=doc.querySelector('.pwb3-nav-btn.on');
  assert(continueBtn,'Vazhdo button missing');
  assert(activeNav,'Active Workbench navigation button missing');
  assert(window.getComputedStyle(continueBtn).color==='rgb(255, 255, 255)','Vazhdo text must be white');
  assert(window.getComputedStyle(continueBtn).backgroundColor==='rgb(79, 151, 175)','Vazhdo must use brand blue');
  assert(window.getComputedStyle(activeNav).backgroundColor==='rgb(79, 151, 175)','Active tab must use brand blue');

  calls.length=0;
  click(window,continueBtn);
  assert(last(calls)&&last(calls)[1]==='communication','TANI/Vazhdo must open the actual next communication action');

  function nav(id){return doc.querySelector('.pwb3-nav-btn[data-pwb3-nav="'+id+'"]');}
  click(window,nav('overview'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-overview'),'Overview must render');
  click(window,nav('offer'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer view must render');
  click(window,doc.querySelector('[data-pwb3-action="revision"]'),'Revision action missing');assert(revisions===1,'Revision must delegate to existing assistant');
  calls.length=0;click(window,nav('supply'));assert(last(calls)&&last(calls)[1]==='procurement','Supply must route to canonical procurement');
  calls.length=0;click(window,nav('client'));assert(last(calls)&&last(calls)[1]==='communication','Client must route to canonical communication');
  calls.length=0;click(window,nav('finance'));assert(last(calls)&&last(calls)[1]==='finance','Finance must route to canonical finance');

  const stale=doc.createElement('div');stale.id='pst-project-map-v1';doc.getElementById('page-workspace-project').appendChild(stale);
  window.PSTProjectWorkbenchV3.sync();
  assert(!doc.getElementById('pst-project-map-v1'),'Workbench ownership must retire stale Project Detail mindmap');

  window.close();
  console.log('project-workbench v3 interaction smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
