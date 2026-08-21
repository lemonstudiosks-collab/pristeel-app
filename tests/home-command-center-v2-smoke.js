const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

(async()=>{
 const source=fs.readFileSync('pristeel-home-command-center-v2.js','utf8');
 const cleanup=fs.readFileSync('pristeel-home-visual-cleanup-v1.js','utf8');
 assert(!/MutationObserver|setInterval\s*\(/.test(source),'Home command center must not observe or poll');
 assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source),'Home command center must remain read-only');
 assert(source.includes("t.textContent='Fillo këtu'"),'Home must clearly identify the single starting point');
 assert(source.includes('Radha ime e punës'),'Home must expose a compact work queue');
 assert(source.includes("pt.textContent='Projektet aktive'"),'Home must expose active projects as a separate lane');
 assert(source.includes('.pst-ws-quick{display:none!important}'),'Quick-create tile strip must stay off the workdesk Home');
 assert(source.includes('.pst-focus-action'),'Primary action must have a unique visual role');
 assert(source.includes('.pst-queue-action'),'Remaining actions must use compact queue rows');
 assert(source.includes("box.dataset.pstOpen='0'"),'Waiting lane must be collapsed by default');
 assert(source.includes('PROJECT_LIMIT=8'),'Active project table must stay compact');

 assert(!/MutationObserver|setInterval\s*\(/.test(cleanup),'Workspace chrome cleanup must not observe or poll');
 assert(!/supaFetch|\b(?:POST|PATCH|DELETE)\b/.test(cleanup),'Workspace chrome cleanup must remain presentation-only');

 const tasks=Array.from({length:5},(_,i)=>`<div class="pst-ws-action" data-ws-action="a${i}" data-project-id="p${i}"><div class="pst-ws-action-main"><div class="pst-ws-action-title">Task ${i}</div><div class="pst-ws-action-meta">Why ${i}</div></div><div class="pst-ws-action-side"><span class="pst-ws-action-tag">VEPRIM</span><div class="pst-ws-action-controls"><button class="pst-ws-action-open">Vepro</button><button class="pst-ws-action-snooze">Shtyje</button></div></div></div>`).join('');
 const projects=Array.from({length:10},(_,i)=>`<div class="pst-ws-projectcard" data-project-id="w${i}"><div class="pst-ws-projectcard-top"><div><div class="pst-ws-projectcard-name">Project ${i}</div><div class="pst-ws-projectcard-client">Client ${i}</div></div><span class="pst-ws-status">Aktiv</span></div><div class="pst-ws-projectcard-next"><b>Hapi i radhës:</b> Work ${i}</div></div>`).join('');
 const waiting=`<section id="pst-home-waiting"><div class="pst-home-wait-head"><div><b>Në pritje</b><span>PPPP po pret palën tjetër</span></div></div><div class="pst-home-wait-list"><button class="pst-home-wait-item">Wait 1</button><button class="pst-home-wait-item">Wait 2</button></div></section>`;
 const dom=new JSDOM(`<!doctype html><html><body><div id="page-workspace-home" class="active" style="display:block"><div class="pst-ws-page"><div class="pst-ws-head"></div><button id="pst-bcc-home-search">Search</button><nav id="pst-home-view-tabs">Old tabs</nav><section id="pst-home-pulse">Legacy KPI</section><div class="pst-happy-stats">Legacy counters</div><div class="pst-ws-quick"><button>Projekt</button><button>Ofertë</button></div><div class="pst-ws-homegrid"><div class="pst-ws-homecol"><section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Old 1</div><div class="pst-ws-card-sub">Old sub 1</div></div></div><div id="pst-ws-home-actions">${tasks}</div></section></div><div class="pst-ws-homecol"><section class="pst-ws-card"><div class="pst-ws-card-hd"><div><div class="pst-ws-card-title">Old 2</div><div class="pst-ws-card-sub">Old sub 2</div></div></div><div id="pst-ws-home-projects">${projects}</div></section></div></div>${waiting}<div id="pst-ws-alertbar"></div></div></div></body></html>`,{runScripts:'outside-only',url:'https://example.test/'});
 const w=dom.window;
 w.PSTHomeCanonicalV1={snapshot(){return{actions:Array.from({length:5},(_,i)=>({key:`a${i}`,meta:`Project ${i} · reason`}))};}};
 w.eval(source);
 assert(w.PSTHomeCommandCenterV2,'Home command center API missing');
 w.PSTHomeCommandCenterV2.decorate();
 assert(!w.document.getElementById('pst-home-view-tabs'),'View tabs must be removed from operational Home');
 assert(!w.document.getElementById('pst-home-pulse'),'KPI pulse strip must be removed');
 assert(!w.document.querySelector('.pst-happy-stats'),'Legacy hero counters must be removed');
 assert.strictEqual(w.document.querySelector('.pst-ws-card-title').textContent,'Fillo këtu','Primary Home section title is wrong');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-actions > .pst-focus-action').length,1,'Home must expose exactly one primary action');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-actions > .pst-queue-action').length,4,'Remaining actions must be compact queue rows');
 assert.strictEqual(w.document.querySelector('.pst-work-queue-label b').textContent,'Radha ime e punës','Queue label missing');
 assert.strictEqual(w.document.querySelector('.pst-focus-action .pst-work-project').textContent,'Project 0','Primary action lost project context');
 const wait=w.document.getElementById('pst-home-waiting');
 assert(wait.classList.contains('pst-work-waiting'),'Waiting lane was not decorated');
 assert.strictEqual(wait.querySelector('.pst-home-wait-list').hidden,true,'Waiting lane must start collapsed');
 assert.strictEqual(wait.querySelector('.pst-work-wait-meta b').textContent,'2 projekte','Waiting count is wrong');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-projects > .pst-hcc-hidden').length,2,'Only eight active project rows should be shown initially');
 assert.strictEqual(w.document.querySelectorAll('#pst-ws-home-projects > .pst-work-project-row').length,10,'Active projects must be represented as compact rows');
 assert.strictEqual(w.PSTHomeCommandCenterV2.getView(),'workdesk','Home API must report workdesk mode');
 dom.window.close();
 console.log('Home work dispatcher smoke test passed.');
})().catch(e=>{console.error(e);process.exit(1);});
