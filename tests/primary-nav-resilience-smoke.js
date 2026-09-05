const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
<div id="pst-ws-canonical-nav">
  <button class="pst-ws-navbtn" data-key="home">Home</button>
  <button class="pst-ws-navbtn" data-key="tenders">Opportunities</button>
  <button class="pst-ws-navbtn" data-key="projects">Projects</button>
  <button class="pst-ws-navbtn" data-key="contacts">Partners</button>
  <button class="pst-ws-navbtn" data-key="finance">Finance</button>
  <button class="pst-ws-navbtn" data-key="apps">System</button>
</div>
<div id="page-workspace-home" class="page"></div>
<div id="page-workspace-projects" class="page"></div>
<div id="page-finance" class="page"></div>
<div id="page-workspace-apps" class="page"></div>
</body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });
const w = dom.window;
let calls = [];
w.scrollTo = () => {};
w.PSTHomeCanonicalV1 = { activateHome(){ calls.push('home-activate'); const p=w.document.getElementById('page-workspace-home'); p.classList.add('active'); p.style.display='block'; }, render(){ calls.push('home-render'); return true; } };
w.pstTenderBizOpenMonitor = () => { calls.push('tenders'); };
w.pstProjectsModernOpen = () => { calls.push('projects'); const p=w.document.getElementById('page-workspace-projects'); p.classList.add('active'); p.style.display='block'; };
w.PSTContactMasterV1 = { open(){ calls.push('contacts'); } };
w.__pstWorkspaceLegacy = { showPage(page){ calls.push('legacy:'+page); if(page==='finance'){ const p=w.document.getElementById('page-finance'); p.classList.add('active'); p.style.display='block'; } } };
w.finShowHub = () => calls.push('finance-hub');
w.openModuleHub = () => calls.push('system');
w.PSTOperatingAssistantV2 = { apply(){ calls.push('assistant'); } };
w.PSTOperatingExperienceV1 = { apply(){ calls.push('experience'); } };
w.PSTRedesignFinalizerV1 = { apply(){} };

w.eval(fs.readFileSync('pristeel-primary-nav-resilience-v1.js','utf8'));
const R=w.PSTPrimaryNavResilienceV1;
assert.ok(R, 'Primary navigation resilience API missing');

R.route('projects');
assert.ok(calls.includes('projects'), 'Projects must use the direct modern project opener');

R.route('finance');
assert.ok(!calls.includes('legacy:finance'), 'Finance must not enter a legacy or decorated router chain');
assert.ok(w.document.getElementById('page-finance').classList.contains('active'), 'Finance must activate its terminal page directly');
assert.ok(calls.includes('assistant'), 'Finance must ask the presentation owner to render after the terminal route activates');

calls=[];
R.route('apps');
assert.ok(!calls.includes('system'), 'System must not need the fallback hub when its terminal page exists');
assert.ok(w.document.getElementById('page-workspace-apps').classList.contains('active'), 'System must activate its terminal page directly');
assert.ok(calls.includes('assistant'), 'System must ask the presentation owner to render after the terminal route activates');
assert.ok(calls.includes('experience'), 'System must explicitly ask its base presenter to populate the otherwise-empty terminal page');

R.route('tenders');
assert.ok(calls.includes('tenders'), 'Opportunities route must remain functional');

R.route('contacts');
assert.ok(calls.includes('contacts'), 'Partners route must remain functional');

R.route('home');
assert.ok(calls.includes('home-activate') && calls.includes('home-render'), 'Home must use canonical Home directly');

calls=[];
w.document.querySelector('[data-key="projects"]').click();
assert.ok(calls.includes('projects'), 'Sidebar click interception must route Projects directly');

console.log('Primary navigation resilience smoke test passed.');
dom.window.close();
