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
  assert([...doc.querySelectorAll('.pwb3-nav-btn')].some(x=>x.textContent.includes('Dokumentet & aktiviteti')),'Documents navigation must avoid duplicating the Client communication area');
  assert(doc.querySelectorAll('.pwb3-grid>.pwb3-card>header>button').length===0,'Clickable overview cards must not repeat the same action with header buttons');
  const infoCard=[...doc.querySelectorAll('.pwb3-card')].find(x=>x.textContent.includes('Informacioni kryesor'));
  assert(infoCard,'Primary information card missing');
  assert(!infoCard.hasAttribute('data-pwb3-card-route')&&!infoCard.hasAttribute('data-pwb3-nav'),'Primary information card must be informative, not a dead self-navigation control');
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
  function card(title){return [...doc.querySelectorAll('.pwb3-card')].find(x=>{const h=x.querySelector('header b');return h&&h.textContent.trim()===title;});}
  click(window,nav('overview'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-overview'),'Overview must render');
  const overviewActivity=card('Aktivitetet e fundit');
  assert(overviewActivity&&overviewActivity.getAttribute('data-pwb3-card-route')==='docscomms','Overview activity card must navigate to Documents & activity');

  calls.length=0;click(window,card('Përmbledhje financiare'));assert(last(calls)&&last(calls)[1]==='finance','Finance overview card must route to canonical finance');
  click(window,nav('overview'));
  calls.length=0;click(window,card('Burimet & ofertat'));assert(last(calls)&&last(calls)[1]==='procurement','Supply overview card must route to canonical procurement');
  click(window,nav('overview'));
  click(window,card('Oferta jonë'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer overview card must open the Offer view');
  click(window,nav('overview'));
  calls.length=0;click(window,card('Klienti'));assert(last(calls)&&last(calls)[1]==='communication','Client overview card must route to canonical communication');
  click(window,nav('overview'));
  click(window,card('Skedarët kryesorë'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Files overview card must open Documents & activity');
  click(window,nav('overview'));
  click(window,card('Aktivitetet e fundit'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Activity overview card must open Documents & activity');
  click(window,nav('docscomms'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Documents & activity view must render');
  const detailActivity=card('Aktivitetet e fundit');
  assert(detailActivity&&!detailActivity.hasAttribute('data-pwb3-card-route')&&!detailActivity.hasAttribute('data-pwb3-nav'),'Activity card must stop self-navigating once already inside Documents & activity');
  calls.length=0;click(window,doc.querySelector('[data-pwb3-area="files"]'),'Open files action missing');assert(last(calls)&&last(calls)[1]==='files','Open files action must route to canonical files');
  calls.length=0;click(window,doc.querySelector('[data-pwb3-stage="comparison"]'),'Supplier activity action missing');assert(last(calls)&&last(calls)[1]==='procurement'&&last(calls)[2]==='comparison','Supplier activity must route to canonical comparison');
  click(window,nav('offer'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer view must render');
  click(window,doc.querySelector('[data-pwb3-action="revision"]'),'Revision action missing');assert(revisions===1,'Revision must delegate to existing assistant');
  calls.length=0;click(window,nav('supply'));assert(last(calls)&&last(calls)[1]==='procurement','Supply must route to canonical procurement');
  calls.length=0;click(window,nav('client'));assert(last(calls)&&last(calls)[1]==='communication','Client must route to canonical communication');
  calls.length=0;click(window,nav('finance'));assert(last(calls)&&last(calls)[1]==='finance','Finance must route to canonical finance');

  window.__pstIntegrityLastData.project.status='mbyllur';
  window.__pstIntegrityLastData.project.operational_state='closed';
  window.PSTProjectWorkbenchV3.sync();
  const closedContinue=doc.querySelector('.pwb3-now>button');
  assert(closedContinue&&closedContinue.getAttribute('data-pwb3-view')==='docscomms','Closed-project Vazhdo must point to real project history, not self-navigate to Overview');
  click(window,closedContinue);
  assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Closed-project Vazhdo must open Documents & activity history');

  const stale=doc.createElement('div');stale.id='pst-project-map-v1';doc.getElementById('page-workspace-project').appendChild(stale);
  window.PSTProjectWorkbenchV3.sync();
  assert(!doc.getElementById('pst-project-map-v1'),'Workbench ownership must retire stale Project Detail mindmap');

  window.close();
  console.log('project-workbench v3 interaction smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
