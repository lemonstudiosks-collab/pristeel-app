const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-offer-number-integrity-v1.js','utf8');
  assert(source.includes('wrapRevisionStart'),'Offer number integrity must own the new-revision clone path');
  assert(source.includes('captureRevisionState'),'New revision must capture the displayed offer before legacy reset');
  assert(source.includes('applyRevisionState'),'New revision must restore the captured offer state');

  const dom=new JSDOM(`<!doctype html><html><body>
    <input id="of-nr" value="PST-OFF-2026-08-025">
    <input id="of-date" value="2026-08-19">
    <div id="of-pre"><div>OFERTË</div><div>PST-OFF-2026-08-025</div></div>
  </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  let writes=0,renderCount=0;
  let state={
    lang:'sr',date:'2026-08-19',proj:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',
    pr:'2.000',zn:'0.400',tr:'8000',not:'ALL ORIGINAL TERMS STAY',
    payPreset:'supplierflow',pc1:'35',pc2:'25',pc3:'25',
    oferPos:[
      {desc:'Steel fabrication',qty:25828.74,unit:'kg',price:2.0},
      {desc:'Galvanizing',qty:25828.74,unit:'kg',price:0.4},
      {desc:'Transport',qty:1,unit:'ls',price:8000}
    ],
    supplierTermsFlowdown:{sourceOfferRef:'ES-DUKLEY',paymentTerms:'35/25/25/15',text:'Manufacturer inclusions and exclusions'},
    componentPricing:{base:'2.000',zinc:'0.400',coat:'0.350',transportCost:'7700',transportSale:'8000',installationCost:'0.40',installationSale:'0.40',installationUnit:'kg'},
    positionPreservation:{removedKeys:['legacy-position']}
  };
  const original=JSON.parse(JSON.stringify(state));

  w.console=console;
  w.__pstIntegrityLastData={ourOffers:[{id:'d25',doc_nr:'PST-OFF-2026-08-025',created_at:'2026-08-19T08:00:00Z',offer_state:JSON.parse(JSON.stringify(state))}]};
  w.supaFetch=async(path,method)=>{
    if(method&&String(method).toUpperCase()!=='GET')writes++;
    if(String(path).startsWith('documents_registry?select=doc_nr'))return[
      {doc_nr:'PST-OFF-2026-08-023'},{doc_nr:'PST-OFF-2026-08-024'},{doc_nr:'PST-OFF-2026-08-025'}
    ];
    return[];
  };
  w.nextOfferNr=async()=>({nr:'PST-OFF-2026-08-026',seq:26,year:2026});
  w.fillOfferNr=async()=>{const x=await w.nextOfferNr();w.document.getElementById('of-nr').value=x.nr;return x.nr;};
  w.registerDocNr=async()=>true;
  w.genOfer=()=>{renderCount++;return true;};
  w.collectOfferFormState=()=>JSON.parse(JSON.stringify(state));
  w.applyOfferFormState=st=>{
    state=JSON.parse(JSON.stringify(st));
    if(st.date!==undefined)w.document.getElementById('of-date').value=st.date;
    return true;
  };
  w.ofertaStartNewDraft=function(){
    state={lang:'sr',date:'2026-08-19',proj:original.proj,client:original.client,pr:'',zn:'',tr:'',not:'',oferPos:[]};
    w.document.getElementById('of-nr').value='';
    w.fillOfferNr(true);
  };

  w.eval(source);
  w.ofertaStartNewDraft();
  await new Promise(r=>setTimeout(r,50));

  assert.strictEqual(w.document.getElementById('of-nr').value,'PST-OFF-2026-08-026','Revision must receive a new offer number');
  assert.notStrictEqual(w.document.getElementById('of-date').value,'2026-08-19','Revision must use the new revision date');
  assert.strictEqual(state.not,original.not,'Notes and commercial conditions must be cloned');
  assert.deepStrictEqual(state.oferPos,original.oferPos,'All offer positions and their current prices must be cloned before the user edits selected prices');
  assert.deepStrictEqual(state.supplierTermsFlowdown,original.supplierTermsFlowdown,'Manufacturer flow-down terms must survive revision creation');
  assert.deepStrictEqual(state.componentPricing,original.componentPricing,'Component pricing state must survive revision creation');
  assert.deepStrictEqual(state.positionPreservation,original.positionPreservation,'Position preservation metadata must survive revision creation');
  assert.strictEqual(w.PSTOfferNumberIntegrityV1._test.getRevisionSource(),'PST-OFF-2026-08-025','Revision source must be tracked in-memory');
  assert.strictEqual(writes,0,'Starting a new revision must not save, send or modify database records automatically');
  assert(renderCount>0,'Revision preview should be regenerated after cloning');
  assert.deepStrictEqual(original.oferPos[0],{desc:'Steel fabrication',qty:25828.74,unit:'kg',price:2.0},'Source state must remain unchanged');

  console.log('Offer direct revision clone smoke test passed.');
})().catch(err=>{console.error(err);process.exit(1);});
