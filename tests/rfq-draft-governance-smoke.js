const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-rfq-draft-governance-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'RFQ governance must not observe or poll');
 const dom=new JSDOM(`<!doctype html><html><body><input id="i-projname" value="Dukley"><div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window,calls=[];w._curProjId='p1';w.confirm=()=>true;w.logRfqSent=()=>{throw new Error('Legacy sent logger must not run');};
 w.supaFetch=async (path,method,body)=>{calls.push({path,method,body});if(method==='POST')return[{id:'r1'}];return[];};
 w.eval(source);
 await w.logRfqSent(encodeURIComponent('Supplier A'),encodeURIComponent('supplier@example.com'),'en',encodeURIComponent('RFQ Dukley'),btoa(unescape(encodeURIComponent('Please quote.'))));
 const planned=calls.find(x=>x.path==='rfq_log'&&x.method==='POST');
 assert(planned,'RFQ draft was not registered');
 assert.strictEqual(planned.body.status,'planned','Opening Gmail draft must not mark RFQ sent');
 assert(!planned.body.sent_at,'Planned RFQ must not have sent_at');

 w.__pstIntegrityLastData={project:{id:'p1'},rfqs:[{id:'r1',project_id:'p1',status:'planned',supplier_name:'Supplier A',supplier_email:'supplier@example.com',subject:'RFQ Dukley'}]};
 w.PSTRfqDraftGovernanceV1.inject();
 const b=w.document.querySelector('[data-rfq-confirm-sent="r1"]');assert(b,'Explicit sent confirmation action is missing');b.click();
 await new Promise(r=>setTimeout(r,20));
 const sent=calls.find(x=>x.path==='rfq_log?id=eq.r1'&&x.method==='PATCH');
 assert(sent&&sent.body.status==='sent'&&sent.body.sent_at,'RFQ must become sent only after explicit confirmation');
 dom.window.close();console.log('RFQ draft governance smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
