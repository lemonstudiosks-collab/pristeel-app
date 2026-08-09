const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
 const core=fs.readFileSync('pristeel-email-offer-intake-v1.js','utf8');
 const fix=fs.readFileSync('pristeel-email-offer-intake-ui-fix-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(core+fix),'Email offer intake must not poll or use broad observers');
 const dom=new JSDOM('<!doctype html><html><body><div id="page-workspace-project" class="pf2-on"><div class="pf2-grid"><section class="pf2-card"><header><b>Oferta furnitorësh</b></header><div></div></section></div></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;w.alert=()=>{};
 const text='Dear Sirs, please find our offer. Fabrication price 1.25 EUR/kg. Delivery 4 weeks. DAP Budva. Total EUR 125,000. Payment 30 days.';
 w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley'},offers:[],emails:[{gmail_message_id:'m1',from_name:'Sector Construction',from_email:'sales@sector.example',subject:'Offer Dukley',body_text:text,sent_at:'2026-08-08T10:00:00Z'},{gmail_message_id:'m2',from_name:'PRISTEEL',from_email:'sales@prissteel.com',subject:'internal',body_text:'Offer EUR 2/kg'}]};
 w.eval(core);w.eval(fix);
 const api=w.PSTEmailOfferIntakeV1;assert(api,'Email offer intake API missing');
 assert(api._test.signalScore(text)>=5,'Commercial email was not recognized as an offer candidate');
 const x=api._test.fallback(text,w.__pstIntegrityLastData.emails[0]);
 assert.strictEqual(x.price_kg,1.25,'EUR/kg was not extracted');
 assert.strictEqual(x.delivery_weeks,4,'Delivery weeks were not extracted');
 assert.strictEqual(x.incoterms,'DAP','Incoterms were not extracted');
 const c=api._test.candidates(w.__pstIntegrityLastData,false);
 assert.strictEqual(c.length,1,'Internal mail must not become supplier-offer candidate');
 assert.strictEqual(w.PSTEmailOfferIntakeUIFixV1.inject(),true,'Candidate card did not inject into Project-First procurement');
 const card=w.document.getElementById('pst-eoi-card');assert(card,'Email-offer card missing');
 assert(card.textContent.includes('Sector Construction'),'Supplier email candidate is not visible');
 assert(card.querySelector('[data-eoi-analyze="m1"]'),'Analyze action is missing');
 w.__pstIntegrityLastData.offers=[{notes:'Imported [SOURCE_EMAIL:m1]'}];
 assert.strictEqual(api._test.candidates(w.__pstIntegrityLastData,false).length,0,'Already imported source email should not be suggested again');
 dom.window.close();console.log('Email-body supplier offer intake smoke test passed.');
})();
