const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

(() => {
  const source = fs.readFileSync('pristeel-dashboard-task-cards-v1.js', 'utf8');
  assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source), 'Dashboard cards must not observe or poll the page');
  assert(!/supaFetch\s*\(|fetch\s*\(|new\s+XMLHttpRequest/.test(source), 'Dashboard cards must not query or write data');
  assert(!/(?:window\.)?(?:pstOpenProjectWorkspace|PSTEmail|authGetSession|doLogin)\s*=/.test(source), 'Dashboard cards must not override project, Gmail or login behavior');
  assert(source.includes('#page-workspace-home'), 'Dashboard styling is not scoped to the Workspace home page');

  const dom = new JSDOM(`<!doctype html><html><head></head><body>
    <div id="page-workspace-home">
      <div id="pst-ws-home-actions">
        <div class="pst-ws-action" data-ws-action="ws_test" style="--c:#A64B42;--bg:#F9ECEA">
          <i class="pst-ws-action-dot"></i>
          <div class="pst-ws-action-main">
            <div class="pst-ws-action-title">[AUTO] Ndjekje ofertë: PST-QUO-2026-010</div>
            <div class="pst-ws-action-meta">20 ditë vonë · 411320-KR — Maschinenhaus Schlambehandlung — 221.142 € · dërguar 11.07.2026 · 5 ditë pa përgjigje</div>
          </div>
          <span class="pst-ws-action-tag">VONUAR</span>
          <span class="pst-ws-action-controls"><button class="old-done">Kryer</button><button class="old-dismiss">Hiqe</button></span>
        </div>
      </div>
      <div id="pst-ws-home-projects"><div class="pst-ws-empty">Nuk ka projekte aktive.</div></div>
    </div>
  </body></html>`, { runScripts: 'outside-only', url: 'https://example.test/' });

  const w = dom.window;
  let opened = 0, done = 0, dismissed = 0, projects = 0;
  const row = w.document.querySelector('.pst-ws-action');
  const main = row.querySelector('.pst-ws-action-main');
  const doneButton = row.querySelector('.old-done');
  const dismissButton = row.querySelector('.old-dismiss');
  main.addEventListener('click', () => { opened += 1; });
  doneButton.addEventListener('click', () => { done += 1; });
  dismissButton.addEventListener('click', () => { dismissed += 1; });
  w.pstWorkspaceGo = page => { if (page === 'projects') projects += 1; };

  w.eval(source);
  assert.strictEqual(w.PSTDashboardTaskCardsV1.enhanceRow(row), true, 'Existing action row was not enhanced');
  assert.strictEqual(row.dataset.wsAction, 'ws_test', 'Action key changed during visual enhancement');
  assert.strictEqual(row.dataset.pstOriginalTitle, '[AUTO] Ndjekje ofertë: PST-QUO-2026-010', 'Original title was not preserved');
  assert.strictEqual(row.querySelector('.pst-ws-action-title').textContent, 'Ndjekje oferte — PST-QUO-2026-010', 'AUTO prefix or technical punctuation remained visible');
  assert(row.querySelector('.pst-dash-task-context').textContent.includes('411320-KR'), 'Project context was not separated');
  assert(row.querySelector('.pst-dash-task-timing').textContent.includes('20 ditë vonë'), 'Timing information was not separated');
  assert(row.querySelector('.pst-dash-task-timing').textContent.includes('dërguar 11.07.2026'), 'Existing metadata was lost');

  const openButton = row.querySelector('.pst-dash-task-open');
  openButton.click();
  assert.strictEqual(opened, 1, 'Open action no longer reaches the existing action handler');
  row.querySelector('.pst-dash-task-done').click();
  assert.strictEqual(done, 1, 'Existing complete handler was lost');
  assert.strictEqual(row.querySelector('.pst-dash-task-dismiss'), dismissButton, 'Dismiss button was replaced instead of moved');
  dismissButton.click();
  assert.strictEqual(dismissed, 1, 'Existing dismiss handler was lost');

  assert.strictEqual(w.PSTDashboardTaskCardsV1.decorate(), 0, 'Already enhanced row was decorated twice');
  const emptyButton = w.document.querySelector('.pst-dash-projects-open');
  assert(emptyButton, 'Useful projects empty state was not rendered');
  emptyButton.click();
  assert.strictEqual(projects, 1, 'Projects empty-state button did not use the existing navigation');

  dom.window.close();
  console.log('Dashboard task cards isolation smoke test passed.');
})();
