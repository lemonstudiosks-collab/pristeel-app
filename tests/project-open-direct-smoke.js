const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(async () => {
  const dom = new JSDOM('<!doctype html><html><body><select id="global-proj"><option value="p1">P1</option></select><button data-pm-open="p1">Hap</button></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/'
  });
  const w = dom.window;
  let opened = '';
  w.pstOpenProjectWorkspace = async id => { opened = String(id); };
  w.eval(fs.readFileSync('pristeel-project-open-direct-v1.js', 'utf8'));

  const button = w.document.querySelector('[data-pm-open]');
  button.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.strictEqual(opened, 'p1', 'Project workspace was not opened');
  assert.strictEqual(w.__pstCurrentProjectId, 'p1', 'Current project context was not set');
  assert.strictEqual(w._curProjId, 'p1', 'Legacy project context was not set');
  assert.strictEqual(w.localStorage.getItem('pristeel_cur_proj'), 'p1', 'Project context was not persisted');
  console.log('Direct project opening smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
