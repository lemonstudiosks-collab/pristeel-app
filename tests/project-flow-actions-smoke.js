const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-project-flow-actions-v1.js', 'utf8');
const projectsModern = fs.readFileSync('pristeel-projects-modern-v1.js', 'utf8');
const closureDirect = fs.readFileSync('pristeel-project-closure-direct-v1.js', 'utf8');
assert(!/new\s+MutationObserver/.test(source), 'Flow actions must not use MutationObserver');
assert(!/setInterval\s*\(/.test(source), 'Flow actions must not use setInterval');
assert(projectsModern.includes("state.filter==='active'&&g==='won'"), 'Won projects must remain visible in the Active project filter');
assert(projectsModern.includes("'active','waiting','postponed','won'"), 'Won projects must count in the active project badge');
assert(closureDirect.includes("s==='closedwon'"), 'Closed-won must be handled explicitly before generic closed matching');
assert(closureDirect.includes('/realizuar|humb|lost|cancel|refuz|mbyllur|closed/'), 'Realized/closed projects must stay terminal');

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
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('mbyllur'), true);
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('realizuar'), true);
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('aktiv'), false);
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('fituar'), false, 'Won project must stay operational');
  assert.strictEqual(w.PSTProjectFlowActions.closedStatus('closedwon'), false, 'Closed-won alias must stay operational');
  dom.window.close();
  console.log('Project flow actions + lifecycle consistency smoke test passed.');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
