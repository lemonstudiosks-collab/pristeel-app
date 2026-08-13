const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-stability-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Home stability must not observe or poll');
 assert(source.includes('WAIT_MS=3200'),'Home project recovery must be bounded');
 assert(!/mbyllur\|fituar\|/.test(source),'Won projects must not be classified as closed on Home');
 const dom=new JSDOM(`<!doctype html><html><body>
  <div id="page-workspace-home" style="display:block">
   <div id="pst-ws-home-actions">${[1,2,3,4,5].map(i=>`<div class="pst-ws-action">A${i}</div>`).join('')}</div>
   <div id="pst-ws-home-projects"></div>
  </div>
  <span id="pst-ws-b-projects"></span>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.PSTHomeCommandCenterV2={getView:()=> 'today'};
 w.PSTDashboardTaskCardsV1={decorate(){}};
 w.supaFetch=async()=>[
  {id:'p1',name:'P1',status:'aktiv',updated_at:'2026-08-07T12:00:00Z'},
  {id:'p2',name:'P2',status:'aktiv',updated_at:'2026-08-06T12:00:00Z'},
  {id:'p3',name:'P3',status:'aktiv',updated_at:'2026-08-05T12:00:00Z'},
  {id:'p4',name:'P4',status:'aktiv',updated_at:'2026-08-04T12:00:00Z'},
  {id:'stacon-22-26',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',ref:'D - 22/26',status:'fituar',pipeline_stage:'production_control',updated_at:'2026-08-08T12:00:00Z'},
  {id:'closed-1',name:'Closed',status:'realizuar',updated_at:'2026-08-09T12:00:00Z'}
 ];
 w.pstOpenProjectWorkspace=()=>{};
 w.eval(source);
 await w.PSTHomeStabilityV2.apply(true);
 const actions=[...w.document.querySelectorAll('#pst-ws-home-actions>.pst-ws-action')];
 assert.strictEqual(actions.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three priority actions');
 const projects=[...w.document.querySelectorAll('#pst-ws-home-projects>.pst-ws-projectcard')];
 assert.strictEqual(projects.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three project cards');
 assert.strictEqual(w.document.getElementById('pst-ws-b-projects').textContent,'5','Won execution project must count as active while realized project stays closed');
 assert.ok(projects.some(x=>x.getAttribute('data-project-id')==='stacon-22-26'),'STACON-style won execution project was not rendered as active');
 assert.ok(!projects.some(x=>x.getAttribute('data-project-id')==='closed-1'),'Realized project must not render as active');
 dom.window.close();
 console.log('Home stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
