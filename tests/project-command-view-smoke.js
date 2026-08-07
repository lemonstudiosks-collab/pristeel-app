const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-project-command-view-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Project command view must not observe or poll');
 assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source),'Project command view must not write');
 assert(!/(?:window\.)?pstOpenProjectWorkspace\s*=(?!=)/.test(source),'Project opener must not be replaced');
 const dom=new JSDOM(`<!doctype html><html><body><div id="page-workspace-project" class="page" style="display:block"><div class="pst-pi-head"><div class="pst-pi-actions"><button class="pst-pi-btn">Projektet</button><button class="pst-pi-btn">Pamja e vjetër</button><button class="pst-pi-btn">Rifresko</button></div><div class="pst-pi-stats"></div></div><div class="pst-pi-tabs"></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.__pstCurrentProjectId='p1';
 w.PSTProjectDataIntegrity={load:async()=>({project:{id:'p1',name:'SPIE TenneT',client:'SPIE',ref:'SPIE-01',status:'aktiv',pipeline_stage:'pricing',deadline:'2026-08-10',drive_folder_id:'d1'},emails:[{subject:'Pricing clarification',from_name:'Buyer',sent_at:'2026-08-06T08:00:00Z',gmail_url:'https://mail.google.com/x'}],contacts:[{email:'buyer@example.com'}],rfqs:[{rfq_ref:'RFQ-01',sent_at:'2026-08-04'}],supplierOffers:[{title:'Supplier offer',supplier:'Aktiva',created_at:'2026-08-05'}],ourOffers:[],files:[{name:'Scope.pdf',created_at:'2026-08-03',drive_url:'https://drive.google.com/x'}],linkedOnly:[]})};
 let tab='';w.pstPiTab=x=>{tab=x;};
 w.eval(source);
 const ok=await w.PSTProjectCommandView.load('p1',true);
 assert(ok,'Project command view did not render');
 const panel=w.document.getElementById('pst-project-command-view');
 assert(panel,'Command panel missing');
 assert(panel.textContent.includes('Përcaktimi i çmimit'),'Current stage is not clear');
 assert(panel.textContent.includes('Hapi i radhës'),'Next action is missing');
 assert(panel.querySelector('#pst-pcv-search'),'Project search button missing');
 assert(w.document.querySelector('.pst-pi-actions'),'Existing project fallback actions were removed');
 panel.querySelector('[data-tab="commercial"]').click();
 assert.strictEqual(tab,'commercial','Primary action did not use existing project tab handler');
 dom.window.close();
 console.log('Project command view smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
