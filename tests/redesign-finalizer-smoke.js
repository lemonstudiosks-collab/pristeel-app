const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

function stripComments(s){
  return s.replace(/\/\*[\s\S]*?\*\//g,'').replace(/(^|\s)\/\/.*$/gm,'$1');
}

(async () => {
  const source = fs.readFileSync('pristeel-redesign-finalizer-v1.js', 'utf8');
  const readability = fs.readFileSync('pristeel-platform-readability-v1.js', 'utf8');
  const sourceCode = stripComments(source);
  const readabilityCode = stripComments(readability);
  assert(!/MutationObserver|setInterval\s*\(/.test(sourceCode), 'Finalizer must stay bounded and observer-free');
  assert(!/supaFetch|fetch\s*\(|localStorage\.setItem|sessionStorage\.setItem/.test(sourceCode), 'Finalizer must not write or fetch data');
  assert(!/(?:pstOpenProjectWorkspace|authGetSession|doLogin|PSTEmail)\s*=(?!=)/.test(sourceCode), 'Finalizer must not replace core project/auth/Gmail functions');
  assert(!/MutationObserver|setInterval\s*\(/.test(readabilityCode), 'Readability layer must stay bounded and observer-free');
  assert(!/supaFetch|fetch\s*\(|localStorage\.(?:setItem|removeItem)|sessionStorage\.(?:setItem|removeItem)/.test(readabilityCode), 'Readability layer must stay UI-only');

  const dom = new JSDOM('<!doctype html><html><body><div id="page-workspace-home"></div></body></html>', { runScripts:'outside-only', url:'https://example.test/' });
  const w = dom.window;
  let searchDecorated = 0, cardsDecorated = 0, homeDecorated = 0;
  const newSearch = () => 'new-search';
  w.openCmdK = () => 'old-search';
  w.PSTBusinessCommandCenterV1 = { open:newSearch, decorateHome(){ searchDecorated++; } };
  w.PSTDashboardTaskCardsV1 = { decorate(){ cardsDecorated++; } };
  w.PSTHomeCommandCenterV2 = { decorate(){ homeDecorated++; } };
  w.eval(source);
  w.PSTRedesignFinalizerV1.apply();
  assert.strictEqual(w.openCmdK, newSearch, 'Finalizer did not restore the new universal search entry point');
  assert(searchDecorated > 0, 'Universal search home decoration was not re-applied');
  assert(cardsDecorated > 0, 'Dashboard cards were not re-applied');
  assert(homeDecorated > 0, 'Home command center was not re-applied');
  const loader = w.document.querySelector('script[data-pst-platform-readability]');
  assert(loader, 'Finalizer did not request the platform readability layer');
  assert(/pristeel-platform-readability-v1\.js/.test(loader.getAttribute('src') || ''), 'Finalizer loaded the wrong readability asset');
  dom.window.close();

  const priorityDom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-home">
      <div id="pst-ws-home-actions">
        <div class="pst-ws-action pst-canonical-action pst-dash-task-card" data-kind="task" data-project-id="p-24" data-id="t-24">
          <div class="pst-ws-action-main">
            <div class="pst-ws-action-title" title="Urgjent: Drafti PST-OFF-2026-08-024 gati — plotëso montazhin">Urgjent: Drafti PST-OFF-2026-08-024 gati — plotëso montazhin</div>
            <div class="pst-ws-action-meta">Kërkesë e re e klientit</div>
          </div>
          <div class="pst-ws-action-side">
            <span class="pst-ws-action-tag">Vepro tani</span>
            <div class="pst-ws-action-controls">
              <button type="button" class="pst-dash-task-open">Hap</button>
              <button type="button" class="pst-ws-action-open">Hap</button>
              <button type="button" class="pst-ws-action-dismiss">•••</button>
              <span class="pst-dash-task-menu">
                <button type="button" class="pst-dash-task-more">⋯</button>
                <span class="pst-dash-task-menu-panel">
                  <button type="button" class="pst-ws-action-done pst-dash-task-done pst-dash-task-dismiss">Hiqe nga lista</button>
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </body></html>`, { runScripts:'outside-only', url:'https://example.test/' });
  const pw = priorityDom.window;
  let canonicalClicks = 0;
  const rowBefore = pw.document.querySelector('.pst-canonical-action');
  rowBefore.onclick = () => { canonicalClicks++; };
  pw.eval(source);
  pw.PSTRedesignFinalizerV1.apply();
  const row = pw.document.querySelector('.pst-canonical-action');
  const controls = row.querySelector('.pst-ws-action-controls');
  assert(row.classList.contains('pst-final-priority-urgent'), 'Urgent priority card did not receive whole-card urgent styling class');
  assert.strictEqual(controls.querySelectorAll('.pst-dash-task-open').length, 0, 'Broken duplicate Open button was not removed');
  assert.strictEqual(controls.querySelectorAll('.pst-ws-action-open').length, 1, 'Canonical Open control was not preserved exactly once');
  assert.strictEqual(controls.querySelectorAll('.pst-dash-task-menu').length, 0, 'Generated duplicate overflow menu was not removed');
  const done = controls.querySelector('.pst-ws-action-done');
  assert(done, 'Canonical Done button was not restored to the controls');
  assert.strictEqual(done.textContent, 'Kryer', 'Canonical Done button label was not restored');
  row.querySelector('.pst-ws-action-title').dispatchEvent(new pw.MouseEvent('click', { bubbles:true }));
  assert.strictEqual(canonicalClicks, 1, 'Finalizer must preserve canonical Home card navigation instead of adding a second owner');
  assert.strictEqual(typeof pw.PSTRedesignFinalizerV1.openPriorityCard, 'undefined', 'Finalizer must not expose a competing Home navigation owner');
  priorityDom.window.close();

  const rdDom = new JSDOM(`<!doctype html><html><head></head><body>
    <span id="tiny" style="font-size:7px">tiny meta</span>
    <b id="small" style="font-size:9px">small title</b>
    <button id="control" style="font-size:10px">Action</button>
    <p id="normal" style="font-size:14px">Normal body</p>
    <div id="of-pre"><span id="previewTiny" style="font-size:7px">PDF preview</span></div>
    <section class="pst-eoi-card"><header><div><b>Email offers</b><span>Meta</span></div><button class="pst-eoi-btn">Scan</button></header></section>
    <table class="pf2-compare"><thead><tr><th>Supplier</th></tr></thead><tbody><tr><td>2.70 EUR/kg</td></tr></tbody></table>
  </body></html>`, { runScripts:'outside-only', url:'https://example.test/' });
  const rw = rdDom.window;
  rw.eval(readability);
  rw.PSTPlatformReadabilityV1.apply(rw.document);
  assert(rw.document.getElementById('tiny').classList.contains('pst-rd-xxs'), '7px UI text was not normalized');
  assert(rw.document.getElementById('small').classList.contains('pst-rd-xs'), '9px UI text was not normalized');
  assert(rw.document.getElementById('control').classList.contains('pst-rd-control'), 'Small control text was not normalized');
  assert(!/pst-rd-/.test(rw.document.getElementById('normal').className), 'Normal 14px body text should remain untouched');
  assert(!/pst-rd-/.test(rw.document.getElementById('previewTiny').className), 'Generated document preview typography must remain untouched');
  const css = rw.document.getElementById('pst-platform-readability-v1-css').textContent;
  assert(css.includes('.pst-eoi-row b{font-size:13px!important'), 'Email offer rows do not have the expected readable subject size');
  assert(css.includes('.pf2-compare td{font-size:11.5px!important'), 'Commercial comparison cells do not have the expected readable size');
  rdDom.window.close();

  console.log('Redesign finalizer + priority card + platform readability smoke test passed.');
})().catch(error => { console.error(error); process.exit(1); });