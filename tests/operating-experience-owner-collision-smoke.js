const fs=require('fs');
const assert=require('assert');
const {JSDOM}=require('jsdom');

const operating=fs.readFileSync('pristeel-operating-experience-v1.js','utf8');
const shell=fs.readFileSync('pristeel-task-source-actions-v1.js','utf8');

assert(!/new\s+MutationObserver|setInterval\s*\(/.test(shell),'Final shell must remain bounded and observer-free');
assert(/handoffOperatingExperience/.test(shell),'Final shell must explicitly hand presentation back to Operating Experience');

const dom=new JSDOM(`<!doctype html><html><head></head><body>
<aside id="app-sidebar"><div id="pst-v2-sidebar"><aside id="pst-ws-sidebar">
  <div class="pst-ws-brand"></div><div class="pst-ws-create"><button class="pst-ws-create-main">Krijo</button></div><div class="pst-ws-spacer"></div>
</aside></div></aside>
<main class="content">
  <section id="page-workspace-home" class="active">
    <div class="pst-ws-card"><div class="pst-ws-card-title">Për mua tani</div><div class="pst-ws-card-sub">Legacy copy</div><div id="pst-ws-home-actions"></div></div>
  </section>
  <section id="page-kek-tenders"></section><section id="page-workspace-projects"></section><section id="page-workspace-project"></section>
  <section id="page-workspace-contacts"></section><section id="page-finance"></section><section id="page-workspace-apps"></section>
  <section id="page-workspace-inbox"></section><section id="page-workspace-commercial"></section>
</main>
</body></html>`,{runScripts:'outside-only',url:'https://pppp.example/'});
const w=dom.window;

// Reproduce the live collision: Operating Experience exists, then the late shell reconciler runs.
w.eval(operating);
w.PSTOperatingExperienceV1.apply();
w.eval(shell);
w.PSTTaskSourceActionsV1.decorate();

const host=w.document.getElementById('pst-ws-canonical-nav');
assert(host,'Canonical sidebar was not created');
const primary=[...host.querySelectorAll('.pst-canon-work > .pst-ws-navbtn')];
assert.deepStrictEqual(primary.map(x=>x.dataset.key),['home','tenders','projects','contacts','finance','apps'],'Late shell changed simplified primary navigation order');
assert.deepStrictEqual(primary.map(x=>x.querySelector('.pst-nav-label').textContent),['Home','Opportunities','Projects','Partners','Finance','System'],'Late shell restored legacy navigation labels');
assert.strictEqual(host.querySelector('.pst-canon-tools').style.getPropertyValue('display'),'none','Technical tools became primary navigation again');
assert.strictEqual(w.document.querySelector('.pst-ws-card-title').textContent,'Duhet veprimi yt','Late shell restored legacy Home heading');
assert.strictEqual(w.document.querySelector('.pst-ws-card-sub').textContent,'PPPP shfaq vetëm vendimet dhe veprimet që kërkojnë ndërhyrjen tënde.','Late shell restored legacy Home explanation');
assert.strictEqual(w.PSTTaskSourceActionsV1.currentKey(),'home','Current business zone changed during final shell reconciliation');

console.log('Operating Experience final-owner collision smoke: OK');
dom.window.close();