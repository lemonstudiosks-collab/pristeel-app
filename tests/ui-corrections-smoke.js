const fs = require('fs');
const assert = require('assert');
const { JSDOM } = require('jsdom');

const dom = new JSDOM(`<!doctype html><html><body>
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
w.eval(fs.readFileSync('pristeel-ui-corrections-v2.js', 'utf8'));

(async () => {
  const generate = Array.from(w.document.querySelectorAll('button')).find(x => /Gjenero/.test(x.textContent));
  const position = Array.from(w.document.querySelectorAll('button')).find(x => /Pozicion/.test(x.textContent));
  assert.ok(generate.classList.contains('pst-offer-generate-compact'), 'Generate offer button was not compacted');
  assert.ok(position.classList.contains('pst-position-primary'), '+ Pozicion did not receive a visible primary style');
  const linkedCard = w.document.getElementById('pec-kpi-linked').closest('.pec-kpi');
  assert.ok(linkedCard.classList.contains('pst-kpi-action'), 'Email KPI is still inactive');
  linkedCard.click();
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(w.document.getElementById('pst-kpi-modal-bg'), 'Clicking an email KPI produced no response');
  assert.ok(w.document.body.textContent.includes('Oferta Airbus'), 'KPI details did not show indexed data');
  assert.ok(w.document.getElementById('pst-ui-corrections-v2-css').textContent.includes('.pst-pi-step{font-size:9.5px'), 'Project workflow readability rule is missing');
  console.log('UI corrections smoke test passed.');
  dom.window.close();
})().catch(error => {
  console.error(error);
  dom.window.close();
  process.exit(1);
});
