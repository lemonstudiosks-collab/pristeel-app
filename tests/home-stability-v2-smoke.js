const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-stability-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Home stability must not observe or poll');
 assert(source.includes('WAIT_MS=3200'),'Home project recovery must be bounded');
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
  {id:'p4',name:'P4',status:'aktiv',updated_at:'2026-08-04T12:00:00Z'}
 ];
 w.pstOpenProjectWorkspace=()=>{};
 w.eval(source);
 await w.PSTHomeStabilityV2.apply(true);
 const actions=[...w.document.querySelectorAll('#pst-ws-home-actions>.pst-ws-action')];
 assert.strictEqual(actions.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three priority actions');
 const projects=[...w.document.querySelectorAll('#pst-ws-home-projects>.pst-ws-projectcard')];
 assert.strictEqual(projects.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three project cards');
 assert.strictEqual(w.document.getElementById('pst-ws-b-projects').textContent,'4','Project count badge was not recovered');
 dom.window.close();
 console.log('Home stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
