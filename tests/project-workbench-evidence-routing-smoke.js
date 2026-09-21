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
  const routes=[],opened=[];
  window.__pstCurrentProjectId='tennet';window._curProjId='tennet';
  window.__pstIntegrityLastData={
    project:{id:'tennet',name:'PROJEKT TENNET · SPIE',client:'Spie',ref:'PROJEKT TENNET',status:'pritje',pipeline_stage:'pricing',business_type:'hybrid'},
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
      {id:'reply',gmail_message_id:'m-reply',direction:'incoming',subject:'AW: PRISTEEL – Angebot TenneT BUNT – Lose Gelb, Rot, Blau und Grün',sent_at:'2026-09-14T13:58:45Z',from_email:'laura.ihl@spie.com',to_emails:['arianit.vllahiu@prissteel.com'],gmail_thread_id:'t-offer',snippet:'Danke, bitte Montage separat anbieten.'}
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

  const src=fs.readFileSync(path.join(__dirname,'..','pristeel-project-workbench-v2.js'),'utf8');
  window.eval(src);
  doc.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
  await wait();
  assert(window.PSTProjectWorkbenchV3.sync()===true,'Workbench must mount');

  function card(title){return [...doc.querySelectorAll('.pwb3-card')].find(x=>{const h=x.querySelector('header b');return h&&h.textContent.trim()===title;});}
  const offerCard=card('Oferta jonë');
  assert(offerCard,'Offer card missing');
  const offerText=offerCard.textContent.replace(/\s+/g,' ');
  assert(offerText.includes('PRISTEEL – Angebot TenneT BUNT – Lose Gelb, Rot, Blau und Grün'),'Actual outbound client offer must be selected');
  assert(!offerText.includes('ponuda Aktive'),'Supplier/internal correspondence must not masquerade as our client offer');

  const supply=card('Burimet & ofertat');
  assert(supply,'Supply card missing');
  const supplyText=supply.textContent.replace(/\s+/g,' ');
  assert(supplyText.includes('AKTIVA'),'Inbound supplier-offer attachment must surface as supplier evidence');
  assert(!supplyText.includes('Ende pa ofertë të regjistruar'),'Real supplier evidence must not render as no offer');

  const continueBtn=doc.querySelector('.pwb3-now>button');
  click(window,continueBtn,'Vazhdo missing');
  assert(routes.some(x=>x[0]==='communication'),'Client reply after the real offer must route to communication');

  click(window,doc.querySelector('.pwb3-nav-btn[data-pwb3-nav="overview"]'));
  const keyFile=doc.querySelector('[data-pwb3-file-key]');
  click(window,keyFile,'Storage-backed project file must be directly clickable');
  assert(opened.length===1&&opened[0].attachment_name.includes('PRISTEEL_Angebot'),'Storage-backed file must delegate to the real attachment opener');

  click(window,offerCard);
  assert(doc.getElementById('pst-pi-body').classList.contains('pwb3-view-offer'),'Offer card must open offer detail');
  const detail=doc.getElementById('pst-pi-body').textContent.replace(/\s+/g,' ');
  assert(detail.includes('Dokumentet e ofertës së dërguar'),'Offer detail must expose the actual sent documents');
  assert(detail.includes('PRISTEEL_Angebot_TenneT_BUNT_DAP_14.09.2026.xlsx'),'Sent offer workbook must be visible');
  assert(detail.includes('PRISTEEL_Angebotsbedingungen_TenneT_BUNT_14.09.2026.pdf'),'Sent offer terms must be visible');
  assert(detail.includes('Nuk ka hyrje kanonike në regjistrin e ofertave'),'Missing canonical offer registry must be stated, not hidden');

  window.close();
  console.log('project-workbench evidence routing smoke: ok');
})().catch(err=>{console.error(err);process.exit(1);});
