const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-supplier-capability-manager-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Supplier capability manager must not observe or poll');
 assert(!/supaFetch\(['"]suppliers/.test(source),'Capability manager must not use a non-existent suppliers table');
 const dom=new JSDOM(`<!doctype html><html><body><div id="page-workspace-project" class="pf2-on"><section class="pf2-card"><header><div><b>Routing</b></div></header><div>old</div></section></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window,queries=[];
 w.__pstIntegrityLastData={project:{deal_type:'full'}};
 w.PSTProjectFirstV2={capabilities:()=>['profile']};
 w.localStorage.setItem('pst_supplier_capabilities_v1',JSON.stringify({'steel-trade':{company:'Steel Trade',capabilities:['profile','HEB']}}));
 w.supaFetch=async path=>{queries.push(path);return[{id:'c1',kind:'supplier',company:'Steel Trade',person:'Ana',email:'ana@example.com',country:'DE',role:'Sales'}];};
 w.eval(source);
 await w.PSTSupplierCapabilityManagerV1.inject();
 assert(queries.some(x=>x.startsWith('contacts?kind=eq.supplier')),'Supplier companies must come from contacts registry');
 const txt=w.document.querySelector('.pf2-card').textContent;
 assert(txt.includes('Steel Trade'),'Tagged supplier was not routed');
 assert(txt.includes('profile'),'Capability tag was not displayed');
 assert(txt.includes('Aktiva')&&txt.includes('Kentaur'),'Fixed producers must remain available for production projects');
 dom.window.close();console.log('Supplier capability manager smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
