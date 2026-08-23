const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const assistant=fs.readFileSync('pristeel-project-offer-revision-assistant-v1.js','utf8');
const email=fs.readFileSync('pristeel-offer-revision-email-draft-v1.js','utf8');
const nav=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

assert.ok(/Revision i ofertës/.test(assistant),'revision assistant UI must be present');
assert.ok(/Ruaj revisionin \+ krijo Gmail draft/.test(assistant),'revision flow must expose one explicit save+draft action');
assert.ok(/Përgatit revisionin/.test(assistant),'revision preparation must remain human-gated');
assert.ok(!/gmail\/v1\/users\/me\/messages\/send/.test(email),'revision workflow must never send Gmail automatically');
assert.ok(/gmail\/v1\/users\/me\/drafts/.test(email),'revision workflow must create a Gmail draft');
assert.ok(/Cc:/.test(email),'revision Gmail draft must support CC recipients');
assert.ok(/pristeel-project-offer-revision-assistant-v1\.js/.test(nav),'final navigation owner must load revision assistant');
assert.ok(/pristeel-offer-revision-email-draft-v1\.js/.test(nav),'final navigation owner must load revision draft helper');

const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
w.eval(assistant);
const T=w.PSTProjectOfferRevisionAssistantV1._test;
const oldRows=[
 {qty:25828.74,desc:'Čelična konstrukcija',price:1.95,_pstKey:'base'},
 {qty:25828.74,desc:'Toplo cinkovanje',price:0.43,_pstKey:'zinc'},
 {qty:8311.55,desc:'Powder coating nakon cinkovanja',price:0.57,_pstKey:'coat'},
 {qty:400,desc:'Pocinčani vijci i ankeri kl. 8.8',price:4.5,_pstKey:'bolts'},
 {qty:25828.74,desc:'Montaža / Installation',price:0.43,_pstKey:'installation'},
 {qty:1,desc:'Transport',price:1800,_pstKey:'transport'}
];
assert.strictEqual(T.sum(oldRows),80916.34,'known Dukley client offer total should reproduce');
const ctx={state:{oferPos:oldRows,pr:'1.95',lang:'sr',pst_sent_at:'2026-08-21T05:53:29Z'},clientOffer:{doc_nr:'PST-OFF-2026-08-025'},supplier:{supplier:'Sector Construction'}};
const revised=T.revisedState(ctx,{srcOld:1.85,srcNew:1.80,baseOld:1.95,baseNew:1.90,instOld:0.43,instNew:0.37,to:'aleksandarcinge@gmail.com',cc:'italianstyle.bd@gmail.com'});
assert.strictEqual(T.sum(revised.oferPos),78075.18,'Dukley revision total should reflect base and installation reductions only');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='base').price,1.90);
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='install').price,0.37);
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='zinc').price,0.43,'zinc price must remain unchanged');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='coat').price,0.57,'powder coating price must remain unchanged');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='transport').price,1800,'transport must remain unchanged');
assert.strictEqual(revised.pst_revision_of,'PST-OFF-2026-08-025');
assert.strictEqual(revised.pst_document_status,'draft');
assert.ok(!revised.pst_sent_at,'a revision must not inherit sent status');

const ev=T.evidenceRate({drive:{rows:[{name:'2026-08-23_Sector-Construction_Fadil-Rexhaj_Dukley_price-revision_1.80-per-kg.png'}]}},'Sector Construction');
assert.strictEqual(ev.rate,1.8,'evidence filename should prefill the confirmed supplier rate when explicitly encoded');

console.log('Project offer revision workflow smoke test passed.');
dom.window.close();
