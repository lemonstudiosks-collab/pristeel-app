const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const source = fs.readFileSync('pristeel-ui-corrections-v2.js', 'utf8');
assert(!/(?:new\s+)?MutationObserver\s*\(|setInterval\s*\(/.test(source), 'UI corrections must not observe or poll the whole platform');
assert(!/supaFetch\([^)]*,\s*['\"](?:POST|PATCH|DELETE)/i.test(source), 'UI corrections must remain read-only');

const dom = new JSDOM(`<!doctype html><html><body>
<div class="topbar"><div></div><div class="flex gap-8 items-center">
  <span class="badge badge-gray">ADMINISTRATOR</span>
  <span id="wx-mini" style="display:flex;margin-top:14px"><span id="wx-icon"><svg viewBox="0 0 24 24"></svg></span><b id="wx-temp">28°</b><span id="wx-desc">Kthjellët</span></span>
  <button id="pst-loss-top" onclick="pstOpenProjectLoss()"><span>×</span><span>Mbyll projektin</span></button>
  <button class="btn btn-sm btn-primary" onclick="saveProject(this)">💾 Ruaj</button>
  <button class="btn btn-sm" onclick="newProject()">+ Projekt i ri</button>
  <button id="ex-topbtn" class="ex-btn" onclick="pstOpenExport()"><svg viewBox="0 0 24 24"></svg> Eksporto</button>
</div></div>
<div id="pst-email-center">
  <div class="pec-grid">
    <div class="pec-kpi"><div id="pec-kpi-total">1000</div></div>
    <div class="pec-kpi"><div id="pec-kpi-linked">207</div></div>
    <div class="pec-kpi"><div id="pec-kpi-unmatched">473</div></div>
    <div class="pec-kpi"><div id="pec-kpi-processed">0</div></div>
  </div>
  <div class="pec-toolbar"><input class="pec-search"></div><div id="pec-list"></div>
</div>
<div id="offer-actions"><button>Ngarko nga BOM</button><button>Gjenero Oferten</button><button>💾 Ruaj ofertën</button></div>
<div><button>Auto nga çmimet</button><button>+ Pozicion</button></div>
<div class="pst-pi-flow"><div class="pst-pi-step"><i>1</i>Kërkesa e klientit</div></div>
</body></html>`, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://localhost/' });
const w = dom.window;
w.console = console;
w.open = () => ({ focus() {} });
w.HTMLElement.prototype.scrollIntoView = function() { this.__scrolled = true; };
w.supaFetch = async path => [{ id: 1, subject: 'Oferta Airbus', project_id: 'airbus-1', sent_at: '2026-08-01', gmail_url: 'https://mail.google.com/test' }];
w.PSTEmail = { projects: [{ id: 'airbus-1', name: '260784 Airbus' }], gmailUrl: () => '' };
w.eval(source);

(async () => {
  assert(w.PSTUICorrectionsV2, 'Bounded UI corrections API is missing');
  const generate = Array.from(w.document.querySelectorAll('button')).find(x => /Gjenero/.test(x.textContent));
  const position = Array.from(w.document.querySelectorAll('button')).find(x => /Pozicion/.test(x.textContent));
  assert.ok(generate.classList.contains('pst-offer-generate-compact'), 'Generate offer button was not compacted');
  assert.ok(position.classList.contains('pst-position-primary'), '+ Pozicion did not receive a visible primary style');

  const topbar = w.document.querySelector('.topbar>.flex.gap-8.items-center');
  const save = topbar.querySelector('button[onclick*="saveProject"]');
  const add = topbar.querySelector('button[onclick*="newProject"]');
  const loss = w.document.getElementById('pst-loss-top');
  const exp = w.document.getElementById('ex-topbtn');
  [save, add, loss, exp].forEach(button => assert.ok(button.querySelector('svg.pst-topbar-icon'), 'Topbar action is missing the standardized SVG icon'));
  assert.ok(!save.textContent.includes('💾'), 'Save still uses an emoji instead of the standardized SVG icon');
  assert.strictEqual(save.getAttribute('onclick'), 'saveProject(this)', 'Save handler changed during visual normalization');
  assert.strictEqual(add.getAttribute('onclick'), 'newProject()', 'New-project handler changed during visual normalization');
  assert.strictEqual(loss.getAttribute('onclick'), 'pstOpenProjectLoss()', 'Close-project handler changed during visual normalization');
  assert.strictEqual(exp.getAttribute('onclick'), 'pstOpenExport()', 'Export handler changed during visual normalization');
  const correctionCss = w.document.getElementById('pst-ui-corrections-v2-css').textContent;
  assert.ok(correctionCss.includes('height:38px!important'), 'Topbar controls do not share a fixed height');
  assert.ok(correctionCss.includes('margin:0!important'), 'Weather/topbar alignment still keeps a vertical offset');
  assert.ok(correctionCss.includes('width:17px!important'), 'Topbar action icons do not share the same icon box');

  const linkedCard = w.document.getElementById('pec-kpi-linked').closest('.pec-kpi');
  assert.ok(linkedCard.classList.contains('pst-kpi-action'), 'Email KPI is still inactive');
  linkedCard.click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(w.document.getElementById('pst-kpi-modal-bg'), 'Clicking an email KPI produced no response');
  assert.ok(w.document.body.textContent.includes('Oferta Airbus'), 'KPI details did not show indexed data');
  assert.ok(correctionCss.includes('.pst-pi-step{font-size:9.5px'), 'Project workflow readability rule is missing');
  console.log('UI corrections smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});