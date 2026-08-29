const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-load-stability-v2.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project load stability must not observe or poll');
  assert(!source.includes('window.__pstProjectFullWait'),'Normal project open must not wait for or start the legacy full loader');
  assert(source.includes('window.__pstProjectReadWait||1800'),'Project-specific reads must stay bounded');
  assert(source.includes('async function load(id){return fallback(id);}'),'Bounded fallback must be the primary project-open loader');
  assert(source.includes('full:original'),'Legacy full loader must remain explicitly available for diagnostics');
  assert(!source.includes('linked=linked.concat(await q('),'Linked Gmail batches must not load sequentially');
  assert(source.includes('var chunks=await Promise.all(jobs)'),'Linked Gmail fallback batches must run in parallel');

  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstProjectReadWait=20;
  let fullCalls=0;
  w.PSTProjectDataIntegrity={
    load:async()=>{fullCalls++;return{project:{id:'legacy-rich'}};},
    canonicalRef:p=>p.business_ref||'',
    buildTimeline:d=>[{type:'project',data:d.project}],
    calcReadiness:()=>({ready:true}),
    calcCommercial:()=>({sell:0,buy:0,bank:0,stock:0,margin:0})
  };
  const calls=[];
  w.supaFetch=async path=>{
    calls.push(String(path));
    if(path.startsWith('projects?id='))return[{id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',business_ref:'P-001',client:'ITALIAN STYLE',status:'aktiv',drive_folder_id:'d1'}];
    if(path.startsWith('project_emails?project_id='))return[];
    if(path.startsWith('project_email_links?project_id='))return[
      {id:'l1',project_id:'p1',gmail_message_id:'g1'},
      {id:'l2',project_id:'p1',gmail_message_id:'g2'},
      {id:'l3',project_id:'p1',gmail_message_id:'g3'}
    ];
    if(path.startsWith('project_emails?gmail_message_id=in.'))return[
      {id:'e1',gmail_message_id:'g1',project_id:'legacy1',subject:'Restauranti Budva - Marko',from_email:'sector.construction20@gmail.com',from_name:'Sector Construction',sent_at:'2026-08-07T10:00:00Z'},
      {id:'e2',gmail_message_id:'g2',project_id:'legacy1',subject:'Fwd: Dukley Seafront Restoran',from_email:'arianit.vllahiu@prissteel.com',from_name:'Arianit Vllahiu',sent_at:'2026-08-05T10:00:00Z'},
      {id:'e3',gmail_message_id:'g3',project_id:'legacy1',subject:'Fwd: Dukley Seafront Restoran',from_email:'aleksandarcingelic@gmail.com',from_name:'Aleksandar Cingelic',sent_at:'2026-08-05T09:00:00Z'}
    ];
    if(path.startsWith('project_docs?project_id='))return[
      {id:'so1',project_id:'p1',name:'Sector Construction',supplier:'Sector Construction',price_kg:1.85,notes:'Zinkimi 0.42 EUR/kg. Powder Coating 0.56 EUR/kg. Pa TVSH'}
    ];
    if(path.startsWith('documents_registry?project_id='))return[
      {id:'q1',project_id:'p1',series:'QUO',doc_nr:'PST-OFF-2026-08-023',source:'PRISTEEL'}
    ];
    return[];
  };

  w.eval(source);
  const started=Date.now();
  const data=await w.PSTProjectDataIntegrity.load('p1');
  assert(Date.now()-started<500,'Bounded project loader did not resolve promptly');
  assert.strictEqual(fullCalls,0,'Normal project open must never start the legacy full loader in parallel');
  assert(data&&data.project&&data.project.id==='p1','Bounded loader lost canonical project data');
  assert.strictEqual(data.__stabilityFallback,true,'Bounded project data marker is missing');
  assert.strictEqual(data.emails.length,3,'Bounded loader must resolve emails from project_email_links');
  assert.strictEqual(data.linkedOnly.length,3,'Linked emails must remain visible even when their legacy project_id differs');
  assert(data.contacts.some(c=>c.email==='aleksandarcingelic@gmail.com'),'Bounded loader must recover contacts from linked emails');
  assert(data.supplierOffers.some(o=>o.supplier==='Sector Construction'),'Bounded loader must recover supplier offers stored outside offers table');
  assert(data.ourOffers.some(o=>o.series==='QUO'),'Bounded loader must preserve our registered quote documents');
  assert(data.integration.gmailLinked,'Linked Gmail state must reflect recovered email relations');
  assert(data.drive&&data.drive.state==='deferred','Optional Drive loading must stay deferred');
  assert(data.timeline&&data.timeline.length===1,'Bounded loader must rebuild the project timeline when the integrity helper is available');
  assert(data.readiness&&data.readiness.ready,'Bounded loader must rebuild readiness when the integrity helper is available');
  assert(data.commercial&&data.commercial.margin===0,'Bounded loader must rebuild commercial summary when the integrity helper is available');
  assert(calls.some(x=>x.includes('bom_items?project_id=eq.p1')),'Project data must query project_id first');
  assert(calls.some(x=>x.includes('bom_items?project_name=ilike.')),'Project data must cover project_name relations');
  assert(calls.some(x=>x.includes('bom_items?project=ilike.*P-001*')),'Project data must cover canonical business references');
  assert(!calls.some(x=>/\?select=\*&limit=3000/.test(x)),'Normal project open must not perform broad 3000-row legacy scans');

  const rich=await w.PSTProjectLoadStabilityV2.full('p1');
  assert.strictEqual(fullCalls,1,'Explicit full-loader diagnostic should remain callable');
  assert(rich&&rich.project&&rich.project.id==='legacy-rich','Explicit full-loader diagnostic was not preserved');

  dom.window.close();
  console.log('Project load stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
