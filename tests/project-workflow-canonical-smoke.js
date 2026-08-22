const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-workflow-canonical-v1.js','utf8');
  new Function(source);
  assert(!/MutationObserver|setInterval\s*\(/.test(source),'Canonical workflow must not globally observe or poll');
  assert(!/supaFetch\s*\([^)]*(?:POST|PATCH|DELETE)/.test(source),'Canonical workflow must stay UI-only');
  assert(/Ofertat e furnitorëve/.test(source),'Supplier offers must have an unambiguous label');
  assert(/Oferta për klientin/.test(source),'Client offer must have an unambiguous label');

  const dom=new JSDOM(`<!doctype html><html><head></head><body>
    <select id="global-proj"><option value="p1">Dukley</option></select>
    <div id="page-workspace-project" class="page active pf2-on" style="display:block">
      <div class="pst-pi-head"><div class="pst-pi-actions"></div></div>
      <div class="pst-pi-tabs"></div>
      <div id="pst-pi-body"></div>
    </div>
    <div id="page-rfq" class="page" style="display:none"><div class="legacy-flow"><button class="flow-step">RFQ</button></div></div>
    <div id="page-kalkulator" class="page" style="display:none"><div class="legacy-flow"><button class="flow-step">Çmimi</button></div></div>
    <div id="page-oferta" class="page" style="display:none"><div class="legacy-flow"><button class="flow-step">Oferta</button></div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  const project={id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',status:'aktiv',pipeline_stage:'client_offer'};
  const integrity={
    project,
    emails:[{subject:'Dukley update'}],contacts:[],
    bom:[],
    rfqs:[],
    supplierOffers:[],
    ourOffers:[{doc_nr:'PST-QUO-2026-027',total_eur:68009.98,created_at:'2026-08-22T09:00:00Z',followup_status:'draft',offer_state:{revision_status:'draft_review'}}],
    invoicesOut:[],invoicesIn:[],adjustments:[],projectDocs:[],attachmentLinks:[],inboxDocs:[],docs:[],mailAttachments:[],drive:{rows:[]}
  };
  w.__pstIntegrityLastData=integrity;
  w.__pstCurrentProjectId='p1';
  w._curProjId='p1';

  function genericCard(title,count){
    return `<section class="pf2-card"><header><div><b>${title}</b><span>${count||0}</span></div></header><div><div class="pf2-empty">Nuk ka të dhëna të regjistruara.</div></div></section>`;
  }
  const calls=[];
  w.PSTProjectFirstV2={
    render(tab){
      calls.push(tab);
      const tabs=w.document.querySelector('.pst-pi-tabs');
      tabs.innerHTML='<button data-pf2-tab="overview">Përmbledhja</button><button data-pf2-tab="commercial">Komercialja</button>';
      const body=w.document.getElementById('pst-pi-body');
      if(tab==='bom')body.innerHTML='<div class="pf2-gate"><b>Nuk ka BOM</b><button data-pf2-action="rfq">Vazhdo te RFQ</button></div>';
      else if(tab==='procurement')body.innerHTML='<div class="pf2-gate"><button data-pf2-action="rfq">Përgatit / hap RFQ</button></div><div class="pf2-grid">'+genericCard('RFQ',0)+genericCard('Oferta furnitorësh',0)+'</div>';
      else if(tab==='commercial')body.innerHTML='<div class="pf2-grid">'+genericCard('Oferta furnitorësh',0)+genericCard('Ofertat tona',1)+'</div>';
      else body.innerHTML='<div class="pf2-grid">'+genericCard('Aktiviteti i fundit',1)+'</div>';
      return true;
    },
    async mount(){return true;}
  };
  w.PSTProjectDataIntegrity={load:async()=>integrity};
  w.pstOpenProjectWorkspace=async id=>{w.__pstCurrentProjectId=id;w._curProjId=id;return true;};
  w.flowGoto=function(page){
    w.document.querySelectorAll('.page').forEach(x=>{x.classList.remove('active');x.style.display='none';});
    const p=w.document.getElementById('page-'+page);if(p){p.classList.add('active');p.style.display='block';}
  };
  w.pstPiNew=function(){w.flowGoto('oferta');};

  w.eval(source);
  w.PSTCanonicalProjectWorkflowV1.install();
  w.PSTCanonicalProjectWorkflowV1.render('overview');

  const areas=[...w.document.querySelectorAll('.pwf-area-btn[data-pwf-area]')];
  assert.strictEqual(areas.length,6,'Project workspace must expose six canonical top-level areas');
  assert.deepStrictEqual(areas.map(x=>x.textContent.trim()),['Përmbledhja','Prokurimi','Ekzekutimi','Financat','Skedarët','Komunikimi']);
  assert(w.document.getElementById('pst-pi-body').textContent.includes(project.name),'Active project name must remain visible in the canonical context');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','bom');
  let stages=[...w.document.querySelectorAll('.pwf-stage')];
  assert.strictEqual(stages.length,6,'Procurement must expose exactly six canonical stages');
  assert.deepStrictEqual(stages.map(x=>x.querySelector('b').textContent.trim()),[
    'BOM','RFQ','Ofertat e furnitorëve','Krahasimi i ofertave','Çmimi i shitjes','Oferta për klientin'
  ]);
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Nuk ka BOM'),'No-BOM state must be explicit instead of blank');
  assert(w.document.querySelector('.pwf-stage[data-pwf-stage="rfq"]'),'RFQ must remain clickable when BOM is absent');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','rfq');
  assert(w.document.querySelector('[data-pwf-action="open-rfq"]'),'RFQ editor action must be retargeted through the project-context bridge');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','offers');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Ende nuk ka oferta të furnitorëve'),'Supplier-offer stage must have a meaningful empty state');
  const clientOfferCard=[...w.document.querySelectorAll('.pf2-card')].find(c=>{
    const b=c.querySelector('header b');return b&&b.textContent.trim()==='Ofertat tona';
  });
  assert(clientOfferCard&&clientOfferCard.classList.contains('pwf-hidden'),'Supplier-offer stage must visually exclude the client-offer list from the same focus');

  integrity.rfqs=[{id:'r1',supplier_name:'Eurosteel',status:'sent'}];
  integrity.supplierOffers=[
    {supplier:'Eurosteel',total_eur:77500,currency:'EUR'},
    {supplier:'Sector Construction',total_eur:79500,currency:'EUR'}
  ];
  w.PSTProjectFirstCommercialV1={inject(){
    const grid=w.document.querySelector('#pst-pi-body .pf2-grid');
    if(grid&&!grid.querySelector('[data-pf2-compare]'))grid.insertAdjacentHTML('afterbegin','<section data-pf2-compare="1">Krahasimi i normalizuar</section>');
  }};
  w.PSTCanonicalProjectWorkflowV1.render('procurement','comparison');
  assert(w.document.querySelector('[data-pf2-compare]'),'Comparison stage must reuse the existing normalized comparison engine');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','pricing');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('ÇMIMI AKTUAL I SHITJES'),'Pricing stage must be a real nonblank project stage');
  assert(w.document.querySelector('[data-pwf-action="open-pricing"]'),'Pricing stage must expose the existing calculator through a controlled bridge');

  w.PSTCanonicalProjectWorkflowV1.render('procurement','client_offer');
  const clientText=w.document.getElementById('pst-pi-body').textContent;
  assert(clientText.includes('PST-QUO-2026-027'),'Client-offer stage must show the current project offer');
  assert(clientText.includes('Draft'),'A created offer must remain visibly draft until explicit sent evidence exists');

  integrity.ourOffers[0].offer_state.sent_at='2026-08-22T10:00:00Z';
  w.PSTCanonicalProjectWorkflowV1.render('procurement','client_offer');
  assert(w.document.getElementById('pst-pi-body').textContent.includes('Oferta është dërguar'),'Explicit sent evidence must be reflected in the client-offer stage');

  dom.window.close();
  console.log('Canonical project workflow smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
