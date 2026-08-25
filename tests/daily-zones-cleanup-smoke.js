const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync('pristeel-daily-zones-cleanup-v1.js','utf8');
new Function(source);
assert(!/supaFetch\s*\(/.test(source),'daily-zone cleanup must not read/write Supabase');
assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source),'daily-zone cleanup must remain bounded and event-driven');
assert(!/pstOpenProjectWorkspace|pstWorkspaceGo|showPage\s*\(/.test(source),'daily-zone cleanup must not own navigation');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-contacts" class="page active">
 <header class="pcm-head"><div><h1>Kontaktet</h1><p>Old technical copy</p></div><div class="pcm-head-actions"><button data-pcm-refresh>Rifresko</button><button data-pcm-classic>Pamja klasike</button></div></header>
 <div class="pcm-business-cards"><button class="pcm-business-card" data-pcm-business="client">Klient <b data-pcm-business-count>24</b></button><button class="pcm-business-card" data-pcm-business="supplier">Furnitor <b data-pcm-business-count>18</b></button></div>
 <section class="pcm-card"><div class="pcm-card-head"><b>Contact Master</b><small id="pcm-count">42 kontakte</small></div></section>
</div>
<div id="page-workspace-projects" class="page">
 <div class="pst-pm-head"><div><div class="pst-pm-title">Të gjitha projektet</div><div class="pst-pm-sub">old</div></div><div class="pst-pm-head-actions"><button id="pst-pdm-btn">Dublikatat</button><button id="pst-pm-refresh">Rifresko</button><button id="pst-pm-new">+ Projekt i ri</button></div></div>
 <div class="pst-pm-controls"><div class="pst-pm-control-top"><input class="pst-pm-search"><select id="pst-pm-sort"><option>Sort</option></select><div class="pst-pm-toggle"><button>List</button><button>Board</button></div></div><div id="pst-pm-filters"></div><div id="pst-pc-filterbar"></div><div id="pst-pws-filterbar"><button data-pws-work="all">Të gjitha</button><button data-pws-work="action">Action</button><button data-pws-work="waiting">Waiting</button><button data-pws-work="execution">Execution</button><button data-pws-work="closed">Closed</button></div></div>
</div>
<div id="page-workspace-project" class="page"><section class="pwf-project-context"><div class="pwf-project-kpis">4 RFQ · 3 oferta</div></section></div>
<div id="page-workspace-apps" class="page"><div class="pst-ws-head"><div><div class="pst-ws-eyebrow">Apps</div><div class="pst-ws-title">Mjetet dhe regjistrat</div><div class="pst-ws-sub">old</div></div></div><section id="pst-system-operating-tools"><button>Gmail</button><button>Automation Health</button></section><div class="pst-ws-appgrid"><button class="pst-ws-app">Tool A</button><button class="pst-ws-app">Tool B</button></div></div>
<div id="page-finance" class="page"></div><div id="page-kek-tenders" class="page"></div>
</body></html>`,{runScripts:'outside-only',url:'https://example.test'});
const w=dom.window;
let healthLoads=0;
w.PSTAutomationHealthV1={load:()=>{healthLoads++;return true;}};
w.eval(source);
w.PSTDailyZonesCleanupV1.apply();
const contacts=w.document.getElementById('page-workspace-contacts');
assert.equal(contacts.querySelector('.pcm-head h1').textContent,'Partners');
assert.match(contacts.querySelector('.pcm-head p').textContent,/një identitet/i);
assert.equal(contacts.querySelector('.pcm-card-head b').textContent,'Marrëdhëniet');
assert(contacts.querySelector('[data-pcm-refresh]').classList.contains('pst-daily-system-only'));
assert(contacts.querySelector('[data-pcm-classic]').classList.contains('pst-daily-system-only'));
assert([...contacts.querySelectorAll('[data-pcm-business-count],#pcm-count')].every(x=>x.classList.contains('pst-daily-passive-count')));
const css=w.document.getElementById('pst-daily-zones-cleanup-css').textContent;
assert(css.includes('#page-workspace-contacts.active .pst-daily-system-only{display:none!important}'));
assert(css.includes('#page-workspace-contacts.active .pst-daily-passive-count{display:none!important}'));

contacts.classList.remove('active');
const projects=w.document.getElementById('page-workspace-projects');projects.classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert.equal(projects.querySelector('.pst-pm-title').textContent,'Projektet');
assert.match(projects.querySelector('.pst-pm-sub').textContent,/gjendja reale/i);
['#pst-pdm-btn','#pst-pm-refresh','#pst-pm-new','#pst-pm-sort','.pst-pm-toggle','#pst-pm-filters','#pst-pc-filterbar'].forEach(sel=>assert(projects.querySelector(sel).classList.contains('pst-daily-project-tool'),sel+' must be retired from daily Projects UI'));
assert.equal(projects.querySelectorAll('#pst-pws-filterbar [data-pws-work]').length,5,'canonical work-state filters stay available');
assert(!projects.querySelector('.pst-pm-search').classList.contains('pst-daily-project-tool'),'search must remain available');
assert(css.includes('#page-workspace-projects.active .pst-daily-project-tool{display:none!important}'));

projects.classList.remove('active');
w.document.getElementById('page-workspace-project').classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert(w.document.querySelector('.pwf-project-kpis').classList.contains('pst-daily-passive-count'));
assert(css.includes('#page-workspace-project.active .pst-daily-passive-count{display:none!important}'));

w.document.getElementById('page-workspace-project').classList.remove('active');
const system=w.document.getElementById('page-workspace-apps');system.classList.add('active');
w.PSTDailyZonesCleanupV1.apply();
assert.equal(system.querySelector('.pst-ws-eyebrow').textContent,'SYSTEM');
assert.equal(system.querySelector('.pst-ws-title').textContent,'Sistemi dhe automatizimet');
assert.match(system.querySelector('.pst-ws-sub').textContent,/mjetet teknike/i);
assert(system.querySelector('#pst-system-operating-tools').classList.contains('pst-daily-system-duplicate'),'duplicate System shortcut strip must be retired');
const advanced=system.querySelector('#pst-system-advanced-tools');
assert(advanced,'technical app grid must be grouped behind one advanced-tools disclosure');
assert.equal(advanced.open,false,'technical tools must be collapsed by default');
assert(advanced.querySelector('.pst-system-advanced-body .pst-ws-appgrid'),'existing System app grid must remain intact inside advanced tools');
assert.equal(system.querySelector('.pst-ws-appgrid').getAttribute('data-pst-system-tools'),'1');
assert(healthLoads>0,'System must hand off to the existing Automation Health engine');
assert(css.includes('#page-workspace-apps.active .pst-daily-system-duplicate{display:none!important}'));

dom.window.close();
console.log('Daily zones cleanup smoke test passed.');