const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-stability-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Home stability must not observe or poll');
 assert(source.includes('WAIT_MS=3200'),'Home project recovery must be bounded');
 assert(!/mbyllur\|fituar\|/.test(source),'Won projects must not be classified as closed on Home');
 assert(source.includes('humbur|closedlost|cancelled'),'Lost-project guard must cover terminal loss statuses');
 const dom=new JSDOM(`<!doctype html><html><body>
  <div id="page-workspace-home" style="display:block">
   <div id="pst-ws-home-actions">
    <div class="pst-ws-action" id="lost-roleff-action">Roleff stale</div>
    ${[1,2,3,4].map(i=>`<div class="pst-ws-action" data-ws-action="keep-${i}">A${i}</div>`).join('')}
   </div>
   <div id="pst-ws-home-projects"></div>
  </div>
  <span id="pst-ws-b-projects"></span>
  <span id="pst-ws-b-home"></span>
 </body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.PSTHomeCommandCenterV2={getView:()=> 'today'};
 w.PSTDashboardTaskCardsV1={decorate(){}};
 const projects=[
  {id:'p1',name:'P1',status:'aktiv',updated_at:'2026-08-07T12:00:00Z'},
  {id:'p2',name:'P2',status:'aktiv',updated_at:'2026-08-06T12:00:00Z'},
  {id:'p3',name:'P3',status:'aktiv',updated_at:'2026-08-05T12:00:00Z'},
  {id:'p4',name:'P4',status:'aktiv',updated_at:'2026-08-04T12:00:00Z'},
  {id:'stacon-22-26',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',ref:'D - 22/26',status:'fituar',pipeline_stage:'production_control',updated_at:'2026-08-08T12:00:00Z'},
  {id:'closed-1',name:'Closed',status:'realizuar',updated_at:'2026-08-09T12:00:00Z'},
  {id:'roleff-lost',name:'Roleff - 411320-KR Maschinenhaus Schlammbehandlung',status:'humbur',updated_at:'2026-08-10T12:00:00Z'}
 ];
 function localIsoDate(){const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;}
 const lostTask={id:'roleff-followup',title:'Ndjekje oferte — PST-QUO-2026-010',detail:'Roleff stale follow-up',due_date:localIsoDate(),project_id:'roleff-lost'};
 w.supaFetch=async path=>{
  if(path.startsWith('projects?select='))return projects.map(x=>({...x}));
  if(path.startsWith('tasks?status=eq.hapur'))return [lostTask];
  if(path.startsWith('rfq_log?'))return [];
  return [];
 };
 w.pstOpenProjectWorkspace=()=>{};
 w.eval(source);
 const lostKey=w.PSTHomeStabilityV2._test.actionKey(lostTask.title,'Afati sot · '+lostTask.detail,'project');
 w.document.getElementById('lost-roleff-action').setAttribute('data-ws-action',lostKey);
 await w.PSTHomeStabilityV2.apply(true);
 assert.strictEqual(w.document.getElementById('lost-roleff-action'),null,'Lost-project task must be removed from Home priorities even when legacy task is still open');
 const actions=[...w.document.querySelectorAll('#pst-ws-home-actions>.pst-ws-action')];
 assert.strictEqual(actions.length,4,'Only the lost-project priority should be removed');
 assert.strictEqual(actions.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three remaining priority actions');
 assert.strictEqual(w.document.getElementById('pst-ws-b-home').textContent,'4','Home action badge must exclude the lost-project action');
 const projectsRendered=[...w.document.querySelectorAll('#pst-ws-home-projects>.pst-ws-projectcard')];
 assert.strictEqual(projectsRendered.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three project cards');
 assert.strictEqual(w.document.getElementById('pst-ws-b-projects').textContent,'5','Won execution project must count as active while realized/lost projects stay closed');
 assert.ok(projectsRendered.some(x=>x.getAttribute('data-project-id')==='stacon-22-26'),'STACON-style won execution project was not rendered as active');
 assert.ok(!projectsRendered.some(x=>x.getAttribute('data-project-id')==='closed-1'),'Realized project must not render as active');
 assert.ok(!projectsRendered.some(x=>x.getAttribute('data-project-id')==='roleff-lost'),'Lost project must not render as active');
 assert.strictEqual(w.PSTHomeStabilityV2._test.active({status:'fituar'}),true,'Won project must remain active');
 assert.strictEqual(w.PSTHomeStabilityV2._test.lost({status:'humbur'}),true,'Lost status helper must identify humbur');
 assert.strictEqual(w.PSTHomeStabilityV2._test.lost({status:'realizuar'}),false,'Realized project must not be treated as a lost-project cleanup case');
 dom.window.close();
 console.log('Home stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
