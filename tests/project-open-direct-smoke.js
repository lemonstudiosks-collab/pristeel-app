const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><select id="global-proj"><option value="p1">P1</option></select><button data-pm-open="p1">Hap</button><div id="page-workspace-project"></div></body></html>', {
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
