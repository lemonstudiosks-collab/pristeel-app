const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
 const source=fs.readFileSync('pristeel-workflow-governance-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Governance must not observe or poll');
 const dom=new JSDOM('<!doctype html><html><body></body></html>',{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;let saved=0,adjusted=0,closed=0,answer=false;
 w.confirm=()=>answer;
 w.saveInvoiceOut=()=>{saved++;};
 w.pstSaveAdjustment=()=>{adjusted++;};
 w.pstProjectsModernAction=(id,act)=>{if(act==='closed')closed++;};
 w.eval(source);
 assert(w.PSTWorkflowGovernanceV1,'Governance API missing');
 w.saveInvoiceOut();w.pstSaveAdjustment();w.pstProjectsModernAction('p1','closed');
 assert.strictEqual(saved,0,'Invoice finalization must stop without approval');
 assert.strictEqual(adjusted,0,'Credit/debit finalization must stop without approval');
 assert.strictEqual(closed,0,'Project closure must stop without delivery/payment confirmation');
 answer=true;
 w.saveInvoiceOut();w.pstSaveAdjustment();w.pstProjectsModernAction('p1','closed');
 assert.strictEqual(saved,1,'Approved invoice finalization did not continue');
 assert.strictEqual(adjusted,1,'Approved adjustment finalization did not continue');
 assert.strictEqual(closed,1,'Approved project closure did not continue');
 dom.window.close();
 console.log('Workflow governance smoke test passed.');
})();
