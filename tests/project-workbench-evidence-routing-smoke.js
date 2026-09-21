'use strict';
const fs=require('fs');
const path=require('path');
const {JSDOM}=require('jsdom');

function assert(ok,msg){if(!ok)throw new Error(msg);}
function wait(ms=30){return new Promise(r=>setTimeout(r,ms));}
function click(win,el,msg){assert(el,msg||'missing clickable element');el.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));}

(async function(){
  const dom=new JSDOM('<!doctype html><html><head></head><body><section id="page-workspace-project" class="active"><div class="pst-pi-head"></div><div class="pst-pi-tabs"></div><div id="pst-pi-body"></div></section></body></html>',{
    url:'https://example.test/pristeel-procurement.html',runScripts:'outside-only',pretendToBeVisual:true
  });
  const {window}=dom,doc=window.document;
  const routes=[],opened=[],browserTabs=[];let gmailReads=0;
  window.open=function(){const tab={location:{href:''},close:function(){this.closed=true;}};browserTabs.push(tab);return tab;};
  window.URL.createObjectURL=function(){return'blob:test-offer';};
  window.URL.revokeObjectURL=function(){};
  window.__pstCurrentProjectId='tennet';window._curProjId='tennet';
  window.__pstIntegrityLastData={
    project:{id:'tennet',name:'PROJEKT TENNET · SPIE',client:'Spie',ref:'PROJEKT TENNET',status:'pritje',pipeline_stage:'pricing',work_model:'production_installation'},
    contacts:[
      {email:'laura.ihl@spie.com',company:'Spie',role:'client',person:'Laura Ihl'},
      {email:'zoran@aktiva.com.mk',company:'AKTIVA',role:'supplier',person:'Zoran'}
    ],
    rfqs:[{id:'rfq-1'}],
    supplierOffers:[],
    ourOffers:[],
    emails:[
      {id:'wrong',gmail_message_id:'m-wrong',direction:'outgoing',subject:'SPIE / TenneT BUNT – ponuda Aktive prema novoj kalkulacionoj tabeli',sent_at:'2026-09-07T10:00:00Z',to_emails:['zoran@aktiva.com.mk'],from_email:'arianit.vllahiu@prissteel.com',gmail_thread_id:'t-wrong'},
      {id:'supplier',gmail_message_id:'m-supplier',direction:'incoming',subject:'Re: SPIE / TenneT projekat – dokumentacija za pripremu ponude',sent_at:'2026-09-14T08:33:24Z',from_email:'zoran@aktiva.com.mk',to_emails:['arianit.vllahiu@prissteel.com'],gmail_thread_id:'t-supplier'},
      {id:'offer',gmail_message_id:'m-offer',direction:'outgoing',subject:'PRISTEEL – Angebot TenneT BUNT – Lose Gelb, Rot, Blau und Grün',sent_at:'2026-09-14T11:58:41Z',from_email:'arianit.vllahiu@prissteel.com',to_emails:['laura.ihl@spie.com'],gmail_thread_id:'t-offer'},
      {id:'reply',gmail_message_id:'m-reply',direction:'incoming',subject:'AW: PRISTEEL – Angebot TenneT BUNT – Lose Gelb, Rot, Blau und Grün',sent_at:'2026-09-14T13:58:45Z',from_email:'laura.ihl@spie.com',from_name:'Ihl, Laura',to_emails:['arianit.vllahiu@prissteel.com'],gmail_thread_id:'t-offer',snippet:'Danke. Bitte Montage separat anbieten.'},
      {id:'ooo',gmail_message_id:'m-ooo',direction:'incoming',subject:'Automatische Antwort: Projekt TenneT BUNT – Update zur Zoll- und Importabwicklung',sent_at:'2026-09-17T06:53:54Z',from_email:'matthias.fischer@spie.com',from_name:'Fischer, Matthias',to_emails:['arianit.vllahiu@prissteel.com'],gmail_thread_id:'t-ooo',snippet:'Ich bin bis zum 01.10.2026 nicht im Haus.'}
    ],
    attachmentLinks:[
      {id:2106,attachment_name:'PRISTEEL_Angebot_TenneT_BUNT_DAP_14.09.2026.xlsx',gmail_message_id:'m-offer',gmail_thread_id:'t-offer',storage_bucket:'project-source-files',storage_path:'tennet/offer.xlsx',created_at:'2026-09-14T12:00:00Z'},
      {id:2107,attachment_name:'PRISTEEL_Angebotsbedingungen_TenneT_BUNT_14.09.2026.pdf',gmail_message_id:'m-offer',gmail_thread_id:'t-offer',storage_bucket:'project-source-files',storage_path:'tennet/terms.pdf',created_at:'2026-09-14T12:00:00Z'},
      {id:2101,attachment_name:'AKTIVA Offer Rev 1 — DAP DDP, Painting Shown Separately.pdf',gmail_message_id:'m-supplier',gmail_thread_id:'t-supplier',storage_bucket:'project-source-files',storage_path:'tennet/aktiva.pdf',created_at:'2026-09-14T08:34:00Z'}
    ],
    projectDocs:[],invoicesOut:[]
  };
  window.PSTCanonicalProjectWorkflowV1={render:function(area,stage){routes.push([area,stage]);return true;}};
  window.PSTOfferSourceDocumentOpenV1={openAttachment:function(row){opened.push(row);return true;}};
  window.PSTEmail={
    auth:async function(){return'token';},
    gmail:async function(url){
      gmailReads++;
      if(url.includes('?format=full'))return{payload:{filename:'',parts:[{filename:'PRISTEEL_Angebotsbedingungen_TenneT_BUNT_14.09.2026.pdf',mimeType:'application/pdf',body:{data:'dGVzdA=='}}]}};
      throw new Error('unexpected Gmail path '+url);
    }
  };

  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
  window.eval(src);
  doc.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  await wait();
  assert(window.PSTProjectWorkbenchV3.sync()===true,'Workbench must mount');

  function card(title){return [...doc.querySelectorAll('.pwb3-card')].find(x=>{const h=x.querySelector('header b');return h&&h.textContent.trim()===title;});}
  function kind(name){return doc.querySelector('[data-pwb3-kind="'+name+'"]');}
  function nav(name){return doc.querySelector('.pwb3-nav-btn[data-pwb3-nav="'+name+'"]');}
  const cards=[...doc.querySelectorAll('.pwb3-overview-grid>.pwb3-card')];
  const offerCard=kind('our-offer');
  assert(offerCard,'Offer card missing');
  assert(cards.indexOf(offerCard)===1,'Our offer must be the primary commercial card next to project information');
  const offerText=offerCard.textContent.replace(/\s+/g,' ');
  assert(offerText.includes('PRISTEEL – Angebot TenneT BUNT – Lose Gelb, Rot, Blau und Grün'),'Actual outbound client offer must be selected');
  assert(offerText.includes('PRISTEEL_Angebot_TenneT_BUNT_DAP_14.09.2026.xlsx'),'Actual sent offer workbook must be visible directly in Overview');
  assert(offerText.includes('PRISTEEL_Angebotsbedingungen_TenneT_BUNT_14.09.2026.pdf'),'Actual sent offer terms must be visible directly in Overview');
  assert(offerText.includes('hyrja kanonike në regjistrin e ofertave mungon'),'Overview must explain the registry gap without hiding the real offer');
  assert(!offerText.includes('ponuda Aktive'),'Supplier/internal correspondence must not masquerade as our client offer');
  assert(offerCard.querySelector('a[href*="mail.google.com"]'),'Our offer must expose the exact sending email');
  assert(!offerCard.hasAttribute('data-pwb3-card-route')&&!offerCard.hasAttribute('data-pwb3-nav'),'Offer card itself must not be a hidden navigation button');

  const supply=kind('supplier-offer');
  assert(supply,'Supplier offer card missing');
  const supplyText=supply.textContent.replace(/\s+/g,' ');
  assert(supplyText.includes('Oferta e prodhuesit · AKTIVA'),'Single supplier/manufacturer evidence must be named clearly');
  assert(supplyText.includes('AKTIVA Offer Rev 1'),'Inbound supplier-offer document must be visible directly in Overview');
  assert(!supplyText.includes('Ende pa ofertë furnitori'),'Real supplier evidence must not render as no offer');
  assert(!supply.hasAttribute('data-pwb3-card-route')&&!supply.hasAttribute('data-pwb3-nav'),'Supplier card itself must not be a hidden navigation button');

  const client=kind('client-response');
  assert(client,'Client response card missing');
  const clientText=client.textContent.replace(/\s+/g,' ');
  assert(clientText.includes('AW: PRISTEEL – Angebot TenneT BUNT'),'Substantive client reply must be primary');
  assert(clientText.includes('Montage separat anbieten'),'Client request content must be visible');
  assert(!clientText.includes('Automatische Antwort'),'Later out-of-office response must not replace the substantive client reaction');
  assert(client.querySelector('a[href*="mail.google.com"]'),'Client response must expose the exact email');
  assert(!doc.querySelector('.pwb3-now').textContent.includes('Automatische Antwort'),'TANI must ignore automatic replies as actionable client reactions');

  assert(kind('finance')&&!kind('finance').hasAttribute('data-pwb3-card-route'),'Finance summary must be informative, not an invisible card button');
  assert(kind('files')&&!kind('files').hasAttribute('data-pwb3-card-route'),'Files summary must use exact file rows, not an invisible card button');

  const deadlineBox=doc.querySelector('.pwb3-deadline');
  assert(deadlineBox&&deadlineBox.textContent.includes('Pa afat'),'Fixture should start without a deadline');
  window.__pstIntegrityLastData.project.deadline='2026-09-11';
  window.PSTProjectWorkbenchV3.sync();
  assert(!doc.querySelector('.pwb3-deadline').textContent.includes('Pa afat'),'Late-arriving canonical deadline must refresh the top summary');

  const continueBtn=doc.querySelector('.pwb3-now>button');
  click(window,continueBtn,'Vazhdo missing');
  assert(routes.some(x=>x[0]==='communication'),'Client reply after the real offer must route to communication');

  click(window,doc.querySelector('.pwb3-nav-btn[data-pwb3-nav="overview"]'));
  const keyFile=doc.querySelector('[data-pwb3-file-key]');
  click(window,keyFile,'Storage-backed project file must be directly clickable');
  assert(opened.length===1&&opened[0].attachment_name.includes('PRISTEEL_Angebot'),'Storage-backed file must delegate to the real attachment opener');

  window.PSTOfferSourceDocumentOpenV1=null;
  const storageButtons=[...doc.querySelectorAll('[data-pwb3-file-key]')];
  click(window,storageButtons[1],'Second storage-backed file missing');
  await wait();
  assert(gmailReads>0,'Storage-backed file must have a Gmail attachment fallback when no separate opener module is present');
  assert(browserTabs.some(x=>x.location.href==='blob:test-offer'),'Gmail fallback must open the actual attachment blob');

  click(window,nav('offer'));
  assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer tab must open offer detail');
  const detail=doc.getElementById('pst-pi-body').textContent.replace(/\s+/g,' ');
  assert(detail.includes('Dokumentet e ofertës së dërguar'),'Offer detail must expose the actual sent documents');
  assert(detail.includes('PRISTEEL_Angebot_TenneT_BUNT_DAP_14.09.2026.xlsx'),'Sent offer workbook must be visible');
  assert(detail.includes('PRISTEEL_Angebotsbedingungen_TenneT_BUNT_14.09.2026.pdf'),'Sent offer terms must be visible');
  assert(detail.includes('Nuk ka hyrje kanonike në regjistrin e ofertave'),'Missing canonical offer registry must be stated, not hidden');

  window.close();
  console.log('project-workbench evidence routing smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
