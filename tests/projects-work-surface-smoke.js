const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div id="page-workspace-projects" class="active">
  <div class="pst-pm-page">
    <div class="pst-pm-head"><div><div class="pst-pm-sub"></div></div><div class="pst-pm-head-actions"><button id="pst-pdm-btn">Dublikatat</button><button id="pst-pm-refresh">Rifresko</button><button id="pst-pm-new">+ Projekt i ri</button></div></div>
    <div class="pst-pm-controls"><div class="pst-pm-control-top"><select id="pst-pm-sort"><option>Aktiviteti i fundit</option></select><div class="pst-pm-toggle"><button data-pm-view="list" class="on">Listë</button><button data-pm-view="board">Board</button></div></div><div id="pst-pm-filters"></div></div>
    <div class="pst-pm-row" data-project-id="p1"><div class="pst-pm-main"><div class="pst-pm-name">Action Project</div><div class="pst-pm-client">Client</div><div class="pst-pm-desc">Noise</div><div class="pst-pc-badges"><span>TENDER</span></div></div><div class="pst-pm-meta"></div><div class="pst-pm-actions"><button class="pst-pm-more" data-pm-more="p1">⋯</button></div></div>
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
let openedProject = null;
window.pstOpenProjectWorkspace = (id) => { openedProject = String(id); };

const context = vm.createContext(window);
context.window = window;
context.document = window.document;
context.CustomEvent = window.CustomEvent;
context.Event = window.Event;
context.MouseEvent = window.MouseEvent;
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
assert(window.document.getElementById('pst-pm-sort').style.display === 'none', 'Old full-width sort selector must be hidden from daily Projects UI');
assert(window.document.querySelectorAll('#pst-pws-filterbar [data-pws-work]').length === 5, 'Work-state filter must expose all five operational groups');
const filterText=window.document.getElementById('pst-pws-filterbar').textContent;
assert(filterText.includes('Kërkon veprim')&&filterText.includes('Në pritje')&&filterText.includes('Në realizim')&&filterText.includes('Të mbyllura'),'Project work filters must be fully Albanian');
assert(!/\bAction\b|\bWaiting\b|\bExecution\b|\bClosed\b/.test(filterText),'English work-state labels must not remain visible');
assert(window.document.querySelector('[data-project-id="p1"]').getAttribute('data-pws-state') === 'action', 'Active pricing project must remain in the action state internally');
assert(window.document.querySelector('[data-project-id="p1"] .pst-pm-meta').textContent.includes('Kërkon veprim'),'Action badge must be presented in Albanian');
assert(window.document.querySelector('[data-project-id="p2"]').getAttribute('data-pws-state') === 'waiting', 'wait_for_client must be Waiting');
assert(window.document.querySelector('[data-project-id="p3"]').getAttribute('data-pws-state') === 'execution', 'Won production project must be Execution');
assert(window.document.querySelector('[data-project-id="p4"]').getAttribute('data-pws-state') === 'closed', 'Closed status must win over execution stage');
assert(window.PSTProjectClassificationV1.workState({status:'pritje',pipeline_stage:'client_offer',operational_state:'action_required'}) === 'action', 'action_required must override legacy pritje status');
assert(window.PSTProjectClassificationV1.workState({status:'pritje',pipeline_stage:'supplier_selection',operational_state:'active_work'}) === 'action', 'active_work must override legacy pritje status');
assert(/Vendos çmimin e shitjes/.test(window.document.querySelector('[data-project-id="p1"] .pst-pm-meta').textContent), 'Pricing project next action must be clear');
assert(!window.document.querySelector('.pst-pc-badges'), 'Classification badges must be removed from daily UI');
assert(window.document.querySelector('[data-project-id="p1"] .pst-pm-desc').style.display === 'none', 'Description noise must be hidden');

// Regression: the entire visible row (name, status, next step, deadline whitespace) must open the canonical project workspace.
openedProject = null;
window.document.querySelector('[data-project-id="p1"] .pst-pm-meta').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
assert(openedProject === 'p1', 'Clicking anywhere on a Projects row must open that project');
assert(window.__pstCurrentProjectId === 'p1' && window._curProjId === 'p1', 'Row click must preserve the selected project identity');

// The overflow menu remains a separate control and must not trigger row opening.
openedProject = null;
window.document.querySelector('[data-project-id="p1"] .pst-pm-more').dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
assert(openedProject === null, 'Overflow menu click must not open the project row');

// The bootstrap must force a fresh copy of the final Projects owner after row-navigation fixes.
const bootstrap = fs.readFileSync('pristeel-project-emails.js', 'utf8');
assert(bootstrap.includes('pristeel-project-classification-v1.js?v=20260830-rowopen1'), 'Projects row-open owner must be cache-busted in runtime bootstrap');

window.PSTProjectClassificationV1._state.work = 'waiting';
window.PSTProjectClassificationV1.decorate();
assert(window.document.querySelector('[data-project-id="p1"]').style.display === 'none', 'Work filter must hide non-matching states');
assert(window.document.querySelector('[data-project-id="p2"]').style.display !== 'none', 'Work filter must keep matching state');

window.PSTProjectContextBridge.load('p1', true).then((facts) => {
  assert(facts.length === 1, 'Context bridge must load canonical project facts');
  assert(window.__pstPPPPContextFacts[0].fact_key === 'supplier.price', 'Context facts must be exposed to project runtime');
  console.log('projects-work-surface-smoke: ok');
}).catch((err) => { console.error(err); process.exit(1); });