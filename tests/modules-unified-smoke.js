const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
<div id="page-finance" class="page"><div class="card"><table><thead><tr><th>Dokumenti</th></tr></thead><tbody><tr><td>INV-1</td></tr></tbody></table></div></div>
<div id="page-contacts" class="page"><div class="ct"><div class="ct-avatar">UG</div></div></div>
<div id="page-workspace-inbox" class="page"></div>
<div id="page-workspace-commercial" class="page"></div>
<div id="page-workspace-files" class="page"></div>
</body></html>`, { runScripts: 'outside-only' });
const w = dom.window;
w.MutationObserver = w.MutationObserver;
w.eval(fs.readFileSync('pristeel-modules-unified-v1.js', 'utf8'));

for (const id of ['page-finance','page-contacts','page-workspace-inbox','page-workspace-commercial','page-workspace-files']) {
  assert.ok(w.document.getElementById(id).classList.contains('pst-unified-module'), `${id} was not unified`);
}
assert.ok(w.document.getElementById('pst-modules-unified-css'), 'Unified CSS was not installed');
assert.strictEqual(w.document.querySelector('#page-finance td').textContent, 'INV-1', 'Module content was changed');
assert.strictEqual(w.document.querySelector('#page-contacts .ct-avatar').textContent, 'UG', 'Contact content was changed');
console.log('Unified modules smoke test passed.');
dom.window.close();

require('./automation-health-smoke.js');
require('./operating-experience-smoke.js');
require('./operating-experience-owner-collision-smoke.js');
require('./operating-assistant-v2-smoke.js');
require('./primary-nav-resilience-smoke.js');
require('./home-tender-command-grid-smoke.js');
require('./live-home-command-grid-loader-smoke.js');
require('./navigation-interaction-stability-smoke.js');
require('./operational-truth-smoke.js');