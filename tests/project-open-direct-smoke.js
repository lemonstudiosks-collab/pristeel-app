const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const dom = new JSDOM('<!doctype html><html><body class="pst-home-launcher-active"><div id="app-shell-root" class="app-shell" data-pst-home-shell-forced="1" style="display:block"><aside id="app-sidebar" class="sidebar" data-pst-home-shell-forced="1" style="display:none"></aside><main class="main" data-pst-home-shell-forced="1" style="width:100%"><div class="content"><div id="page-workspace-home" class="page active" style="display:block"></div><div id="pst-ws-canonical-nav"><button data-key="home" class="active">Home</button></div><select id="global-proj"><option value="p1">P1</option></select><button data-pm-open="p1">Hap</button><div id="page-workspace-project"></div></div></main></div></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/'
  });
  const w = dom.window;
  let opened = '';
  let gmailProject = '';
  w.pstOpenProjectWorkspace = async id => {
    opened = String(id);
    w.document.getElementById('page-workspace-project').innerHTML = '<div class="pst-pi-actions"><button class="pst-pi-btn">Projektet</button><button class="pst-pi-btn primary">Puno</button></div>';
  };
  w.pstCollectProjectGmail = id => { gmailProject = String(id); };
  w.eval(fs.readFileSync('pristeel-project-open-direct-v1.js', 'utf8'));

  const button = w.document.querySelector('[data-pm-open]');
  button.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.strictEqual(opened, 'p1', 'Project workspace was not opened');
  assert.strictEqual(w.__pstCurrentProjectId, 'p1', 'Current project context was not set');
  assert.strictEqual(w._curProjId, 'p1', 'Legacy project context was not set');
  assert.strictEqual(w.localStorage.getItem('pristeel_cur_proj'), 'p1', 'Project context was not persisted');
  assert.strictEqual(w.localStorage.getItem('pst_exact_project_id_v1'), 'p1', 'Exact project context was not persisted');
  assert.strictEqual(w.sessionStorage.getItem('pst_exact_project_id_v1'), 'p1', 'Session project context was not persisted');
  assert.strictEqual(new URL(w.location.href).searchParams.get('project_id'), 'p1', 'Project URL did not follow the opened project');
  assert.strictEqual(w.document.body.classList.contains('pst-home-launcher-active'), false, 'Direct project open must release the Home shell');
  assert.strictEqual(w.document.getElementById('page-workspace-home').classList.contains('active'), false, 'Direct project open must deactivate Home');
  assert.strictEqual(w.document.getElementById('page-workspace-home').style.display, 'none', 'Direct project open must hide Home');
  assert.strictEqual(w.document.getElementById('app-sidebar').getAttribute('data-pst-home-shell-forced'), null, 'Direct project open must release forced Home sidebar styles');

  const gmailButton = w.document.getElementById('pst-gmail-collect-project');
  assert.ok(gmailButton, 'Gmail collection button was not restored');
  assert.strictEqual(gmailButton.textContent, 'Mblidh nga Gmail');
  gmailButton.click();
  assert.strictEqual(gmailProject, 'p1', 'Gmail collector did not receive the active project ID');

  assert.ok(!fs.readFileSync('pristeel-project-open-direct-v1.js', 'utf8').includes('MutationObserver'), 'Direct opener must not use MutationObserver');
  assert.ok(!fs.readFileSync('pristeel-project-open-direct-v1.js', 'utf8').includes('setInterval('), 'Direct opener must not use setInterval');

  console.log('Direct project opening and Gmail action smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
