const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const assistant=fs.readFileSync('pristeel-project-offer-revision-assistant-v1.js','utf8');
const email=fs.readFileSync('pristeel-offer-revision-email-draft-v1.js','utf8');
const nav=fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8');

assert.ok(/Revision i ofertës/.test(assistant),'revision assistant UI must be present');
assert.ok(/Pozicionet e revisionit/.test(assistant),'revision must expose all client-offer positions');
assert.ok(/data-ora-qty/.test(assistant)&&/data-ora-price/.test(assistant),'revision must allow quantity and unit-price edits per position');
assert.ok(/Ruaj revisionin \+ krijo Gmail draft/.test(assistant),'revision flow must expose explicit save+draft action');
assert.ok(/Përgatit revisionin/.test(assistant),'revision preparation must remain human-gated');
assert.ok(/PSTDriveImport\.importFiles/.test(assistant),'evidence button must have a real project-file upload path');
assert.ok(/type=\"file\"/.test(assistant),'evidence workflow must expose a file picker');
assert.ok(/registerDocNr/.test(assistant),'final revision must use the canonical document registry');
assert.ok(/safeNextOfferNr|nextOfferNr/.test(assistant),'revision numbering must use canonical offer-number logic');
assert.ok(/createDraftFromCurrentOffer/.test(assistant),'saved revision must hand off to PDF + Gmail draft workflow');
assert.ok(!/pstPiNew\s*\(/.test(assistant),'revision preparation must not navigate to the legacy offer editor');
assert.ok(!/legacyOffer\s*\(/.test(assistant),'revision preparation must not route away from Project Commercial');
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
 {qty:25828.74,desc:'Čelična konstrukcija',unit:'kg',price:1.95,_pstKey:'base',_pstSource:'revision-025'},
 {qty:25828.74,desc:'Toplo cinkovanje',unit:'kg',price:0.43,_pstKey:'zinc',_pstSource:'revision-025'},
 {qty:8311.55,desc:'Powder coating nakon cinkovanja',unit:'kg',price:0.57,_pstKey:'coat',_pstSource:'revision-025'},
 {qty:400,desc:'Pocinčani vijci i ankeri kl. 8.8',unit:'kg',price:4.5,_pstKey:'bolts',_pstSource:'revision-025'},
 {qty:25828.74,desc:'Montaža / Installation',unit:'kg',price:0.43,_pstKey:'installation',_pstSource:'revision-025'},
 {qty:1,desc:'Transport',unit:'ls',price:1800,_pstKey:'transport',_pstSource:'revision-025'}
];
assert.strictEqual(T.sum(oldRows),80916.34,'known Dukley 025 total should reproduce');
const sourceSnapshot=JSON.stringify(oldRows);
const newRows=JSON.parse(JSON.stringify(oldRows));
newRows[0].price=1.85;
newRows[4].price=0.35;
newRows[5].qty=2;
newRows[5].unit='kamion';
newRows[5].price=900;
const ctx={
 state:{oferPos:oldRows,pr:'1.95',zn:'0.43',coat:'0.57',tr:'1800',lang:'sr',pst_sent_at:'2026-08-21T05:53:29Z'},
 clientOffer:{doc_nr:'PST-OFF-2026-08-025'},
 supplier:{supplier:'Sector Construction'},
 evidenceFiles:[{name:'Sector_Fadil_price_update.pdf'}]
};
const v={rows:newRows,to:'aleksandarcinge@gmail.com',cc:'italianstyle.bd@gmail.com',supplier:ctx.supplier,srcOld:1.85,srcNew:1.80};
const revised=T.revisedState(ctx,v,'draft');
assert.strictEqual(revised.oferPos.length,6,'all six source positions must survive the revision');
assert.strictEqual(T.sum(revised.oferPos),76267.17,'Dukley target revision must total 76,267.17 EUR');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='base').price,1.85);
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='install').price,0.35);
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='zinc').price,0.43,'zinc stays unchanged');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='coat').price,0.57,'powder coating stays unchanged');
assert.strictEqual(revised.oferPos.find(x=>T.key(x)==='bolts').price,4.5,'bolts stay unchanged');
const transport=revised.oferPos.find(x=>T.key(x)==='transport');
assert.strictEqual(transport.qty,2,'transport can be revised to two trucks');
assert.strictEqual(transport.price,900,'transport unit price can be revised to 900 per truck');
assert.strictEqual(revised.tr,'1800','offer transport shorthand remains the line total');
assert.strictEqual(revised.pst_revision_of,'PST-OFF-2026-08-025');
assert.strictEqual(revised.pst_document_status,'draft');
assert.ok(!revised.pst_sent_at,'revision must not inherit sent status');
assert.deepStrictEqual(Array.from(revised.pst_revision_evidence_files),['Sector_Fadil_price_update.pdf']);
assert.strictEqual(revised.pst_revision_changed_positions,3,'base, installation and transport count as three changed positions');
assert.strictEqual(JSON.stringify(oldRows),sourceSnapshot,'source sent offer positions must never be mutated');
assert.strictEqual(T.changedCount(ctx,newRows),3,'multi-position changes must be detected');

console.log('Project offer revision workflow smoke test passed.');
dom.window.close();
