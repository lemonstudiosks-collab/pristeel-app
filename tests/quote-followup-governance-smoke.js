const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-quote-followup-governance-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Quote follow-up governance must not observe or poll');
 const dom=new JSDOM('<!doctype html><html><body><div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"></div></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window,calls=[];let opened=0,legacy=0,answer=true;
 w.confirm=()=>answer;
 w.open=()=>{opened++;};
 w.followupQuote=()=>{legacy++;};
 w.supaFetch=async (path,method,body)=>{calls.push({path,method,body});return[];};
 const sixDaysAgo=new Date(Date.now()-6*86400000).toISOString(),tenDaysAgo=new Date(Date.now()-10*86400000).toISOString();
 w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley',client:'ITALIAN STYLE'},ourOffers:[
   {doc_nr:'Q-001',client:'ITALIAN STYLE',email:'buyer@example.com',project:'Dukley',total_eur:12000,created_at:tenDaysAgo,offer_state:{pst_sent_at:sixDaysAgo},followup_status:'open'},
   {doc_nr:'Q-DRAFT',client:'ITALIAN STYLE',email:'buyer@example.com',project:'Dukley',created_at:tenDaysAgo,offer_state:{},followup_status:'open'},
   {doc_nr:'Q-WON',client:'ITALIAN STYLE',created_at:tenDaysAgo,offer_state:{pst_sent_at:sixDaysAgo},followup_status:'won'}
 ]};
 w.eval(source);
 assert(w.PSTQuoteFollowupGovernanceV1,'Quote follow-up governance API missing');
 const due=w.PSTQuoteFollowupGovernanceV1._test.dueRows(w.__pstIntegrityLastData),unsent=w.PSTQuoteFollowupGovernanceV1._test.unsentRows(w.__pstIntegrityLastData);
 assert.deepStrictEqual(due.map(x=>x.doc_nr),['Q-001'],'Follow-up clock must start only after actual offer sent confirmation');
 assert.deepStrictEqual(unsent.map(x=>x.doc_nr),['Q-DRAFT'],'Saved draft must remain unsent until explicitly confirmed');
 answer=false;
 await w.PSTQuoteFollowupGovernanceV1.markOfferSent('Q-DRAFT',w.document.createElement('button'));
 assert.strictEqual(calls.length,0,'Declined offer-sent confirmation must not write');
 answer=true;
 await w.PSTQuoteFollowupGovernanceV1.markOfferSent('Q-DRAFT',w.document.createElement('button'));
 const offerPatch=calls.find(x=>x.path==='documents_registry?doc_nr=eq.Q-DRAFT'&&x.method==='PATCH');
 assert(offerPatch&&offerPatch.body.offer_state&&offerPatch.body.offer_state.pst_sent_at,'Confirmed client offer send must persist sent timestamp in offer_state');
 calls.length=0;
 w.followupQuote('Q-001',encodeURIComponent('ITALIAN STYLE'),encodeURIComponent('buyer@example.com'),12000,sixDaysAgo,encodeURIComponent('en'),encodeURIComponent('Dukley'));
 assert.strictEqual(opened,1,'Approved follow-up draft should open Gmail');
 assert.strictEqual(legacy,0,'Legacy follow-up writer must not run');
 assert.strictEqual(calls.length,0,'Opening a follow-up draft must not write last_followup_at');
 answer=false;
 await w.PSTQuoteFollowupGovernanceV1.markSent('Q-001',w.document.createElement('button'));
 assert.strictEqual(calls.length,0,'Declined follow-up sent confirmation must not write');
 answer=true;
 await w.PSTQuoteFollowupGovernanceV1.markSent('Q-001',w.document.createElement('button'));
 const patch=calls.find(x=>x.path==='documents_registry?doc_nr=eq.Q-001'&&x.method==='PATCH');
 assert(patch&&patch.body.last_followup_at,'Confirmed sent follow-up must update last_followup_at');
 dom.window.close();console.log('Quote follow-up governance smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
