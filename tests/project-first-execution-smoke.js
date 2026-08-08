const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
 const source=fs.readFileSync('pristeel-project-first-execution-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Execution drafts must not observe or poll');
 assert(!/supaFetch\s*\(/.test(source),'Execution draft module must not write project data automatically');
 const dom=new JSDOM('<!doctype html><html><body><div id="page-workspace-project" class="pf2-on"><div id="pst-pi-body"></div></div></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley',ref:'D-01',status:'aktiv'},supplierOffers:[{supplier:'Aktiva',total_eur:10000,currency:'EUR'}],rfqs:[{supplier_name:'Aktiva',supplier_email:'sales@aktiva.mk',lang:'en'}],emails:[{direction:'incoming',from_email:'buyer@example.com',from_name:'Buyer',snippet:'Thank you, we confirm the offer.',sent_at:'2026-08-08'}]};
 w.confirm=()=>false;w.open=()=>{throw new Error('Gmail must not open without user approval');};
 w.eval(source);
 w.PSTProjectFirstExecutionV1.inject();
 assert(w.document.querySelector('[data-pfe-supplier][disabled]'),'Supplier confirmation must be disabled before project is won');
 w.__pstIntegrityLastData.project.status='fituar';
 w.PSTProjectFirstExecutionV1.inject();
 assert(!w.document.querySelector('[data-pfe-supplier]').disabled,'Supplier confirmation should activate for won project');
 const s=w.PSTProjectFirstExecutionV1._test.supplierRows(w.__pstIntegrityLastData)[0];
 assert.strictEqual(s.email,'sales@aktiva.mk','Supplier confirmation must reuse RFQ contact email');
 const b=w.PSTProjectFirstExecutionV1._test.buyerRows(w.__pstIntegrityLastData)[0];
 assert.strictEqual(b.email,'buyer@example.com','Buyer confirmation must use project communication contact');
 dom.window.close();console.log('Project-first execution smoke test passed.');
})();
