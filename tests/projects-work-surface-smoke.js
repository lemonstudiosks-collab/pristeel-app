const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-projects" class="active">
  <div class="pst-pm-page">
    <div class="pst-pm-head"><div><div class="pst-pm-sub"></div></div><div class="pst-pm-head-actions"><button id="pst-pdm-btn">Dublikatat</button><button id="pst-pm-refresh">Rifresko</button><button id="pst-pm-new">+ Projekt i ri</button></div></div>
    <div class="pst-pm-controls"><div class="pst-pm-control-top"><div class="pst-pm-toggle"><button data-pm-view="list" class="on">Listë</button><button data-pm-view="board">Board</button></div></div><div id="pst-pm-filters"></div></div>
    <div class="pst-pm-row" data-project-id="p1"><div class="pst-pm-main"><div class="pst-pm-name">Action Project</div><div class="pst-pm-client">Client</div><div class="pst-pm-desc">Noise</div><div class="pst-pc-badges"><span>TENDER</span></div></div><div class="pst-pm-meta"></div><div class="pst-pm-actions"></div></div>
    <div class="pst-pm-row" data-project-id="p2"><div class="pst-pm-main"><div class="pst-pm-name">Waiting Project</div><div class="pst-pm-client">Client</div></div><div class="pst-pm-meta"></div><div class="pst-pm-actions"></div></div>
    <div class="pst-pm-row" data-project-id="p3"><div class="pst-pm-main"><div class="pst-pm-name">Execution Project</div><div class="pst-pm-client">Client</div></div><div class="pst-pm-meta"></div><div class="pst-pm-actions"></div></div>
    <div class="pst-pm-row" data-project-id="p4"><div class="pst-pm-main"><div class="pst-pm-name">Closed Project</div><div class="pst-pm-client">Client</div></div><div class="pst-pm-meta"></div><div class="pst-pm-actions"></div></div>
  </div>
</div>
</body></html>`, { url: 'https://example.test' });

const { window } = dom;
window.console = console;
window.__pstWorkspaceProjectRows = [
  { id:'p1', status:'aktiv', pipeline_stage:'pricing', operational_state:'action_required', deadline:'2099-01-01', origin_type:'tender' },
  { id:'p2', status:'aktiv', pipeline_stage:'commercial', operational_state:'wait_for_client', deadline:'2099-01-01' },
  { id:'p3', status:'fituar', pipeline_stage:'production_control', operational_state:'execution', deadline:'2099-01-01' },
  { id:'p4', status:'mbyllur', pipeline_stage:'transport', operational_state:'execution', deadline:'2026-01-01' },
];
window.supaFetch = async (path) => path.startsWith('pppp_project_context_current_v') ? [{ project_id:'p1', fact_key:'supplier.price', value:{ amount:1.85 } }] : [];
window.__pstCurrentProjectId = 'p1';
window.pstProjectsModernOpen = () => Promise.resolve();
window.pstProjectsModernRefresh = () => Promise.resolve();

const context = vm.createContext(window);
context.window = window;
context.document = window.document;
context.CustomEvent = window.CustomEvent;
context.Event = window.Event;
context.setTimeout = setTimeout;
context.clearTimeout = clearTimeout;
context.console = console;
context.encodeURIComponent = encodeURIComponent;
context.Promise = Promise;

const src = fs.readFileSync('pristeel-project-classification-v1.js', 'utf8');
vm.runInContext(src, context, { filename:'pristeel-project-classification-v1.js' });
window.PSTProjectClassificationV1.decorate();

function assert(ok, message){ if(!ok) throw new Error(message); }
assert(window.document.getElementById('pst-pdm-btn').style.display === 'none', 'Duplicates must be hidden from daily Projects UI');
assert(window.document.getElementById('pst-pm-refresh').style.display === 'none', 'Manual refresh must be hidden from daily Projects UI');
assert(window.document.querySelector('.pst-pm-toggle').style.display === 'none', 'Board/list toggle must be hidden');
assert(window.document.getElementById('pst-pm-filters').style.display === 'none', 'Legacy status counters must be hidden');
assert(window.document.querySelectorAll('#pst-pws-filterbar [data-pws-work]').length === 5, 'Work-state filter must expose all/action/waiting/execution/closed');
assert(window.document.querySelector('[data-project-id="p1"]').getAttribute('data-pws-state') === 'action', 'Active pricing project must be Action');
assert(window.document.querySelector('[data-project-id="p2"]').getAttribute('data-pws-state') === 'waiting', 'wait_for_client must be Waiting');
assert(window.document.querySelector('[data-project-id="p3"]').getAttribute('data-pws-state') === 'execution', 'Won production project must be Execution');
assert(window.document.querySelector('[data-project-id="p4"]').getAttribute('data-pws-state') === 'closed', 'Closed status must win over execution stage');
assert(/Vendos çmimin e shitjes/.test(window.document.querySelector('[data-project-id="p1"] .pst-pm-meta').textContent), 'Pricing project next action must be clear');
assert(!window.document.querySelector('.pst-pc-badges'), 'Classification badges must be removed from daily UI');
assert(window.document.querySelector('[data-project-id="p1"] .pst-pm-desc').style.display === 'none', 'Description noise must be hidden');

window.PSTProjectClassificationV1._state.work = 'waiting';
window.PSTProjectClassificationV1.decorate();
assert(window.document.querySelector('[data-project-id="p1"]').style.display === 'none', 'Work filter must hide non-matching states');
assert(window.document.querySelector('[data-project-id="p2"]').style.display !== 'none', 'Work filter must keep matching state');

window.PSTProjectContextBridge.load('p1', true).then((facts) => {
  assert(facts.length === 1, 'Context bridge must load canonical project facts');
  assert(window.__pstPPPPContextFacts[0].fact_key === 'supplier.price', 'Context facts must be exposed to project runtime');
  console.log('projects-work-surface-smoke: ok');
}).catch((err) => { console.error(err); process.exit(1); });
