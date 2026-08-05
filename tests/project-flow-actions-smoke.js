const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-project-flow-actions-v1.js', 'utf8');
assert(!/new\s+MutationObserver/.test(source), 'Flow actions must not use MutationObserver');
assert(!/setInterval\s*\(/.test(source), 'Flow actions must not use setInterval');

(async () => {
  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div class="pst-ws-pipeline">
      ${Array.from({length:9}, (_,i) => `<div class="pst-ws-stage"><div class="pst-ws-stage-dot">${i+1}</div><div class="pst-ws-stage-label">S${i+1}</div></div>`).join('')}
    </div>
  </body></html>`, { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  w.__pstCurrentProjectId = 'project-1';
  const calls = [];
  w.supaFetch = async (path, method, body) => {
    calls.push({ path, method, body });
    if (!method) return [{ id:'project-1', name:'Test Project', status:'aktiv', pipeline_stage:'rfq_in' }];
    return [];
  };
  let openedTab = null;
  w.pstWsProjectTab = id => { openedTab = id; };
  w.pstOpenProjectWorkspace = async () => {};
  w.eval(source);
  w.PSTProjectFlowActions.decorate();

  const stages = w.document.querySelectorAll('.pst-ws-stage');
  assert.strictEqual(stages[1].getAttribute('role'), 'button');
  stages[1].dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 10));
  assert(w.document.getElementById('pst-flow-stage-bg'), 'Stage modal should open');
  w.document.querySelector('.pst-flow-stage-open').click();
  assert.strictEqual(openedTab, 'technical', 'Technical stage should open technical tab');

  stages[3].dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  await new Promise(r => setTimeout(r, 10));
  const setButton = w.document.querySelector('.pst-flow-stage-set');
  assert(setButton, 'Set-current button should exist for future stage');
  setButton.click();
  await new Promise(r => setTimeout(r, 20));
  const patch = calls.find(x => x.method === 'PATCH');
  assert(patch, 'Changing phase must PATCH the project');
  assert(patch.path.includes('projects?id=eq.project-1'));
  assert.strictEqual(patch.body.pipeline_stage, 'pricing');
  assert.strictEqual(openedTab, 'commercial', 'Pricing stage should open commercial tab after save');

  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('humbur'), true);
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('aktiv'), false);
  dom.window.close();
  console.log('Project flow actions smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
