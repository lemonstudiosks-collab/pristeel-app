const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async()=>{
  const source=fs.readFileSync('pristeel-project-load-stability-v2.js','utf8');
  assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Project load stability must not observe or poll');
  assert(source.includes('window.__pstProjectFullWait||3500'),'Default full-loader wait must stay bounded for responsive project open');
  assert(source.includes('window.__pstProjectReadWait||1800'),'Fallback reads must use the shorter bounded wait');
  assert(!source.includes('linked=linked.concat(await q('),'Linked Gmail batches must not load sequentially');
  assert(source.includes('var chunks=await Promise.all(jobs)'),'Linked Gmail fallback batches must run in parallel');
  const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
  const w=dom.window;
  w.__pstProjectFullWait=25;w.__pstProjectReadWait=20;
  w.PSTProjectDataIntegrity={load:()=>new Promise(()=>{})};
  w.supaFetch=async path=>{
    if(path.startsWith('projects?id='))return[{id:'p1',name:'ITALIAN STYLE - Dukley Seafront Restoran - BUDVA',client:'ITALIAN STYLE',status:'aktiv',drive_folder_id:'d1'}];
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
  assert(Date.now()-started<700,'Project fallback did not resolve in bounded time');
  assert(data&&data.project&&data.project.id==='p1','Project fallback lost project data');
  assert.strictEqual(data.__stabilityFallback,true,'Timed-out full loader did not use fallback');
  assert.strictEqual(data.emails.length,3,'Fallback must resolve emails from project_email_links');
  assert.strictEqual(data.linkedOnly.length,3,'Linked emails must remain visible even when their legacy project_id differs');
  assert(data.contacts.some(c=>c.email==='aleksandarcingelic@gmail.com'),'Fallback must recover contacts from linked emails');
  assert(data.supplierOffers.some(o=>o.supplier==='Sector Construction'),'Fallback must recover supplier offers stored outside offers table');
  assert(data.ourOffers.some(o=>o.series==='QUO'),'Fallback must preserve our registered quote documents');
  assert(data.integration.gmailLinked,'Linked Gmail state must reflect recovered email relations');
  assert(data.drive&&data.drive.state==='deferred','Fallback must defer optional Drive loading');
  dom.window.close();
  console.log('Project load stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
