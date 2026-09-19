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
    url:'https://example.test/pristeel-procurement.html',
    runScripts:'outside-only',
    pretendToBeVisual:true
  });
  const {window}=dom;
  const calls=[];
  let uploads=0,briefs=0,revisions=0;

  window.__pstCurrentProjectId='p1';
  window._curProjId='p1';
  window.__pstIntegrityLastData={
    project:{id:'p1',name:'Audit project',client:'Client A',ref:'REF-1',status:'Aktiv',pipeline_stage:'rfq_in',business_type:'hybrid',deadline:'2026-09-30'},
    rfqs:[{id:'r1'}],
    supplierOffers:[
      {id:'s1',supplier:'Supplier 1',total_eur:10000,currency:'EUR',created_at:'2026-09-10'},
      {id:'s2',supplier:'Supplier 2',total_eur:10500,currency:'EUR',created_at:'2026-09-11'},
      {id:'s3',supplier:'Supplier 3',total_eur:11000,currency:'EUR',created_at:'2026-09-12'},
      {id:'s4',supplier:'Supplier 4',total_eur:11500,currency:'EUR',created_at:'2026-09-13'},
      {id:'s5',supplier:'Supplier 5',total_eur:12000,currency:'EUR',created_at:'2026-09-14'}
    ],
    ourOffers:[{id:'o1',doc_nr:'PS-1',total_eur:15000,currency:'EUR',sent_at:'2026-09-15T09:00:00Z',status:'sent'}],
    emails:[
      {id:'e1',direction:'outgoing',subject:'Oferta PriSteel',sent_at:'2026-09-15T09:00:00Z',gmail_thread_id:'thread-out'},
      {id:'e2',direction:'incoming',subject:'Re: Oferta PriSteel',sent_at:'2026-09-16T10:00:00Z',from_email:'client@example.com',gmail_thread_id:'thread-in',snippet:'Please revise the calculation.'}
    ],
    projectDocs:[{id:'d1',name:'drawing.pdf',web_view_link:'https://drive.google.com/file/d/test/view',created_at:'2026-09-12'}],
    invoicesOut:[{id:'i1',invoice_nr:'INV-1',gross_amount:5000,currency:'EUR',status:'issued',date:'2026-09-17'}]
  };

  window.PSTCanonicalProjectWorkflowV1={
    render:function(area,stage){calls.push(['canonical',area,stage]);return true;}
  };
  window.PSTProjectFileUpload={open:function(){uploads++;return true;}};
  window.PSTProjectSummaryCommandV1={open:function(id){briefs++;calls.push(['brief',id]);return true;}};
  window.PSTProjectOfferRevisionAssistantV2={open:function(){revisions++;calls.push(['revision']);return true;}};

  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
  window.eval(src);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  await nextTick();
  assert(window.PSTProjectWorkbenchV3,'Workbench v3 API missing');
  assert(window.PSTProjectWorkbenchV3.sync()===true,'Workbench did not mount');

  const doc=window.document;
  assert(doc.querySelectorAll('.pwb3-step').length===9,'Expected 9 progress steps');
  assert(doc.querySelectorAll('.pwb3-nav-btn').length===6,'Expected 6 work navigation buttons');
  assert(doc.querySelectorAll('.pwb3-quick button').length===4,'Expected 4 quick actions');
  const continueBtn=doc.querySelector('.pwb3-now>button');
  const activeNav=doc.querySelector('.pwb3-nav-btn.on');
  assert(continueBtn,'Vazhdo button missing');
  assert(activeNav,'Active Workbench navigation button missing');
  assert(window.getComputedStyle(continueBtn).color==='rgb(255, 255, 255)','Filled blue Vazhdo button text must be white');
  assert(window.getComputedStyle(activeNav).color==='rgb(255, 255, 255)','Active blue Workbench tab text must be white');

  calls.length=0;
  click(window,doc.querySelector('.pwb3-now>button'),'Vazhdo missing');
  assert(last(calls)&&last(calls)[1]==='communication','Vazhdo must open client communication for a reply-after-offer state');

  click(window,doc.querySelector('[data-pwb3-action="brief"]'),'Brief action missing');
  assert(briefs===1&&calls.some(x=>x[0]==='brief'&&x[1]==='p1'),'Brief must delegate to Project Summary owner');
  click(window,doc.querySelector('[data-pwb3-action="upload"]'),'Upload action missing');
  assert(uploads===1,'Upload must delegate to Project File Upload owner');
  calls.length=0;
  click(window,doc.querySelector('.pwb3-quick [data-pwb3-area="communication"]'));
  assert(last(calls)&&last(calls)[1]==='communication','Quick Communication must route to canonical communication');
  calls.length=0;
  click(window,doc.querySelector('.pwb3-quick [data-pwb3-area="finance"]'));
  assert(last(calls)&&last(calls)[1]==='finance','Quick Finance must route to canonical finance');

  const steps=[...doc.querySelectorAll('.pwb3-step')];
  const expect=[
    ['canonical','procurement','bom'],
    ['canonical','procurement',undefined],
    ['canonical','procurement','comparison'],
    ['custom','offer'],
    ['canonical','communication',undefined],
    ['custom','winpo'],
    ['canonical','execution',undefined],
    ['canonical','finance',undefined],
    ['canonical','finance',undefined]
  ];
  for(let i=0;i<steps.length;i++){
    calls.length=0;
    click(window,steps[i]);
    await nextTick(1);
    if(expect[i][0]==='custom'){
      assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-'+expect[i][1]),'Progress '+(i+1)+' must open '+expect[i][1]);
    }else{
      const got=last(calls);
      assert(got&&got[0]==='canonical'&&got[1]===expect[i][1]&&got[2]===expect[i][2],'Progress '+(i+1)+' routed incorrectly: '+JSON.stringify(got));
    }
  }

  function navButton(id){return doc.querySelector('.pwb3-nav-btn[data-pwb3-nav="'+id+'"]');}
  click(window,navButton('overview')); assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-overview'),'Overview nav failed');
  calls.length=0; click(window,navButton('supply')); assert(last(calls)&&last(calls)[1]==='procurement','Supply/Production nav failed');
  click(window,navButton('offer')); assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Own offer nav failed');
  calls.length=0; click(window,navButton('client')); assert(last(calls)&&last(calls)[1]==='communication','Client nav failed');
  click(window,navButton('docscomms')); assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Docs & Communication nav failed');
  calls.length=0; click(window,navButton('finance')); assert(last(calls)&&last(calls)[1]==='finance','Finance nav failed');

  window.PSTProjectWorkbenchV3.openNav('overview');
  let body=doc.getElementById('pst-pi-body');
  calls.length=0; click(window,body.querySelector('[data-pwb3-card-route="supply"] header b')); assert(last(calls)&&last(calls)[1]==='procurement','Whole supply card failed: '+JSON.stringify(last(calls)));
  window.PSTProjectWorkbenchV3.openNav('overview'); body=doc.getElementById('pst-pi-body');
  calls.length=0; click(window,body.querySelector('[data-pwb3-stage="comparison"]')); assert(last(calls)&&last(calls)[1]==='procurement'&&last(calls)[2]==='comparison','Supplier source row failed');
  window.PSTProjectWorkbenchV3.openNav('overview'); body=doc.getElementById('pst-pi-body');
  click(window,body.querySelector('[data-pwb3-card-route="offer"] header b')); assert(body.classList.contains('pwb3-view-offer'),'Whole own-offer card failed');
  calls.length=0; click(window,body.querySelector('[data-pwb3-action="revision"]')); assert(revisions===1&&last(calls)&&last(calls)[0]==='revision','Offer editor/revision button must delegate to revision assistant');
  window.PSTProjectWorkbenchV3.openNav('overview'); body=doc.getElementById('pst-pi-body');
  calls.length=0; click(window,body.querySelector('[data-pwb3-card-route="client"] header b')); assert(last(calls)&&last(calls)[1]==='communication','Whole client card failed: '+JSON.stringify(last(calls)));
  window.PSTProjectWorkbenchV3.openNav('overview'); body=doc.getElementById('pst-pi-body');
  calls.length=0; click(window,body.querySelector('[data-pwb3-card-route="finance"] header b')); assert(last(calls)&&last(calls)[1]==='finance','Whole finance card failed: '+JSON.stringify(last(calls)));
  window.PSTProjectWorkbenchV3.openNav('overview'); body=doc.getElementById('pst-pi-body');
  click(window,body.querySelector('[data-pwb3-card-route="docscomms"] header b')); assert(body.classList.contains('pwb3-view-docscomms'),'Whole docs card failed');

  const drive=body.querySelector('a[href^="https://drive.google.com/"]');
  const gmail=body.querySelector('a[href^="https://mail.google.com/"]');
  assert(drive&&drive.getAttribute('target')==='_blank','Drive source link missing or not external-safe');
  assert(gmail&&gmail.getAttribute('target')==='_blank','Gmail source link missing or not external-safe');

  const factOnly={
    contextFacts:[
      {id:'f1',category:'supplier_pricing',fact_key:'supplier_quote.sector',created_at:'2026-09-16T18:18:46Z',value:{supplier:'Sector Construction',currency:'EUR',unit_price_eur_per_m:155,pricing_unit:'m',received_at:'2026-09-16T18:18:46Z',gmail_thread_id:'thread-sector'}},
      {id:'f2',category:'commercial_offer',fact_key:'client_offer.ognjen',created_at:'2026-09-17T06:00:00Z',value:{document_type:'client_offer',doc_nr:'PST-OFF-2026-09-031',currency:'EUR',unit_price_eur_per_m:180,pricing_unit:'m',status:'sent',sent_at:'2026-09-17T06:00:00Z',gmail_thread_id:'thread-client'}}
    ]
  };
  const factSuppliers=window.PSTProjectWorkbenchV3._test.supplierOffers(factOnly);
  assert(factSuppliers.length===1,'Supplier pricing context fact must surface as one supplier quote evidence');
  assert(window.PSTProjectWorkbenchV3._test.offerMeta(factSuppliers[0]).includes('155,00 EUR/m'),'Supplier pricing context fact must preserve 155 EUR/m');
  const factOffers=window.PSTProjectWorkbenchV3._test.ourOffers(factOnly);
  assert(factOffers.length===1,'Client offer context fact must surface as one PriSteel offer evidence');
  assert(window.PSTProjectWorkbenchV3._test.priceLabel(factOffers[0]).includes('180,00 EUR/m'),'Client offer context fact must preserve 180 EUR/m');
  assert(window.PSTProjectWorkbenchV3._test.effectiveOffer(factOnly).doc_nr==='PST-OFF-2026-09-031','Registered client offer context fact must become effective offer evidence');

  const base=window.__pstIntegrityLastData.project;
  base.business_type='trading'; assert(window.PSTProjectWorkbenchV3.businessType(window.__pstIntegrityLastData)==='trading','Trading type detection failed');
  base.business_type='fabrication'; assert(window.PSTProjectWorkbenchV3.businessType(window.__pstIntegrityLastData)==='fabrication','Fabrication type detection failed');
  base.business_type='hybrid'; assert(window.PSTProjectWorkbenchV3.businessType(window.__pstIntegrityLastData)==='hybrid','Hybrid type detection failed');

  // Production-order ownership regression: late presentation modules must yield.
  for(const rel of [
    'pristeel-operating-experience-v1.js',
    'pristeel-daily-zones-cleanup-v1.js',
    'pristeel-operator-flow-v1.js',
    'pristeel-unified-project-flow-v1.js',
    'pristeel-project-execution-surface-v1.js',
    'pristeel-project-offer-revision-assistant-v1.js'
  ]){
    window.eval(fs.readFileSync(path.join(__dirname,'..',rel),'utf8'));
  }
  doc.dispatchEvent(new window.Event('pst:modules-ready',{bubbles:true}));
  await nextTick(1700);
  window.PSTProjectWorkbenchV3.sync();
  await nextTick(20);

  const projectPage=doc.getElementById('page-workspace-project');
  assert(projectPage.getAttribute('data-pst-project-surface-owner')==='workbench-v3','Workbench must retain explicit Project Detail ownership after late modules');
  assert(doc.querySelectorAll('.pwb3-step').length===9,'Late owners must not replace the nine-step Workbench progress');
  assert(doc.querySelectorAll('.pwb3-nav-btn').length===6,'Late owners must not replace the six-button Workbench menu');
  assert(!doc.getElementById('pst-rational-head'),'Legacy Operator Flow header must stay retired');
  assert(!doc.getElementById('pst-rational-summary'),'Legacy Operator Flow summary must stay retired');
  assert(!doc.getElementById('pst-upf-shell'),'Unified Project Flow shell must stay retired');
  assert(!doc.querySelector('.pro-tabs'),'Legacy Operator Flow tabs must stay retired');
  assert(!doc.getElementById('pst-ora-open'),'Revision assistant must not inject a competing project tab');
  assert(doc.getElementById('pst-project-workbench-v2'),'Workbench root must remain mounted after late-owner timers settle');

  console.log('project-workbench-v3 interaction smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
