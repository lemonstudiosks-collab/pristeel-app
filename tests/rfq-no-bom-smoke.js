const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(()=>{
 const source=fs.readFileSync('pristeel-rfq-no-bom-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'No-BOM RFQ module must not observe or poll');
 const dom=new JSDOM(`<!doctype html><html><body>
   <input id="i-projname" value="Dukley Seafront"><input id="i-client" value="ITALIAN STYLE"><input id="i-ref" value="DUK-01"><input id="i-location" value="Budva"><input id="i-deadline" value="2026-10-15"><div id="rfq-output"></div>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.alert=()=>{};w.showPage=()=>{};
 w.__pstIntegrityLastData={project:{id:'p1',name:'Dukley Seafront',client:'ITALIAN STYLE',ref:'DUK-01'},emails:[{direction:'incoming',snippet:'Please quote the steel canopy. Use S355 where applicable. Delivery required in October.'}]};
 w.logRfqSent=()=>{};
 w.eval(`let bomRows=[]; let suppliers=[{name:'Aktiva',country:'North Macedonia',lang:'en',cat:'producer',contacts:[{name:'Sales',email:'sales@example.com'}]}]; function generateRfqs(){window.__legacy=(window.__legacy||0)+1;} function goToRfq(){window.__legacyGo=(window.__legacyGo||0)+1;} window.__pushBom=function(){bomRows.push({profile:'HEA',dim:'300'});};\n${source}`);
 assert.strictEqual(w.PSTRfqNoBomV1._test.bomList().length,0,'Legacy lexical BOM was not read');
 assert.strictEqual(w.PSTRfqNoBomV1._test.supplierList().length,1,'Legacy lexical suppliers were not read');
 w.generateRfqs();
 const txt=w.document.getElementById('rfq-output').textContent;
 assert(txt.includes('RFQ pa BOM'),'No-BOM mode was not rendered');
 assert(txt.includes('Use S355 where applicable'),'Buyer email information was not used');
 assert(txt.includes('no approved BOM/material list'),'RFQ must explicitly say no approved BOM exists');
 assert.strictEqual(w.__legacy||0,0,'Legacy BOM-only RFQ generator should not run when BOM is empty');
 w.__pushBom();
 w.generateRfqs();
 assert.strictEqual(w.__legacy,1,'Existing BOM RFQ flow must remain untouched when BOM exists');
 dom.window.close();console.log('RFQ no-BOM smoke test passed.');
})();
