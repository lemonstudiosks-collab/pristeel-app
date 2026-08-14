const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-stability-v2.js','utf8');
 assert(!/MutationObserver\s*\(|setInterval\s*\(/.test(source),'Home stability must not observe or poll');
 assert(source.includes('WAIT_MS=3200'),'Home project recovery must be bounded');
 assert(!/mbyllur\|fituar\|/.test(source),'Won projects must not be classified as closed on Home');
 assert(source.includes('humbur|closedlost|cancelled'),'Lost-project guard must cover terminal loss statuses');
 assert(source.includes("String(t&&t.source||'').toLowerCase()!=='email_audit'"),'Gmail freshness guard must be limited to email_audit tasks');
 assert(source.includes('Number(e.match_confidence||0)<90'),'Suggested-project freshness must require high confidence');
 assert(source.includes('e.needs_review===true'),'Needs-review email relations must never refresh tasks');
 const dom=new JSDOM(`<!doctype html><html><body>
  <div id="page-workspace-home" style="display:block">
   <div id="pst-ws-home-actions">
    <div class="pst-ws-action" id="lost-roleff-action">Roleff stale</div>
    <div class="pst-ws-action" id="stale-wolff-action">Wolff stale</div>
    <div class="pst-ws-action" id="ambiguous-email-action">Ambiguous stays</div>
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
 function isoDaysAgo(n,h=12){const d=new Date();d.setDate(d.getDate()-n);d.setHours(h,0,0,0);return d.toISOString();}
 function dayDaysAgo(n){const d=new Date();d.setDate(d.getDate()-n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function localIsoDate(){return dayDaysAgo(0);}
 const projects=[
  {id:'p1',name:'P1',status:'aktiv',updated_at:isoDaysAgo(7)},
  {id:'p2',name:'P2',status:'aktiv',updated_at:isoDaysAgo(8)},
  {id:'p3',name:'P3',status:'aktiv',updated_at:isoDaysAgo(9)},
  {id:'p4',name:'P4',status:'aktiv',updated_at:isoDaysAgo(10)},
  {id:'stacon-22-26',name:'STACON - LAGERHALLE - HAMBURG',client:'STACON GmbH',ref:'D - 22/26',status:'fituar',pipeline_stage:'production_control',updated_at:isoDaysAgo(6)},
  {id:'wm-active',name:'Wolff & Müller',status:'aktiv',updated_at:isoDaysAgo(2)},
  {id:'ambig-active',name:'Ambiguous project',status:'aktiv',updated_at:isoDaysAgo(3)},
  {id:'closed-1',name:'Closed',status:'realizuar',updated_at:isoDaysAgo(5)},
  {id:'roleff-lost',name:'Roleff - 411320-KR Maschinenhaus Schlammbehandlung',status:'humbur',updated_at:isoDaysAgo(4)}
 ];
 const lostTask={id:'roleff-followup',title:'Ndjekje oferte — PST-QUO-2026-010',detail:'Roleff stale follow-up',due_date:localIsoDate(),project_id:'roleff-lost'};
 const wolffTask={id:'wolff-followup',title:'Wolff & Müller — nuk lajmërohen, telefono/ndiq',detail:'Email i vjetër. 7 ditë pa lajmërim. Telefono direkt ose dërgo follow-up të ri.',due_date:dayDaysAgo(5),project_id:'wm-active',source:'email_audit',contact_email:'Kevin.Stern@wolff-mueller.de',created_at:isoDaysAgo(12)};
 const ambiguousTask={id:'ambig-followup',title:'Kontakt i paqartë — ndiq',detail:'7 ditë pa përgjigje.',due_date:dayDaysAgo(5),project_id:'ambig-active',source:'email_audit',contact_email:'contact@example.org',created_at:isoDaysAgo(12)};
 const wolffEmail={id:100,project_id:null,suggested_project_id:'wm-active',from_email:'sales@prissteel.com',to_emails:['kevin.stern@wolff-mueller.de'],cc_emails:[],subject:'Re: Zusammenarbeit Stahlbauarbeiten',sent_at:isoDaysAgo(2),direction:'outgoing',match_method:'email-unique',match_confidence:95,needs_review:false};
 const ambiguousEmail={id:101,project_id:null,suggested_project_id:'ambig-active',from_email:'sales@prissteel.com',to_emails:['contact@example.org'],cc_emails:[],subject:'Follow-up',sent_at:isoDaysAgo(2),direction:'outgoing',match_method:'email-unique',match_confidence:95,needs_review:true};
 w.supaFetch=async path=>{
  if(path.startsWith('projects?select='))return projects.map(x=>({...x}));
  if(path.startsWith('tasks?status=eq.hapur'))return [lostTask,wolffTask,ambiguousTask];
  if(path.startsWith('rfq_log?'))return [];
  if(path.startsWith('project_emails?'))return [wolffEmail,ambiguousEmail];
  return [];
 };
 w.pstOpenProjectWorkspace=()=>{};
 w.eval(source);
 const lostKey=w.PSTHomeStabilityV2._test.actionKey(lostTask.title,'Afati sot · '+lostTask.detail,'project');
 const wolffKey=w.PSTHomeStabilityV2._test.taskActionKey(wolffTask);
 const ambiguousKey=w.PSTHomeStabilityV2._test.taskActionKey(ambiguousTask);
 w.document.getElementById('lost-roleff-action').setAttribute('data-ws-action',lostKey);
 w.document.getElementById('stale-wolff-action').setAttribute('data-ws-action',wolffKey);
 w.document.getElementById('ambiguous-email-action').setAttribute('data-ws-action',ambiguousKey);
 assert.strictEqual(w.PSTHomeStabilityV2._test.effectiveEmailProject(wolffEmail),'wm-active','High-confidence email-unique suggestion must be usable as a read-only freshness signal');
 assert.strictEqual(w.PSTHomeStabilityV2._test.effectiveEmailProject(ambiguousEmail),'','Needs-review relation must not be trusted for freshness');
 assert.strictEqual(w.PSTHomeStabilityV2._test.staleEmailAuditTask(wolffTask,[wolffEmail]),true,'New Wolff-style outgoing email must invalidate the old overdue follow-up date');
 assert.strictEqual(w.PSTHomeStabilityV2._test.staleEmailAuditTask(ambiguousTask,[ambiguousEmail]),false,'Ambiguous email must not invalidate a task');
 await w.PSTHomeStabilityV2.apply(true);
 assert.strictEqual(w.document.getElementById('lost-roleff-action'),null,'Lost-project task must be removed from Home priorities even when legacy task is still open');
 assert.strictEqual(w.document.getElementById('stale-wolff-action'),null,'Old email_audit priority must be removed after a newer safely attributed outgoing email');
 assert(w.document.getElementById('ambiguous-email-action'),'Needs-review email relation must leave the task untouched');
 const actions=[...w.document.querySelectorAll('#pst-ws-home-actions>.pst-ws-action')];
 assert.strictEqual(actions.length,5,'Only lost-project and safely stale email priorities should be removed');
 assert.strictEqual(actions.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three remaining priority actions');
 assert.strictEqual(w.document.getElementById('pst-ws-b-home').textContent,'5','Home action badge must exclude suppressed stale priorities');
 const projectsRendered=[...w.document.querySelectorAll('#pst-ws-home-projects>.pst-ws-projectcard')];
 assert.strictEqual(projectsRendered.filter(x=>!x.classList.contains('pst-hcc-hidden')).length,3,'Today must show exactly three project cards');
 assert.strictEqual(w.document.getElementById('pst-ws-b-projects').textContent,'7','Won execution project and active outreach projects must count as active while realized/lost projects stay closed');
 assert.ok(projectsRendered.some(x=>x.getAttribute('data-project-id')==='stacon-22-26'),'STACON-style won execution project was not rendered as active');
 assert.ok(!projectsRendered.some(x=>x.getAttribute('data-project-id')==='closed-1'),'Realized project must not render as active');
 assert.ok(!projectsRendered.some(x=>x.getAttribute('data-project-id')==='roleff-lost'),'Lost project must not render as active');
 assert.strictEqual(w.PSTHomeStabilityV2._test.active({status:'fituar'}),true,'Won project must remain active');
 assert.strictEqual(w.PSTHomeStabilityV2._test.lost({status:'humbur'}),true,'Lost status helper must identify humbur');
 assert.strictEqual(w.PSTHomeStabilityV2._test.lost({status:'realizuar'}),false,'Realized project must not be treated as a lost-project cleanup case');
 dom.window.close();
 console.log('Home stability v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
