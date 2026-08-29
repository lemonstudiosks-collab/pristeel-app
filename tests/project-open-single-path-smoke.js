const fs = require('fs');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
<select id="global-proj"><option value="">—</option><option value="p1">Project One</option></select>
<div id="page-workspace-project"><div class="pst-pi-actions"></div></div>
</body></html>`, { url: 'https://example.test' });

const { window } = dom;
let legacyLoads = 0;
let workspaceLoads = 0;
const select = window.document.getElementById('global-proj');
select.addEventListener('change', () => { legacyLoads += 1; });
window.pstOpenProjectWorkspace = async (id) => {
  if (id !== 'p1') throw new Error('wrong project id');
  workspaceLoads += 1;
};
window.console = console;

const context = vm.createContext(window);
context.window = window;
context.document = window.document;
context.localStorage = window.localStorage;
context.Event = window.Event;
context.setTimeout = setTimeout;
context.clearTimeout = clearTimeout;
context.console = console;
context.Promise = Promise;

vm.runInContext(fs.readFileSync('pristeel-project-open-direct-v1.js', 'utf8'), context, {
  filename: 'pristeel-project-open-direct-v1.js'
});

function assert(ok, message){ if(!ok) throw new Error(message); }

window.pstOpenProjectDirect('p1').then(() => {
  assert(workspaceLoads === 1, 'Canonical workspace must open exactly once');
  assert(legacyLoads === 0, 'Programmatic project selector sync must not trigger legacy loadProject path');
  assert(select.value === 'p1', 'Global project selector must still reflect the active project');
  assert(window.__pstCurrentProjectId === 'p1' && window._curProjId === 'p1', 'Project context must be synchronized');
  assert(window.localStorage.getItem('pristeel_cur_proj') === 'p1', 'Project context must persist');
  console.log('project-open-single-path-smoke: ok');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
