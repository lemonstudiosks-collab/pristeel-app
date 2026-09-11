const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-creative-ui-v1.js', 'utf8');
const bootstrap = fs.readFileSync('pristeel-project-emails.js', 'utf8');

for (const token of [
  '--pst-coral:#EE7569',
  '.pn-lane-wait{grid-column:1/-1',
  '.pn-lane-wait .pn-work-list{grid-template-columns:repeat(2',
  '#fin-hub-grid>.pst-creative-fin-tile',
  '#page-workspace-projects .pst-pm-row',
  '#page-workspace-contacts .pcm-card',
  '#page-kek-tenders .pst-opp-decision',
  '#page-workspace-project .pst-operating-phase-nav'
]) assert(source.includes(token), `Creative UI surface missing: ${token}`);

assert(!/supaFetch\s*\(/.test(source), 'creative UI must not access business data');
assert(!/new\s+MutationObserver|setInterval\s*\(/.test(source), 'creative UI must stay bounded and event-driven');
assert(bootstrap.indexOf('pristeel-creative-ui-v1.js?v=20260911-fullredesign4') > bootstrap.indexOf('pristeel-project-execution-guard-v1.js'), 'creative UI must load last');

const dom = new JSDOM(`<!doctype html><html><head></head><body>
  <div id="fin-hub-grid">
    <div><div style="position:absolute"></div><div style="font-size:22px">🧾</div><div>Faturat</div></div>
    <a><div style="font-size:22px">🔗</div><div>ATK</div></a>
  </div>
  <span class="pn-project-status">wait_for_client</span>
</body></html>`, { runScripts: 'outside-only', url: 'https://example.test' });
dom.window.eval(source);

assert(dom.window.document.documentElement.classList.contains('pst-creative-ui-v1-ready'));
assert(dom.window.document.getElementById('pst-creative-ui-v1-css'));
assert.strictEqual(dom.window.document.querySelector('.pn-project-status').textContent, 'Në pritje të klientit');
assert.strictEqual(dom.window.document.querySelectorAll('.pst-creative-fin-tile').length, 2);
assert.strictEqual(dom.window.document.querySelectorAll('.pst-creative-fin-icon svg').length, 2);
assert.strictEqual(typeof dom.window.PSTCreativeUiV1.apply, 'function');

console.log('Creative UI v1 smoke test passed.');
dom.window.close();
