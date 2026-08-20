const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-command-center-v2.js','utf8');
 const cleanup=fs.readFileSync('pristeel-home-visual-cleanup-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Home command center must not observe or poll');
 assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source),'Home command center must remain read-only');
 assert(source.includes('#pst-home-pulse{display:none!important}'),'Low-value KPI pulse strip must stay removed from Home');
 assert(source.includes('.pst-happy-stats{display:none!important}'),'Legacy hero counters must stay hidden');
 assert(source.includes('height:42px!important')&&source.includes('font-size:13px!important'),'Home quick-create buttons must remain comfortably readable');
 assert(source.includes('.pst-hcc-quick-label{font-size:10.5px'),'Quick-create section label must remain readable');
 assert(source.includes("return{actions:5,projects:4}"),'Today view must expose at most five actions and four projects');
 assert(source.includes('background:#FFFFFF!important'),'Priority cards must use the neutral project-card visual family');

 assert(!/MutationObserver|setInterval\s*\(/.test(cleanup),'Workspace chrome cleanup must not observe or poll');
 assert(!/supaFetch|\b(?:POST|PATCH|DELETE)\b/.test(cleanup),'Workspace chrome cleanup must remain presentation-only');
 ['page-workspace-home','page-workspace-projects','page-workspace-inbox','page-workspace-commercial','page-workspace-apps','page-workspace-project','page-finance','page-contacts'].forEach(id=>{
   assert(cleanup.includes(`:has(#${id}.active) .topbar`),`Legacy topbar is not scoped away for ${id}`);
 });
 assert(cleanup.includes(':has(#page-workspace-project.active) #modbar'),'Modern project workspace must also suppress the legacy module bar');
 assert(!cleanup.includes('body.pst-ui-v2 .topbar{display:none'),'Legacy toolbar must not be hidden globally on Apps/legacy flows');
 assert(cleanup.includes('#page-workspace-home.active #pst-bcc-home-search{min-height:58px'),'Home universal search was not compacted');
 assert(cleanup.includes('#page-workspace-home.active .pst-hcc-tabs{margin:0 0 8px!important}'),'Home view controls still waste vertical space');
 assert(cleanup.includes('#page-workspace-home.active .pst-ws-quick{margin-bottom:12px!important}'),'Home quick-create row still wastes vertical space');

 const tasks=Array.from({length:7},(_,i)=>`<div class="pst-ws-action"><div class="pst-ws-action-main"><div class="pst-ws-action-title">Task ${i}</div></div><div class="pst-ws-action-side"><span class="pst-ws-action-tag">VEPRIM</span></div></div>`).join('');
 const projects=Array.from({length:6},(_,i)=>`<div class="pst-ws-projectcard">Project ${i}</div>`).join('');
 const dom=new JSDOM(`<!doctype html><html><body><div id="page-workspace-home" class="active" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div><button id="pst-bcc-home-search">Search</button><section id="pst-home-pulse"><button>Legacy KPI</button></section><div class="pst-happy-stats">Legacy counters</div><div class="pst-ws-quick"><button>Projekt</button><button>Ofertë</button><button>Faturë</button><button>Detyrë</button><button>Inbox</button></div><section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Old 1</div><div class="pst-ws-card-sub">Old sub 1</div></div></div><div id="pst-ws-home-actions">${tasks}</div></section><section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Old 2</div><div class="pst-ws-card-sub">Old sub 2</div></div></div><div id="pst-ws-home-projects">${projects}</div></section></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.eval(source);
 assert(w.PSTHomeCommandCenterV2,'Home command center API missing');
 w.PSTHomeCommandCenterV2.decorate();
 const tabs=w.document.getElementById('pst-home-view-tabs');
 assert(tabs,'Dashboard view tabs were not inserted');
 assert.strictEqual(tabs.querySelectorAll('button').length,3,'Dashboard must expose exactly three progressive views');
 assert(tabs.querySelector('[data-view="today"]').classList.contains('active'),'Today view must be the default');
 assert(!w.document.getElementById('pst-home-pulse'),'KPI pulse strip should be removed, not rendered');
 assert(!w.document.querySelector('.pst-happy-stats'),'Legacy hero counters should be removed');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-actions .pst-hcc-hidden').length,2,'Today view must keep five priority actions visible');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-projects .pst-hcc-hidden').length,2,'Today view must keep four project cards visible');
 assert(w.document.querySelector('#pst-ws-home-actions .pst-hcc-more'),'Task expansion control missing');
 assert.strictEqual(w.document.querySelector('.pst-ws-card-title').textContent,'Për mua tani','Home title must be stable');
 assert.strictEqual(w.document.querySelector('.pst-ws-action-tag').textContent,'KËRKON VEPRIM','Action tag wording is ambiguous');
 w.PSTHomeCommandCenterV2.setView('week');
 assert.strictEqual(w.PSTHomeCommandCenterV2.getView(),'week','Week view did not activate');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-actions .pst-hcc-hidden').length,2,'Week view must keep maximum five actions');
 assert(!w.document.getElementById('pst-home-pulse'),'Week view must not re-create low-value KPI strip');
 dom.window.close();
 console.log('Home command center v2 smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
