'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');

function assert(ok,msg){if(!ok)throw new Error(msg);}
function nextTick(ms=20){return new Promise(r=>setTimeout(r,ms));}
function click(win,el,msg){assert(el,msg||'missing clickable element');el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));}
function last(a){return a[a.length-1];}

(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project" class="active"><div class="pst-pi-head"><div class="pst-pi-top"><button id="legacy-projects-back">Projektet</button></div><div class="pst-pi-stats"><div class="pst-pi-stat">Emaila</div><div class="pst-pi-stat">RFQ</div></div></div><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></section></body></html>',{
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
  const legacyHead=doc.querySelector('.pst-pi-head'),legacyStats=doc.querySelector('.pst-pi-stats');
  assert(legacyHead&&window.getComputedStyle(legacyHead).display!=='none','Project title/back header must remain visible');
  assert(doc.getElementById('legacy-projects-back'),'Project → Projects return control must remain in the header');
  assert(legacyStats&&window.getComputedStyle(legacyStats).display==='none','Legacy clickable stat shortcuts must be retired under Workbench v3');

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
  assert(overviewActivity&&!overviewActivity.hasAttribute('data-pwb3-card-route')&&!overviewActivity.hasAttribute('data-pwb3-nav'),'Overview activity card must be informative; exact rows carry the actions');
  ['finance','supplier-offer','our-offer','client-response','files','activity'].forEach(function(kind){
    const el=doc.querySelector('[data-pwb3-kind="'+kind+'"]');
    assert(el,'Missing overview card '+kind);
    assert(!el.hasAttribute('data-pwb3-card-route')&&!el.hasAttribute('data-pwb3-nav'),'Overview card '+kind+' must not masquerade as an invisible navigation button');
  });

  calls.length=0;click(window,nav('finance'));assert(last(calls)&&last(calls)[1]==='finance','Finance tab must route to canonical finance');
  click(window,nav('overview'));
  calls.length=0;click(window,nav('supply'));assert(last(calls)&&last(calls)[1]==='procurement','Supply tab must route to canonical procurement');
  click(window,nav('overview'));
  click(window,nav('offer'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer tab must open the Offer view');
  click(window,nav('overview'));
  calls.length=0;click(window,nav('client'));assert(last(calls)&&last(calls)[1]==='communication','Client tab must route to canonical communication');
  click(window,nav('overview'));
  click(window,nav('docscomms'));assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-docscomms'),'Documents tab must open Documents & activity');
  click(window,nav('overview'));
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

  let tedContactOpens=0;
  window.PSTTenderWinnerContactsV1={renderModal:function(t){tedContactOpens++;assert(t&&t.id==='ted-source-1','TED contact action must use the linked canonical source tender');return true;}};
  window.__pstCurrentProjectId='p2';window._curProjId='p2';
  window.__pstIntegrityLastData={
    project:{id:'p2',name:'HT2R · France – Construction &amp;quot;KARTIE&amp;quot;',client:'HT2R',ref:'645196-2026',business_ref:'TED:645196-2026',status:'pritje',pipeline_stage:'rfq_in',operational_state:'active_work',workflow_type:'eu_award_sales',origin_type:'tender_award',location:'FRA'},
    rfqs:[],supplierOffers:[],ourOffers:[],emails:[],projectDocs:[],invoicesOut:[],
    sourceTenders:[{id:'ted-source-1',publication_no:'645196-2026',authority:'SEDRE',detail_url:'https://ted.europa.eu/en/notice/-/detail/645196-2026',payload:{source:'TED',notice_phase:'award',winner:{name:'HT2R',organization_count:12,names:['HT2R','BTB','ADEQUAT OCEAN INDIEN'],contact_enrichment:{status:'not_found',contact_count:0,organizations:[{name:'HT2R',country:'FRA',contacts:[]},{name:'BTB',country:'FRA',contacts:[]},{name:'ADEQUAT OCEAN INDIEN',country:'FRA',contacts:[]}]}}}}]
  };
  window.PSTProjectWorkbenchV3.sync();
  const tedContinue=doc.querySelector('.pwb3-now>button');
  assert(tedContinue&&tedContinue.getAttribute('data-pwb3-action')==='ted_contacts','TED award Vazhdo must open winner/contact review before supplier RFQ');
  assert(doc.querySelectorAll('.pwb3-path-v2 .pwb3-phase').length===7,'TED award project must render its dedicated seven-step sales workflow');
  const tedCard=doc.querySelector('[data-pwb3-kind="ted-award"]');
  assert(tedCard,'TED award source card missing');
  assert(nav('client').textContent.includes('Klienti / kontakti'),'TED award navigation must put client/contact work before suppliers');
  assert(!doc.querySelector('[data-pwb3-kind="supplier-offer"]')&&!doc.querySelector('[data-pwb3-kind="our-offer"]'),'Pre-contact TED overview must not lead with empty supplier/offer cards');
  const tedClientCard=doc.querySelector('[data-pwb3-kind="client-response"]');
  assert(tedClientCard&&tedClientCard.textContent.includes('Asnjë email nuk është dërguar'),'TED overview must state the real no-email condition');
  assert(tedCard.textContent.includes('0 kontakte të verifikuara')||tedCard.textContent.includes('0 kontakte'),'TED award source card must expose missing verified contacts');
  const blockedDraft=tedCard.querySelector('button.primary');
  assert(blockedDraft&&blockedDraft.disabled&&blockedDraft.textContent.includes('Krijo draft'),'TED award must keep create-draft visible but disabled until a verified recipient exists');
  assert(tedCard.textContent.includes('12')||tedCard.textContent.includes('3'),'TED award source card must expose winner/member context');
  click(window,tedContinue);assert(tedContactOpens===1,'TED award Vazhdo must delegate to winner/contact review');
  click(window,doc.querySelector('[data-pwb3-action="ted_contacts"]'));assert(tedContactOpens===2,'TED source card contact action must work');

  let tedDraftOpens=0;
  window.PSTTenderPriorityActionsV2={prepareDraft:function(id){tedDraftOpens++;assert(id==='ted-source-1','Project draft action must use the linked canonical TED source');return Promise.resolve({ok:true});}};
  const enrich=window.__pstIntegrityLastData.sourceTenders[0].payload.winner.contact_enrichment;
  enrich.contact_count=1;
  enrich.status='found';
  enrich.organizations[0].contacts=[{type:'email',value:'sales@ht2r.example',confidence:'high',draft_eligible:true}];
  window.PSTProjectWorkbenchV3.sync();
  const liveDraft=doc.querySelector('[data-pwb3-action="ted_draft"]');
  assert(liveDraft&&!liveDraft.disabled&&liveDraft.textContent.includes('Krijo draft'),'Verified TED contact must activate create-draft in Project');
  click(window,liveDraft);await nextTick();
  assert(tedDraftOpens===1,'Create draft in Project must delegate to the canonical TED draft engine');

  assert(!doc.getElementById('page-workspace-project').textContent.includes('&amp;quot;'),'TED HTML entities must not leak into the visible project workspace');

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
